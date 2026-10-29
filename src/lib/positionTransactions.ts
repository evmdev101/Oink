import { Interface, getAddress, toQuantity, type Eip1193Provider } from "ethers";
import { previewFarmExit, previewMiner, type MinerAction, type PositionPreview } from "./positionPreviews";
import { type FarmReadRpc } from "./farmTransactions";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { verifyFarmTokenState } from "./farmTokenSafety";
import { journalBlocks, readFarmJournal } from "./farmTransactionJournal";
import { positionScope, scopedJournalKey, journalRaws } from "./actionJournal";
import { assertCurrentFarmSpec, farmSpecIdentity, getFarmWriteSpec, isDiscoveredFarmId } from "./farmCatalog";

export type PositionRequest = { type:"miner"; id:string; action:MinerAction } | { type:"farm"; id:string; index:number; kind:"claim"|"withdraw"|"emergency"; destination:string };
export type PositionReview = { request:PositionRequest; quote:PositionPreview; transaction:{from:string;to:string;data:string;value:string;chainId:string;gas:string}; gasCost:string; createdAt:number; blockHash:string; farmSpecIdentity?:string };
export type PositionJournal = { review:PositionReview; state:"requesting"|"pending"|"uncertain"|"confirmed"|"failed"|"resolved"; hash:string|null; message:string };
export const positionLock = (account:string) => "oink-position-wallet:" + getAddress(account).toLowerCase();
const key = (account:string) => "oink:position-transaction:v1:369:" + getAddress(account).toLowerCase();
const hashPattern = /^0x[\da-f]{64}$/i;
export const minerEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
  "event GiftDeposit(address indexed sender,address indexed recipient,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
  "event Withdraw(address indexed sender,uint256 amount,uint256 penalty,uint256 shares)",
  "event TransferStake(address indexed sender,address indexed recipient,uint256 shares,uint256 stakeID)",
  "event HopPool(address indexed sender,uint256 DTXamount,uint256 shares,address indexed newPool)",
  "event HopDeposit(address indexed recipient,uint256 amount,uint256 shares,uint256 previousLastDepositedTime,uint256 mandatoryTime)",
  "event AddAndExtendStake(address indexed sender,address indexed recipient,uint256 amount,uint256 stakeID,uint256 shares,uint256 lastDepositedTime)",
]);
export const governorRolloverEvents = new Interface(["event GiveRolloverBonus(address indexed recipient,uint256 amount,address indexed poolInto)"]);
const rolloverPositionAbi = new Interface(["function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)", "function getNrOfStakes(address) view returns(uint256)"]);
export const farmExitEvents = new Interface([
  "event SelfHarvest(address indexed user,address indexed harvestInto,uint256 harvestAmount,uint256 penalty)",
  "event Withdraw(address indexed sender,uint256 stakeID,uint256 harvestAmount,uint256 penalty)",
]);
function validReview(r:PositionReview, account:string) {
  if (!r || !r.quote?.execution || getAddress(r.quote.account) !== getAddress(account) || getAddress(r.transaction.from) !== getAddress(account) || r.transaction.chainId !== "0x171" || r.transaction.value !== "0x0" || !hashPattern.test(r.blockHash) || !Number.isSafeInteger(r.createdAt)) throw Error("Saved review is invalid.");
  const spec = r.request.type === "miner" ? MINER_PREVIEW_SPECS.find(v => v.id === r.request.id) : r.request.type === "farm" ? getFarmWriteSpec(r.request.id) : undefined;
  // A saved dynamic request remains visible for recovery while discovery is
  // unavailable. Its saved target is evidence, never permission to send.
  const savedDynamic = r.request.type === "farm" && isDiscoveredFarmId(r.request.id) && r.request.id === "registry-" + getAddress(r.transaction.to).toLowerCase() && typeof r.farmSpecIdentity === "string";
  if (savedDynamic && (!spec || getAddress(spec.address) === getAddress(r.transaction.to))) {
    if (getAddress(r.quote.execution.to) !== getAddress(r.transaction.to) || r.quote.execution.data !== r.transaction.data || !/^0x(?:[\da-f]{2}){4,}$/i.test(r.transaction.data)) throw Error("Saved transaction target is invalid.");
    return;
  }
  if (!spec || getAddress(spec.address) !== getAddress(r.transaction.to) || getAddress(r.quote.execution.to) !== getAddress(r.transaction.to) || r.quote.execution.data !== r.transaction.data || !/^0x(?:[\da-f]{2}){4,}$/i.test(r.transaction.data)) throw Error("Saved transaction target is invalid.");
}
export function readPositionJournal(account:string, storage:Pick<Storage,"getItem"> = localStorage, request?:PositionRequest):PositionJournal|null {
  const scopedRaw = request ? storage.getItem(scopedJournalKey(key(account), positionScope(request))) : null;
  const raw = scopedRaw ?? storage.getItem(key(account));
  if (raw === null) return null;
  try {
    const entry = JSON.parse(raw) as PositionJournal;
    if (request && positionScope(entry.review.request) !== positionScope(request)) return null;
    validReview(entry.review,account);
    if (!["requesting","pending","uncertain","confirmed","failed","resolved"].includes(entry.state) || typeof entry.message !== "string" || (entry.hash !== null && !hashPattern.test(entry.hash)) || (["pending","confirmed","failed"].includes(entry.state) && !entry.hash)) throw Error();
    return entry;
  } catch { if(request && scopedRaw===null)return null; throw Error("Saved wallet request cannot be read. Check wallet activity; new requests are blocked."); }
}
export function writePositionJournal(entry:PositionJournal, storage:Pick<Storage,"getItem"|"setItem"> = localStorage) {
  validReview(entry.review,entry.review.quote.account);
  const raw = JSON.stringify(entry), target = key(entry.review.quote.account);
  storage.setItem(scopedJournalKey(target, positionScope(entry.review.request)),raw);
  storage.setItem(target,raw);
  if (storage.getItem(target) !== raw || storage.getItem(scopedJournalKey(target,positionScope(entry.review.request))) !== raw) throw Error("Wallet request could not be saved. Check wallet activity before continuing.");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("oink-position-journal"));
}
export function positionJournalBlocks(entry:PositionJournal|null) { return !!entry?.hash && ["pending","uncertain"].includes(entry.state); }
export function listPositionJournals(account:string, storage:Pick<Storage,"getItem"> = localStorage):PositionJournal[] {
  const entries = new Map<string,PositionJournal>();
  for (const raw of journalRaws(key(account), storage)) {
    try { const entry=JSON.parse(raw) as PositionJournal; validReview(entry.review,account); entries.set(positionScope(entry.review.request),entry); } catch { /* One old record cannot lock other actions. */ }
  }
  return [...entries.values()];
}
export function assertNoPendingPosition(account:string, request:PositionRequest) {
  if (positionJournalBlocks(readPositionJournal(account, localStorage, request))) throw Error("This action is already pending in your wallet.");
}
export function assertNoPendingFarm(account:string, id:string) {
  if (journalBlocks(readFarmJournal(account,id))) throw Error("This farm action is already pending in your wallet.");
}

function assertFarmReviewPermission(review:PositionReview) {
  if (review.request.type !== "farm") return;
  const spec = getFarmWriteSpec(review.request.id);
  if (!spec || getAddress(spec.address) !== getAddress(review.transaction.to) || (review.farmSpecIdentity !== undefined && review.farmSpecIdentity !== farmSpecIdentity(spec)) || (isDiscoveredFarmId(review.request.id) && review.farmSpecIdentity === undefined)) throw Error("This farm's verified configuration is unavailable or changed. Refresh the farm before continuing.");
  assertCurrentFarmSpec(spec);
}

export async function preparePositionTransaction(rpc:FarmReadRpc, account:string, request:PositionRequest, now=Date.now()):Promise<PositionReview> {
  const farmSpec = request.type === "farm" ? getFarmWriteSpec(request.id) : undefined;
  if (request.type === "farm" && !farmSpec) throw Error("This farm's verified configuration is unavailable. Refresh the farm before continuing.");
  const quote = request.type === "miner" ? await previewMiner(rpc,request.id,account,request.action,now) : await previewFarmExit(rpc,request.id,account,request.index,request.kind,now,request.destination);
  if (!quote.execution || !quote.simulation.startsWith("Passed")) throw Error(quote.simulation);
  const tag = toQuantity(quote.block), block = await rpc.send("eth_getBlockByNumber",[tag,false]);
  if (!block?.hash || block.hash !== quote.blockHash || Number(BigInt(block.timestamp)) !== quote.timestamp) throw Error("Snapshot changed. Review again.");
  if (await rpc.send("eth_getCode",[quote.account,tag]) !== "0x") throw Error("These actions currently support standard externally owned wallets only.");
  const transaction = {from:quote.account,to:quote.execution.to,data:quote.execution.data,value:"0x0",chainId:"0x171",gas:"0x0"};
  const { gas: _gas, ...simulationTx } = transaction;
  const estimate = BigInt(await rpc.send("eth_estimateGas",[simulationTx,tag]));
  if (estimate <= 0n) throw Error("Gas estimation failed.");
  const budget = (estimate*120n+99n)/100n, price = BigInt(await rpc.send("eth_gasPrice",[])), cost = budget*price;
  if (price <= 0n || BigInt(await rpc.send("eth_getBalance",[quote.account,tag])) < cost) throw Error("Keep enough PLS in your wallet for gas.");
  transaction.gas = toQuantity(budget);
  if ((await rpc.send("eth_getBlockByNumber",[tag,false]))?.hash !== block.hash) throw Error("Snapshot changed. Review again.");
  if (farmSpec) assertCurrentFarmSpec(farmSpec);
  return {request,quote,transaction,gasCost:cost.toString(),createdAt:now,blockHash:block.hash,...(farmSpec ? {farmSpecIdentity:farmSpecIdentity(farmSpec)} : {})};
}
export function assertSamePositionTerms(old:PositionReview, fresh:PositionReview) {
  if (old.quote.account !== fresh.quote.account || old.transaction.to !== fresh.transaction.to || old.transaction.data !== fresh.transaction.data || old.quote.execution?.fingerprint !== fresh.quote.execution?.fingerprint || BigInt(fresh.quote.execution!.minimumOutput) < BigInt(old.quote.execution!.minimumOutput)) throw Error("Position or payout terms changed. Review the updated action before continuing.");
}
export async function requestPositionTransaction(review:PositionReview, provider:Eip1193Provider, rpc:FarmReadRpc, current:()=>boolean, onWalletRequest?:()=>void) {
  let walletRequestStarted=false;
  try {
  assertFarmReviewPermission(review);
  const check = async () => {
    const [accounts,chain] = await Promise.all([provider.request({method:"eth_accounts"}),provider.request({method:"eth_chainId"})]);
    if (!Array.isArray(accounts) || !accounts[0] || getAddress(accounts[0]) !== getAddress(review.quote.account) || BigInt(chain) !== 369n || !current() || Date.now() < review.createdAt || Date.now()-review.createdAt > 60000) throw Error("Wallet changed or review expired. Review again.");
    assertFarmReviewPermission(review);
  };
  await check();
  const fresh = await preparePositionTransaction(rpc,review.quote.account,review.request);
  assertSamePositionTerms(review,fresh);
  await check();
  // Only called after the user's explicit action; never retry a send.
  onWalletRequest?.();
  walletRequestStarted=true;
  const hash = await provider.request({method:"eth_sendTransaction",params:[fresh.transaction]});
  if (typeof hash !== "string" || !hashPattern.test(hash)) throw Error("Wallet response is uncertain. Check wallet activity; do not resubmit.");
  return hash;
  } catch(error) {
    throw Object.assign(new Error(error instanceof Error ? error.message : "Wallet request failed."), {walletRequestStarted,code:(error as {code?:number})?.code});
  }
}
export async function verifyPositionReceipt(rpc:FarmReadRpc,review:PositionReview,hash:string):Promise<{state:"pending"|"uncertain"|"confirmed"|"failed";message:string}> {
  assertFarmReviewPermission(review);
  if (!hashPattern.test(hash) || BigInt(await rpc.send("eth_chainId",[])) !== 369n) throw Error("Invalid receipt request.");
  const receipt = await rpc.send("eth_getTransactionReceipt",[hash]);
  if (receipt === null) return {state:"pending",message:"Waiting for mining. Do not resubmit."};
  const uncertain = {state:"uncertain" as const,message:"Receipt effects could not be fully verified. Check the explorer; do not repeat this action."};
  try {
    const tx = await rpc.send("eth_getTransactionByHash",[hash]);
    if (!tx || receipt.transactionHash.toLowerCase() !== hash.toLowerCase() || tx.hash.toLowerCase() !== hash.toLowerCase() || getAddress(receipt.from) !== getAddress(review.quote.account) || getAddress(tx.from) !== getAddress(review.quote.account) || getAddress(receipt.to) !== getAddress(review.transaction.to) || getAddress(tx.to) !== getAddress(review.transaction.to) || tx.input.toLowerCase() !== review.transaction.data.toLowerCase() || BigInt(tx.value) !== 0n || !hashPattern.test(receipt.blockHash) || tx.blockHash !== receipt.blockHash || tx.blockNumber !== receipt.blockNumber) return uncertain;
    const canonical = async () => { const block=await rpc.send("eth_getBlockByNumber",[receipt.blockNumber,false]); assertFarmReviewPermission(review); return block?.hash === receipt.blockHash; };
    if (!await canonical()) return uncertain;
    if (receipt.status === "0x0") return {state:"failed",message:"Transaction reverted. The requested change was not applied; gas may have been spent."};
    if (receipt.status !== "0x1" || !Array.isArray(receipt.logs)) return uncertain;
    if (review.request.type === "farm") {
      const farmId = review.request.id;
      const spec = getFarmWriteSpec(farmId);
      if (!spec) return uncertain;
      await verifyFarmTokenState(rpc, spec, review.quote.account, receipt.blockNumber);
    }
    const expected = review.quote.execution!, miner = review.request.type === "miner", abi = miner ? minerEvents : farmExitEvents;
    if (expected.event === "MinerRollover") {
      if (review.request.type !== "miner" || review.request.action.kind !== "rollover") return uncertain;
      const governor = getAddress(VERIFIED_FARM_WRITES[0].governor), index = BigInt(review.request.action.index);
      const targetSpec = MINER_PREVIEW_SPECS.find(v => v.id === (review.request.type === "miner" && review.request.action.kind === "rollover" ? review.request.action.target ?? review.request.id : ""));
      if (!targetSpec) return uncertain;
      const target = getAddress(targetSpec.address), crossPool = target !== getAddress(expected.to);
      const minedBlock = await rpc.send("eth_getBlockByNumber", [receipt.blockNumber, false]);
      if (minedBlock?.hash !== receipt.blockHash || !minedBlock.timestamp) return uncertain;
      const timestamp = BigInt(minedBlock.timestamp);
      if (timestamp < BigInt(review.quote.timestamp)) return uncertain;
      const extensions = receipt.logs.filter((l:any) => !l.removed && getAddress(l.address) === target).flatMap((l:any) => { try { const e = minerEvents.parseLog(l); return e?.name === "AddAndExtendStake" ? [e.args] : []; } catch { return []; } });
      const bonuses = receipt.logs.filter((l:any) => !l.removed && getAddress(l.address) === governor).flatMap((l:any) => { try { const e = governorRolloverEvents.parseLog(l); return e?.name === "GiveRolloverBonus" ? [e.args] : []; } catch { return []; } });
      if (crossPool) {
        const terms = expected.rollover;
        if (!terms || getAddress(terms.target) !== target) return uncertain;
        const eventsAt = (address:string, name:string) => receipt.logs.filter((l:any) => !l.removed && getAddress(l.address) === getAddress(address)).flatMap((l:any) => { try { const e = minerEvents.parseLog(l); return e?.name === name ? [e.args] : []; } catch { return []; } });
        const hops = eventsAt(expected.to, "HopPool"), deposits = eventsAt(target, "HopDeposit");
        if (hops.length !== 1 || deposits.length !== 1 || extensions.length !== 1 || bonuses.length !== 1) return uncertain;
        const hop = hops[0], deposit = deposits[0], extension = extensions[0], bonus = bonuses[0];
        const owner = getAddress(review.quote.account), carriedStart = terms.resetHopTime ? timestamp : BigInt(terms.carriedStart);
        if (getAddress(hop.sender) !== owner || getAddress(hop.newPool) !== target || hop.shares !== BigInt(expected.shares) || hop.DTXamount < BigInt(terms.gross)) return uncertain;
        if (getAddress(deposit.recipient) !== owner || deposit.amount !== hop.DTXamount || deposit.shares <= 0n || deposit.previousLastDepositedTime !== carriedStart || deposit.mandatoryTime !== BigInt(terms.sourceMandatory)) return uncertain;
        if (getAddress(extension.sender) !== governor || getAddress(extension.recipient) !== owner || extension.amount < BigInt(expected.minimumOutput) || extension.amount !== hop.DTXamount * BigInt(terms.bonusRate) / 10000n || extension.shares <= 0n || extension.lastDepositedTime !== timestamp) return uncertain;
        if (getAddress(bonus.recipient) !== owner || getAddress(bonus.poolInto) !== target || bonus.amount !== extension.amount) return uncertain;
        // HopDeposit has no stake ID. The extension event supplies the actual
        // newly appended index; verify that position at the receipt block,
        // instead of assuming the pre-send count is still its eventual index.
        const readTarget = async (method:string,args:unknown[]) => rolloverPositionAbi.decodeFunctionResult(method, await rpc.send("eth_call", [{to:target,data:rolloverPositionAbi.encodeFunctionData(method,args)},receipt.blockNumber]));
        const [count, position] = await Promise.all([readTarget("getNrOfStakes", [owner]), readTarget("userInfo", [owner, extension.stakeID])]);
        const mandatory = timestamp > carriedStart + BigInt(terms.targetDuration) ? 0n : deposit.mandatoryTime;
        if (extension.stakeID >= count[0] || position[0] !== deposit.shares + extension.shares || position[1] !== timestamp || position[3] !== timestamp || position[4] !== mandatory || !await canonical()) return uncertain;
        return {state:"confirmed",message:"Rollover mined successfully. The miner moved to the selected duration and its Governor bonus and new position were verified."};
      }
      const matched = extensions.some((a:any) => getAddress(a.sender) === governor && getAddress(a.recipient) === getAddress(review.quote.account) && a.stakeID === index && a.amount >= BigInt(expected.minimumOutput) && a.shares > 0n && a.lastDepositedTime === timestamp && bonuses.some((b:any) => getAddress(b.recipient) === getAddress(review.quote.account) && getAddress(b.poolInto) === getAddress(expected.to) && b.amount === a.amount));
      if (!matched || !await canonical()) return uncertain;
      return {state:"confirmed",message:"Rollover mined successfully. The miner extension and Governor bonus events matched; refreshing its new duration and balance."};
    }
    const name = expected.event.endsWith("Withdraw") ? "Withdraw" : expected.event;
    const events = receipt.logs.filter((l:any) => !l.removed && getAddress(l.address) === getAddress(expected.to)).flatMap((l:any) => {try {const p=abi.parseLog(l);return p?.name === name ? [p] : [];}catch{return [];}});
    const matched = events.some((e:any) => {
      const a = e.args;
      if (getAddress(a.sender ?? a.user) !== getAddress(review.quote.account)) return false;
      if (expected.event === "Deposit" || expected.event === "GiftDeposit") return a.amount === BigInt(expected.amount) && a.shares > 0n && (expected.event !== "GiftDeposit" || getAddress(a.recipient) === getAddress(expected.recipient));
      if (expected.event === "TransferStake") return a.shares === BigInt(expected.shares) && getAddress(a.recipient) === getAddress(expected.recipient) && review.request.type === "miner" && "index" in review.request.action && a.stakeID === BigInt(review.request.action.index);
      if (expected.event === "HopPool") return a.shares === BigInt(expected.shares) && getAddress(a.newPool) === getAddress(expected.recipient);
      if (expected.event === "MinerWithdraw") return a.shares === BigInt(expected.shares) && a.amount >= BigInt(expected.minimumOutput);
      if (expected.event === "SelfHarvest") return getAddress(a.harvestInto) === getAddress(expected.recipient) && a.harvestAmount >= BigInt(expected.minimumOutput);
      // emergencyWithdraw emits Withdraw(sender, id, 0, returnedPrincipal).
      // Its final ABI field is named penalty but contains the net asset return.
      if (expected.event === "FarmEmergencyWithdraw") return review.request.type === "farm" && review.request.kind === "emergency" && a.stakeID === BigInt(review.request.index) && a.harvestAmount === 0n && a.penalty >= BigInt(expected.minimumOutput) && a.penalty <= BigInt(expected.amount);
      return review.request.type === "farm" && a.stakeID === BigInt(review.request.index) && a.harvestAmount >= BigInt(expected.minimumOutput);
    });
    if (!matched || !await canonical()) return uncertain;
    return {state:"confirmed",message:"Transaction mined successfully and its action event matched. Refreshing balances; view the receipt for actual amounts."};
  } catch { return uncertain; }
}
