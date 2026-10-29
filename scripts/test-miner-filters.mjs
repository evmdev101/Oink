import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesMinerStatus, minerPenaltyDisplay, selectMiners } from '../src/lib/minerFilters.ts';

const row = (overrides = {}) => ({ index: 0, deposited: 0, maturity: 100, graceEnd: 200, mandatoryUntil: 50, gross: '1.0', pool: { id: 'three-month', label: '3 months', address: '0xABCDEF' }, ...overrides });
const options = (overrides = {}) => ({ query: '', status: 'all', sort: 'progress', time: 100, ...overrides });

test('rollover status starts strictly after maturity and remains after grace without changing withdrawal fees', () => {
  const position = row({ penalty: 4.96 });
  assert.equal(minerPenaltyDisplay(position, 99).rollover, false);
  assert.equal(minerPenaltyDisplay({ ...position, penalty: 0 }, 100).label, '0.00%');
  assert.equal(minerPenaltyDisplay({ ...position, penalty: 0 }, 101).label, 'Roll-Over');
  assert.equal(minerPenaltyDisplay(position, 201).label, 'Roll-Over');
  assert.equal(position.penalty, 4.96);
  assert.deepEqual(minerPenaltyDisplay({ ...position, penalty: null }, 201), { label: 'Check on exit', rollover: false });
});

test('maturity and grace boundaries are inclusive, overdue starts after grace', () => {
  assert.equal(matchesMinerStatus(row(), 'mature', 99), false);
  assert.equal(matchesMinerStatus(row(), 'mature', 100), true);
  assert.equal(matchesMinerStatus(row(), 'mature', 200), true);
  assert.equal(matchesMinerStatus(row(), 'overdue', 200), false);
  assert.equal(matchesMinerStatus(row(), 'overdue', 201), true);
  assert.equal(matchesMinerStatus(row(), 'mature', 201), false);
});

test('mandatory service is independent of maturity and includes its end second', () => {
  const lockedMature = row({ mandatoryUntil: 150 });
  assert.equal(matchesMinerStatus(lockedMature, 'mature', 150), true);
  assert.equal(matchesMinerStatus(lockedMature, 'locked', 150), true);
  assert.equal(matchesMinerStatus(lockedMature, 'locked', 151), false);
});

test('soon is the next seven days, excluding already mature miners', () => {
  assert.equal(matchesMinerStatus(row({ maturity: 100 + 7 * 86400 }), 'soon', 100), true);
  assert.equal(matchesMinerStatus(row({ maturity: 101 + 7 * 86400 }), 'soon', 100), false);
  assert.equal(matchesMinerStatus(row(), 'soon', 100), false);
  assert.equal(matchesMinerStatus(row(), 'active', 99), true);
  assert.equal(matchesMinerStatus(row(), 'active', 100), false);
});

test('search matches durations and addresses case-insensitively and exact # indices', () => {
  const rows = [row({ index: 1 }), row({ index: 10 }), row({ index: 1, pool: { id: 'year', label: '1 year', address: '0x1234' } })];
  assert.deepEqual(selectMiners(rows, options({ query: '  3 MONTHS #1 ' })), [rows[0]]);
  assert.deepEqual(selectMiners(rows, options({ query: '0xaBcD' })), rows.slice(0, 2));
  assert.deepEqual(selectMiners(rows, options({ query: 'missing' })), []);
  assert.equal(selectMiners(rows, options({ query: '3 months', status: 'overdue' })).length, 0);
});

test('date and progress sorting do not mutate the full portfolio', () => {
  const rows = [row({ maturity: 300, graceEnd: 310 }), row({ index: 1, maturity: 200, graceEnd: 400 })];
  for (const sort of ['maturity', 'progress']) assert.deepEqual(selectMiners(rows, options({ sort })), [rows[1], rows[0]]);
  assert.deepEqual(selectMiners(rows, options({ sort: 'grace' })), rows);
  assert.equal(rows[0].maturity, 300);
  assert.deepEqual(selectMiners([], options()), []);
});

test('highest balance preserves wei precision and uses displayed balances when supplied', () => {
  const rows = [row({ gross: '1000000000.000000000000000001' }), row({ index: 1, gross: '1000000000.000000000000000002' })];
  assert.deepEqual(selectMiners(rows, options({ sort: 'balance' })), [rows[1], rows[0]]);
  assert.deepEqual(selectMiners(rows, options({ sort: 'balance', balance: r => r.index === 0 ? '2' : '1' })), rows);
});

test('duration filters select exact pools and combine with status and search', () => {
  const rows = [row({ index: 1 }), row({ index: 2, maturity: 300, graceEnd: 400 }), row({ pool: { id: 'six-month', label: '6 months', address: '0x1234' } })];
  assert.deepEqual(selectMiners(rows, options({ duration: 'three-month', status: 'mature' })), [rows[0]]);
  assert.deepEqual(selectMiners(rows, options({ duration: 'six-month' })), [rows[2]]);
  assert.deepEqual(selectMiners(rows, options({ duration: 'three-month', query: '#2' })), [rows[1]]);
  assert.equal(selectMiners(rows, options({ duration: 'all' })).length, 3);
  assert.deepEqual(selectMiners(rows, options({ duration: 'five-year' })), []);
  assert.equal(rows.length, 3);
});
