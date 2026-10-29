import { Interface,ZeroAddress,formatEther,formatUnits,getAddress,toQuantity } from "ethers";
import { OFFER_DEPLOYMENTS,REFERRAL_POINT_VAULTS } from "../config/offerVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { parseFarmDepositAmount,verifyRuntime,type FarmReadRpc } from "./farmTransactions";
import { SALE_ADDRESS,REFERRAL_ADDRESS,OLD_REFERRAL,SALE_DESTINATIONS } from "./miningOffers";
import type { ProtocolAdapter,ProtocolQuote,ProtocolRequest,ProtocolReview,ProtocolReceipt } from "./protocolTransactions";

export const offerAbi = new Interface([
  "function token() view returns(address)","function DTX() view returns(address)","function governor() view returns(address)","function owner() view returns(address)","function treasury() view returns(address)","function treasuryWallet() view returns(address)","function masterchef() view returns(address)","function dtx() view returns(address)","function feeAddress() view returns(address)",
  "function balanceOf(address) view returns(uint256)","function allowance(address,address) view returns(uint256)","function approve(address,uint256) returns(bool)","function decimals() view returns(uint8)",
  "function poolID() view returns(uint256)","function poolInfo(uint256) view returns(uint256,uint256,address)","function admin() view returns(address)","function migrationPool() view returns(address)","function minimumGift() view returns(uint256)","function withdrawFeePeriod() view returns(uint256)","function gracePeriod() view returns(uint256)","function totalShares() view returns(uint256)",
  "function oldRewardContract() view returns(address)","function totalUserRewards(address) view returns(uint256)","function amountRedeemed(address) view returns(uint256)","function referralBonus() view returns(uint256)","function defaultDirectPayout() view returns(uint256)","function viewPoolPayout(address) view returns(uint256)","function viewPoolMinServe(address) view returns(uint256)","function viewVaults() view returns(address[])","function redeemRewards(uint256,address)",
  "function token0() view returns(address)","function token1() view returns(address)","function getReserves() view returns(uint112,uint112,uint32)","function minimumPrice() view returns(uint256)",
  ...['PLS','PLSX','INC','HEX'].flatMap(v=>[`function getWith${v}(uint256,address) view returns(uint256)`,`function buyWith${v}(uint256,address)${v==='PLS'?' payable':''}`]),
  "event Approval(address indexed owner,address indexed spender,uint256 value)","event Transfer(address indexed from,address indexed to,uint256 value)","event BUY(address buyer,address pool,uint256 oinks)","event ClaimReferralReward(address indexed user,address indexed claimInto,uint256 amount)","event GiftDeposit(address indexed sender,address indexed recipient,uint256 amount,uint256 shares,uint256 lastDepositedTime)"
]);
const minerBalanceAbi=new Interface(["function balanceOf() view returns(uint256)"]);
const common=VERIFIED_FARM_WRITES[0], WPLS="0xA1077a294dDE1B09bB078844df40758a5D0f9a27";
const equal=(a:string,b:string)=>getAddress(a)===getAddress(b);
function same(actual:string,expected:string,label:string){if(!equal(actual,expected))throw Error(label+' changed. Refresh or use the original interface.');}
async function snapshot(rpc:FarmReadRpc,accountInput:string){
  const account=getAddress(accountInput);if(account===ZeroAddress||BigInt(await rpc.send('eth_chainId',[]))!==369n)throw Error('Connect a nonzero PulseChain wallet.');
  const block=await rpc.send('eth_getBlockByNumber',['latest',false]);
  if(!block?.number||!block.hash||!block.timestamp)throw Error('Snapshot unavailable.');
  const timestamp=Number(BigInt(block.timestamp));if(!Number.isSafeInteger(timestamp)||Date.now()-timestamp*1000>120000||timestamp*1000-Date.now()>30000)throw Error('Snapshot is stale.');
  const read=async(to:string,fn:string,args:unknown[]=[],abi=offerAbi)=>abi.decodeFunctionResult(fn,await rpc.send('eth_call',[{to,data:abi.encodeFunctionData(fn,args)},block.number]));
  const runtime=async(address:string,hash:string)=>verifyRuntime(await rpc.send('eth_getCode',[address,block.number]),hash,'Offer dependency');
  const finish=async()=>{if((await rpc.send('eth_getBlockByNumber',[block.number,false]))?.hash!==block.hash)throw Error('Snapshot changed. Review again.');};
  return{account,block,timestamp,read,runtime,finish};
}
type Snapshot=Awaited<ReturnType<typeof snapshot>>;
async function core(s:Snapshot){
  await Promise.all([[common.governor,common.governorRuntimeCodeHash],[common.masterchef,common.masterchefRuntimeCodeHash],[common.rewardToken,common.rewardTokenRuntimeCodeHash]].map(([a,h])=>s.runtime(a,h)));
  await Promise.all([[common.governor,'masterchef',common.masterchef],[common.governor,'treasuryWallet',common.treasuryWallet],[common.rewardToken,'governor',common.governor],[common.rewardToken,'owner',common.masterchef],[common.masterchef,'owner',common.governor],[common.masterchef,'dtx',common.rewardToken],[common.masterchef,'feeAddress',common.governor]].map(async([a,m,e])=>same((await s.read(a,m))[0],e,m)));
}
async function destination(s:Snapshot,id:string,amount:bigint,serve:bigint){
  if(id==='wallet')return{address:s.account,facts:[] as [string,string][],terms:'wallet'};
  const spec=MINER_PREVIEW_SPECS.find(v=>v.id===id);if(!spec)throw Error('Unknown miner destination.');
  const a=spec.address;await s.runtime(a,spec.runtimeCodeHash);
  await Promise.all([[a,'token',common.rewardToken],[a,'masterchef',common.masterchef],[a,'treasury',common.governor],[a,'admin',common.governor],[a,'migrationPool',ZeroAddress]].map(async([a,m,e])=>same((await s.read(a,m))[0],e,m)));
  const [pool,registered,duration,grace,min,total,balance]=await Promise.all([s.read(a,'poolID'),s.read(common.masterchef,'poolInfo',[spec.poolId]),s.read(a,'withdrawFeePeriod'),s.read(a,'gracePeriod'),s.read(a,'minimumGift'),s.read(a,'totalShares'),s.read(a,'balanceOf',[],minerBalanceAbi)]);
  if(pool[0]!==BigInt(spec.poolId)||!equal(registered[2],a)||duration[0]!==BigInt(spec.durationDays)*86400n||grace[0]!==BigInt(spec.graceDays)*86400n)throw Error('Miner registration or lock rules changed.');
  if(amount<min[0])throw Error('OINK reward is below this miner’s minimum gift.');
  if(total[0]>0n&&(balance[0]===0n||amount*total[0]/balance[0]===0n))throw Error('Amount would create zero miner shares.');
  return{address:getAddress(a),terms:[a,duration[0],grace[0],serve,min[0]].join(':'),facts:[["Miner owner",s.account],["Nominal miner duration",spec.durationDays+' days'],["Mandatory service",formatUnits(serve,0)+' seconds'],["Grace after maturity",spec.graceDays+' days'],["Maximum early / late exit penalty",formatUnits(BigInt(spec.maxPenaltyBps),2)+'%']] as [string,string][]};
}
async function pairPrice(s:Snapshot,id:'oinkPair'|'plsxPair'|'incPair'|'hexPair',token:string,decimals:number){
  const spec=OFFER_DEPLOYMENTS[id];await s.runtime(spec.address,spec.runtimeHash);
  const [a,b,reserves]=await Promise.all([s.read(spec.address,'token0'),s.read(spec.address,'token1'),s.read(spec.address,'getReserves')]);
  if(!(equal(a[0],token)&&equal(b[0],WPLS)||equal(b[0],token)&&equal(a[0],WPLS))||reserves[0]<=0n||reserves[1]<=0n)throw Error('Sale price pair changed or is empty.');
  const tokenReserve=equal(a[0],token)?reserves[0]:reserves[1],plsReserve=equal(a[0],token)?reserves[1]:reserves[0];
  return BigInt(tokenReserve)*10n**BigInt(36-decimals)/BigInt(plsReserve);
}
function quote(s:Snapshot,title:string,to:string,data:string,value:string,facts:[string,string][],warnings:string[],terms:Record<string,string>):ProtocolQuote{return{title,account:s.account,block:Number(BigInt(s.block.number)),blockHash:s.block.hash,timestamp:s.timestamp,to:getAddress(to),data,value,facts,warnings,fingerprint:JSON.stringify(terms)};}

export async function prepareOffer(rpc:FarmReadRpc,account:string,request:ProtocolRequest):Promise<ProtocolQuote>{
  if(request.module!=='offers'||!['sale','sale-approve','sale-reset','referral'].includes(request.action))throw Error('Unsupported offer action.');
  const s=await snapshot(rpc,account);await core(s);
  if(request.action==='referral')return prepareReferral(s,request);
  const {asset,destination:target,amount:input}=request.args;
  if(!['PLS','PLSX','INC','HEX'].includes(asset)||!SALE_DESTINATIONS.some(v=>v.id===target))throw Error('Unsupported sale asset or destination.');
  const spec=VERIFIED_FARM_WRITES.find(v=>v.symbol===asset)!;if(!spec)throw Error('Sale asset is not verified.');
  const amount=request.action==='sale-reset'?0n:parseFarmDepositAmount(input,spec.decimals);
  await s.runtime(SALE_ADDRESS,OFFER_DEPLOYMENTS.sale.runtimeHash);
  await Promise.all([[SALE_ADDRESS,'DTX',common.rewardToken],[SALE_ADDRESS,'governor',common.governor],[SALE_ADDRESS,'treasury',common.treasuryWallet]].map(async([a,m,e])=>same((await s.read(a,m))[0],e,m)));
  let allowance=0n;
  if(spec.tokenAddress){
    await s.runtime(spec.tokenAddress,spec.tokenRuntimeCodeHash!);
    if((await s.read(spec.tokenAddress,'decimals'))[0]!==BigInt(spec.decimals))throw Error('Payment token precision changed.');
    allowance=(await s.read(spec.tokenAddress,'allowance',[s.account,SALE_ADDRESS]))[0];
    if(request.action!=='sale-reset'&&(await s.read(spec.tokenAddress,'balanceOf',[s.account]))[0]<amount)throw Error('Amount exceeds your payment token balance.');
  }
  if(request.action==='sale-approve'||request.action==='sale-reset'){
    if(!spec.tokenAddress)throw Error('PLS does not use token approvals.');
    if(request.action==='sale-approve'&&allowance!==0n)throw Error('Reset the existing sale allowance to zero before approving a new amount.');
    if(request.action==='sale-reset'&&allowance===0n)throw Error('Sale allowance is already zero.');
    const approved=request.action==='sale-reset'?0n:amount,data=offerAbi.encodeFunctionData('approve',[SALE_ADDRESS,approved]);
    const result=await rpc.send('eth_call',[{from:s.account,to:spec.tokenAddress,data,value:'0x0'},s.block.number]);
    if(typeof result!=='string'||result.toLowerCase()!=='0x'+'0'.repeat(63)+'1')throw Error('Payment token rejected the approval.');
    await s.finish();
    return quote(s,approved===0n?'Review sale allowance reset':'Review exact sale approval',spec.tokenAddress,data,'0x0',[["Payment token",asset+' · '+spec.tokenAddress],["Spender",SALE_ADDRESS],["Current allowance",formatUnits(allowance,spec.decimals)+' '+asset],["New allowance",formatUnits(approved,spec.decimals)+' '+asset]],['Approval permits this sale contract to spend this amount. It does not purchase OINK. Review the separate purchase afterward.'],{action:request.action,token:spec.tokenAddress,allowance:allowance.toString(),approved:approved.toString()});
  }
  if(spec.tokenAddress&&allowance<amount)throw Error('Approve this exact amount for the sale first. Reset any existing insufficient allowance before approving.');
  const price=await pairPrice(s,'oinkPair',common.rewardToken,18),minimum=(await s.read(SALE_ADDRESS,'minimumPrice'))[0];
  if(minimum!==100000000000000n||price<minimum)throw Error('OINK price is below the sale minimum.');
  let plsEquivalent=amount;
  if(spec.tokenAddress){const price=await pairPrice(s,asset==='PLSX'?'plsxPair':asset==='INC'?'incPair':'hexPair',spec.tokenAddress,spec.decimals);if(price===0n)throw Error('Payment exchange rate is zero.');plsEquivalent=amount*10n**BigInt(36-spec.decimals)/price;}
  const bonus=target==='five-year'?125n:target==='three-year'?118n:target==='one-year'?111n:100n;
  const output=plsEquivalent*(price*bonus/100n)/10n**18n;
  if(output===0n)throw Error('This amount rounds to zero OINK.');
  const into=target==='wallet'?s.account:MINER_PREVIEW_SPECS.find(v=>v.id===target)!.address;
  if((await s.read(SALE_ADDRESS,'getWith'+asset,[amount,into]))[0]!==output)throw Error('Sale quote differs from the verified calculation.');
  if((await s.read(common.rewardToken,'balanceOf',[SALE_ADDRESS]))[0]<output)throw Error('The sale does not have enough OINK inventory.');
  const dest=await destination(s,target,output,0n);await s.finish();
  return quote(s,'Review OINK purchase',SALE_ADDRESS,offerAbi.encodeFunctionData('buyWith'+asset,[amount,into]),asset==='PLS'?toQuantity(amount):'0x0',[["Amount spent",formatUnits(amount,spec.decimals)+' '+asset],["Payment recipient",common.treasuryWallet],["OINK received at snapshot",formatEther(output)+' OINK'],["Destination",target==='wallet'?'Your wallet · '+s.account:target+' miner · '+dest.address],["Sale bonus",(bonus-100n)+'% extra OINK'],["Purchase fee",'No separate contract fee; the entire payment goes to the treasury'],...dest.facts],['The sale uses live pair reserves and has no on-chain minimum received amount or transaction deadline. OINK received can change, including falling below this quote, before mining.',target==='wallet'?'OINK is delivered to your connected wallet.':'OINK creates a time-locked miner owned by your wallet. Future withdrawals follow the miner’s early and late penalty rules.'],{action:'sale',asset,amount:amount.toString(),output:output.toString(),destination:into,destinationTerms:dest.terms,bonus:bonus.toString(),treasury:common.treasuryWallet});
}
async function prepareReferral(s:Snapshot,request:ProtocolRequest){
  const target=request.args.destination;
  if(target!=='wallet'&&!MINER_PREVIEW_SPECS.some(v=>v.id===target))throw Error('Unsupported referral reward destination.');
  await Promise.all([s.runtime(REFERRAL_ADDRESS,OFFER_DEPLOYMENTS.referral.runtimeHash),s.runtime(OLD_REFERRAL,OFFER_DEPLOYMENTS.legacyReferral.runtimeHash),s.runtime(common.address,common.runtimeCodeHash)]);
  await Promise.all([[REFERRAL_ADDRESS,'token',common.rewardToken],[REFERRAL_ADDRESS,'governor',common.governor],[REFERRAL_ADDRESS,'oldRewardContract',OLD_REFERRAL]].map(async([a,m,e])=>same((await s.read(a,m))[0],e,m)));
  const [vaults,total,current,legacy,bonus]=await Promise.all([s.read(REFERRAL_ADDRESS,'viewVaults'),s.read(REFERRAL_ADDRESS,'totalUserRewards',[s.account]),s.read(REFERRAL_ADDRESS,'amountRedeemed',[s.account]),s.read(OLD_REFERRAL,'amountRedeemed',[s.account]),s.read(common.governor,'referralBonus')]);
  const listed=vaults[0] as string[];
  if(listed.length!==REFERRAL_POINT_VAULTS.length||listed.some((v,i)=>!equal(v,REFERRAL_POINT_VAULTS[i].address)))throw Error('Referral point sources changed. A new source review is required.');
  await Promise.all(REFERRAL_POINT_VAULTS.map(v=>s.runtime(v.address,v.runtimeHash)));
  if(total[0]<current[0]+legacy[0]||bonus[0]>10000n)throw Error('Referral accounting is inconsistent.');
  const available=BigInt(total[0])-BigInt(current[0])-BigInt(legacy[0]);
  const points=request.args.points?parseFarmDepositAmount(request.args.points,18):available;
  if(points===0n||points>available)throw Error('No sufficient referral points remain for this claim.');
  const into=target==='wallet'?s.account:MINER_PREVIEW_SPECS.find(v=>v.id===target)!.address;
  const poolRate=(await s.read(common.address,'viewPoolPayout',[into]))[0];
  if(target==='wallet'&&poolRate!==0n||target!=='wallet'&&poolRate===0n)throw Error('Referral payout destination is inactive or changed.');
  const rate=target==='wallet'?(await s.read(common.address,'defaultDirectPayout'))[0]:poolRate,serve=target==='wallet'?0n:(await s.read(common.address,'viewPoolMinServe',[into]))[0];
  if(rate>10000n)throw Error('Invalid destination payout rate.');
  const reward=points*BigInt(bonus[0])/10000n,output=reward*BigInt(rate)/10000n;
  if(output===0n)throw Error('The referral payout rounds to zero OINK.');
  if((await s.read(common.rewardToken,'balanceOf',[REFERRAL_ADDRESS]))[0]<output)throw Error('The referral reward contract is currently underfunded.');
  const dest=await destination(s,target,output,serve);await s.finish();
  return quote(s,'Review referral claim',REFERRAL_ADDRESS,offerAbi.encodeFunctionData('redeemRewards',[points,into]),'0x0',[["Points redeemed",formatEther(points)],["Points remaining after claim",formatEther(available-points)],["Referral bonus rate",formatUnits(bonus[0],2)+'%'],["Gross referral reward",formatEther(reward)+' OINK'],["Destination payout",formatUnits(rate,2)+'%'],["Reward reduction",formatEther(reward-output)+' OINK'],["OINK received",formatEther(output)+' OINK'],["Reward destination",target==='wallet'?'Your wallet · '+s.account:target+' miner · '+dest.address],...dest.facts],['The selected points are permanently consumed. A lower destination payout does not preserve the unused part of those points.',target==='wallet'?'The reduced reward is liquid OINK sent to your wallet.':'The reward becomes a locked miner. Mandatory service and future early or late withdrawal penalties apply.','Rates and funding can change before the transaction mines.'],{action:'referral',points:points.toString(),current:current[0].toString(),legacy:legacy[0].toString(),bonus:bonus[0].toString(),rate:rate.toString(),serve:serve.toString(),output:output.toString(),destination:into,destinationTerms:dest.terms});
}
function events(receipt:ProtocolReceipt,address:string,name:string){return receipt.logs.filter(l=>!l.removed&&equal(l.address,address)).flatMap(l=>{try{const e=offerAbi.parseLog(l);return e?.name===name?[e.args]:[];}catch{return [];}});}
export async function verifyOffer(rpc:FarmReadRpc,review:ProtocolReview,receipt:ProtocolReceipt){
  if(review.request.module!=='offers')return false;
  const t=JSON.parse(review.quote.fingerprint) as Record<string,string>,tag=receipt.blockNumber;
  const runtime=async(address:string,hash:string)=>verifyRuntime(await rpc.send('eth_getCode',[address,tag]),hash,'Offer receipt');
  if(t.action==='sale-approve'||t.action==='sale-reset'){
    const spec=VERIFIED_FARM_WRITES.find(v=>v.symbol===review.request.args.asset);if(!spec?.tokenAddress||!equal(t.token,spec.tokenAddress)||!equal(review.transaction.to,spec.tokenAddress))return false;
    await runtime(spec.tokenAddress,spec.tokenRuntimeCodeHash!);
    return events(receipt,spec.tokenAddress,'Approval').some(a=>equal(a.owner,review.quote.account)&&equal(a.spender,SALE_ADDRESS)&&a.value===BigInt(t.approved));
  }
  const source=t.action==='sale'?OFFER_DEPLOYMENTS.sale:t.action==='referral'?OFFER_DEPLOYMENTS.referral:null;if(!source||!equal(source.address,review.transaction.to))return false;
  await Promise.all([runtime(source.address,source.runtimeHash),runtime(common.rewardToken,common.rewardTokenRuntimeCodeHash)]);
  const emitted=events(receipt,source.address,t.action==='sale'?'BUY':'ClaimReferralReward').filter(a=>equal(a.buyer??a.user,review.quote.account)&&equal(a.pool??a.claimInto,t.destination));
  if(emitted.length!==1)return false;
  const amount=BigInt(emitted[0].oinks??emitted[0].amount);
  // With no on-chain sale minimum, a worse-than-reviewed execution stays uncertain.
  if(amount<BigInt(t.output))return false;
  if(t.action==='sale'){
    const treasury=offerAbi.decodeFunctionResult('treasury',await rpc.send('eth_call',[{to:SALE_ADDRESS,data:offerAbi.encodeFunctionData('treasury')},tag]))[0];
    if(!equal(treasury,t.treasury)||!equal(t.treasury,common.treasuryWallet))return false;
    const payment=VERIFIED_FARM_WRITES.find(v=>v.symbol===review.request.args.asset);if(!payment)return false;
    if(payment.tokenAddress){
      await runtime(payment.tokenAddress,payment.tokenRuntimeCodeHash!);
      if(!events(receipt,payment.tokenAddress,'Transfer').some(a=>equal(a.from,review.quote.account)&&equal(a.to,t.treasury)&&a.value===BigInt(t.amount)))return false;
    }
  }
  if(review.request.args.destination==='wallet')return events(receipt,common.rewardToken,'Transfer').some(a=>equal(a.from,source.address)&&equal(a.to,review.quote.account)&&a.value===amount);
  const miner=MINER_PREVIEW_SPECS.find(v=>v.id===review.request.args.destination);if(!miner||!equal(miner.address,t.destination))return false;
  await runtime(miner.address,miner.runtimeCodeHash);
  return events(receipt,miner.address,'GiftDeposit').some(a=>equal(a.sender,source.address)&&equal(a.recipient,review.quote.account)&&a.amount===amount&&a.shares>0n&&a.lastDepositedTime>=BigInt(review.quote.timestamp));
}
export const offerAdapter:ProtocolAdapter={prepare:prepareOffer,verify:verifyOffer};
