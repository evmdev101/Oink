import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseEther,formatEther} from 'ethers';
import ts from 'typescript';
import {cumulativeHistory} from '../src/lib/portfolioHistoryModel.ts';

// Exercise the real component's effects and JSX with deferred public reads.
// No wallet, browser state or network is involved in this regression suite.
const source=await readFile(new URL('../src/components/PortfolioHistoryPanel.tsx',import.meta.url),'utf8');
const account='0x1111111111111111111111111111111111111111';
const other='0x2222222222222222222222222222222222222222';
let sequence=0;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const activity=(amount='10.0',index=0)=>({key:'event:'+index,hash:'0x'+'a'.repeat(64),block:100+index,index,timestamp:1700000000+index,source:'1 month',sourceId:'one-month',category:'miners',label:'Created miner',amount,symbol:'OINK',deposited:amount,withdrawn:'0',harvested:'0',penalty:'0'});
const history=(owner=account,rows=[activity()],extra={})=>({account:owner,rows,failed:0,capped:0,loadedAt:Date.now(),sources:22,toBlock:200,blockHash:'0x'+'b'.repeat(64),loading:false,...extra});

async function panel(initial={}){
  const slots=[],effects=[],timers=new Map(),events=new Map(),pending=[];
  const cache=new Map();
  let cursor=0,dirty=true,tree,timer=0,cacheGets=0,peekReads=0;
  const props={account,revision:1,oinkPrice:'0',shellPending:false,...initial};
  const bindings={
    useState(initialValue){const i=cursor++;if(!(i in slots))slots[i]=typeof initialValue==='function'?initialValue():initialValue;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;dirty=true;}];},
    useRef(initialValue){const i=cursor++;if(!(i in slots))slots[i]={current:initialValue};return slots[i];},
    useEffect(effect,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((value,j)=>!Object.is(value,previous.deps[j]))){slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect();});}},
    jsx:(type,elementProps)=>({type,props:elementProps}),jsxs:(type,elementProps)=>({type,props:elementProps}),
    createViewSnapshotCache:()=>({get:key=>{cacheGets++;return cache.get(key)??null;},set:(key,value)=>cache.set(key,value)}),
    peekPortfolioHistory:()=>{peekReads++;return initial.retained??null;},
    readPortfolioHistory:(owner,signal,progress)=>{const request={...deferred(),account:owner,signal,progress};pending.push(request);return request.promise;},
    cumulativeHistory,
    displayFarmAmount:value=>value,
    sumFarmAmounts:values=>formatEther(values.reduce((total,value)=>total+parseEther(value),0n)),
    portfolioMarketValue:()=>null,displayRankValue:value=>String(value),
    HistoryChart:function HistoryChart(){},InfoTooltip:function InfoTooltip(){},
    useDeferredDisplayRead:()=>({sectionRef:{current:null},readReady:props.readReady??true}),
  };
  const names={
    react:['useState','useRef','useEffect'],'react/jsx-runtime':['jsx','jsxs','Fragment'],
    '../lib/viewSnapshotCache':['createViewSnapshotCache'],
    './PortfolioHistoryChart':['HistoryChart'],
    '../lib/portfolioHistory':['readPortfolioHistory','peekPortfolioHistory'],
    '../lib/portfolioHistoryModel':['cumulativeHistory'],
    '../lib/farmDisplay':['displayFarmAmount','sumFarmAmounts'],
    '../lib/portfolioValuation':['portfolioMarketValue'],
    '../lib/farmRankings':['displayRankValue'],'./InfoTooltip':['InfoTooltip'],
    './useDeferredDisplayRead':['useDeferredDisplayRead'],
  };
  const globalKey=`__portfolioHistoryLoading${sequence++}`,previousWindow=globalThis.window;
  globalThis.window={
    setTimeout:(callback,delay)=>{const id=++timer;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    addEventListener:(name,callback)=>events.set(name,callback),removeEventListener:(name,callback)=>{if(events.get(name)===callback)events.delete(name);},
  };
  globalThis[globalKey]=bindings;
  const data=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  let compiled=ts.transpileModule(source+'\nexport {PortfolioHistoryContent};',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  compiled=compiled.replace(/import\s+([^;]+?)\s+from\s+["']([^"']+)["'];?/g,(_,spec,path)=>{
    assert.ok(names[path],`Missing test binding: ${path}`);
    const exports=names[path].map(name=>`export const ${name}=e.${name};`).join('');
    return `import ${spec} from ${JSON.stringify(data(`const e=globalThis[${JSON.stringify(globalKey)}];${exports}`))};`;
  });
  const {PortfolioHistoryContent}=await import(data(compiled));
  const render=()=>{let rounds=0;while(dirty){assert.ok(rounds++<20,'History effects settled');dirty=false;cursor=0;tree=PortfolioHistoryContent(props);while(effects.length)effects.shift()();}return tree;};
  const nodes=()=>{const result=[];const walk=node=>{if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;result.push(node);walk(node.props?.children);};walk(tree);return result;};
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):node==null||typeof node==='boolean'?'':String(node);
  const find=predicate=>{render();const node=nodes().find(predicate);assert.ok(node,'Expected history UI element');return node;};
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
  render();
  return {
    pending,props,render,flush,find,text,
    assertNoRefreshUi(){render();assert.equal(nodes().some(node=>node.type==='button'&&text(node)==='Refresh latest'),false);assert.equal(nodes().some(node=>/\bportfolio-history-(status|freshness|checked)\b/.test(node.props?.className??'')),false);},
    summary:()=>find(node=>node.type==='section'&&node.props.className==='professional-card overview-section portfolio-history-summary'),
    charts:()=>{render();return nodes().filter(node=>node.type===bindings.HistoryChart);},
    counts:()=>({reads:pending.length,cacheGets,peekReads}),
    update(next){Object.assign(props,next);dirty=true;render();},
    autoRefresh(){const entry=[...timers].find(([,task])=>task.delay===60000);assert.ok(entry,'A background refresh is scheduled');timers.delete(entry[0]);entry[1].callback();render();},
    positionsChanged(){const changed=events.get('oink-positions-changed');assert.ok(changed);changed();render();},
    hasRetry:()=>[...timers.values()].some(task=>task.delay===10000),
    dispose(){for(const slot of slots)slot?.cleanup?.();globalThis.window=previousWindow;delete globalThis[globalKey];},
  };
}

test('history keeps its layout and cached charts while background work waits for visible balances',async()=>{
  const p=await panel({readReady:false,retained:history()});
  try{
    assert.equal(p.pending.length,0);
    assert.equal(p.charts().length,2);
    assert.ok(p.summary().props.ref);
    p.update({readReady:true});
    assert.equal(p.pending.length,1);
    assert.equal(p.charts().length,2);
    p.pending[0].resolve(history());await p.flush();
  }finally{p.dispose();}
});

test('partial public records show totals and charts before the full history read settles',async()=>{
  const p=await panel();
  try{
    assert.equal(p.pending.length,1);assert.equal(p.charts().length,0);
    p.assertNoRefreshUi();
    assert.equal(p.summary().props['aria-busy'],true);
    p.pending[0].progress(history(account,[activity()],{failed:1,loading:true}));p.render();
    assert.equal(p.summary().props['aria-busy'],true,'The remaining read is still pending');
    assert.match(p.text(p.summary()),/OINK deposited10\.0 OINK/);
    assert.equal(p.charts().length,2,'Both history panels can render loaded records');
    assert.equal(p.charts()[0].props.series[0].points[0].value,parseEther('10').toString());
    p.assertNoRefreshUi();
    p.pending[0].resolve(history());await p.flush();
    assert.equal(p.summary().props['aria-busy'],false);p.assertNoRefreshUi();
  }finally{p.dispose();}
});

test('retained charts remain visible through a background refresh and a failed refresh',async()=>{
  const p=await panel({retained:history()});
  try{
    assert.equal(p.charts().length,2);assert.equal(p.summary().props['aria-busy'],true);
    p.pending[0].resolve(history());await p.flush();
    p.autoRefresh();assert.equal(p.pending.length,2);
    assert.equal(p.charts().length,2);assert.match(p.text(p.summary()),/OINK deposited10\.0 OINK/);
    p.pending[1].reject(Error('Service temporarily unavailable'));await p.flush();
    assert.equal(p.charts().length,2);assert.match(p.text(p.summary()),/OINK deposited10\.0 OINK/);
    assert.equal(p.summary().props['aria-busy'],false);
    assert.equal(p.hasRetry(),true,'A failed refresh still retries automatically');
    p.positionsChanged();assert.equal(p.pending.length,3);assert.equal(p.charts().length,2);
    p.assertNoRefreshUi();
  }finally{p.dispose();}
});

test('late progress and completion for a previous account cannot overwrite the active account',async()=>{
  const p=await panel();
  try{
    p.pending[0].progress(history(account,[activity()]));p.render();assert.equal(p.charts().length,2);
    p.update({account:other,revision:2});assert.equal(p.pending.length,2);
    assert.equal(p.pending[0].signal.aborted,true);assert.equal(p.charts().length,0);
    p.pending[0].progress(history(account,[activity('999.0')]));
    p.pending[0].resolve(history(account,[activity('999.0')]));await p.flush();
    assert.equal(p.charts().length,0);assert.doesNotMatch(p.text(p.summary()),/999\.0/);
    p.pending[1].resolve(history(other,[activity('7.0')]));await p.flush();
    assert.match(p.text(p.summary()),/OINK deposited7\.0 OINK/);
    assert.equal(p.charts()[0].props.series[0].points[0].value,parseEther('7').toString());
  }finally{p.dispose();}
});

test('the disconnected history shell performs no private cache lookup or public history read',async()=>{
  const p=await panel({account:null,shellPending:true});
  try{
    assert.deepEqual(p.counts(),{reads:0,cacheGets:0,peekReads:0});assert.equal(p.charts().length,0);
    assert.equal(p.summary().props['aria-busy'],true);
    p.update({shellPending:false});assert.equal(p.summary().props['aria-busy'],false);
    p.assertNoRefreshUi();
    assert.deepEqual(p.counts(),{reads:0,cacheGets:0,peekReads:0});
  }finally{p.dispose();}
});

test('an empty partial read never presents zero totals as a complete empty history',async()=>{
  const p=await panel();
  try{
    p.pending[0].progress(history(account,[],{failed:1,loading:true}));p.render();
    assert.equal(p.charts().length,0);assert.doesNotMatch(p.text(p.summary()),/OINK deposited0\.0/);
    p.pending[0].resolve(history(account,[],{failed:1}));await p.flush();
    assert.equal(p.charts().length,0);assert.match(p.text(p.find(node=>node.type==='div'&&node.props.className==='portfolio-chart-empty')),/Miner history unavailable/);
    p.assertNoRefreshUi();
  }finally{p.dispose();}
});
