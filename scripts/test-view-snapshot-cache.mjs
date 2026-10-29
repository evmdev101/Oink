import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createViewSnapshotCache, invalidateViewSnapshots } from '../src/lib/viewSnapshotCache.ts';

test('display cache separates account, network and wallet revision', () => {
  const cache = createViewSnapshotCache();
  cache.set('369:alice:1', { balance:'20' });
  assert.deepEqual(cache.get('369:alice:1'), { balance:'20' });
  for (const key of ['369:bob:1','1:alice:1','369:alice:2']) assert.equal(cache.get(key),null);
});
test('display cache expires and position changes invalidate all views', t => {
  t.mock.timers.enable({apis:['Date'],now:1000});
  const first = createViewSnapshotCache(60000), second = createViewSnapshotCache();
  first.set('a','old');
  t.mock.timers.tick(60000);
  assert.equal(first.get('a'),null);
  first.set('a','fresh'); second.set('b','history');
  invalidateViewSnapshots();
  assert.equal(first.get('a'),null);
  assert.equal(second.get('b'),null);
});
