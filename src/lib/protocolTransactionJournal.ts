import { getAddress } from "ethers";
import type { ProtocolRequest } from "./protocolTransactions";
import { protocolScope, scopedJournalKey, journalRaws } from "./actionJournal";
import { validProtocolCreation, type ProtocolReview } from "./protocolTransactions";

export type ProtocolJournal = { review: ProtocolReview; state: "requesting" | "pending" | "uncertain" | "confirmed" | "failed" | "resolved"; hash: string | null; message: string };
const key = (account: string) => "oink:protocol-request:v1:369:" + getAddress(account).toLowerCase();
const hash = /^0x[0-9a-f]{64}$/i;
function validate(entry: ProtocolJournal, account: string) {
  const r = entry?.review, q = r?.quote, tx = r?.transaction;
  if (!r || !q || !tx || getAddress(q.account) !== getAddress(account) || getAddress(tx.from) !== getAddress(account) || getAddress(tx.to) !== getAddress(q.to) || tx.data !== q.data || tx.value !== q.value || tx.chainId !== "0x171" || !/^0x(?:[0-9a-f]{2}){4,}$/i.test(tx.data) || !/^0x(?:0|[1-9a-f][0-9a-f]*)$/i.test(tx.value) || !/^0x[0-9a-f]+$/i.test(tx.gas) || !hash.test(q.blockHash) || !Number.isSafeInteger(q.block) || q.block < 0 || !Number.isSafeInteger(q.timestamp) || !Number.isSafeInteger(r.createdAt) || typeof q.fingerprint !== "string" || !Array.isArray(q.facts) || !Array.isArray(q.warnings) || typeof q.title !== "string" || !/^\d+$/.test(r.gasCost)) throw Error("Invalid saved review.");
  if (q.kind === "creation" ? !validProtocolCreation(q) || tx.nonce !== q.creation.nonce : (q.kind !== undefined && q.kind !== "call") || q.creation !== undefined || tx.nonce !== undefined) throw Error("Invalid saved transaction kind.");
  if (!r.request || !/^[a-z-]+$/.test(r.request.module) || typeof r.request.action !== "string" || !r.request.args || typeof r.request.args !== "object" || Array.isArray(r.request.args) || Object.values(r.request.args).some(v => typeof v !== "string")) throw Error("Invalid saved action.");
  if (!["requesting", "pending", "uncertain", "confirmed", "failed", "resolved"].includes(entry.state) || typeof entry.message !== "string" || (entry.hash !== null && !hash.test(entry.hash)) || (["pending", "confirmed", "failed"].includes(entry.state) && !entry.hash)) throw Error("Invalid request status.");
}
export function readProtocolJournal(account: string, storage: Pick<Storage, "getItem"> = localStorage, request?:ProtocolRequest): ProtocolJournal | null {
  const scopedRaw = request ? storage.getItem(scopedJournalKey(key(account), protocolScope(request))) : null;
  const raw = scopedRaw ?? storage.getItem(key(account));
  if (raw === null) return null;
  try { const entry = JSON.parse(raw); if(request && protocolScope(entry.review.request)!==protocolScope(request))return null; validate(entry, account); return entry; }
  catch { if(request && scopedRaw===null)return null; throw Error("Saved protocol request cannot be read. Check wallet activity; new requests are blocked."); }
}
export function writeProtocolJournal(entry: ProtocolJournal, storage: Pick<Storage, "getItem" | "setItem"> = localStorage) {
  validate(entry, entry.review.quote.account);
  const raw = JSON.stringify(entry), target = key(entry.review.quote.account);
  storage.setItem(scopedJournalKey(target,protocolScope(entry.review.request)),raw);
  storage.setItem(target, raw);
  if (storage.getItem(target) !== raw || storage.getItem(scopedJournalKey(target,protocolScope(entry.review.request))) !== raw) throw Error("Wallet request could not be saved. Check wallet activity before continuing.");
  if (typeof window !== "undefined") window.dispatchEvent(new Event("oink-protocol-journal"));
}
export function protocolJournalBlocks(entry: ProtocolJournal | null) { return !!entry?.hash && ["pending", "uncertain"].includes(entry.state); }
export function listProtocolJournals(account:string,storage:Pick<Storage,"getItem"> = localStorage):ProtocolJournal[] {
  const entries=new Map<string,ProtocolJournal>();
  for(const raw of journalRaws(key(account),storage)) {
    try { const entry=JSON.parse(raw) as ProtocolJournal; validate(entry,account); entries.set(protocolScope(entry.review.request),entry); } catch { /* Ignore unrelated legacy records. */ }
  }
  return [...entries.values()];
}
export function assertNoPendingProtocol(account: string, request:ProtocolRequest) {
  if (protocolJournalBlocks(readProtocolJournal(account,localStorage,request))) throw Error("This action is already pending in your wallet.");
}
