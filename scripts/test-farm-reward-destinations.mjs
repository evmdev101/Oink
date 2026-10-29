import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFile } from 'node:fs/promises';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const { rewardRateText, rewardDestinationAmount, loadFarmRewardDestinations } = await import('../src/lib/farmRewardDestinations.ts');

test('quick reward breakdown calculates payouts exactly for the selected pending rewards', () => {
  assert.equal(rewardDestinationAmount('1000', '10000'), '1000.0');
  assert.equal(rewardDestinationAmount('1000', '2500'), '250.0');
  assert.equal(rewardDestinationAmount('1000', '50'), '5.0');
  assert.equal(rewardDestinationAmount('0', '2500'), '0.0');
  assert.equal(rewardDestinationAmount('0.000000000000000001', '50'), '0.0');
  assert.equal(rewardDestinationAmount('12345678901234567890.123456789012345678', '10000'), '12345678901234567890.123456789012345678');
  for (const gross of [null, undefined, '-1', 'NaN']) assert.equal(rewardDestinationAmount(gross, '50'), null);
  assert.equal(rewardDestinationAmount('1000', null), null);
});

test('reward destination labels show only exact penalty percentages', () => {
  for (const [rate, label] of [['10000','0% penalty'],['2500','75% penalty'],['1000','90% penalty'],['500','95% penalty'],['300','97% penalty'],['100','99% penalty'],['50','99.5% penalty'],['0','100% penalty'],['1234','87.66% penalty']]) {
    assert.equal(rewardRateText(rate), label);
  }
});

test('missing or invalid rates cannot masquerade as a payout', () => {
  for (const rate of [null,undefined,'10001','-1','50.5','NaN','']) assert.equal(rewardRateText(rate),null);
});

test('unsupported farms, wrong networks and changed runtime fail without wallet calls', async () => {
  await assert.rejects(loadFarmRewardDestinations({send(){throw Error('No RPC expected');}},'unknown'),/Unsupported/);
  for (const mode of ['chain','runtime']) {
    const methods=[];
    const rpc={async send(method){methods.push(method);if(method==='eth_chainId')return mode==='chain'?'0x1':'0x171';if(method==='eth_getBlockByNumber')return {number:'0x100',hash:'0x'+'aa'.repeat(32),timestamp:'0x'+Math.floor(Date.now()/1000).toString(16)};if(method==='eth_getCode')return '0x';throw Error('Unexpected request');}};
    await assert.rejects(loadFarmRewardDestinations(rpc,'pls'),/PulseChain|runtime/);
    assert.ok(methods.every(method=>['eth_chainId','eth_getBlockByNumber','eth_getCode'].includes(method)));
  }
});

test('claim and unstake use live destination labels and farm backdrop has no blur', async () => {
  const component=await readFile(new URL('../src/components/PositionActionPreview.tsx',import.meta.url),'utf8');
  assert.match(component,/readFarmRewardDestinations\(farmId/);
  assert.match(component,/payoutLabel\(v.id\)/);
  assert.match(component,/payoutLabel\("wallet"\)/);
  const css=await readFile(new URL('../src/components/farm-transactions.css',import.meta.url),'utf8');
  assert.match(css,/farm-review-dialog::backdrop\s*\{[^}]*backdrop-filter:none/);
});
