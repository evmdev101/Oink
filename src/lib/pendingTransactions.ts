import { listPositionJournals, positionJournalBlocks } from "./positionTransactions";
import { listProtocolJournals, protocolJournalBlocks } from "./protocolTransactionJournal";
import { savedFarmJournalIds, readFarmJournal, journalBlocks } from "./farmTransactionJournal";
export type PendingTransaction = {id:string;label:string;hash:string};
export function listPendingTransactions(account:string):PendingTransaction[] {
  const rows:PendingTransaction[]=[];
  try { for(const entry of listPositionJournals(account)) if(positionJournalBlocks(entry)&&entry.hash) rows.push({id:"position:"+entry.hash,label:entry.review.quote.title,hash:entry.hash}); } catch { /* Read again on the next journal update. */ }
  try { for(const entry of listProtocolJournals(account)) if(protocolJournalBlocks(entry)&&entry.hash) rows.push({id:"protocol:"+entry.hash,label:entry.review.quote.title,hash:entry.hash}); } catch { /* Independent transaction families remain available. */ }
  try { for(const id of savedFarmJournalIds(account)) { try { const entry=readFarmJournal(account,id); if(journalBlocks(entry)&&entry?.hash)rows.push({id:"farm:"+entry.hash,label:entry.review.spec.symbol+" "+entry.review.kind,hash:entry.hash}); } catch { /* One record does not affect the others. */ } } } catch { /* Storage is optional for viewing activity. */ }
  return rows;
}
