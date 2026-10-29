import { readNftAllocation } from "./nftAllocationState";
import { Interface, ZeroAddress, formatEther, getAddress } from "ethers";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { parseFarmDepositAmount, verifyRuntime, type FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolRequest } from "./protocolTransactions";

const common = VERIFIED_FARM_WRITES[0];
const { credit, consensus } = PARTICIPATION_CONTRACTS;
export const participationAbi = new Interface([
  "function token() view returns(address)", "function masterchef() view returns(address)", "function owner() view returns(address)",
  "function governor() view returns(address)", "function creditContract() view returns(address)", "function consensusContract() view returns(address)",
  "function dtx() view returns(address)", "function trustedContract(address) view returns(bool)", "function creditingContract(address) view returns(bool)",
  "function admin() view returns(address)", "function treasury() view returns(address)", "function poolID() view returns(uint256)",
  "function poolInfo(uint256) view returns(uint256,uint256,address)", "function votingCreditAddress() view returns(address)",
  "function migrationPool() view returns(address)", "function credit(address) view returns(uint256)",
  "function userCredit(address) view returns(uint256)", "function balanceOf(address) view returns(uint256)",
  "function getUserTotalShares(address) view returns(uint256)", "function userVote(address) view returns(uint256)", "function userDelegate(address) view returns(address)",
  "function getNrOfStakes(address) view returns(uint256)", "function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)",
  "function totalShares() view returns(uint256)",
  "function proposalLengths() view returns(uint256,uint256)", "function consensusProposal(uint256) view returns(uint16,address,uint256)",
  "function treasuryProposal(uint256) view returns(bool,uint256,uint256,uint256,uint256,address,address,uint256,uint256)",
  "function isGovInvalidated(address) view returns(bool,bool)",
  "function depositCredit(uint256)", "function burnCredit(uint256,uint256)", "function voteForProposal(uint256,bool)",
  "function setDelegate(address,bool)", "function delegateeVote(address[],uint256)", "function votingCredit(uint256,uint256)",
  "event AddCredit(address indexed depositor,uint256 amount)", "event BurnCredit(address indexed burnFrom,uint256 amount,uint256 indexed forId)",
  "event Transfer(address indexed from,address indexed to,uint256 value)", "event SetDelegate(address userDelegating,address delegatee)",
  "event AddVotes(address indexed voter,uint256 proposalID,uint256 change)", "event RemoveVotes(address indexed voter,uint256 proposalID,uint256 change)",
  "event Withdraw(address indexed sender,uint256 amount,uint256 penalty,uint256 shares)",
]);
const poolBalanceAbi = new Interface(["function balanceOf() view returns(uint256)"]);
const same = (actual: string, expected: string, label: string) => { if (getAddress(actual) !== getAddress(expected)) throw Error(`${label} changed. Refresh the application before using this action.`); };
export function participationUint(value: string | undefined, label: string, positive = false) {
  if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) throw Error(`${label} must be a whole number.`);
  const number = BigInt(value);
  if (number >= 2n ** 256n || (positive && number === 0n)) throw Error(`${label} is outside the supported range.`);
  return number;
}
export function participationVoters(input: string) {
  const rows = input.trim().split(/[\s,;]+/).filter(Boolean).map(getAddress);
  if (!rows.length || rows.length > 25 || new Set(rows).size !== rows.length || rows.includes(ZeroAddress)) throw Error("Enter 1–25 distinct, nonzero delegating wallets.");
  return rows;
}
async function snapshot(rpc: FarmReadRpc, input: string, now: number) {
  const account = getAddress(input);
  if (account === ZeroAddress) throw Error("Connect a wallet first.");
  if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw Error("Participation requires PulseChain.");
  const block = await rpc.send("eth_getBlockByNumber", ["latest", false]);
  if (!block?.hash || !block.number || !block.timestamp) throw Error("Block snapshot unavailable.");
  const number = Number(BigInt(block.number)), timestamp = Number(BigInt(block.timestamp));
  if (!Number.isSafeInteger(number) || !Number.isSafeInteger(timestamp) || now - timestamp * 1000 > 120000 || timestamp * 1000 - now > 30000) throw Error("The RPC snapshot is stale. Retry the review.");
  const read = async (to: string, method: string, args: unknown[] = [], abi = participationAbi) => abi.decodeFunctionResult(method, await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, block.number]));
  const finish = async () => { if ((await rpc.send("eth_getBlockByNumber", [block.number, false]))?.hash !== block.hash) throw Error("The review block changed. Review again."); };
  return { account, block, number, timestamp, read, finish };
}
export type ParticipationSnapshot = Awaited<ReturnType<typeof snapshot>>;
type Snapshot = ParticipationSnapshot;
async function dependencies(rpc: FarmReadRpc, s: Snapshot, minerId?: string) {
  const miner = minerId ? MINER_PREVIEW_SPECS.find(row => row.id === minerId) : undefined;
  if (minerId && !miner) throw Error("Select a verified time miner.");
  const pins = [credit, consensus, { address: common.rewardToken, runtimeCodeHash: common.rewardTokenRuntimeCodeHash }, { address: common.masterchef, runtimeCodeHash: common.masterchefRuntimeCodeHash }, { address: common.governor, runtimeCodeHash: common.governorRuntimeCodeHash }, ...(miner ? [miner] : [])];
  await Promise.all(pins.map(async pin => verifyRuntime(await rpc.send("eth_getCode", [pin.address, s.block.number]), pin.runtimeCodeHash, "Participation contract")));
  const wiring = [[credit.address, "token", common.rewardToken], [credit.address, "masterchef", common.masterchef], [credit.address, "owner", common.governor],
    [consensus.address, "token", common.rewardToken], [consensus.address, "owner", common.governor], [consensus.address, "creditContract", credit.address],
    [common.rewardToken, "owner", common.masterchef], [common.rewardToken, "governor", common.governor],
    [common.masterchef, "owner", common.governor], [common.masterchef, "dtx", common.rewardToken],
    [common.governor, "masterchef", common.masterchef], [common.governor, "creditContract", credit.address], [common.governor, "consensusContract", consensus.address],
    ...(miner ? [[miner.address, "token", common.rewardToken], [miner.address, "masterchef", common.masterchef], [miner.address, "admin", common.governor], [miner.address, "treasury", common.governor], [miner.address, "votingCreditAddress", credit.address], [miner.address, "migrationPool", ZeroAddress]] : [])];
  await Promise.all(wiring.map(async ([to, method, expected]) => same((await s.read(to, method))[0], expected, method)));
  if (!(await s.read(common.masterchef, "trustedContract", [credit.address]))[0]) throw Error("Voting-credit burns are no longer authorized by MasterChef.");
  if (miner) {
    if ((await s.read(miner.address, "poolID"))[0] !== BigInt(miner.poolId)) throw Error("Miner pool ID changed.");
    same((await s.read(common.masterchef, "poolInfo", [miner.poolId]))[2], miner.address, "Miner registration");
  }
  return miner;
}
/** Pinned core snapshot shared by ordinary governance; read methods use this block. */
export async function checkedParticipationSnapshot(rpc: FarmReadRpc, account: string, now = Date.now()) {
  const state = await snapshot(rpc, account, now);
  await dependencies(rpc, state);
  return state;
}
async function target(rpc: FarmReadRpc, s: Snapshot, args: Record<string, string>) {
  if (args.targetKind === "neutral") return { position: 0n, label: "Neutral — stop voting", identity: "neutral" };
  if (args.stance !== "support" && args.stance !== "oppose") throw Error("Select support or opposition.");
  if (args.targetKind === "nft") {
    const row = await readNftAllocation(rpc, s, args.candidate);
    if (row.approved || row.predecessorPending) throw Error("This candidate is already approved or conflicts with a pending ballot.");
    return { position: args.stance === "support" ? row.support : row.opposition, label: `${args.stance === "support" ? "Support" : "Oppose"} NFT allocation ${row.candidate}`, identity: JSON.stringify(row, (_, v) => typeof v === "bigint" ? v.toString() : v) };
  }
  const id = participationUint(args.targetId, "Proposal ID");
  const counts = await s.read(consensus.address, "proposalLengths");
  let support: bigint, label: string, identity: string;
  if (args.targetKind === "treasury") {
    if (id >= counts[0]) throw Error("Treasury request does not exist.");
    const row = await s.read(consensus.address, "treasuryProposal", [id]);
    if (!row[0]) throw Error("This treasury request is already closed.");
    support = row[8];
    label = `${args.stance === "support" ? "Support" : "Block"} treasury withdrawal ${id}: ${row[7]} base units of ${getAddress(row[5])} to ${getAddress(row[6])}`;
    identity = ["treasury", id, row[1], row[4], row[5], row[6], row[7], support].join(":");
  } else if (args.targetKind === "governor") {
    support = id;
    label = `${args.stance === "support" ? "Support" : "Oppose"} Governor replacement`;
    identity = "governor";
  } else throw Error("Select a verified proposal target.");
  if (support === 0n || support % 2n !== 1n || support + 1n >= counts[1]) throw Error("Proposal position mapping is invalid.");
  const [yes, no] = await Promise.all([s.read(consensus.address, "consensusProposal", [support]), s.read(consensus.address, "consensusProposal", [support + 1n])]);
  if (yes[0] !== no[0] || yes[1] !== no[1] || yes[2] !== no[2]) throw Error("Paired proposal positions do not match.");
  if (args.targetKind === "governor") {
    if (yes[0] !== 0n || getAddress(yes[1]) === ZeroAddress || (await s.read(consensus.address, "isGovInvalidated", [yes[1]]))[0]) throw Error("This Governor proposal is invalidated or unavailable.");
    label += `: ${getAddress(yes[1])}`;
    identity += `:${support}:${yes[1]}:${yes[2]}`;
  } else {
    if (yes[0] !== 1n) throw Error("This is not a treasury consensus position.");
    same(yes[1], consensus.address, "Treasury position beneficiary");
  }
  return { position: support + (args.stance === "oppose" ? 1n : 0n), label, identity };
}

export async function prepareParticipation(rpc: FarmReadRpc, account: string, request: ProtocolRequest, now = Date.now()): Promise<ProtocolQuote> {
  if (request.module !== "participation" || !["credit-deposit", "credit-burn", "miner-vote", "delegate", "delegated-vote", "convert"].includes(request.action)) throw Error("Unsupported participation action.");
  const s = await snapshot(rpc, account, now);
  const isMiner = !request.action.startsWith("credit-");
  if (isMiner && !request.args.minerId) throw Error("Select a time miner.");
  const miner = await dependencies(rpc, s, isMiner ? request.args.minerId : undefined);
  const facts: [string, string][] = [], warnings: string[] = [];
  let title: string, to: string, data: string;
  const state: Record<string, unknown> = { action: request.action, account: s.account };
  if (!miner) {
    const amount = parseFarmDepositAmount(request.args.amount, 18);
    const existing = (await s.read(credit.address, "userCredit", [s.account]))[0];
    state.credit = existing.toString(); state.amount = amount.toString();
    to = credit.address;
    if (request.action === "credit-deposit") {
      if ((await s.read(common.rewardToken, "balanceOf", [s.account]))[0] < amount) throw Error("Amount exceeds your wallet's OINK balance.");
      title = "Burn OINK for voting credit";
      data = participationAbi.encodeFunctionData("depositCredit", [amount]);
      facts.push(["OINK permanently burned", formatEther(amount) + " OINK"], ["Voting credit received", formatEther(amount)], ["Credit after deposit", formatEther(existing + amount)]);
      warnings.push("This permanently burns liquid OINK from your wallet. Voting credit cannot be withdrawn or transferred back into OINK.", "No token approval is required. The voting-credit contract calls MasterChef's privileged burn after you confirm this transaction.");
    } else {
      const forId = participationUint(request.args.forId, "Credit burn reference");
      if (existing < amount) throw Error("Amount exceeds your existing voting credit.");
      state.forId = forId.toString();
      title = "Destroy existing voting credit";
      data = participationAbi.encodeFunctionData("burnCredit", [amount, forId]);
      facts.push(["Voting credit destroyed", formatEther(amount)], ["Burn reference ID", forId.toString()], ["Credit remaining", formatEther(existing - amount)]);
      warnings.push("This destroys voting credit without receiving OINK or casting a proposal vote. The reference ID is an arbitrary on-chain counter; it does not identify a verified proposal.");
    }
  } else {
    to = miner.address; state.miner = miner.id;
    facts.push(["Time miner", miner.label]);
    if (request.action === "delegate") {
      const delegate = getAddress(request.args.delegate);
      const previous = getAddress((await s.read(to, "userDelegate", [s.account]))[0]);
      if (delegate === s.account) throw Error("Use your own vote control, or enter another wallet as delegate.");
      if (previous === delegate) throw Error("That delegate is already selected.");
      state.previousDelegate = previous; state.delegate = delegate;
      title = delegate === ZeroAddress ? "Remove miner voting delegate" : "Delegate miner voting power";
      data = participationAbi.encodeFunctionData("setDelegate", [delegate, false]);
      facts.push(["Previous delegate", previous === ZeroAddress ? "None" : previous], ["New delegate", delegate === ZeroAddress ? "None" : delegate]);
      warnings.push("A delegate can change this miner's proposal selection for your entire current and future share balance until you remove them. They receive no withdrawal or token-transfer permission.", "Changing or removing the delegate does not reset your existing proposal selection. Use the neutral vote option to stop voting.");
    } else if (request.action === "convert") {
      const id = participationUint(request.args.stakeId, "Position ID");
      const shares = participationUint(request.args.shares, "Raw shares", true);
      if (id >= (await s.read(to, "getNrOfStakes", [s.account]))[0]) throw Error("Position no longer exists. Refresh your positions.");
      const [position, total, balance, publishedCredit, allowed, currentVote] = await Promise.all([
        s.read(to, "userInfo", [s.account, id]), s.read(to, "totalShares"), s.read(to, "balanceOf", [], poolBalanceAbi),
        s.read(common.masterchef, "credit", [to]), s.read(credit.address, "creditingContract", [to]), s.read(to, "userVote", [s.account]),
      ]);
      if (!allowed[0]) throw Error("This miner cannot issue voting credit.");
      if (shares > position[0] || total[0] < position[0] || total[0] === 0n) throw Error("The requested share amount exceeds the selected position.");
      const amount = balance[0] * shares / total[0];
      if (amount === 0n || amount > publishedCredit[0]) throw Error("The miner's currently credited OINK cannot cover this conversion. Harvest the miner first or reduce the share amount.");
      state.stakeId = id.toString(); state.shares = shares.toString(); state.position = position.map(String); state.currentVote = currentVote[0].toString();
      title = "Convert miner shares into voting credit";
      data = participationAbi.encodeFunctionData("votingCredit", [shares, id]);
      facts.push(["Position", "#" + id], ["Raw shares permanently removed", shares.toString()], ["Estimated voting credit received", formatEther(amount)], ["OINK recipient", common.governor + " (Governor)"], ["OINK received in wallet", "0"], ["Withdrawal penalty", "None for this conversion"]);
      warnings.push("This irreversibly removes the selected miner shares. Their full OINK value goes to the Governor contract and you receive nonwithdrawable voting credit instead of wallet OINK.", "The credit estimate changes with miner rewards before mining. Other position indexes can change if this fully removes the selected position; do not change it through another interface while pending.");
    } else {
      const chosen = await target(rpc, s, request.args);
      const voters = request.action === "delegated-vote" ? participationVoters(request.args.voters || "") : [s.account];
      const voterRows = [];
      for (const voter of voters) {
        const [shares, selected, delegate] = await Promise.all([s.read(to, "getUserTotalShares", [voter]), s.read(to, "userVote", [voter]), s.read(to, "userDelegate", [voter])]);
        if (request.action === "delegated-vote" && getAddress(delegate[0]) !== s.account) throw Error(`${voter} has not delegated this miner to your wallet.`);
        if (shares[0] <= 0n) throw Error(`${voter} has no shares in this miner.`);
        if (selected[0] === chosen.position) throw Error(`${voter} already holds this proposal selection.`);
        voterRows.push({ address: voter, shares: shares[0].toString(), previous: selected[0].toString(), delegate: getAddress(delegate[0]) });
      }
      state.position = chosen.position.toString(); state.target = chosen.identity; state.voters = voterRows;
      title = request.action === "delegated-vote" ? "Cast delegated miner votes" : "Change miner proposal selection";
      data = request.action === "delegated-vote" ? participationAbi.encodeFunctionData("delegateeVote", [voters, chosen.position]) : participationAbi.encodeFunctionData("voteForProposal", [chosen.position, false]);
      facts.push(["Proposal", chosen.label], ["Consensus position", chosen.position.toString()], ["Wallets whose votes change", voters.join(", ")], ["Voting credit spent", "0"]);
      warnings.push("This moves all recorded shares in the selected miner from each wallet's previous selection to this position. It does not move, withdraw, or burn their staked OINK.", "Miner votes influence treasury withdrawals, Governor replacement and NFT allocations. A vote stays selected until changed, and share changes adjust its voting power.");
    }
  }
  await s.finish();
  return { title, account: s.account, block: s.number, blockHash: s.block.hash, timestamp: s.timestamp, to, data, value: "0x0", facts, warnings, fingerprint: JSON.stringify(state) };
}

export async function readParticipationPositions(rpc: FarmReadRpc, account: string, minerId: string, start = 0, now = Date.now()) {
  if (!Number.isSafeInteger(start) || start < 0) throw Error("Invalid position page.");
  const s = await snapshot(rpc, account, now), miner = await dependencies(rpc, s, minerId);
  if (!miner) throw Error("Select a miner.");
  const [rawCount, total, balance] = await Promise.all([s.read(miner.address, "getNrOfStakes", [s.account]), s.read(miner.address, "totalShares"), s.read(miner.address, "balanceOf", [], poolBalanceAbi)]);
  const count = Number(rawCount[0]);
  if (!Number.isSafeInteger(count) || start >= count && count !== 0) throw Error("This position page no longer exists. Reload from the start.");
  const positions = await Promise.all(Array.from({ length: Math.min(20, Math.max(0, count - start)) }, async (_, offset) => {
    const index = start + offset, row = await s.read(miner.address, "userInfo", [s.account, index]);
    if (row[0] > total[0]) throw Error("Position shares exceed the miner total.");
    return { index, shares: row[0].toString(), estimatedValue: formatEther(total[0] > 0n ? balance[0] * row[0] / total[0] : 0n) };
  }));
  await s.finish();
  return { account: s.account, minerId, start, count, block: s.number, timestamp: s.timestamp, positions };
}
export type ParticipationPositions = Awaited<ReturnType<typeof readParticipationPositions>>;

// The shared runner verifies sender, chain, calldata, successful canonical receipt,
// and transaction identity. This adapter verifies the specific contract effects.
export const participationAdapter: ProtocolAdapter = {
  prepare: prepareParticipation,
  async verify(rpc, review, receipt) {
    try {
      const { quote, request } = review;
      const state = JSON.parse(quote.fingerprint);
      const tag = receipt.blockNumber;
      const read = async (to: string, method: string, args: unknown[] = []) => participationAbi.decodeFunctionResult(method, await rpc.send("eth_call", [{ to, data: participationAbi.encodeFunctionData(method, args) }, tag]));
      const miner = MINER_PREVIEW_SPECS.find(row => row.id === request.args.minerId);
      for (const pin of [credit, { address: common.rewardToken, runtimeCodeHash: common.rewardTokenRuntimeCodeHash }, ...(miner ? [miner] : [])]) verifyRuntime(await rpc.send("eth_getCode", [pin.address, tag]), pin.runtimeCodeHash, "Receipt contract");
      const events = (address: string, name: string) => (receipt.logs || []).filter((log: { address: string }) => getAddress(log.address) === getAddress(address)).flatMap((log: { topics: string[]; data: string }) => { try { const row = participationAbi.parseLog(log); return row?.name === name ? [row.args] : []; } catch { return []; } });
      const addr = (a: string, b: string) => getAddress(a) === getAddress(b);
      if (request.action === "credit-deposit") {
        const amount = parseFarmDepositAmount(request.args.amount, 18);
        return events(credit.address, "AddCredit").some(row => addr(row[0], quote.account) && row[1] === amount) && events(common.rewardToken, "Transfer").some(row => addr(row[0], quote.account) && addr(row[1], ZeroAddress) && row[2] === amount);
      }
      if (request.action === "credit-burn") return events(credit.address, "BurnCredit").some(row => addr(row[0], quote.account) && row[1] === parseFarmDepositAmount(request.args.amount, 18) && row[2] === participationUint(request.args.forId, "Reference ID"));
      if (!miner || !addr(quote.to, miner.address)) return false;
      if (request.action === "delegate") return events(miner.address, "SetDelegate").some(row => addr(row[0], quote.account) && addr(row[1], request.args.delegate)) && addr((await read(miner.address, "userDelegate", [quote.account]))[0], request.args.delegate);
      if (request.action === "convert") {
        const shares = participationUint(request.args.shares, "Shares", true);
        return events(miner.address, "Withdraw").some(row => addr(row[0], common.governor) && row[1] > 0n && row[2] === 0n && row[3] === shares && events(credit.address, "AddCredit").some(add => addr(add[0], quote.account) && add[1] === row[1]) && events(common.rewardToken, "Transfer").some(mint => addr(mint[0], ZeroAddress) && addr(mint[1], common.governor) && mint[2] === row[1]));
      }
      if (!["miner-vote", "delegated-vote"].includes(request.action) || !Array.isArray(state.voters) || !state.voters.length) return false;
      const selected = BigInt(state.position);
      for (const voter of state.voters) {
        if ((await read(miner.address, "userVote", [voter.address]))[0] !== selected) return false;
        const shares = BigInt(voter.shares), previous = BigInt(voter.previous);
        if (selected !== 0n && !events(miner.address, "AddVotes").some(row => addr(row[0], voter.address) && row[1] === selected && row[2] === shares)) return false;
        if (previous !== 0n && !events(miner.address, "RemoveVotes").some(row => addr(row[0], voter.address) && row[1] === previous && row[2] === shares)) return false;
      }
      return true;
    } catch { return false; }
  },
};
