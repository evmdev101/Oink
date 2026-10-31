import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recoverStalePage } from '../src/lib/stalePageRecovery.ts';

function fixture() {
  let saved = null, reloads = 0, time = 100000;
  return {
    host: { storage: { getItem: () => saved, setItem: (_, value) => { saved = value; } }, reload: () => { reloads++; }, now: () => time },
    count: () => reloads, advance: () => { time += 30000; },
  };
}
test('an obsolete route file triggers one refresh without a reload loop', () => {
  const f = fixture(), error = new TypeError('Failed to fetch dynamically imported module: /assets/old-page.js');
  assert.equal(recoverStalePage(error, f.host), true);
  assert.equal(recoverStalePage(error, f.host), false);
  assert.equal(f.count(), 1);
  f.advance();
  assert.equal(recoverStalePage(error, f.host), true);
});
test('ordinary application and contract errors never cause an automatic reload', () => {
  const f = fixture();
  for (const error of [new ReferenceError('missing variable'), new Error('execution reverted'), new Error('RPC timeout'), null]) {
    assert.equal(recoverStalePage(error, f.host), false);
  }
  assert.equal(f.count(), 0);
});
test('browser-specific failed import messages receive the same bounded recovery', () => {
  for (const message of ['Importing a module script failed.', 'error loading dynamically imported module: old.js', 'Loading chunk 42 failed.']) {
    const f = fixture();
    assert.equal(recoverStalePage(new Error(message), f.host), true);
    assert.equal(f.count(), 1);
  }
});
test('unavailable or silently dropped storage cannot create a reload loop', () => {
  for (const storage of [{ getItem() { throw Error('Denied'); }, setItem() {} }, { getItem: () => null, setItem() {} }]) {
    let reloads = 0;
    assert.equal(recoverStalePage(new Error('Importing a module script failed.'), { storage, reload: () => { reloads++; }, now: () => 100000 }), false);
    assert.equal(reloads, 0);
  }
});
