import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {parseEther,toQuantity} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {readRpcPortfolioHistory}=await import('../src/lib/portfolioHistoryRpc.ts');
const {portfolioMinerEvents:miners,portfolioFarmEvents:farms,portfolioHexEvents:hex}=await import('../src/lib/portfolioHistoryModel.ts');
const account='0x'+'1'.repeat(40),other='0x'+'2'.repeat(40);
const sources=[
  {address:'0x'+'3'.repeat(40),id:'miner',label:'Test miner',kind:'miners',symbol:'OINK',decimals:18},
  {address:'0x'+'4'.repeat(40),id:'farm',label:'Test farm',kind:'farms',symbol:'LP',decimals:18},
  {address:'0x'+'5'.repeat(40),id:'hex',label:'Test HEX shares',kind:'hex',symbol:'HEX shares',decimals:0},
];
const hash=block=>'0x'+BigInt(block).toString(16).padStart(64,'0');
const blockTimeBase=Math.floor(Date.now()/1000)-100;
const header=block=>({number:toQuantity(block),hash:hash(block),timestamp:toQuantity(blockTimeBase+block)});
function event(abi,name,args,source,block,index=0){return {...abi.encodeEventLog(abi.getEvent(name),args),address:source.address,blockNumber:toQuantity(block),blockHash:hash(block),logIndex:toQuantity(index),transactionHash:hash(block*100+index),removed:false};}
const fixtures=()=>[
  event(miners,'Deposit',[account,parseEther('10'),1n,1n],sources[0],16),
  event(miners,'GiftDeposit',[other,account,parseEther('5'),1n,1n],sources[0],17),
  event(miners,'GiftDeposit',[account,account,parseEther('2'),1n,1n],sources[0],18),
  event(farms,'SelfHarvest',[account,account,parseEther('3'),0n],sources[1],20),
  event(hex,'Harvest',[account,account,parseEther('4'),0n],sources[2],20,1),
];
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
function mock(options={}){
  const calls=[];
  const rpc={async send(method,params){
    calls.push({method,params});
    if(method==='eth_chainId')return options.wrongChain?'0x1':'0x171';
    if(method==='eth_getBlockByNumber'){
      const block=params[0]==='latest'?(options.head??100):Number(BigInt(params[0]));
      if(block===options.hangTimestamp)return new Promise(()=>{});
      const result=header(block);
      if(params[0]==='latest'&&options.staleHead)result.timestamp=toQuantity(Math.floor(Date.now()/1000)-200);
      if(params[0]==='latest'&&options.futureHead)result.timestamp=toQuantity(Math.floor(Date.now()/1000)+60);
      if(params[0]!=='latest'&&block===options.changedBlock)result.hash=hash(999999);
      if(block===options.badTimestamp)result.timestamp='invalid';
      return result;
    }
    assert.equal(method,'eth_getLogs');
    const query=params[0],recipient=query.topics.length===3;
    if(recipient&&options.failRecipient)throw Error('This filter is unavailable');
    if(!recipient&&options.hangSender)return new Promise(()=>{});
    if(recipient&&options.recipientDeferred)await options.recipientDeferred.promise;
    if(!recipient&&options.senderDeferred)await options.senderDeferred.promise;
    return (options.logs??fixtures()).filter(log=>query.address.map(a=>a.toLowerCase()).includes(log.address.toLowerCase())&&BigInt(log.blockNumber)>=BigInt(query.fromBlock)&&BigInt(log.blockNumber)<=BigInt(query.toBlock)&&log.topics[recipient?2:1]?.toLowerCase()===query.topics[recipient?2:1]?.toLowerCase());
  }};
  return {rpc,calls};
}
const read=(context,options={})=>readRpcPortfolioHistory(context.rpc,account,sources,new AbortController().signal,options.onProgress,options.previous,options.reader);

test('direct wallet history uses two fixed-block log groups and real timestamp headers',async()=>{
  const context=mock(),progress=[];
  const result=await read(context,{onProgress:value=>progress.push(value)});
  assert.equal(result.rows.length,5,'Duplicate indexed self-gifts are counted once');
  assert.equal(result.failed,0);assert.equal(result.capped,0);assert.equal(result.toBlock,100);assert.equal(result.blockHash,hash(100));
  assert.equal(result.sources,3);assert.equal(result.account,account);
  assert.equal(result.rows[0].timestamp,blockTimeBase+16);
  assert.equal(result.rows.reduce((total,row)=>total+parseEther(row.deposited),0n),parseEther('17'));
  const queries=context.calls.filter(row=>row.method==='eth_getLogs');
  assert.equal(queries.length,2);
  assert.ok(queries.every(row=>row.params[0].fromBlock==='0x0'&&row.params[0].toBlock==='0x64'));
  assert.equal(queries[0].params[0].address.length,3);assert.equal(queries[1].params[0].address.length,1);
  assert.equal(context.calls.filter(row=>row.method==='eth_getBlockByNumber'&&row.params[0]==='0x14').length,1,'One timestamp read per event block');
  assert.ok(progress.some(value=>value.rows.length>0&&value.failed>0),'Early rows are honestly marked incomplete');
  assert.equal(progress.at(-1).failed,0);
});

test('a stalled log group cannot hide another group or exceed the reader deadline',async()=>{
  const context=mock({hangSender:true}),progress=[];
  const pending=read(context,{onProgress:value=>progress.push(value),reader:{timeoutMs:40}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.ok(progress.some(value=>value.rows.length===2&&value.failed>0),'Recipient events appear while sender query is still waiting');
  const result=await pending;
  assert.equal(result.rows.length,2);assert.ok(result.failed>0);
  assert.ok(result.rows.every(row=>row.category==='miners'));
});

test('a failed group yields partial data and all failed groups never masquerade as an empty successful history',async()=>{
  const partial=await read(mock({failRecipient:true}));
  assert.equal(partial.rows.length,4);assert.ok(partial.failed>0);
  const context=mock();
  const rpc={send:(method,params)=>method==='eth_getLogs'?Promise.reject(Error('Offline')):context.rpc.send(method,params)};
  const failed=await readRpcPortfolioHistory(rpc,account,sources,new AbortController().signal);
  assert.equal(failed.rows.length,0);assert.equal(failed.failed,2);
});

test('wrong chains and changed canonical heads are rejected',async()=>{
  await assert.rejects(()=>read(mock({wrongChain:true})),/PulseChain/);
  await assert.rejects(()=>read(mock({changedBlock:100})),/snapshot changed/);
});

test('a stale or future RPC tip cannot be reported as the newest history',async()=>{
  await assert.rejects(()=>read(mock({staleHead:true})),/Fresh wallet history head/);
  await assert.rejects(()=>read(mock({futureHead:true})),/Fresh wallet history head/);
});

test('bad timestamp or log block hash is excluded and marks history partial',async()=>{
  const badTimestamp=await read(mock({badTimestamp:16}));
  assert.equal(badTimestamp.rows.length,4);assert.ok(badTimestamp.failed>0);
  const logs=fixtures();logs[0].blockHash=hash(555);
  const badHash=await read(mock({logs}));
  assert.equal(badHash.rows.length,4);assert.ok(badHash.failed>0);
  assert.ok(badHash.rows.every(row=>row.timestamp>0));
  const malformed=fixtures().map(log=>({...log,transactionHash:'invalid'}));
  const result=await read(mock({logs:malformed}));
  assert.equal(result.rows.length,0);assert.ok(result.failed>0,'Malformed responses cannot become a successful zero history');
});

test('timestamp concurrency is bounded and a stalled timestamp preserves already checked events at deadline',async()=>{
  const context=mock();let active=0,peak=0;
  const rpc={async send(method,params){
    if(method==='eth_getBlockByNumber'&&params[0]!=='latest'&&BigInt(params[0])<100n){
      active++;peak=Math.max(peak,active);
      try{await new Promise(resolve=>setTimeout(resolve,3));return await context.rpc.send(method,params);}finally{active--;}
    }
    return context.rpc.send(method,params);
  }};
  const complete=await readRpcPortfolioHistory(rpc,account,sources,new AbortController().signal,undefined,undefined,{timestampConcurrency:2});
  assert.equal(complete.rows.length,5);assert.equal(peak,2);
  const result=await read(mock({hangTimestamp:16}),{reader:{timeoutMs:40,timestampConcurrency:2}});
  assert.equal(result.rows.length,4);assert.ok(result.failed>0);
  assert.ok(!result.rows.some(row=>row.block===16));
});

test('a complete canonical prior read refreshes only new blocks and retains previous events once',async()=>{
  const previous=await read(mock());
  const newest=event(miners,'Deposit',[account,parseEther('8'),1n,1n],sources[0],101);
  const context=mock({head:101,logs:[...fixtures(),newest]});
  const result=await read(context,{previous});
  assert.equal(result.rows.length,6);assert.equal(result.failed,0);assert.equal(result.toBlock,101);
  assert.ok(context.calls.filter(row=>row.method==='eth_getLogs').every(row=>row.params[0].fromBlock==='0x65'));
  assert.equal(result.rows.filter(row=>row.key===previous.rows[0].key).length,1);
});

test('changed anchors, partial prior reads and another wallet force a full scan',async()=>{
  const previous=await read(mock());
  for(const prior of [previous,{...previous,failed:1},{...previous,account:other}]){
    const context=mock({head:101,changedBlock:100,logs:fixtures().slice(1)});
    const result=await read(context,{previous:prior});
    assert.equal(result.rows.length,4);assert.ok(!result.rows.some(row=>row.block===16),'Do not retain orphaned prior events');
    assert.ok(context.calls.filter(row=>row.method==='eth_getLogs').every(row=>row.params[0].fromBlock==='0x0'));
  }
});

test('an unchanged completed head needs no event rescan',async()=>{
  const previous=await read(mock());
  const context=mock(),result=await read(context,{previous});
  assert.equal(result.rows.length,5);assert.equal(result.failed,0);
  assert.equal(context.calls.filter(row=>row.method==='eth_getLogs').length,0);
});

test('wallet abort settles promptly and late RPC completions cannot publish',async()=>{
  const senderDeferred=deferred(),recipientDeferred=deferred(),controller=new AbortController(),progress=[];
  const context=mock({senderDeferred,recipientDeferred});
  const pending=readRpcPortfolioHistory(context.rpc,account,sources,controller.signal,value=>progress.push(value));
  await new Promise(resolve=>setImmediate(resolve));
  controller.abort(Error('Wallet changed'));
  await assert.rejects(()=>pending,/Wallet changed/);
  senderDeferred.resolve();recipientDeferred.resolve();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(progress.length,0);
});
