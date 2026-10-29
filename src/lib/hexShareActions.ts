import { Interface, ZeroAddress, formatEther, formatUnits, getAddress, parseUnits } from "ethers";
import { HEX_SHARE_WRITE as h } from "../config/accessVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import type { FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolReceipt, ProtocolRequest, ProtocolReview } from "./protocolTransactions";
import { accessSnapshot, sameAccessAddress, verifyAccessCore, verifyAccessMiner, type AccessSnapshot } from "./accessSnapshot";
export const hexShareAbi = new Interface([
  "function hexC() view returns(address)", "function totalTshares() view returns(uint256)", "function safePeriod() view returns(uint256)", "function maxStakes() view returns(uint256)",
  "function userInfo(address) view returns(uint256,uint256,uint256)", "function accDtxPerShare() view returns(uint256)", "function lastCredit() view returns(uint256)",
  "function referredBy(address) view returns(address)", "function stakeCount(address) view returns(uint256)", "function stakeLists(address,uint256) view returns(uint40,uint72,uint72,uint16,uint16,uint16,bool)",
  "function stakeHexShares(address)", "function selfHarvest(address)", "function withdraw(address)",
  "event Deposit(address indexed sender,uint256 amount,uint256 debt,address indexed referredBy)",
  "event Harvest(address indexed user,address indexed harvestInto,uint256 harvestAmount,uint256 penalty)", "event Withdraw(address indexed sender,uint256 harvestAmount,uint256 penalty)",
  "event Transfer(address indexed from,address indexed to,uint256 value)","event GiftDeposit(address indexed sender,address indexed recipient,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
]);
async function hexDependencies(s: AccessSnapshot) {
  const common = await verifyAccessCore(s);
  await Promise.all([s.runtime(h.address,h.runtimeCodeHash),s.runtime(h.hex,h.hexRuntimeCodeHash)]);
  await Promise.all([["token",common.rewardToken],["masterchef",common.masterchef],["treasury",common.governor]].map(async ([method,expected])=>sameAccessAddress((await s.read(h.address,method))[0],expected,"HEX share "+method)));
  sameAccessAddress((await s.read(h.address,"hexC",[],hexShareAbi))[0],h.hex,"HEX token");
  sameAccessAddress((await s.read(common.masterchef,"poolInfo",[10]))[2],h.address,"HEX share pool");
  if ((await s.read(h.address,"poolID"))[0]!==10n) throw Error("HEX share pool changed.");
  return common;
}
export function calculateHexRewards(amount: bigint, debt: bigint, total: bigint, accumulator: bigint, credit: bigint, pending: bigint, lastCredit: bigint) {
  if (total<100000000n || amount>total-100000000n || credit+pending<lastCredit) throw Error("HEX share reward accounting is inconsistent.");
  const gross=amount*(accumulator+(credit+pending-lastCredit)*1000000000000n/total)/1000000000000n-debt;
  if (gross<0n) throw Error("HEX share rewards cannot be settled with the current accounting.");
  return gross;
}
export async function readHexSharePosition(rpc: FarmReadRpc, accountInput: string | null) {
  const s=await accessSnapshot(rpc),common=await hexDependencies(s),account=accountInput?getAddress(accountInput):null;
  const read=(method:string,args:unknown[]=[])=>s.read(h.address,method,args,hexShareAbi);
  const [total,safePeriod,maxStakes,acc,lastCredit,credit,pending,direct]=await Promise.all([read("totalTshares"),read("safePeriod"),read("maxStakes"),read("accDtxPerShare"),read("lastCredit"),s.read(common.masterchef,"credit",[h.address]),s.read(common.masterchef,"pendingDtx",[10]),s.read(h.address,"defaultDirectPayout")]);
  if (maxStakes[0]>500n || maxStakes[0]===0n || direct[0]>10000n) throw Error("HEX share settings require a new review.");
  const position=account?await read("userInfo",[account]):null;
  const count=account?(await s.read(h.hex,"stakeCount",[account],hexShareAbi))[0] as bigint:0n;
  const counted=Number(count<maxStakes[0]?count:maxStakes[0]);
  // Limit concurrency without changing the contract's first-N-stakes ordering.
  const stakes: bigint[]=[];
  for(let offset=0;offset<counted;offset+=12) {
    const group=await Promise.all(Array.from({length:Math.min(12,counted-offset)},(_,i)=>s.read(h.hex,"stakeLists",[account,offset+i],hexShareAbi)));
    stakes.push(...group.map(v=>v[2] as bigint));
  }
  const eligible=stakes.reduce((sum,v)=>sum+v,0n);
  const gross=position?calculateHexRewards(position[0],position[1],total[0],acc[0],credit[0],pending[0],lastCredit[0]):null;
  const destinations=await Promise.all(MINER_PREVIEW_SPECS.map(async miner=>({id:miner.id,label:miner.label,days:miner.durationDays,payout:(await s.read(h.address,"viewPoolPayout",[miner.address]))[0].toString(),minServe:(await s.read(h.address,"viewPoolMinServe",[miner.address]))[0].toString()})));
  if(destinations.some(d=>BigInt(d.payout)>10000n))throw Error("Invalid destination payout.");
  await s.finish();
  return {block:s.block,blockHash:s.blockHash,timestamp:s.timestamp,account,total:total[0].toString(),safePeriod:safePeriod[0].toString(),maxStakes:maxStakes[0].toString(),count:count.toString(),counted,eligible:eligible.toString(),registered:position?.[0].toString()??null,debt:position?.[1].toString()??null,lastAction:position?.[2].toString()??null,gross:gross?.toString()??null,direct:direct[0].toString(),destinations};
}
async function prepareHex(rpc: FarmReadRpc, accountInput: string, request: ProtocolRequest): Promise<ProtocolQuote> {
  // Current controls only create registration requests. Historical claim and
  // unregister reviews remain verifiable below for pending receipt recovery.
  if(request.module!=="hex-shares"||request.action!=="register")throw Error("Unsupported HEX share action.");
  const account=getAddress(accountInput),data=await readHexSharePosition(rpc,account),s=await accessSnapshot(rpc,data.block);
  if(s.blockHash!==data.blockHash)throw Error("HEX share snapshot changed.");
  const facts:[string,string][]=[],warnings=["This action registers HEX shares for OINK rewards. It never ends a HEX stake or transfers your HEX."];
  if(BigInt(data.registered!)!==0n)throw Error("Your wallet already has registered shares.");
  if(BigInt(data.eligible)<=0n)throw Error("No HEX stake shares are available to register for this wallet.");
  const referral=getAddress(request.args.referral?.trim()||ZeroAddress);
  if(referral===account)throw Error("A referral cannot be your own wallet.");
  const existing=(await s.read(h.address,"referredBy",[account],hexShareAbi))[0];
  const method="stakeHexShares",args=[referral],fingerprint=[data.registered,data.eligible,data.safePeriod,data.maxStakes,existing,referral].join("|");
  facts.push(["HEX stakes counted",data.counted+" of "+data.count],["T-shares registered",formatUnits(data.eligible,12)],["Claim wait",formatUnits(BigInt(data.safePeriod),0)+" seconds"],["Referral",getAddress(existing)===ZeroAddress?referral:existing]);
  warnings.push("Only the first "+data.maxStakes+" HEX stakes are counted. Claims become available after the safe period shown above.");
  await s.finish();
  return {title:"Register HEX shares",account,block:s.block,blockHash:s.blockHash,timestamp:s.timestamp,to:h.address,data:hexShareAbi.encodeFunctionData(method,args),value:"0x0",facts,warnings,fingerprint};
}
async function verifyHex(rpc: FarmReadRpc,review:ProtocolReview,receipt:ProtocolReceipt) {
  // Preserve verification of reviews saved when claim/unregister were offered.
  const s=await accessSnapshot(rpc,Number(BigInt(receipt.blockNumber))),common=await hexDependencies(s);
  const expected=hexShareAbi.parseTransaction({data:review.transaction.data});if(!expected)return false;
  const action=review.request.action,event=action==="register"?"Deposit":action==="claim"?"Harvest":"Withdraw";
  const matches=receipt.logs.filter(v=>getAddress(v.address)===getAddress(h.address)).flatMap(v=>{try{const decoded=hexShareAbi.parseLog(v);return decoded?.name===event?[decoded]:[]}catch{return[]}});
  if(matches.length!==1)return false;const log=matches[0];
  if(getAddress(log.args[0])!==getAddress(review.quote.account))return false;
  if(action==="register") {
    const shares=review.quote.facts.find(v=>v[0]==="T-shares registered")?.[1];
    if(!shares||log.args.amount!==parseUnits(shares,12)||getAddress(log.args.referredBy)!==getAddress(expected.args[0]))return false;
  } else {
    if(action==="claim"&&getAddress(log.args.harvestInto)!==getAddress(expected.args[0]))return false;
    const quoted=review.quote.facts.find(v=>v[0]==="OINK received")?.[1];if(!quoted||log.args.harvestAmount<parseUnits(quoted,18))return false;
    const rateText=review.quote.facts.find(v=>v[0]==="Destination payout")?.[1];if(!rateText?.endsWith("%"))return false;
    const rate=parseUnits(rateText.slice(0,-1),2),gross=log.args.harvestAmount+log.args.penalty;
    if(log.args.harvestAmount!==gross*rate/10000n)return false;
    const transfers=receipt.logs.filter(v=>getAddress(v.address)===getAddress(common.rewardToken)).flatMap(v=>{try{const p=hexShareAbi.parseLog(v);return p?.name==="Transfer"?[p]:[]}catch{return[]}});
    const into=getAddress(expected.args[0]),wallet=getAddress(review.quote.account),mintTo=into===wallet?wallet:getAddress(h.address);
    if(!transfers.some(v=>getAddress(v.args.from)===ZeroAddress&&getAddress(v.args.to)===mintTo&&v.args.value===log.args.harvestAmount))return false;
    if(log.args.penalty>0n&&!transfers.some(v=>getAddress(v.args.from)===ZeroAddress&&getAddress(v.args.to)===getAddress(common.governor)&&v.args.value===log.args.penalty))return false;
    if(into!==wallet){
      const miner=MINER_PREVIEW_SPECS.find(v=>getAddress(v.address)===into);if(!miner)return false;
      await verifyAccessMiner(s,miner.id);
      if(!transfers.some(v=>getAddress(v.args.from)===getAddress(h.address)&&getAddress(v.args.to)===ZeroAddress&&v.args.value===log.args.harvestAmount))return false;
      const gifts=receipt.logs.filter(v=>getAddress(v.address)===into).flatMap(v=>{try{const p=hexShareAbi.parseLog(v);return p?.name==="GiftDeposit"?[p]:[]}catch{return[]}});
      if(gifts.length!==1||getAddress(gifts[0].args.sender)!==getAddress(h.address)||getAddress(gifts[0].args.recipient)!==wallet||gifts[0].args.amount!==log.args.harvestAmount||gifts[0].args.shares<=0n)return false;
    }
  }
  await s.finish();return true;
}
export const hexShareAdapter:ProtocolAdapter={prepare:prepareHex,verify:verifyHex};
