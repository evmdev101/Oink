import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {completeBalanceTotal,inflowWindowSummary}=await import('../src/lib/dashboardStats.ts');
const {decodeActivity}=await import('../src/lib/treasuryActivity.ts');
const {OINK_TOKEN,TREASURY_WALLET,CORE_CONTRACTS}=await import('../src/config/contracts.ts');
const now=2000000;
const coverage={fromTimestamp:now-90000,toTimestamp:now-10,partial:false};
const row=(amount='2 OINK',timestamp=now-100)=>({amount,timestamp});
test('incomplete protocol account balances never look like a complete zero or lower total',()=>{
 assert.equal(completeBalanceTotal(['173.5','364.4','0','0']),537.9);
 for(const balances of [[],['10',null],['10',undefined],['10','bad'],[null,null]]) assert.equal(completeBalanceTotal(balances),null);
 assert.equal(completeBalanceTotal(['0','0']),0);
});
test('only fully covered inflow windows publish a total',()=>{
 assert.deepEqual(inflowWindowSummary([row()],coverage,86400,now,()=> '3'),{complete:true,count:1,usd:6});
 for(const seconds of [7*86400,30*86400]) assert.deepEqual(inflowWindowSummary([row()],coverage,seconds,now,()=> '3'),{complete:false,count:1,usd:null});
 assert.equal(inflowWindowSummary([],coverage,86400,now,()=> '' ).usd,0);
});
test('missing prices, timestamps, partial queries and stale history never silently undercount',()=>{
 assert.equal(inflowWindowSummary([row(),row('1 HEX')],coverage,86400,now,s=>s==='OINK'?'3':'').usd,null);
 assert.equal(inflowWindowSummary([{amount:'2 OINK'}],coverage,86400,now,()=> '3').complete,false);
 assert.equal(inflowWindowSummary([row()],{...coverage,partial:true},86400,now,()=> '3').complete,false);
 assert.equal(inflowWindowSummary([row()],{...coverage,toTimestamp:now-120},86400,now,()=> '3').complete,false);
 assert.equal(inflowWindowSummary([row('2 OINK',now+10)],coverage,86400,now,()=> '3').count,0);
});
test('treasury transfer recipients distinguish treasury wallet from Governor inflows',()=>{
 const abi=new Interface(['event Transfer(address indexed from,address indexed to,uint256 value)']);
 const from='0x1111111111111111111111111111111111111111';
 for(const to of [TREASURY_WALLET,CORE_CONTRACTS.find(row=>row.id==='governor').address]) {
  const log={...abi.encodeEventLog(abi.getEvent('Transfer'),[from,to,10n**18n]),address:OINK_TOKEN,transactionHash:'0x'+'11'.repeat(32),blockNumber:'0x1',logIndex:'0x0'};
  assert.equal(decodeActivity(log).recipient.toLowerCase(),to.toLowerCase());
 }
});
