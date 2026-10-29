import { Interface,formatEther,formatUnits,getAddress,ZeroAddress } from "ethers";
import { OINK_TOKEN,TIME_MINER_CONTRACTS } from "../config/contracts";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { parseFarmDepositAmount,type FarmReadRpc } from "./farmTransactions";
import { saleAmountMath, saleSpendableBalance } from "./saleAmounts";
export const SALE_ADDRESS="0x4Ca5e92D67Fe647F1f8E6f21bd4D6Ff4aE35dA8e";
export const REFERRAL_ADDRESS="0xf69357627d6dcc463ac30273Aae13fDB49B07C15";
export const OLD_REFERRAL="0x066F0a45801bcbc5232b11ed4b97c39E1369fe59";
export const SALE_DESTINATIONS = [{id:'wallet',label:'Liquid OINK in your wallet',address:ZeroAddress},...TIME_MINER_CONTRACTS.filter(v=>['one-year','three-year','five-year'].includes(v.id))];
const abi=new Interface(["function DTX() view returns(address)","function token() view returns(address)","function balanceOf(address) view returns(uint256)","function decimals() view returns(uint8)","function allowance(address,address) view returns(uint256)","function governor() view returns(address)","function oldRewardContract() view returns(address)","function totalUserRewards(address) view returns(uint256)","function amountRedeemed(address) view returns(uint256)","function referralBonus() view returns(uint256)","function defaultDirectPayout() view returns(uint256)","function viewPoolPayout(address) view returns(uint256)","function viewPoolMinServe(address) view returns(uint256)","function getOinkPerPLSPrice() view returns(uint256)","function priceWithDiscount(address,uint256) pure returns(uint256)",...['PLSX','INC','HEX'].map(v=>`function get${v}PerPLSPrice() view returns(uint256)`),...['PLS','PLSX','INC','HEX'].map(v=>`function getWith${v}(uint256,address) view returns(uint256)`)]);
async function start(rpc:FarmReadRpc){
  if(BigInt(await rpc.send("eth_chainId",[]))!==369n)throw Error("PulseChain is required.");
  const block=await rpc.send("eth_getBlockByNumber",["latest",false]);
  if(!block?.hash||!block.timestamp)throw Error("Snapshot unavailable.");
  const timestamp=Number(BigInt(block.timestamp));if(Date.now()-timestamp*1000>120000||timestamp*1000-Date.now()>30000)throw Error("Chain data is stale.");
  const read=async(to:string,fn:string,args:unknown[]=[])=>abi.decodeFunctionResult(fn,await rpc.send("eth_call",[{to,data:abi.encodeFunctionData(fn,args)},block.number]));
  const finish=async()=>{if((await rpc.send("eth_getBlockByNumber",[block.number,false]))?.hash!==block.hash)throw Error("Snapshot changed.");};
  return {read,finish,tag:block.number,block:Number(BigInt(block.number)),timestamp};
}
export {encodeReferralCode,decodeReferralCode,referralLink} from './referralCodes';
export type SaleInputMode = 'pay' | 'receive';
export async function readSale(rpc:FarmReadRpc,asset:string,amount:string,duration:string,accountInput?:string|null,inputMode:SaleInputMode='pay',options:{maximum?:boolean|'inventory'}={}){
  if(!['PLS','PLSX','INC','HEX'].includes(asset))throw Error("Unsupported sale asset.");
  const pool=SALE_DESTINATIONS.find(v=>v.id===duration);if(!pool)throw Error("Choose an available sale destination.");
  const s=await start(rpc);if(getAddress((await s.read(SALE_ADDRESS,"DTX"))[0])!==getAddress(OINK_TOKEN))throw Error("Sale token changed.");
  const inventory=BigInt((await s.read(OINK_TOKEN,"balanceOf",[SALE_ADDRESS]))[0]);
  const account=accountInput?getAddress(accountInput):null,spec=VERIFIED_FARM_WRITES.find(v=>v.symbol===asset)!;
  const decimals=asset==='HEX'?8:18;
  let math:ReturnType<typeof saleAmountMath>|null=null,maxReceive:string|null=null,balance:string|null=null,gasReserve:string|null=null,maxError='',spendable:bigint|null=null;
  if(inputMode==='receive'){
    const basePrice=BigInt((await s.read(SALE_ADDRESS,'getOinkPerPLSPrice'))[0]);
    const price=BigInt((await s.read(SALE_ADDRESS,'priceWithDiscount',[pool.address,basePrice]))[0]);
    const paymentPrice=asset==='PLS'?null:BigInt((await s.read(SALE_ADDRESS,'get'+asset+'PerPLSPrice'))[0]);
    math=saleAmountMath(price,paymentPrice,decimals);
    if(options.maximum==='inventory')maxReceive=formatEther(math.inventoryMaximum(inventory));
    if(spec.tokenAddress&&BigInt((await s.read(spec.tokenAddress,'decimals'))[0])!==BigInt(decimals))throw Error('Payment token precision changed.');
    if(account){try{
      const rawBalance=asset==='PLS'?BigInt(await rpc.send('eth_getBalance',[account,s.tag])):BigInt((await s.read(spec.tokenAddress!,'balanceOf',[account]))[0]);
      balance=formatUnits(rawBalance,decimals);
      const gasPrice=asset==='PLS'?BigInt(await rpc.send('eth_gasPrice',[])):null;
      const available=saleSpendableBalance(rawBalance,gasPrice);
      spendable=available.spendable;gasReserve=asset==='PLS'?formatEther(available.reserve):null;
      if(options.maximum!=='inventory')maxReceive=formatEther(math.maximum(spendable,inventory));
    }catch{maxError='Your maximum is unavailable. Try refreshing.';}}
  }
  const quoteAmount=options.maximum?maxReceive:amount;
  let quote:string|null=null,baseQuote:string|null=null,bonusQuote:string|null=null,paymentAmount:string|null=null,balanceEnough:boolean|null=null,quoteFunded=false,quoteError="";
  if(quoteAmount&&(!options.maximum||quoteAmount!=='0.0')){try{
    const desired=inputMode==='receive'?parseFarmDepositAmount(quoteAmount,18):null;
    const units=desired!==null?math!.payment(desired):parseFarmDepositAmount(quoteAmount,decimals);
    // Both amounts come from the sale at the same block. The destination quote
    // already includes its bonus, so never multiply it by the bonus again.
    const output=BigInt((await s.read(SALE_ADDRESS,'getWith'+asset,[units,pool.address]))[0]);
    const base=duration==='wallet'?output:BigInt((await s.read(SALE_ADDRESS,'getWith'+asset,[units,ZeroAddress]))[0]);
    if(output<base||output<=0n)throw Error("Invalid sale quote.");
    if(desired!==null&&(output<desired||output!==math!.output(units)))throw Error('Sale quote does not match the requested OINK.');
    quote=formatEther(output);baseQuote=formatEther(base);bonusQuote=formatEther(output-base);
    paymentAmount=formatUnits(units,decimals);
    balanceEnough=spendable===null?null:units<=spendable;
    quoteFunded=output<=inventory;
  }catch{quoteError="A quote is unavailable for this amount and duration.";}}
  const allowance=account&&spec.tokenAddress?(await s.read(spec.tokenAddress,'allowance',[account,SALE_ADDRESS]))[0].toString():null;
  await s.finish();return {account,block:s.block,timestamp:s.timestamp,inventory:formatEther(inventory),quote,baseQuote,bonusQuote,quoteFunded,quoteError,allowance,paymentAmount,maxReceive,balance,balanceEnough,gasReserve,maxError,inputMode};
}
/** Max and its payment quote share one canonical block, independently of a typed amount. */
export async function readSaleMaximum(rpc:FarmReadRpc,asset:string,duration:string,account:string){
  const result=await readSale(rpc,asset,'',duration,account,'receive',{maximum:true});
  if(result.maxError||result.maxReceive===null)throw Error('Could not load Max for '+asset+'. Try Max again.');
  if(result.inventory==='0.0')throw Error('The sale has no OINK available.');
  if(result.maxReceive==='0.0')throw Error(asset==='PLS'?'Not enough PLS is available after reserving network fees.':'No spendable '+asset+' is available for this purchase.');
  if(result.quoteError||!result.quote||!result.paymentAmount||!result.quoteFunded||result.balanceEnough!==true)throw Error('Could not confirm the '+asset+' maximum. Try Max again.');
  return result;
}
export async function readReferral(rpc:FarmReadRpc,accountInput:string){
  const account=getAddress(accountInput),s=await start(rpc),core=VERIFIED_FARM_WRITES[0];
  const [token,governor,old,total,redeemed,legacy,bonus,funded]=await Promise.all([s.read(REFERRAL_ADDRESS,'token'),s.read(REFERRAL_ADDRESS,'governor'),s.read(REFERRAL_ADDRESS,'oldRewardContract'),s.read(REFERRAL_ADDRESS,'totalUserRewards',[account]),s.read(REFERRAL_ADDRESS,'amountRedeemed',[account]),s.read(OLD_REFERRAL,'amountRedeemed',[account]),s.read(core.governor,'referralBonus'),s.read(OINK_TOKEN,'balanceOf',[REFERRAL_ADDRESS])]);
  if(getAddress(token[0])!==getAddress(OINK_TOKEN)||getAddress(governor[0])!==getAddress(core.governor)||getAddress(old[0])!==getAddress(OLD_REFERRAL))throw Error("Referral wiring changed.");
  if(total[0]<redeemed[0]+legacy[0]||bonus[0]>10000n)throw Error("Referral accounting is inconsistent.");
  const remaining=BigInt(total[0])-BigInt(redeemed[0])-BigInt(legacy[0]),reward=remaining*BigInt(bonus[0])/10000n;
  const destinations=await Promise.all([{id:'wallet',label:'Your wallet',address:account},...TIME_MINER_CONTRACTS].map(async p=>{
    const [rate,serve]=p.id==='wallet'?[(await s.read(core.address,'defaultDirectPayout'))[0],0n]:[(await s.read(core.address,'viewPoolPayout',[p.address]))[0],(await s.read(core.address,'viewPoolMinServe',[p.address]))[0]];
    if(rate>10000n)throw Error("Invalid referral payout rate.");
    const received=reward*rate/10000n;
    return {id:p.id,label:p.label,rate:formatUnits(rate,2),serve:Number(serve)/86400,received:formatEther(received),funded:funded[0]>=received,enabled:rate>0n};
  }));
  await s.finish();return {account,block:s.block,timestamp:s.timestamp,total:formatEther(total[0]),redeemed:formatEther(redeemed[0]+legacy[0]),remaining:formatEther(remaining),bonus:formatUnits(bonus[0],2),reward:formatEther(reward),destinations};
}
