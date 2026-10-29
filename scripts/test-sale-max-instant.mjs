import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

// Run the actual form with deferred reads. A click must finish before any read
// settles, and changing selectors must choose the already-loaded matching quote.
const source=await readFile(new URL('../src/components/MiningOffers.tsx',import.meta.url),'utf8');
let sequence=0;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const pairs=['wallet','one-year','three-year','five-year'];
const assets=['PLS','PLSX','INC','HEX'];
const account='0x1111111111111111111111111111111111111111';

async function form(initial={}){
  const slots=[],effects=[],timers=new Map(),events=new Map();
  let cursor=0,dirty=true,tree,timer=0,maximumReads=0,quoteReads=0;
  const pending=[];
  const state={account,chainId:369n,revision:1,...initial};
  const key=(asset,duration)=>JSON.stringify([asset,duration]);
  const maxima=(owner=account)=>Object.fromEntries(assets.flatMap((asset,i)=>pairs.map((duration,j)=>[key(asset,duration),{
    account:owner,timestamp:Math.floor(Date.now()/1000),maxReceive:`${1000+i*100+j}.123`,quote:`${1000+i*100+j}.123`,
    baseQuote:'900',bonusQuote:'100',paymentAmount:`${i+1}.25`,quoteFunded:true,balanceEnough:true,quoteError:'',allowance:'0',inventory:'20000',inputMode:'receive'
  }])));
  const bindings={
    useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;dirty=true;}];},
    useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];},
    useEffect(effect,deps){const i=cursor++;const previous=slots[i];if(!previous||deps.some((value,j)=>!Object.is(value,previous.deps[j]))){slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect();});}},
    jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props}),
    useWallet:()=>state,
    saleDisplayKey:(asset,amount,duration,owner)=>JSON.stringify([asset,amount,duration,owner]),
    peekSaleDisplay:()=>null,
    readSaleDisplay:()=>{quoteReads++;return new Promise(()=>{});},
    peekSaleMaximums:()=>null,
    clearSaleMaximums:()=>{},saleMaximumKey:key,
    readSaleMaximums:(_account,_signal,ready)=>{maximumReads++;const read={...deferred(),ready};pending.push(read);return read.promise;},
    snapshotIsStale:(timestamp,now)=>now-timestamp*1000>=120000,
    displayFarmAmount:value=>value,
    parseFarmDepositAmount:value=>{if(!/^\d+(\.\d+)?$/.test(value)||Number(value)<=0)throw Error('Invalid');return 1n;},
    CHAIN_ID:369n,SALE_DESTINATIONS:pairs.map(id=>({id,label:id})),TIME_MINER_CONTRACTS:[],
    usePageLoadStatus:()=>{},
    SaleEstimate:function SaleEstimate(){},ProtocolAction:function ProtocolAction(){},InfoTooltip:function InfoTooltip(){},offerAdapter:{},
  };
  const names={
    react:['useState','useRef','useEffect'],'react/jsx-runtime':['jsx','jsxs','Fragment'],
    './WalletProvider':['useWallet'],
    '../lib/miningOfferDisplayReads':['readSaleDisplay','peekSaleDisplay','saleDisplayKey','readReferralDisplay','peekReferralDisplay'],
    '../lib/saleMaximumDisplay':['clearSaleMaximums','peekSaleMaximums','readSaleMaximums','saleMaximumKey'],
    '../lib/governanceReadSafety':['snapshotIsStale'],
    '../lib/farmDisplay':['displayFarmAmount'],
    '../lib/miningOffers':['SALE_DESTINATIONS','referralLink'],
    '../lib/offerTransactions':['offerAdapter'],'../lib/farmTransactions':['parseFarmDepositAmount'],
    './ProtocolAction':['ProtocolAction'],'./SaleEstimate':['SaleEstimate'],
    '../config/contracts':['TIME_MINER_CONTRACTS'],'./PageLoadBoundary':['usePageLoadStatus'],
    '../lib/chain':['CHAIN_ID'],'./InfoTooltip':['InfoTooltip'],
  };
  const globalKey=`__instantMaxForm${sequence++}`;
  const previousWindow=globalThis.window;
  globalThis.window={
    setInterval:()=>++timer,clearInterval:()=>{},
    setTimeout:(callback,delay)=>{const id=++timer;timers.set(id,{callback,delay});return id;},clearTimeout:id=>timers.delete(id),
    addEventListener:(name,callback)=>events.set(name,callback),removeEventListener:(name,callback)=>{if(events.get(name)===callback)events.delete(name);},
  };
  globalThis[globalKey]=bindings;
  const data=code=>`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  let compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  compiled=compiled.replace(/import\s+([^;]+?)\s+from\s+["']([^"']+)["'];?/g,(_,spec,path)=>{
    assert.ok(names[path],`Missing test binding: ${path}`);
    const exports=names[path].map(name=>`export const ${name}=e.${name};`).join('');
    return `import ${spec} from ${JSON.stringify(data(`const e=globalThis[${JSON.stringify(globalKey)}];${exports}`))};`;
  }).replace(/import\s+["'][^"']+\.css["'];?/g,'');
  const {OinkSale}=await import(data(compiled));
  const render=()=>{let rounds=0;while(dirty){assert.ok(rounds++<20,'Form effects settled');dirty=false;cursor=0;tree=OinkSale();while(effects.length)effects.shift()();}return tree;};
  const nodes=()=>{const result=[];const walk=node=>{if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;result.push(node);walk(node.props?.children);};walk(tree);return result;};
  const find=(predicate)=>{render();const node=nodes().find(predicate);assert.ok(node,'Expected form control');return node;};
  const click=()=>find(node=>node.type==='button'&&node.props.children==='Max').props.onClick();
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
  render();
  return {
    state,maxima,pending,render,find,click,flush,events,
    reads:()=>({maximumReads,quoteReads}),
    input:()=>find(node=>node.type==='input'&&node.props.id==='sale-oink-amount'),
    max:()=>find(node=>node.type==='button'&&node.props.children==='Max'),
    estimate:()=>find(node=>node.type===bindings.SaleEstimate),
    buy:()=>find(node=>node.type===bindings.ProtocolAction&&node.props.label==='Buy OINK'),
    select(asset,duration){const selects=nodes().filter(node=>node.type==='select');selects[0].props.onChange({target:{value:asset}});selects[1].props.onChange({target:{value:duration}});render();},
    runBackgroundRefresh(){const task=[...timers.values()].find(row=>row.delay===45000);assert.ok(task);task.callback();},
    dispose(){for(const slot of slots)slot?.cleanup?.();globalThis.window=previousWindow;delete globalThis[globalKey];},
  };
}

test('Max fills input and matching quote immediately for all 16 selections, with no click-time reads',async()=>{
  const f=await form();
  try{
    assert.equal(f.max().props.disabled,true,'First wallet data has to load once');
    f.pending[0].resolve(f.maxima());await f.flush();
    for(const asset of assets)for(const duration of pairs){
      f.select(asset,duration);
      assert.equal(f.max().props.disabled,false);
      const before=f.reads();
      assert.equal(f.click(),undefined,'Click completes synchronously');
      assert.deepEqual(f.reads(),before,'No request is made by the click');
      assert.equal(f.input().props.value,f.maxima()[JSON.stringify([asset,duration])].maxReceive);
      assert.equal(f.estimate().props.data.quote,f.input().props.value);
      assert.equal(f.estimate().props.busy,false,'Matching estimate never enters loading');
    }
  }finally{f.dispose();}
});

test('editing or slow background refresh does not block instant Max or overwrite a newer typed amount',async()=>{
  const f=await form();
  try{
    f.pending[0].resolve(f.maxima());await f.flush();
    f.input().props.onChange({target:{value:'12'}});f.render();
    f.runBackgroundRefresh();
    assert.equal(f.max().props.disabled,false,'Existing maximum is usable during refresh');
    f.click();assert.equal(f.input().props.value,'1003.123');
    f.input().props.onChange({target:{value:'77'}});f.render();
    const values=f.maxima();values[JSON.stringify(['PLS','five-year'])].maxReceive='999';
    f.pending[1].resolve(values);await f.flush();
    assert.equal(f.input().props.value,'77','Background updates never type into the form');
    f.runBackgroundRefresh();f.pending[2].reject(Error('Slow RPC'));await f.flush();
    assert.equal(f.max().props.disabled,false,'A failed refresh retains the previous fresh maximum');
  }finally{f.dispose();}
});

test('one ready token can use Max while other token balances are still loading',async()=>{
  const f=await form();
  try{
    const pair=JSON.stringify(['INC','five-year']);
    f.pending[0].ready({[pair]:f.maxima()[pair]});f.render();
    f.select('INC','five-year');assert.equal(f.max().props.disabled,false);
    const before=f.reads();f.click();assert.equal(f.input().props.value,'1203.123');assert.deepEqual(f.reads(),before);
    f.select('HEX','five-year');assert.equal(f.max().props.disabled,true,'Never substitute a different asset');
  }finally{f.dispose();}
});

test('wallet revision, chain and account changes never use another wallet maximum',async()=>{
  const f=await form();
  try{
    f.pending[0].resolve(f.maxima());await f.flush();assert.equal(f.max().props.disabled,false);
    f.state.revision++;f.state.account='0x2222222222222222222222222222222222222222';
    // Force a normal field render, as the context update would in React.
    f.input().props.onChange({target:{value:'5'}});f.render();
    assert.equal(f.max().props.disabled,true);
    f.pending[1].resolve(f.maxima(f.state.account));await f.flush();assert.equal(f.max().props.disabled,false);
    f.state.chainId=1n;f.input().props.onChange({target:{value:'6'}});f.render();assert.equal(f.max().props.disabled,true);
  }finally{f.dispose();}
});

test('Max selects the entire OINK inventory even when the selected payment balance is zero',async()=>{
  const f=await form();
  try{
    const values=f.maxima();
    for(const value of Object.values(values))Object.assign(value,{maxReceive:'20318.713',quote:'20318.713',inventory:'20318.713',balance:'0.0',balanceEnough:false});
    f.pending[0].resolve(values);await f.flush();
    for(const asset of assets){
      f.select(asset,'five-year');
      assert.equal(f.max().props.disabled,false,'Max is inventory, not wallet purchasing power');
      const before=f.reads();f.click();
      assert.equal(f.input().props.value,'20318.713');
      assert.equal(f.estimate().props.data.paymentAmount,values[JSON.stringify([asset,'five-year'])].paymentAmount);
      assert.equal(f.buy().props.disabled,true,'An unaffordable purchase stays disabled');
      assert.deepEqual(f.reads(),before,'Click does not fetch a balance');
    }
  }finally{f.dispose();}
});

test('Max works without a connected wallet and never enables an unknown-balance purchase',async()=>{
  const f=await form({account:null,chainId:null});
  try{
    assert.equal(f.pending.length,1,'Public inventory starts prefetching without a wallet');
    assert.equal(f.max().props.disabled,true);
    const values=f.maxima(null);
    for(const value of Object.values(values))Object.assign(value,{maxReceive:'20318.713',quote:'20318.713',inventory:'20318.713',balanceEnough:null});
    f.pending[0].resolve(values);await f.flush();
    assert.equal(f.max().props.disabled,false);
    const before=f.reads();assert.equal(f.click(),undefined);
    assert.equal(f.input().props.value,'20318.713');
    assert.equal(f.estimate().props.data.account,null);
    assert.equal(f.buy().props.disabled,true);
    assert.deepEqual(f.reads(),before);
  }finally{f.dispose();}
});

test('unavailable balances do not disable inventory Max and empty inventory does',async()=>{
  const f=await form();
  try{
    const values=f.maxima();
    for(const value of Object.values(values))value.balanceEnough=null;
    f.pending[0].resolve(values);await f.flush();
    assert.equal(f.max().props.disabled,false);
    f.click();assert.equal(f.buy().props.disabled,true);
    f.runBackgroundRefresh();
    const empty=f.maxima();
    for(const value of Object.values(empty))Object.assign(value,{maxReceive:'0.0',quote:null,quoteFunded:false,inventory:'0.0'});
    f.pending[1].resolve(empty);await f.flush();
    assert.equal(f.max().props.disabled,true,'Empty sale cannot offer an inventory maximum');
  }finally{f.dispose();}
});
