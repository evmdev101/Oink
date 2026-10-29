import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNavigationPreloader} from '../src/lib/navigationPreloader.ts';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
function fixture(extra={}){
 let clock=1000,allowed=true,serial=0;const timers=new Map(),calls=[],code=[];
 const instance=createNavigationPreloader({loadCode:async path=>code.push(path),loadData:async(path,account)=>calls.push({path,account}),allowed:()=>allowed,now:()=>clock,setTimer:fn=>{const id=++serial;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id),...extra});
 const fire=async()=>{const jobs=[...timers.values()];timers.clear();for(const job of jobs)job();await settle();};
 return{...instance,fire,calls,code,timers,advance:ms=>clock+=ms,allow:value=>allowed=value};
}
test('passing hover and abandoned focus load code only, never blockchain data',async()=>{
 const f=fixture();f.intent('/farms',null);f.cancel();await f.fire();
 assert.deepEqual(f.code,['/farms']);assert.equal(f.calls.length,0);
 for(let i=0;i<20;i++){f.intent('/farms',null);f.cancel();}
 await f.fire();assert.deepEqual(f.code,['/farms']);assert.equal(f.calls.length,0);
});
test('repeated intent reuses code and respects per-wallet data cooldown',async()=>{
 const f=fixture();f.intent('/farms','0xAbC');await f.fire();
 f.intent('/farms','0xabc');await f.fire();assert.equal(f.calls.length,1);
 f.intent('/farms','0xdef');await f.fire();assert.equal(f.calls.length,2);
 f.advance(20000);f.intent('/farms','0xabc');await f.fire();assert.equal(f.calls.length,3);assert.equal(f.code.length,1);
});
test('speculative reads run one at a time and only the latest queued destination survives',async()=>{
 const pending=deferred(),calls=[];let active=0,peak=0;
 const f=fixture({loadData:async(path)=>{calls.push(path);active++;peak=Math.max(peak,active);if(path==='/farms')await pending.promise;active--;}});
 f.intent('/farms',null);await f.fire();f.intent('/governance',null);await f.fire();f.intent('/portfolio',null);await f.fire();
 assert.deepEqual(calls,['/farms']);pending.resolve();await settle();
 assert.deepEqual(calls,['/farms','/portfolio']);assert.equal(peak,1);
});
test('leaving a link cancels its queued work without aborting an already shared read',async()=>{
 const pending=deferred(),calls=[];
 const f=fixture({loadData:async path=>{calls.push(path);await pending.promise;}});
 f.intent('/farms',null);await f.fire();f.intent('/governance',null);await f.fire();f.cancel();pending.resolve();await settle();
 assert.deepEqual(calls,['/farms']);
});
test('hidden or data-saving pages start neither code nor speculative data',async()=>{
 const f=fixture();f.allow(false);f.intent('/farms',null);await f.fire();assert.deepEqual(f.code,[]);assert.deepEqual(f.calls,[]);
 f.allow(true);f.intent('/mining',null);f.allow(false);await f.fire();assert.deepEqual(f.calls,[]);
});
test('a failed read retries on later intent and invalidation clears the successful cooldown',async()=>{
 let calls=0;const f=fixture({loadData:async()=>{if(++calls===1)throw Error('offline');}});
 f.intent('/farms',null);await f.fire();f.intent('/farms',null);await f.fire();assert.equal(calls,2);
 f.intent('/farms',null);await f.fire();assert.equal(calls,2);
 f.invalidate();f.intent('/farms',null);await f.fire();assert.equal(calls,3);
});
test('failed route chunks are retryable instead of poisoning navigation',async()=>{
 let calls=0;const f=fixture({loadCode:async()=>{if(++calls===1)throw Error('chunk unavailable');}});
 await f.warmCode('/farms');await f.warmCode('/farms');assert.equal(calls,2);
});
