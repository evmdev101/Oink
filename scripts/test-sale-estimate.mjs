import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface,ZeroAddress,toQuantity,parseEther} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {readSale,SALE_DESTINATIONS}=await import('../src/lib/miningOffers.ts');
const {OINK_TOKEN}=await import('../src/config/contracts.ts');
const abi=new Interface(['function DTX() view returns(address)','function balanceOf(address) view returns(uint256)',...['PLS','PLSX','INC','HEX'].map(a=>`function getWith${a}(uint256,address) view returns(uint256)`)]);
const base=123456789012345678901n;
function mock(options={}) {
  const calls=[];
  const block={number:'0x100',hash:'0x'+'ab'.repeat(32),timestamp:toQuantity(Math.floor(Date.now()/1000))};
  const rpc={async send(method,params){
    if(method==='eth_chainId')return '0x171';
    if(method==='eth_getBlockByNumber')return block;
    assert.equal(method,'eth_call');
    assert.equal(params[1],block.number,'base and destination quotes must use the same block');
    const tx=abi.parseTransaction(params[0]);
    if(tx.name==='DTX')return abi.encodeFunctionResult(tx.name,[OINK_TOKEN]);
    if(tx.name==='balanceOf')return abi.encodeFunctionResult(tx.name,[options.inventory??parseEther('1000')]);
    calls.push({method:tx.name,amount:tx.args[0],destination:tx.args[1]});
    if(options.fail)throw Error('Quote unavailable');
    const pool=SALE_DESTINATIONS.find(row=>row.address.toLowerCase()===tx.args[1].toLowerCase());
    const multiplier=({'one-year':111n,'three-year':118n,'five-year':125n,wallet:100n})[pool.id];
    return abi.encodeFunctionResult(tx.name,[options.zero?0n:base*multiplier/100n]);
  }};
  return {rpc,calls};
}
test('each payment asset uses its correct decimals and quotes base plus all miner destinations exactly once',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX'])for(const destination of SALE_DESTINATIONS){
    const {rpc,calls}=mock();
    const result=await readSale(rpc,asset,'1.25',destination.id);
    assert.equal(calls[0].amount,125n*10n**BigInt((asset==='HEX'?8:18)-2));
    assert.equal(calls[0].method,'getWith'+asset);
    assert.equal(parseEther(result.baseQuote),base);
    assert.equal(parseEther(result.baseQuote)+parseEther(result.bonusQuote),parseEther(result.quote));
    assert.equal(result.quoteFunded,true);
    assert.equal(calls.length,destination.id==='wallet'?1:2);
    if(destination.id==='wallet')assert.equal(result.bonusQuote,'0.0');
    else assert.equal(calls[1].destination,ZeroAddress);
  }
});
test('an amount above sale inventory keeps an honest estimate but is not purchasable',async()=>{
  const result=await readSale(mock({inventory:1n}).rpc,'PLS','10000','five-year');
  assert.ok(result.quote);
  assert.equal(result.quoteFunded,false);
});
test('empty, invalid, failed and zero-output quotes never produce a purchasable estimate',async()=>{
  for(const [amount,options] of [['',{}],['bad',{}],['0',{}],['1',{fail:true}],['1',{zero:true}]]){
    const result=await readSale(mock(options).rpc,'PLS',amount,'five-year');
    assert.equal(result.quote,null);
    assert.equal(result.baseQuote,null);
    assert.equal(result.bonusQuote,null);
    assert.equal(result.quoteFunded,false);
    assert.equal(!!result.quoteError,!!amount);
  }
});
