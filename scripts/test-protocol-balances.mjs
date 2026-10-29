import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, toQuantity, parseEther, ZeroAddress } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { readProtocolBalances, protocolBalanceRows } = await import('../src/lib/protocolBalances.ts');
const { CORE_CONTRACTS } = await import('../src/config/contracts.ts');
const chef = CORE_CONTRACTS.find(row => row.id === 'inflation').address;
const governor = CORE_CONTRACTS.find(row => row.id === 'governor').address;
const abi = new Interface(['function decimals() view returns(uint8)','function owner() view returns(address)','function governor() view returns(address)','function totalSupply() view returns(uint256)','function virtualTotalSupply() view returns(uint256)','function balanceOf(address) view returns(uint256)','function credit(address) view returns(uint256)']);
function rpc(options={}) {
  const block={number:'0x100',hash:'0x'+'ab'.repeat(32),timestamp:toQuantity(Math.floor(Date.now()/1000)-(options.stale?500:0))};
  let blockReads=0;
  return { async send(method,args) {
    if(method==='eth_chainId')return options.wrongChain?'0x1':'0x171';
    if(method==='eth_getBlockByNumber')return options.reorg&&blockReads++?{...block,hash:'0x'+'cd'.repeat(32)}:block;
    assert.equal(method,'eth_call'); assert.equal(args[1],block.number);
    const call=abi.parseTransaction(args[0]);
    if(call.name==='decimals')return abi.encodeFunctionResult(call.name,[18n]);
    if(call.name==='owner')return abi.encodeFunctionResult(call.name,[chef]);
    if(call.name==='governor')return abi.encodeFunctionResult(call.name,[options.badMapping?ZeroAddress:governor]);
    if(options.creditFailure&&call.name==='credit')throw Error('credit unavailable');
    return abi.encodeFunctionResult(call.name,[call.name==='credit'?parseEther('2.123456789012345678'):parseEther('42')]);
  }};
}
test('all public supply and reserve values share a fresh block and preserve decimal precision',async()=>{
  const result=await readProtocolBalances(rpc());
  assert.equal(result.rows.length,protocolBalanceRows.length);
  assert.equal(result.block,256);
  assert.equal(result.rows.find(row=>row.id==='contributors').value,'2.123456789012345678');
  assert.ok(result.rows.some(row=>row.id==='virtual'));
  assert.ok(result.rows.some(row=>row.id==='legacy-referral'));
});
test('a failed credit read is unavailable without hiding unrelated reserve values',async()=>{
  const result=await readProtocolBalances(rpc({creditFailure:true}));
  assert.equal(result.rows.find(row=>row.id==='contributors').value,null);
  assert.equal(result.rows.find(row=>row.id==='treasury').value,'42.0');
});
test('wrong chain, stale block, changed token mapping and a changed canonical block reject the snapshot',async()=>{
  for(const options of [{wrongChain:true},{stale:true},{badMapping:true},{reorg:true}])await assert.rejects(readProtocolBalances(rpc(options)));
});
