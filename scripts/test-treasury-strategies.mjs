import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {Interface,toQuantity,getAddress} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {liquidityShare,readTreasuryStrategies,TREASURY_STRATEGIES}=await import('../src/lib/treasuryStrategies.ts');
const {TREASURY_EXTRA_TOKENS}=await import('../src/config/treasuryAssets.ts');
const {FARM_PRICE_TOKENS}=await import('../src/lib/farmPrices.ts');
const {OINK_TOKEN,TREASURY_WALLET}=await import('../src/config/contracts.ts');
const abi=new Interface([
 'function DTX() view returns(address)','function treasury() view returns(address)','function PAIR_ADDRESS() view returns(address)',
 'function farmingContract() view returns(address)','function poolId() view returns(uint256)','function balanceOf(address) view returns(uint256)',
 'function totalSupply() view returns(uint256)','function decimals() view returns(uint8)','function token0() view returns(address)',
 'function token1() view returns(address)','function getReserves() view returns(uint112,uint112,uint32)',
 'function userInfo(uint256,address) view returns(uint256,uint256)','function stakes(address) view returns(uint256)',
 'function poolLength() view returns(uint256)','function poolInfo(uint256) view returns(address,uint256,uint256,uint256)','function incMasterchef() view returns(address)',
]);
const printFarm='0x857ab0cb7449Fb29429FC30596F08cfbf9F171F5';
const same=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
function fixture({wrongTreasury=false,reorg=false,failPrint=false}={}){
 const block={number:'0x200',hash:'0x'+'1'.repeat(64),timestamp:toQuantity(Math.floor(Date.now()/1000))};let checked=false;
 return {async send(method,params){
  if(method==='eth_chainId')return '0x171';
  if(method==='eth_getBlockByNumber'){if(checked&&reorg)return {...block,hash:'0x'+'2'.repeat(64)};checked=true;return block;}
  assert.equal(params[1],block.number,'all strategy balances must use the snapshot block');
  const tx=abi.parseTransaction(params[0]),to=params[0].to;
  const spec=TREASURY_STRATEGIES.find(row=>same(row.address,to));
  const pair=TREASURY_STRATEGIES.find(row=>same(row.pair,to));
  const token=TREASURY_EXTRA_TOKENS.find(row=>same(row.address,to));
  let result;
  if(failPrint&&same(to,printFarm))throw Error('Farm unavailable');
  switch(tx.name){
   case'DTX':result=[OINK_TOKEN];break;
   case'treasury':result=[wrongTreasury&&spec?.id==='print-reinvest'?'0x'+'f'.repeat(40):TREASURY_WALLET];break;
   case'PAIR_ADDRESS':result=[spec.pair];break;
   case'farmingContract':result=['0x4469A40D4243aC1c6cF350d99B6d69b49b5005F1'];break;
   case'poolId':result=[spec.pool];break;
   case'decimals':result=[token?.decimals??(same(to,FARM_PRICE_TOKENS.hex)?8:18)];break;
   case'token0':result=[pair.symbol==='PRINT'?FARM_PRICE_TOKENS.inc:FARM_PRICE_TOKENS.hex];break;
   case'token1':result=[TREASURY_EXTRA_TOKENS.find(row=>row.symbol===pair.symbol).address];break;
   case'getReserves':result=[1000n*10n**BigInt(pair.symbol==='PRINT'?18:8),5000n*10n**BigInt(pair.symbol==='PRINT'?18:8),0];break;
   case'totalSupply':result=[10n*10n**18n];break;
   case'balanceOf':result=[pair?10n**18n:same(to,printFarm)?2n*10n**18n:5n*10n**BigInt(token?.decimals??(same(to,FARM_PRICE_TOKENS.hex)?8:18))];break;
   case'userInfo':result=[2n*10n**18n,0];break;
   case'stakes':result=[7n*10n**18n];break;
   case'incMasterchef':result=['0xB2Ca4A66d3e57a5a9A12043B6bAD28249fE302d4'];break;
   case'poolLength':result=[1];break;
   case'poolInfo':result=[TREASURY_EXTRA_TOKENS.find(row=>row.symbol==='EARN').address,0,0,0];break;
   default:throw Error(tx.name);
  }
  return abi.encodeFunctionResult(tx.name,result);
 }};
}
test('LP shares use integer reserve ownership and reject impossible or empty liquidity',()=>{
 assert.deepEqual(liquidityShare([100n,200n],1n,3n),[33n,66n]);
 assert.throws(()=>liquidityShare([100n,200n],4n,3n));
 assert.throws(()=>liquidityShare([100n,200n],0n,0n));
});
test('positions include deposited and loose LP, direct assets, and separately staked PRINT exactly once',async()=>{
 const result=await readTreasuryStrategies(fixture());
 assert.equal(result.rows.length,10);assert.ok(result.rows.every(row=>!row.error));
 const print=result.rows.find(row=>row.id==='print-reinvest');
 assert.equal(print.assets[0].balance,'1512.0');assert.equal(print.assets[1].balance,'305.0');
 const htt=result.rows.find(row=>row.id==='htt3000');
 assert.equal(htt.assets[0].balance,'1505.0');assert.equal(htt.assets[1].balance,'305.0');
 assert.equal(result.rows.find(row=>row.id==='earn').assets[0].balance,'7.0');
});
test('changed strategy mappings and failed farm reads remain unavailable rather than zero',async()=>{
 for(const options of [{wrongTreasury:true},{failPrint:true}]){
  const result=await readTreasuryStrategies(fixture(options));
  const missing=result.rows.find(row=>row.id==='print-reinvest');
  assert.equal(missing.error,'Position unavailable');assert.ok(missing.assets.every(row=>row.balance===null));
  assert.equal(result.rows.find(row=>row.id==='htt3000').error,'');
 }
});
test('canonical block changes and cancellation invalidate strategy results',async()=>{
 await assert.rejects(()=>readTreasuryStrategies(fixture({reorg:true})),/Block changed/);
 const controller=new AbortController();controller.abort();
 await assert.rejects(()=>readTreasuryStrategies(fixture(),controller.signal),{name:'AbortError'});
});
