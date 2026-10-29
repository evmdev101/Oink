import { Interface, getAddress, toBeHex } from "ethers";
import { NFT_ALLOCATION } from "../config/nftGovernanceVerification";
import { SENATE_PIN, SENATE_ACTION_ABI, CONSENSUS_ACTION_ABI } from "../config/advancedGovernanceVerification";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { nftAllocationAbi } from "./nftAllocationState";
import { getPublicProvider } from "./chain";
import { sharedDisplayReads } from "./sharedReadCache";
import { verifyRuntime, type FarmReadRpc } from "./farmTransactions";
export type DiscoveredCandidate={address:string;kind:"allocation"|"add"|"remove"|"member";status:string;votes?:string};
const senate=new Interface(SENATE_ACTION_ABI),consensus=new Interface(CONSENSUS_ACTION_ABI);
export async function discoverGovernanceCandidates(rpc:FarmReadRpc,kind:"nft"|"senate",signal?:AbortSignal){
  if(BigInt(await rpc.send("eth_chainId",[]))!==369n)throw Error("PulseChain required.");
  const block=await rpc.send("eth_getBlockByNumber",["latest",false]),pin=kind==="nft"?NFT_ALLOCATION:SENATE_PIN,abi=kind==="nft"?nftAllocationAbi:senate;
  verifyRuntime(await rpc.send("eth_getCode",[pin.address,block.number]),pin.runtimeCodeHash,"Candidate registry");
  const names=kind==="nft"?["NotifyVote","SetPendingContract","SetAllocationContract"]:["AddVote"];
  const logs=await rpc.send("eth_getLogs",[{address:pin.address,fromBlock:"0x0",toBlock:block.number,topics:[names.map(name=>abi.getEvent(name)!.topicHash)]}]);
  if(!Array.isArray(logs)||logs.length>=10000)throw Error("Candidate history is incomplete. Enter a known address or retry.");
  signal?.throwIfAborted();
  const read=async(to:string,method:string,args:unknown[]=[],iface=abi)=>iface.decodeFunctionResult(method,await rpc.send("eth_call",[{to,data:iface.encodeFunctionData(method,args)},block.number]));
  const addresses=new Set<string>(),ballots=new Set<bigint>();
  for(const log of logs){if(log.removed)continue;if(getAddress(log.address)!==getAddress(pin.address)||BigInt(log.blockNumber)>BigInt(block.number))throw Error("Candidate event source mismatch.");const event=abi.parseLog(log);if(!event||!names.includes(event.name))throw Error("Unrecognized candidate event.");if(kind==="nft")addresses.add(getAddress(event.args[0]));else ballots.add(event.args[1]);}
  let rows:DiscoveredCandidate[]=[];
  if(kind==="nft"){
    if(addresses.size>200)throw Error("More than 200 candidates were found. Enter an address to inspect it directly.");
    const all=[...addresses];for(let start=0;start<all.length;start+=8){signal?.throwIfAborted();rows.push(...await Promise.all(all.slice(start,start+8).map(async address=>{const [approved,pending]=await Promise.all([read(pin.address,"allocationContract",[address]),read(pin.address,"pendingContract",[address])]);return{address,kind:"allocation" as const,status:approved[0]?"Approved":pending[0]?"Pending approval":pending[1]>BigInt(block.timestamp)?"Cooling off":"Announced / not pending"};})));}
  }else{
    const members=Array.from((await read(pin.address,"viewSenators"))[0],String).map(getAddress),counts=await read(PARTICIPATION_CONTRACTS.consensus.address,"proposalLengths",[],consensus);
    rows=members.map(address=>({address,kind:"member",status:"Registered member"}));
    const usable=[...ballots].filter(ballot=>ballot>counts[1]&&ballot>0n&&ballot<2n**160n);
    if(usable.length>200)throw Error("Membership ballot history is too large. Enter a candidate address directly.");
    for(let start=0;start<usable.length;start+=8){signal?.throwIfAborted();const found=await Promise.all(usable.slice(start,start+8).map(async ballot=>{
      const raw=getAddress(toBeHex(ballot,20)),previous=getAddress(toBeHex(ballot-1n,20));
      const [votes,wasPrevious,wasCandidate]=await Promise.all([read(pin.address,"votesForProposal",[ballot]),read(pin.address,"addedSenator",[previous]),read(pin.address,"addedSenator",[raw])]);
      if(votes[0]===0n)return null;
      // A known previous member identifies an address+1 removal ballot. Do not
      // reinterpret old removals as proposals for the adjacent address.
      if(wasPrevious[0])return members.includes(previous)?{address:previous,kind:"remove" as const,status:"Removal ballot",votes:String(votes[0])}:null;
      if(wasCandidate[0])return null;
      return{address:raw,kind:"add" as const,status:"Addition ballot",votes:String(votes[0])};
    }));rows.push(...found.filter((row):row is NonNullable<typeof row>=>row!==null));}
  }
  if((await rpc.send("eth_getBlockByNumber",[block.number,false]))?.hash!==block.hash)throw Error("Candidate snapshot changed.");signal?.throwIfAborted();
  return{rows,timestamp:Number(BigInt(block.timestamp)),block:Number(BigInt(block.number))};
}
export function readGovernanceCandidates(kind:"nft"|"senate",signal?:AbortSignal){return sharedDisplayReads.read("369:candidates:"+kind,async child=>discoverGovernanceCandidates(await getPublicProvider(),kind,child),{signal,ttl:60000,timeout:25000});}
