import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { Interface, toQuantity } from 'ethers';
registerHooks({ resolve(s,c,n) { try { return n(s,c); } catch(e) { if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e; } } });
const { readTreasuryHoldings, treasuryAccounts, treasuryActivityAssets } = await import('../src/lib/treasuryActivity.ts');
const { MULTICALL_ADDRESS, multicallInterface } = await import('../src/lib/snapshotMulticall.ts');
const runtime = JSON.parse(await readFile(new URL('./fixtures/multicall3-runtime.json',import.meta.url),'utf8')).result;
const abi = new Interface(['function balanceOf(address) view returns(uint256)','function decimals() view returns(uint8)']);
const head = 12345, timestamp = Math.floor(Date.now()/1000), hash = '0x'+'ab'.repeat(32);
const block = {number:toQuantity(head),timestamp:toQuantity(timestamp),hash};
function fixture({batching=true,code=runtime,failedAsset=null,wrongDecimals=null,reorg=false,onCall}={}) {
  const calls=[], getters=[];
  const encode = (address,data) => {
    const token = treasuryActivityAssets.find(a=>a.address.toLowerCase()===address.toLowerCase());
    assert.ok(token,'Only known assets may be queried');
    const fn = abi.parseTransaction({data});
    getters.push({address:address.toLowerCase(),fn:fn.name});
    if(token.symbol===failedAsset && fn.name==='balanceOf')throw Error('Token unavailable');
    return abi.encodeFunctionResult(fn.name,[fn.name==='decimals' ? BigInt(token.decimals+(token.symbol===wrongDecimals?1:0)) : 3n*10n**BigInt(token.decimals)]);
  };
  const rpc={snapshotBatching:batching,async send(method,params){
    calls.push({method,params});
    if(method==='eth_chainId')return toQuantity(369);
    if(method==='eth_getBlockByNumber')return {...block,hash:reorg&&params[0]!=='latest'?'0x'+'cd'.repeat(32):hash};
    if(method==='eth_getCode'){assert.equal(params[0],MULTICALL_ADDRESS);assert.equal(params[1],toQuantity(head));return code;}
    if(method==='eth_getBalance'){assert.equal(params[1],toQuantity(head));return toQuantity(5n*10n**18n);}
    assert.equal(method,'eth_call');
    assert.equal(params[1],toQuantity(head),'Every getter must use the same block');
    await onCall?.();
    const tx=params[0];
    if(tx.to===MULTICALL_ADDRESS){
      const [items]=multicallInterface.decodeFunctionData('aggregate3',tx.data);
      return multicallInterface.encodeFunctionResult('aggregate3',[items.map(item=>{
        assert.equal(item.allowFailure,true);
        try{return [true,encode(item.target,item.callData)];}catch{return [false,'0x'];}
      })]);
    }
    return encode(tx.to,tx.data);
  }};
  return {rpc,calls,getters};
}

test('treasury batches every owner at one block and avoids per-owner metadata reads',async()=>{
  const direct=fixture({batching:false}),batched=fixture();
  const plain=await readTreasuryHoldings(direct.rpc),grouped=await readTreasuryHoldings(batched.rpc);
  assert.deepEqual(grouped,plain);
  assert.equal(grouped.rows.length,treasuryAccounts.length);
  for(const row of grouped.rows){
    assert.equal(row.assets[0].balance,'5.0');
    assert.ok(row.assets.slice(1).every(asset=>asset.balance==='3.0'));
  }
  const tokens=treasuryActivityAssets.length;
  assert.equal(direct.getters.filter(g=>g.fn==='decimals').length,tokens);
  assert.equal(batched.getters.filter(g=>g.fn==='decimals').length,tokens);
  const individualCalls=direct.calls.filter(c=>c.method==='eth_call').length;
  const multicalls=batched.calls.filter(c=>c.method==='eth_call').length;
  assert.equal(individualCalls,tokens*(treasuryAccounts.length+1));
  assert.equal(multicalls,Math.ceil(individualCalls/40));
  assert.equal(batched.calls.filter(c=>c.method==='eth_getCode').length,1);
  console.log(`Treasury fixture: ${tokens} tokens, ${treasuryAccounts.length} owners, ${individualCalls} individual getter calls versus ${multicalls} verified multicalls.`);
});

test('one failed balance or changed decimals cannot hide other balances or create a zero',async()=>{
  for(const options of [{failedAsset:'OINK'},{wrongDecimals:'OINK'}]){
    const result=await readTreasuryHoldings(fixture(options).rpc,[treasuryAccounts[0]]);
    assert.equal(result.rows[0].assets.find(a=>a.symbol==='OINK').balance,null);
    assert.equal(result.rows[0].assets.find(a=>a.symbol==='PLS').balance,'5.0');
    assert.ok(result.rows[0].assets.filter(a=>a.symbol!=='OINK'&&a.symbol!=='PLS').every(a=>a.balance==='3.0'));
  }
});

test('unsupported multicall runtime falls back to individual pinned reads',async()=>{
  const unsupported=fixture({code:'0x6000'}),direct=fixture({batching:false});
  assert.deepEqual(await readTreasuryHoldings(unsupported.rpc,[treasuryAccounts[0]]),await readTreasuryHoldings(direct.rpc,[treasuryAccounts[0]]));
  assert.ok(unsupported.calls.filter(c=>c.method==='eth_call').every(c=>c.params[0].to!==MULTICALL_ADDRESS));
});

test('a reorganized block cannot publish holdings',async()=>{
  await assert.rejects(readTreasuryHoldings(fixture({reorg:true}).rpc),/Snapshot changed/);
});

test('an aborted treasury snapshot stops queued reads and never publishes partial holdings',async()=>{
  const pre=new AbortController();pre.abort();const unused=fixture();
  await assert.rejects(readTreasuryHoldings(unused.rpc,treasuryAccounts,pre.signal));
  assert.equal(unused.calls.length,0);
  const controller=new AbortController(),during=fixture({onCall:()=>controller.abort()});
  await assert.rejects(readTreasuryHoldings(during.rpc,treasuryAccounts,controller.signal));
  assert.equal(during.calls.filter(c=>c.method==='eth_getBlockByNumber'&&c.params[0]!=='latest').length,0);
});
