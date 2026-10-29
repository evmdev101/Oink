import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import {getCreateAddress} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {prepareProtocolTransaction,assertSameProtocolTerms,requestProtocolTransaction,verifyProtocolReceipt,PROTOCOL_REVIEW_LIFETIME}=await import('../src/lib/protocolTransactions.ts');
const {readProtocolJournal,writeProtocolJournal,protocolJournalBlocks}=await import('../src/lib/protocolTransactionJournal.ts');
const account='0x'+'11'.repeat(20),target='0x'+'22'.repeat(20),other='0x'+'33'.repeat(20),hash='0x'+'aa'.repeat(32),blockHash='0x'+'bb'.repeat(32);
const req={module:'test',action:'act',args:{amount:'1'}};
function setup(options={}){
 const timestamp=Math.floor(Date.now()/1000),calls=[],walletCalls=[];
 const quote={title:'Exact action',account,block:100,blockHash,timestamp,to:target,data:'0x12345678',value:'0x0',facts:[['Amount','1']],warnings:['Consequence'],fingerprint:'stable',...options.quote};
 let canonicalReads=0;
 const tx={hash,from:account,to:target,input:quote.data,value:'0x0',blockNumber:'0x64',blockHash,...options.tx};
 const receipt={transactionHash:hash,from:account,to:target,blockNumber:'0x64',blockHash,status:'0x1',logs:[],...options.receipt};
 const adapter={async prepare(){if(options.prepareError)throw Error('Adapter blocked');return {...quote,fingerprint:options.changedTerms?'changed':quote.fingerprint};},async verify(){if(options.verifyError)throw Error('Verification read failed');if(options.afterVerify)options.afterVerify();return options.verified!==false;}};
 const rpc={async send(method,args){calls.push([method,args]);switch(method){
  case 'eth_chainId':return options.wrongNetwork?'0x1':'0x171';
  case 'eth_getBlockByNumber':canonicalReads++;return {number:'0x64',timestamp:'0x'+timestamp.toString(16),hash:options.reorgAfter&&canonicalReads>=options.reorgAfter?'0x'+'cc'.repeat(32):blockHash};
  case 'eth_getCode':return options.contractAccount?'0x6000':'0x';
  case 'eth_call':if(options.simulationFails)throw Error('Contract rejects');return options.simulationResult??'0x';
  case 'eth_getTransactionCount':return args[1]==='pending'?(options.pendingNonce??'0x0'):(options.nonce??'0x0');
  case 'eth_estimateGas':return options.gasEstimate??'0x5208';
  case 'eth_gasPrice':return options.gasPrice??'0x2';
  case 'eth_getBalance':return options.balance??'0x1000000';
  case 'eth_getTransactionReceipt':return options.pending?null:receipt;
  case 'eth_getTransactionByHash':return tx;
  default:throw Error('Unexpected RPC '+method);
 }}};
 const wallet={async request(call){walletCalls.push(call);if(call.method==='eth_accounts')return [options.walletAccount??account];if(call.method==='eth_chainId')return options.walletChain??'0x171';if(call.method==='eth_sendTransaction'){if(options.walletError)throw options.walletError;return options.walletResult??hash;}throw Error('Unexpected wallet request');}};
 return {options,rpc,adapter,wallet,calls,walletCalls,quote,receipt,tx,resetCanonical(){canonicalReads=0;}};
}
const review=env=>prepareProtocolTransaction(env.rpc,account,req,env.adapter);
test('protocol preparation simulates exact calldata, budgets gas, and never requests a wallet',async()=>{
 const e=setup(),r=await review(e);assert.equal(r.transaction.gas,'0x6270');assert.equal(r.gasCost,'50400');assert.equal(r.transaction.from,account);assert.deepEqual(e.walletCalls,[]);
 const simulation=e.calls.find(([m])=>m==='eth_call')[1];assert.equal(simulation[1],'0x64');assert.equal(simulation[0].data,r.transaction.data);assert.equal(simulation[0].to,target);
 req.args.amount='mutated';assert.equal(r.request.args.amount,'1');req.args.amount='1';
});
for(const[name,options,match]of[
 ['wrong RPC chain',{wrongNetwork:true},/PulseChain/],['contract sender',{contractAccount:true},/externally owned/],['failed simulation',{simulationFails:true},/Contract rejects/],['zero gas',{gasEstimate:'0x0'},/Gas estimate/],['zero gas price',{gasPrice:'0x0'},/Gas estimate/],['insufficient PLS',{balance:'0x1'},/enough PLS/],['reorganized snapshot',{reorgAfter:2},/Snapshot changed/],['wrong quote account',{quote:{account:other}},/Invalid action/],['empty fingerprint',{quote:{fingerprint:''}},/Invalid action/],['malformed calldata',{quote:{data:'0x123'}},/Invalid action/],['stale quote',{quote:{timestamp:Math.floor(Date.now()/1000)-121}},/stale/],['future quote',{quote:{timestamp:Math.floor(Date.now()/1000)+31}},/stale/]
])test(name+' stops protocol preparation',async()=>{const e=setup(options);if(name==='future quote')e.quote.timestamp=Math.floor(Date.now()/1000)+31;await assert.rejects(review(e),match);assert.equal(e.walletCalls.length,0);});
test('same-term guard binds account, destination, calldata, value and fingerprint',async()=>{
 const e=setup(),r=await review(e);for(const patch of [{quote:{...r.quote,account:other}},{transaction:{...r.transaction,to:other}},{transaction:{...r.transaction,data:'0x12345679'}},{transaction:{...r.transaction,value:'0x1'}},{quote:{...r.quote,fingerprint:'changed'}}])assert.throws(()=>assertSameProtocolTerms(r,{...r,...patch}),/terms changed/);
});
test('protocol sender checks identity twice around fresh preparation and makes one exact wallet request',async()=>{
 const e=setup(),r=await review(e),result=await requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>true);assert.equal(result,hash);
 assert.deepEqual(e.walletCalls.map(c=>c.method),['eth_accounts','eth_chainId','eth_accounts','eth_chainId','eth_sendTransaction']);assert.deepEqual(e.walletCalls.at(-1).params,[r.transaction]);
});
for(const[name,change]of[['account',e=>{e.options.walletAccount=other;}],['network',e=>{e.options.walletChain='0x1';}],['fresh state',e=>{e.options.changedTerms=true;}],['adapter failure',e=>{e.options.prepareError=true;}]])test('changed '+name+' fails before requesting a wallet transaction',async()=>{
 const e=setup(),r=await review(e);change(e);await assert.rejects(requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>true),error=>error.walletRequestStarted===false);assert.ok(!e.walletCalls.some(c=>c.method==='eth_sendTransaction'));
});
test('expired review and superseded UI session fail before sending',async()=>{
 for(const stale of [false,true]){const e=setup(),r=await review(e);if(stale)r.createdAt=Date.now()-PROTOCOL_REVIEW_LIFETIME-1;await assert.rejects(requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>stale),error=>error.walletRequestStarted===false);assert.ok(!e.walletCalls.some(c=>c.method==='eth_sendTransaction'));}
});
test('provider failure or malformed hash after send is uncertain and never automatically retried',async()=>{
 for(const options of [{walletResult:'not-a-hash'},{walletError:Error('Disconnected after sending')}]){const e=setup(options),r=await review(e);await assert.rejects(requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>true),error=>error.walletRequestStarted===true);assert.equal(e.walletCalls.filter(c=>c.method==='eth_sendTransaction').length,1);}
});
test('wallet rejection preserves explicit rejection code and send-start marker for journal resolution',async()=>{
 const e=setup({walletError:Object.assign(Error('Rejected'),{code:4001})}),r=await review(e);await assert.rejects(requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>true),e=>e.code===4001&&e.walletRequestStarted===true);
});
test('receipt confirms only exact successful transaction and adapter outcome',async()=>{
 const e=setup(),r=await review(e);assert.equal((await verifyProtocolReceipt(e.rpc,r,hash,e.adapter)).state,'confirmed');
 for(const options of [{verified:false},{verifyError:true}]){const x=setup(options);assert.equal((await verifyProtocolReceipt(x.rpc,r,hash,x.adapter)).state,'uncertain');}
});
test('null receipt remains pending; reverted receipt resolves failure without asserting effects',async()=>{
 const e=setup(),r=await review(e);const pending=setup({pending:true}),failed=setup({receipt:{status:'0x0'},verifyError:true});assert.equal((await verifyProtocolReceipt(pending.rpc,r,hash,pending.adapter)).state,'pending');assert.equal((await verifyProtocolReceipt(failed.rpc,r,hash,failed.adapter)).state,'failed');
});
test('receipt rejects mismatched sender, destination, calldata, value, block, hash and removed logs',async()=>{
 const e=setup(),r=await review(e);for(const options of [{tx:{from:other}},{tx:{to:other}},{tx:{input:'0x12345679'}},{tx:{value:'0x1'}},{tx:{blockNumber:'0x65'}},{tx:{hash:'0x'+'dd'.repeat(32)}},{receipt:{from:other}},{receipt:{to:other}},{receipt:{status:'0x2'}},{receipt:{blockHash:'0x'+'dd'.repeat(32)}},{receipt:{logs:[{address:target,topics:[],data:'0x',removed:true}]}}]){const x=setup(options);assert.equal((await verifyProtocolReceipt(x.rpc,r,hash,x.adapter)).state,'uncertain',JSON.stringify(options));}
});
test('receipt rechecks canonical block after asynchronous effect reads',async()=>{
 const e=setup(),r=await review(e);e.resetCanonical();e.options.reorgAfter=2;assert.equal((await verifyProtocolReceipt(e.rpc,r,hash,e.adapter)).state,'uncertain');
});
function memory(){const map=new Map();return {map,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,value)};}
test('journal retains uncertain requests across reloads and blocks requesting/pending/uncertain only',async()=>{
 const e=setup(),r=await review(e),storage=memory();for(const state of ['requesting','pending','uncertain','confirmed','failed','resolved']){const entry={review:r,state,hash:['requesting','uncertain','resolved'].includes(state)?null:hash,message:'status'};writeProtocolJournal(entry,storage);assert.deepEqual(readProtocolJournal(account,storage),entry);assert.equal(protocolJournalBlocks(readProtocolJournal(account,storage)),state==='pending');}
});
test('journal rejects corrupted identities, incomplete hashes, calldata divergence and non-string action inputs',async()=>{
 const e=setup(),r=await review(e);for(const mutate of [j=>{j.review.quote.account=other;},j=>{j.review.transaction.to=other;},j=>{j.review.transaction.data='0x12345679';},j=>{j.review.request.args.amount=1;},j=>{j.state='pending';},j=>{j.hash='0xabc';},j=>{j.review.transaction.chainId='0x1';}]){const j={review:structuredClone(r),state:'requesting',hash:null,message:'status'},s=memory();mutate(j);assert.throws(()=>writeProtocolJournal(j,s));}
 const storage=memory();writeProtocolJournal({review:r,state:'requesting',hash:null,message:'status'},storage);for(const key of storage.map.keys())storage.map.set(key,'not JSON');assert.throws(()=>readProtocolJournal(account,storage),/blocked/);
});
test('journal persistence must round-trip exactly before a wallet can open',async()=>{
 const e=setup(),r=await review(e);assert.throws(()=>writeProtocolJournal({review:r,state:'requesting',hash:null,message:'status'},{setItem(){},getItem(){return null;}}),/could not be saved/);
});
const creationOptions=()=>({quote:{kind:'creation',to:getCreateAddress({from:account,nonce:0n}),creation:{nonce:'0x0',runtime:'0x60016000'}},simulationResult:'0x60016000'});
test('contract creation is explicit, pins nonce/runtime, and omits the predicted target from real RPC and wallet requests',async()=>{
 const e=setup(creationOptions()),r=await review(e);
 assert.equal(r.transaction.to,getCreateAddress({from:account,nonce:0n}));assert.equal(r.transaction.nonce,'0x0');
 for(const [method,args]of e.calls.filter(([method])=>['eth_call','eth_estimateGas'].includes(method))){assert(!('to'in args[0]),method);assert.equal(args[0].nonce,'0x0');}
 await requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>true);const sent=e.walletCalls.find(c=>c.method==='eth_sendTransaction').params[0];assert(!('to'in sent));assert.equal(sent.nonce,'0x0');
 const storage=memory();writeProtocolJournal({review:r,state:'pending',hash,message:'pending'},storage);assert.deepEqual(readProtocolJournal(account,storage).review,r);
});
test('creation blocks nonce drift, pending transactions, wrong predicted address, runtime mismatch and hidden creation fields',async()=>{
 for(const change of [{nonce:'0x1'},{pendingNonce:'0x1'},{simulationResult:'0x6002'},{quote:{...creationOptions().quote,to:target}},{quote:{creation:{nonce:'0x0',runtime:'0x6000'}}}]){const e=setup({...creationOptions(),...change});await assert.rejects(review(e));assert(!e.walletCalls.some(c=>c.method==='eth_sendTransaction'));}
 const e=setup(creationOptions()),r=await review(e);e.quote.creation={nonce:'0x1',runtime:e.quote.creation.runtime};await assert.rejects(requestProtocolTransaction(r,e.adapter,e.rpc,e.wallet,()=>true));assert(!e.walletCalls.some(c=>c.method==='eth_sendTransaction'));
});
test('creation receipt requires null EVM destinations, exact nonce, predicted deployed address and complete runtime',async()=>{
 const e=setup(creationOptions()),r=await review(e),predicted=r.transaction.to;
 const mined={...creationOptions(),tx:{to:null,nonce:'0x0'},receipt:{to:null,contractAddress:predicted}};
 const good=setup(mined),base=good.rpc.send;good.rpc.send=async(method,args)=>method==='eth_getCode'&&args[0]===predicted?r.quote.creation.runtime:base(method,args);
 assert.equal((await verifyProtocolReceipt(good.rpc,r,hash,good.adapter)).state,'confirmed');
 for(const change of [{tx:{to:predicted,nonce:'0x0'}},{tx:{to:null,nonce:'0x1'}},{receipt:{to:predicted,contractAddress:predicted}},{receipt:{to:null,contractAddress:other}},{receipt:{to:null,contractAddress:null}}]){const bad=setup({...mined,...change});bad.rpc.send=async(method,args)=>method==='eth_getCode'?r.quote.creation.runtime:setup({...mined,...change}).rpc.send(method,args);assert.equal((await verifyProtocolReceipt(bad.rpc,r,hash,bad.adapter)).state,'uncertain');}
 const wrong=setup(mined);assert.equal((await verifyProtocolReceipt(wrong.rpc,r,hash,wrong.adapter)).state,'uncertain');
 const fail=setup({...mined,receipt:{to:null,contractAddress:null,status:'0x0'}});assert.equal((await verifyProtocolReceipt(fail.rpc,r,hash,fail.adapter)).state,'failed');
});
test('creation journal rejects tampered nonce, runtime identity and predicted address',async()=>{
 const r=await review(setup(creationOptions()));for(const mutate of [r=>r.transaction.nonce='0x1',r=>r.quote.creation.nonce='0x1',r=>r.quote.creation.runtime='0x',r=>{r.quote.kind='call';},r=>r.transaction.to=other]){const copy=structuredClone(r);mutate(copy);assert.throws(()=>writeProtocolJournal({review:copy,state:'pending',hash,message:'pending'},memory()));}
});
