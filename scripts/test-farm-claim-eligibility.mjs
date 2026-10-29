import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { parseEther } from 'ethers';

registerHooks({
  resolve(specifier, context, next) {
    try { return next(specifier, context); }
    catch (error) {
      if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context);
      throw error;
    }
  },
});
const { rewardDestinationEligibility } = await import('../src/lib/farmRewardDestinations.ts');
const minimum = amount => parseEther(amount).toString();

test('small claims use the amount after the destination penalty when checking the miner minimum', () => {
  for (const gross of ['1.528', '1.588']) {
    assert.equal(rewardDestinationEligibility(gross, '100', minimum('1')), 'below-minimum');
    assert.equal(rewardDestinationEligibility(gross, '2500', minimum('1')), 'below-minimum');
    assert.equal(rewardDestinationEligibility(gross, '10000', minimum('1')), 'ready');
    assert.equal(rewardDestinationEligibility(gross, '50', '0'), 'ready');
  }
});

test('the live 100 OINK miner minimum excludes every miner for the small screenshot reward', () => {
  const liveMinimum = minimum('100');
  for (const rate of ['100', '300', '500', '1000', '2500', '10000']) {
    assert.equal(rewardDestinationEligibility('1.528', rate, liveMinimum), 'below-minimum');
    const thresholdWei = (parseEther('100') * 10000n + BigInt(rate) - 1n) / BigInt(rate);
    const asDecimal = value => `${value / 10n**18n}.${(value % 10n**18n).toString().padStart(18, '0')}`;
    assert.equal(rewardDestinationEligibility(asDecimal(thresholdWei), rate, liveMinimum), 'ready');
    assert.equal(rewardDestinationEligibility(asDecimal(thresholdWei - 1n), rate, liveMinimum), 'below-minimum');
  }
  assert.equal(rewardDestinationEligibility('1.528', '50', '0'), 'ready', 'Liquid wallet payout has no miner minimum');
});

test('a destination becomes available exactly at its minimum, without rounding up', () => {
  assert.equal(rewardDestinationEligibility('99.999999999999999999', '100', minimum('1')), 'below-minimum');
  assert.equal(rewardDestinationEligibility('100', '100', minimum('1')), 'ready');
  assert.equal(rewardDestinationEligibility('100.000000000000000001', '100', minimum('1')), 'ready');
  assert.equal(rewardDestinationEligibility('4', '2500', minimum('1')), 'ready');
  assert.equal(rewardDestinationEligibility('3.999999999999999999', '2500', minimum('1')), 'below-minimum');
  assert.equal(rewardDestinationEligibility('0.000000000000000001', '10000', '1'), 'ready');
});

test('zero payout destinations and rewards rounded down to zero are unavailable', () => {
  assert.equal(rewardDestinationEligibility('10', '0', minimum('1')), 'unavailable');
  assert.equal(rewardDestinationEligibility(null, '0', null), 'unavailable');
  assert.equal(rewardDestinationEligibility('0', '10000', '0'), 'unavailable');
  assert.equal(rewardDestinationEligibility('0.000000000000000001', '50', '0'), 'unavailable');
});

test('missing gross reward, payout or minimum data cannot imply eligibility', () => {
  for (const missing of [null, undefined]) {
    assert.equal(rewardDestinationEligibility(missing, '10000', minimum('1')), 'unknown');
    assert.equal(rewardDestinationEligibility('10', missing, minimum('1')), 'unknown');
    assert.equal(rewardDestinationEligibility('10', '10000', missing), 'unknown');
  }
});

test('malformed input and out-of-range payout rates remain unknown', () => {
  for (const gross of ['', '-1', 'NaN', '1e3', '1.0000000000000000001']) {
    assert.equal(rewardDestinationEligibility(gross, '10000', '0'), 'unknown');
  }
  for (const rate of ['', '-1', '10001', '50.5', 'NaN']) {
    assert.equal(rewardDestinationEligibility('10', rate, '0'), 'unknown');
  }
  for (const value of ['', '-1', '1.5', 'NaN', '1e18']) {
    assert.equal(rewardDestinationEligibility('10', '10000', value), 'unknown');
  }
});

test('large amounts preserve exact wei eligibility rather than Number precision', () => {
  const gross = '12345678901234567890.123456789012345678';
  const exactPayout = parseEther(gross) * 2500n / 10000n;
  assert.equal(rewardDestinationEligibility(gross, '2500', exactPayout.toString()), 'ready');
  assert.equal(rewardDestinationEligibility(gross, '2500', (exactPayout + 1n).toString()), 'below-minimum');
});
