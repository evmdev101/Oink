import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const position=await import('../src/lib/positionTransactions.ts');
const protocol=await import('../src/lib/protocolTransactionJournal.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const {positionScope,protocolScope}=await import('../src/lib/actionJournal.ts');
const account='0x'+'11'.repeat(20),hash='0x'+'aa'.repeat(32),blockHash='0x'+'bb'.repeat(32);
function memory(){const map=new Map();return {map,get length(){return map.size},key:i=>[...map.keys()][i]??null,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};}
function entry(index=0,state='pending',txHash=hash){
 const spec=MINER_PREVIEW_SPECS[index],request={type:'miner',id:spec.id,action:{kind:'withdraw',index}};
 const transaction={from:account,to:spec.address,data:'0x12345678',value:'0x0',chainId:'0x171',gas:'0x5208'};
 return {state,hash:txHash,message:'',review:{request,transaction,blockHash,createdAt:Date.now(),quote:{account,title:'Withdraw miner',execution:{to:spec.address,data:transaction.data}}}};
}
function protocolEntry(){const to='0x'+'22'.repeat(20),data='0x12345678';return {state:'pending',hash,message:'',review:{request:{module:'offers',action:'sale',args:{amount:'1'}},createdAt:Date.now(),gasCost:'1',transaction:{from:account,to,data,value:'0x0',chainId:'0x171',gas:'0x5208'},quote:{account,to,data,value:'0x0',block:100,blockHash,timestamp:Math.floor(Date.now()/1000),title:'Buy OINK',facts:[],warnings:[],fingerprint:'terms'}}};}
test('two pending miners survive reloads independently and block only their own action',()=>{
 const storage=memory(),old=globalThis.localStorage;globalThis.localStorage=storage;
 try{const a=entry(0),b=entry(1);position.writePositionJournal(a,storage);position.writePositionJournal(b,storage);
 assert.deepEqual(position.readPositionJournal(account,storage,a.review.request),a);
 assert.deepEqual(position.readPositionJournal(account,storage,b.review.request),b);
 assert.equal(position.listPositionJournals(account,storage).length,2);
 assert.throws(()=>position.assertNoPendingPosition(account,a.review.request),/already pending/);
 assert.doesNotThrow(()=>position.assertNoPendingPosition(account,entry(2).review.request));
 position.writePositionJournal({...a,state:'confirmed'},storage);
 assert.doesNotThrow(()=>position.assertNoPendingPosition(account,a.review.request));
 assert.throws(()=>position.assertNoPendingPosition(account,b.review.request),/already pending/);
 }finally{globalThis.localStorage=old;}
});
test('a pending protocol purchase cannot lock a miner and vice versa',()=>{
 const storage=memory(),old=globalThis.localStorage;globalThis.localStorage=storage;
 try{const a=entry(),b=protocolEntry();position.writePositionJournal(a,storage);protocol.writeProtocolJournal(b,storage);
 assert.doesNotThrow(()=>position.assertNoPendingPosition(account,entry(2).review.request));
 assert.doesNotThrow(()=>protocol.assertNoPendingProtocol(account,{...b.review.request,action:'another-action'}));
 assert.throws(()=>protocol.assertNoPendingProtocol(account,b.review.request),/already pending/);
 assert.throws(()=>position.assertNoPendingPosition(account,a.review.request),/already pending/);
 }finally{globalThis.localStorage=old;}
});
test('cancelled and stale no-hash prompts never require manual acknowledgement',()=>{
 const storage=memory(),old=globalThis.localStorage;globalThis.localStorage=storage;
 try{for(const state of ['requesting','uncertain','resolved']){const a=entry(0,state,null);position.writePositionJournal(a,storage);assert.doesNotThrow(()=>position.assertNoPendingPosition(account,a.review.request));}
 const b=protocolEntry();for(const state of ['requesting','uncertain','resolved']){protocol.writeProtocolJournal({...b,state,hash:null},storage);assert.doesNotThrow(()=>protocol.assertNoPendingProtocol(account,b.review.request));}
 }finally{globalThis.localStorage=old;}
});
test('changing amount, destination or recipient cannot bypass a pending operation',()=>{
 const a={type:'miner',id:'one-month',action:{kind:'deploy',amount:'1',recipient:account}};
 assert.equal(positionScope(a),positionScope({...a,action:{...a.action,amount:'999',recipient:'0x'+'22'.repeat(20)}}));
 const b=protocolEntry().review.request;assert.equal(protocolScope(b),protocolScope({...b,args:{amount:'999'}}));
});
test('legacy pending records protect the matching action without locking another miner',()=>{
 const storage=memory(),old=globalThis.localStorage;globalThis.localStorage=storage;
 try{const a=entry();storage.setItem('oink:position-transaction:v1:369:'+account,JSON.stringify(a));assert.throws(()=>position.assertNoPendingPosition(account,a.review.request),/already pending/);assert.doesNotThrow(()=>position.assertNoPendingPosition(account,entry(2).review.request));}finally{globalThis.localStorage=old;}
});
test('an unreadable unrelated legacy record does not become a site-wide lock',()=>{
 const storage=memory(),old=globalThis.localStorage;globalThis.localStorage=storage;
 try{storage.setItem('oink:position-transaction:v1:369:'+account,'broken');assert.doesNotThrow(()=>position.assertNoPendingPosition(account,entry().review.request));}finally{globalThis.localStorage=old;}
});
test('conflicting edits in one miner pool cannot bypass its pending transaction',()=>{
 const a=entry().review.request;
 assert.equal(positionScope(a),positionScope({...a,action:{kind:'transfer',index:4,recipient:account}}));
});
test('real default locks allow another miner pool while rejecting a duplicate active prompt',async()=>{
 const {submitPositionDirect}=await import('../src/lib/positionDirectFlow.ts');
 const oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),held=new Set();
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{async request(name,_options,run){if(held.has(name))return run(null);held.add(name);try{return await run({name});}finally{held.delete(name);}}}}});
 let release,entered;const gate=new Promise(r=>{release=r}),started=new Promise(r=>{entered=r});let sends=0;
 const a=entry(0),b=entry(1),options=request=>({account,request,provider:{},rpc:{},current:()=>true,onStage(){}});
 const deps={assertNoPendingPosition(){},async prepare(_rpc,_account,request){if(request.id===a.review.request.id){entered();await gate;}return request.id===a.review.request.id?a.review:b.review;},async send(){sends++;return hash;},write(){}};
 try{const first=submitPositionDirect(options(a.review.request),deps);await started;
 await assert.rejects(submitPositionDirect(options(a.review.request),deps),/wallet request/);
 assert.equal((await submitPositionDirect(options(b.review.request),deps)).state,'pending');
 release();await first;assert.equal(sends,2);
 }finally{release();if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});
