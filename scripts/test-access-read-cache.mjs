import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {SharedReadCache} from '../src/lib/sharedReadCache.ts';

// Exercise the real hook against the real display cache, with deferred reads.
// Consumers have independent hook state; no wallet, browser or network is used.
const source=await readFile(new URL('../src/components/useAccessRead.ts',import.meta.url),'utf8');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
let sequence=0;

async function fixture(){
  const cache=new SharedReadCache(),consumers=[],pending=[],events=new Map(),timers=new Map(),cacheReads=[];
  let active=null,timer=0;
  const originalRead=cache.read.bind(cache);
  cache.read=(key,load,options)=>{cacheReads.push({key,...options});return originalRead(key,load,options);};
  const bindings={
    useState(initial){const consumer=active,i=consumer.cursor++;if(!(i in consumer.slots))consumer.slots[i]=typeof initial==='function'?initial():initial;return [consumer.slots[i],value=>{consumer.slots[i]=typeof value==='function'?value(consumer.slots[i]):value;consumer.dirty=true;}];},
    useRef(initial){const consumer=active,i=consumer.cursor++;if(!(i in consumer.slots))consumer.slots[i]={current:initial};return consumer.slots[i];},
    useEffect(effect,deps){const consumer=active,i=consumer.cursor++,previous=consumer.slots[i];if(!previous||deps.some((value,j)=>!Object.is(value,previous.deps[j]))){consumer.slots[i]={deps};consumer.effects.push(()=>{previous?.cleanup?.();consumer.slots[i].cleanup=effect();});}},
    usePageLoadStatus(){},sharedDisplayReads:cache,
    setTimeout(callback,delay){const id=++timer;timers.set(id,{callback,delay});return id;},
    clearTimeout(id){timers.delete(id);},
  };
  const previousWindow=globalThis.window,globalKey=`__accessReadCache${sequence++}`;
  globalThis.window={
    setTimeout:bindings.setTimeout,clearTimeout:bindings.clearTimeout,
    addEventListener(name,callback){if(!events.has(name))events.set(name,new Set());events.get(name).add(callback);},
    removeEventListener(name,callback){events.get(name)?.delete(callback);},
  };
  globalThis[globalKey]=bindings;
  const data=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const names={react:['useState','useRef','useEffect'],'./PageLoadBoundary':['usePageLoadStatus'],'../lib/sharedReadCache':['sharedDisplayReads'],'../lib/sharedReadCache.ts':['sharedDisplayReads']};
  let compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  compiled=compiled.replace(/import\s+([^;]+?)\s+from\s+["']([^"']+)["'];?/g,(_,spec,path)=>{
    assert.ok(names[path],`Missing test binding: ${path}`);
    const exports=names[path].map(name=>`export const ${name}=e.${name};`).join('');
    return `import ${spec} from ${JSON.stringify(data(`const e=globalThis[${JSON.stringify(globalKey)}];${exports}`))};`;
  });
  compiled=`const {setTimeout,clearTimeout}=globalThis[${JSON.stringify(globalKey)}];\n${compiled}`;
  const {useAccessRead}=await import(data(compiled));
  const render=consumer=>{
    let rounds=0;
    while(consumer.mounted&&consumer.dirty){
      assert.ok(rounds++<20,'Access read effects settled');consumer.dirty=false;consumer.cursor=0;active=consumer;
      try{consumer.current=useAccessRead(consumer.key,consumer.load);consumer.renders.push(consumer.current);}finally{active=null;}
      while(consumer.effects.length)consumer.effects.shift()();
    }
    return consumer.current;
  };
  const unmount=consumer=>{if(!consumer.mounted)return;consumer.mounted=false;for(const slot of consumer.slots)slot?.cleanup?.();};
  const mount=(key,load)=>{
    const consumer={key,slots:[],effects:[],renders:[],cursor:0,dirty:true,mounted:true};
    consumer.load=load??(()=>{const request={...deferred(),key:consumer.key};pending.push(request);return request.promise;});
    consumer.state=()=>render(consumer);
    consumer.update=(nextKey,nextLoad)=>{consumer.key=nextKey;if(nextLoad)consumer.load=nextLoad;consumer.dirty=true;return render(consumer);};
    consumer.unmount=()=>unmount(consumer);
    consumers.push(consumer);render(consumer);return consumer;
  };
  return {
    cache,cacheReads,pending,mount,
    async flush(){await new Promise(resolve=>setImmediate(resolve));for(const consumer of consumers)render(consumer);},
    event(name){assert.ok(events.get(name)?.size,`The hook listens for ${name}`);for(const callback of [...events.get(name)])callback();for(const consumer of consumers)render(consumer);},
    autoRefresh(){const entry=[...timers].find(([,task])=>task.delay===60000);assert.ok(entry,'A background refresh is scheduled');timers.delete(entry[0]);entry[1].callback();for(const consumer of consumers)render(consumer);},
    dispose(){for(const consumer of consumers)unmount(consumer);cache.clear();globalThis.window=previousWindow;delete globalThis[globalKey];},
  };
}

test('a warm remount shows the cached value synchronously and reuses a fresh read',async t=>{
  t.mock.timers.enable({apis:['Date'],now:1_000_000});
  const f=await fixture();
  try{
    const first=f.mount('distribution-Alice');await f.flush();assert.equal(f.pending.length,1);
    const value={claimable:'12'};f.pending[0].resolve(value);await f.flush();assert.equal(first.state().data,value);
    first.unmount();
    const returning=f.mount('distribution-Alice');
    assert.equal(returning.renders[0].data,value,'The first render already contains retained data');
    await f.flush();assert.equal(f.pending.length,1,'Returning inside the freshness TTL makes no new request');
    assert.equal(returning.state().data,value);assert.equal(returning.state().busy,false);
    assert.equal(f.cacheReads[0].key,'369:access:distribution-alice');
    assert.equal(f.cacheReads[0].ttl,20000);assert.equal(f.cacheReads[0].timeout,60000);
    t.mock.timers.tick(50000);
    const sharedUpdate={claimable:'13'};
    await f.cache.read('369:access:distribution-alice',async()=>sharedUpdate,{ttl:20000});
    t.mock.timers.tick(10000);
    f.autoRefresh();await f.flush();assert.equal(f.pending.length,1,'An ordinary refresh reuses a fresh result supplied by another reader');
    assert.equal(returning.state().data,sharedUpdate);
  }finally{f.dispose();}
});

test('a stale cached display remains visible while a remount revalidates it',async t=>{
  t.mock.timers.enable({apis:['Date'],now:1_000_000});
  const f=await fixture();
  try{
    const first=f.mount('hex-shares-alice');await f.flush();const value={shares:'7'};
    f.pending[0].resolve(value);await f.flush();first.unmount();
    t.mock.timers.tick(20001);
    const returning=f.mount('hex-shares-alice');assert.equal(returning.renders[0].data,value);
    await f.flush();assert.equal(f.pending.length,2);assert.equal(returning.state().data,value);
    f.pending[1].resolve({shares:'8'});await f.flush();returning.unmount();
    t.mock.timers.tick(120001);
    const expired=f.mount('hex-shares-alice');assert.equal(expired.renders[0].data,null,'Display retention is bounded to two minutes');
  }finally{f.dispose();}
});

test('same-key consumers share pending work even after one consumer unmounts',async()=>{
  const f=await fixture();
  try{
    const first=f.mount('maintenance');const second=f.mount('maintenance');await f.flush();
    assert.equal(f.pending.length,1,'Independent consumers start one underlying read');
    first.unmount();assert.equal(f.cacheReads[0].signal.aborted,true,'The departing subscriber cancels its own observation');
    const value={status:'ready'};f.pending[0].resolve(value);await f.flush();
    assert.equal(second.state().data,value);assert.equal(second.state().error,'');
    assert.equal(f.cache.peek('369:access:maintenance'),value,'Shared work survives and warms the cache');
  }finally{f.dispose();}
});

test('switching account keys hides previous data and ignores its late completion',async()=>{
  const f=await fixture();
  try{
    const consumer=f.mount('distribution-alice');await f.flush();
    const beforeBob=consumer.renders.length;
    consumer.update('distribution-bob');assert.equal(consumer.renders[beforeBob].data,null,'The first render for a new account hides previous data');
    assert.equal(consumer.state().data,null);await f.flush();
    assert.equal(f.pending.length,2);assert.equal(f.cacheReads[0].signal.aborted,true);
    f.pending[0].resolve({owner:'alice',amount:'999'});await f.flush();assert.equal(consumer.state().data,null);
    const bob={owner:'bob',amount:'3'};f.pending[1].resolve(bob);await f.flush();assert.equal(consumer.state().data,bob);
    const beforeCarol=consumer.renders.length;
    consumer.update('distribution-carol');assert.equal(consumer.renders[beforeCarol].data,null,'A completed account value cannot leak into the next first render');
    assert.equal(consumer.state().data,null);
    await f.flush();assert.equal(f.pending.length,3);
  }finally{f.dispose();}
});

test('an explicit refresh invalidates only its key and keeps the last display value',async()=>{
  const f=await fixture();
  try{
    const current=f.mount('claims-alice'),other=f.mount('claims-bob');await f.flush();
    const alice={owner:'alice',amount:'4'},bob={owner:'bob',amount:'6'};
    f.pending.find(request=>request.key==='claims-alice').resolve(alice);f.pending.find(request=>request.key==='claims-bob').resolve(bob);await f.flush();
    current.state().refresh();assert.equal(current.state().data,alice);await f.flush();
    assert.equal(f.pending.length,3,'Manual refresh bypasses a still-fresh result');
    assert.equal(f.cache.peek('369:access:claims-bob'),bob,'Refreshing Alice retains the other key');
    assert.equal(other.state().data,bob);assert.equal(current.state().data,alice);
    const latest={owner:'alice',amount:'5'};f.pending[2].resolve(latest);await f.flush();assert.equal(current.state().data,latest);
  }finally{f.dispose();}
});

for(const event of ['oink-protocol-confirmed','oink-positions-changed']){
  test(`${event} invalidates fresh data and requests the latest value`,async()=>{
    const f=await fixture();
    try{
      const consumer=f.mount('distribution-alice');await f.flush();const previous={claimable:'10'};
      f.pending[0].resolve(previous);await f.flush();
      await f.cache.read('369:access:unrelated',async()=>({retained:true}),{ttl:20000});
      f.event(event);assert.equal(consumer.state().data,previous);await f.flush();
      assert.equal(f.pending.length,2,'A confirmed change bypasses the still-fresh cached read');
      assert.deepEqual(f.cache.peek('369:access:unrelated'),{retained:true},'Hook invalidation is limited to its own key');
      const latest={claimable:'2'};f.pending[1].resolve(latest);await f.flush();assert.equal(consumer.state().data,latest);
    }finally{f.dispose();}
  });
}
