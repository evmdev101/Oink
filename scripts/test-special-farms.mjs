import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {tShareAmounts,tShareWalletSnapshot}=await import('../src/lib/specialFarms.ts');
const {summarizeFarmWallet,farmWalletPositions}=await import('../src/lib/farmDisplay.ts');
const {farmRankings}=await import('../src/lib/farmRankings.ts');
test('HEX shares use twelve decimals and exclude the seed only from registered shares',()=>{
  assert.deepEqual(tShareAmounts(1000100000000n,1000000000000n),{totalShares:'1.0001',registeredPoolShares:'1.0',registeredShares:'1.0'});
  assert.equal(tShareAmounts(100000000n).registeredPoolShares,'0.0');
  assert.equal(tShareAmounts(9007199254740993000000000001n).totalShares,'9007199254740993.000000000001');
  assert.throws(()=>tShareAmounts(0n));
  assert.throws(()=>tShareAmounts(100000000n,1n));
});
test('wallet multiCall decodes amount, total shares, OINK pending and last action in contract order',()=>{
  const tuple=[1000000000000n,1000100000000n,2500000000000000001n,100n];
  const result=tShareWalletSnapshot(tuple[1],tuple,200);
  assert.equal(result.registeredShares,'1.0');
  assert.equal(result.pending,'2.500000000000000001');
  assert.equal(result.lastAction,100);
  assert.throws(()=>tShareWalletSnapshot(tuple[1]+1n,tuple,200));
  assert.throws(()=>tShareWalletSnapshot(tuple[1],tuple,99));
  assert.throws(()=>tShareWalletSnapshot(tuple[1],tuple.slice(0,3),200));
});
test('wallet totals include registered HEX rewards once, never protocol treasury credit',()=>{
  const shares={data:null,special:{kind:'t-share',registeredShares:'1.0',pending:'2.5',accountError:null}};
  const treasury={data:null,special:{kind:'treasury',rewardCredit:'999999',registeredShares:null,pending:null,accountError:null}};
  assert.deepEqual(summarizeFarmWallet([shares,treasury]),{verifiedFarms:2,partial:false,positionCount:1,grossPending:'2.5'});
  assert.deepEqual(farmWalletPositions(treasury),[]);
  const failed={...shares,special:{...shares.special,accountError:'Read failed'}};
  assert.equal(farmWalletPositions(failed),null);
  assert.equal(summarizeFarmWallet([failed,treasury]).partial,true);
  assert.deepEqual(farmWalletPositions({...shares,special:{...shares.special,registeredShares:'0.0',pending:'0.0'}}),[]);
});
test('special pools rank on emissions only, with no fabricated deposit APR or TVL',()=>{
  const rows=['t-share','treasury'].map((id,i)=>({id,label:id,data:null,special:{pool:String(i),yieldEstimate:{dailyPool:String(i+1)}}}));
  const prices=Object.fromEntries(['oink','t-share','treasury'].map(id=>[id,{usd:'1',fetchedAt:1000000}]));
  const ranks=farmRankings(rows,prices,1000,1000000);
  assert.deepEqual(ranks.apr,[]);assert.deepEqual(ranks.tvl,[]);
  assert.deepEqual(ranks.rewards.map(r=>r.id),['treasury','t-share']);
  assert.equal(ranks.metrics.treasury.rewards,730000000000000000000n);
  assert.deepEqual(farmRankings(rows,prices,800,1000000).rewards,[]);
});
