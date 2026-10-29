import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { displayPrice, mergeDisplayPrices, mergeTreasuryHoldings } = await import('../src/lib/retainedPublicDisplay.ts');
const { freshFarmPrice } = await import('../src/lib/farmPrices.ts');
const { treasuryWalletDisplayValues, treasuryWalletValues } = await import('../src/lib/treasuryValuation.ts');
const now=1_800_000_000_000, quote=(usd='1',fetchedAt=now)=>({usd,pair:'0x'+'1'.repeat(40),fetchedAt});
const snapshot=(block,balance,address='0x'+'1'.repeat(40))=>({block,timestamp:now/1000,rows:[{address,assets:[{symbol:'PLS',address:null,balance}]}]});

test('expired observed prices stay in public display without weakening strict freshness',()=>{
  const old=quote('2',now-180000);
  assert.equal(displayPrice(old,now),'2');
  assert.equal(freshFarmPrice(old,now),'');
  const assets=[{symbol:'PLS',address:null,balance:'5'}],prices={pls:old};
  assert.equal(treasuryWalletDisplayValues(assets,prices,now).rows.find(row=>row.symbol==='PLS').usd,10);
  assert.equal(treasuryWalletValues(assets,prices,now).rows.find(row=>row.symbol==='PLS').usd,null);
});
test('missing, invalid, future and regressed quotes cannot overwrite good observed prices',()=>{
  const good=quote('2'), previous={pls:good};
  for(const next of [{},{pls:quote('0')},{pls:quote('NaN')},{pls:quote('3',now+1)},{pls:quote('3',now-1)}])assert.deepEqual(mergeDisplayPrices(previous,next,now),previous);
  assert.equal(mergeDisplayPrices(previous,{pls:quote('3',now+1)},now+1).pls.usd,'3');
  assert.equal(mergeDisplayPrices(previous,{},now).pls.fetchedAt,now);
});
test('partial reads retain exact balances while legitimate new zero updates immediately',()=>{
  const prior=snapshot(10,'9007199254740993.123456789');
  const partial=mergeTreasuryHoldings(prior,snapshot(11,null));
  assert.equal(partial.value.rows[0].assets[0].balance,'9007199254740993.123456789');assert.equal(partial.retained,true);
  const zero=mergeTreasuryHoldings(prior,snapshot(11,'0'));
  assert.equal(zero.value.rows[0].assets[0].balance,'0');assert.equal(zero.retained,false);
});
test('older blocks and changed owners cannot replace or borrow observed balances',()=>{
  const prior=snapshot(10,'5');
  assert.equal(mergeTreasuryHoldings(prior,snapshot(9,'0')).value,prior);
  assert.equal(mergeTreasuryHoldings(prior,snapshot(11,null,'0x'+'2'.repeat(40))).value.rows[0].assets[0].balance,null);
});
test('an unpriced nonzero holding never creates a misleading display subtotal of zero',()=>{
  const result=treasuryWalletDisplayValues([{symbol:'PLS',address:null,balance:'5'},{symbol:'EARN',address:'0x'+'3'.repeat(40),balance:'0'}],{},now);
  assert.equal(result.total,null);assert.equal(result.complete,false);
});
