import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { formatEther, formatUnits, parseEther, getAddress, isAddress, ZeroAddress } from 'ethers';
import { isCancelledFeedback, isRecoveryFeedback } from '../src/lib/transactionFeedback.ts';

let sequence = 0;
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };
const data = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64');

// Exercise both real dialogs with a fake read-only quote and deferred wallet
// flow. No extension, blockchain request or persistent journal is touched.
async function dialogFixture(kind) {
  const account = '0x'+'11'.repeat(20), address = '0x'+'22'.repeat(20);
  const row = { index:0, shares:'100', gross:'105', deposited:1700000000, maturity:1900000000, mandatoryUntil:1700000000, graceEnd:1900100000, pool:{id:'one-month',label:'1 month',address} };
  const wallet = { account, provider:{}, revision:1, chainId:369n };
  const quote = { account, timestamp:Math.floor(Date.now()/1000), simulation:'Passed', execution:{positionShares:parseEther(row.shares).toString()}, facts:[['Modeled exit penalty','5%'],['Estimated OINK after penalty','99.75']] };
  const options = { timestamp:Math.floor(Date.now()/1000), source:{id:row.pool.id,index:0,shares:parseEther(row.shares).toString(),deposited:String(row.deposited)}, options:[{id:row.pool.id,label:'1 month',available:true,bonusRate:'100',bonusAmount:parseEther('1').toString(),quote}] };
  const slots=[], effects=[], calls=[], events=[], listeners=new Map();
  let cursor=0, dirty=true, tree, closed=0, blocked=true;
  const element = { open:false, showModal(){this.open=true;}, close(){this.open=false;closed++;}, contains(){return false;} };
  const jsx = (type,props) => { if(type==='dialog'&&props.ref) props.ref.current=element; return {type,props}; };
  const bindings = {
    useState(value){const i=cursor++;if(!(i in slots)) slots[i]=typeof value==='function'?value():value; return [slots[i],next=>{const value=typeof next==='function'?next(slots[i]):next;if(!Object.is(value,slots[i])){slots[i]=value;dirty=true;}}];},
    useRef(value){const i=cursor++;if(!(i in slots)) slots[i]={current:value};return slots[i];},
    useEffect(effect,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,j)=>!Object.is(value,old.deps[j]))){slots[i]={deps};effects.push(()=>{old?.cleanup?.();slots[i].cleanup=effect();});}},
    useId:()=> 'miner-feedback', jsx, jsxs:jsx, createPortal:node=>node,
    formatEther,formatUnits,parseEther,getAddress,isAddress,ZeroAddress,
    TIME_MINER_CONTRACTS:[row.pool,{id:'one-year',label:'1 year',address}], explorerUrl:value=>'https://example.test/'+value,
    displayFarmAmount:value=>value, getPublicProvider:async()=>({}), previewMiner:async()=>quote,
    useWallet:()=>wallet, readMinerRolloverOptions:async()=>options,
    PositionTransaction:function PositionTransaction(){}, MinerRolloverDialog:function MinerRolloverDialog(){}, InfoTooltip:function InfoTooltip(){},
    isCancelledFeedback,isRecoveryFeedback,readPositionJournal:()=>blocked?{hash:"0xabc",state:"pending"}:null,positionJournalBlocks:entry=>!!entry?.hash&&entry.state==="pending",
  };
  const submit = input => { const call={...deferred(),input};calls.push(call);return call.promise; };
  bindings.submitMinerWithdrawal=submit;bindings.submitMinerRollover=submit;
  const names={react:['useState','useRef','useEffect','useId'],'react/jsx-runtime':['jsx','jsxs','Fragment'],'react-dom':['createPortal'],ethers:['formatEther','formatUnits','parseEther','getAddress','isAddress','ZeroAddress'],
    '../config/contracts':['TIME_MINER_CONTRACTS','explorerUrl'],'../lib/farmDisplay':['displayFarmAmount'],'../lib/chain':['getPublicProvider'],'../lib/positionPreviews':['previewMiner'],
    './PositionTransaction':['PositionTransaction'],'./MinerRolloverDialog':['MinerRolloverDialog'],'./WalletProvider':['useWallet'],'../lib/minerWithdrawalFlow':['submitMinerWithdrawal'],'./InfoTooltip':['InfoTooltip'],
    '../lib/minerRollover':['readMinerRolloverOptions'],'../lib/minerRolloverFlow':['submitMinerRollover'],'../lib/transactionFeedback':['isCancelledFeedback','isRecoveryFeedback'],'../lib/positionTransactions':['positionJournalBlocks','readPositionJournal']};
  const key='__quietMinerFeedback'+sequence++,oldWindow=globalThis.window,oldDocument=globalThis.document,oldStorage=globalThis.localStorage;globalThis.localStorage={};
  globalThis[key]=bindings;
  globalThis.window={setInterval:()=>1,clearInterval(){},setTimeout:()=>2,clearTimeout(){},dispatchEvent(event){events.push(event.type);for(const callback of listeners.get(event.type)??[])callback(event);return true;},addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback);},removeEventListener(name,callback){listeners.get(name)?.delete(callback);}};
  globalThis.document={body:{},addEventListener(){},removeEventListener(){}};
  const name=kind==='withdraw'?'MinerActions':'MinerRolloverDialog';
  let source=await readFile(new URL('../src/components/'+name+'.tsx',import.meta.url),'utf8');
  let code=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  code=code.replace(/import\s+["'][^"']+\.css["'];?/g,'').replace(/import\s+([^;]+?)\s+from\s+["']([^"']+)["'];?/g,(_,spec,path)=>{
    assert.ok(names[path],'Missing dialog test binding '+path);
    return `import ${spec} from ${JSON.stringify(data(`const e=globalThis[${JSON.stringify(key)}];${names[path].map(name=>`export const ${name}=e.${name};`).join('')}`))};`;
  });
  const Component=(await import(data(code)))[name];
  const props=kind==='withdraw'?{row,account,revision:1,chainId:369n}:{row,onClose(){element.close();}};
  const render=()=>{let rounds=0;while(dirty){assert.ok(rounds++<25,'Dialog effects settle');dirty=false;cursor=0;tree=Component(props);while(effects.length)effects.shift()();}return tree;};
  const nodes=()=>{const result=[];const walk=node=>{if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;result.push(node);walk(node.props?.children);};walk(tree);return result;};
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):node==null||typeof node==='boolean'?'':String(node);
  const find=label=>{render();const button=nodes().find(node=>node.type==='button'&&text(node)===label);assert.ok(button,'Expected button '+label);return button;};
  const click=label=>{const button=find(label);assert.equal(!!button.props.disabled,false);button.props.onClick();render();};
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
  render();await flush();
  if(kind==='withdraw'){click('Actions ▾');click('End Miner (Withdraw)');}
  return {calls,events,render,text,nodes,find,click,flush,closed:()=>closed,
    settle(){blocked=false;globalThis.window.dispatchEvent(new Event('oink-position-journal'));render();},
    openRecovery(){globalThis.window.dispatchEvent(new Event('oink-open-request-recovery'));render();},
    async submit(){click(kind==='withdraw'?'Withdraw':'Extend My Miner!');await flush();assert.equal(calls.length,1);return calls[0];},
    dispose(){for(const slot of slots)slot?.cleanup?.();globalThis.window=oldWindow;globalThis.document=oldDocument;globalThis.localStorage=oldStorage;delete globalThis[key];}
  };
}

for(const kind of ['withdraw','rollover']) {
  test(kind+' keeps routine wallet and pending feedback inside button labels',async()=>{
    const p=await dialogFixture(kind);
    try {
      const call=await p.submit();
      call.input.onStage('wallet','Routine wallet tracking sentence');p.render();
      assert.doesNotMatch(p.text(p.render()),/Routine wallet tracking sentence|Closing this window does not cancel/);
      assert.ok(p.find('Waiting for wallet…'));
      call.input.onStage('pending','Routine pending tracking sentence','0x'+'aa'.repeat(32));
      call.resolve({state:'pending',message:'Routine pending tracking sentence',hash:'0x'+'aa'.repeat(32)});await p.flush();
      assert.doesNotMatch(p.text(p.render()),/Routine pending tracking sentence|View transaction|Waiting for the transaction/);
      assert.ok(!p.nodes().some(node=>node.type==='button'&&p.text(node)==='Resolve request'));assert.equal(p.events.length,0);
    } finally {p.dispose();}
  });
  test(kind+' keeps minimum failures visible and hides routine wallet rejection',async()=>{
    const p=await dialogFixture(kind);
    try {
      const call=await p.submit();call.input.onStage('rejected','Minimum amount is 100 OINK.');call.resolve({state:'resolved',message:'Minimum amount is 100 OINK.',hash:null});await p.flush();
      assert.match(p.text(p.render()),/Minimum amount is 100 OINK/);
    }finally{p.dispose();}
    const cancelled=await dialogFixture(kind);
    try {
      const call=await cancelled.submit();call.input.onStage('rejected','The wallet request was rejected. No automatic retry was made.');call.resolve({state:'resolved',message:'The wallet request was rejected. No automatic retry was made.',hash:null});await cancelled.flush();
      assert.doesNotMatch(cancelled.text(cancelled.render()),/wallet request was rejected|automatic retry/);
    }finally{cancelled.dispose();}
  });
  test(kind+' clears its local pending control when background verification settles',async()=>{
    const p=await dialogFixture(kind);
    try {
      const call=await p.submit();call.input.onStage('pending','Submitted');call.resolve({state:'pending',message:'Submitted',hash:'0x'+'aa'.repeat(32)});await p.flush();
      p.settle();assert.ok(!p.nodes().some(node=>node.type==='button'&&p.text(node)==='Resolve request'));
      assert.equal(!!p.find(kind==='withdraw'?'Withdraw':'Extend My Miner!').props.disabled,false);
    }finally{p.dispose();}
  });
}

test('an explicit recovery event also closes the parent miner dialog',async()=>{
  const p=await dialogFixture('withdraw');
  try {p.openRecovery();assert.ok(p.closed()>0);assert.ok(!p.nodes().some(node=>node.type==='dialog'));}
  finally {p.dispose();}
});
