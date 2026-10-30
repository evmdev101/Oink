import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Exercise the actual panel and card effects without a wallet, network or browser.
const source = await readFile(new URL('../src/components/RequestRecovery.tsx', import.meta.url), 'utf8');
let sequence = 0;
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };

async function panel(initial = {}) {
  const instances = new Map(), effects = [], listeners = new Map(), timers = new Map(), calls = [];
  const account = '0x' + '11'.repeat(20), other = '0x' + '22'.repeat(20);
  let now = 1800000000000, active, dirty = true, tree, timer = 0;
  const wallet = { account, chainId:369n, revision:1 };
  const records = new Map([[account, [{ id:'position', label:'Claim OINK', hash:'0x' + 'aa'.repeat(32), createdAt:now, state:'pending', version:'v1', ...initial }]], [other, []]]);
  const bindings = {
    useState(value) { const instance=active,i=instance.cursor++; if (!(i in instance.slots)) instance.slots[i]=typeof value==='function'?value():value; return [instance.slots[i], next => { const value=typeof next==='function'?next(instance.slots[i]):next; if (!Object.is(value,instance.slots[i])) { instance.slots[i]=value;dirty=true; } }]; },
    useRef(value) { const instance=active,i=instance.cursor++; if (!(i in instance.slots)) instance.slots[i]={current:value}; return instance.slots[i]; },
    useEffect(effect,deps) { const instance=active,i=instance.cursor++,old=instance.slots[i]; if (!old || deps.some((value,j)=>!Object.is(value,old.deps[j]))) { instance.slots[i]={deps}; effects.push(()=>{old?.cleanup?.();instance.slots[i].cleanup=effect();}); } },
    jsx:(type,props,key)=>({type,props,key}),jsxs:(type,props,key)=>({type,props,key}),
    useWallet:()=>wallet,
    getPublicProvider:async()=>({}),
    listPendingTransactions:owner=>records.get(owner.toLowerCase()) ?? [],
    recoverRequest:(owner,id,rpc,options,current)=>{ const request={...deferred(),owner,id,rpc,options,current};calls.push(request);return request.promise; },
  };
  const names = { react:['useState','useRef','useEffect'], 'react/jsx-runtime':['jsx','jsxs','Fragment'], './WalletProvider':['useWallet'], '../lib/chain':['getPublicProvider'], '../lib/pendingTransactions':['listPendingTransactions'] };
  const key='__requestRecoveryPanel'+sequence++,previousWindow=globalThis.window,previousNow=Date.now;
  Date.now=()=>now;
  globalThis.window = {
    addEventListener(name,callback){if(!listeners.has(name))listeners.set(name,new Set());listeners.get(name).add(callback);},
    removeEventListener(name,callback){listeners.get(name)?.delete(callback);},
    setInterval(callback,delay){const id=++timer;timers.set(id,{callback,delay});return id;}, clearInterval(id){timers.delete(id);},
  };
  globalThis[key]=bindings;
  const data=code=>'data:text/javascript;base64,'+Buffer.from(code).toString('base64');
  let compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  compiled=compiled.replace(/import\s+["'][^"']+\.css["'];?/g,'').replace(/import\s+([^;]+?)\s+from\s+["']([^"']+)["'];?/g,(_,spec,path)=>{
    assert.ok(names[path],'Missing UI test binding '+path);
    return `import ${spec} from ${JSON.stringify(data(`const e=globalThis[${JSON.stringify(key)}];${names[path].map(name=>`export const ${name}=e.${name};`).join('')}`))};`;
  });
  const transactionsModule=data('const e=globalThis['+JSON.stringify(key)+'];export const listPendingTransactions=e.listPendingTransactions;');
  compiled=compiled.replace(/import\(["']\.\.\/lib\/pendingTransactions["']\)/g,'import('+JSON.stringify(transactionsModule)+')');
  const {RequestRecovery}=await import(data(compiled));
  const resolve=(node,path='root')=>{
    if(Array.isArray(node))return node.map((child,index)=>resolve(child,path+':'+(child?.key??index)));
    if(!node||typeof node!=='object')return node;
    if(typeof node.type==='function'){
      const id=path+':'+node.type.name;
      if(!instances.has(id))instances.set(id,{slots:[],cursor:0,used:true});
      const instance=instances.get(id);instance.used=true;instance.cursor=0;const before=active;active=instance;const output=node.type(node.props??{});active=before;return resolve(output,id);
    }
    return {...node,props:{...node.props,children:resolve(node.props?.children,path+':children')}};
  };
  const render=()=>{let rounds=0;while(dirty){assert.ok(rounds++<25,'Recovery UI effects settle');dirty=false;for(const instance of instances.values())instance.used=false;tree=resolve({type:RequestRecovery,props:{}});for(const [id,instance] of instances)if(!instance.used){for(const slot of instance.slots)slot?.cleanup?.();instances.delete(id);}while(effects.length)effects.shift()();}return tree;};
  const nodes=()=>{const result=[];const walk=node=>{if(Array.isArray(node)){node.forEach(walk);return;}if(!node||typeof node!=='object')return;result.push(node);walk(node.props?.children);};walk(tree);return result;};
  const text=node=>Array.isArray(node)?node.map(text).join(''):node&&typeof node==='object'?text(node.props?.children):node==null||typeof node==='boolean'?'':String(node);
  const find=predicate=>{render();const node=nodes().find(predicate);assert.ok(node,'Expected recovery UI node');return node;};
  const emit=name=>{for(const callback of listeners.get(name)??[])callback(new Event(name));render();};
  const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));render();};
  render();
  return {wallet,records,account,other,calls,render,text,nodes,find,emit,flush,
    button:label=>find(node=>node.type==='button'&&text(node)===label),
    click(label){const button=this.button(label);assert.equal(!!button.props.disabled,false,'Button must be available');button.props.onClick();render();},
    advance(milliseconds){now+=milliseconds;for(const value of timers.values())value.callback();render();},
    accountChange(owner){wallet.account=owner;wallet.revision++;dirty=true;render();},
    dispose(){for(const instance of instances.values())for(const slot of instance.slots)slot?.cleanup?.();globalThis.window=previousWindow;Date.now=previousNow;delete globalThis[key];},
  };
}

test('pending activity stays hidden during background updates and opens only from the wallet menu',async()=>{const p=await panel();try{p.emit('oink-request-recovery-needed');p.advance(300000);assert.equal(p.render(),null);p.emit('oink-open-request-recovery');await p.flush();assert.match(p.text(p.render()),/Claim OINK/);assert.equal(p.calls.length,0);p.click('Close');p.emit('oink-position-journal');assert.equal(p.render(),null);}finally{p.dispose();}});
test('the transaction list closes on account changes and never sends or acknowledges',async()=>{const p=await panel();try{p.emit('oink-open-request-recovery');p.accountChange(p.other);assert.equal(p.render(),null);p.accountChange(p.account);assert.equal(p.render(),null);assert.equal(p.calls.length,0);}finally{p.dispose();}});
test('settled receipts disappear from an explicitly opened list without reopening it',async()=>{const p=await panel();try{p.emit('oink-open-request-recovery');await p.flush();p.records.set(p.account,[]);p.emit('oink-position-journal');await p.flush();assert.match(p.text(p.render()),/No pending transactions/);p.click('Close');p.emit('oink-positions-changed');assert.equal(p.render(),null);}finally{p.dispose();}});
