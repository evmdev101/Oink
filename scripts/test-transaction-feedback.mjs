import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCancelledFeedback, isRecoveryFeedback, isRoutineRecoveryResult } from '../src/lib/transactionFeedback.ts';

for (const text of [
  'A previous position request is unresolved. Use Previous request recovery at the top of this page.',
  'An earlier farm request is unresolved.',
  'Saved protocol request cannot be read. Check wallet activity; new requests are blocked.',
  'Transaction journal is invalid (unreadable saved data).',
  'Transaction journal storage is unavailable.',
  'Wallet request could not be saved. Check wallet activity before continuing.',
  'The request status could not be saved. Save this transaction hash: 0x123.',
  'Wallet response is uncertain. Check wallet activity; do not resubmit.',
  'Wallet result is uncertain.',
  'Receipt effects could not be fully verified.',
  'A wallet request is open in another tab. Check wallet activity first.',
]) test('tracking feedback belongs in manual recovery: ' + text, () => {
  assert.equal(isRecoveryFeedback(text), true);
});

for (const text of [
  'You cancelled the wallet request.',
  'The wallet request was rejected. No automatic retry was made.',
  'user rejected action (action="sendTransaction", reason="rejected")',
  'User denied transaction signature.',
  'Wallet request canceled.',
]) test('routine wallet cancellation stays quiet: ' + text, () => {
  assert.equal(isCancelledFeedback(text), true);
  assert.equal(isRecoveryFeedback(text), false);
});

for (const text of [
  'Insufficient OINK balance.',
  "Reward is below this destination's minimum miner amount.",
  'Simulation did not pass at the current block.',
  'Transaction simulation failed. Check wallet activity before trying again.',
  'Execution reverted: insufficient funds. The wallet request was rejected.',
  'The minimum deposit was rejected by the wallet.',
  'You do not have enough funds for gas.',
  'The operation could not be completed.',
  'Transaction failed on-chain.',
]) test('actionable errors stay visible: ' + text, () => {
  assert.equal(isCancelledFeedback(text), false);
  assert.equal(isRecoveryFeedback(text), false);
});

test('empty and ordinary success messages are neither errors nor recovery prompts', () => {
  for (const text of ['', ' ', 'Submitted.', 'Transaction mined successfully.', 'Allowance confirmed at the receipt block.']) {
    assert.equal(isCancelledFeedback(text), false);
    assert.equal(isRecoveryFeedback(text), false);
  }
});

test('manual recovery outcomes are identified without hiding validation failures', () => {
  for (const text of [
    'Recovered after you confirmed that the wallet request was cancelled and no transaction was sent.',
    'Recovered after you reviewed the mined transaction. Its detailed effects were not assumed to be verified.',
    'The replacement transaction 0x' + 'ab'.repeat(32) + ' mined, so the original transaction can no longer execute. The old request is recovered; its original effects were not assumed.',
    'Transaction hash recovered. The transaction is still pending and will be checked automatically.',
  ]) assert.equal(isRoutineRecoveryResult(text), true);
  for (const text of ['Insufficient balance.', 'The minimum miner amount is 100 OINK.', 'Simulation did not pass.', 'Transaction failed on-chain.']) assert.equal(isRoutineRecoveryResult(text), false);
});
