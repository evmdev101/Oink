import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WalletSession } from '../src/lib/walletSession.ts';

const A = '0x' + '1'.repeat(40), B = '0x' + '2'.repeat(40);
const tick = () => new Promise(resolve => setImmediate(resolve));
const deadlines = {readMs:20,requestMs:35};
function deferred() {
  let resolve,reject;
  const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}
function nextState(session, predicate) {
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{unsubscribe();reject(Error('Expected wallet state was not reached'));},2000);
    const unsubscribe=session.subscribe(()=>{const state=session.getSnapshot();if(predicate(state)){clearTimeout(timer);unsubscribe();resolve(state);}});
  });
}
function wallet(extra = {}) {
  const events = new Map(), calls = [];
  const mock = { account:A, chain:'0x171', ...extra };
  const provider = {
    async request({method,params}) {
      calls.push({method,params});
      if (mock.request) return mock.request(method,params,mock);
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return mock.account ? [mock.account] : [];
      if (method === 'eth_chainId') return mock.chain;
      if (method === 'wallet_switchEthereumChain') { mock.chain = '0x171'; emit('chainChanged'); return null; }
      throw Error('Unexpected method: ' + method);
    },
    on(name,handler) { if (!events.has(name)) events.set(name,new Set()); events.get(name).add(handler); },
    removeListener(name,handler) { events.get(name)?.delete(handler); },
  };
  function emit(name) { events.get(name)?.forEach(handler=>handler()); }
  return { choice:{key:'metamask',identity:'eip6963:io.metamask',name:'MetaMask',provider}, mock,calls,emit,events };
}
test('CashX connection selects the provider and switches to PulseChain without duplicate account prompts', async () => {
  const w=wallet({chain:'0x1'}), saved=[];
  const session=new WalletSession(key=>saved.push(key));
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().account,A);
  assert.equal(session.getSnapshot().chainId,369n);
  assert.equal(session.getSnapshot().provider,w.choice.provider);
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(w.calls.filter(x=>x.method==='eth_requestAccounts').length,1);
  assert.equal(w.calls.filter(x=>x.method==='wallet_switchEthereumChain').length,1);
  assert.deepEqual(saved.at(-1),{key:'metamask',identity:'eip6963:io.metamask',account:A});
  assert.ok(w.calls.every(x=>!['eth_sendTransaction','personal_sign','eth_sign'].includes(x.method)));
  session.dispose();
});
test('unknown chain is added, selected, and verified before connection completes', async () => {
  let added=false, chain='0x1';
  const w=wallet({request:async method=>{
    if (method==='eth_requestAccounts'||method==='eth_accounts') return [A];
    if (method==='eth_chainId') return chain;
    if (method==='wallet_addEthereumChain') { added=true; return null; }
    if (method==='wallet_switchEthereumChain') { if(!added) throw {code:4902}; chain='0x171'; }
  }});
  const session=new WalletSession(()=>{});
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().chainId,369n);
  assert.equal(w.calls.filter(x=>x.method==='wallet_addEthereumChain').length,1);
  assert.equal(w.calls.filter(x=>x.method==='eth_requestAccounts').length,1);
  session.dispose();
});
test('remembered sessions restore without account prompts or unsolicited network switches', async () => {
  const w=wallet({chain:'0x1'}), session=new WalletSession(()=>{});
  await session.restore(w.choice,A);
  assert.equal(session.getSnapshot().account,A);
  assert.equal(session.getSnapshot().chainId,1n);
  assert.deepEqual(w.calls.map(x=>x.method),['eth_accounts','eth_chainId']);
  session.disconnect();
  await session.restore(w.choice,A);
  assert.equal(session.getSnapshot().account,null);
});

test('a saved extension exposing a different account does not silently connect that account', async () => {
  const w=wallet({account:B}), saved=[], session=new WalletSession(value=>saved.push(value));
  await session.restore(w.choice,A);
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(saved.at(-1),null);
  assert.deepEqual(w.calls.map(x=>x.method),['eth_accounts','eth_chainId']);
  w.emit('accountsChanged'); await tick();
  assert.equal(session.getSnapshot().account,null);
});

test('legacy providers and missing account selections never auto-restore', async () => {
  const w=wallet(),session=new WalletSession(()=>{});
  await session.restore({...w.choice,identity:undefined},A);
  await session.restore(w.choice,'');
  assert.equal(w.calls.length,0);
  assert.equal(session.getSnapshot().account,null);
});

test('an explicit account change updates the remembered account for the next visit', async () => {
  const w=wallet(),saved=[],session=new WalletSession(value=>saved.push(value));
  await session.connect(w.choice);
  w.mock.account=B; w.emit('accountsChanged'); await tick();
  assert.equal(saved.at(-1).account,B);
  session.dispose();
});
test('disconnect cancels local pending state and ignores a late result after selecting another wallet', async () => {
  let finish;
  const waiting=new Promise(resolve=>{finish=resolve;});
  const w=wallet({request:method=>method==='eth_requestAccounts'?waiting:Promise.resolve(method==='eth_accounts'?[A]:'0x171')});
  const next=wallet({account:B}); next.choice.key='rabby';
  const session=new WalletSession(()=>{});
  const pending=session.connect(w.choice);
  session.disconnect();
  assert.equal(session.getSnapshot().busy,false);
  await session.connect(next.choice);
  finish([A]); await pending;
  assert.equal(session.getSnapshot().account,B);
  assert.equal(session.getSnapshot().provider,next.choice.provider);
  assert.equal(w.calls.length,1);
  session.dispose();
});
test('rejection clears busy and provider so a stale extension event cannot reconnect', async () => {
  const w=wallet({request:async()=>{throw {code:4001};}}),session=new WalletSession(()=>{});
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(session.getSnapshot().provider,null);
  assert.match(session.getSnapshot().error,/cancelled/);
  w.emit('accountsChanged'); await tick();
  assert.equal(w.calls.length,1);
  session.dispose();
});
test('selected provider events replace account, update network, and clear revoked permissions', async () => {
  const w=wallet(),session=new WalletSession(()=>{});
  await session.connect(w.choice);
  const revision=session.getSnapshot().revision;
  w.mock.account=B; w.emit('accountsChanged');
  assert.equal(session.getSnapshot().account,null);
  await tick(); assert.equal(session.getSnapshot().account,B);
  w.mock.chain='0x1'; w.emit('chainChanged'); await tick();
  assert.equal(session.getSnapshot().chainId,1n);
  w.mock.account=null; w.emit('accountsChanged'); await tick();
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().provider,null);
  assert.ok(session.getSnapshot().revision>revision);
  assert.ok([...w.events.values()].every(set=>set.size===0));
});
test('duplicate clicks share one pending request and storage failures do not break connection', async () => {
  const w=wallet(),session=new WalletSession(()=>{throw Error('storage disabled');});
  await Promise.all([session.connect(w.choice),session.connect(w.choice)]);
  assert.equal(session.getSnapshot().account,A);
  assert.equal(w.calls.filter(x=>x.method==='eth_requestAccounts').length,1);
  session.disconnect();
});

for (const method of ['eth_accounts','eth_chainId']) test('passive '+method+' timeout clears restore and ignores late provider responses', async () => {
  const pending=deferred(),saved=[];
  const w=wallet({request:called=>called===method?pending.promise:Promise.resolve(called==='eth_accounts'?[A]:'0x171')});
  const session=new WalletSession(value=>saved.push(value),deadlines);
  await session.restore(w.choice,A);
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(session.getSnapshot().account,null);
  assert.match(session.getSnapshot().error,/did not respond/);
  assert.equal(saved.at(-1),null);
  assert.ok([...w.events.values()].every(listeners=>listeners.size===0));
  const next=wallet({account:B});next.choice.key='rabby';next.choice.identity='eip6963:io.rabby';
  await session.connect(next.choice);
  pending.resolve(method==='eth_accounts'?[A]:'0x171');w.emit('accountsChanged');await tick();
  assert.equal(session.getSnapshot().account,B);
  assert.equal(session.getSnapshot().provider,next.choice.provider);
  assert.deepEqual(w.calls.map(call=>call.method),['eth_accounts','eth_chainId']);
  session.dispose();
});

test('account prompt timeout permits an explicit retry and cannot overwrite its result', async () => {
  const firstPrompt=deferred();let prompts=0;
  const w=wallet({request:method=>{
    if(method==='eth_requestAccounts')return ++prompts===1?firstPrompt.promise:Promise.resolve([B]);
    if(method==='eth_accounts')return Promise.resolve([B]);
    if(method==='eth_chainId')return Promise.resolve('0x171');
  }}),session=new WalletSession(()=>{},deadlines);
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(session.getSnapshot().provider,null);
  assert.match(session.getSnapshot().error,/timed out.*cancel.*connect again/);
  assert.equal(w.calls.length,1);
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().account,B);
  firstPrompt.resolve([A]);await tick();
  assert.equal(session.getSnapshot().account,B);
  assert.equal(w.calls.length,4);
  assert.equal(prompts,2);
  session.dispose();
});

for(const method of ['wallet_switchEthereumChain','wallet_addEthereumChain']) test(method+' timeout does not leave a connected signer or trigger later prompts', async () => {
  const pending=deferred();
  const w=wallet({request:async called=>{
    if(called==='eth_requestAccounts'||called==='eth_accounts')return [A];
    if(called==='eth_chainId')return '0x1';
    if(called===method)return pending.promise;
    if(called==='wallet_switchEthereumChain')throw {code:4902};
    throw Error('Unexpected request '+called);
  }}),session=new WalletSession(()=>{},deadlines);
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().provider,null);
  assert.match(session.getSnapshot().error,/timed out/);
  const count=w.calls.length;
  pending.resolve(null);w.emit('chainChanged');await tick();
  assert.equal(w.calls.length,count);
  assert.equal(session.getSnapshot().account,null);
  session.dispose();
});

test('refresh timeout removes signer immediately, clears saved identity, and supports reconnect', async () => {
  const w=wallet(),saved=[],session=new WalletSession(value=>saved.push(value),deadlines);
  await session.connect(w.choice);
  const pending=deferred();
  w.mock.request=method=>method==='eth_accounts'?pending.promise:Promise.resolve('0x171');
  const failed=nextState(session,state=>!!state.error&&!state.busy);
  w.emit('accountsChanged');
  assert.equal(session.getSnapshot().busy,true);
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(session.getSnapshot().account,null);
  await failed;
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(saved.at(-1),null);
  assert.ok([...w.events.values()].every(listeners=>listeners.size===0));
  delete w.mock.request;w.mock.account=B;
  await session.connect(w.choice);
  pending.resolve([A]);await tick();
  assert.equal(session.getSnapshot().account,B);
  assert.equal(saved.at(-1).account,B);
  session.dispose();
});

test('refresh errors detach the failed provider and cannot silently reconnect from another event', async () => {
  const w=wallet(),session=new WalletSession(()=>{},deadlines);
  await session.connect(w.choice);
  w.mock.request=async()=>{throw Error('Wallet locked');};
  const failed=nextState(session,state=>!!state.error&&!state.busy);
  w.emit('chainChanged');await failed;
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().chainId,null);
  assert.match(session.getSnapshot().error,/Wallet locked/);
  const count=w.calls.length;
  delete w.mock.request;w.emit('accountsChanged');await tick();
  assert.equal(w.calls.length,count);
  assert.equal(session.getSnapshot().account,null);
  session.dispose();
});

test('consecutive provider changes keep the newest refresh and ignore the older read', async () => {
  const w=wallet(),session=new WalletSession(()=>{},deadlines);
  await session.connect(w.choice);
  const old=deferred();let reads=0;
  w.mock.request=method=>method==='eth_accounts'?(++reads===1?old.promise:Promise.resolve([B])):Promise.resolve('0x171');
  w.emit('accountsChanged');w.emit('chainChanged');await tick();
  assert.equal(session.getSnapshot().account,B);
  assert.equal(session.getSnapshot().provider,w.choice.provider);
  assert.equal(session.getSnapshot().busy,false);
  old.resolve([A]);await tick();
  assert.equal(session.getSnapshot().account,B);
  session.dispose();
});

test('disconnect settles an unresolved request immediately and late rejection remains ignored', async () => {
  const prompt=deferred(),w=wallet({request:()=>prompt.promise}),session=new WalletSession(()=>{},deadlines);
  const pending=session.connect(w.choice);
  session.disconnect();await pending;
  assert.equal(session.getSnapshot().busy,false);
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(session.getSnapshot().error,'');
  prompt.reject(Error('Late wallet failure'));await tick();
  assert.equal(session.getSnapshot().error,'');
  assert.equal(w.calls.length,1);
});

test('explicit connection cannot silently substitute a different account returned by passive reads', async () => {
  const w=wallet({request:async method=>method==='eth_requestAccounts'?[A]:method==='eth_accounts'?[B]:'0x171'}),session=new WalletSession(()=>{},deadlines);
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().provider,null);
  assert.match(session.getSnapshot().error,/account changed/);
  session.dispose();
});

test('network switching cannot silently substitute another wallet account', async () => {
  const w=wallet({chain:'0x1'}),session=new WalletSession(()=>{},deadlines);
  await session.restore(w.choice,A);
  w.mock.request=async method=>{
    if(method==='eth_accounts')return [w.mock.account];
    if(method==='eth_chainId')return w.mock.chain;
    if(method==='wallet_switchEthereumChain'){w.mock.chain='0x171';w.mock.account=B;return null;}
    throw Error('Unexpected '+method);
  };
  await session.switchToPulseChain();
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().provider,null);
  assert.match(session.getSnapshot().error,/account changed/);
  session.dispose();
});

for(const mode of ['restore','connect']) test(mode+' rejects an account/network pair captured across a provider change', async () => {
  const chainRead=deferred(),started=deferred();
  const w=wallet({request:method=>{
    if(method==='eth_requestAccounts'||method==='eth_accounts')return Promise.resolve([A]);
    if(method==='eth_chainId'){started.resolve();return chainRead.promise;}
  }}),session=new WalletSession(()=>{},deadlines);
  const pending=mode==='restore'?session.restore(w.choice,A):session.connect(w.choice);
  await started.promise;
  // The accounts response has already reported A; the extension now reports B
  // before the companion network read finishes. Never publish that stale pair.
  w.mock.account=B;w.emit('accountsChanged');chainRead.resolve('0x171');
  await pending;
  assert.equal(session.getSnapshot().account,null);
  assert.equal(session.getSnapshot().provider,null);
  assert.equal(session.getSnapshot().busy,false);
  assert.match(session.getSnapshot().error,/wallet changed/);
  assert.ok([...w.events.values()].every(listeners=>listeners.size===0));
  delete w.mock.request;
  await session.connect(w.choice);
  assert.equal(session.getSnapshot().account,B);
  session.dispose();
});
