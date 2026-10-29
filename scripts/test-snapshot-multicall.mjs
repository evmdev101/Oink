import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Interface } from 'ethers';
import { snapshotRunner } from '../src/lib/governanceReadSafety.ts';
import { multicallInterface, MULTICALL_ADDRESS } from '../src/lib/snapshotMulticall.ts';

const runtime = JSON.parse(await readFile(new URL('./fixtures/multicall3-runtime.json', import.meta.url))).result;
const abi = new Interface(['function balanceOf(address) view returns(uint256)']);
const target = '0x0000000000000000000000000000000000000001';
const tx = index => ({to:target,data:abi.encodeFunctionData('balanceOf',['0x'+BigInt(index+1).toString(16).padStart(40,'0')])});
function fixture({code=runtime,fail=false,revert=-1}={}) {
  const calls=[];
  const provider={snapshotBatching:true,getCode:async (_address,block) => {assert.equal(block,123);return code;},call:async request => {
    calls.push(request); assert.equal(request.blockTag,123);
    if(request.to===MULTICALL_ADDRESS) {
      if(fail)throw Error('batch too large');
      const [items]=multicallInterface.decodeFunctionData('aggregate3',request.data);
      return multicallInterface.encodeFunctionResult('aggregate3',[items.map((item,index)=>[index!==revert,index===revert?'0xdeadbeef':abi.encodeFunctionResult('balanceOf',[BigInt(abi.decodeFunctionData('balanceOf',item.callData)[0])])])]);
    }
    return abi.encodeFunctionResult('balanceOf',[BigInt(abi.decodeFunctionData('balanceOf',request.data)[0])]);
  }};
  return {provider,calls};
}

test('100 display getters use three bounded calls, preserve ordering and pin the block',async()=>{
  const {provider,calls}=fixture();const runner=snapshotRunner(provider,123);
  const values=await Promise.all(Array.from({length:100},(_,i)=>runner.call({...tx(i),blockTag:'latest'})));
  assert.deepEqual(values.map(value=>abi.decodeFunctionResult('balanceOf',value)[0]),Array.from({length:100},(_,i)=>BigInt(i+1)));
  assert.equal(calls.length,3);
});
test('same-block duplicate getters share a result; another snapshot reads again',async()=>{
  const {provider,calls}=fixture();const runner=snapshotRunner(provider,123);
  await Promise.all([runner.call(tx(0)),runner.call(tx(0))]);await runner.call(tx(0));
  assert.equal(calls.length,1);
  await snapshotRunner(provider,123).call(tx(0));assert.equal(calls.length,2);
});
test('explicit caller/value overrides bypass aggregation',async()=>{
  const {provider,calls}=fixture();const runner=snapshotRunner(provider,123);
  await runner.call({...tx(0),from:target});await runner.call({...tx(0),value:0n});
  assert.equal(calls.length,2);assert.ok(calls.every(call=>call.to===target));assert.equal(calls[0].from,target);
});
test('unverified runtime and unsupported batching fall back to pinned individual calls',async()=>{
  for(const config of [{code:'0x6000'},{fail:true}]){
    const {provider,calls}=fixture(config);const runner=snapshotRunner(provider,123);
    await Promise.all([runner.call(tx(0)),runner.call(tx(1))]);
    assert.equal(calls.filter(call=>call.to===target).length,2);
  }
});
test('one getter revert cannot turn into a successful or empty value',async()=>{
  const {provider,calls}=fixture({revert:0});const runner=snapshotRunner(provider,123);
  const result=await Promise.allSettled([runner.call(tx(0)),runner.call(tx(1))]);
  assert.equal(result[0].status,'rejected');assert.equal(result[0].reason.code,'CALL_EXCEPTION');assert.equal(result[0].reason.data,'0xdeadbeef');
  assert.equal(result[1].status,'fulfilled');assert.equal(calls.length,1);
});
test('aborted snapshots do not issue queued reads',async()=>{
  const {provider,calls}=fixture();const controller=new AbortController();const runner=snapshotRunner(provider,123,controller.signal);
  const pending=runner.call(tx(0));controller.abort();await assert.rejects(pending);assert.equal(calls.length,0);
});
