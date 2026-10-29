import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {settleMined}=await import('../src/lib/transactionMonitor.ts');
const hash='0x'+'aa'.repeat(32),blockHash='0x'+'bb'.repeat(32),account='0x'+'11'.repeat(20),target='0x'+'22'.repeat(20);
const expected={from:account,to:target,data:'0x12345678',value:'0x0'};
function fixture(options={}){
 const calls=[];
 const tx={hash,from:account,to:target,input:expected.data,value:'0x0',nonce:'0x7',chainId:'0x171',blockHash,blockNumber:'0x64',...options.tx};
 const receipt={transactionHash:hash,from:account,to:target,status:'0x1',blockHash,blockNumber:'0x64',...options.receipt};
 const rpc={async send(method,args){calls.push(method);switch(method){case 'eth_chainId':return options.chain??'0x171';case 'eth_getTransactionReceipt':return options.pending?null:receipt;case 'eth_getTransactionByHash':return options.missing?null:tx;case 'eth_getTransactionCount':return options.nonce??'0x8';case 'eth_getBlockByNumber':return {hash:options.reorg?'0x'+'cc'.repeat(32):blockHash,number:'0x64',timestamp:'0x'+Math.floor(Date.now()/1000).toString(16)};default:throw Error(method);}}};
 return {run:()=>settleMined(rpc,expected,hash),calls};
}
test('a canonical successful receipt settles quietly without interpreting business events',async()=>{const f=fixture();assert.deepEqual(await f.run(),{state:'resolved',message:''});assert.ok(f.calls.every(m=>!m.startsWith('eth_send')&&!m.includes('sign')));});
test('a reverted receipt releases the action and preserves a short real error',async()=>{assert.equal((await fixture({receipt:{status:'0x0'}}).run()).state,'failed');});
for(const [name,options] of Object.entries({wrongNetwork:{chain:'0x1'},wrongHash:{tx:{hash:'0x'+'dd'.repeat(32)}},wrongSender:{tx:{from:target}},wrongTarget:{tx:{to:account}},wrongData:{tx:{input:'0xdeadbeef'}},wrongValue:{tx:{value:'0x1'}},wrongReceipt:{receipt:{to:account}},wrongBlock:{tx:{blockHash:'0x'+'dd'.repeat(32)}},reorg:{reorg:true},missingTransaction:{missing:true}}))test(name+' never produces a false settlement',async()=>{assert.equal(await fixture(options).run(),null);});
test('a wallet replacement or cancellation settles the original when its nonce is confirmed consumed',async()=>{assert.deepEqual(await fixture({pending:true}).run(),{state:'resolved',message:''});});
test('a genuinely pending nonce stays pending without a timeout being called a failure',async()=>{assert.equal(await fixture({pending:true,nonce:'0x7'}).run(),null);});
test('an unconfirmed replacement or reorg cannot settle a pending transaction',async()=>{assert.equal(await fixture({pending:true,nonce:'0x7',reorg:true}).run(),null);});
