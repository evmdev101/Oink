import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readPublicRefreshDisplay, savePublicRefreshDisplay, publicDisplayRecord, publicDisplayAmount } from '../src/lib/publicRefreshDisplay.ts';

const valid = value => publicDisplayRecord(value) && publicDisplayAmount(value.balance);
function installStorage(t, descriptor) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  Object.defineProperty(globalThis, 'sessionStorage', { ...descriptor, configurable: true });
  t.after(() => previous ? Object.defineProperty(globalThis, 'sessionStorage', previous) : delete globalThis.sessionStorage);
}
function storage(t) {
  const entries = new Map();
  installStorage(t, { value: { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) } });
  return entries;
}

test('public display survives a refresh without losing decimal precision', t => {
  storage(t);
  const value = { balance: '1455966477.854123456789123456' };
  savePublicRefreshDisplay('home', value);
  assert.deepEqual(readPublicRefreshDisplay('home', valid), value);
  assert.equal(readPublicRefreshDisplay('other-page', valid), null);
});

test('public display expires from observation time, even when saved again', t => {
  storage(t);
  t.mock.timers.enable({ apis: ['Date'], now: 1000000 });
  savePublicRefreshDisplay('home', { balance: '12' }, 940000);
  t.mock.timers.tick(59999);
  assert.deepEqual(readPublicRefreshDisplay('home', valid), { balance: '12' });
  savePublicRefreshDisplay('home', { balance: '12' }, 940000);
  t.mock.timers.tick(1);
  assert.equal(readPublicRefreshDisplay('home', valid), null);
});

test('malformed, wrong-shape, oversized and future-dated storage is ignored', t => {
  const entries = storage(t);
  for (const raw of ['{', JSON.stringify({ savedAt: Date.now(), value: { balance: [] } }), 'x'.repeat(250001), JSON.stringify({ savedAt: Date.now() + 60000, value: { balance: '4' } })]) {
    entries.set('oink:public-refresh:v1:369:home', raw);
    assert.equal(readPublicRefreshDisplay('home', valid), null);
  }
});

test('unavailable browser storage cannot break rendering or live reads', t => {
  installStorage(t, { get() { throw new Error('Storage denied'); } });
  assert.doesNotThrow(() => savePublicRefreshDisplay('home', { balance: '4' }));
  assert.equal(readPublicRefreshDisplay('home', valid), null);
});
