import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {submitPositionDirect}=await import('../src/lib/positionDirectFlow.ts');
const account='0x0000000000000000000000000000000000000011',target='0x0000000000000000000000000000000000000022',hash='0x'+'ab'.repeat(32);
const clone=value=>structuredClone(value);
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function fixture(){
 const request={type:'miner',id:'one-month',action:{kind:'deploy',amount:'1',recipient:account}},quote={title:'Deploy miner',account,block:100,timestamp:Math.floor(Date.now()/1000),facts:[],warnings:[],simulation:'Passed at this snapshot.',source:target,execution:{to:target,data:'0x12345678',fingerprint:'current-terms',minimumOutput:'0',event:'Deposit',shares:'0',recipient:account,amount:'1000'}};
 const review={request:clone(request),quote,transaction:{from:account,to:target,data:'0x12345678',value:'0x0',chainId:'0x171',gas:'0x100'},gasCost:'1',createdAt:Date.now(),blockHash:'0x'+'cd'.repeat(32)};
 let active=true,held=false,stored=null,sends=0;const writes=[],events=[],stages=[];
 const options={account,request,provider:{request(){throw Error('No wallet API is used by this fixture.');}},rpc:{send(){throw Error('No network is used by this fixture.');}},current:()=>active,onStage:(...args)=>stages.push(args)};
 const deps={
  async withLock(owner,run){assert.equal(owner,account);if(held)throw Error('Another wallet request is open.');held=true;events.push('lock');try{return await run();}finally{held=false;events.push('unlock');}},
  assertNoPendingPosition(){events.push('check-position');if(stored&&['requesting','pending','uncertain'].includes(stored.state))throw Error('Previous position request unresolved.');},
  assertNoPendingFarm(){events.push('check-farm');},
  async prepare(_rpc,owner,selected){events.push('prepare');assert.equal(owner,account);assert.deepEqual(selected,review.request);return clone(review);},
  async send(_review,_provider,_rpc,current,onWallet){if(!current())throw Object.assign(Error('Selected action changed'),{walletRequestStarted:false});events.push('send');onWallet?.();sends++;return hash;},
  write(entry){events.push('write:'+entry.state);stored=clone(entry);writes.push(clone(entry));},
 };
 return {options,deps,review,writes,events,stages,close(){active=false;},sends:()=>sends,stored:()=>stored};
}
test('one explicit position action prepares and opens the wallet once under the shared lock with durable journaling',async()=>{
 const f=fixture(),result=await submitPositionDirect(f.options,f.deps);assert.equal(result.state,'pending');assert.equal(result.hash,hash);assert.equal(f.sends(),1);
 assert.deepEqual(f.events,['lock','check-position','prepare','check-position','write:requesting','send','write:pending','unlock']);assert.deepEqual(f.stages.map(([stage])=>stage),['checking','wallet','pending']);
 await assert.rejects(submitPositionDirect(f.options,f.deps),/unresolved/);assert.equal(f.sends(),1);
});
for(const change of ['wallet change','request generation change','disabled prop change','unmount'])test(change+' during preparation cancels before journaling or a wallet request',async()=>{
 const f=fixture(),wait=deferred();f.deps.prepare=async()=>{await wait.promise;return f.review;};const task=submitPositionDirect(f.options,f.deps);f.close();wait.resolve();await assert.rejects(task,/action or wallet changed/);assert.equal(f.sends(),0);assert.deepEqual(f.writes,[]);
});
test('a selection invalidated before its shared lock is acquired never prepares or sends',async()=>{
 const f=fixture(),wait=deferred(),lock=f.deps.withLock;f.deps.withLock=async(...args)=>{await wait.promise;return lock(...args);};const task=submitPositionDirect(f.options,f.deps);f.close();wait.resolve();await assert.rejects(task,/changed/);assert(!f.events.includes('prepare'));assert.equal(f.sends(),0);
});
test('request fields are captured at click time rather than read from mutable props after an await',async()=>{
 const f=fixture(),wait=deferred(),lock=f.deps.withLock;f.deps.withLock=async(...args)=>{await wait.promise;return lock(...args);};const task=submitPositionDirect(f.options,f.deps);f.options.request.action.amount='999';wait.resolve();assert.equal((await task).review.request.action.amount,'1');
});
test('simultaneous duplicate clicks cannot start a second preparation or wallet request',async()=>{
 const f=fixture(),wait=deferred(),started=deferred(),prepare=f.deps.prepare;f.deps.prepare=async(...args)=>{started.resolve();await wait.promise;return prepare(...args);};const task=submitPositionDirect(f.options,f.deps);await started.promise;await assert.rejects(submitPositionDirect(f.options,f.deps),/Another wallet request/);wait.resolve();await task;assert.equal(f.sends(),1);assert.equal(f.events.filter(e=>e==='prepare').length,1);
});
test('a request appearing while preparation runs is checked again before the wallet opens',async()=>{
 const f=fixture();let checks=0;f.deps.assertNoPendingPosition=()=>{if(++checks===2)throw Error('This miner action became pending.');};await assert.rejects(submitPositionDirect(f.options,f.deps),/became pending/);assert.equal(f.sends(),0);assert.deepEqual(f.writes,[]);
});
test('failed preparation or a blocked earlier journal never opens the wallet',async()=>{
 for(const phase of ['prepare','assertNoPendingPosition']){const f=fixture();f.deps[phase]=()=>{throw Error('Blocked by '+phase);};await assert.rejects(submitPositionDirect(f.options,f.deps),/Blocked/);assert.equal(f.sends(),0);assert.deepEqual(f.writes,[]);}
});
test('failure to persist requesting prevents any send',async()=>{
 const f=fixture();f.deps.write=()=>{throw Error('Storage unavailable');};await assert.rejects(submitPositionDirect(f.options,f.deps),/Storage unavailable/);assert.equal(f.sends(),0);
});
test('closing while the wallet prompt is open preserves the eventual hash and blocks remount duplicates',async()=>{
 const f=fixture(),started=deferred(),wait=deferred();let sends=0;f.deps.send=async(_review,_provider,_rpc,_current,onWallet)=>{onWallet();started.resolve();sends++;await wait.promise;return hash;};const task=submitPositionDirect(f.options,f.deps);await started.promise;f.close();await assert.rejects(submitPositionDirect({...f.options,current:()=>true,onStage(){}},f.deps),/Another wallet request/);wait.resolve();assert.equal((await task).hash,hash);assert.equal(f.stored().state,'pending');assert.equal(sends,1);assert.deepEqual(f.stages.map(([stage])=>stage),['checking','wallet']);
});
for(const [name,details,state]of [['wallet rejection',{code:4001,walletRequestStarted:true},'resolved'],['fresh preflight failure',{walletRequestStarted:false},'resolved'],['unknown wallet failure',{walletRequestStarted:true},'uncertain'],['unclassified failure',{},'uncertain']])test(name+' is journaled without automatic retries',async()=>{
 const f=fixture();let sends=0;f.deps.send=async()=>{sends++;throw Object.assign(Error(name),details);};const result=await submitPositionDirect(f.options,f.deps);assert.equal(result.state,state);assert.equal(sends,1);assert.equal(f.stored().state,state);assert.match(result.message,/No automatic retry|No transaction was requested/);
});
test('a pending persistence failure retains the returned transaction hash in an uncertain journal',async()=>{
 const f=fixture(),write=f.deps.write;f.deps.write=entry=>{if(entry.state==='pending')throw Error('Pending save failed');write(entry);};const result=await submitPositionDirect(f.options,f.deps);assert.equal(result.state,'uncertain');assert.equal(result.hash,hash);assert.equal(f.stored().hash,hash);assert.equal(f.sends(),1);
});
test('persistent failure after wallet send exposes the hash for recovery without sending again',async()=>{
 const f=fixture(),write=f.deps.write;f.deps.write=entry=>{if(entry.state!=='requesting')throw Error('Storage lost');write(entry);};await assert.rejects(submitPositionDirect(f.options,f.deps),error=>error.hash===hash&&error.journal.hash===hash&&error.walletRequestStarted===true);assert.equal(f.sends(),1);
});
test('malformed wallet hashes remain uncertain and observer errors cannot change persistence',async()=>{
 const f=fixture();f.deps.send=async()=> 'not-a-hash';const result=await submitPositionDirect(f.options,f.deps);assert.equal(result.state,'uncertain');assert.equal(result.hash,null);
 const g=fixture();g.options.onStage=()=>{throw Error('Rendering failed');};assert.equal((await submitPositionDirect(g.options,g.deps)).state,'pending');assert.equal(g.stored().hash,hash);
});
