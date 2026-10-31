import { Interface, ZeroAddress, formatEther, formatUnits, getAddress } from "ethers";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { farmExitAmounts, farmFundingAmounts, minerExitAmounts } from "./positionPreviewMath";
import { verifyRuntime, parseFarmDepositAmount, type FarmReadRpc } from "./farmTransactions";
import { readFarmRewardBalance, variableFarmTransfers } from "./farmAccounting";
import { farmTokenPolicyWarnings, verifyFarmTokenState } from "./farmTokenSafety";
import { assertCurrentFarmSpec, farmSpecIdentity, getFarmWriteSpec } from "./farmCatalog";

export type PositionPreview = { title: string; account: string; block: number; blockHash?:string; timestamp: number; facts: [string, string][]; warnings: string[]; simulation: string; source: string;
  execution?: { to: string; data: string; fingerprint: string; minimumOutput: string; event: string; shares: string; recipient: string; amount: string;
    positionShares?: string;
    rollover?: { target: string; targetIndex: string; gross: string; bonusRate: string; mandatorySeconds: string; carriedStart: string; targetDuration: string; targetGrace: string; sourceMandatory: string; resetHopTime: boolean } } };
export type MinerAction = { kind: "deploy"; amount: string; recipient: string } | { kind: "withdraw"; index: number; shares?: string } | { kind: "rollover"; index: number; target?: string } | { kind: "transfer"; index: number; recipient: string; shares?: string } | { kind: "upgrade"; index: number; target: string; shares?: string };
export const previewAbi = new Interface([
  "function token() view returns(address)", "function masterchef() view returns(address)", "function poolID() view returns(uint256)",
  "function treasury() view returns(address)", "function treasuryWallet() view returns(address)", "function admin() view returns(address)",
  "function owner() view returns(address)", "function governor() view returns(address)", "function feeAddress() view returns(address)", "function dtx() view returns(address)",
  "function poolInfo(uint256) view returns(uint256,uint256,address)",
  "function balanceOf(address) view returns(uint256)", "function decimals() view returns(uint8)", "function stakeToken() view returns(address)",
  "function getNrOfStakes(address) view returns(uint256)", "function fundingRate() view returns(uint256)", "function lastFundingChangeTimestamp() view returns(uint256)",
  "function defaultDirectPayout() view returns(uint256)", "function accDtxPerShare() view returns(uint256)", "function lastCredit() view returns(uint256)",
  "function pendingDtx(uint256) view returns(uint256)", "function credit(address) view returns(uint256)",
  "function withdrawFeePeriod() view returns(uint256)", "function gracePeriod() view returns(uint256)", "function totalShares() view returns(uint256)",
  "function minimumGift() view returns(uint256)", "function migrationPool() view returns(address)",
  "function selfHarvest(uint256[],address)", "function withdraw(uint256,address)",
  "function emergencyWithdraw(uint256)", "function stakeRollover(address,uint256)", "function getRollBonus(address) view returns(uint256)",
  "function deposit(uint256)", "function giftDeposit(uint256,address,uint256)", "function withdrawAll(uint256)", "function withdraw(uint256,uint256)",
  "function partialWithdrawals() view returns(bool)", "function partialTransfers() view returns(bool)",
  "function transferStakeToAnotherWallet(uint256,uint256,address)", "function hopStakeToAnotherPool(uint256,uint256,address)",
  "function allowStakeTransfer() view returns(bool)", "function trustedPool(address) view returns(bool)", "function trustedSender(address) view returns(bool)",
  "function viewPoolPayout(address) view returns(uint256)", "function viewPoolMinServe(address) view returns(uint256)",
]);
const farmPositionAbi = new Interface(["function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256)"]);
const minerPositionAbi = new Interface(["function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)", "function balanceOf() view returns(uint256)"]);
function same(actual: string, expected: string, label: string) { if (getAddress(actual) !== getAddress(expected)) throw new Error(label + " changed; this preview model cannot be used."); }
function positionIndex(value: number) { if (!Number.isSafeInteger(value) || value < 0) throw new Error("Select a valid position."); return BigInt(value); }

// No signer/provider wallet requests. Even simulations are public eth_call only.
async function snapshot(rpc: FarmReadRpc, accountInput: string, now: number) {
  const account = getAddress(accountInput);
  if (account === ZeroAddress) throw new Error("A nonzero wallet is required.");
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("Preview requires PulseChain.");
  const block = await rpc.send("eth_getBlockByNumber", ["latest", false]);
  if (!block?.hash || !block.number || !block.timestamp) throw new Error("Snapshot unavailable.");
  const timestamp = Number(BigInt(block.timestamp));
  if (!Number.isSafeInteger(timestamp) || now - timestamp * 1000 > 120000 || timestamp * 1000 - now > 30000) throw new Error("Snapshot is stale or its timestamp is invalid.");
  const read = async (to: string, method: string, args: unknown[] = [], abi = previewAbi) => abi.decodeFunctionResult(method, await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, block.number]));
  const finish = async () => { if ((await rpc.send("eth_getBlockByNumber", [block.number, false]))?.hash !== block.hash) throw new Error("Snapshot changed. Refresh this preview."); };
  return { account, block, timestamp, read, finish };
}
async function dependencies(rpc: FarmReadRpc, s: Awaited<ReturnType<typeof snapshot>>, address: string, runtime: string, poolId: bigint, isMiner: boolean) {
  const common = VERIFIED_FARM_WRITES[0];
  await Promise.all([[address, runtime], [common.masterchef, common.masterchefRuntimeCodeHash], [common.governor, common.governorRuntimeCodeHash], [common.rewardToken, common.rewardTokenRuntimeCodeHash]].map(async ([target, hash]) => verifyRuntime(await rpc.send("eth_getCode", [target, s.block.number]), hash, "Preview dependency")));
  const reads = [
    [address, "token", common.rewardToken], [address, "masterchef", common.masterchef], [address, "treasury", common.governor],
    [common.masterchef, "owner", common.governor], [common.masterchef, "feeAddress", common.governor], [common.masterchef, "dtx", common.rewardToken],
    [common.rewardToken, "owner", common.masterchef], [common.rewardToken, "governor", common.governor], [common.governor, "masterchef", common.masterchef],
    [isMiner ? address : common.governor, isMiner ? "admin" : "treasuryWallet", isMiner ? common.governor : common.treasuryWallet],
  ];
  await Promise.all(reads.map(async ([target, method, expected]) => same((await s.read(target, method))[0], expected, method)));
  if ((await s.read(address, "poolID"))[0] !== poolId) throw new Error("Pool registration changed.");
  same((await s.read(common.masterchef, "poolInfo", [poolId]))[2], address, "Pool participant");
  return common;
}
async function simulate(rpc: FarmReadRpc, s: Awaited<ReturnType<typeof snapshot>>, to: string, method: string, args: unknown[]) {
  try {
    await rpc.send("eth_call", [{ from: s.account, to, value: "0x0", data: previewAbi.encodeFunctionData(method, args) }, s.block.number]);
    return "Passed at this snapshot. No transaction sent; this is not a guarantee of execution or safety.";
  } catch { return "Did not pass. The RPC or contract rejected the read-only simulation; execution is not confirmed."; }
}

type MinerSpec = typeof MINER_PREVIEW_SPECS[number];
type RolloverContext = { s: Awaited<ReturnType<typeof snapshot>>; spec: MinerSpec; row: readonly bigint[]; total: bigint; balance: bigint; duration: bigint; grace: bigint; index: number };
export type MinerRolloverOption = { id: string; label: string; address: string; durationDays: number; graceDays: number; bonusRate: string | null; bonusAmount: string | null; available: boolean; error?: string; quote?: PositionPreview };
export type MinerRolloverOptions = { account: string; block: number; blockHash: string; timestamp: number; gross: string; source: { id: string; index: number; shares: string; deposited: string }; options: MinerRolloverOption[] };

async function rolloverQuote(rpc: FarmReadRpc, context: RolloverContext, destination: MinerSpec): Promise<PositionPreview> {
  const { s, spec, row, total, balance, duration, grace, index } = context, common = VERIFIED_FARM_WRITES[0];
  if (BigInt(s.timestamp) <= row[1] + duration) throw new Error("This miner must be past maturity before it can roll over.");
  const gross = row[0] * balance / total, samePool = destination.id === spec.id, target = getAddress(destination.address);
  const [bonusRateRead, reserveRead] = await Promise.all([s.read(common.governor, "getRollBonus", [target]), s.read(common.rewardToken, "balanceOf", [common.governor])]);
  const bonusRate = BigInt(bonusRateRead[0]), bonus = gross * bonusRate / 10000n;
  if (bonus <= 0n || balance <= 0n) throw new Error("The current rollover bonus is zero; this rollover cannot execute.");
  if (reserveRead[0] < bonus) throw new Error("The Governor has insufficient OINK to fund this rollover bonus.");
  let targetDuration = duration, targetGrace = grace, targetIndex = BigInt(index), targetTotal = total, targetBalance = balance;
  let carriedStart = row[1], hopShares = 0n, trustTerms = "same-pool";
  if (!samePool) {
    await dependencies(rpc, s, target, destination.runtimeCodeHash, BigInt(destination.poolId), true);
    const [migration, lock, graceRead, sourceTrustedPool, sourceTrustedSender, targetTrustedPool, targetTrustedSender, destinationTotal, destinationBalance, count, sourceCredit] = await Promise.all([
      s.read(target, "migrationPool"), s.read(target, "withdrawFeePeriod"), s.read(target, "gracePeriod"),
      s.read(spec.address, "trustedPool", [target]), s.read(spec.address, "trustedSender", [target]),
      s.read(target, "trustedPool", [spec.address]), s.read(target, "trustedSender", [spec.address]),
      s.read(target, "totalShares"), s.read(target, "balanceOf", [], minerPositionAbi), s.read(target, "getNrOfStakes", [s.account]),
      s.read(common.masterchef, "credit", [spec.address]),
    ]);
    same(migration[0], ZeroAddress, "Destination migration");
    targetDuration = BigInt(lock[0]); targetGrace = BigInt(graceRead[0]); targetIndex = BigInt(count[0]);
    if (targetDuration !== BigInt(destination.durationDays) * 86400n || targetGrace !== BigInt(destination.graceDays) * 86400n) throw new Error("Destination lock rules changed.");
    if (!sourceTrustedPool[0] && !(sourceTrustedSender[0] && BigInt(s.timestamp) < row[1] + duration + grace)) throw new Error("This rollover route is not currently trusted, or its grace period has ended.");
    if (!targetTrustedPool[0] && !targetTrustedSender[0]) throw new Error("The destination does not trust this source miner.");
    if (sourceCredit[0] < gross) throw new Error("The source miner needs its rewards harvested before this rollover can transfer its full balance.");
    if (sourceTrustedPool[0] && BigInt(s.timestamp) > row[1] + duration + grace) carriedStart = BigInt(s.timestamp);
    targetTotal = BigInt(destinationTotal[0]); targetBalance = BigInt(destinationBalance[0]);
    if (targetTotal > 0n && targetBalance <= 0n) throw new Error("Destination share accounting is inconsistent.");
    hopShares = targetTotal === 0n ? gross : gross * targetTotal / targetBalance;
    if (hopShares <= 0n) throw new Error("Destination would issue zero shares.");
    targetTotal += hopShares; targetBalance += gross;
    trustTerms = [sourceTrustedPool[0], sourceTrustedSender[0], targetTrustedPool[0], targetTrustedSender[0]].join(":");
  }
  const bonusShares = bonus * targetTotal / targetBalance;
  if (bonusShares <= 0n) throw new Error("This rollover would add zero miner shares.");
  // addAndExtendStake resets mandatory service only if the target position is
  // already mature. A hop into a longer pool can retain its previous obligation.
  const mandatorySeconds = BigInt(s.timestamp) > carriedStart + targetDuration ? 0n : row[4];
  const simulation = await simulate(rpc, s, spec.address, "stakeRollover", [target, BigInt(index)]);
  // The timestamp of an overdue hop advances with each block; bind the reset
  // condition, rather than that changing timestamp, into the reviewed terms.
  const resetHopTime = !samePool && carriedStart === BigInt(s.timestamp);
  const rollover = { target, targetIndex: targetIndex.toString(), gross: gross.toString(), bonusRate: bonusRate.toString(), mandatorySeconds: mandatorySeconds.toString(), carriedStart: carriedStart.toString(), targetDuration: targetDuration.toString(), targetGrace: targetGrace.toString(), sourceMandatory: row[4].toString(), resetHopTime };
  return { title: "Review miner rollover", account: s.account, block: Number(BigInt(s.block.number)), blockHash: s.block.hash, timestamp: s.timestamp, source: "https://scan.pulsechain.com/address/" + spec.address + "#code", simulation,
    execution: { to: spec.address, data: previewAbi.encodeFunctionData("stakeRollover", [target, BigInt(index)]), fingerprint: [row.join(":"), duration, grace, bonusRate, common.governor, target, targetDuration, targetGrace, targetIndex, trustTerms, mandatorySeconds, resetHopTime].join("|"), minimumOutput: bonus.toString(), event: "MinerRollover", shares: row[0].toString(), recipient: s.account, amount: bonus.toString(), rollover },
    facts: [["Position", spec.label + " #" + index], ["Miner owner", s.account], ["Destination", (samePool ? "Same " : "") + destination.label + " miner"], ["Existing gross OINK value", formatEther(gross) + " OINK"], ["Rollover bonus rate", formatUnits(bonusRate, 2) + "%"], ["Estimated OINK bonus added", formatEther(bonus) + " OINK"], ["Estimated bonus shares", formatEther(bonusShares)], ["New duration", destination.durationDays + " days from transaction mining"], ["Additional mandatory service", formatUnits(mandatorySeconds, 0) + " seconds after rollover"], ["OINK received in wallet", "0 OINK"], ["Rollover penalty", "0 OINK"]],
    warnings: ["The entire selected miner is recommitted in the " + destination.label + " pool. Its start time resets when the transaction mines, and the bonus remains locked in the miner.", "The new miner duration and early/late withdrawal penalties apply. Any mandatory service shown starts again from the new deposit time.", "The Governor funds the bonus. Changes in its balance, bonus rate or your position can prevent execution; position indexes must not change while pending."] };
}

// Used by the rollover selector and transaction preview alike. Every choice is
// verified and simulated against one canonical block, without wallet requests.
export async function readMinerRolloverOptions(rpc: FarmReadRpc, sourceId: string, account: string, index: number, now = Date.now()): Promise<MinerRolloverOptions> {
  const spec = MINER_PREVIEW_SPECS.find(v => v.id === sourceId);
  if (!spec) throw new Error("Unknown OINK miner.");
  const id = positionIndex(index), cached = new Map<string, Promise<any>>();
  const sharedRpc: FarmReadRpc = { send(method, params) { // Cache only immutable reads at an explicit block.
    if (!["eth_call", "eth_getCode"].includes(method)) return rpc.send(method, params);
    const key = JSON.stringify([method, params]);
    if (!cached.has(key)) cached.set(key, Promise.resolve(rpc.send(method, params)));
    return cached.get(key)!;
  } };
  const s = await snapshot(sharedRpc, account, now);
  await dependencies(sharedRpc, s, spec.address, spec.runtimeCodeHash, BigInt(spec.poolId), true);
  const [duration, grace, total, balance, migration, count, row] = await Promise.all([
    s.read(spec.address, "withdrawFeePeriod"), s.read(spec.address, "gracePeriod"), s.read(spec.address, "totalShares"), s.read(spec.address, "balanceOf", [], minerPositionAbi), s.read(spec.address, "migrationPool"), s.read(spec.address, "getNrOfStakes", [s.account]), s.read(spec.address, "userInfo", [s.account, id], minerPositionAbi),
  ]);
  same(migration[0], ZeroAddress, "Migration target");
  if (duration[0] !== BigInt(spec.durationDays) * 86400n || grace[0] !== BigInt(spec.graceDays) * 86400n) throw new Error("Miner lock rules differ from the inspected source.");
  if (id >= count[0]) throw new Error("Position no longer exists. Refresh your miners.");
  if (row[0] <= 0n || total[0] < row[0]) throw new Error("Miner shares are unavailable or inconsistent.");
  if (BigInt(s.timestamp) <= row[1] + duration[0]) throw new Error("This miner must be past maturity before it can roll over.");
  const context: RolloverContext = { s, spec, row: Array.from(row, BigInt), total: total[0], balance: balance[0], duration: duration[0], grace: grace[0], index };
  const options = await Promise.all(MINER_PREVIEW_SPECS.filter(v => v.durationDays >= spec.durationDays).map(async destination => {
    const base = { id: destination.id, label: destination.label, address: destination.address, durationDays: destination.durationDays, graceDays: destination.graceDays };
    try {
      const quote = await rolloverQuote(sharedRpc, context, destination), available = quote.simulation.startsWith("Passed");
      return { ...base, bonusRate: quote.execution!.rollover!.bonusRate, bonusAmount: quote.execution!.amount, available, quote, ...(available ? {} : { error: quote.simulation }) };
    } catch (error) { return { ...base, bonusRate: null, bonusAmount: null, available: false, error: error instanceof Error ? error.message : "Rollover terms unavailable." }; }
  }));
  await s.finish();
  return { account: s.account, block: Number(BigInt(s.block.number)), blockHash: s.block.hash, timestamp: s.timestamp, gross: (row[0] * balance[0] / total[0]).toString(), source: { id: spec.id, index, shares: row[0].toString(), deposited: row[1].toString() }, options };
}

export async function previewFarmExit(rpc: FarmReadRpc, farmId: string, account: string, index: number, kind: "claim" | "withdraw" | "emergency", now = Date.now(), destination = "wallet"): Promise<PositionPreview> {
  const spec = getFarmWriteSpec(farmId);
  if (!spec) throw new Error("Exit previews currently cover verified farm assets only.");
  if (kind !== "claim" && kind !== "withdraw" && kind !== "emergency") throw new Error("Unsupported preview action.");
  if (kind === "emergency" && destination !== "wallet") throw new Error("Emergency withdrawals return the staked asset to your wallet only.");
  const id = positionIndex(index), s = await snapshot(rpc, account, now);
  const common = await dependencies(rpc, s, spec.address, spec.runtimeCodeHash, BigInt(spec.poolId), false);
  same((await s.read(spec.address, "treasuryWallet"))[0], spec.treasuryWallet, "Fee treasury");
  if (spec.tokenAddress) {
    await verifyFarmTokenState(rpc, spec, s.account, s.block.number);
    same((await s.read(spec.address, "stakeToken"))[0], spec.tokenAddress, "Staked asset");
    if ((await s.read(spec.tokenAddress, "decimals"))[0] !== BigInt(spec.decimals)) throw new Error("Asset precision changed.");
  }
  if (id >= (await s.read(spec.address, "getNrOfStakes", [s.account]))[0]) throw new Error("Position no longer exists. Refresh your positions.");
  // Emergency exits deliberately bypass harvest and reward accounting. Failed
  // reward reads must not prevent the contract's principal-only recovery route.
  if (kind === "emergency") {
    const [position, rate, changed, balance] = await Promise.all([
      s.read(spec.address, "userInfo", [s.account, id], farmPositionAbi), s.read(spec.address, "fundingRate"), s.read(spec.address, "lastFundingChangeTimestamp"),
      spec.tokenAddress ? s.read(spec.tokenAddress, "balanceOf", [spec.address]).then((r) => r[0] as bigint) : rpc.send("eth_getBalance", [spec.address, s.block.number]).then(BigInt),
    ]);
    const amounts = farmFundingAmounts(position[0], position[3], changed[0], rate[0], BigInt(s.timestamp));
    if (position[0] <= 0n || position[0] > balance) throw new Error("Position amount or vault liquidity is invalid.");
    const simulation = await simulate(rpc, s, spec.address, "emergencyWithdraw", [id]);
    await s.finish();
    assertCurrentFarmSpec(spec);
    return { title: "Review emergency withdrawal", account: s.account, block: Number(BigInt(s.block.number)), blockHash: s.block.hash, timestamp: s.timestamp, source: spec.sourceUrl, simulation,
      execution: { to: spec.address, data: previewAbi.encodeFunctionData("emergencyWithdraw", [id]), fingerprint: [farmSpecIdentity(spec), position.join(":"), rate[0], changed[0], amounts.fundingFee, s.account].join("|"), minimumOutput: amounts.principalAfterFee.toString(), event: "FarmEmergencyWithdraw", shares: "0", recipient: s.account, amount: position[0].toString() },
      facts: [["Position", spec.symbol + " #" + index], ["Recipient wallet", s.account], ["Recorded stake", formatUnits(position[0], spec.decimals) + " " + spec.symbol], ["Funding rate", formatUnits(rate[0], 4) + "% / hour"], ["Accrued funding deduction", formatUnits(amounts.fundingFee, spec.decimals) + " " + spec.symbol], [variableFarmTransfers(spec) ? "Nominal principal before token transfer effects" : "Estimated principal returned", formatUnits(amounts.principalAfterFee, spec.decimals) + " " + spec.symbol], ["OINK rewards received", "0 OINK"], ["Pending rewards", "All pending OINK rewards for this position are forfeited"]],
      warnings: [...farmTokenPolicyWarnings(spec), "This removes the entire selected farm position and forfeits its pending OINK rewards. Use a normal withdrawal to settle rewards when that route is available.", "Accrued funding fees still apply. Only the remaining staked asset returns to your wallet.", "Other position indexes may change afterward. Do not modify this position elsewhere while the request is pending."] };
  }
  const [position, rate, changed, payout, accumulator, lastCredit, credit, pending, balance] = await Promise.all([
    s.read(spec.address, "userInfo", [s.account, id], farmPositionAbi), s.read(spec.address, "fundingRate"), s.read(spec.address, "lastFundingChangeTimestamp"),
    s.read(spec.address, "defaultDirectPayout"), s.read(spec.address, "accDtxPerShare"), s.read(spec.address, "lastCredit"),
    s.read(common.masterchef, "credit", [spec.address]), s.read(common.masterchef, "pendingDtx", [BigInt(spec.poolId)]),
    readFarmRewardBalance(rpc, spec, s.block.number),
  ]);
  if (balance <= 0n || credit[0] + pending[0] < lastCredit[0]) throw new Error("Vault harvest accounting is inconsistent.");
  // Unlike virtualAccDtxPerShare(), harvest also includes credited-but-uncollected rewards.
  const accAfterHarvest = BigInt(accumulator[0]) + (BigInt(credit[0]) + BigInt(pending[0]) - BigInt(lastCredit[0])) * 1000000000000n / BigInt(balance);
  let into = s.account, payoutRate = BigInt(payout[0]), minServe = 0n, destinationDays = 0;
  if (destination !== "wallet") {
    const target = MINER_PREVIEW_SPECS.find(v => v.id === destination);
    if (!target) throw new Error("Unsupported reward destination.");
    into = getAddress(target.address);
    await dependencies(rpc, s, into, target.runtimeCodeHash, BigInt(target.poolId), true);
    same((await s.read(into, "migrationPool"))[0], ZeroAddress, "Destination migration");
    payoutRate = (await s.read(spec.address, "viewPoolPayout", [into]))[0];
    minServe = (await s.read(spec.address, "viewPoolMinServe", [into]))[0];
    destinationDays = target.durationDays;
    if ((await s.read(into,"withdrawFeePeriod"))[0] !== BigInt(destinationDays)*86400n) throw new Error("Destination duration changed.");
    if (payoutRate <= 0n) throw new Error("This miner is not an active reward destination.");
  }
  const amounts = farmExitAmounts(position[0], position[1], accAfterHarvest, position[3], changed[0], rate[0], payoutRate, BigInt(s.timestamp));
  if (destination !== "wallet" && amounts.rewardReceived < (await s.read(into, "minimumGift"))[0]) throw new Error("Reward is below this destination's minimum miner amount.");
  if (position[0] <= 0n || (kind === "withdraw" && !variableFarmTransfers(spec) && amounts.principalAfterFee > balance)) throw new Error("Position amount or vault liquidity is invalid.");
  const args = [kind === "claim" ? [id] : id, into], method = kind === "claim" ? "selfHarvest" : "withdraw(uint256,address)";
  const simulation = await simulate(rpc, s, spec.address, method, args);
  await s.finish();
  assertCurrentFarmSpec(spec);
  return { title: kind === "claim" ? "Review OINK claim" : "Review full position withdrawal", account: s.account, block: Number(BigInt(s.block.number)), blockHash:s.block.hash, timestamp: s.timestamp, source: spec.sourceUrl, simulation,
    execution: { to: spec.address, data: previewAbi.encodeFunctionData(method,args), fingerprint: [farmSpecIdentity(spec), position.join(":"), rate[0], changed[0], payoutRate, minServe, into, destinationDays, amounts.fundingFee].join("|"), minimumOutput: amounts.rewardReceived.toString(), event: kind === "claim" ? "SelfHarvest" : "FarmWithdraw", shares: "0", recipient: into, amount: position[0].toString() },
    facts: [["Position", spec.symbol + " #" + index], ["Reward destination", (destination === "wallet" ? "Your wallet" : MINER_PREVIEW_SPECS.find(v => v.id === destination)!.label + " miner") + " · " + into], ["Nominal destination duration", destinationDays + " days"], ["Mandatory service at destination", (Number(minServe) / 86400) + " days"], ["Recorded stake", formatUnits(position[0], spec.decimals) + " " + spec.symbol],
      ["Funding rate", formatUnits(rate[0], 4) + "% / hour"], ["Accrued funding deduction", formatUnits(amounts.fundingFee, spec.decimals) + " " + spec.symbol], [kind === "claim" ? "Stake remaining after claim" : variableFarmTransfers(spec) ? "Nominal principal before token transfer effects" : "Estimated principal returned", formatUnits(amounts.principalAfterFee, spec.decimals) + " " + spec.symbol],
      ["Gross OINK rewards", formatEther(amounts.grossReward) + " OINK"], ["Destination payout rate", formatUnits(payoutRate, 2) + "%"], ["Reward deduction to Governor", formatEther(amounts.governorReward) + " OINK · " + formatUnits(10000n-payoutRate,2) + "%"], [destination === "wallet" ? "OINK received in wallet" : "OINK committed to locked miner", formatEther(amounts.rewardReceived) + " OINK (at snapshot)"], ["Miner exit penalty", destination === "wallet" ? "Not applicable to this farm action" : "Not charged now; future miner withdrawal has separate lock and penalty rules"]],
    warnings: [...farmTokenPolicyWarnings(spec), kind === "claim" ? "Claiming also collects funding fees from your stake; it does not withdraw the remaining principal." : "Withdraws the entire selected position and settles its rewards. Other position indexes may change afterward.", destination === "wallet" ? "Direct-wallet rewards can be much smaller than gross rewards." : "Rewards create a new time-locked miner owned by your wallet, not a liquid wallet payment.", "Terms and position indexes may change before mining. Do not modify this position in another interface while this request is pending."] };
}

export async function previewMiner(rpc: FarmReadRpc, minerId: string, account: string, action: MinerAction, now = Date.now()): Promise<PositionPreview> {
  if(!["deploy","withdraw","transfer","upgrade","rollover"].includes(action.kind))throw Error("Unsupported miner action.");
  const spec = MINER_PREVIEW_SPECS.find((v) => v.id === minerId);
  if (!spec) throw new Error("Unknown OINK miner.");
  const s = await snapshot(rpc, account, now);
  const common = await dependencies(rpc, s, spec.address, spec.runtimeCodeHash, BigInt(spec.poolId), true);
  const [duration, grace, total, balance, migration] = await Promise.all([s.read(spec.address, "withdrawFeePeriod"), s.read(spec.address, "gracePeriod"), s.read(spec.address, "totalShares"), s.read(spec.address, "balanceOf", [], minerPositionAbi), s.read(spec.address, "migrationPool")]);
  if (duration[0] !== BigInt(spec.durationDays) * 86400n || grace[0] !== BigInt(spec.graceDays) * 86400n) throw new Error("Miner lock rules differ from the inspected source.");
  same(migration[0], ZeroAddress, "Migration target");
  let facts: [string, string][], simulation: string, execution: PositionPreview["execution"];
  const warnings = ["Estimates can change before mining. No fixed APY or guaranteed return is assumed."];
  if (action.kind === "deploy") {
    const amount = parseFarmDepositAmount(action.amount, 18), recipient = getAddress(action.recipient);
    if (recipient === ZeroAddress || recipient === getAddress(spec.address)) throw new Error("Choose a nonzero recipient wallet, not the miner contract.");
    const walletBalance = (await s.read(common.rewardToken, "balanceOf", [s.account]))[0];
    if (walletBalance < amount) throw new Error("Amount exceeds this wallet's OINK balance.");
    const gift = recipient !== s.account;
    if (gift && amount < (await s.read(spec.address, "minimumGift"))[0]) throw new Error("Amount is below the miner's current minimum gift.");
    if (total[0] > 0n && balance[0] === 0n) throw new Error("Miner share accounting is inconsistent.");
    const shares = total[0] === 0n ? amount : amount * total[0] / balance[0];
    if (shares === 0n) throw new Error("This amount would create zero shares.");
    simulation = await simulate(rpc, s, spec.address, gift ? "giftDeposit" : "deposit", gift ? [amount, recipient, 0n] : [amount]);
    execution = { to: spec.address, data: previewAbi.encodeFunctionData(gift ? "giftDeposit" : "deposit", gift ? [amount,recipient,0n] : [amount]), fingerprint: [duration[0], grace[0], migration[0], recipient, amount].join(":"), minimumOutput: "0", event: gift ? "GiftDeposit" : "Deposit", shares: "0", recipient, amount: amount.toString() };
    facts = [["OINK committed", formatEther(amount)], ["Miner owner / recipient", recipient], ["Estimated shares", formatEther(shares)], ["Nominal duration", spec.durationDays + " days"], ["Grace period", spec.graceDays + " days"], ["Maximum modeled exit penalty", formatUnits(BigInt(spec.maxPenaltyBps), 2) + "%"], ["Additional mandatory service", "0 days for this draft"]];
    warnings.push("This creates a time-miner position, not a new smart contract. The inspected route burns liquid OINK through MasterChef and records miner shares; do not assume a normal ERC-20 vault approval flow.");
    if (gift) warnings.push("The recipient owns this miner. Sending to another wallet is not reversible through this interface.");
  } else {
    const id = positionIndex(action.index);
    if (id >= (await s.read(spec.address, "getNrOfStakes", [s.account]))[0]) throw new Error("Position no longer exists. Refresh your miners.");
    const row = await s.read(spec.address, "userInfo", [s.account, id], minerPositionAbi);
    if (row[0] <= 0n || total[0] < row[0]) throw new Error("Miner shares are unavailable or inconsistent.");
    const selected = action.kind !== "rollover" && action.shares !== undefined ? parseFarmDepositAmount(action.shares, 18) : BigInt(row[0]);
    if (selected > row[0]) throw new Error("Selected shares exceed this miner's current shares. Refresh the position.");
    const partial = selected < row[0];
    const gross = selected * BigInt(balance[0]) / BigInt(total[0]);
    if (action.kind === "rollover") {
      const destination = MINER_PREVIEW_SPECS.find(v => v.id === (action.target ?? spec.id));
      if (!destination) throw new Error("Unknown rollover destination.");
      const quote = await rolloverQuote(rpc, { s, spec, row: Array.from(row, BigInt), total: total[0], balance: balance[0], duration: duration[0], grace: grace[0], index: action.index }, destination);
      await s.finish();
      return quote;
    }
    if (gross <= 0n) throw new Error("Selected shares have no withdrawable OINK value at this snapshot.");
    if (action.kind === "transfer" || action.kind === "upgrade") {
      let recipient = s.account, target = spec.address, method: string, args: unknown[], extra = "";
      if (action.kind === "transfer") {
        recipient = getAddress(action.recipient);
        if (recipient === ZeroAddress || recipient === s.account || MINER_PREVIEW_SPECS.some(v => getAddress(v.address) === recipient)) throw new Error("Choose a different recipient wallet, not a miner contract.");
        if (!(await s.read(spec.address,"allowStakeTransfer"))[0]) throw new Error("Miner transfers are currently disabled by the contract.");
        const minimum = (await s.read(spec.address,"minimumGift"))[0];
        if (gross < minimum) throw new Error("Selected amount is below the current transfer minimum.");
        if (partial && !(await s.read(spec.address,"partialTransfers"))[0]) throw new Error("Partial miner transfers are currently disabled by the contract. Select the full miner.");
        method = "transferStakeToAnotherWallet"; args = [selected,id,recipient]; extra = minimum.toString();
      } else {
        const destination = MINER_PREVIEW_SPECS.find(v => v.id === action.target);
        if (!destination || destination.durationDays <= spec.durationDays) throw new Error("Choose a longer miner duration.");
        target = destination.address;
        await dependencies(rpc,s,target,destination.runtimeCodeHash,BigInt(destination.poolId),true);
        same((await s.read(target,"migrationPool"))[0],ZeroAddress,"Destination migration");
        if (!(await s.read(spec.address,"trustedPool",[target]))[0] || !((await s.read(target,"trustedSender",[spec.address]))[0] || (await s.read(target,"trustedPool",[spec.address]))[0])) throw new Error("This upgrade route is not currently trusted by both pools.");
        const targetTotal = (await s.read(target,"totalShares"))[0], targetBalance = (await s.read(target,"balanceOf",[],minerPositionAbi))[0];
        if (targetTotal > 0n && (targetBalance <= 0n || gross * targetTotal / targetBalance === 0n)) throw new Error("Destination would issue zero shares.");
        if (partial && !(await s.read(spec.address,"partialWithdrawals"))[0]) throw new Error("Partial miner upgrades are currently disabled by the contract. Select the full miner.");
        method = "hopStakeToAnotherPool"; args = [selected,id,target];
        const targetDuration = (await s.read(target,"withdrawFeePeriod"))[0];
        if (targetDuration !== BigInt(destination.durationDays)*86400n) throw new Error("Destination lock changed.");
        extra = targetDuration.toString();
      }
      const reset = action.kind === "upgrade" && BigInt(s.timestamp) > row[1] + duration[0] + grace[0];
      simulation = await simulate(rpc,s,spec.address,method,args);
      facts = [["Position",spec.label + " #" + action.index],["Shares transferred",formatEther(selected)],["Shares remaining",formatEther(row[0] - selected)],["Gross OINK transferred",formatEther(gross)],["Recipient wallet",recipient],["Destination",target],["Time served",reset ? "Restarts now because the grace period has ended" : "Existing start time and mandatory service are carried over"]];
      execution = {to:spec.address,data:previewAbi.encodeFunctionData(method,args),fingerprint:[row.join(":"),selected,duration[0],grace[0],target,recipient,extra,reset].join("|"),minimumOutput:"0",event:action.kind === "transfer" ? "TransferStake" : "HopPool",shares:selected.toString(),positionShares:row[0].toString(),recipient:action.kind === "transfer" ? recipient : getAddress(target),amount:gross.toString()};
      warnings.push(partial ? "Only the selected shares change owner or duration. The remaining miner retains its existing start time and mandatory service." : "The full miner changes owner or duration. Position indexes may change; do not edit this position elsewhere while pending.");
      await s.finish();
      return {title:action.kind === "upgrade" ? "Review miner upgrade" : "Review miner transfer",account:s.account,block:Number(BigInt(s.block.number)),blockHash:s.block.hash,timestamp:s.timestamp,facts,simulation,warnings,source:"https://scan.pulsechain.com/address/"+spec.address+"#code",execution};
    }
    const quote = minerExitAmounts(gross, row[1], row[4], BigInt(s.timestamp), spec);
    if (partial && !(await s.read(spec.address,"partialWithdrawals"))[0]) throw new Error("Partial miner withdrawals are currently disabled by the contract. Select the full miner.");
    const method = partial ? "withdraw(uint256,uint256)" : "withdrawAll", args = partial ? [selected,id] : [id];
    simulation = quote.locked ? "Blocked: mandatory service has not ended. No withdrawal was simulated." : await simulate(rpc, s, spec.address, method, args);
    execution = { to: spec.address, data: previewAbi.encodeFunctionData(method,args), fingerprint: [row.join(":"),selected,quote.penaltyBps,duration[0],grace[0]].join("|"), minimumOutput: quote.received.toString(), event: "MinerWithdraw", shares: selected.toString(), positionShares:row[0].toString(), recipient:s.account, amount:gross.toString() };
    facts = [["Position", spec.label + " #" + action.index], ["Shares withdrawn", formatEther(selected)], ["Shares remaining", formatEther(row[0] - selected)], ["Gross OINK value", formatEther(gross)], ["Modeled exit penalty", formatUnits(quote.penaltyBps, 2) + "% · " + formatEther(quote.penalty) + " OINK"], ["Estimated OINK after penalty", formatEther(quote.received) + (quote.locked ? " · unavailable while locked" : "")], ["Mandatory service ends", new Date(Number(quote.mandatoryUntil) * 1000).toLocaleString()], ["Maturity", new Date(Number(quote.maturity) * 1000).toLocaleString()], ["Grace ends", new Date(Number(quote.graceEnd) * 1000).toLocaleString()]];
    warnings.push("Late penalties count elapsed days from maturity once the grace period is exceeded. " + (partial ? "Remaining shares keep their existing start time and mandatory service." : "Position indexes may change after the full withdrawal."));
  }
  await s.finish();
  return { title: action.kind === "deploy" ? "Review " + spec.label + " miner" : "Review miner withdrawal", account: s.account, block: Number(BigInt(s.block.number)), blockHash:s.block.hash, timestamp: s.timestamp, facts, simulation, warnings, source: "https://scan.pulsechain.com/address/" + spec.address + "#code", execution };
}
