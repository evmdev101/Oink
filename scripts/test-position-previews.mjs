import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { farmExitAmounts, farmFundingAmounts, minerExitAmounts } = await import('../src/lib/positionPreviewMath.ts');
const { previewFarmExit, previewMiner } = await import('../src/lib/positionPreviews.ts');
const { MINER_PREVIEW_SPECS } = await import('../src/config/minerPreviewVerification.ts');
const U = 10n ** 18n, DAY = 86400n;

test('miner penalties use completed days, while a mature rollover can still have a late withdrawal fee', () => {
  const threeMonth = MINER_PREVIEW_SPECS.find(rule => rule.id === 'three-month');
  const sixMonth = MINER_PREVIEW_SPECS.find(rule => rule.id === 'six-month');
  const elapsed = 104n * DAY + 18n * 3600n;
  assert.equal(minerExitAmounts(100n * U, 0n, 0n, elapsed, sixMonth).penaltyBps, 1798n);
  assert.equal(minerExitAmounts(100n * U, 0n, 0n, 105n * DAY, sixMonth).penaltyBps, 1775n);
  const matured = minerExitAmounts(100n * U, 0n, 0n, elapsed, threeMonth);
  assert.ok(elapsed > matured.graceEnd);
  assert.equal(matured.penaltyBps, 496n);
});

test('claim quotes take rewards before the funding deduction and separate the governor share', () => {
  const q = farmExitAmounts(100n * U, 0n, 1000000000000n, 0n, 0n, 250n, 50n, 3600n);
  assert.equal(q.fundingFee, 25n * U / 1000n);
  assert.equal(q.grossReward, 100n * U);
  assert.equal(q.rewardReceived, U / 2n);
  assert.equal(q.governorReward, 995n * U / 10n);
  assert.equal(q.principalAfterFee + q.fundingFee, 100n * U);
});
test('funding uses whole hours, change timestamp, integer rounding and 20% cap', () => {
  const q = (now, changed = 0n, amount = 100n * U) => farmExitAmounts(amount, 0n, 0n, 0n, changed, 250n, 50n, now);
  assert.equal(q(3599n).fundingFee, 0n);
  assert.equal(q(3600n).fundingFee, 25n * U / 1000n);
  assert.equal(q(7199n, 3600n).fundingFee, 0n);
  assert.equal(q(7200n, 3600n).fundingFee, 25n * U / 1000n);
  assert.equal(q(100000000n).fundingFee, 20n * U);
  assert.equal(q(100000000n, 0n, 4n).fundingFee, 0n);
});
test('zero and full payout rates are not fabricated as defaults', () => {
  for (const rate of [0n, 10000n]) {
    const q = farmExitAmounts(U, 0n, 1000000000000n, 0n, 0n, 0n, rate, 3600n);
    assert.equal(q.rewardReceived, U * rate / 10000n);
    assert.equal(q.rewardReceived + q.governorReward, q.grossReward);
  }
});
test('invalid accounting, rates and future timestamps fail closed', () => {
  assert.throws(() => farmExitAmounts(U, 1n, 0n, 0n, 0n, 0n, 50n, 3600n));
  assert.throws(() => farmExitAmounts(U, 0n, 0n, 0n, 0n, 251n, 50n, 3600n));
  assert.throws(() => farmExitAmounts(U, 0n, 0n, 0n, 0n, 0n, 10001n, 3600n));
  assert.throws(() => farmExitAmounts(U, 0n, 0n, 0n, 3601n, 0n, 50n, 3600n));
});
for (const rule of MINER_PREVIEW_SPECS) {
  test(rule.id + ': exact maturity, grace, mandatory and penalty boundaries', () => {
    const at = (now, mandatory = 0n) => minerExitAmounts(100n * U, 0n, mandatory, now, rule);
    const maturity = BigInt(rule.durationDays) * DAY;
    const grace = maturity + BigInt(rule.graceDays) * DAY;
    assert.equal(at(0n).locked, true);
    assert.equal(at(1n).penaltyBps, BigInt(rule.maxPenaltyBps));
    assert.equal(at(DAY - 1n).penaltyBps, BigInt(rule.maxPenaltyBps));
    assert.equal(at(DAY).penaltyBps, BigInt(rule.maxPenaltyBps) - BigInt(rule.dailyNumerator) / BigInt(rule.dailyDenominator));
    assert.equal(at(maturity).penaltyBps, 0n);
    assert.equal(at(grace).penaltyBps, 0n);
    assert.equal(at(grace + 1n).penaltyBps, BigInt(rule.graceDays) * BigInt(rule.dailyNumerator) / BigInt(rule.dailyDenominator));
    assert.equal(at(grace * 100n).penaltyBps, BigInt(rule.maxPenaltyBps));
    assert.equal(at(maturity, maturity).locked, true);
    assert.equal(at(maturity + 1n, maturity).locked, false);
    const q = at(maturity - 1n);
    assert.equal(q.received + q.penalty, 100n * U);
  });
}
const wallet = '0x0000000000000000000000000000000000000001';
test('unknown contracts and invalid positions fail before any RPC request', async () => {
  const rpc = { send() { throw new Error('unexpected RPC call'); } };
  await assert.rejects(previewFarmExit(rpc, 't-share', wallet, 0, 'claim'), /currently cover/);
  await assert.rejects(previewFarmExit(rpc, 'pls', wallet, -1, 'claim'), /valid position/);
  await assert.rejects(previewFarmExit(rpc, 'pls', wallet, 0.1, 'withdraw'), /valid position/);
  await assert.rejects(previewFarmExit(rpc, 'pls', wallet, 0, 'unexpected'), /Unsupported/);
  await assert.rejects(previewFarmExit(rpc, 'pls', wallet, 0, 'emergency', Date.now(), 'five-year'), /wallet only/);
  await assert.rejects(previewMiner(rpc, 'other', wallet, {kind:'withdraw',index:0}), /Unknown/);
});

test('emergency funding model does not require any reward accounting', () => {
  assert.deepEqual(farmFundingAmounts(100n * U, 0n, 0n, 0n, 100000000n), { fundingFee: 0n, principalAfterFee: 100n * U });
  assert.deepEqual(farmFundingAmounts(100n * U, 0n, 0n, 250n, 100000000n), { fundingFee: 20n * U, principalAfterFee: 80n * U });
  assert.throws(() => farmFundingAmounts(U, 100n, 0n, 1n, 99n), /timestamp/);
  assert.throws(() => farmFundingAmounts(U, 0n, 0n, 251n, 100n), /funding/);
});
test('wrong networks, stale/future data, missing snapshots and changed runtimes are blocked', async () => {
  const now = Date.now();
  for (const mode of ['chain', 'stale', 'future', 'missing', 'code']) {
    const calls = [];
    const rpc = { async send(method) {
      calls.push(method);
      if (method === 'eth_chainId') return mode === 'chain' ? '0x1' : '0x171';
      if (method === 'eth_getBlockByNumber') return mode === 'missing' ? null : { number:'0x100', hash:'0x'+'aa'.repeat(32), timestamp:'0x'+Math.floor(now/1000 + (mode === 'stale' ? -121 : mode === 'future' ? 31 : 0)).toString(16) };
      if (method === 'eth_getCode') return '0x';
      throw new Error('Unexpected RPC: ' + method);
    } };
    await assert.rejects(previewFarmExit(rpc, 'pls', wallet, 0, 'claim', now), /PulseChain|stale|unavailable|runtime/);
    assert.ok(calls.every(v => ['eth_chainId','eth_getBlockByNumber','eth_getCode'].includes(v)));
  }
});
