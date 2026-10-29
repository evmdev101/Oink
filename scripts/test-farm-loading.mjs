import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { validateFarmSnapshot, withDiscoveredFarmPrices }=await import('../src/lib/farmSnapshot.ts');
const { withFarmReadBudget }=await import('../src/lib/farmReadBudget.ts');
const { ECOSYSTEM_MINER_CONTRACTS }=await import('../src/config/contracts.ts');
const { FARM_PRICE_TOKENS }=await import('../src/lib/farmPrices.ts');
const { farmRankings }=await import('../src/lib/farmRankings.ts');
const now=1800000000000;
function fixture(account='') {
  const prices=Object.fromEntries(Object.keys(FARM_PRICE_TOKENS).map(id=>[id,{usd:'1',pair:'0x'+'1'.repeat(40),fetchedAt:now}]));
  const rows=ECOSYSTEM_MINER_CONTRACTS.map((row,i)=>({ ...row,error:null,
    data:['t-share','treasury'].includes(row.id)?null:{balance:'100',pool:String(i),yieldEstimate:{dailyPool:'1'},positions:[],accountError:null,walletBalance:'0',walletBalanceError:null},
    special:['t-share','treasury'].includes(row.id)?{kind:row.id,pool:String(i),yieldEstimate:{dailyPool:'1'},registeredShares:'0',pending:'0',accountError:null}:null,
  }));
  return {snapshot:{account:account||null,timestamp:now/1000,rows},prices};
}
test('ready means all 17 farm reads and 15 deposit valuations exist at the commit time',()=>{
  const {snapshot,prices}=fixture();
  validateFarmSnapshot(snapshot,prices,'',now);
  const ranks=farmRankings(snapshot.rows,prices,snapshot.timestamp,now);
  assert.equal(ranks.tvl.length,15); assert.equal(ranks.apr.length,15); assert.equal(ranks.rewards.length,17);
  // Regression: the old mount-time clock hid newly fetched, valid data.
  assert.equal(farmRankings(snapshot.rows,prices,snapshot.timestamp,now-15000).totalTvl,null);
});
test('strict readiness rejects failed, partial, stale reads and missing prices',()=>{
  for(const mutate of [f=>delete f.prices.oink,f=>delete f.prices.plsx,f=>f.snapshot.rows[0].data=null,f=>f.snapshot.rows[0].data.yieldEstimate=null,f=>f.snapshot.rows.pop(),f=>f.snapshot.timestamp-=121,f=>f.prices.pls.fetchedAt-=120001]) {
    const f=fixture(); mutate(f);
    assert.throws(()=>validateFarmSnapshot(f.snapshot,f.prices,'',now));
  }
});
test('wallet reads must belong to the current account and include successful zero balances/positions',()=>{
  const account='0x'+'1'.repeat(40),f=fixture(account);
  validateFarmSnapshot(f.snapshot,f.prices,account,now);
  assert.throws(()=>validateFarmSnapshot(f.snapshot,f.prices,'0x'+'2'.repeat(40),now));
  f.snapshot.rows[0].data.walletBalance=null;
  assert.throws(()=>validateFarmSnapshot(f.snapshot,f.prices,account,now));
  const g=fixture(account);g.snapshot.rows.find(r=>r.id==='t-share').special.pending=null;
  assert.throws(()=>validateFarmSnapshot(g.snapshot,g.prices,account,now));
});

test('unfamiliar pools and incomplete new farm reads cannot block existing farm values', () => {
  const f = fixture('0x' + '1'.repeat(40));
  f.snapshot.rows.push(
    { id:'registry-unknown', label:'Pool #28', data:null, special:null, error:null, discovery:{status:'awaiting-integration',poolId:'28'} },
    { id:'registry-readable', label:'PLSX', data:{balance:'50',pool:'29',yieldEstimate:null,positions:null,walletBalance:null,accountError:'Read failed'}, special:null, error:null, discovery:{status:'supported',priceId:'plsx'} },
  );
  validateFarmSnapshot(f.snapshot, f.prices, f.snapshot.account, now);
  const prices = withDiscoveredFarmPrices(f.snapshot, f.prices);
  assert.deepEqual(prices['registry-readable'], prices.plsx);
  assert.equal(prices['registry-unknown'], undefined);
  assert.equal(f.prices['registry-readable'], undefined, 'keeps the original quote map immutable');
  const ranks = farmRankings(f.snapshot.rows, prices, f.snapshot.timestamp, now);
  assert.equal(ranks.metrics['registry-unknown'].tvl, null);
  assert.equal(ranks.metrics['registry-readable'].apr, null);
  assert.equal(ranks.metrics['registry-readable'].tvl, 50n * 10n ** 18n);
});

test('a supported pool awaiting rewards can show zero yield without a new market quote', () => {
  const f = fixture();
  f.snapshot.rows.push({id:'registry-new',label:'PLSX',error:null,special:null,data:{balance:'10',pool:'28',yieldEstimate:{dailyPool:'0'},positions:[],walletBalance:'0'},discovery:{priceId:'plsx'}});
  validateFarmSnapshot(f.snapshot, f.prices, '', now);
  const ranks = farmRankings(f.snapshot.rows, withDiscoveredFarmPrices(f.snapshot,f.prices), f.snapshot.timestamp, now);
  assert.equal(ranks.metrics['registry-new'].apr,0n);
  assert.equal(ranks.metrics['registry-new'].rewards,0n);
});

test('optional pool reads time out and observe parent cancellation without holding the page', async () => {
  let child;
  await assert.rejects(withFarmReadBudget(signal => { child=signal; return new Promise(() => {}); }, undefined, 15), /timed out/);
  assert.equal(child.aborted,true);
  const controller=new AbortController();
  const pending=withFarmReadBudget(() => new Promise(() => {}),controller.signal,5000);
  controller.abort(new Error('Page changed'));
  await assert.rejects(pending,/Page changed/);
  assert.equal(await withFarmReadBudget(async()=>42,undefined,15),42);
});
