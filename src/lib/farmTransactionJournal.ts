import { getAddress, MaxUint256 } from "ethers";
import type { FarmTransactionReview } from "./farmTransactions";

export type FarmJournalEntry = {
  review: FarmTransactionReview;
  hash: string | null;
  state: "requesting" | "pending" | "uncertain" | "unverified" | "confirmed" | "failed" | "acknowledged";
  message: string;
  updatedAt: number;
};
type JournalStorage = Pick<Storage, "getItem" | "setItem">;
const STATES = new Set(["requesting", "pending", "uncertain", "unverified", "confirmed", "failed", "acknowledged"]);
const BLOCKING_STATES = new Set(["requesting", "pending", "uncertain", "unverified"]);
const HASH = /^0x[0-9a-f]{64}$/i;
const QUANTITY = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;

function invalid(detail: string): never { throw new Error(`Transaction journal is invalid (${detail}). Check wallet activity before starting another transaction.`); }
function object(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
function address(value: unknown): string {
  if (typeof value !== "string") return invalid("address");
  try { return getAddress(value); } catch { return invalid("address"); }
}
function farmId(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(value)) return invalid("farm identifier");
  return value;
}
function time(value: unknown): boolean { return typeof value === "number" && Number.isSafeInteger(value) && value >= 0; }
function uint(value: unknown): boolean { return typeof value === "bigint" && value >= 0n && value <= MaxUint256; }
function hash(value: unknown): boolean { return typeof value === "string" && HASH.test(value); }
function quantity(value: unknown): value is string { return typeof value === "string" && QUANTITY.test(value) && BigInt(value) <= MaxUint256; }
function journalKey(account: string, id: string) { return `oink:farm-transaction:v1:369:${address(account).toLowerCase()}:${farmId(id)}`; }
function storageFor(storage?: JournalStorage): JournalStorage {
  if (storage) return storage;
  if (typeof window === "undefined") throw new Error("Transaction journal storage is unavailable. Transactions cannot start without persistent recovery information.");
  try { return window.localStorage; } catch { throw new Error("Transaction journal storage is unavailable. Allow site storage before requesting a transaction."); }
}

function validateEntry(value: unknown): asserts value is FarmJournalEntry {
  if (!object(value) || typeof value.state !== "string" || !STATES.has(value.state) || typeof value.message !== "string" || !time(value.updatedAt)) invalid("entry fields");
  if (value.hash !== null && !hash(value.hash)) invalid("transaction hash");
  if (["pending", "unverified", "confirmed", "failed"].includes(value.state) && value.hash === null) invalid("missing transaction hash");
  const review = value.review;
  if (!object(review) || !object(review.spec) || !object(review.transaction)) invalid("review schema");
  const spec = review.spec, tx = review.transaction;
  farmId(spec.id);
  for (const field of ["address", "masterchef", "governor", "rewardToken", "treasuryWallet"]) address(spec[field]);
  if (spec.tokenAddress !== null) address(spec.tokenAddress);
  if (typeof spec.decimals !== "number" || !Number.isInteger(spec.decimals) || spec.decimals < 0 || spec.decimals > 36 || typeof spec.symbol !== "string" || !spec.symbol || spec.symbol.length > 64) invalid("asset units");
  if (typeof spec.poolId !== "string" || !/^(0|[1-9][0-9]*)$/.test(spec.poolId) || BigInt(spec.poolId) > MaxUint256) invalid("pool identifier");
  for (const field of ["runtimeCodeHash", "masterchefRuntimeCodeHash", "governorRuntimeCodeHash", "rewardTokenRuntimeCodeHash"]) if (!hash(spec[field])) invalid("runtime hash");
  if (spec.tokenAddress === null ? spec.tokenRuntimeCodeHash !== null : !hash(spec.tokenRuntimeCodeHash)) invalid("deposit token runtime hash");
  if (spec.tokenPolicy !== undefined) {
    const policy = spec.tokenPolicy;
    if (spec.tokenAddress === null || !object(policy) || !["usdt", "usdc", "variable-transfer"].includes(String(policy.kind))) invalid("deposit token policy");
    if (policy.kind === "variable-transfer" && !["nominal", "received"].includes(String(policy.accounting))) invalid("farm accounting model");
    if (policy.kind === "variable-transfer" && policy.lockedBalance !== undefined && policy.lockedBalance !== "lockedAmount") invalid("token lock getter");
    if (policy.kind === "usdc" || (policy.kind === "variable-transfer" && policy.implementation !== undefined)) {
      if (!object(policy.implementation) || !hash(policy.implementation.slot) || !hash(policy.implementation.runtimeCodeHash)) invalid("deposit token implementation");
      address(policy.implementation.address);
    }
  }
  if (typeof spec.sourceUrl !== "string" || !spec.sourceUrl.startsWith("https://") || typeof spec.verifiedAt !== "string" || !Number.isFinite(Date.parse(spec.verifiedAt)) || !time(spec.verifiedBlock)) invalid("verification record");
  if (!["deposit", "approve", "approve-max", "reset-approval"].includes(String(review.kind)) || !time(review.block) || !time(review.createdAt) || !hash(review.blockHash)) invalid("review identity");
  const account = address(review.account);
  address(review.referral);
  if(review.requestedReferral!==undefined)address(review.requestedReferral);
  if(review.existingReferral!==undefined)address(review.existingReferral);
  for (const field of ["amount", "depositFee", "fundingRate", "directPayout", "feeAmount", "recordedAmount", "walletBalance", "gasEstimate", "gasBudget", "gasPrice", "estimatedMaxGasCost"]) if (!uint(review[field])) invalid(`review ${field}`);
  if (review.allowance !== null && !uint(review.allowance)) invalid("allowance units");
  if (!quantity(tx.chainId) || BigInt(tx.chainId) !== 369n || address(tx.from) !== account) invalid("transaction chain or sender");
  const expectedTarget = review.kind === "deposit" ? spec.address : spec.tokenAddress;
  if (expectedTarget === null || address(tx.to) !== address(expectedTarget)) invalid("transaction target");
  if (typeof tx.data !== "string" || !/^0x(?:[0-9a-f]{2}){4,}$/i.test(tx.data) || !quantity(tx.value) || !quantity(tx.gas) || BigInt(tx.gas) <= 0n) invalid("transaction calldata or gas");
  if (BigInt(tx.value) !== (review.kind === "deposit" && spec.tokenAddress === null ? review.amount : 0n)) invalid("transaction native value");
  if (review.kind === "reset-approval" ? review.amount !== 0n : review.amount === 0n) invalid("transaction amount");
  if (review.kind === "approve-max" && review.amount !== MaxUint256) invalid("maximum allowance");
}

function encode(entry: FarmJournalEntry) {
  return JSON.stringify({ version: 1, chainId: "369", account: address(entry.review.account), farmId: entry.review.spec.id, entry }, (_key, value) =>
    typeof value === "bigint" ? { $oinkBigInt: value.toString() } : value);
}
function decode(raw: string): unknown {
  try {
    return JSON.parse(raw, (_key, value) => {
      if (object(value) && Object.hasOwn(value, "$oinkBigInt")) {
        if (Object.keys(value).length !== 1 || typeof value.$oinkBigInt !== "string" || !/^(0|[1-9][0-9]*)$/.test(value.$oinkBigInt) || value.$oinkBigInt.length > 78) invalid("bigint encoding");
        return BigInt(value.$oinkBigInt);
      }
      return value;
    });
  } catch { return invalid("unreadable saved data"); }
}

export function readFarmJournal(account: string, id: string, storage?: JournalStorage): FarmJournalEntry | null {
  const key = journalKey(account, id);
  let raw: string | null;
  try { raw = storageFor(storage).getItem(key); } catch { throw new Error("Transaction journal cannot be read. Check wallet activity; new transactions remain blocked until storage is available."); }
  if (raw === null) return null;
  const record = decode(raw);
  if (!object(record) || record.version !== 1 || record.chainId !== "369") invalid("version or chain");
  validateEntry(record.entry);
  if (address(record.account) !== address(account) || record.farmId !== id || address(record.entry.review.account) !== address(account) || record.entry.review.spec.id !== id) invalid("account or farm mismatch");
  return record.entry;
}

export function writeFarmJournal(entry: FarmJournalEntry, storage?: JournalStorage): void {
  validateEntry(entry);
  const key = journalKey(entry.review.account, entry.review.spec.id);
  const raw = encode(entry);
  try {
    const target = storageFor(storage);
    target.setItem(key, raw);
    if (target.getItem(key) !== raw) throw new Error("Storage did not retain the transaction journal.");
  } catch { throw new Error("Transaction journal could not be saved. Do not start another transaction; check wallet activity and allow site storage."); }
}

export function journalBlocks(entry: FarmJournalEntry | null): boolean {
  return !!entry?.hash && BLOCKING_STATES.has(entry.state);
}

// Enumerate only journal identities, never permissions. Pending requests for a
// discovered farm must keep blocking duplicates even before rediscovery or
// after that farm is removed from the currently usable catalog.
export function savedFarmJournalIds(account: string, storage?: Pick<Storage, "length" | "key">): string[] {
  if (!storage && typeof window === "undefined") return [];
  const prefix = `oink:farm-transaction:v1:369:${address(account).toLowerCase()}:`;
  try {
    const target = storage ?? window.localStorage;
    const ids = new Set<string>();
    for (let index = 0; index < target.length; index++) {
      const key = target.key(index);
      if (key?.startsWith(prefix)) ids.add(farmId(key.slice(prefix.length)));
    }
    return [...ids];
  } catch { throw new Error("Saved farm requests cannot be listed. Check wallet activity; new transactions remain blocked."); }
}
