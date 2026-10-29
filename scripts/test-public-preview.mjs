import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s, c, next) { try { return next(s, c); } catch (error) { if (s.startsWith('.') && !/\.[a-z]+$/i.test(s)) return next(s + '.ts', c); throw error; } } });
const { GOVERNANCE_ACTIONS_DISABLED, GOVERNANCE_ACTIONS_NOTICE, MAINTENANCE_ACTIONS_DISABLED, MAINTENANCE_ACTIONS_NOTICE, actionPauseNotice, isGovernanceActionDisabled, assertGovernanceActionEnabled } = await import('../src/config/publicPreview.ts');
const { COMMUNITY_MAINTENANCE_ACTIONS } = await import('../src/lib/communityMaintenanceActions.ts');
const { submitProtocolDirect } = await import('../src/lib/protocolDirectFlow.ts');
const { requestProtocolTransaction } = await import('../src/lib/protocolTransactions.ts');
const request = (module, action) => ({ module, action, args: {} });
const blocked = [
  ...['ordinary', 'advanced-governance', 'participation', 'nft-allocation', 'reward-maintenance'].map(module => request(module, 'any-action')),
  request('miner-donation', 'propose'),
  ...COMMUNITY_MAINTENANCE_ACTIONS.map(({id}) => request('community-maintenance', id)),
  request('community-maintenance', 'future-maintenance-action'),
];

test('governance is paused, including equivalent actions outside its page', () => {
  assert.equal(GOVERNANCE_ACTIONS_DISABLED, true);
  assert.equal(MAINTENANCE_ACTIONS_DISABLED, true);
  for (const item of blocked) {
    assert.equal(isGovernanceActionDisabled(item), true);
    assert.throws(() => assertGovernanceActionEnabled(item), error => error.code === 4100 && error.walletRequestStarted === false && error.message === actionPauseNotice(item));
  }
});

test('sale, referrals, donation helper creation/activation and other non-governance actions remain enabled', () => {
  for (const item of [
    ...['sale', 'sale-approve', 'sale-reset', 'referral'].map(action => request('offers', action)),
    request('miner-donation', 'deploy'), request('miner-donation', 'activate'),
    request('hex-shares', 'register'), request('distribution', 'claim'),
  ]) {
    assert.equal(isGovernanceActionDisabled(item), false);
    assert.doesNotThrow(() => assertGovernanceActionEnabled(item));
  }
});

test('governance is blocked before preparing, saving a journal or interacting with a wallet', async () => {
  const unexpected = new Proxy({}, { get() { throw Error('Must not touch dependencies'); } });
  for (const item of blocked) {
    const expected = item.module === 'community-maintenance' ? MAINTENANCE_ACTIONS_NOTICE : GOVERNANCE_ACTIONS_NOTICE;
    await assert.rejects(submitProtocolDirect({ request: item }, unexpected), error => error.message === expected);
    await assert.rejects(requestProtocolTransaction({ request: item }, unexpected, unexpected, unexpected, () => true), error => error.message === expected);
  }
});

test('non-governance requests reach the existing transaction flow', async () => {
  const failure = new Error('Existing flow reached');
  await assert.rejects(submitProtocolDirect({ account: '0x' + '11'.repeat(20), request: request('offers', 'sale'), current: () => true, onStage() {} }, { withLock() { throw failure; } }), error => error === failure);
});

test('farm and miner controls remain available while governance and maintenance show pause notices', async () => {
  const source = async name => readFile(new URL('../src/' + name, import.meta.url), 'utf8');
  assert.doesNotMatch(await source('components/WalletProvider.tsx'), /publicPreviewProvider/);
  for (const name of ['PositionTransaction', 'FarmDepositActions', 'MinerActions', 'MinerRolloverDialog']) {
    assert.doesNotMatch(await source('components/' + name + '.tsx'), /WALLET_ACTIONS_DISABLED|GOVERNANCE_ACTIONS_DISABLED/);
  }
  assert.match(await source('components/ProtocolAction.tsx'), /isGovernanceActionDisabled\(request\)/);
  assert.match(await source('components/PublicPreviewNotice.tsx'), /pathname !== "\/governance"/);
  assert.match(await source('components/PublicPreviewNotice.tsx'), /pathname === "\/maintenance"/);
  assert.match(await source('components/MaintenanceStatus.tsx'), /useAccessRead\("community-maintenance"/);
});
