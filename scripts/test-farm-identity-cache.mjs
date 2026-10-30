import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, keccak256, parseEther, parseUnits } from 'ethers';
import { FarmIdentityCache, farmDisplayIdentities } from '../src/lib/farmIdentityCache.ts';

const identity = { tokenAddress: null, decimals: 18, symbol: 'PLS', pool: '1' };
const block = number => ({ number, hash: `canonical-${number}` });
const gate = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('identity cache expires, separates expected identity keys, and never reuses a future block', async () => {
  let now = 1000, loads = 0;
  const cache = new FarmIdentityCache(100, 8, () => now);
  const read = (key, number) => cache.read(key, block(number), async () => ({ ...identity, symbol: `loaded-${++loads}` }), async () => true);
  assert.equal((await read('369:farm:runtime:token:18:1', 10)).symbol, 'loaded-1');
  assert.equal((await read('369:farm:runtime:token:18:1', 11)).symbol, 'loaded-1');
  assert.equal((await read('369:farm:changed-runtime:token:18:1', 11)).symbol, 'loaded-2');
  assert.equal((await read('369:farm:runtime:changed-token:18:1', 11)).symbol, 'loaded-3');
  assert.equal((await read('369:farm:runtime:token:18:1', 9)).symbol, 'loaded-4');
  assert.equal((await read('369:farm:runtime:token:18:1', 11)).symbol, 'loaded-1', 'an older completed read cannot replace newer provenance');
  now += 100;
  assert.equal((await read('369:farm:runtime:token:18:1', 12)).symbol, 'loaded-5');
});

test('same-height replacements and noncanonical origin blocks cannot reuse metadata', async () => {
  const cache = new FarmIdentityCache(); let loads = 0, canonical = true;
  const load = async () => ({ ...identity, symbol: `${++loads}` });
  await cache.read('a', block(10), load, async () => true);
  await cache.read('a', { number: 10, hash: 'replacement' }, load, async b => b.hash === 'replacement');
  assert.equal(loads, 2);
  canonical = false;
  await assert.rejects(cache.read('a', block(11), load, async b => b.number === 11 ? canonical : false), /snapshot block changed/);
  canonical = true;
  await cache.read('a', block(11), load, async () => true);
  assert.equal(loads, 4, 'a failed canonical check is never cached');
});

test('concurrent subscribers share metadata without sharing cancellation', async () => {
  const cache = new FarmIdentityCache(), wait = gate(), first = new AbortController(); let loads = 0;
  const load = async () => { loads++; await wait.promise; return identity; };
  const a = cache.read('a', block(10), load, async () => true, first.signal);
  const b = cache.read('a', block(10), load, async () => true);
  first.abort(new Error('account left'));
  await assert.rejects(a, /account left/);
  wait.resolve(); assert.deepEqual(await b, identity); assert.equal(loads, 1);
});

test('failures and invalidation never leave reusable or late stale metadata', async () => {
  const cache = new FarmIdentityCache(), wait = gate(); let loads = 0;
  await assert.rejects(cache.read('a', block(10), async () => { throw Error('failed'); }, async () => true), /failed/);
  const old = cache.read('a', block(10), async () => { loads++; await wait.promise; return identity; }, async () => true);
  await Promise.resolve(); cache.clear(); wait.resolve(); await old;
  await cache.read('a', block(11), async () => { loads++; return identity; }, async () => true);
  assert.equal(loads, 2);
});

test('bounded cache evicts old entries instead of retaining every discovered farm', async () => {
  const cache = new FarmIdentityCache(10000, 1); let loads = 0;
  const read = key => cache.read(key, block(10), async () => { loads++; return identity; }, async () => true);
  await read('a'); await read('b'); await read('a'); assert.equal(loads, 3);
});

registerHooks({
  resolve(s, c, next) { try { return next(s, c); } catch (e) { if (s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw e; } },
  load(url, c, next) {
    if (url.endsWith('/src/lib/chain.ts')) return { format: 'module', shortCircuit: true, source: 'export async function getPublicProvider(){return globalThis.farmIdentityTestRpc;}' };
    if (url.endsWith('/src/lib/farmYield.ts')) return { format: 'module', shortCircuit: true, source: 'export async function readFarmYield(){return null;}' };
    if (url.endsWith('/src/lib/farmDiscovery.ts')) return { format: 'module', shortCircuit: true, source: 'export async function discoverFarmPools(){return {discoveries:[],partial:false};}' };
    if (url.endsWith('/src/lib/specialFarms.ts')) return { format: 'module', shortCircuit: true, source: 'export async function readSpecialFarm(id){return {kind:id,yieldEstimate:null};}' };
    return next(url, c);
  },
});
const { VERIFIED_FARM_READS } = await import('../src/config/farmReadVerification.ts');
const { readEcosystemVaults } = await import('../src/lib/miningAccounts.ts');
const { sharedDisplayReads } = await import('../src/lib/sharedReadCache.ts');
const abi = new Interface([
  'function stakeToken() view returns(address)', 'function poolID() view returns(uint256)',
  'function decimals() view returns(uint8)', 'function symbol() view returns(string)',
  'function depositFee() view returns(uint256)', 'function fundingRate() view returns(uint256)',
  'function publicBalanceOf() view returns(uint256)', 'function balanceOf(address) view returns(uint256)',
  'function getNrOfStakes(address) view returns(uint256)', 'function multiCall(address,uint256) view returns(uint256,uint256,uint256,uint256)',
]);

test('two live farm snapshots reuse 57 identity calls while rereading runtime, fees, balances and positions', async t => {
  sharedDisplayReads.clear(); farmDisplayIdentities.clear();
  for (const spec of VERIFIED_FARM_READS) spec.runtimeCodeHash = keccak256('0x00');
  let epoch = 1, calls = 0, runtimeChecks = 0;
  const byMethod = {};
  globalThis.farmIdentityTestRpc = {
    async send(method) { assert.equal(method, 'eth_chainId'); return '0x171'; },
    async getBlock(tag) { const number = tag === 'latest' ? 1000 + epoch : tag; return { number, timestamp: 1000000 + number, hash: block(number).hash }; },
    async getCode() { runtimeChecks++; return '0x00'; },
    async getBalance(_address, number) { assert.equal(number, 1000 + epoch); return parseEther(`${100 + epoch}`); },
    async call(tx) {
      calls++; assert.equal(tx.blockTag, 1000 + epoch);
      const f = abi.getFunction(tx.data.slice(0, 10)); byMethod[f.name] = (byMethod[f.name] ?? 0) + 1;
      const vault = VERIFIED_FARM_READS.find(s => s.address.toLowerCase() === tx.to.toLowerCase());
      const token = VERIFIED_FARM_READS.find(s => s.tokenAddress?.toLowerCase() === tx.to.toLowerCase());
      const values = f.name === 'stakeToken' ? [vault.tokenAddress]
        : f.name === 'poolID' ? [BigInt(vault.poolId)]
        : f.name === 'decimals' ? [BigInt(token.decimals)]
        : f.name === 'symbol' ? [token.id.toUpperCase()]
        : f.name === 'depositFee' || f.name === 'fundingRate' ? [BigInt(epoch)]
        : f.name === 'publicBalanceOf' ? [parseEther(`${5 * epoch}`)]
        : f.name === 'balanceOf' ? [parseUnits(`${100 + epoch}`, token.decimals)]
        : f.name === 'getNrOfStakes' ? [1n]
        : [parseUnits(`${2 + epoch}`, vault.decimals), 0n, 0n, parseEther(`${3 + epoch}`)];
      return abi.encodeFunctionResult(f, values);
    },
  };
  const account = '0x0000000000000000000000000000000000000001';
  const first = await readEcosystemVaults(undefined, account);
  const cold = calls, checks = runtimeChecks, firstMetadata = ['stakeToken', 'poolID', 'decimals', 'symbol'].map(name => byMethod[name]);
  epoch++; sharedDisplayReads.clear();
  const second = await readEcosystemVaults(undefined, account), warm = calls - cold;
  assert.deepEqual(['stakeToken', 'poolID', 'decimals', 'symbol'].map(name => byMethod[name]), firstMetadata);
  assert.equal(runtimeChecks - checks, VERIFIED_FARM_READS.length, 'runtime is still checked for every farm at the new block');
  const a = first.rows.find(r => r.id === 'pls').data, b = second.rows.find(r => r.id === 'pls').data;
  assert.equal(a.balance, '101.0'); assert.equal(b.balance, '102.0');
  assert.equal(a.fee, '0.01'); assert.equal(b.fee, '0.02');
  assert.equal(a.funding, '0.0001'); assert.equal(b.funding, '0.0002');
  assert.equal(a.rewardCredit, '5.0'); assert.equal(b.rewardCredit, '10.0');
  assert.equal(a.positions[0].amount, '3.0'); assert.equal(b.positions[0].amount, '4.0');
  assert.equal(a.positions[0].pending, '4.0'); assert.equal(b.positions[0].pending, '5.0');
  assert.equal(cold - warm, 57); assert.equal(first.block + 1, second.block);
  t.diagnostic(`Deterministic fixture: ${cold} contract calls on cold snapshot; ${warm} on next-block refresh (${cold - warm} fewer, ${((cold - warm) / cold * 100).toFixed(1)}%). This is request savings, not a measured wall-clock speedup.`);
  sharedDisplayReads.clear(); farmDisplayIdentities.clear();
});
