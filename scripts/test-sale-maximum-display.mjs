import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, parseEther, parseUnits, toQuantity } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { readSaleMaximums, readSaleMaximumsFromRpc, saleMaximumKey, peekSaleMaximums, clearSaleMaximums } = await import('../src/lib/saleMaximumDisplay.ts');
const { getPublicProvider } = await import('../src/lib/chain.ts');
const { SALE_ADDRESS, SALE_DESTINATIONS } = await import('../src/lib/miningOffers.ts');
const { OINK_TOKEN } = await import('../src/config/contracts.ts');
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const { saleAmountMath } = await import('../src/lib/saleAmounts.ts');
const account = '0x1111111111111111111111111111111111111111';
const other = '0x2222222222222222222222222222222222222222';
const assets = ['PLS','PLSX','INC','HEX'];
const abi = new Interface(['function DTX() view returns(address)','function decimals() view returns(uint8)','function balanceOf(address) view returns(uint256)','function allowance(address,address) view returns(uint256)','function getOinkPerPLSPrice() view returns(uint256)','function priceWithDiscount(address,uint256) pure returns(uint256)',...assets.slice(1).map(a=>`function get${a}PerPLSPrice() view returns(uint256)`),...assets.map(a=>`function getWith${a}(uint256,address) view returns(uint256)`)]);
const basePrice = 241075587439873811n;
const paymentPrices = {PLSX:410075000000000000n,INC:179837000000000n,HEX:1348970000000000n};
const multiplier = pool => ({wallet:100n,'one-year':111n,'three-year':118n,'five-year':125n})[SALE_DESTINATIONS.find(row=>row.address.toLowerCase()===pool.toLowerCase()).id];
const decimals = asset => asset === 'HEX' ? 8 : 18;
const forward = (asset,payment,pool) => (asset === 'PLS' ? payment : payment * 10n**BigInt(asset === 'HEX' ? 28 : 18)/paymentPrices[asset]) * (basePrice*multiplier(pool)/100n)/10n**18n;

function mock(options={}) {
  const calls = [];
  const block = {number:'0x100',hash:'0x'+'ab'.repeat(32),timestamp:toQuantity(Math.floor(Date.now()/1000))};
  const balance = (asset,owner) => options.zero ? 0n : parseUnits(owner.toLowerCase() === other ? '10' : '1000',decimals(asset));
  const rpc = {async send(method,params) {
    calls.push({method,params});
    if (options.failAll) throw Error('Unavailable');
    if (method === 'eth_chainId') return '0x171';
    if (method === 'eth_getBlockByNumber') return options.reorg && params[0] !== 'latest' ? {...block,hash:'0x'+'cd'.repeat(32)} : block;
    if (method === 'eth_gasPrice') return toQuantity(10n**9n);
    if (method === 'eth_getBalance') {assert.equal(params[1],block.number);return toQuantity(balance('PLS',params[0]));}
    assert.equal(method,'eth_call');assert.equal(params[1],block.number);
    const tx = abi.parseTransaction(params[0]);
    const token = VERIFIED_FARM_WRITES.find(row=>row.tokenAddress?.toLowerCase()===params[0].to.toLowerCase());
    let value;
    if (tx.name === 'DTX') value = OINK_TOKEN;
    else if (tx.name === 'decimals') value = decimals(token.symbol);
    else if (tx.name === 'allowance') value = 0n;
    else if (tx.name === 'balanceOf') {
      if (tx.args[0].toLowerCase() === SALE_ADDRESS.toLowerCase()) value = options.emptyInventory ? 0n : parseEther('1000000');
      else {
        if (token.symbol === options.delayAsset) await options.gate;
        if (token.symbol === options.failAsset) throw Error('Token balance unavailable');
        value = balance(token.symbol,tx.args[0]);
      }
    }
    else if (tx.name === 'getOinkPerPLSPrice') value = basePrice;
    else if (tx.name === 'priceWithDiscount') value = tx.args[1]*multiplier(tx.args[0])/100n;
    else if (/^get(PLSX|INC|HEX)PerPLSPrice$/.test(tx.name)) value = paymentPrices[tx.name.slice(3,-11)];
    else if (tx.name.startsWith('getWith')) value = forward(tx.name.slice(7),tx.args[0],tx.args[1]);
    else throw Error('Unexpected method '+tx.name);
    return abi.encodeFunctionResult(tx.name,[value]);
  }};
  return {rpc,calls,block,balance};
}

test('background Max warms all 16 inventory quotes regardless of wallet purchasing power',async()=>{
  const context = mock();
  const values = await readSaleMaximumsFromRpc(context.rpc,account);
  assert.equal(Object.keys(values).length,16);
  for (const asset of assets) for (const destination of SALE_DESTINATIONS) {
    const value = values[saleMaximumKey(asset,destination.id)];
    assert.equal(value.account,account);assert.equal(value.block,256);
    assert.equal(value.maxReceive,value.quote);
    assert.equal(value.quoteFunded,true);
    assert.equal(parseEther(value.quote),forward(asset,parseUnits(value.paymentAmount,decimals(asset)),destination.address));
    const math=saleAmountMath(basePrice*multiplier(destination.address)/100n,asset==='PLS'?null:paymentPrices[asset],decimals(asset));
    const inventory=parseEther(value.inventory),payment=parseUnits(value.paymentAmount,decimals(asset));
    assert.equal(parseEther(value.maxReceive),math.output(math.payment(inventory+1n)-1n),'Max is capped only by attainable contract inventory');
    assert.ok(math.output(payment)<=inventory);
    assert.ok(math.output(math.payment(inventory+1n))>inventory);
    assert.ok(math.output(payment-1n)<parseEther(value.maxReceive),'The quoted payment is the smallest payment delivering the maximum');
    assert.equal(value.balanceEnough,payment<=context.balance(asset,account)-(asset==='PLS'?10n**9n*2_000_000n:0n));
  }
});

test('one prefetch deduplicates repeated RPC reads while every canonical finish check stays live',async()=>{
  const {rpc,calls} = mock();
  await readSaleMaximumsFromRpc(rpc,account);
  const count = (method,predicate=()=>true) => calls.filter(row=>row.method===method&&predicate(row.params)).length;
  assert.equal(count('eth_chainId'),1);
  assert.equal(count('eth_getBlockByNumber',p=>p[0]==='latest'),1);
  assert.equal(count('eth_getBlockByNumber',p=>p[0]==='0x100'),16);
  assert.equal(count('eth_getBalance'),1);assert.equal(count('eth_gasPrice'),1);
  for (const fn of ['DTX','getOinkPerPLSPrice']) assert.equal(count('eth_call',p=>abi.parseTransaction(p[0]).name===fn),1);
  assert.equal(count('eth_call',p=>abi.parseTransaction(p[0]).name==='priceWithDiscount'),4);
  assert.equal(count('eth_call',p=>abi.parseTransaction(p[0]).name==='decimals'),3);
});

test('an unavailable wallet balance cannot hide the full inventory quote or fabricate affordability',async()=>{
  const values = await readSaleMaximumsFromRpc(mock({failAsset:'INC'}).rpc,account);
  assert.equal(Object.keys(values).length,16);
  for (const destination of SALE_DESTINATIONS) {
    assert.equal(values[saleMaximumKey('INC',destination.id)].balanceEnough,null);
    assert.ok(values[saleMaximumKey('INC',destination.id)].quote);
    assert.ok(values[saleMaximumKey('HEX',destination.id)].maxReceive);
  }
  await assert.rejects(()=>readSaleMaximumsFromRpc(mock({failAll:true}).rpc,account),/unavailable/);
});

test('zero wallet balances still receive the full inventory maximum with insufficient-balance status',async()=>{
  const values=await readSaleMaximumsFromRpc(mock({zero:true}).rpc,account);
  assert.equal(Object.keys(values).length,16);
  for(const value of Object.values(values)){
    assert.ok(parseEther(value.maxReceive)>0n);assert.equal(value.maxReceive,value.quote);
    assert.equal(value.balanceEnough,false);assert.equal(value.quoteFunded,true);
  }
});

test('only an empty inventory produces zero maximum without a quote',async()=>{
  const values=await readSaleMaximumsFromRpc(mock({emptyInventory:true}).rpc,account);
  assert.equal(Object.keys(values).length,16);
  for(const value of Object.values(values)){assert.equal(value.maxReceive,'0.0');assert.equal(value.quote,null);}
});

test('public inventory maxima need no wallet and each selected token calculates its own payment',async()=>{
  const context=mock();
  const values=await readSaleMaximumsFromRpc(context.rpc,null);
  assert.equal(Object.keys(values).length,16);
  const paymentAmounts=new Set();
  for(const asset of assets){
    const value=values[saleMaximumKey(asset,'five-year')];
    assert.equal(value.account,null);assert.equal(value.balanceEnough,null);
    assert.ok(Number(value.maxReceive)>999999.999,'All assets select the entire available OINK inventory');
    paymentAmounts.add(value.paymentAmount);
    assert.equal(parseEther(value.quote),forward(asset,parseUnits(value.paymentAmount,decimals(asset)),SALE_DESTINATIONS.find(row=>row.id==='five-year').address));
  }
  assert.equal(paymentAmounts.size,4);
  assert.equal(context.calls.filter(row=>row.method==='eth_getBalance'||row.method==='eth_gasPrice').length,0);
  assert.equal(context.calls.filter(row=>row.method==='eth_call'&&abi.parseTransaction(row.params[0]).name==='allowance').length,0);
});

test('request memoization never leaks another wallet balance or suppresses later snapshot checks',async()=>{
  const context = mock();
  const first = await readSaleMaximumsFromRpc(context.rpc,account);
  const second = await readSaleMaximumsFromRpc(context.rpc,other);
  assert.equal(first[saleMaximumKey('PLSX','wallet')].maxReceive,second[saleMaximumKey('PLSX','wallet')].maxReceive,'Different wallet balances must not change the inventory maximum');
  assert.notEqual(first[saleMaximumKey('PLSX','wallet')].balance,second[saleMaximumKey('PLSX','wallet')].balance);
  assert.equal(second[saleMaximumKey('PLSX','wallet')].account,other);
  assert.equal(context.calls.filter(row=>row.method==='eth_getBlockByNumber'&&row.params[0]==='latest').length,2);
  await assert.rejects(()=>readSaleMaximumsFromRpc(mock({reorg:true}).rpc,account),/unavailable/);
  clearSaleMaximums();assert.equal(peekSaleMaximums(account),null);assert.equal(peekSaleMaximums(other),null);
});

test('an aborted prefetch cannot return late background values',async()=>{
  const controller = new AbortController();
  const context = mock();
  controller.abort(Error('Wallet changed'));
  await assert.rejects(()=>readSaleMaximumsFromRpc(context.rpc,account,controller.signal),/Wallet changed/);
  assert.equal(context.calls.length,0);
});

const deferred = () => {let resolve;const promise=new Promise(yes=>{resolve=yes;});return {promise,resolve};};

test('a delayed token does not hold back canonically checked maxima for the other assets',async()=>{
  const gate=deferred(),ready=deferred(),snapshots=[];
  let finished=false;
  const context=mock({delayAsset:'INC',gate:gate.promise});
  const pending=readSaleMaximumsFromRpc(context.rpc,account,undefined,values=>{
    snapshots.push(values);
    if(Object.keys(values).length===12)ready.resolve();
  }).then(value=>{finished=true;return value;});
  await ready.promise;
  assert.equal(finished,false);
  assert.equal(snapshots.at(-1)[saleMaximumKey('INC','wallet')],undefined);
  assert.ok(snapshots.at(-1)[saleMaximumKey('HEX','five-year')].quote);
  gate.resolve();
  assert.equal(Object.keys(await pending).length,16);
  assert.equal(Object.keys(snapshots[0]).length,1,'published snapshots must not mutate as later pairs finish');
});

test('all subscribers receive progressive results and an aborted subscriber stops immediately',async()=>{
  clearSaleMaximums();
  const provider=await getPublicProvider(),original=provider.send;
  const gate=deferred(),ready=deferred(),controller=new AbortController();
  const context=mock({delayAsset:'INC',gate:gate.promise});
  provider.send=context.rpc.send;
  const abortedUpdates=[],activeUpdates=[];
  try{
    const first=readSaleMaximums(account); // Loader owner deliberately has no callback.
    const aborted=readSaleMaximums(account,controller.signal,values=>abortedUpdates.push(values));
    const active=readSaleMaximums(account,undefined,values=>{
      activeUpdates.push(values);if(Object.keys(values).length===12)ready.resolve();
    });
    await ready.promise;
    assert.ok(abortedUpdates.length);
    const beforeAbort=abortedUpdates.length;
    controller.abort(Error('Consumer left'));
    await assert.rejects(()=>aborted,/Consumer left/);
    gate.resolve();
    await Promise.all([first,active]);
    assert.equal(abortedUpdates.length,beforeAbort);
    assert.equal(Object.keys(activeUpdates.at(-1)).length,16);
    const cached=[];
    await readSaleMaximums(account,undefined,values=>cached.push(values));
    assert.equal(Object.keys(cached.at(-1)).length,16,'fresh cache hits must notify new subscribers');
  }finally{gate.resolve();clearSaleMaximums();provider.send=original;}
});

test('invalidating a running prefetch prevents its late updates from entering a new subscription',async()=>{
  clearSaleMaximums();
  const provider=await getPublicProvider(),original=provider.send;
  const gate=deferred(),ready=deferred(),oldUpdates=[],newUpdates=[];
  provider.send=mock({delayAsset:'INC',gate:gate.promise}).rpc.send;
  try{
    const old=readSaleMaximums(account,undefined,values=>{
      oldUpdates.push(values);if(Object.keys(values).length===12)ready.resolve();
    });
    const oldRejected=assert.rejects(()=>old);
    await ready.promise;
    clearSaleMaximums();
    const oldCount=oldUpdates.length;
    provider.send=mock({emptyInventory:true}).rpc.send;
    const current=await readSaleMaximums(account,undefined,values=>newUpdates.push(values));
    gate.resolve();await oldRejected;
    assert.equal(oldUpdates.length,oldCount);
    assert.equal(Object.keys(current).length,16);
    assert.ok(newUpdates.every(values=>Object.values(values).every(value=>value.maxReceive==='0.0')));
  }finally{gate.resolve();clearSaleMaximums();provider.send=original;}
});
