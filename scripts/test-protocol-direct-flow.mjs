import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {submitProtocolDirect}=await import('../src/lib/protocolDirectFlow.ts');
const account='0x'+'11'.repeat(20),hash='0x'+'aa'.repeat(32),request={module:'test',action:'act',args:{amount:'1'}};
function fixture(options={}){
  const order=[],writes=[],stages=[];let active=true,sends=0;
  const review={request,quote:{account}};
  const deps={
    async withLock(_account,run){order.push('lock');if(options.lockError)throw Error('Other request owns the lock');if(options.changeAtLock)active=false;return run();},
    assertNoPendingProtocol(){order.push('clear-position');if(options.blocked)throw Error('Unresolved request');},
    assertNoPendingFarm(){order.push('clear-farm');},
    async prepare(){order.push('prepare');if(options.changeAtPrepare)active=false;if(options.prepareError)throw Error('Simulation rejected');return review;},
    write(entry){order.push('write-'+entry.state);if(options.failWrite?.(entry,writes.length))throw Error('Storage failed');writes.push(structuredClone(entry));},
    async send(_review,_adapter,_rpc,_provider,current,onWallet){sends++;order.push('revalidate');if(options.sendError)throw options.sendError;if(!current())throw Object.assign(Error('Changed'),{walletRequestStarted:false});onWallet?.();order.push('wallet');if(options.changeAfterWallet)active=false;return options.hash??hash;},
  };
  const args={account,request,adapter:{},provider:{},rpc:{},current:()=>active,onStage(stage,text){if(options.throwObserver)throw Error('Observer');stages.push([stage,text]);}};
  return {args,deps,order,writes,stages,get sends(){return sends;},stop(){active=false;},run(){return submitProtocolDirect(args,deps);}};
}
test('direct protocol action checks and persists before opening the wallet',async()=>{
  const f=fixture(),out=await f.run();assert.equal(out.state,'pending');assert.equal(out.hash,hash);assert.equal(f.sends,1);
  assert.ok(f.order.indexOf('write-requesting')<f.order.indexOf('wallet'));assert.deepEqual(f.stages.map(x=>x[0]),['checking','wallet','pending']);
});
test('a disabled or changed action before the click cannot prepare or open a wallet',async()=>{
  const f=fixture();f.stop();await assert.rejects(f.run(),/changed/);assert.equal(f.sends,0);assert.equal(f.writes.length,0);assert.equal(f.order.length,0);
});
for(const point of ['changeAtLock','changeAtPrepare'])test('identity invalidation '+point+' stops before the wallet request',async()=>{
  const f=fixture({[point]:true});await assert.rejects(f.run(),/changed/);assert.equal(f.sends,0);assert.equal(f.writes.length,0);
});
for(const opts of [{blocked:true},{prepareError:true},{lockError:true}])test('unavailable state blocks without any wallet request '+JSON.stringify(opts),async()=>{
  const f=fixture(opts);await assert.rejects(f.run());assert.equal(f.sends,0);assert.equal(f.writes.length,0);
});
test('requesting journal must be durable before wallet opening',async()=>{
  const f=fixture({failWrite:entry=>entry.state==='requesting'});await assert.rejects(f.run(),/Storage/);assert.equal(f.sends,0);
});
for(const details of [{walletRequestStarted:false},{code:4001}])test('pre-wallet failure or user rejection resolves without retry '+JSON.stringify(details),async()=>{
  const f=fixture({sendError:Object.assign(Error('Stopped'),details)}),out=await f.run();assert.equal(out.state,'resolved');assert.equal(f.sends,1);assert.equal(out.hash,null);
});
test('unknown wallet outcomes remain blocked and are never retried',async()=>{
  const f=fixture({sendError:Error('Connection lost')}),out=await f.run();assert.equal(out.state,'uncertain');assert.equal(f.sends,1);assert.equal(f.writes.at(-1).state,'uncertain');
});
test('a hash is saved even if the component changes after wallet opening',async()=>{
  const f=fixture({changeAfterWallet:true}),out=await f.run();assert.equal(out.state,'pending');assert.equal(f.writes.at(-1).hash,hash);
});
test('post-wallet storage failure retains the returned hash in an uncertain record',async()=>{
  const f=fixture({failWrite:entry=>entry.state==='pending'}),out=await f.run();assert.equal(out.state,'uncertain');assert.equal(out.hash,hash);assert.equal(f.sends,1);
});
test('unrecoverable storage failure reports the returned hash',async()=>{
  const f=fixture({failWrite:entry=>entry.state!=='requesting'});await assert.rejects(f.run(),error=>error.hash===hash&&error.walletRequestStarted===true);assert.equal(f.sends,1);
});
test('invalid wallet responses stay uncertain',async()=>{
  const f=fixture({hash:'invalid'}),out=await f.run();assert.equal(out.state,'uncertain');assert.equal(f.sends,1);
});
test('display observers cannot change transaction persistence',async()=>{
  const f=fixture({throwObserver:true}),out=await f.run();assert.equal(out.state,'pending');assert.equal(f.writes.at(-1).hash,hash);
});
test('concurrent action clicks share an exclusive wallet lock',async()=>{
  const f=fixture();let held=false,release;const wait=new Promise(resolve=>{release=resolve;});
  f.deps.withLock=async(_account,run)=>{if(held)throw Error('Another request owns the lock');held=true;try{await wait;return await run();}finally{held=false;}};
  const first=f.run();await assert.rejects(f.run(),/lock/);release();await first;assert.equal(f.sends,1);
});
