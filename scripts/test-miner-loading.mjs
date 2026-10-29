import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, keccak256, parseEther } from 'ethers';
import { DisplayReadProgress } from '../src/lib/displayReadProgress.ts';

registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
      try { return next(specifier + '.ts', context); } catch { /* Use the normal resolver. */ }
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.endsWith('/src/lib/chain.ts')) return { format: 'module', shortCircuit: true, source: 'export async function getPublicProvider(){ return globalThis.minerLoadingRpc; }' };
    if (url.endsWith('/src/lib/minerLive.ts')) return { format: 'module', shortCircuit: true, source: 'export async function readMinerYield(){ return globalThis.minerLoadingYield(); }' };
    return next(url, context);
  },
});
const { TIME_MINER_CONTRACTS, OINK_TOKEN } = await import('../src/config/contracts.ts');
const { MINER_PREVIEW_SPECS } = await import('../src/config/minerPreviewVerification.ts');
const { readMinerPositions, subscribeMinerPositions } = await import('../src/lib/miningAccounts.ts');
const { readTimeMinerSummary, readPublicMinerYields, readMinerWalletBalance } = await import('../src/lib/minerDisplayReads.ts');
const { sharedDisplayReads } = await import('../src/lib/sharedReadCache.ts');
const account = '0x0000000000000000000000000000000000000001';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const abi = new Interface([
  'function balanceOf(address) view returns(uint256)', 'function balanceOf() view returns(uint256)',
  'function getNrOfStakes(address) view returns(uint256)', 'function withdrawFeePeriod() view returns(uint256)',
  'function gracePeriod() view returns(uint256)', 'function totalShares() view returns(uint256)',
  'function getPricePerFullShare() view returns(uint256)', 'function callFee() view returns(uint256)',
  'function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)',
]);

function fixture({ slowPool, failedPool, canonical = true, yieldRead = async () => null } = {}) {
  sharedDisplayReads.clear();
  let calls = 0;
  const slow = deferred();
  for (const spec of MINER_PREVIEW_SPECS) spec.runtimeCodeHash = keccak256('0x00');
  globalThis.minerLoadingYield = yieldRead;
  globalThis.minerLoadingRpc = {
    send: async method => { assert.equal(method, 'eth_chainId'); return '0x171'; },
    getBlock: async tag => ({ number: 1000, timestamp: 1_000_000, hash: tag === 'latest' || canonical ? 'canonical' : 'reorg' }),
    getCode: async () => '0x00',
    call: async tx => {
      calls++;
      assert.equal(tx.blockTag, 1000);
      const fragment = abi.getFunction(tx.data.slice(0, 10));
      const index = TIME_MINER_CONTRACTS.findIndex(pool => pool.address.toLowerCase() === tx.to.toLowerCase());
      const spec = MINER_PREVIEW_SPECS[index];
      let result;
      if (tx.to.toLowerCase() === OINK_TOKEN.toLowerCase()) result = [parseEther('10')];
      else if (fragment.name === 'getNrOfStakes') {
        if (index === failedPool) throw Error('One miner RPC read failed');
        if (index === slowPool) await slow.promise;
        result = [1n];
      } else if (fragment.name === 'withdrawFeePeriod') result = [BigInt(spec.durationDays) * 86400n];
      else if (fragment.name === 'gracePeriod') result = [BigInt(spec.graceDays) * 86400n];
      else if (fragment.name === 'userInfo') result = [parseEther('1'), 999_000n, parseEther('1'), 999_000n, 0n];
      else result = [parseEther('100')];
      return abi.encodeFunctionResult(fragment, result);
    },
  };
  return { release: slow.resolve, calls: () => calls };
}

test('miner balances appear before slow durations and optional yield estimates complete', async () => {
  const yieldRead = deferred();
  const rpc = fixture({ slowPool: 5, yieldRead: () => yieldRead.promise });
  const firstRow = deferred();
  const allPositions = deferred();
  const updates = [];
  const unsubscribe = subscribeMinerPositions(account, value => {
    updates.push(value);
    if (value.pools[0].rows.length) firstRow.resolve(value);
    if (value.complete) allPositions.resolve(value);
  });
  let finished = false;
  const read = readMinerPositions(account).then(value => { finished = true; return value; });
  const early = await firstRow.promise;
  assert.equal(early.complete, false);
  assert.equal(early.pools[0].loading, false);
  assert.equal(early.pools[0].rows[0].gross, '1.0');
  assert.equal(early.pools[5].loading, true);
  assert.equal(finished, false);
  const revisit = [];
  const stopRevisit = subscribeMinerPositions(account, value => revisit.push(value));
  assert.equal(revisit.length, 1, 'returning to the tab receives in-flight values immediately');
  rpc.release();
  const completePositions = await allPositions.promise;
  assert.equal(completePositions.pools.flatMap(pool => pool.rows).length, 6);
  assert.equal(finished, false, 'required balances do not wait for optional emission estimates');
  yieldRead.resolve({ dailyPool: '1', apr: '1', poolBalance: '100', totalShares: '100', timestamp: 1_000_000 });
  const final = await read;
  assert.equal(final.complete, true);
  assert.ok(final.pools.every(pool => pool.yieldEstimate != null));
  const reads = rpc.calls();
  assert.equal(await readMinerPositions(account), final);
  assert.equal(rpc.calls(), reads, 'revisit reuses the complete shared read');
  unsubscribe(); stopRevisit();
});

test('one failed duration is reported without suppressing the five readable pools', async () => {
  fixture({ failedPool: 2 });
  const final = await readMinerPositions(account);
  assert.equal(final.complete, true, 'coverage finished, with the failure still explicit');
  assert.match(final.pools[2].error, /failed/);
  assert.equal(final.pools[2].rows.length, 0);
  assert.equal(final.pools.flatMap(pool => pool.rows).length, 5);
});

test('a replaced block never publishes partial miner balances', async () => {
  fixture({ canonical: false });
  const updates = [];
  const unsubscribe = subscribeMinerPositions(account, value => updates.push(value));
  await assert.rejects(readMinerPositions(account), /Snapshot block changed/);
  assert.equal(updates.length, 0);
  unsubscribe();
});

test('progress subscribers isolate wallet data and cannot revive an invalidated read', () => {
  const progress = new DisplayReadProgress();
  const oldController = new AbortController();
  const alice = [], bob = [];
  const stopAlice = progress.subscribe('alice', value => alice.push(value));
  const stopBob = progress.subscribe('bob', value => bob.push(value));
  const old = progress.begin('alice', oldController.signal);
  old.publish('partial');
  assert.deepEqual(bob, []);
  oldController.abort();
  assert.equal(progress.peek('alice'), null);
  const current = progress.begin('alice');
  current.publish('current');
  old.publish('late old balance'); old.finish();
  assert.equal(progress.peek('alice'), 'current');
  assert.deepEqual(alice, ['partial', 'current']);
  stopAlice(); current.publish('after navigation');
  assert.deepEqual(alice, ['partial', 'current']);
  current.finish(); stopBob();
  assert.equal(progress.peek('alice'), null);
});

test('contract and deployment subtab revisits reuse public data and account-specific wallet reads', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_000_000_000 });
  const rpc = fixture({ yieldRead: async () => ({ dailyPool: '1', apr: '1', poolBalance: '100', totalShares: '100', timestamp: 1_000_000 }) });
  const [summary, yields, wallet] = await Promise.all([readTimeMinerSummary(), readPublicMinerYields(), readMinerWalletBalance(account)]);
  assert.equal(summary.rows.length, 6);
  assert.equal(Object.keys(yields.yields).length, 6);
  assert.equal(wallet.balance, '10.0');
  const calls = rpc.calls();
  assert.equal(await readTimeMinerSummary(), summary);
  assert.equal(await readPublicMinerYields(), yields);
  assert.equal(await readMinerWalletBalance(account), wallet);
  assert.equal(rpc.calls(), calls);
  const secondWallet = await readMinerWalletBalance('0x0000000000000000000000000000000000000002');
  assert.notEqual(secondWallet.account, wallet.account);
  assert.equal(rpc.calls(), calls + 1);
  sharedDisplayReads.clear();
});
