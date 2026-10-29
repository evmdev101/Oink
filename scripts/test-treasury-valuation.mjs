import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, formatUnits, toQuantity, getAddress } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { treasuryWalletValues } = await import('../src/lib/treasuryValuation.ts');
const { FARM_PRICE_TOKENS } = await import('../src/lib/farmPrices.ts');
const { readTreasuryHoldings, treasuryAccounts, treasuryActivityAssets } = await import('../src/lib/treasuryActivity.ts');
const { TREASURY_EXTRA_TOKENS } = await import('../src/config/treasuryAssets.ts');
const now = Date.now();
const quote = (usd='1') => ({ usd, pair:'0x'+'1'.repeat(40), fetchedAt:now });
const assets = () => [
  { symbol:'PLS', address:null, balance:'100' },
  ...['OINK','INC','PLSX','HEX'].map(symbol=>({symbol,address:FARM_PRICE_TOKENS[symbol.toLowerCase()],balance:'10'})),
  ...TREASURY_EXTRA_TOKENS.map(token=>({...token,balance:'0'})),
];
const prices = () => Object.fromEntries(Object.keys(FARM_PRICE_TOKENS).map(id=>[id,quote()]));
test('treasury shows every original asset and sums each HEX time-token price independently',()=>{
  const rows=assets();
  for(const token of rows.filter(row=>row.symbol.startsWith('HTT-')))token.balance='2';
  const market=prices();market.htt3000=quote('3');market.htt5000=quote('5');market.htt7000=quote('7');
  const result=treasuryWalletValues(rows,market,now),time=result.rows.find(row=>row.symbol==='HEX Time Token');
  assert.equal(time.balance,'6');assert.equal(time.usd,30);assert.equal(time.components.length,3);
  assert.equal(result.rows.length,8);assert.equal(result.total,170);assert.equal(result.complete,true);
});
test('unpriced zero balances count as zero; missing nonzero prices produce a subtotal',()=>{
  const market=prices();delete market.print;delete market.earn;
  const rows=assets();assert.equal(treasuryWalletValues(rows,market,now).complete,true);
  rows.find(row=>row.symbol==='PRINT').balance='42';
  const result=treasuryWalletValues(rows,market,now);
  assert.equal(result.complete,false);assert.equal(result.total,140);
  assert.equal(result.rows.find(row=>row.symbol==='PRINT').usd,null);
});
test('stale/future prices and missing token reads never imply a complete total',()=>{
  for(const fetchedAt of [now-120001,now+1]){
    const market=prices();market.oink={...quote(),fetchedAt};
    assert.equal(treasuryWalletValues(assets(),market,now).complete,false);
  }
  const rows=assets();rows.find(row=>row.symbol==='HTT-5000').balance=null;
  const result=treasuryWalletValues(rows,prices(),now);
  assert.equal(result.complete,false);assert.equal(result.rows.find(row=>row.symbol==='HEX Time Token').balance,null);
});
test('additional nonzero supported assets are included without counting liquidity twice',()=>{
  const rows=[...assets(),{symbol:'HOA',address:FARM_PRICE_TOKENS.hoa,balance:'12.5'}];
  const result=treasuryWalletValues(rows,prices(),now);
  assert.equal(result.rows.find(row=>row.symbol==='HOA').usd,12.5);assert.equal(result.total,152.5);
});
const abi=new Interface(['function balanceOf(address) view returns(uint256)','function decimals() view returns(uint8)']);
function rpcFixture({fail,wrongDecimals=false,reorg=false}={}){
  let latest=false;const owners=[];
  const block={number:'0x100',timestamp:toQuantity(Math.floor(Date.now()/1000)),hash:'0x'+'1'.repeat(64)};
  return { owners, async send(method,params){
    if(method==='eth_chainId')return '0x171';
    if(method==='eth_getBlockByNumber'){if(latest&&reorg)return {...block,hash:'0x'+'2'.repeat(64)};latest=true;return block;}
    assert.equal(params[1],block.number);
    if(method==='eth_getBalance'){owners.push(params[0]);return '0x64';}
    const tx=abi.parseTransaction(params[0]),asset=treasuryActivityAssets.find(asset=>getAddress(asset.address)===getAddress(params[0].to));
    if(fail===asset.symbol)throw Error('RPC error');
    if(tx.name==='decimals')return abi.encodeFunctionResult(tx.name,[wrongDecimals&&asset.symbol==='PRINT'?6:asset.decimals]);
    owners.push(tx.args[0]);return abi.encodeFunctionResult(tx.name,[asset.symbol.startsWith('HTT-')?123456789n:1000000000000000000n]);
  }};
}
test('wallet-only holdings read exact decimals at a fixed block and never query Governor',async()=>{
  const rpc=rpcFixture(),result=await readTreasuryHoldings(rpc,[treasuryAccounts[0]]);
  assert.equal(result.rows.length,1);
  assert.ok(rpc.owners.every(owner=>getAddress(owner)===getAddress(treasuryAccounts[0].address)));
  assert.equal(result.rows[0].assets.find(asset=>asset.symbol==='HTT-3000').balance,formatUnits(123456789n,8));
});
test('unavailable or wrong-decimal reads stay unavailable, and reorgs invalidate the snapshot',async()=>{
  for(const options of [{fail:'PRINT'},{wrongDecimals:true}]){
    const result=await readTreasuryHoldings(rpcFixture(options),[treasuryAccounts[0]]);
    assert.equal(result.rows[0].assets.find(asset=>asset.symbol==='PRINT').balance,null);
  }
  await assert.rejects(()=>readTreasuryHoldings(rpcFixture({reorg:true}),[treasuryAccounts[0]]),/Snapshot changed/);
});
