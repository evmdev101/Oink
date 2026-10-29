import { Interface, getAddress, formatEther, ZeroAddress } from "ethers";
import { NFT_ALLOCATION } from "../config/nftGovernanceVerification";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { checkedParticipationSnapshot } from "./participationTransactions";
import { readNftAllocation, nftAllocationAbi, nftReadAbi } from "./nftAllocationState";
import { verifyRuntime, type FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolRequest, ProtocolQuote } from "./protocolTransactions";
const common=VERIFIED_FARM_WRITES[0],credit=PARTICIPATION_CONTRACTS.credit;
const json=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==="bigint"?x.toString():x);
export function nftActionEligibility(action:string, row:Awaited<ReturnType<typeof readNftAllocation>>, now:bigint) {
  const [pending,timestamp,committed]=row.pending;
  if(row.approved)throw Error("This allocation contract is already approved.");
  switch(action){
    case "notify": return;
    case "propose":
      if(pending||now<=timestamp||row.predecessorPending)throw Error("The candidate is pending, cooling off, or collides with a pending opposition ballot.");
      if(row.yes<=row.total*row.approveThreshold/1000n)throw Error("Support must exceed the current proposal threshold.");return;
    case "update": if(!pending||row.yes<=committed)throw Error("A pending proposal needs a new higher support total.");return;
    case "reject": if(!pending||row.no<=committed*row.rejectThreshold/1000n)throw Error("Opposition must exceed the rejection threshold for a pending proposal.");return;
    case "approve":
      if(!pending||now<=timestamp+row.rejectionPeriod)throw Error("The allocation approval waiting period has not ended.");
      if(row.no>committed*row.rejectThreshold/1000n)throw Error("This call would reject the candidate. Choose Reject instead.");return;
    default:throw Error("Unsupported NFT allocation action.");
  }
}
export async function prepareNftAllocation(rpc:FarmReadRpc,account:string,request:ProtocolRequest):Promise<ProtocolQuote>{
  if(request.module!=="nft-allocation")throw Error("Unsupported module.");
  const s=await checkedParticipationSnapshot(rpc,account),row=await readNftAllocation(rpc,s,request.args.candidate,request.action==="reject");
  nftActionEligibility(request.action,row,BigInt(s.timestamp));
  let spend=0n,stored=0n;
  const facts:[string,string][]=[["Candidate",row.candidate],["Runtime hash",row.codeHash],["Miner support",formatEther(row.yes)+" weighted OINK"],["Miner opposition",formatEther(row.no)+" weighted OINK"]];
  const warnings=["A compatible contract is not necessarily audited or safe. Its logic determines NFT reward allocations; independently review the candidate before voting or approving."];
  if(request.action==="notify"){
    spend=(await s.read(common.governor,"costToVote",[],nftReadAbi))[0]*50n;
    stored=(await s.read(credit.address,"userCredit",[s.account]))[0];
    if(stored<spend||!(await s.read(credit.address,"deductingContract",[NFT_ALLOCATION.address],nftReadAbi))[0])throw Error("The notification requires authorized credit deduction and 50 times the voting cost in stored credit.");
    facts.push(["Voting credit consumed",formatEther(spend)+" OINK"],["Maximum fallback wallet burn",formatEther(spend)+" OINK"]);
    warnings.push("Notification spends credit and announces a candidate; it does not cast miner votes or approve the candidate. If stored credit falls before mining, the contract can burn the shortfall from wallet OINK without an approval.");
  }
  if(row.pending[0])facts.push(["Approval eligible after",new Date(Number(row.pending[1]+row.rejectionPeriod)*1000).toISOString()],["Highest committed support",formatEther(row.pending[2])+" weighted OINK"]);
  if(request.action==="propose")warnings.push("This begins a three-day initial delay followed by the configured rejection period. Approval is a separate action.");
  if(request.action==="reject")warnings.push("This rejects the pending candidate and starts a three-day cooldown.");
  if(request.action==="approve")warnings.push("This enables this contract's NFT allocation rules for the protocol.");
  const method=({notify:"notifyVote",propose:"proposeAllocationContract",update:"updateVotes",reject:"rejectAllocationContract",approve:"approveAllocationContract"} as Record<string,string>)[request.action];
  await s.finish();
  return{title:"Review NFT allocation "+request.action,account:s.account,block:s.number,blockHash:s.block.hash,timestamp:s.timestamp,to:NFT_ALLOCATION.address,data:nftAllocationAbi.encodeFunctionData(method,[row.candidate]),value:"0x0",facts,warnings,fingerprint:json({action:request.action,row,spend,stored})};
}
export const nftAllocationAdapter:ProtocolAdapter={prepare:prepareNftAllocation,async verify(rpc,review,receipt){
  try{
    const saved=JSON.parse(review.quote.fingerprint),candidate=getAddress(saved.row.candidate),action=review.request.action,tag=receipt.blockNumber;
    verifyRuntime(await rpc.send("eth_getCode",[NFT_ALLOCATION.address,tag]),NFT_ALLOCATION.runtimeCodeHash,"NFT allocation receipt");
    const events=(address:string,name:string,abi=nftAllocationAbi)=>receipt.logs.filter(l=>!l.removed&&getAddress(l.address)===getAddress(address)).flatMap(l=>{try{const e=abi.parseLog(l);return e?.name===name?[e.args]:[];}catch{return[];}});
    const read=async(method:string)=>nftAllocationAbi.decodeFunctionResult(method,await rpc.send("eth_call",[{to:NFT_ALLOCATION.address,data:nftAllocationAbi.encodeFunctionData(method,[candidate])},tag]));
    const matched=(name:string,setting?:boolean)=>events(NFT_ALLOCATION.address,name).some(e=>getAddress(e[0])===candidate&&(setting===undefined||e[2]===setting));
    if(action==="notify"){
      verifyRuntime(await rpc.send("eth_getCode",[credit.address,tag]),credit.runtimeCodeHash,"Credit receipt");
      verifyRuntime(await rpc.send("eth_getCode",[common.rewardToken,tag]),common.rewardTokenRuntimeCodeHash,"OINK receipt");
      const abi=new Interface(["event DeductCredit(address indexed from,uint256 amount)","event Transfer(address indexed from,address indexed to,uint256 value)"]);
      const spends=events(credit.address,"DeductCredit",abi).filter(e=>getAddress(e[0])===review.quote.account),burn=events(common.rewardToken,"Transfer",abi).filter(e=>getAddress(e[0])===review.quote.account&&getAddress(e[1])===ZeroAddress).reduce((sum,e)=>sum+e[2],0n),amount=BigInt(saved.spend);
      return spends.length===1&&burn<=amount&&spends[0][1]===(burn>0n?burn:amount)&&events(NFT_ALLOCATION.address,"NotifyVote").some(e=>getAddress(e[0])===candidate&&e[1]===BigInt(candidate)&&getAddress(e[2])===review.quote.account);
    }
    const pending=await read("pendingContract");
    if(action==="propose")return matched("SetPendingContract",true)&&pending[0]&&pending[2]>0n;
    if(action==="update")return pending[0]&&events(NFT_ALLOCATION.address,"UpdateVotes").some(e=>getAddress(e[0])===candidate&&e[1]===BigInt(candidate)&&e[2]>BigInt(saved.row.pending[2])&&e[2]===pending[2]);
    if(action==="reject")return matched("SetPendingContract",false)&&!pending[0]&&pending[2]===0n;
    if(action==="approve")return !pending[0]&&(await read("allocationContract"))[0]&&matched("SetPendingContract",true)&&events(NFT_ALLOCATION.address,"SetAllocationContract").some(e=>getAddress(e[0])===candidate&&e[1]===true);
    return false;
  }catch{return false;}
}};
