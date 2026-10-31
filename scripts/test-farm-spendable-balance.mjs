import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, formatUnits, parseUnits } from 'ethers';

registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context);
    throw error;
  }
} });
const { farmHasTransferLocks, farmSpendableBalance, readFarmLockedBalance } = await import('../src/lib/farmSpendableBalance.ts');
const { farmQuickAmount } = await import('../src/lib/farmQuickAmounts.ts');

// Recording mocks only. No provider, network or wallet is used.
const account = '0x0000000000000000000000000000000000000011';
const token = '0x0000000000000000000000000000000000000022';
const vault = '0x0000000000000000000000000000000000000033';
const lockedSpec = {
  address: vault, tokenAddress: token, decimals: 18,
  tokenPolicy: { kind: 'variable-transfer', accounting: 'received', lockedBalance: 'lockedAmount' },
};
const ordinarySpec = { address: vault, tokenAddress: token, decimals: 18 };
const session = { account, chainId: 369n };
const now = 1_000_000;
const snapshot = (overrides = {}) => ({
  balance: '3624.427656131974276171', availableBalance: '1124.427656131974276171',
  account, timestamp: now / 1000, farmAddress: vault, tokenAddress: token, decimals: 18,
  ...overrides,
});
const abi = new Interface(['function lockedAmount(address) view returns(uint256)']);

test('transfer locks apply only to the explicitly configured variable-transfer policy', () => {
  assert.equal(farmHasTransferLocks(lockedSpec), true);
  for (const spec of [
    ordinarySpec,
    { ...ordinarySpec, tokenPolicy: { kind: 'variable-transfer', accounting: 'received' } },
    { ...ordinarySpec, tokenPolicy: { kind: 'usdt', lockedBalance: 'lockedAmount' } },
    { ...ordinarySpec, tokenPolicy: { kind: 'variable-transfer', lockedBalance: 'unreviewedMethod' } },
  ]) assert.equal(farmHasTransferLocks(spec), false);
});

test('spendable balances subtract locked tokens with exact bigint arithmetic', () => {
  const total = parseUnits('3624.427656131974276171', 18), locked = parseUnits('2500', 18);
  assert.equal(farmSpendableBalance(total, locked), parseUnits('1124.427656131974276171', 18));
  assert.equal(farmSpendableBalance(total, 0n), total);
  assert.equal(farmSpendableBalance(total, total), 0n);
  const large = (1n << 200n) + 123n;
  assert.equal(farmSpendableBalance(large, large - 1n), 1n);
  for (const [balance, hold] of [[-1n, 0n], [1n, -1n], [1n, 2n]]) assert.throws(() => farmSpendableBalance(balance, hold));
});

test('locked-token reads call the configured token and wallet at the exact snapshot block', async () => {
  const amount = (1n << 100n) + 19n, calls = [];
  const rpc = { async send(method, params) {
    calls.push([method, params]);
    assert.equal(method, 'eth_call'); assert.equal(params[0].to, token); assert.equal(params[1], '0x123');
    const call = abi.parseTransaction(params[0]);
    assert.equal(call.name, 'lockedAmount'); assert.equal(call.args[0], account);
    return abi.encodeFunctionResult('lockedAmount', [amount]);
  } };
  assert.equal(await readFarmLockedBalance(rpc, lockedSpec, account, 0x123), amount);
  assert.equal(await readFarmLockedBalance(rpc, lockedSpec, account, '0x123'), amount);
  assert.equal(calls.length, 2);
});

test('ordinary tokens never make a locked-balance RPC request', async () => {
  const rpc = { send() { throw Error('An ordinary asset must not request a lock getter.'); } };
  assert.equal(await readFarmLockedBalance(rpc, ordinarySpec, account, '0x123'), 0n);
  assert.equal(await readFarmLockedBalance(rpc, { ...lockedSpec, tokenPolicy: { kind: 'variable-transfer', accounting: 'received' } }, account, '0x123'), 0n);
});

test('lock-read failures stay unavailable instead of becoming a fabricated zero', async () => {
  await assert.rejects(readFarmLockedBalance({ async send() { throw Error('RPC unavailable'); } }, lockedSpec, account, '0x123'), /RPC unavailable/);
  await assert.rejects(readFarmLockedBalance({ async send() { return '0x'; } }, lockedSpec, account, '0x123'));
});

test('pTGC Max and percentage fills use only the transferable balance, with raw-unit floor rounding', () => {
  const available = parseUnits(snapshot().availableBalance, 18);
  for (const percent of [25, 50, 75, 100]) {
    assert.equal(farmQuickAmount(percent, snapshot(), session, lockedSpec, now), formatUnits(available * BigInt(percent) / 100n, 18));
  }
  assert.equal(farmQuickAmount(100, snapshot(), session, lockedSpec, now), '1124.427656131974276171');
  const oneWei = snapshot({ balance: '1.000000000000000001', availableBalance: '0.000000000000000001' });
  assert.equal(farmQuickAmount(100, oneWei, session, lockedSpec, now), '0.000000000000000001');
  assert.equal(farmQuickAmount(50, oneWei, session, lockedSpec, now), null);
});

test('missing, invalid or inconsistent transferable balances disable locked-token Max', () => {
  for (const availableBalance of [undefined, null, '', 'NaN', '-1', '1e3', '3624.427656131974276172', '1124.4276561319742761711', '0']) {
    assert.equal(farmQuickAmount(100, snapshot({ availableBalance }), session, lockedSpec, now), null);
  }
  assert.equal(farmQuickAmount(100, snapshot(), { ...session, account: token }, lockedSpec, now), null);
  assert.equal(farmQuickAmount(100, snapshot(), session, lockedSpec, now + 120000), null);
});

test('ordinary-token Max retains its full-wallet behavior regardless of optional lock-display data', () => {
  for (const availableBalance of [undefined, null, '0', '1', 'bad value']) {
    assert.equal(farmQuickAmount(100, snapshot({ availableBalance }), session, ordinarySpec, now), snapshot().balance);
  }
  const large = (1n << 200n) + 123n;
  assert.equal(farmQuickAmount(75, snapshot({ balance: formatUnits(large, 18) }), session, ordinarySpec, now), formatUnits(large * 75n / 100n, 18));
});
