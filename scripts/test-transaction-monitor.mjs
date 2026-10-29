import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { checkSavedReceipts } = await import('../src/lib/transactionMonitor.ts');
function fixture() {
  const entry = () => ({state:'pending',hash:'0x123',updatedAt:1,review:{request:{type:'miner',module:'offers'}}});
  const state = {position:entry(),protocol:entry(),farm:entry()}, writes=[];
  const deps={farmIds:()=>['pls'],farmSpec:()=>({}),refreshCatalog:async()=>{},protocolAdapter:async()=>({}),
    readPosition:()=>state.position,readProtocol:()=>state.protocol,readFarm:()=>state.farm,
    writePosition:e=>{state.position=e;writes.push('position')},writeProtocol:e=>{state.protocol=e;writes.push('protocol')},writeFarm:e=>{state.farm=e;writes.push('farm')},
    verifyPosition:async()=>({state:'confirmed'}),verifyProtocol:async()=>({state:'confirmed'}),verifyFarm:async()=>({state:'confirmed'})};
  return {state,writes,deps};
}
test('background receipts confirm all three journals without requesting a wallet transaction',async()=>{
  const f=fixture();const result=await checkSavedReceipts('account',{},()=>true,f.deps);
  assert.deepEqual(result,{positions:true,protocol:true,farms:true});assert.deepEqual(f.writes,['position','protocol','farm']);
});
test('pending and no-hash uncertain requests remain protected',async()=>{
  const f=fixture();f.state.position={...f.state.position,state:'uncertain',hash:undefined};
  f.deps.verifyPosition=async()=>{throw Error('must not verify without hash')};
  f.deps.verifyProtocol=f.deps.verifyFarm=async()=>({state:'pending'});
  await checkSavedReceipts('account',{},()=>true,f.deps);assert.deepEqual(f.writes,[]);assert.equal(f.state.position.state,'uncertain');
});
test('receipt failures do not prevent other journals from confirming',async()=>{
  const f=fixture();f.deps.verifyPosition=async()=>{throw Error('RPC offline')};
  await checkSavedReceipts('account',{},()=>true,f.deps);assert.deepEqual(f.writes,['protocol','farm']);assert.equal(f.state.position.state,'pending');
});
test('account changes during a read prevent stale writes',async()=>{
  const f=fixture();let active=true;f.deps.verifyPosition=async()=>{active=false;return {state:'confirmed'}};
  await checkSavedReceipts('account',{},()=>active,f.deps);assert.deepEqual(f.writes,[]);
});
test('a replaced journal is never overwritten by an old receipt',async()=>{
  const f=fixture();f.deps.verifyPosition=async()=>{f.state.position={...f.state.position,hash:'0x456'};return {state:'confirmed'}};
  await checkSavedReceipts('account',{},()=>true,f.deps);assert.equal(f.state.position.hash,'0x456');assert.ok(!f.writes.includes('position'));
});
test('verified reverted receipts resolve pending journals',async()=>{
  const f=fixture();f.deps.verifyPosition=f.deps.verifyProtocol=f.deps.verifyFarm=async()=>({state:'failed'});
  await checkSavedReceipts('account',{},()=>true,f.deps);assert.equal(f.state.position.state,'failed');assert.equal(f.state.protocol.state,'failed');assert.equal(f.state.farm.state,'failed');
});
test('multiple submitted actions are monitored independently after a reload',async()=>{
 const f=fixture(),rows=[{...f.state.position,hash:'first',review:{request:{type:'miner',id:'one-month'}}},{...f.state.position,hash:'second',review:{request:{type:'miner',id:'one-year'}}}];
 f.deps.listPositions=()=>rows;
 f.deps.readPosition=(_account,_storage,request)=>request?rows.find(row=>row.review.request.id===request.id):rows[0];
 const settled=[];f.deps.writePosition=entry=>settled.push(entry.hash);
 await checkSavedReceipts('account',{},()=>true,f.deps);assert.deepEqual(settled,['first','second']);
});
