import { test } from 'node:test';
import assert from 'node:assert/strict';
import { portfolioMarketValue as value, completePortfolioTotal as total } from '../src/lib/portfolioValuation.ts';
test('portfolio preserves precision above the JavaScript safe integer range', () => {
  assert.equal(value('9007199254740993.5', '2', true), 18014398509481987n * 10n ** 18n);
});
test('missing, invalid and stale balances or quotes cannot imply a zero valuation', () => {
  for (const quantity of [null, '', 'NaN', '-1']) assert.equal(value(quantity, '1', true), null);
  for (const price of [null, '', 'NaN', '0', '-1']) assert.equal(value('1', price, true), null);
  assert.equal(value('10', '1', false), null);
  assert.equal(value('0', null, true), 0n);
  assert.equal(value('0', '1', false), null);
});
test('incomplete categories suppress the combined portfolio total', () => {
  assert.equal(total([10n, null, 20n]), null);
  assert.equal(total([]), null);
  assert.equal(total([0n, 0n, 0n]), 0n);
  assert.equal(total([10n, 20n, 30n]), 60n);
});
