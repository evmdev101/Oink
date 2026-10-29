import { readPositionJournal, writePositionJournal, verifyPositionReceipt, positionJournalBlocks, listPositionJournals, type PositionJournal } from "./positionTransactions";
import { readProtocolJournal, writeProtocolJournal, protocolJournalBlocks, listProtocolJournals, type ProtocolJournal } from "./protocolTransactionJournal";
import { verifyProtocolReceipt, type ProtocolAdapter } from "./protocolTransactions";
import { readFarmJournal, writeFarmJournal, savedFarmJournalIds, journalBlocks, type FarmJournalEntry } from "./farmTransactionJournal";
import { verifyFarmReceipt, type FarmReadRpc } from "./farmTransactions";
import { getFarmWriteSpec, isDiscoveredFarmId } from "./farmCatalog";
import { refreshDiscoveredFarmCatalog } from "./farmCatalogDiscovery";

async function protocolAdapter(module: string): Promise<ProtocolAdapter | null> {
  switch (module) {
    case "nft-allocation": return (await import("./nftAllocationActions")).nftAllocationAdapter;
    case "reward-maintenance": return (await import("./rewardMaintenanceActions")).rewardMaintenanceAdapter;
    case "community-maintenance": return (await import("./communityMaintenanceActions")).communityMaintenanceAdapter;
    case "miner-donation": return (await import("./minerDonationTransactions")).minerDonationAdapter;
    case "offers": return (await import("./offerTransactions")).offerAdapter;
    case "distribution": return (await import("./distributionClaims")).distributionAdapter;
    case "hex-shares": return (await import("./hexShareActions")).hexShareAdapter;
    case "advanced-governance": return (await import("./advancedGovernanceActions")).advancedGovernanceAdapter;
    case "ordinary": return (await import("./ordinaryProposalActions")).ordinaryProposalAdapter;
    case "participation": return (await import("./participationTransactions")).participationAdapter;
    default: return null;
  }
}

const defaults = {
  readPosition: readPositionJournal, writePosition: writePositionJournal, verifyPosition: verifyPositionReceipt,
  readProtocol: readProtocolJournal, writeProtocol: writeProtocolJournal, verifyProtocol: verifyProtocolReceipt,
  readFarm: readFarmJournal, writeFarm: writeFarmJournal, verifyFarm: verifyFarmReceipt,
  farmIds: savedFarmJournalIds, protocolAdapter,
  listPositions: listPositionJournals, listProtocols: listProtocolJournals,
  refreshCatalog: refreshDiscoveredFarmCatalog, farmSpec: getFarmWriteSpec,
};
export type ReceiptMonitorDependencies = Omit<typeof defaults,"listPositions"|"listProtocols"> & Partial<Pick<typeof defaults,"listPositions"|"listProtocols">>;

// Receipt reads only. No wallet request, automatic resend, journal deletion or
// manual acknowledgement. Uncertain outcomes retain their duplicate protection.
export async function checkSavedReceipts(account: string, rpc: FarmReadRpc, current = () => true, deps: ReceiptMonitorDependencies = defaults) {
  const changed = { positions: false, protocol: false, farms: false };
  if (!current()) return changed;
  let ids: string[] = [];
  try { ids = deps.farmIds(account); } catch { /* Corrupt storage remains blocked by action guards. */ }
  try {
    const position = deps.readPosition(account);
    const required = [...ids, ...(position?.review.request.type === "farm" ? [position.review.request.id] : [])];
    if (required.some(id => isDiscoveredFarmId(id) && !deps.farmSpec(id))) await deps.refreshCatalog(rpc);
  } catch { /* Keep saved requests intact if rediscovery is unavailable. */ }
  if (!current()) return changed;
  let positions: ReturnType<typeof listPositionJournals> = [], protocols: ReturnType<typeof listProtocolJournals> = [];
  try { positions = deps.listPositions ? deps.listPositions(account) : [deps.readPosition(account)].filter((row):row is NonNullable<typeof row> => !!row); } catch { /* Retry storage later. */ }
  try { protocols = deps.listProtocols ? deps.listProtocols(account) : [deps.readProtocol(account)].filter((row):row is NonNullable<typeof row> => !!row); } catch { /* Retry storage later. */ }
  for (const entry of positions) {
    if (!current()) break;
    try {
      if (!entry.hash || !positionJournalBlocks(entry)) continue;
      let result:Pick<PositionJournal,"state"|"message"> = await deps.verifyPosition(rpc, entry.review, entry.hash);
      if (["pending","uncertain"].includes(result.state)) result = await settleMined(rpc, entry.review.transaction, entry.hash) ?? result;
      const latest = deps.readPosition(account, undefined, entry.review.request);
      if (current() && JSON.stringify(latest) === JSON.stringify(entry) && result.state !== entry.state) {
        deps.writePosition({ ...entry, ...result }); changed.positions = true;
      }
    } catch { /* A connection failure leaves only this action pending. */ }
  }
  for (const entry of protocols) {
    if (!current()) break;
    try {
      if (!entry.hash || !protocolJournalBlocks(entry)) continue;
      const adapter = await deps.protocolAdapter(entry.review.request.module);
      if (!adapter) continue;
      let result:Pick<ProtocolJournal,"state"|"message"> = await deps.verifyProtocol(rpc, entry.review, entry.hash, adapter);
      if (["pending","uncertain"].includes(result.state)) result = await settleMined(rpc, entry.review.transaction, entry.hash) ?? result;
      const latest = deps.readProtocol(account, undefined, entry.review.request);
      if (current() && JSON.stringify(latest) === JSON.stringify(entry) && result.state !== entry.state) {
        deps.writeProtocol({ ...entry, ...result }); changed.protocol = true;
      }
    } catch { /* Other pending receipts can still be checked. */ }
  }
  for (const id of ids) {
    if (!current()) break;
    try {
      const entry = deps.readFarm(account, id);
      if (!entry?.hash || !journalBlocks(entry)) continue;
      let result:Pick<FarmJournalEntry,"state"|"message"> = await deps.verifyFarm(rpc, entry.review, entry.hash);
      if (["pending","unverified"].includes(result.state)) {
        const mined = await settleMined(rpc, entry.review.transaction, entry.hash);
        if (mined) result = {...mined, state: mined.state === "resolved" ? "acknowledged" : "failed"};
      }
      const latest = deps.readFarm(account, id);
      if (current() && latest?.hash === entry.hash && latest.updatedAt === entry.updatedAt && latest.state === entry.state && result.state !== entry.state) {
        deps.writeFarm({ ...entry, ...result, updatedAt: Date.now() }); changed.farms = true;
      }
    } catch { /* Keep this journal and continue with the next receipt. */ }
  }
  return changed;
}

// A mined transaction releases its action even if event interpretation is
// unavailable. This does not claim that its business effects were verified.
export async function settleMined(rpc:FarmReadRpc, expected:{from:string;to?:string;data:string;value:string}, hash:string):Promise<{state:"resolved"|"failed";message:string}|null> {
  if (BigInt(await rpc.send("eth_chainId",[])) !== 369n) return null;
  const receipt = await rpc.send("eth_getTransactionReceipt",[hash]);
  const tx = await rpc.send("eth_getTransactionByHash",[hash]);
  const same = (a:unknown,b:unknown) => typeof a === "string" && typeof b === "string" && a.toLowerCase() === b.toLowerCase();
  if (!tx || !same(tx.hash,hash) || !same(tx.from,expected.from) || !same(tx.input??tx.data,expected.data) || BigInt(tx.value)!==BigInt(expected.value) || tx.chainId!=null&&BigInt(tx.chainId)!==369n || tx.to!=null&&!same(tx.to,expected.to)) return null;
  if (!receipt) {
    // A confirmed nonce greater than this transaction's nonce means the wallet
    // replaced or cancelled it. Do not infer the replacement's business result.
    if (typeof tx.nonce !== "string" || !/^0x[\da-f]+$/i.test(tx.nonce)) return null;
    const head = await rpc.send("eth_getBlockByNumber",["latest",false]);
    if (!head?.hash || !head.number || !head.timestamp || Date.now()-Number(BigInt(head.timestamp))*1000>120000 || Number(BigInt(head.timestamp))*1000>Date.now()+30000) return null;
    const nonce = await rpc.send("eth_getTransactionCount",[expected.from,head.number]);
    if (BigInt(nonce)<=BigInt(tx.nonce)) return null;
    if (!same((await rpc.send("eth_getBlockByNumber",[head.number,false]))?.hash,head.hash)) return null;
    return {state:"resolved",message:""};
  }
  if (!["0x0","0x1"].includes(receipt.status) || !same(receipt.transactionHash,hash) || !same(receipt.from,expected.from) || !same(tx.blockHash,receipt.blockHash) || tx.blockNumber!==receipt.blockNumber) return null;
  if (tx.to == null ? receipt.to != null : !same(receipt.to,expected.to)) return null;
  const block = await rpc.send("eth_getBlockByNumber",[receipt.blockNumber,false]);
  if (!same(block?.hash,receipt.blockHash)) return null;
  return {state:receipt.status === "0x0" ? "failed" : "resolved",message:receipt.status === "0x0" ? "Transaction reverted. Check the amount and try again." : ""};
}
