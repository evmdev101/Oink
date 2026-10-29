import { Contract, formatEther, getAddress } from "ethers";
import { getPublicProvider } from "./chain";
import { snapshotRunner } from "./governanceReadSafety";
import { sharedDisplayReads } from "./sharedReadCache";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { ORDINARY_DEPLOYMENTS } from "../config/ordinaryGovernanceVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
const common=VERIFIED_FARM_WRITES[0],key="369:governance-metrics";
export type GovernanceMetrics={timestamp:number;block:number;secondsPerBlock:number;supply:string;virtualSupply:string;maxSupply:string;governorBalance:string;treasuryBalance:string;rate:string;threshold:string;active:boolean;endBlock:number|null;nextRate:string|null;allocation:string;miners:{id:string;days:number;balance:string;allocation:string}[]};
export const peekGovernanceMetrics=()=>sharedDisplayReads.peek<GovernanceMetrics>(key);
export function readGovernanceMetrics(signal?:AbortSignal){return sharedDisplayReads.read(key,async child=>{
  const rpc=await getPublicProvider();if(BigInt(await rpc.send("eth_chainId",[]))!==369n)throw Error("PulseChain required.");
  const block=await rpc.getBlock("latest");if(!block?.hash)throw Error("Block unavailable.");
  const runner=snapshotRunner(rpc,block.number,child);
  const token=new Contract(common.rewardToken,["function totalSupply() view returns(uint256)","function MAX_SUPPLY() view returns(uint256)","function balanceOf(address) view returns(uint256)","function governor() view returns(address)"],runner);
  const chef=new Contract(common.masterchef,["function DTXPerBlock() view returns(uint256)","function virtualTotalSupply() view returns(uint256)","function totalAllocPoint() view returns(uint256)","function poolInfo(uint256) view returns(uint256,uint256,address)","function owner() view returns(address)"],runner);
  const gov=new Contract(common.governor,["function thresholdFibonaccening() view returns(uint256)","function eventFibonacceningActive() view returns(bool)","function fibonacceningContract() view returns(address)","function treasuryWallet() view returns(address)"],runner);
  const reward=new Contract(ORDINARY_DEPLOYMENTS.reward.address,ORDINARY_DEPLOYMENTS.reward.abi,runner);
  const [mapped,owner,rewardAddress,treasury,supply,virtualSupply,maxSupply,governorBalance,treasuryBalance,rate,threshold,active,allocation,older,miners]=await Promise.all([
    token.governor(),chef.owner(),gov.fibonacceningContract(),gov.treasuryWallet(),token.totalSupply(),chef.virtualTotalSupply(),token.MAX_SUPPLY(),token.balanceOf(common.governor),token.balanceOf(common.treasuryWallet),chef.DTXPerBlock(),gov.thresholdFibonaccening(),gov.eventFibonacceningActive(),chef.totalAllocPoint(),rpc.getBlock(Math.max(0,block.number-200)),
    Promise.all(MINER_PREVIEW_SPECS.map(async m=>{const miner=new Contract(m.address,["function balanceOf() view returns(uint256)"],runner);const [pool,balance]=await Promise.all([chef.poolInfo(m.poolId),miner.balanceOf()]);if(getAddress(pool[2])!==getAddress(m.address))throw Error("Miner registry changed.");return{id:m.id,days:m.durationDays,balance:formatEther(balance),allocation:pool[0].toString()};})),
  ]);
  if([mapped,owner].some(a=>getAddress(a)!==getAddress(common.governor))||getAddress(rewardAddress)!==getAddress(ORDINARY_DEPLOYMENTS.reward.address)||getAddress(treasury)!==getAddress(common.treasuryWallet))throw Error("Governance mapping changed.");
  let endBlock:number|null=null,nextRate:string|null=null;
  if(active){const [id,start,next]=await Promise.all([reward.fibonacceningActiveID(),reward.fibonacceningActivatedBlock(),reward.calculateUpcomingRewardPerBlock()]);const row=await reward.fibonacceningProposals(id);endBlock=Number(start+row.duration);nextRate=formatEther(next);}
  if(!older||older.timestamp>=block.timestamp||older.number>=block.number)throw Error("Block timing unavailable.");
  if((await rpc.getBlock(block.number))?.hash!==block.hash)throw Error("Snapshot changed.");child.throwIfAborted();
  return{timestamp:block.timestamp,block:block.number,secondsPerBlock:(block.timestamp-older.timestamp)/(block.number-older.number),supply:formatEther(supply),virtualSupply:formatEther(virtualSupply),maxSupply:formatEther(maxSupply),governorBalance:formatEther(governorBalance),treasuryBalance:formatEther(treasuryBalance),rate:formatEther(rate),threshold:formatEther(threshold),active,endBlock,nextRate,allocation:allocation.toString(),miners};
},{signal,ttl:60000,timeout:30000});}
/** Display estimates only; no compounding or price appreciation is assumed. */
export function rewardProjection(metrics:GovernanceMetrics,rateText:string,durationText:string){
  if(!/^\d+(\.\d+)?$/.test(rateText)||!/^\d+$/.test(durationText))return null;
  const rate=Number(rateText),blocks=Number(durationText),allocation=Number(metrics.allocation),annualBlocks=365*86400/metrics.secondsPerBlock;
  if(!Number.isFinite(rate)||rate<=0||!Number.isSafeInteger(blocks)||blocks<=0||!Number.isFinite(annualBlocks)||annualBlocks<=0||allocation<=0||!Number.isFinite(rate*blocks))return null;
  return{emission:rate*blocks,hours:blocks*metrics.secondsPerBlock/3600,shareOfSupply:Number(metrics.virtualSupply)>0?rate*blocks/Number(metrics.virtualSupply)*100:null,miners:metrics.miners.map(m=>({...m,apr:Number(m.balance)>0?rate*annualBlocks*(Number(m.allocation)/allocation)/Number(m.balance)*100:null,eventReward:rate*blocks*(Number(m.allocation)/allocation)}))};
}
