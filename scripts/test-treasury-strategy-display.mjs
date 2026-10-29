import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { mergeStrategySnapshot, updateStrategyDisplay } = await import('../src/lib/treasuryStrategyDisplay.ts');
const { FARM_PRICE_TOKENS } = await import('../src/lib/farmPrices.ts');
const now = 2_000_000_000_000;
const timestamp = now / 1000;
const row = (id, symbol, balance, error = '') => ({ id, label: id, address: '0x' + (id === 'a' ? 'a' : 'b').repeat(40), error, assets: [{ symbol, address: FARM_PRICE_TOKENS[symbol.toLowerCase()], balance }] });
const snapshot = (block = 100, rows = [row('a', 'PLSX', '10.5'), row('b', 'INC', '2')], time = timestamp) => ({ block, timestamp: time, rows });
const prices = { plsx: { usd: '2', pair: 'x', fetchedAt: now }, inc: { usd: '5', pair: 'y', fetchedAt: now } };

test('a partial refresh retains observed balances and the complete total instead of dropping to partial zero', () => {
  const first = updateStrategyDisplay(null, snapshot(), prices, now);
  assert.equal(first.currentComplete, true);
  assert.equal(first.lastComplete.value, 31);
  const next = updateStrategyDisplay(first, snapshot(101, [row('a', 'PLSX', null, 'Position unavailable'), row('b', 'INC', '3')], timestamp + 1), {}, now + 1000);
  assert.equal(next.groups.find(group => group.symbol === 'PLSX').balance, '10.5');
  assert.equal(next.groups.find(group => group.symbol === 'INC').balance, '3');
  assert.equal(next.currentComplete, false);
  assert.equal(next.lastComplete.value, 31);
  assert.equal(next.snapshot.rows[0].assets[0].observedBlock, 100);
  assert.equal(next.snapshot.rows[0].assets[0].retained, true);
});

test('expired prices keep display valuations while freshness and the total remain last known', () => {
  const first = updateStrategyDisplay(null, snapshot(), prices, now);
  const next = updateStrategyDisplay(first, snapshot(102, undefined, timestamp + 130), {}, now + 130000);
  assert.equal(next.groups[0].usd, 21);
  assert.equal(next.groups[1].usd, 10);
  assert.equal(next.currentComplete, false);
  assert.equal(next.lastComplete.value, 31);
  assert.equal(next.lastComplete.timestamp, timestamp);
});

test('unknown positive positions cannot publish a misleading zero total, but complete confirmed zero positions can', () => {
  const partial = updateStrategyDisplay(null, snapshot(100, [row('a', 'PLSX', '10'), row('b', 'INC', '0')]), {}, now);
  assert.equal(partial.groups[1].usd, 0);
  assert.equal(partial.lastComplete, null);
  const zeros = updateStrategyDisplay(partial, snapshot(101, [row('a', 'PLSX', '0'), row('b', 'INC', '0')]), {}, now);
  assert.equal(zeros.currentComplete, true);
  assert.equal(zeros.lastComplete.value, 0);
});

test('new complete data replaces retained totals and balances exactly, including decreases', () => {
  const first = updateStrategyDisplay(null, snapshot(), prices, now);
  const partial = updateStrategyDisplay(first, snapshot(101, [row('a', 'PLSX', null, 'Position unavailable'), row('b', 'INC', '0')]), {}, now);
  const next = updateStrategyDisplay(partial, snapshot(102, [row('a', 'PLSX', '1.123456789012345678'), row('b', 'INC', '0')]), prices, now);
  assert.equal(next.currentComplete, true);
  assert.equal(next.groups[0].balance, '1.123456789012345678');
  assert.equal(next.lastComplete.value, Number('1.123456789012345678') * 2);
  assert.equal(next.snapshot.rows[0].assets[0].retained, false);
});

test('older snapshots and changed asset identities cannot overwrite or borrow an observation', () => {
  const first = mergeStrategySnapshot(null, snapshot());
  assert.equal(mergeStrategySnapshot(first, snapshot(99)), first);
  const changed = row('a', 'PLSX', null, 'Position unavailable');
  changed.assets[0].address = FARM_PRICE_TOKENS.hex;
  const next = mergeStrategySnapshot(first, snapshot(101, [changed, row('b', 'INC', '2')]));
  assert.equal(next.rows[0].assets[0].balance, null);
});

test('missing strategy entries retain their observed assets but cannot turn the view into a complete fresh total', () => {
  const first = updateStrategyDisplay(null, snapshot(), prices, now);
  const next = updateStrategyDisplay(first, snapshot(101, [row('a', 'PLSX', '8')]), {}, now);
  assert.equal(next.snapshot.rows.length, 2);
  assert.equal(next.groups.find(group => group.symbol === 'INC').balance, '2');
  assert.equal(next.currentComplete, false);
  assert.equal(next.lastComplete.value, 31);
});
