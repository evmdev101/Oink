import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { ZeroAddress, formatUnits, getAddress, keccak256, toQuantity } from "ethers";
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context); throw error; }
} });
const { readFarmRecovery, recoveryPositionIndex, farmRecoveryAbi, FARM_RECOVERY_PAGE_SIZE } = await import("../src/lib/farmRecovery.ts");
const { VERIFIED_FARM_WRITES: farms } = await import("../src/config/farmWriteVerification.ts");
const catalog = await import("../src/lib/farmCatalog.ts");
const account = "0x0000000000000000000000000000000000000011", code = "0x6000", hash = "0x" + "ab".repeat(32), now = 2000000000 * 1000;
// Test-local fixture runtimes only; the tests never contact a wallet or network.
for (const farm of farms) farm.runtimeCodeHash = keccak256(code);

function fixture(options = {}) {
  const calls = [], indexes = [], tag = "0x100";
  let active = 0, peak = 0;
  const rpc = { async send(method, params) {
    calls.push({ method, params });
    if (method === "eth_chainId") return options.chain ?? "0x171";
    if (method === "eth_getBlockByNumber") return { number: tag, hash: options.reorg && params[0] !== "latest" ? "0x" + "cd".repeat(32) : hash, timestamp: toQuantity(options.timestamp ?? now / 1000) };
    if (method === "eth_getCode") return options.badRuntime ? "0x6001" : code;
    assert.equal(method, "eth_call", "recovery must use public reads only");
    assert.equal(params[1], tag);
    const decoded = farmRecoveryAbi.parseTransaction(params[0]);
    assert.equal(decoded.args[0], account);
    if (decoded.name === "getNrOfStakes") return farmRecoveryAbi.encodeFunctionResult(decoded.fragment, [options.count ?? 45n]);
    assert.equal(decoded.name, "userInfo", "no reward, funding, price, simulation or harvesting calls during discovery");
    indexes.push(Number(decoded.args[1]));
    active++; peak = Math.max(peak, active);
    try {
      await new Promise(resolve => setTimeout(resolve, 1));
      if (options.failIndex === Number(decoded.args[1])) throw new Error("Position unavailable");
      const farm = [...farms, ...(options.extraFarm ? [options.extraFarm] : [])].find(candidate => getAddress(candidate.address) === getAddress(params[0].to));
      assert.ok(farm, "principal comes from an explicitly allowlisted vault");
      options.onPosition?.();
      return farmRecoveryAbi.encodeFunctionResult(decoded.fragment, [10n ** BigInt(farm.decimals) + 1n + decoded.args[1], 99n, 50n, BigInt(now / 1000) - 100n]);
    } finally { active--; }
  } };
  return { rpc, calls, indexes, peak: () => peak };
}

for (const farm of farms) test(`${farm.symbol} recovery reads a bounded, block-pinned principal page without rewards`, async () => {
  const f = fixture(), result = await readFarmRecovery(f.rpc, farm.id, account, 20, undefined, now);
  assert.equal(result.count, 45); assert.equal(result.start, 20); assert.equal(result.symbol, farm.symbol);
  assert.equal(result.account, account); assert.equal(result.block, 256); assert.equal(result.blockHash, hash);
  assert.equal(result.positions.length, FARM_RECOVERY_PAGE_SIZE);
  assert.deepEqual(f.indexes, Array.from({ length: 20 }, (_, offset) => offset + 20));
  const raw = 10n ** BigInt(farm.decimals) + 21n;
  assert.equal(result.positions[0].amount, formatUnits(raw, farm.decimals));
  assert.equal(result.positions[0].amountRaw, raw.toString());
  assert.equal(result.positions[0].amount, "1." + "0".repeat(farm.decimals - 2) + "21", "smallest-unit precision is preserved independently of token decimals");
  assert.ok(f.peak() <= 4);
  assert.ok(f.calls.filter(call => ["eth_call", "eth_getCode"].includes(call.method)).every(call => call.params[1] === "0x100"));
  assert.ok(f.calls.filter(call => call.method === "eth_call").every(call => call.params[0].to === farm.address));
});

test("large wallets can load any safe index without a full portfolio scan", async () => {
  const f = fixture({ count: 2501n }), result = await readFarmRecovery(f.rpc, "pls", account, 2499, undefined, now);
  assert.equal(result.count, 2501); assert.deepEqual(result.positions.map(row => row.index), [2499, 2500]);
  assert.equal(f.calls.filter(call => call.method === "eth_call").length, 3);
});

test("empty wallets are a successful empty page, not failed or invented positions", async () => {
  const f = fixture({ count: 0n }), result = await readFarmRecovery(f.rpc, "pls", account, 0, undefined, now);
  assert.equal(result.count, 0); assert.deepEqual(result.positions, []); assert.deepEqual(f.indexes, []);
});

test("unknown farms, zero wallets and invalid indexes are rejected before RPC calls", async () => {
  const f = fixture();
  await assert.rejects(readFarmRecovery(f.rpc, "t-share", account, 0, undefined, now), /supports verified farm assets only/);
  await assert.rejects(readFarmRecovery(f.rpc, "pls", ZeroAddress, 0, undefined, now), /nonzero/);
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) await assert.rejects(readFarmRecovery(f.rpc, "pls", account, value, undefined, now), /valid position index/);
  assert.equal(f.calls.length, 0);
});

test("wrong chain, changed runtime, stale and future snapshots fail before displaying principal", async () => {
  for (const [options, pattern] of [
    [{ chain: "0x1" }, /PulseChain/], [{ badRuntime: true }, /runtime/],
    [{ timestamp: now / 1000 - 120 }, /stale/], [{ timestamp: now / 1000 + 31 }, /stale/],
  ]) {
    const f = fixture(options);
    await assert.rejects(readFarmRecovery(f.rpc, "pls", account, 0, undefined, now), pattern);
    assert.equal(f.indexes.length, 0);
  }
});

test("removed positions, unsupported counts, partial reads and canonical changes are not accepted", async () => {
  await assert.rejects(readFarmRecovery(fixture({ count: 1n }).rpc, "pls", account, 1, undefined, now), /no longer exists/);
  await assert.rejects(readFarmRecovery(fixture({ count: 0n }).rpc, "pls", account, 1, undefined, now), /no longer exists/);
  await assert.rejects(readFarmRecovery(fixture({ count: BigInt(Number.MAX_SAFE_INTEGER) + 1n }).rpc, "pls", account, 0, undefined, now), /supported index range/);
  await assert.rejects(readFarmRecovery(fixture({ failIndex: 3 }).rpc, "pls", account, 0, undefined, now), /Position unavailable/);
  await assert.rejects(readFarmRecovery(fixture({ reorg: true }).rpc, "pls", account, 0, undefined, now), /snapshot changed/);
});

test("cancelled discovery cannot return or start another page of reads", async () => {
  const f = fixture(), controller = new AbortController(); controller.abort();
  await assert.rejects(readFarmRecovery(f.rpc, "pls", account, 0, controller.signal, now), /abort/i);
  assert.equal(f.calls.length, 0);
});

test("position jump accepts only safe whole decimal indexes", () => {
  assert.equal(recoveryPositionIndex("0"), 0); assert.equal(recoveryPositionIndex("2500"), 2500);
  for (const value of ["", "-1", "01", "1.1", "1e3", "0x10", " 2", "2 ", "Infinity", "9007199254740992"]) assert.throws(() => recoveryPositionIndex(value), /whole, nonnegative/);
});

test('discovered recovery needs fresh in-memory permission and preserves raw units without reward calls',async()=>{
  const address='0x0000000000000000000000000000000000000099';
  const spec={...structuredClone(farms.find(f=>f.id==='plsx')),address,id:'registry-'+address,poolId:'999',discoveryTemplateId:'token-vault-0.8.20-optimized',discoveryBlockHash:hash};
  try{
    const f=fixture({extraFarm:spec,count:2n});
    await assert.rejects(readFarmRecovery(f.rpc,spec.id,account,0,undefined,now),/verified farm assets/);assert.equal(f.calls.length,0);
    catalog.replaceDiscoveredFarmSpecs([spec]);
    const page=await readFarmRecovery(f.rpc,spec.id,account,0,undefined,now);assert.equal(page.address,address);assert.equal(page.positions[0].amountRaw,(10n**18n+1n).toString());
    assert(f.calls.filter(call=>call.method==='eth_call').every(call=>call.params[0].to===address));
    const removed=fixture({extraFarm:spec,count:1n,onPosition:()=>catalog.replaceDiscoveredFarmSpecs([])});
    await assert.rejects(readFarmRecovery(removed.rpc,spec.id,account,0,undefined,now),/unavailable or changed/);
    catalog.replaceDiscoveredFarmSpecs([spec]);
    assert.equal((await readFarmRecovery(fixture({extraFarm:spec,count:1n}).rpc,spec.id,account,0,undefined,now)).count,1);
  }finally{catalog.replaceDiscoveredFarmSpecs([]);}
});
