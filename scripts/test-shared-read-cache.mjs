import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SharedReadCache } from '../src/lib/sharedReadCache.ts';
const deferred = () => { let resolve; const promise = new Promise(r => { resolve=r; }); return {promise,resolve}; };

test('two tabs share a request and navigation cancellation does not cancel the other', async () => {
  const cache = new SharedReadCache(); const work = deferred(); let calls=0;
  const abort = new AbortController();
  const load = async () => { calls++; return work.promise; };
  const first = cache.read('369:alice',load,{signal:abort.signal});
  const second = cache.read('369:alice',load);
  abort.abort();
  await assert.rejects(first);
  work.resolve('balance');
  assert.equal(await second,'balance'); assert.equal(calls,1);
  assert.equal(await cache.read('369:alice',load),'balance'); assert.equal(calls,1);
});
test('new wallet keys and expired data perform new reads', async t => {
  t.mock.timers.enable({apis:['Date'],now:1000});
  const cache = new SharedReadCache(); let calls=0;
  const load = async () => ++calls;
  assert.equal(await cache.read('alice',load,{ttl:20}),1);
  assert.equal(await cache.read('bob',load,{ttl:20}),2);
  t.mock.timers.tick(20);
  assert.equal(cache.peek('alice'),1);
  assert.equal(await cache.read('alice',load,{ttl:20}),3);
  t.mock.timers.tick(120000);
  assert.equal(cache.peek('alice'),3); // Display can retain old values without calling them fresh.
  assert.equal(cache.peek('alice',120000),null);
  t.mock.timers.tick(1680000);
  assert.equal(cache.peek('alice'),null);
});
test('invalidation prevents a late old response from replacing a new balance', async () => {
  const cache = new SharedReadCache(); const work = deferred();
  const old = cache.read('alice',() => work.promise);
  await Promise.resolve(); cache.clear();
  await assert.rejects(old);
  assert.equal(await cache.read('alice',async () => 'new'),'new');
  work.resolve('old'); await Promise.resolve();
  assert.equal(cache.peek('alice'),'new');
});
test('failed and incomplete reads can retry immediately', async () => {
  const cache = new SharedReadCache();
  await assert.rejects(cache.read('a',async () => { throw Error('offline'); }));
  assert.equal(await cache.read('a',async () => 'partial',{cacheable:() => false}),'partial');
  assert.equal(await cache.read('a',async () => 'complete'),'complete');
});
test('aborted subscribers do not start work and hung reads have a deadline', async () => {
  const cache = new SharedReadCache(); let calls=0;
  await assert.rejects(cache.read('a',async () => ++calls,{signal:AbortSignal.abort()}));
  assert.equal(calls,0);
  await assert.rejects(cache.read('a',() => new Promise(() => {}),{timeout:10}),/timed out/);
  assert.equal(await cache.read('a',async () => 'retry'),'retry');
});
test('cache is bounded', async () => {
  const cache = new SharedReadCache(2);
  for (const key of ['a','b','c']) await cache.read(key,async () => key);
  assert.equal(cache.peek('a'),null); assert.equal(cache.peek('c'),'c');
});
