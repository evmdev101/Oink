import { test } from "node:test";
import assert from "node:assert/strict";
import { readFarmJournal, writeFarmJournal, journalBlocks, savedFarmJournalIds } from "../src/lib/farmTransactionJournal.ts";

// In-memory storage only. No wallet, provider or network is used.
const address = (value) => `0x${String(value).padStart(40, "0")}`;
const HASH = `0x${"a1".repeat(32)}`;
function storage() {
  const records = new Map();
  return { records, get length(){return records.size;},key:(index)=>[...records.keys()][index]??null, getItem: (key) => records.get(key) ?? null, setItem: (key, value) => { records.set(key, value); } };
}
function entry() {
  return {
    state: "pending", hash: HASH, message: "Pending confirmation", updatedAt: 1000,
    review: {
      spec: { id: "pls", address: address(1), tokenAddress: null, decimals: 18, symbol: "PLS", poolId: "7", runtimeCodeHash: HASH, tokenRuntimeCodeHash: null, masterchef: address(2), governor: address(3), rewardToken: address(4), treasuryWallet: address(5), masterchefRuntimeCodeHash: HASH, governorRuntimeCodeHash: HASH, rewardTokenRuntimeCodeHash: HASH, sourceUrl: "https://example.invalid/mock-source", verifiedAt: "2026-09-11", verifiedBlock: 256 },
      kind: "deposit", account: address(9), amount: 9007199254740993000000000000000001n,
      transaction: { from: address(9), to: address(1), data: "0x12345678", value: `0x${9007199254740993000000000000000001n.toString(16)}`, chainId: "0x171", gas: "0x186a0" },
      block: 256, blockHash: HASH, createdAt: 1000, depositFee: 200n, fundingRate: 10n, directPayout: 0n, feeAmount: 200n, recordedAmount: 9007199254740992999999999999999801n, referral: address(0), allowance: null, walletBalance: 9999999999999999999999999999999999n, gasEstimate: 80000n, gasBudget: 100000n, gasPrice: 10n, estimatedMaxGasCost: 1000000n,
    },
  };
}
function mutateSaved(target, mutate) {
  const [key, raw] = [...target.records][0];
  const object = JSON.parse(raw); mutate(object); target.records.set(key, JSON.stringify(object));
}

test("missing journal returns null and does not block", () => {
  assert.equal(readFarmJournal(address(9), "pls", storage()), null);
  assert.equal(journalBlocks(null), false);
});

test('saved discovered request identities remain recoverable without granting catalog permission',()=>{
  const saved=entry(),store=storage(),id='registry-'+saved.review.spec.address;
  saved.review.spec.id=id;writeFarmJournal(saved,store);
  assert.deepEqual(savedFarmJournalIds(saved.review.account,store),[id]);
  assert.deepEqual(savedFarmJournalIds(address(8),store),[]);
  assert.equal(readFarmJournal(saved.review.account,id,store).hash,HASH);
  assert(journalBlocks(readFarmJournal(saved.review.account,id,store)));
});

test('optional requested and existing referrals preserve old journals and exact new addresses',()=>{
  const store=storage(),old=entry();writeFarmJournal(old,store);assert.equal(readFarmJournal(address(9),'pls',store).review.requestedReferral,undefined);
  const next=entry();next.review.requestedReferral=address(7);next.review.existingReferral=address(8);next.review.referral=address(8);writeFarmJournal(next,store);assert.deepEqual(readFarmJournal(address(9),'pls',store),next);
  for(const field of ['requestedReferral','existingReferral']){const bad=entry();bad.review[field]='not an address';assert.throws(()=>writeFarmJournal(bad,storage()));}
});
test("journal roundtrip preserves every bigint without losing precision", () => {
  const target = storage(), original = entry();
  writeFarmJournal(original, target);
  assert.deepEqual(readFarmJournal(address(9), "pls", target), original);
  assert.equal(typeof readFarmJournal(address(9), "pls", target).review.amount, "bigint");
  assert.match([...target.records.keys()][0], /:369:0x0000000000000000000000000000000000000009:pls$/);
});
test("journals are isolated per wallet and farm", () => {
  const target = storage(); writeFarmJournal(entry(), target);
  assert.equal(readFarmJournal(address(8), "pls", target), null);
  assert.equal(readFarmJournal(address(9), "inc", target), null);
});
test("requesting and uncertain entries can persist before a hash is available", () => {
  const target = storage();
  for (const state of ["requesting", "uncertain", "acknowledged"]) {
    const saved = { ...entry(), state, hash: null }; writeFarmJournal(saved, target);
    assert.deepEqual(readFarmJournal(address(9), "pls", target), saved);
  }
});
test("all unresolved states block and settled/acknowledged states do not", () => {
  for (const state of ["requesting", "pending", "uncertain", "unverified"]) assert.equal(journalBlocks({ ...entry(), state }), true);
  for (const state of ["confirmed", "failed", "acknowledged"]) assert.equal(journalBlocks({ ...entry(), state }), false);
});
test("corrupt JSON and truncated storage fail closed", () => {
  for (const raw of ["", "{", "null", "[]", "{}", "not json"]) {
    const target = storage(); writeFarmJournal(entry(), target); const key = [...target.records.keys()][0]; target.records.set(key, raw);
    assert.throws(() => readFarmJournal(address(9), "pls", target), /journal is invalid/);
  }
});
test("identity mismatches in envelope and review are rejected", () => {
  for (const mutate of [(row) => { row.account = address(8); }, (row) => { row.farmId = "inc"; }, (row) => { row.entry.review.account = address(8); }, (row) => { row.entry.review.spec.id = "inc"; }, (row) => { row.chainId = "1"; }, (row) => { row.version = 2; }]) {
    const target = storage(); writeFarmJournal(entry(), target); mutateSaved(target, mutate);
    assert.throws(() => readFarmJournal(address(9), "pls", target), /journal is invalid/);
  }
});
test("invalid amount types and malformed bigint tags never become usable reviews", () => {
  for (const amount of ["100", 100, { $oinkBigInt: "1e18" }, { $oinkBigInt: "-1" }, { $oinkBigInt: "1", extra: true }, { $oinkBigInt: "9".repeat(79) }]) {
    const target = storage(); writeFarmJournal(entry(), target); mutateSaved(target, (row) => { row.entry.review.amount = amount; });
    assert.throws(() => readFarmJournal(address(9), "pls", target), /journal is invalid/);
  }
});
test("schema rejects unknown state, missing hashes and incomplete verification", () => {
  for (const mutate of [(row) => { row.entry.state = "done"; }, (row) => { row.entry.hash = null; }, (row) => { row.entry.hash = "0x123"; }, (row) => { delete row.entry.review.spec.runtimeCodeHash; }, (row) => { row.entry.review.spec.decimals = 100; }, (row) => { delete row.entry.review.gasPrice; }]) {
    const target = storage(); writeFarmJournal(entry(), target); mutateSaved(target, mutate);
    assert.throws(() => readFarmJournal(address(9), "pls", target), /journal is invalid/);
  }
});
test("transaction sender, target, chain and native value must match review", () => {
  for (const patch of [{ from: address(8) }, { to: address(8) }, { chainId: "0x1" }, { value: "0x0" }, { gas: "0x0" }, { data: "0x" }]) {
    const saved = entry(); Object.assign(saved.review.transaction, patch);
    assert.throws(() => writeFarmJournal(saved, storage()), /journal is invalid/);
  }
});
test("token approval and zero reset roundtrip with exact allowance units", () => {
  const target = storage(), saved = entry();
  saved.review.spec.tokenAddress = address(6); saved.review.spec.tokenRuntimeCodeHash = HASH;
  saved.review.transaction.to = address(6); saved.review.transaction.value = "0x0";
  saved.review.kind = "approve"; saved.review.allowance = 0n;
  writeFarmJournal(saved, target); assert.deepEqual(readFarmJournal(address(9), "pls", target), saved);
  saved.review.kind = "reset-approval"; saved.review.amount = 0n; saved.review.allowance = 100n;
  writeFarmJournal(saved, target); assert.deepEqual(readFarmJournal(address(9), "pls", target), saved);
});
test("unreadable, unwritable and silently dropped storage fail closed", () => {
  const denied = { getItem() { throw new Error("Access denied"); }, setItem() { throw new Error("Quota exceeded"); } };
  assert.throws(() => readFarmJournal(address(9), "pls", denied), /cannot be read/);
  assert.throws(() => writeFarmJournal(entry(), denied), /could not be saved/);
  assert.throws(() => writeFarmJournal(entry(), { getItem: () => null, setItem() {} }), /could not be saved/);
});
test("malformed account and farm keys cannot bypass identity separation", () => {
  assert.throws(() => readFarmJournal("bad", "pls", storage()), /invalid/);
  assert.throws(() => readFarmJournal(address(9), "pls:inc", storage()), /invalid/);
});

function tokenEntry(policy) {
  const saved = entry();
  saved.review.spec.tokenAddress = address(6); saved.review.spec.tokenRuntimeCodeHash = HASH;
  saved.review.spec.tokenPolicy = policy; saved.review.transaction.value = "0x0"; saved.review.allowance = saved.review.amount;
  return saved;
}
const usdcPolicy = { kind: "usdc", implementation: { slot: "0x" + "c3".repeat(32), address: address(7), runtimeCodeHash: HASH } };

for (const policy of [{ kind: "usdt" }, usdcPolicy]) for (const decimals of [6, 8, 12, 18]) test(`${policy.kind} journal preserves policy and ${decimals}-decimal raw amounts`, () => {
  const target = storage(), saved = tokenEntry(structuredClone(policy)), amount = 10n ** BigInt(decimals) + 1n;
  saved.review.spec.decimals = decimals; saved.review.amount = amount; saved.review.feeAmount = amount * 200n / 10000n;
  saved.review.recordedAmount = amount - saved.review.feeAmount; saved.review.allowance = amount;
  writeFarmJournal(saved, target);
  const restored = readFarmJournal(address(9), "pls", target);
  assert.deepEqual(restored, saved); assert.deepEqual(restored.review.spec.tokenPolicy, policy);
  assert.equal(restored.review.amount, amount); assert.equal(restored.review.spec.decimals, decimals);
});

test("journal rejects token policies on native assets and unknown or malformed policies", () => {
  for (const policy of [{ kind: "usdt" }, usdcPolicy]) {
    const native = entry(); native.review.spec.tokenPolicy = policy;
    assert.throws(() => writeFarmJournal(native, storage()), /deposit token policy/);
  }
  for (const policy of [null, [], "usdt", {}, { kind: "unknown" }, { kind: 1 }, { kind: "USDT" }]) {
    const saved = tokenEntry(policy);
    assert.throws(() => writeFarmJournal(saved, storage()), /deposit token policy/);
    const target = storage(); writeFarmJournal(tokenEntry({ kind: "usdt" }), target);
    mutateSaved(target, row => { row.entry.review.spec.tokenPolicy = policy; });
    assert.throws(() => readFarmJournal(address(9), "pls", target), /journal is invalid/);
  }
});

test("journal rejects missing or corrupt USDC implementation pins", () => {
  for (const implementation of [undefined, null, [], {}, { ...usdcPolicy.implementation, address: "bad" }, { ...usdcPolicy.implementation, slot: "0x1" }, { ...usdcPolicy.implementation, slot: 1 }, { ...usdcPolicy.implementation, runtimeCodeHash: "0x6000" }, { ...usdcPolicy.implementation, runtimeCodeHash: null }]) {
    const saved = tokenEntry({ kind: "usdc", implementation });
    assert.throws(() => writeFarmJournal(saved, storage()), /journal is invalid/);
    const target = storage(); writeFarmJournal(tokenEntry(usdcPolicy), target);
    mutateSaved(target, row => { row.entry.review.spec.tokenPolicy.implementation = implementation; });
    assert.throws(() => readFarmJournal(address(9), "pls", target), /journal is invalid/);
  }
});


test("MAX approval journals preserve the full allowance and reject smaller amounts", () => {
  const saved = entry(), store = storage();
  saved.review.kind = "approve-max";
  saved.review.spec.tokenAddress = address(7); saved.review.spec.tokenRuntimeCodeHash = HASH;
  saved.review.amount = (1n << 256n) - 1n;
  saved.review.transaction.to = address(7); saved.review.transaction.value = "0x0";
  writeFarmJournal(saved, store);
  assert.deepEqual(readFarmJournal(saved.review.account, saved.review.spec.id, store), saved);
  saved.review.amount = 100n;
  assert.throws(() => writeFarmJournal(saved, storage()), /maximum allowance/);
});
