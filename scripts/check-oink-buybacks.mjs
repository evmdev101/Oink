// Public read-only checks. No wallet access or transaction submission.
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { formatEther, toQuantity } from "ethers";
import history from "../src/data/oink-buyback-history.json" with { type: "json" };
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context); throw error; }
} });
const { readBuybacks } = await import("../src/lib/oinkBuybacks.ts");
let sequence = 0, reads = 0;
const rpc = { async send(method, params) {
  reads++;
  const response = await fetch(process.env.OINK_BUYBACK_RPC || "https://rpc.pulsechain.com", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++sequence, method, params }), signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error("RPC HTTP " + response.status);
  const data = await response.json(); if (data.error) throw Error(JSON.stringify(data.error)); return data.result;
} };
const expectedOink = history.rows.reduce((sum, row) => sum + BigInt(row.oinkRaw), 0n);
const expectedPls = history.rows.reduce((sum, row) => sum + BigInt(row.spentRaw), 0n);
const current = await readBuybacks(rpc);
assert.ok(current.rows.length >= history.rows.length);
assert.ok(current.totalOinkRaw >= expectedOink);
assert.ok(current.totalSpentRaw >= expectedPls);
for (const row of history.rows) {
  const actual = current.rows.find(entry => entry.key === row.key);
  assert.ok(actual, "Archived buyback missing");
  assert.equal(actual.spentRaw, BigInt(row.spentRaw)); assert.equal(actual.oinkRaw, BigInt(row.oinkRaw));
}
// Rebuild the newest historical purchase through the live receipt decoder,
// rather than merely checking the already bundled history.
const latest = history.rows[0];
const before = await rpc.send("eth_getBlockByNumber", [toQuantity(latest.block - 1), false]);
const olderSeed = { ...history, block: latest.block - 1, hash: before.hash, timestamp: Number(BigInt(before.timestamp)), rows: history.rows.filter(row => row.block < latest.block) };
const rebuilt = await readBuybacks(rpc, null, olderSeed);
const latestDecoded = rebuilt.rows.find(row => row.key === latest.key);
assert.ok(latestDecoded, "Newest archived buyback was not rediscovered");
assert.equal(latestDecoded.spentRaw, BigInt(latest.spentRaw)); assert.equal(latestDecoded.oinkRaw, BigInt(latest.oinkRaw));
assert.ok(rebuilt.totalOinkRaw >= expectedOink); assert.ok(rebuilt.totalSpentRaw >= expectedPls);
const incremental = await readBuybacks(rpc, rebuilt);
assert.ok(incremental.rows.length >= rebuilt.rows.length);
console.log(JSON.stringify({ pass: true, block: incremental.block, purchases: incremental.rows.length, oink: formatEther(incremental.totalOinkRaw),
  pls: formatEther(incremental.totalSpentRaw), newestReceiptRediscovered: latest.tx, reads }, null, 2));
