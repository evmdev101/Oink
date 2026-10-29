import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseEther, formatEther } from 'ethers';
import ts from 'typescript';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const { TIME_MINER_CONTRACTS } = await import('../src/config/contracts.ts');
const { rewardRateText, rewardDestinationAmount, rewardDestinationEligibility } = await import('../src/lib/farmRewardDestinations.ts');

// Run the real component's JSX and effects without connecting a wallet or making
// public RPC requests. Deferred reads exercise selection changes during loading.
const source = await readFile(new URL('../src/components/PositionActionPreview.tsx', import.meta.url), 'utf8');
let sequence = 0;
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const rates = { wallet:'50', 'one-month':'100', 'three-month':'300', 'six-month':'500', 'one-year':'1000', 'three-year':'2500', 'five-year':'10000' };
const payout = () => ({ block:100, timestamp:Math.floor(Date.now()/1000), rates:{...rates}, minimums:Object.fromEntries(Object.keys(rates).map(id => [id, id==='wallet'?'0':parseEther('1').toString()])) });

async function preview(initial={}) {
  const slots=[], effects=[], pending=[], rewardReads=[], listeners=new Map(), timers=new Map();
  let cursor=0, dirty=true, tree, timer=0;
  const props={ farmId:'plsx', positions:[{index:0,pending:'1.528'},{index:1,pending:'200'}], kind:'claim', ...initial };
  const wallet={account:'0x'+'11'.repeat(20),chainId:369n,revision:1,provider:{}};
  const dialog={open:false, props:null, show(){this.open=true;}, close(){if(!this.open)return;this.open=false;this.props?.onClose?.();}, contains(){return true;}};
  const jsx=(type,elementProps)=>{if(type==='dialog'&&elementProps.ref){elementProps.ref.current=dialog;dialog.props=elementProps;}return {type,props:elementProps};};
  const bindings={
    useState(value){const i=cursor++;if(!(i in slots))slots[i]=typeof value==='function'?value():value;return [slots[i],next=>{const result=typeof next==='function'?next(slots[i]):next;if(!Object.is(slots[i],result)){slots[i]=result;dirty=true;}}];},
    useRef(value){const i=cursor++;if(!(i in slots))slots[i]={current:value};return slots[i];},
    useEffect(effect,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((value,j)=>!Object.is(value,previous.deps[j]))){slots[i]={deps};effects.push(()=>{previous?.cleanup?.();slots[i].cleanup=effect();});}},
    useSyncExternalStore:()=>0, jsx, jsxs:jsx, createPortal:node=>node,
    useWallet:()=>wallet, getFarmWriteSpec:()=>({id:'plsx'}),farmSpecIdentity:()=> 'same-farm',getFarmCatalogRevision:()=>0,subscribeFarmCatalog:()=>()=>{},
    readFarmRewardDestinations:(farmId,signal)=>{const request={...deferred(),farmId,signal};pending.push(request);return request.promise;},
    readFarmClaimReward:(farmId,account,index,signal)=>{const request={...deferred(),farmId,account,index,signal};rewardReads.push(request);return request.promise;},
    rewardRateText,rewardDestinationAmount,rewardDestinationEligibility,TIME_MINER_CONTRACTS,formatEther,
    displayFarmAmount:value=>value,
    PositionTransaction:function PositionTransaction(){},
  };
  const names={
    react:['useState','useEffect','useRef','useSyncExternalStore'], 'react/jsx-runtime':['jsx','jsxs','Fragment'],
    'react-dom':['createPortal'], './WalletProvider':['useWallet'], './PositionTransaction':['PositionTransaction'],
    '../lib/farmCatalog':['farmSpecIdentity','getFarmCatalogRevision','getFarmWriteSpec','subscribeFarmCatalog'],
    '../config/contracts':['TIME_MINER_CONTRACTS'], '../lib/farmRewardDestinations':['readFarmRewardDestinations','rewardRateText','rewardDestinationAmount','rewardDestinationEligibility'],
    '../lib/farmClaimReward':['readFarmClaimReward'],
    '../lib/farmDisplay':['displayFarmAmount'], ethers:['formatEther'],
  };
  const globalKey='__farmClaimFeedback'+sequence++,previousWindow=globalThis.window,previousDocument=globalThis.document;
  globalThis.window={setInterval:(callback,delay)=>{const id=++timer;timers.set(id,{callback,delay});return id;},clearInterval:id=>timers.delete(id),addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:(name,callback)=>{if(listeners.get(name)===callback)listeners.delete(name);}};
  globalThis.document={body:{},addEventListener:(name,callback)=>listeners.set(name,callback),removeEventListener:(name,callback)=>{if(listeners.get(name)===callback)listeners.delete(name);}};
  globalThis[globalKey]=bindings;
  const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
  let compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  compiled=compiled.replace(/import\s+["'][^"']+\.css["'];?/g,'');
  compiled=compiled.replace(/import\s+([^;]+?)\s+from\s+["']([^"']+)["'];?/g,(_,spec,path)=>{
    assert.ok(names[path],'Missing test binding: '+path);
    const exports=names[path].map(name=>`export const ${name}=e.${name};`).join('');
    return `import ${spec} from ${JSON.stringify(data(`const e=globalThis[${JSON.stringify(globalKey)}];${exports}`))};`;
  });
  const {FarmExitPreview}=await import(data(compiled));
  const render=()=>{let rounds=0;while(dirty){assert.ok(rounds++<20,'Claim effects settle');dirty=false;cursor=0;tree=FarmExitPreview(props);while(effects.length)effects.shift()();}return tree;};
  const nodes=()=>{const result=[];const walk=node=>{if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;result.push(node);walk(node.props?.children);};walk(tree);return result;};
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):node==null||typeof node==='boolean'?'':String(node);
  const find=predicate=>{render();const node=nodes().find(predicate);assert.ok(node,'Expected claim UI node');return node;};
  const select=(suffix,value)=>{find(node=>node.type==='select'&&node.props.id.startsWith('exit-'+suffix+'-')).props.onChange({target:{value}});render();};
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
  render();
  return { props, pending, rewardReads, render, text, find, select, flush,
    open(){find(node=>node.type==='button'&&text(node)===(props.kind==='claim'?'Claim':'Unstake')).props.onClick();render();},
    action:()=>find(node=>node.type===bindings.PositionTransaction),
    eligibility:()=>find(node=>node.props?.className==='farm-claim-eligibility'),
    option:id=>find(node=>node.type==='option'&&node.props.value===id),
    settleReward(gross,at=rewardReads.length-1){const row=rewardReads[at];assert.ok(row,'Expected current reward read');row.resolve({farmId:row.farmId,account:row.account,index:row.index,gross,timestamp:Math.floor(Date.now()/1000)});},
    update(next){Object.assign(props,next);dirty=true;render();},
    dispose(){for(const slot of slots)slot?.cleanup?.();globalThis.window=previousWindow;globalThis.document=previousDocument;delete globalThis[globalKey];},
  };
}

test('claim window shows the minimum shortfall before submission and leaves funded destinations available',async()=>{
  const p=await preview();
  try{
    p.open();assert.equal(p.pending.length,1);
    p.select('destination','one-month');
    assert.equal(p.action().props.disabled,true);
    p.pending[0].resolve(payout());p.settleReward('1.528');await p.flush();
    assert.equal(p.action().props.disabled,true);
    assert.match(p.text(p.eligibility()),/0\.01528 OINK.*at least 1\.0 OINK/);
    assert.equal(p.option('one-month').props.disabled,true);
    assert.equal(p.option('five-year').props.disabled,false);
    p.select('destination','five-year');assert.equal(p.action().props.disabled,false);
  }finally{p.dispose();}
});

test('changing the selected position immediately recalculates eligibility rather than retaining a prior block',async()=>{
  const p=await preview();
  try{
    p.open();p.select('destination','one-month');p.pending[0].resolve(payout());p.settleReward('1.528');await p.flush();
    assert.equal(p.action().props.disabled,true);
    p.select('position','1');
    assert.equal(p.action().props.disabled,true,'Prior position reward must not authorize a different position');
    p.settleReward('200');await p.flush();
    assert.equal(p.action().props.disabled,false);
    assert.equal(p.option('one-month').props.disabled,false);
    p.select('position','0');
    assert.equal(p.action().props.disabled,true);
    p.settleReward('1.528');await p.flush();
    assert.match(p.text(p.eligibility()),/at least 1\.0 OINK/);
  }finally{p.dispose();}
});

test('principal wallet withdrawals and emergency exits remain usable when rewards are zero or unverified',async()=>{
  const p=await preview({kind:'withdraw',positions:[{index:0,pending:'0'}]});
  try{
    p.open();assert.equal(p.action().props.disabled,false,'Wallet principal exit does not require a positive reward');
    p.pending[0].resolve(payout());p.settleReward('0');await p.flush();
    assert.equal(p.action().props.disabled,false);
    p.select('destination','one-month');assert.equal(p.action().props.disabled,true);
    p.find(node=>node.type==='input'&&node.props.type==='checkbox').props.onChange({target:{checked:true}});p.render();
    assert.equal(p.action().props.disabled,false);
    assert.equal(p.action().props.request.kind,'emergency');
    assert.equal(p.action().props.request.destination,'wallet');
  }finally{p.dispose();}
});

test('a low card estimate cannot falsely block a live reward that reaches the destination minimum',async()=>{
  const p=await preview({positions:[{index:0,pending:'1.528'}]});
  try{
    p.open();p.select('destination','one-month');p.pending[0].resolve(payout());await p.flush();
    assert.equal(p.action().props.disabled,true,'Wait for authoritative reward data before authorizing');
    assert.equal(p.option('one-month').props.disabled,false,'The preliminary card estimate must not mark the destination below minimum');
    p.settleReward('200');await p.flush();
    assert.equal(p.action().props.disabled,false,'200 OINK gross yields 2 OINK after the 99% penalty');
    assert.equal(p.option('one-month').props.disabled,false);
    p.select('destination','five-year');assert.equal(p.action().props.disabled,false);
  }finally{p.dispose();}
});

test('the live 100 OINK minimum is explained and does not disable the smaller wallet payout',async()=>{
  const p=await preview();
  try{
    p.open();p.select('destination','one-month');
    const live=payout();
    for(const id of Object.keys(live.minimums))if(id!=='wallet')live.minimums[id]=parseEther('100').toString();
    p.pending[0].resolve(live);p.settleReward('1.528');await p.flush();
    assert.equal(p.action().props.disabled,true);
    assert.match(p.text(p.eligibility()),/0\.01528 OINK.*at least 100\.0 OINK/);
    for(const miner of TIME_MINER_CONTRACTS)assert.equal(p.option(miner.id).props.disabled,true);
    p.select('destination','wallet');assert.equal(p.action().props.disabled,false);
  }finally{p.dispose();}
});

test('an earlier position reward response cannot authorize the newly selected position',async()=>{
  const p=await preview();
  try{
    p.open();p.select('destination','one-month');p.pending[0].resolve(payout());await p.flush();
    p.select('position','1');assert.equal(p.rewardReads[0].signal.aborted,true);
    p.settleReward('200',0);await p.flush();
    assert.equal(p.action().props.disabled,true,'The earlier position response must be ignored');
    p.settleReward('1.528',1);await p.flush();
    assert.equal(p.action().props.disabled,true);
    assert.match(p.text(p.eligibility()),/0\.01528 OINK.*at least 1\.0 OINK/);
  }finally{p.dispose();}
});
