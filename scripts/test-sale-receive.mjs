import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface,ZeroAddress,parseEther,parseUnits,toQuantity} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {saleAmountMath,saleSpendableBalance}=await import('../src/lib/saleAmounts.ts');
const {readSale,readSaleMaximum,SALE_ADDRESS,SALE_DESTINATIONS}=await import('../src/lib/miningOffers.ts');
const {OINK_TOKEN}=await import('../src/config/contracts.ts');
const abi=new Interface(['function DTX() view returns(address)','function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function getOinkPerPLSPrice() view returns(uint256)','function priceWithDiscount(address,uint256) pure returns(uint256)',...['PLSX','INC','HEX'].map(a=>`function get${a}PerPLSPrice() view returns(uint256)`),...['PLS','PLSX','INC','HEX'].map(a=>`function getWith${a}(uint256,address) view returns(uint256)`)]);
const account='0x1111111111111111111111111111111111111111';
const basePrice=241075587439873811n;
const paymentPrices={PLSX:410075000000000000n,INC:179837000000000n,HEX:1348970000000000n};
const multiplier=pool=>({'wallet':100n,'one-year':111n,'three-year':118n,'five-year':125n})[SALE_DESTINATIONS.find(row=>row.address.toLowerCase()===pool.toLowerCase()).id];
const forward=(asset,payment,pool)=>{
  const pls=asset==='PLS'?payment:payment*10n**BigInt(asset==='HEX'?28:18)/paymentPrices[asset];
  return pls*(basePrice*multiplier(pool)/100n)/10n**18n;
};
function mock(asset,options={}){
  const decimals=asset==='HEX'?8:18;
  const block={number:'0x100',hash:'0x'+'ab'.repeat(32),timestamp:toQuantity(Math.floor(Date.now()/1000))};
  const inventory=options.inventory??parseEther('100000');
  const balance=options.balance??parseUnits('1000',decimals);
  const gasPrice=options.gasPrice??10n**9n;
  const rpc={async send(method,params){
    if(method==='eth_chainId')return options.wrongChain?'0x1':'0x171';
    if(method==='eth_getBlockByNumber')return block;
    if(method==='eth_gasPrice'){if(options.failBalance)throw Error('Fee unavailable');return toQuantity(gasPrice);}
    if(method==='eth_getBalance'){assert.equal(params[1],block.number);if(options.failBalance)throw Error('Balance unavailable');return toQuantity(balance);}
    assert.equal(method,'eth_call');assert.equal(params[1],block.number,'sale, rates, balances must share a block');
    const tx=abi.parseTransaction(params[0]);
    let value;
    if(tx.name==='DTX')value=OINK_TOKEN;
    else if(tx.name==='decimals')value=options.wrongDecimals?6:decimals;
    else if(tx.name==='allowance')value=0n;
    else if(tx.name==='balanceOf'){
      if(tx.args[0].toLowerCase()===SALE_ADDRESS.toLowerCase())value=inventory;
      else{if(options.failBalance)throw Error('Balance unavailable');value=balance;}
    }
    else if(tx.name==='getOinkPerPLSPrice')value=basePrice;
    else if(tx.name==='priceWithDiscount')value=tx.args[1]*multiplier(tx.args[0])/100n;
    else if(/^get(PLSX|INC|HEX)PerPLSPrice$/.test(tx.name))value=paymentPrices[tx.name.slice(3,-11)];
    else if(tx.name.startsWith('getWith'))value=options.mismatchedQuote?1n:forward(asset,tx.args[0],tx.args[1]);
    else throw Error('Unexpected method '+tx.name);
    return abi.encodeFunctionResult(tx.name,[value]);
  }};
  return {rpc,inventory,balance,gasPrice};
}

test('reverse quotes all four assets and all destinations with the smallest sufficient payment',async()=>{
  const desired=parseEther('125.123456789123456789');
  for(const asset of ['PLS','PLSX','INC','HEX'])for(const destination of SALE_DESTINATIONS){
    const result=await readSale(mock(asset).rpc,asset,'125.123456789123456789',destination.id,account,'receive');
    assert.equal(result.quoteError,'');
    const payment=parseUnits(result.paymentAmount,asset==='HEX'?8:18);
    assert.ok(forward(asset,payment,destination.address)>=desired);
    assert.ok(forward(asset,payment-1n,destination.address)<desired,'one smallest token unit less must be insufficient');
    assert.equal(parseEther(result.quote),forward(asset,payment,destination.address));
    assert.equal(parseEther(result.baseQuote),forward(asset,payment,ZeroAddress));
    assert.equal(parseEther(result.baseQuote)+parseEther(result.bonusQuote),parseEther(result.quote));
  }
});

test('Max cannot exceed either spendable wallet balance or actual inventory',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX'])for(const inventory of [1n,parseEther('2'),parseEther('1000000')]){
    const context=mock(asset,{inventory});
    const result=await readSale(context.rpc,asset,'','five-year',account,'receive');
    const max=parseEther(result.maxReceive);
    assert.ok(max<=inventory);
    const reserve=asset==='PLS'?context.gasPrice*2_000_000n:0n;
    assert.equal(result.gasReserve,asset==='PLS'?'0.002':null);
    if(max>0n){
      const quote=await readSale(context.rpc,asset,result.maxReceive,'five-year',account,'receive');
      assert.ok(parseUnits(quote.paymentAmount,asset==='HEX'?8:18)<=context.balance-reserve);
      assert.equal(quote.quoteFunded,true);assert.equal(quote.balanceEnough,true);
    }
  }
});

test('explicit Max returns a funded matching quote for every payment asset and destination',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX'])for(const destination of SALE_DESTINATIONS){
    for(const inventory of [parseEther('2'),parseEther('1000000')]){
      const context=mock(asset,{inventory});
      const result=await readSaleMaximum(context.rpc,asset,destination.id,account);
      const payment=parseUnits(result.paymentAmount,asset==='HEX'?8:18);
      assert.equal(parseEther(result.maxReceive),parseEther(result.quote));
      assert.equal(result.quoteFunded,true);assert.equal(result.balanceEnough,true);
      assert.ok(payment<=context.balance-(asset==='PLS'?context.gasPrice*2_000_000n:0n));
      assert.equal(parseEther(result.quote),forward(asset,payment,destination.address));
      assert.ok(parseEther(result.quote)<=inventory);
      assert.equal(parseEther(result.baseQuote)+parseEther(result.bonusQuote),parseEther(result.quote));
    }
  }
});

test('explicit Max rejects unavailable balances, empty inventory and invalid contract quotes',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX']){
    await assert.rejects(()=>readSaleMaximum(mock(asset,{balance:0n}).rpc,asset,'five-year',account),/available|spendable/);
    await assert.rejects(()=>readSaleMaximum(mock(asset,{inventory:0n}).rpc,asset,'five-year',account),/no OINK/);
    await assert.rejects(()=>readSaleMaximum(mock(asset,{failBalance:true}).rpc,asset,'five-year',account),/Could not load Max/);
    await assert.rejects(()=>readSaleMaximum(mock(asset,{mismatchedQuote:true}).rpc,asset,'five-year',account),/Could not confirm/);
  }
});

test('PLS Max reserves fees and zero spendable balance cannot masquerade as a valid maximum',async()=>{
  assert.deepEqual(saleSpendableBalance(100n,1n),{reserve:2_000_000n,spendable:0n});
  assert.deepEqual(saleSpendableBalance(100n,null),{reserve:0n,spendable:100n});
  assert.throws(()=>saleSpendableBalance(100n,0n));
  const result=await readSale(mock('PLS',{balance:1n}).rpc,'PLS','10','wallet',account,'receive');
  assert.equal(result.maxReceive,'0.0');assert.equal(result.balanceEnough,false);
});

test('manual public quotes work without a wallet, and unavailable Max never fabricates a balance',async()=>{
  const publicQuote=await readSale(mock('PLS').rpc,'PLS','10','wallet',null,'receive');
  assert.ok(publicQuote.paymentAmount);assert.equal(publicQuote.maxReceive,null);
  for(const asset of ['PLS','HEX']){
    const result=await readSale(mock(asset,{failBalance:true}).rpc,asset,'10','wallet',account,'receive');
    assert.ok(result.quote);assert.equal(result.maxReceive,null);assert.ok(result.maxError);
    assert.equal(result.balanceEnough,null);
  }
});

test('mismatched output, invalid inputs, insufficient inventory and changed precision fail safely',async()=>{
  const mismatch=await readSale(mock('PLS',{mismatchedQuote:true}).rpc,'PLS','10','wallet',account,'receive');
  assert.equal(mismatch.quote,null);assert.equal(mismatch.quoteFunded,false);
  for(const amount of ['bad','0','1e3','1.0000000000000000001']){
    const result=await readSale(mock('PLS').rpc,'PLS',amount,'wallet',account,'receive');
    assert.equal(result.quote,null);assert.ok(result.quoteError);
  }
  const inventory=await readSale(mock('PLS',{inventory:1n}).rpc,'PLS','10','wallet',account,'receive');
  assert.equal(inventory.quoteFunded,false);assert.ok(inventory.quote);
  await assert.rejects(()=>readSale(mock('HEX',{wrongDecimals:true}).rpc,'HEX','10','wallet',account,'receive'),/precision/);
  await assert.rejects(()=>readSale(mock('PLS',{wrongChain:true}).rpc,'PLS','10','wallet',account,'receive'),/PulseChain/);
});

test('inverse helper handles tiny OINK targets and indivisible HEX payments without rounding down',()=>{
  const math=saleAmountMath(3n*10n**18n,7n*10n**18n,8);
  for(const desired of [1n,17n,10n**18n,123456789123456789n]){
    const payment=math.payment(desired);
    assert.ok(math.output(payment)>=desired);assert.ok(math.output(payment-1n)<desired);
  }
});
