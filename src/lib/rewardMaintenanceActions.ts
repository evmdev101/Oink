import { Interface, getAddress, formatEther } from "ethers";
import { ORDINARY_DEPLOYMENTS } from "../config/ordinaryGovernanceVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { ordinaryDependencies } from "./ordinaryProposalActions";
import { checkedParticipationSnapshot, participationUint } from "./participationTransactions";
import type { FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolRequest, ProtocolQuote } from "./protocolTransactions";
const reward=ORDINARY_DEPLOYMENTS.reward,abi=new Interface(reward.abi),common=VERIFIED_FARM_WRITES[0];
const extra=new Interface(["function totalFibonacciEventsAfterGrand() view returns(uint256)"]);
export async function prepareRewardMaintenance(rpc:FarmReadRpc,account:string,request:ProtocolRequest):Promise<ProtocolQuote>{
  if(request.module!=="reward-maintenance"||!["end","cancel"].includes(request.action))throw Error("Unsupported reward maintenance action.");
  const s=await checkedParticipationSnapshot(rpc,account),read=await ordinaryDependencies(rpc,"reward",s.block.number);
  if(!(await read(common.governor,"eventFibonacceningActive"))[0])throw Error("There is no active Reward Boost event.");
  const activeId=(await read(reward.address,"fibonacceningActiveID",[],abi))[0],start=(await read(reward.address,"fibonacceningActivatedBlock",[],abi))[0];
  const active=await read(reward.address,"fibonacceningProposals",[activeId],abi);
  const facts:[string,string][]=[["Active event",activeId.toString()],["Event end block",String(start+active.duration)]];
  const state:Record<string,unknown>={action:request.action,activeId,start,active:Array.from(active)};
  let method:string,args:bigint[]=[],warnings:string[];
  if(request.action==="end"){
    if(start===0n||BigInt(s.number)<start+active.duration)throw Error("The Reward Boost event has not reached its end block.");
    const next=(await read(reward.address,"calculateUpcomingRewardPerBlock",[],abi))[0],grand=(await read(reward.address,"expiredGrandFibonaccening",[],abi))[0];
    state.next=next;state.grand=grand;state.count=(await read(common.governor,"totalFibonacciEventsAfterGrand",[],extra))[0];
    facts.push(["Next emission rate",formatEther(next)+" OINK per block"]);
    method="endFibonaccening";warnings=["This ends the active boost and applies the protocol's next emission rate. The rate is calculated at execution and may change with protocol state before mining."];
  }else{
    const id=participationUint(request.args.id,"Competing proposal ID");
    if(id===activeId)throw Error("Choose a competing proposal, not the active event.");
    const row=await read(reward.address,"fibonacceningProposals",[id],abi);
    if(!row.valid)throw Error("This proposal is already closed.");
    state.id=id;state.row=Array.from(row);args=[id];method="cancleFibonaccening";
    facts.push(["Proposal to cancel",id.toString()],["Proposed reward",formatEther(row.rewardPerBlock)+" OINK per block"]);
    warnings=["This permanently closes the competing proposal while another event is active. Previously spent voting credit is not refunded."];
  }
  await s.finish();
  return{title:request.action==="end"?"End expired Reward Boost":"Cancel competing Reward Boost proposal",account:s.account,block:s.number,blockHash:s.block.hash,timestamp:s.timestamp,to:reward.address,data:abi.encodeFunctionData(method,args),value:"0x0",facts,warnings,fingerprint:JSON.stringify(state,(_,v)=>typeof v==="bigint"?v.toString():v)};
}
export const rewardMaintenanceAdapter:ProtocolAdapter={prepare:prepareRewardMaintenance,async verify(rpc,review,receipt){
  try{
    const read=await ordinaryDependencies(rpc,"reward",receipt.blockNumber),state=JSON.parse(review.quote.fingerprint),end=review.request.action==="end";
    const events=receipt.logs.filter(l=>!l.removed&&getAddress(l.address)===getAddress(reward.address)).flatMap(l=>{try{const e=abi.parseLog(l);return e?[e]:[];}catch{return[];}});
    if(!events.some(e=>e.name===(end?"EndFibonaccening":"CancleFibonaccening")&&e.args[0]===BigInt(end?state.activeId:state.id)&&getAddress(e.args[1])===review.quote.account))return false;
    if(!end)return !(await read(reward.address,"fibonacceningProposals",[BigInt(state.id)],abi)).valid;
    if((await read(common.governor,"eventFibonacceningActive"))[0])return false;
    const emissionAbi=new Interface(["event SetInflation(uint256 rewardPerBlock)","event UpdateEmissions(address indexed user,uint256 newEmissions)"]);
    const logs=receipt.logs.filter(l=>!l.removed).flatMap(l=>{try{const e=emissionAbi.parseLog(l);return e?[{address:getAddress(l.address),event:e}]:[];}catch{return[];}});
    const rate=(await read(common.masterchef,"DTXPerBlock"))[0];
    if(!state.grand&&rate!==BigInt(state.next))return false;
    if(state.grand&&(await read(common.governor,"totalFibonacciEventsAfterGrand",[],extra))[0]!==BigInt(state.count)+1n)return false;
    return logs.some(l=>l.address===getAddress(common.governor)&&l.event.name==="SetInflation"&&l.event.args[0]===rate)&&logs.some(l=>l.address===getAddress(common.masterchef)&&l.event.name==="UpdateEmissions"&&getAddress(l.event.args[0])===review.quote.account&&l.event.args[1]===rate);
  }catch{return false;}
}};
