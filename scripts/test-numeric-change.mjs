import { test } from 'node:test';
import assert from 'node:assert/strict';
import { numericDirection } from '../src/lib/numericChange.ts';

test('detects the smallest token change above the safe integer range', () => {
  assert.equal(numericDirection('9007199254740993.000000000000000001', '9007199254740993.000000000000000002'), 'up');
  assert.equal(numericDirection('9007199254740993.000000000000000002', '9007199254740993.000000000000000001'), 'down');
});

test('equivalent precision, leading zeros and signed zero do not tick', () => {
  assert.equal(numericDirection('001.2000', '1.2'), null);
  assert.equal(numericDirection('-0.00', '+0'), null);
});

test('compares signed fractional quantities correctly', () => {
  assert.equal(numericDirection('-1.9', '-1.8'), 'up');
  assert.equal(numericDirection('0', '-0.001'), 'down');
  assert.equal(numericDirection('-0.001', '0.0001'), 'up');
});

test('finite JavaScript exponent notation can be compared exactly', () => {
  assert.equal(numericDirection('1e21', '1000000000000000000001'), 'up');
  assert.equal(numericDirection('1e-7', '0.0000001'), null);
  assert.equal(numericDirection('1.25E+3', '1249.99'), 'down');
});

test('missing, formatted and invalid input never generates a false direction', () => {
  for (const value of ['', '—', 'Unavailable', 'NaN', 'Infinity', '1,000', '$1', '1e9999999']) assert.equal(numericDirection(value, '2'), null);
});
