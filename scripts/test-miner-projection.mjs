import { test } from 'node:test';
import assert from 'node:assert/strict';
import { projectMinerRewards } from '../src/lib/minerProjection.ts';
const now = 1_000_000;
const estimate = { dailyPool: '10', apr: '3650.00', poolBalance: '100', totalShares: '100', timestamp: now / 1000 };

test('new deposits dilute pool share and separate new rewards from starting amount', () => {
  const result = projectMinerRewards('100', estimate, 91, now);
  assert.equal(result.error, '');
  assert.deepEqual(result.rows.map(row => row.rewards), ['5.0', '35.0', '150.0', '455.0']);
  assert.deepEqual(result.rows.map(row => row.total), ['105.0', '135.0', '250.0', '555.0']);
});
test('full-term projections use all six exact contract durations', () => {
  for (const days of [30, 91, 181, 365, 1095, 1826]) {
    const row = projectMinerRewards('100', estimate, days, now).rows[3];
    assert.equal(row.days, days);
    assert.equal(row.rewards, (days * 5) + '.0');
  }
});
test('zero emissions are valid, and empty pools assign the first depositor the pool share', () => {
  assert.equal(projectMinerRewards('100', { ...estimate, dailyPool: '0' }, 30, now).rows[0].rewards, '0.0');
  assert.equal(projectMinerRewards('100', { ...estimate, poolBalance: '0', totalShares: '0' }, 30, now).rows[0].rewards, '10.0');
});
test('invalid amounts, stale or missing data, and zero-share deposits never display invented rewards', () => {
  for (const value of ['', '0', '-1', 'abc', '1e3', '0.0000000000000000001']) assert.ok(projectMinerRewards(value, estimate, 30, now).error);
  assert.ok(projectMinerRewards('1', null, 30, now).error);
  assert.ok(projectMinerRewards('1', estimate, 30, now + 120000).error);
  assert.ok(projectMinerRewards('1', estimate, 30, now - 1).error);
  assert.ok(projectMinerRewards('0.000000000000000001', { ...estimate, poolBalance: '1000' }, 30, now).error);
  assert.ok(projectMinerRewards('1', { ...estimate, poolBalance: '0' }, 30, now).error);
});
test('projection retains large-amount and wei precision instead of floating-point APR rounding', () => {
  const result = projectMinerRewards('1000000000000000000.000000000000000001', { ...estimate, poolBalance: '0', totalShares: '0', dailyPool: '0.000000000000000001' }, 1826, now);
  assert.equal(result.rows[0].total, '1000000000000000000.000000000000000002');
  assert.equal(result.rows[3].rewards, '0.000000000000001826');
});
