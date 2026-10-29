import { Interface, formatEther, formatUnits, getAddress, parseUnits, keccak256, toQuantity, ZeroAddress } from "ethers";
import { ORDINARY_DEPLOYMENTS } from "../config/ordinaryGovernanceVerification";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { ORDINARY_CALLS } from "./ordinaryGovernanceCalls";
import { verifyRuntime, type FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolRequest, ProtocolReceipt } from "./protocolTransactions";

type Field = { key: string; label: string; unit: "token" | "uint" | "percent" | "miner" | "vault" | "bool" | "address" };
type Model = { deployment: keyof typeof ORDINARY_DEPLOYMENTS; getter: string; event: string; eventType: number; fields: Field[]; eventOrder: number[] };
const field = (key: string, label: string, unit: Field["unit"]): Field => ({ key, label, unit });
export const ORDINARY_MODELS: Record<string, Model> = {
  "New pool": { deployment: "basic", getter: "newPoolProposal", event: "ProposeNewPool", eventType: 2, fields: [field("poolAddress", "New pool contract address", "address")], eventOrder: [0, 1, 2] },
  "Voting cost": { deployment: "basic", getter: "minDepositProposals", event: "ProposeMinDeposit", eventType: 0, fields: [field("value", "New voting cost (OINK)", "token")], eventOrder: [0, 1, 2] },
  "Enforcement delay": { deployment: "basic", getter: "delayProposals", event: "DelayBeforeEnforce", eventType: 1, fields: [field("value", "New enforcement delay (seconds, 86400–1209600)", "uint")], eventOrder: [0, 1, 2] },
  "Harvest call fee": { deployment: "basic", getter: "callFeeProposal", event: "InitiateSetCallFee", eventType: 4, fields: [field("value", "Harvest call fee (%)", "percent")], eventOrder: [0, 1, 2] },
  "Rollover bonus": { deployment: "basic", getter: "rolloverBonuses", event: "InitiateRolloverBonus", eventType: 3, fields: [field("miner", "Miner duration", "miner"), field("value", "Rollover bonus (%)", "percent")], eventOrder: [0, 1, 2, 3] },
  "Reward-event threshold": { deployment: "basic", getter: "minThresholdFibonacceningProposal", event: "ProposeSetMinThresholdFibonaccening", eventType: 5, fields: [field("value", "Reward-event threshold (OINK)", "token")], eventOrder: [0, 1, 2] },
  "Pool allocation": { deployment: "farms", getter: "proposalFarmUpdate", event: "InitiateFarmProposal", eventType: 0, fields: [field("pool", "Registered farm pool number", "uint"), field("value", "Pool allocation (%)", "percent")], eventOrder: [0, 1, 2, 3, 4] },
  "Vault setting": { deployment: "farms", getter: "vaultProposals", event: "ProposeVault", eventType: 5, fields: [field("vaultType", "Vault parameter", "vault"), field("value", "New setting (%)", "percent")], eventOrder: [0, 1, 2, 3] },
  "Governor transfer or burn": { deployment: "farms", getter: "governorTransferProposals", event: "ProposeGovernorTransfer", eventType: 2, fields: [field("value", "Amount (OINK)", "token"), field("burn", "Burn instead of transferring to treasury", "bool"), field("start", "Earliest execution (Unix timestamp; 0 for no extra wait)", "uint")], eventOrder: [0, 1, 2, 3, 4] },
  "Governor tax": { deployment: "farms", getter: "govTaxProposals", event: "ProposeGovTax", eventType: 4, fields: [field("value", "Governor inflation share (%)", "percent")], eventOrder: [0, 1, 2] },
  "Reward boost": { deployment: "reward", getter: "fibonacceningProposals", event: "ProposeFibonaccening", eventType: 0, fields: [field("value", "Boost reward (OINK per block)", "token"), field("duration", "Event duration (100–256633 blocks)", "uint"), field("start", "Event start (Unix timestamp)", "uint")], eventOrder: [0, 3, 2, 1, 4] },
};
const common = VERIFIED_FARM_WRITES[0], credit = PARTICIPATION_CONTRACTS.credit;
export const ordinaryReadAbi = new Interface([
  ...["owner", "token", "governor", "masterchef", "dtx", "creditContract", "basicContract", "farmContract", "fibonacceningContract"].map(m => `function ${m}() view returns(address)`),
  "function costToVote() view returns(uint256)", "function delayBeforeEnforce() view returns(uint256)", "function userCredit(address) view returns(uint256)",
  "function deductingContract(address) view returns(bool)", "function trustedContract(address) view returns(bool)",
  "function balanceOf(address) view returns(uint256)", "function totalSupply() view returns(uint256)", "function poolLength() view returns(uint256)",
  "function thresholdFibonaccening() view returns(uint256)", "function eventFibonacceningActive() view returns(bool)", "function treasuryWallet() view returns(address)",
  "function depositFee() view returns(uint256)", "function fundingRate() view returns(uint256)", "function referralBonus() view returns(uint256)",
  "function getRollBonus(address) view returns(uint256)", "function governorFee() view returns(uint256)", "function callFee() view returns(uint256)",
  "function DTXPerBlock() view returns(uint256)", "function poolInfo(uint256) view returns(uint256,uint256,address)",
  ...Array.from({ length: 6 }, (_, i) => `function acPool${i + 1}() view returns(address)`),
  "event DeductCredit(address indexed from,uint256 amount)", "event Transfer(address indexed from,address indexed to,uint256 value)",
  "event SetInflation(uint256 rewardPerBlock)", "event UpdateEmissions(address indexed user,uint256 newEmissions)",
]);
const uint = (v: string, label: string) => { if (!/^(0|[1-9][0-9]*)$/.test(v) || v.length > 77) throw Error(label + " must be a whole nonnegative number."); return BigInt(v); };
function decimal(v: string, precision: number, label: string) { if (!/^\d+(\.\d+)?$/.test(v) || v.length > 100) throw Error("Enter " + label + " as a plain decimal."); return parseUnits(v, precision); }
export function ordinaryCreateArguments(family: string, args: Record<string, string>) {
  const model = ORDINARY_MODELS[family]; if (!model) throw Error("This proposal family is not enabled locally yet.");
  const values: (bigint | string | boolean)[] = [decimal(args.credit, 18, "voting credit")];
  for (const f of model.fields) {
    const v = args[f.key] ?? "";
    if (f.unit === "miner") { const miner = MINER_PREVIEW_SPECS.find(m => m.id === v); if (!miner) throw Error("Choose a verified miner."); values.push(miner.address); }
    else if (f.unit === "bool") { if (v !== "true" && v !== "false") throw Error("Choose the transfer or burn outcome."); values.push(v === "true"); }
    else if (f.unit === "address") { const address = getAddress(v); if (address === ZeroAddress) throw Error("Enter a nonzero pool contract."); values.push(address); }
    else if (f.unit === "token") values.push(decimal(v, 18, f.label));
    else if (f.unit === "percent") values.push(decimal(v, family === "Vault setting" && args.vaultType === "1" ? 4 : 2, f.label));
    else values.push(uint(v, f.label));
  }
  if (family === "Pool allocation") values.push(0n); // Legacy depositFee argument is ignored by the verified contract.
  values.push(uint(args.delay ?? "0", "Voting window in hours") * 3600n);
  if (BigInt(values[0]) <= 0n) throw Error("Commit a positive amount of voting credit.");
  if (family === "Vault setting" && !["0", "1", "2"].includes(args.vaultType)) throw Error("Choose a supported vault parameter.");
  return values;
}
export async function ordinaryDependencies(rpc: FarmReadRpc, deployment: Model["deployment"], tag: string) {
  const contract = ORDINARY_DEPLOYMENTS[deployment];
  const pins = [contract, credit, { address: common.governor, runtimeCodeHash: common.governorRuntimeCodeHash }, { address: common.masterchef, runtimeCodeHash: common.masterchefRuntimeCodeHash }, { address: common.rewardToken, runtimeCodeHash: common.rewardTokenRuntimeCodeHash }];
  await Promise.all(pins.map(async p => verifyRuntime(await rpc.send("eth_getCode", [p.address, tag]), p.runtimeCodeHash, "Governance dependency")));
  const read = async (to: string, method: string, args: unknown[] = [], abi = ordinaryReadAbi) => abi.decodeFunctionResult(method, await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, tag]));
  const wires = [[contract.address, "owner", common.governor], [contract.address, "token", common.rewardToken], [contract.address, "creditContract", credit.address], [common.governor, { basic: "basicContract", farms: "farmContract", reward: "fibonacceningContract" }[deployment], contract.address], [common.governor, "masterchef", common.masterchef], [common.governor, "creditContract", credit.address], [credit.address, "owner", common.governor], [credit.address, "masterchef", common.masterchef], [credit.address, "token", common.rewardToken], [common.rewardToken, "owner", common.masterchef], [common.rewardToken, "governor", common.governor], [common.masterchef, "owner", common.governor], [common.masterchef, "dtx", common.rewardToken]];
  if (deployment !== "basic") wires.push([contract.address, "masterchef", common.masterchef]);
  await Promise.all(wires.map(async ([to, method, expected]) => { if (getAddress((await read(to, method))[0]) !== getAddress(expected)) throw Error(method + " wiring changed."); }));
  if (!(await read(credit.address, "deductingContract", [contract.address]))[0] || !(await read(common.masterchef, "trustedContract", [credit.address]))[0]) throw Error("Voting-credit permissions changed.");
  return read;
}
type OrdinaryRead = Awaited<ReturnType<typeof ordinaryDependencies>>;
async function verifyCallFeeMiners(rpc: FarmReadRpc, read: OrdinaryRead, tag: string) {
  await Promise.all(MINER_PREVIEW_SPECS.map(async (miner, i) => {
    verifyRuntime(await rpc.send("eth_getCode", [miner.address, tag]), miner.runtimeCodeHash, "Call-fee miner");
    if (getAddress((await read(common.governor, "acPool" + (i + 1)))[0]) !== getAddress(miner.address)) throw Error("Governor miner list changed.");
  }));
}
function proposalFacts(row: any, family: string): [string, string][] {
  const fields = ORDINARY_DEPLOYMENTS[ORDINARY_MODELS[family].deployment].abi.find((a: any) => a.name === ORDINARY_MODELS[family].getter && a.type === "function") as any;
  const names: Record<string, string> = { proposedValue: "Proposed value", poolAddress: "Target miner", newBonus: "Rollover bonus", poolid: "Pool number", newAllocation: "Pool allocation", proposedType: "Vault parameter", isBurn: "Outcome", startTimestamp: "Earliest execution", rewardPerBlock: "OINK per block", duration: "Duration in blocks", startTime: "Event starts" };
  return fields.outputs.filter((o: any) => !["valid", "firstCallTimestamp", "valueSacrificedForVote", "valueSacrificedAgainst", "delay", "newDepositFee"].includes(o.name)).map((o: any) => {
    const value = row[o.name]; let text = String(value);
    if (["newBonus", "newAllocation"].includes(o.name)) text = formatUnits(value, 2) + "%";
    if (o.name === "isBurn") text = value ? "Burn OINK" : "Transfer OINK to protocol treasury";
    if (o.name === "proposedType") text = ["Deposit fee", "Funding charge per hour", "Referral bonus"][Number(value)] ?? "Unknown parameter";
    if (o.name === "rewardPerBlock") text = formatEther(value) + " OINK";
    if (o.name === "proposedValue") text = ["Voting cost", "Reward-event threshold", "Governor transfer or burn"].includes(family) ? formatEther(value) + " OINK" : family === "Enforcement delay" ? value + " seconds" : formatUnits(value, family === "Vault setting" && row.proposedType === 1n ? 4 : 2) + "%";
    if (["startTimestamp", "startTime"].includes(o.name)) text = value === 0n ? "No additional timestamp delay" : new Date(Number(value) * 1000).toISOString();
    return [names[o.name] ?? o.name, text];
  });
}
export async function prepareOrdinaryProposal(rpc: FarmReadRpc, account: string, request: ProtocolRequest): Promise<ProtocolQuote> {
  const family = request.args.family, model = ORDINARY_MODELS[family];
  if (request.module !== "ordinary" || !model || !["create", "support", "oppose", "veto", "execute"].includes(request.action)) throw Error("Unsupported ordinary proposal action.");
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("Use PulseChain.");
  const block = await rpc.send("eth_getBlockByNumber", ["latest", false]);
  const contract = ORDINARY_DEPLOYMENTS[model.deployment], abi = new Interface(contract.abi), read = await ordinaryDependencies(rpc, model.deployment, block.number);
  const cost = (await read(common.governor, "costToVote"))[0] as bigint, globalDelay = (await read(common.governor, "delayBeforeEnforce"))[0] as bigint;
  const timestamp = BigInt(block.timestamp), facts: [string, string][] = [["Proposal category", family]], warnings: string[] = [];
  let spend = 0n, values: any[], before: any[] = [], effects: string[] = [];
  if (request.action === "create") {
    values = ordinaryCreateArguments(family, request.args); spend = values[0];
    if (spend < cost || values.at(-1) > globalDelay) throw Error("Committed credit must cover the current voting cost and the requested voting window cannot exceed the global delay.");
    if (family === "New pool" && spend < cost * 500n) throw Error("Creating a pool proposal requires 500 times the current voting cost.");
    if (family === "Voting cost" && spend < values[1]) throw Error("Credit commitment must cover the proposed voting cost.");
    if (family === "Vault setting") { const cap = request.args.vaultType === "0" ? 500n : request.args.vaultType === "1" ? 250n : 2500n; if (values[2] > cap) throw Error("This setting exceeds the supported vault fee or referral limit."); }
    model.fields.forEach(f => facts.push([f.label, f.unit === "miner" ? MINER_PREVIEW_SPECS.find(m => m.id === request.args[f.key])!.address : f.unit === "bool" ? request.args[f.key] === "true" ? "Burn OINK" : "Transfer to protocol treasury" : f.unit === "vault" ? ["Deposit fee", "Funding charge per hour", "Referral bonus"][Number(request.args[f.key])] : request.args[f.key]])); facts.push(["Requested voting window", request.args.delay + " hours"], ["Current additional enforcement delay", globalDelay.toString() + " seconds"]);
    warnings.push("Submitting consumes voting credit and records a proposal; it does not apply the proposed change. Other users can oppose it.");
  } else {
    const id = uint(request.args.id, "Proposal number"), row = await read(contract.address, model.getter, [id], abi);
    if (!row.valid) throw Error("This proposal is already closed.");
    before = Array.from(row);
    const ends = row.firstCallTimestamp + row.delay + globalDelay;
    facts.push(["Proposal", id.toString()], ...proposalFacts(row, family), ["Support credit", formatEther(row.valueSacrificedForVote) + " OINK"], ["Opposition credit", formatEther(row.valueSacrificedAgainst) + " OINK"]);
    if (request.action === "support" || request.action === "oppose") {
      spend = decimal(request.args.credit, 18, "voting credit"); if (spend <= 0n || timestamp >= ends) throw Error("Voting is closed or the credit amount is zero.");
      values = request.action === "support" ? [id, spend] : [id, spend, false];
      warnings.push("Voting credit is consumed permanently. Opposing here records a vote without automatically vetoing the proposal.");
    } else if (request.action === "veto") {
      if (timestamp <= row.firstCallTimestamp + row.delay || row.valueSacrificedAgainst <= row.valueSacrificedForVote) throw Error("Veto requires the initial window to have ended and opposition to exceed support.");
      values = [id]; warnings.push("This closes the proposal as rejected. Spent voting credit is not refunded.");
    } else {
      if (timestamp <= ends || row.valueSacrificedForVote < row.valueSacrificedAgainst) throw Error("Execution requires the enforcement delay to have ended and support at least equal to opposition.");
      if (family === "Vault setting" && (row.proposedType > 2n || row.proposedValue > (row.proposedType === 0n ? 500n : row.proposedType === 1n ? 250n : 2500n))) throw Error("The proposed vault setting is outside supported bounds.");
      if (family === "Rollover bonus" && !MINER_PREVIEW_SPECS.some(m => getAddress(m.address) === getAddress(row.poolAddress))) throw Error("The target miner is not verified.");
      values = family === "Pool allocation" ? [id, true] : [id];
      if (family === "Harvest call fee") await verifyCallFeeMiners(rpc, read, block.number);
      if (family === "Reward boost") {
        const threshold = (await read(common.governor, "thresholdFibonaccening"))[0] as bigint;
        const balance = (await read(common.rewardToken, "balanceOf", [common.governor]))[0] as bigint;
        if ((await read(common.governor, "eventFibonacceningActive"))[0] || balance < threshold || timestamp < row.startTime) throw Error("Reward event is active, underfunded or has not reached its start time.");
        effects.push(threshold.toString()); facts.push(["Governor OINK burned to start event", formatEther(threshold) + " OINK"]);
        warnings.push("Starting this reward event burns the displayed OINK from the Governor and changes protocol emissions for the event duration.");
      }
      if (family === "Governor transfer or burn" && !row.isBurn) {
        const treasury = getAddress((await read(common.governor, "treasuryWallet"))[0]);
        if (treasury !== getAddress(common.treasuryWallet)) throw Error("Protocol treasury changed.");
        effects.push(treasury); facts.push(["Recipient treasury", treasury]);
      }
      if (family === "Governor transfer or burn" && (timestamp <= row.startTimestamp || (await read(common.rewardToken, "balanceOf", [common.governor]))[0] < row.proposedValue)) throw Error("The Governor transfer is not yet eligible or its OINK balance is insufficient.");
      if (family === "Pool allocation") warnings.push("Execution also rebalances registered pool allocations. This can change the emissions received by other pools.");
      warnings.push("This applies the selected change to the live protocol. Other voters' balances and future protocol behavior can be affected.");
    }
  }
  if (family === "New pool" && request.action !== "veto") {
    const address = getAddress(String(request.action === "create" ? values[1] : before[5]));
    const code = await rpc.send("eth_getCode", [address, block.number]);
    if (!code || code === "0x") throw Error("The proposed pool must be a deployed contract.");
    effects.push(keccak256(code)); facts.push(["Pool contract", address], ["Pool runtime hash", keccak256(code)]);
    warnings.push("Registering a pool does not audit its code or allocate rewards. Only propose or support a pool contract you have independently reviewed.");
    if (request.action === "execute") {
      const count = BigInt((await read(common.masterchef, "poolLength"))[0]);
      if (count >= 50n) throw Error("The registry has reached its 50-pool limit.");
      effects.push(count.toString());
    }
  }
  let storedCredit = 0n;
  if (spend) {
    storedCredit = (await read(credit.address, "userCredit", [account]))[0];
    if (storedCredit < spend) throw Error("Deposit enough voting credit first using Manage voting credit. This review requires the full commitment to be covered by stored credit.");
    facts.push(["Credit consumed", formatEther(spend) + " OINK"], ["Stored credit at review", formatEther(storedCredit) + " OINK"], ["Maximum fallback wallet burn", formatEther(spend) + " OINK"]);
    warnings.push("The contract uses stored credit first. If that balance falls before mining, it can burn up to the committed OINK amount from your wallet without a token approval. Do not spend the same credit elsewhere while this request is pending.");
  }
  const signature = ORDINARY_CALLS[family as keyof typeof ORDINARY_CALLS][request.action as "create" | "support" | "oppose" | "veto" | "execute"], call = new Interface([signature]), method = call.fragments[0].format("sighash"), data = call.encodeFunctionData(method, values);
  if ((await rpc.send("eth_getBlockByNumber", [block.number, false]))?.hash !== block.hash) throw Error("Snapshot changed.");
  return { title: ({ create: "Submit proposal", support: "Support proposal", oppose: "Oppose proposal", veto: "Veto proposal", execute: "Execute proposal" } as Record<string, string>)[request.action], account: getAddress(account), block: Number(BigInt(block.number)), blockHash: block.hash, timestamp: Number(timestamp), to: contract.address, data, value: "0x0", facts, warnings, fingerprint: JSON.stringify({ family, action: request.action, values, before, cost, globalDelay, storedCredit, effects }, (_, v) => typeof v === "bigint" ? v.toString() : v) };
}
function ordinaryEvents(receipt: ProtocolReceipt, address: string, name: string) {
  return receipt.logs.filter(log => !log.removed && getAddress(log.address) === getAddress(address)).flatMap(log => {
    try { const event = ordinaryReadAbi.parseLog(log); return event?.name === name ? [event.args] : []; } catch { return []; }
  });
}
function creditSpentAsReviewed(receipt: ProtocolReceipt, account: string, amount: bigint) {
  const deductions = ordinaryEvents(receipt, credit.address, "DeductCredit").filter(event => getAddress(event.from) === getAddress(account));
  if (deductions.length !== 1) return false;
  const burns = ordinaryEvents(receipt, common.rewardToken, "Transfer").filter(event => getAddress(event.from) === getAddress(account) && getAddress(event.to) === ZeroAddress);
  const burned = burns.reduce((sum, event) => sum + BigInt(event.value), 0n);
  // deductCredit emits the full commitment when stored credit suffices, but the
  // wallet-burn shortfall when credit runs out. Both branches are disclosed.
  return burned <= amount && deductions[0].amount === (burned > 0n ? burned : amount);
}
async function verifyExecutedOutcome(rpc: FarmReadRpc, read: OrdinaryRead, family: string, row: any, id: bigint, receipt: ProtocolReceipt, effects: string[], account: string) {
  const exact = async (address: string, name: string, value: bigint, args: unknown[] = [], abi = ordinaryReadAbi) => (await read(address, name, args, abi))[0] === value;
  const transferred = (from: string, to: string, amount: bigint) => ordinaryEvents(receipt, common.rewardToken, "Transfer").some(event => getAddress(event.from) === getAddress(from) && getAddress(event.to) === getAddress(to) && event.value === amount);
  switch (family) {
    case "New pool": {
      if (!effects[0] || !effects[1]) return false;
      if (keccak256(await rpc.send("eth_getCode", [row.newPool, receipt.blockNumber])) !== effects[0]) return false;
      const pool = await read(common.masterchef, "poolInfo", [BigInt(effects[1])]);
      return getAddress(pool[2]) === getAddress(row.newPool) && (await read(common.masterchef, "poolLength"))[0] > BigInt(effects[1]);
    }
    case "Voting cost": return exact(common.governor, "costToVote", row.proposedValue);
    case "Enforcement delay": return exact(common.governor, "delayBeforeEnforce", row.proposedValue);
    case "Reward-event threshold": return exact(common.governor, "thresholdFibonaccening", row.proposedValue);
    case "Rollover bonus": return exact(common.governor, "getRollBonus", row.newBonus, [row.poolAddress]);
    case "Harvest call fee": {
      await verifyCallFeeMiners(rpc, read, receipt.blockNumber);
      return (await Promise.all(MINER_PREVIEW_SPECS.map(miner => exact(miner.address, "callFee", row.proposedValue)))).every(Boolean);
    }
    case "Governor tax": return exact(common.masterchef, "governorFee", row.proposedValue);
    case "Vault setting": {
      const method = ["depositFee", "fundingRate", "referralBonus"][Number(row.proposedType)];
      return !!method && exact(common.governor, method, row.proposedValue);
    }
    case "Governor transfer or burn": {
      const destination = row.isBurn ? ZeroAddress : effects[0];
      return !!destination && (row.isBurn || getAddress(destination) === getAddress(common.treasuryWallet)) && transferred(common.governor, destination, row.proposedValue);
    }
    case "Pool allocation": {
      const abi = new Interface(ORDINARY_DEPLOYMENTS.farms.abi), address = ORDINARY_DEPLOYMENTS.farms.address;
      if (!await exact(address, "poolAllocationPercentage", row.newAllocation, [row.poolid], abi)) return false;
      const pulse = (await read(address, "percentageAllocatedToPulseEcosystem", [], abi))[0] as bigint;
      if (pulse >= 10000n || row.poolid <= 5n || row.poolid >= (await read(common.masterchef, "poolLength"))[0]) return false;
      const miners = await Promise.all(MINER_PREVIEW_SPECS.map(miner => read(common.masterchef, "poolInfo", [miner.poolId])));
      const minerTotal = miners.reduce((sum, pool) => sum + BigInt(pool[0]), 0n);
      const expected = (minerTotal * (100000000n / (10000n - pulse)) / 10000n) * row.newAllocation / 10000n;
      return (await read(common.masterchef, "poolInfo", [row.poolid]))[0] === expected;
    }
    case "Reward boost": {
      const address = ORDINARY_DEPLOYMENTS.reward.address, abi = new Interface(ORDINARY_DEPLOYMENTS.reward.abi);
      if (!effects[0] || !/^\d+$/.test(effects[0])) return false;
      const threshold = BigInt(effects[0]);
      if (!transferred(common.governor, address, threshold) || !transferred(address, ZeroAddress, threshold)) return false;
      // MasterChef records tx.origin, which is the reviewed EOA; Governor emits
      // SetInflation during the same execution but is not the event's user.
      if (!ordinaryEvents(receipt, common.governor, "SetInflation").some(event => event.rewardPerBlock === row.rewardPerBlock) || !ordinaryEvents(receipt, common.masterchef, "UpdateEmissions").some(event => getAddress(event.user) === getAddress(account) && event.newEmissions === row.rewardPerBlock)) return false;
      return (await read(common.governor, "eventFibonacceningActive"))[0] === true && await exact(common.masterchef, "DTXPerBlock", row.rewardPerBlock) && await exact(address, "fibonacceningActiveID", id, [], abi) && await exact(address, "fibonacceningActivatedBlock", BigInt(receipt.blockNumber), [], abi);
    }
    default: return false;
  }
}
export const ordinaryProposalAdapter: ProtocolAdapter = {
  prepare: prepareOrdinaryProposal,
  async verify(rpc, review, receipt) {
    const family = review.request.args.family, model = ORDINARY_MODELS[family]; if (!model) return false;
    const read = await ordinaryDependencies(rpc, model.deployment, receipt.blockNumber);
    const contract = ORDINARY_DEPLOYMENTS[model.deployment], abi = new Interface(contract.abi);
    if (getAddress(review.transaction.to) !== getAddress(contract.address)) return false;
    const tx = abi.parseTransaction({ data: review.transaction.data }); if (!tx) return false;
    const parsed = receipt.logs.filter(l => !l.removed && getAddress(l.address) === getAddress(contract.address)).flatMap(l => { try { const p = abi.parseLog(l); return p ? [p] : []; } catch { return []; } });
    if (review.request.action === "create") {
      const event = parsed.find(e => e.name === model.event && getAddress(e.args.enforcer) === getAddress(review.quote.account)); if (!event) return false;
      const evalues = Array.from(event.args).filter((_, i) => i !== 0 && abi.getEvent(model.event)!.inputs[i].name !== "enforcer");
      return model.eventOrder.every((inputIndex, i) => String(evalues[i]).toLowerCase() === String(tx.args[inputIndex]).toLowerCase()) && creditSpentAsReviewed(receipt, review.quote.account, tx.args[0]);
    }
    const id = uint(review.request.args.id, "Proposal number");
    if (review.request.action === "support" || review.request.action === "oppose") return parsed.some(e => e.name === "AddVotes" && e.args[0] === BigInt(model.eventType) && e.args.proposalID === id && getAddress(e.args.voter) === getAddress(review.quote.account) && e.args.tokensSacrificed === tx.args[1] && e.args._for === (review.request.action === "support")) && creditSpentAsReviewed(receipt, review.quote.account, tx.args[1]);
    if (!["execute", "veto"].includes(review.request.action) || !parsed.some(e => e.name === "EnforceProposal" && e.args[0] === BigInt(model.eventType) && e.args.proposalID === id && getAddress(e.args.enforcer) === getAddress(review.quote.account) && e.args.isSuccess === (review.request.action === "execute"))) return false;
    const row = await read(contract.address, model.getter, [id], abi), saved = JSON.parse(review.quote.fingerprint);
    if (row.valid || !Array.isArray(saved.before)) return false;
    // Proposal values are immutable; votes can change independently before the
    // transaction mines. Verify the actual setting that the user reviewed.
    const fields = abi.getFunction(model.getter)!.outputs;
    if (fields.some((field, index) => !["valid", "valueSacrificedForVote", "valueSacrificedAgainst"].includes(field.name) && String(row[index]).toLowerCase() !== String(saved.before[index]).toLowerCase())) return false;
    return review.request.action === "veto" || verifyExecutedOutcome(rpc, read, family, row, id, receipt, saved.effects ?? [], review.quote.account);
  },
};
