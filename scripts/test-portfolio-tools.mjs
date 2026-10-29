import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { farmStakedValue, pendingFarmRewards, compareFarms } = await import('../src/lib/farmPortfolio.ts');
const { matchesMinerStatus, minerDeadline } = await import('../src/lib/minerFilters.ts');
const { readPreference } = await import('../src/lib/useSavedPreference.ts');
const U = 10n ** 18n, now = 1_000_000;
const farm = (id, amount, pending = '0') => ({ id, label: id, data: { positions: [{ amount, pending }], accountError: null, fee: '0' } });
const prices = { pls: { usd: '2', fetchedAt: now }, plsx: { usd: '3', fetchedAt: now } };
const miner = { index: 7, deposited: 100, maturity: 2000, graceEnd: 3000, mandatoryUntil: 2100, gross: '1', pool: { id: 'one-month', label: '1 month', address: '0x1234' } };

test('wallet staked value sums priced assets, not token amounts or protocol assets', () => {
  const rows = [farm('pls', '2'), farm('plsx', '4'), farm('t-share', '999'), farm('treasury', '999')];
  assert.deepEqual(farmStakedValue(rows, prices, now / 1000, now), { value: 16n * U, partial: false });
  assert.equal(rows[0].data.positions[0].amount, '2');
});
test('unknown prices and failed wallet reads produce partial totals, not full zero totals', () => {
  assert.deepEqual(farmStakedValue([farm('pls', '2'), farm('inc', '4')], prices, now / 1000, now), { value: 4n * U, partial: true });
  assert.deepEqual(farmStakedValue([farm('inc', '4')], prices, now / 1000, now), { value: null, partial: true });
  const failed = farm('plsx', '4'); failed.data.accountError = 'unavailable';
  assert.deepEqual(farmStakedValue([farm('pls', '2'), failed], prices, now / 1000, now), { value: 4n * U, partial: true });
});
test('empty positions need no quote; stale and future-dated snapshots cannot supply totals', () => {
  assert.deepEqual(farmStakedValue([farm('inc', '0')], {}, now / 1000, now), { value: 0n, partial: false });
  assert.equal(farmStakedValue([farm('pls', '2')], prices, now / 1000, now + 120001).value, null);
  assert.equal(farmStakedValue([farm('pls', '2')], prices, now / 1000 + 1, now).value, null);
  assert.equal(farmStakedValue([farm('pls', '2')], { pls: { usd: '2', fetchedAt: now - 120001 } }, now / 1000, now).value, null);
});
test('explicit farm sorts override favorite order, preserve precision, and put unknowns last', () => {
  const a = farm('pls', '1', '1000000000.000000000000000001'), b = farm('plsx', '1', '1000000000.000000000000000002');
  const metrics = { pls: { apr: 2n, tvl: null }, plsx: { apr: 3n, tvl: 1n } };
  for (const sort of ['apr', 'tvl', 'pending']) assert.ok(compareFarms(a, b, sort, metrics, ['pls'], true) > 0);
  assert.ok(compareFarms(a, b, 'default', metrics, ['pls'], true) < 0);
  assert.equal(compareFarms(a, b, 'pending', metrics, [], false), 0);
  b.data.fee = '1';
  assert.ok(compareFarms(a, b, 'fee', metrics, [], true) < 0);
  assert.ok(compareFarms({ ...a, data: null }, b, 'fee', metrics, [], true) > 0);
  assert.equal(pendingFarmRewards({ id: 'treasury', data: null, special: { kind: 'treasury', pending: '999' } }), 0n);
  assert.equal(pendingFarmRewards({ id: 'pls', data: null }), null);
});
test('grace shortcut covers mature miners only, inclusive through the deadline', () => {
  assert.equal(matchesMinerStatus(miner, 'grace-soon', 1999), false);
  assert.equal(matchesMinerStatus(miner, 'grace-soon', 2000), true);
  assert.equal(matchesMinerStatus(miner, 'grace-soon', 3000), true);
  assert.equal(matchesMinerStatus(miner, 'grace-soon', 3001), false);
  assert.equal(matchesMinerStatus({ ...miner, graceEnd: 2000 + 48 * 3600 }, 'grace-soon', 2000), true);
  assert.equal(matchesMinerStatus({ ...miner, graceEnd: 2001 + 48 * 3600 }, 'grace-soon', 2000), false);
});
test('countdowns stop presenting stale status and wait for a new snapshot at boundaries', () => {
  assert.equal(minerDeadline(miner, 1900, 1900), 'Matures in 2m');
  assert.equal(minerDeadline(miner, 1900, 2000), 'Updating deadline status…');
  assert.equal(minerDeadline(miner, 2000, 2000), 'Grace ends in 17m');
  assert.equal(minerDeadline(miner, 2000, 2121), 'Waiting for fresh dates');
  assert.equal(minerDeadline(miner, 3001, 3060), 'Grace ended 1m ago');
});
test('saved preferences validate type and options and survive inaccessible browser storage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '"list"' } });
    assert.equal(readPreference('view', 'grid', ['grid', 'list']), 'list');
    assert.equal(readPreference('status', 'all', ['all', 'mature']), 'all');
    assert.equal(readPreference('toggle', false), false);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get: () => { throw Error('blocked'); } });
    assert.equal(readPreference('view', 'grid'), 'grid');
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor); else delete globalThis.localStorage;
  }
});
