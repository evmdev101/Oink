import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface,parseEther,parseUnits,toQuantity} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {saleAmountMath}=await import('../src/lib/saleAmounts.ts');
const {readSale,SALE_ADDRESS,SALE_DESTINATIONS}=await import('../src/lib/miningOffers.ts');
const {OINK_TOKEN}=await import('../src/config/contracts.ts');
const abi=new Interface(['function DTX() view returns(address)','function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function getOinkPerPLSPrice() view returns(uint256)','function priceWithDiscount(address,uint256) pure returns(uint256)',...['PLSX','INC','HEX'].map(a=>`function get${a}PerPLSPrice() view returns(uint256)`),...['PLS','PLSX','INC','HEX'].map(a=>`function getWith${a}(uint256,address) view returns(uint256)`)]);
const account='0x1111111111111111111111111111111111111111';
const basePrice=241075587439873811n;
const paymentPrices={PLSX:410075000000000000n,INC:179837000000000n,HEX:1348970000000000n};
const multiplier=pool=>({wallet:100n,'one-year':111n,'three-year':118n,'five-year':125n})[SALE_DESTINATIONS.find(row=>row.address.toLowerCase()===pool.toLowerCase()).id];
const inventory=parseEther('20318.713204656227722294');
const decimals=asset=>asset==='HEX'?8:18;
const forward=(asset,payment,pool)=>{
  const pls=asset==='PLS'?payment:payment*10n**BigInt(asset==='HEX'?28:18)/paymentPrices[asset];
  return pls*(basePrice*multiplier(pool)/100n)/10n**18n;
};
function mock(asset,options={}){
  const block={number:'0x100',hash:'0x'+'ab'.repeat(32),timestamp:toQuantity(Math.floor(Date.now()/1000))};
  return {async send(method,params){
    if(method==='eth_chainId')return '0x171';
    if(method==='eth_getBlockByNumber')return block;
    if(method==='eth_gasPrice')return toQuantity(10n**9n);
    if(method==='eth_getBalance'){
      assert.equal(params[1],block.number);
      if(options.failBalance)throw Error('Balance unavailable');
      return toQuantity(options.balance??0n);
    }
    assert.equal(method,'eth_call');assert.equal(params[1],block.number);
    const tx=abi.parseTransaction(params[0]);let value;
    if(tx.name==='DTX')value=OINK_TOKEN;
    else if(tx.name==='decimals')value=decimals(asset);
    else if(tx.name==='allowance')value=0n;
    else if(tx.name==='balanceOf'){
      if(tx.args[0].toLowerCase()===SALE_ADDRESS.toLowerCase())value=options.inventory??inventory;
      else{if(options.failBalance)throw Error('Balance unavailable');value=options.balance??0n;}
    }
    else if(tx.name==='getOinkPerPLSPrice')value=basePrice;
    else if(tx.name==='priceWithDiscount')value=tx.args[1]*multiplier(tx.args[0])/100n;
    else if(/^get(PLSX|INC|HEX)PerPLSPrice$/.test(tx.name))value=paymentPrices[tx.name.slice(3,-11)];
    else if(tx.name.startsWith('getWith'))value=forward(asset,tx.args[0],tx.args[1]);
    else throw Error('Unexpected method '+tx.name);
    return abi.encodeFunctionResult(tx.name,[value]);
  }};
}

test('inventory Max selects full available OINK across all assets and destinations despite small or zero wallet balances',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX'])for(const destination of SALE_DESTINATIONS){
    for(const balance of [0n,parseUnits('0.0001',decimals(asset))]){
      const result=await readSale(mock(asset,{balance}),asset,'',destination.id,account,'receive',{maximum:'inventory'});
      const output=parseEther(result.maxReceive),payment=parseUnits(result.paymentAmount,decimals(asset));
      assert.equal(result.quote,result.maxReceive);
      assert.equal(result.quoteFunded,true);assert.equal(result.balanceEnough,false);
      assert.ok(output<=inventory);assert.ok(output>parseEther('20318.713'));
      assert.equal(output,forward(asset,payment,destination.address));
      // The next attainable output must exceed inventory, so this cannot select
      // an arbitrary wallet-sized subset of the sale's OINK.
      const math=saleAmountMath(basePrice*multiplier(destination.address)/100n,asset==='PLS'?null:paymentPrices[asset],decimals(asset));
      assert.equal(output,math.inventoryMaximum(inventory));
      assert.ok(math.output(math.payment(inventory+1n))>inventory);
      assert.equal(parseEther(result.baseQuote)+parseEther(result.bonusQuote),output);
    }
  }
});

test('inventory Max remains a funded estimate without a connected wallet or a readable wallet balance',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX']){
    const publicQuote=await readSale(mock(asset),asset,'','five-year',null,'receive',{maximum:'inventory'});
    assert.ok(publicQuote.maxReceive);assert.equal(publicQuote.quoteFunded,true);
    assert.equal(publicQuote.balanceEnough,null);assert.equal(publicQuote.account,null);
    const failedBalance=await readSale(mock(asset,{failBalance:true}),asset,'','five-year',account,'receive',{maximum:'inventory'});
    assert.equal(failedBalance.maxReceive,publicQuote.maxReceive);
    assert.equal(failedBalance.quoteFunded,true);assert.equal(failedBalance.balanceEnough,null);
    assert.ok(failedBalance.maxError,'The unavailable wallet balance remains an honest diagnostic');
  }
});

test('inventory Max rounds down attainable INC and eight-decimal HEX outputs without exceeding inventory',()=>{
  for(const asset of ['INC','HEX']){
    const math=saleAmountMath(basePrice*125n/100n,paymentPrices[asset],decimals(asset));
    const limit=math.payment(inventory+1n)-1n;
    const output=math.inventoryMaximum(inventory);
    assert.equal(output,math.output(limit));
    assert.ok(output<inventory,'These fixtures require a small inventory rounding adjustment');
    assert.ok(math.output(limit+1n)>inventory);
    assert.equal(math.output(math.payment(output)),output);
  }
});

test('empty inventory produces a genuine zero maximum while wallet-capped mode remains available separately',async()=>{
  for(const asset of ['PLS','PLSX','INC','HEX']){
    const empty=await readSale(mock(asset,{inventory:0n}),asset,'','five-year',account,'receive',{maximum:'inventory'});
    assert.equal(empty.maxReceive,'0.0');assert.equal(empty.quote,null);assert.equal(empty.quoteFunded,false);
    const walletMax=await readSale(mock(asset),asset,'','five-year',account,'receive',{maximum:true});
    assert.equal(walletMax.maxReceive,'0.0');assert.equal(walletMax.quote,null);
  }
});
