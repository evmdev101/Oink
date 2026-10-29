import { Interface, ZeroAddress, formatEther, formatUnits, getAddress } from "ethers";
import { COMMUNITY_DEPLOYMENTS } from "../config/communityMaintenanceVerification";
import { ORDINARY_DEPLOYMENTS } from "../config/ordinaryGovernanceVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { SENATE_PIN } from "../config/advancedGovernanceVerification";
import { accessSnapshot, sameAccessAddress, verifyAccessCore, verifyAccessMiner, type AccessSnapshot } from "./accessSnapshot";
import { verifyFarmTokenState } from "./farmTokenSafety";
import type { FarmReadRpc, FarmWriteSpec } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolRequest, ProtocolReceipt } from "./protocolTransactions";
import { ordinaryProposalAdapter } from "./ordinaryProposalActions";
import { rewardMaintenanceAdapter } from "./rewardMaintenanceActions";

export const COMMUNITY_MAINTENANCE_ACTIONS = [
  {id:"buyback",title:"Buy back OINK",description:"Use PLS already in the buyback contract to buy OINK and send it to the treasury.",label:"Buy back OINK"},
  {id:"convert-buyback",title:"Prepare buyback PLS",description:"Swap PLSX, INC or HEX held by the buyback contract for PLS.",label:"Convert tokens to PLS"},
  {id:"harvest-pulsex",title:"Harvest from PulseX",description:"Collect the protocol's INC farming rewards and send them to its buyback contract.",label:"Harvest from PulseX"},
  {id:"sync-staking",title:"Sync staking rewards",description:"Rebalance the six OINK miner reward allocations using their current balances.",label:"Sync staking rewards"},
  {id:"start-event",title:"Start a scheduled Reward Boost",description:"Apply an eligible community proposal and its configured OINK burn and emissions.",label:"Start Reward Boost"},
  {id:"end-event",title:"End an expired Reward Boost",description:"Close the active event after its on-chain end block and apply the next emission rate.",label:"End Reward Boost"},
  {id:"reduce-rewards",title:"Reduce ecosystem maximum",description:"After seven days, reduce the current maximum ecosystem allocation by 1% of its present value.",label:"Reduce ecosystem maximum"},
  {id:"cap-ecosystem",title:"Apply ecosystem maximum",description:"Scale ecosystem allocation percentages down when their total exceeds the current maximum.",label:"Apply ecosystem maximum"},
  {id:"rebalance-ecosystem",title:"Rebalance ecosystem rewards",description:"Apply the current ecosystem allocation percentages to the live farm pools.",label:"Rebalance ecosystem rewards"},
  {id:"collect-fees",title:"Collect mining fees",description:"Collect due funding fees from a bounded batch of current farm positions into the treasury.",label:"Collect mining fees"},
  {id:"sync-fees",title:"Sync vault fees",description:"Apply the Governor's current fee settings to a PLS, PLSX, INC or HEX farm.",label:"Sync vault fees"},
  {id:"harvest-senate",title:"Distribute Senate mining credit",description:"Allocate accrued Senate mining credit to current senators using the deployed fair-mint rule.",label:"Distribute Senate credit"},
  {id:"publish-senate-credit",title:"Publish your mining credit to the Senate",description:"Use your wallet's available mining credit to mint OINK to the Senate contract.",label:"Publish credit to Senate"},
] as const;
export type CommunityMaintenanceAction = typeof COMMUNITY_MAINTENANCE_ACTIONS[number]["id"];
export type CommunityActionReadiness = {ready:boolean;reason:string};
// EMIT is enabled only for the existing funding-fee path, not user deposits. Its
// vault was independently recompiled in expanded-farm-vaults.json; its verified
// token can charge transfer taxes, so the review states nominal deductions.
export const COMMUNITY_EMIT_FEE_FARM:FarmWriteSpec={...VERIFIED_FARM_WRITES[0],id:"emit",address:"0x1aB20028a50477e11bC4066047D8942De1375eF7",tokenAddress:"0x32fB5663619A657839A80133994E45c5e5cDf427",symbol:"EMIT",poolId:"20",runtimeCodeHash:"0x9ee2dfb530c509f8e42d62e74d63533acac6048610baee02e10f2fbf21e0ba0d",tokenRuntimeCodeHash:"0xfc47a5d6dd16377039e483a23ad342dd1296b0bd1f1ccfbb0c220c8ddb7b3542",sourceUrl:"https://scan.pulsechain.com/address/0x1aB20028a50477e11bC4066047D8942De1375eF7#code"};
export const COMMUNITY_FEE_FARMS = [...VERIFIED_FARM_WRITES.filter(f=>["pls","plsx","inc","hex","atropa","pdai","solidx","hoa","pusdt","pusdc"].includes(f.id)),COMMUNITY_EMIT_FEE_FARM];
export const COMMUNITY_UNAVAILABLE_FEE_FARMS={pdrip:"The pDRIP proxy's current implementation has no verified public source. Its fee collection remains external until that implementation is verified."} as const;
export const communityMaintenanceAbi = new Interface([
  "function lastHarvestedTime() view returns(uint256)","function harvest()","function rebalancePools()","function reduceMaxPulseAllocation()","function rebalanceIfPulseAllocationExceedsMaximum()",
  "function percentageAllocatedToPulseEcosystem() view returns(uint256)","function maxPulseEcoTotalAllocation() view returns(uint256)","function lastReducePulseAllocation() view returns(uint256)","function poolAllocationPercentage(uint256) view returns(uint256)","function poolLength() view returns(uint256)",
  "function eventFibonacceningActive() view returns(bool)","function farmContract() view returns(address)","function fibonacceningContract() view returns(address)",
  "function DTX() view returns(address)","function INC() view returns(address)","function wPLS() view returns(address)","function governor() view returns(address)","function treasury() view returns(address)","function uniswapRouter() view returns(address)","function UNISWAP_ROUTER_ADDRESS() view returns(address)","function PAIR_ADDRESS() view returns(address)","function incMasterchef() view returns(address)","function buyandburn() view returns(address)",
  "function lastHaltTimestamp() view returns(uint256)","function getRemainingDailyAllowance() view returns(uint256)","function getEstimatedDTXforETH() view returns(uint256[])","function getEstimatedPLSforToken(address) view returns(uint256[])","function getCurrentDay() view returns(uint256)","function dailyPLSUsed(uint256) view returns(uint256)","function MAX_SWAP() view returns(uint256)","function buyWithPLS()","function swapTokenForPLS(address,uint256)",
  "function balanceOf(address) view returns(uint256)","function balanceOf() view returns(uint256)","function allowance(address,address) view returns(uint256)","function token0() view returns(address)","function token1() view returns(address)","function getReserves() view returns(uint112,uint112,uint32)",
  "function harvest(uint256)","function pendingInc(uint256,address) view returns(uint256)","function userInfo(uint256,address) view returns(uint256,uint256)",
  "function depositFee() view returns(uint256)","function fundingRate() view returns(uint256)","function maxFee() view returns(uint256)","function maxFundingFee() view returns(uint256)","function lastFundingChangeTimestamp() view returns(uint256)","function updateFees()",
  "function getNrOfStakes(address) view returns(uint256)","function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256)","function collectCommission(address[],uint256[][])","function poolInfo(uint256) view returns(uint256,uint256,address)","function treasuryWallet() view returns(address)","function masterchef() view returns(address)","function token() view returns(address)","function poolID() view returns(uint256)","function stakeToken() view returns(address)",
  "function senateContract() view returns(address)","function owner() view returns(address)","function viewSenators() view returns(address[])","function senatorRewards() view returns(bool)","function startBlock() view returns(uint256)","function totalCreditRewards() view returns(uint256)","function totalCreditRewardsAtLastFairMint() view returns(uint256)","function fairTokensPublishedToSenate() view returns(uint256)","function fairMintSenate()","function credit(address) view returns(uint256)","function publishTokens(address,uint256)","function totalPublished() view returns(uint256)",
  "event Transfer(address indexed from,address indexed to,uint256 value)","event CollectedFee(address indexed from,uint256 amount)","event Withdrawal(address indexed user,uint256 indexed pid,uint256 amount)",
]);
const a=communityMaintenanceAbi,c=VERIFIED_FARM_WRITES[0],d=COMMUNITY_DEPLOYMENTS;
const json=(v:unknown)=>JSON.stringify(v,(_,x)=>typeof x==="bigint"?x.toString():x);
const address=(value:string)=>getAddress(value);
const read=(s:AccessSnapshot,to:string,name:string,args:unknown[]=[])=>s.read(to,name,args,a);
export async function communityMaintenanceSnapshot(rpc:FarmReadRpc,block?:number){
  const s=await accessSnapshot(rpc,block);await verifyAccessCore(s);
  const farm=ORDINARY_DEPLOYMENTS.farms,reward=ORDINARY_DEPLOYMENTS.reward;
  await Promise.all([s.runtime(farm.address,farm.runtimeCodeHash),s.runtime(reward.address,reward.runtimeCodeHash)]);
  sameAccessAddress((await read(s,c.governor,"farmContract"))[0],farm.address,"Ecosystem module");sameAccessAddress((await read(s,c.governor,"fibonacceningContract"))[0],reward.address,"Reward module");
  for(const target of [farm,reward]){sameAccessAddress((await s.read(target.address,"owner"))[0],c.governor,"Module governor");sameAccessAddress((await s.read(target.address,"token"))[0],c.rewardToken,"Module token");sameAccessAddress((await s.read(target.address,"masterchef"))[0],c.masterchef,"Module MasterChef");}
  return s;
}
async function verifyBuyback(s:AccessSnapshot){
  await Promise.all([d.buyback,d.router,d.pair,d.wpls].map(v=>s.runtime(v.address,v.runtimeCodeHash)));
  for(const[name,expected]of [["DTX",c.rewardToken],["wPLS",d.wpls.address],["governor",c.governor],["treasury",c.treasuryWallet],["uniswapRouter",d.router.address],["PAIR_ADDRESS",d.pair.address]])sameAccessAddress((await read(s,d.buyback.address,name))[0],expected,"Buyback "+name);
  const tokens=[(await read(s,d.pair.address,"token0"))[0],(await read(s,d.pair.address,"token1"))[0]].map(address).sort();
  if(json(tokens)!==json([c.rewardToken,d.wpls.address].map(address).sort()))throw Error("Buyback pair tokens changed.");
}
async function verifyFarmer(s:AccessSnapshot){
  await Promise.all([d.farmer,d.incChef].map(v=>s.runtime(v.address,v.runtimeCodeHash)));
  for(const[name,expected]of [["DTX",c.rewardToken],["INC",VERIFIED_FARM_WRITES.find(f=>f.id==="inc")!.tokenAddress!],["governor",c.governor],["treasury",c.treasuryWallet],["incMasterchef",d.incChef.address],["buyandburn",d.buyback.address]])sameAccessAddress((await read(s,d.farmer.address,name))[0],expected,"PulseX farmer "+name);
}
async function verifyFeeFarm(rpc:FarmReadRpc,s:AccessSnapshot,id:string):Promise<FarmWriteSpec>{
  if(id==="pdrip")throw Error(COMMUNITY_UNAVAILABLE_FEE_FARMS.pdrip);const farm=COMMUNITY_FEE_FARMS.find(f=>f.id===id);if(!farm)throw Error("Select a supported fee farm.");
  await s.runtime(farm.address,farm.runtimeCodeHash);await verifyFarmTokenState(rpc,farm,c.treasuryWallet,s.tag);
  for(const[name,expected]of [["masterchef",c.masterchef],["token",c.rewardToken],["treasuryWallet",c.treasuryWallet],["treasury",c.governor]])sameAccessAddress((await read(s,farm.address,name))[0],expected,"Fee farm "+name);
  if((await read(s,farm.address,"poolID"))[0]!==BigInt(farm.poolId))throw Error("Fee farm pool changed.");
  sameAccessAddress((await read(s,c.masterchef,"poolInfo",[farm.poolId]))[2],farm.address,"MasterChef fee farm");
  if(farm.tokenAddress)sameAccessAddress((await read(s,farm.address,"stakeToken"))[0],farm.tokenAddress,"Fee asset");return farm;
}
async function senateState(s:AccessSnapshot){
  await s.runtime(SENATE_PIN.address,SENATE_PIN.runtimeCodeHash);sameAccessAddress((await read(s,c.governor,"senateContract"))[0],SENATE_PIN.address,"Governor Senate");sameAccessAddress((await read(s,SENATE_PIN.address,"owner"))[0],c.governor,"Senate governor");sameAccessAddress((await read(s,SENATE_PIN.address,"token"))[0],c.rewardToken,"Senate token");
  const members=((await read(s,SENATE_PIN.address,"viewSenators"))[0] as string[]).map(address);if(members.length>1000||new Set(members).size!==members.length||members.some(v=>v===ZeroAddress))throw Error("Current Senate membership needs a new review.");return members;
}
export function parseCommunityFeeUsers(value:string){
  const raw=value.trim().split(/[\s,;]+/).filter(Boolean);if(!raw.length||raw.length>50)throw Error("Enter between 1 and 50 fee payer addresses.");
  const users=raw.map(address);if(users.some(v=>v===ZeroAddress)||new Set(users).size!==users.length)throw Error("Fee payer addresses must be nonzero and unique.");return users;
}
export function communityFeeDue(amount:bigint,lastAction:bigint,rate:bigint,lastChange:bigint,timestamp:bigint){
  const start=lastAction>lastChange?lastAction:lastChange;if(start>timestamp)throw Error("Position funding timestamp is in the future.");
  const hours=(timestamp-start)/3600n,uncapped=hours*amount*rate/1000000n;return rate>0n&&hours>0n?(uncapped>amount/5n?amount/5n:uncapped):0n;
}
type FeePosition={user:string;id:string;amount:string;debt:string;fees:string;last:string};
async function feePositions(s:AccessSnapshot,farm:FarmWriteSpec,users:string[]){
  const counts=await Promise.all(users.map(async user=>(await read(s,farm.address,"getNrOfStakes",[user]))[0] as bigint));
  if(counts.some(n=>n>200n)||counts.reduce((x,y)=>x+y,0n)>200n)throw Error("This batch exceeds 200 positions. Use fewer users.");
  const positions:FeePosition[]=[];for(let i=0;i<users.length;i++)for(let id=0n;id<counts[i];id++){const row=await read(s,farm.address,"userInfo(address,uint256)",[users[i],id]);positions.push({user:users[i],id:id.toString(),amount:String(row[0]),debt:String(row[1]),fees:String(row[2]),last:String(row[3])});}return positions;
}
function delegated(request:ProtocolRequest):ProtocolRequest{return request.action==="start-event"?{module:"ordinary",action:"execute",args:{family:"Reward boost",id:request.args.id}}:{module:"reward-maintenance",action:"end",args:{}};}
export async function prepareCommunityMaintenance(rpc:FarmReadRpc,account:string,request:ProtocolRequest):Promise<ProtocolQuote>{
  if(request.module!=="community-maintenance"||!COMMUNITY_MAINTENANCE_ACTIONS.some(v=>v.id===request.action))throw Error("Unsupported community maintenance action.");
  if(request.action==="start-event"||request.action==="end-event")return(request.action==="start-event"?ordinaryProposalAdapter:rewardMaintenanceAdapter).prepare(rpc,account,delegated(request));
  const s=await communityMaintenanceSnapshot(rpc);account=address(account);if(account===ZeroAddress)throw Error("Connect a wallet.");
  let to:string=c.governor,method="",args:unknown[]=[],facts:[string,string][]=[],warnings:string[]=[];const state:Record<string,unknown>={action:request.action};
  if(request.action==="buyback"||request.action==="convert-buyback"){
    await verifyBuyback(s);to=d.buyback.address;
    if(request.action==="buyback"){
      const [balance,allowance,halt,day,maximum,estimate]=await Promise.all([rpc.send("eth_getBalance",[to,s.tag]).then(BigInt),read(s,to,"getRemainingDailyAllowance"),read(s,to,"lastHaltTimestamp"),read(s,to,"getCurrentDay"),read(s,to,"MAX_SWAP"),read(s,to,"getEstimatedDTXforETH")]);
      if(balance===0n||allowance[0]===0n)throw Error("No buyback PLS or remaining daily allowance.");if(BigInt(s.timestamp)<=halt[0]+86400n)throw Error("Buybacks are currently halted.");
      // The deployed implementation caps MAX_SWAP only inside its daily-limit branch.
      const used=(await read(s,to,"dailyPLSUsed",[day[0]]))[0],reserves=await read(s,d.pair.address,"getReserves"),pool=(await read(s,d.pair.address,"token0"))[0]===d.wpls.address?reserves[0]:reserves[1],daily=pool*5n/100n;
      if(used>daily)throw Error("Daily allowance underflow would revert this buyback.");let spend=balance;if(used+balance>daily){spend=daily-used;if(spend>maximum[0])spend=maximum[0];}
      const amounts=estimate[0] as readonly bigint[],minimum=amounts.at(-1)!*99n/100n;if(spend===0n||minimum===0n)throw Error("Buyback quote is empty.");
      Object.assign(state,{balance,allowance:allowance[0],halt:halt[0],day:day[0],used,spend,minimum});method="buyWithPLS";
      facts=[["Contract PLS available",formatEther(balance)+" PLS"],["Maximum PLS used by this execution",formatEther(spend)+" PLS"],["OINK requested from router",formatEther(minimum)+" OINK"],["OINK destination",c.treasuryWallet]];
      warnings=["This spends the buyback contract's PLS, not your wallet's PLS. You pay the network fee.","The deployed contract requests exact OINK output from its router using a fresh quote at execution. Price and available daily allowance may change before mining."];
    }else{
      const farm=VERIFIED_FARM_WRITES.find(f=>f.symbol===request.args.asset&&["PLSX","INC","HEX"].includes(f.symbol));if(!farm?.tokenAddress)throw Error("Select PLSX, INC or HEX.");await verifyFarmTokenState(rpc,farm,account,s.tag);
      const balance=(await read(s,farm.tokenAddress,"balanceOf(address)",[to]))[0],allowance=(await read(s,farm.tokenAddress,"allowance",[to,d.router.address]))[0];if(balance===0n||allowance<balance)throw Error("No convertible token balance or router approval.");
      const estimate=(await read(s,to,"getEstimatedPLSforToken",[farm.tokenAddress]))[0] as readonly bigint[],minimum=estimate.at(-1)!*99n/100n;if(minimum===0n)throw Error("Conversion quote is empty.");
      Object.assign(state,{asset:farm.id,token:farm.tokenAddress,balance,minimum});method="swapTokenForPLS";args=[farm.tokenAddress,balance];facts=[["Asset held by contract",formatUnits(balance,farm.decimals)+" "+farm.symbol],["PLS requested from router",formatEther(minimum)+" PLS"],["PLS destination",to]];
      warnings=["The deployed contract converts its current token balance. Its amount argument is ignored by the deployed implementation; the full live balance is the maximum input.","The swap target is recalculated at execution. Review again if balances or the quote change."];
    }
  }else if(request.action==="harvest-pulsex"){
    await verifyFarmer(s);to=d.farmer.address;method="harvest(uint256)";args=[9];const pending=(await read(s,d.incChef.address,"pendingInc",[9,to]))[0],inc=VERIFIED_FARM_WRITES.find(f=>f.id==="inc")!;await verifyFarmTokenState(rpc,inc,account,s.tag);const balance=(await read(s,inc.tokenAddress!,"balanceOf(address)",[to]))[0];if(pending+balance===0n)throw Error("No PulseX INC rewards are available.");Object.assign(state,{pid:9,inc:inc.tokenAddress});facts=[["Pending PulseX rewards",formatEther(pending)+" INC"],["INC destination",d.buyback.address]];warnings=["Rewards continue accruing until execution. All INC held by the protocol farmer is forwarded to its buyback contract."];
  }else if(request.action==="sync-staking"){
    method="harvest()";const balances=await Promise.all(MINER_PREVIEW_SPECS.map(async miner=>{await verifyAccessMiner(s,miner.id);return(await read(s,miner.address,"balanceOf()"))[0] as bigint}));if(balances.reduce((x,y)=>x+y,0n)===0n)throw Error("Cannot rebalance empty miner pools.");Object.assign(state,{miners:MINER_PREVIEW_SPECS.map(v=>v.address)});facts=[["Miner pools","All 6 OINK lock durations"]];warnings=["Allocations use the live balances when the transaction executes. This updates protocol reward weights; it does not withdraw your positions."];
  }else if(["reduce-rewards","cap-ecosystem","rebalance-ecosystem"].includes(request.action)){
    to=ORDINARY_DEPLOYMENTS.farms.address;const [allocation,maximum,last,count]=await Promise.all([read(s,to,"percentageAllocatedToPulseEcosystem"),read(s,to,"maxPulseEcoTotalAllocation"),read(s,to,"lastReducePulseAllocation"),read(s,c.masterchef,"poolLength")]);if(allocation[0]>10000n||maximum[0]>10000n||count[0]<6n||count[0]>100n)throw Error("Ecosystem allocation settings require a new review.");Object.assign(state,{allocation:allocation[0],maximum:maximum[0],last:last[0],count:count[0]});facts=[["Ecosystem allocation",formatUnits(allocation[0],2)+"%"],["Current maximum",formatUnits(maximum[0],2)+"%"]];
    if(request.action==="reduce-rewards"){if(BigInt(s.timestamp)<last[0]+604800n||maximum[0]===0n)throw Error("The next weekly maximum reduction is not ready.");method="reduceMaxPulseAllocation";facts.push(["New maximum",formatUnits(maximum[0]*99n/100n,2)+"%"]);warnings=["This reduces the current maximum by 1%, not one percentage point. Applying the cap and rebalancing farm rewards are separate transactions."];}
    else if(request.action==="cap-ecosystem"){if(allocation[0]<=maximum[0])throw Error("Ecosystem allocation is already within the maximum.");method="rebalanceIfPulseAllocationExceedsMaximum";state.percentages=await Promise.all(Array.from({length:Number(count[0])-6},(_,i)=>read(s,to,"poolAllocationPercentage",[i+6]).then(v=>String(v[0]))));warnings=["This scales each ecosystem pool's allocation percentage down proportionally. Rebalance ecosystem rewards afterwards to apply the weights in MasterChef."];}
    else{if(allocation[0]>=10000n)throw Error("Ecosystem allocation leaves no miner weight.");method="rebalancePools";state.percentages=await Promise.all(Array.from({length:Number(count[0])-6},(_,i)=>read(s,to,"poolAllocationPercentage",[i+6]).then(v=>String(v[0]))));warnings=["Farm weights are calculated from current miner allocations and community-approved ecosystem percentages at execution."];}
  }else if(request.action==="harvest-senate"||request.action==="publish-senate-credit"){
    const members=await senateState(s);to=c.masterchef;state.members=members;
    if(request.action==="harvest-senate"){
      const [enabled,start,total,accounted,published]=await Promise.all([read(s,to,"senatorRewards"),read(s,to,"startBlock"),read(s,to,"totalCreditRewards"),read(s,to,"totalCreditRewardsAtLastFairMint"),read(s,to,"fairTokensPublishedToSenate")]);if(!members.length||!enabled[0]||BigInt(s.block)<=start[0]||total[0]<=accounted[0])throw Error("Senate fair-mint credit is not ready.");
      const perMember=(BigInt(total[0])-BigInt(accounted[0]))*(members.length<=100?100n:10000n/BigInt(members.length))/1000000n;if(perMember===0n)throw Error("Accrued Senate credit is too small to distribute.");Object.assign(state,{accounted:accounted[0],published:published[0],total:total[0],credits:await Promise.all(members.map(user=>read(s,to,"credit",[user]).then(v=>String(v[0]))))});method="fairMintSenate";facts=[["Senators",String(members.length)],["Credit per senator at this snapshot",formatEther(perMember)+" OINK mining credit"]];warnings=["The deployed method is fairMintSenate. It allocates mining credit directly to current senators; the original interface's harvestForSenate method is absent from the deployed contract.","The distribution is recalculated from newly accrued protocol credit when mined. It does not take tokens or credit from your wallet."];
    }else{
      const credit=(await read(s,to,"credit",[account]))[0];if(credit===0n)throw Error("Your wallet has no mining credit to publish.");const published=(await read(s,to,"totalPublished"))[0];Object.assign(state,{credit,published});method="publishTokens";args=[SENATE_PIN.address,credit];facts=[["YOUR mining credit spent",formatEther(credit)+" OINK"],["OINK recipient",SENATE_PIN.address]];warnings=["This permanently spends ALL currently available mining credit owned by your wallet to mint OINK to the Senate contract. The Senate's credit is not spent.","The original interface reads Senate credit but publishTokens charges the caller. This review uses your actual caller credit and states the recipient explicitly."];
    }
  }else{
    const farm=await verifyFeeFarm(rpc,s,request.args.farmId);to=farm.address;const [rate,lastChange]=await Promise.all([read(s,to,"fundingRate"),read(s,to,"lastFundingChangeTimestamp")]);if(rate[0]>250n)throw Error("Funding rate exceeds the verified fee bounds.");Object.assign(state,{farmId:farm.id,rate:rate[0],lastChange:lastChange[0]});
    if(request.action==="sync-fees"){
      if(!["pls","plsx","inc","hex"].includes(farm.id))throw Error("Fee sync is supported for PLS, PLSX, INC and HEX.");const [deposit,nextDeposit,nextRate,maxFee,maxRate]=await Promise.all([read(s,to,"depositFee"),read(s,c.governor,"depositFee"),read(s,c.governor,"fundingRate"),read(s,to,"maxFee"),read(s,to,"maxFundingFee")]);if(nextDeposit[0]>maxFee[0]||nextRate[0]>maxRate[0])throw Error("Governor fee settings exceed vault limits.");if(deposit[0]===nextDeposit[0]&&rate[0]===nextRate[0])throw Error("Vault fees are already up to date.");Object.assign(state,{deposit:deposit[0],nextDeposit:nextDeposit[0],nextRate:nextRate[0]});method="updateFees";facts=[["Farm",farm.symbol],["Deposit fee",formatUnits(nextDeposit[0],2)+"%"],["Funding rate per hour",formatUnits(nextRate[0],4)+"%"]];warnings=["This applies community-governed fees to future vault accounting. A funding-rate change resets the vault's funding timestamp; collect existing fees first."];
    }else{
      const users=parseCommunityFeeUsers(request.args.users??""),positions=await feePositions(s,farm,users),due=positions.reduce((total,p)=>total+communityFeeDue(BigInt(p.amount),BigInt(p.last),rate[0],lastChange[0],BigInt(s.timestamp)),0n);if(due===0n)throw Error("No funding fees are currently due for these users.");Object.assign(state,{users,positions,due});method="collectCommission";args=[users,users.map(user=>positions.filter(p=>p.user===user).map(p=>BigInt(p.id)))];facts=[["Farm",farm.symbol],["Users",String(users.length)],["Positions checked",String(positions.length)],["Funding fees deducted now (nominal)",formatUnits(due,farm.decimals)+" "+farm.symbol],["Fee recipient",c.treasuryWallet]];warnings=["This deducts the protocol's existing funding fee from the listed users' farm positions and sends it to the treasury. You pay the network fee.","Fees use whole hours at execution and are capped at 20% of each position per collection. No fee proceeds are paid to you."];if(farm.id==="emit")warnings.push("EMIT can tax transfers. The amount shown is the nominal deduction from positions; the treasury may receive less. Token runtime and actual call simulation are checked before every review.");
    }
  }
  await s.finish();return{title:COMMUNITY_MAINTENANCE_ACTIONS.find(v=>v.id===request.action)!.title,account,block:s.block,blockHash:s.blockHash,timestamp:s.timestamp,to,data:a.encodeFunctionData(method,args),value:"0x0",facts,warnings,fingerprint:json(state)};
}
function logs(receipt:ProtocolReceipt,target:string,name:string){return receipt.logs.filter(l=>!l.removed&&address(l.address)===address(target)).flatMap(l=>{try{const event=a.parseLog(l);return event?.name===name?[event]:[]}catch{return[]}});}
export const communityMaintenanceAdapter:ProtocolAdapter={prepare:prepareCommunityMaintenance,async verify(rpc,review,receipt){
  try{
    if(review.request.action==="start-event"||review.request.action==="end-event"){const adapter=review.request.action==="start-event"?ordinaryProposalAdapter:rewardMaintenanceAdapter;return adapter.verify(rpc,{...review,request:delegated(review.request)},receipt);}
    const s=await communityMaintenanceSnapshot(rpc,Number(BigInt(receipt.blockNumber))),state=JSON.parse(review.quote.fingerprint),to=review.quote.to;
    if(state.action!==review.request.action)return false;let valid=false;
    if(state.action==="buyback"){
      await verifyBuyback(s);const used=(await read(s,to,"dailyPLSUsed",[BigInt(state.day)]))[0];valid=used===BigInt(state.used)+BigInt(state.spend)&&logs(receipt,c.rewardToken,"Transfer").some(e=>address(e.args.from)===address(to)&&address(e.args.to)===address(c.treasuryWallet)&&e.args.value>=BigInt(state.minimum));
    }else if(state.action==="convert-buyback"){
      await verifyBuyback(s);const farm=VERIFIED_FARM_WRITES.find(v=>v.id===state.asset)!;await verifyFarmTokenState(rpc,farm,review.quote.account,s.tag);
      // WPLS emits Withdrawal(address,uint256), not the PulseX farming event.
      const wrapped=new Interface(["event Withdrawal(address indexed src,uint256 wad)"]);valid=logs(receipt,state.token,"Transfer").some(e=>address(e.args.from)===address(to)&&e.args.value>0n&&e.args.value<=BigInt(state.balance))&&receipt.logs.some(l=>{try{const e=wrapped.parseLog(l);return !l.removed&&address(l.address)===address(d.wpls.address)&&e?.name==="Withdrawal"&&address(e.args[0])===address(d.router.address)&&e.args[1]>=BigInt(state.minimum)}catch{return false}});
    }else if(state.action==="harvest-pulsex"){
      await verifyFarmer(s);valid=logs(receipt,state.inc,"Transfer").some(e=>address(e.args.from)===address(d.farmer.address)&&address(e.args.to)===address(d.buyback.address)&&e.args.value>0n);
    }else if(state.action==="sync-staking"){
      const balances:bigint[]=[];for(const miner of MINER_PREVIEW_SPECS){await verifyAccessMiner(s,miner.id);balances.push((await read(s,miner.address,"balanceOf()"))[0]);}const total=balances.reduce((x,y)=>x+y,0n);if(total===0n)return false;valid=(await read(s,c.governor,"lastHarvestedTime"))[0]===BigInt(s.timestamp);const coefficients=[5333n,8000n,12000n,26660n,34666n,40000n];for(let i=0;i<6;i++)valid=valid&&(await read(s,c.masterchef,"poolInfo",[i]))[0]===100000n*coefficients[i]*balances[i]/(total*10000n);
    }else if(state.action==="reduce-rewards")valid=(await read(s,to,"maxPulseEcoTotalAllocation"))[0]===BigInt(state.maximum)*99n/100n&&(await read(s,to,"lastReducePulseAllocation"))[0]===BigInt(s.timestamp);
    else if(state.action==="cap-ecosystem"){
      valid=(await read(s,to,"percentageAllocatedToPulseEcosystem"))[0]===BigInt(state.maximum);for(let i=0;i<state.percentages.length;i++)valid=valid&&(await read(s,to,"poolAllocationPercentage",[i+6]))[0]===BigInt(state.percentages[i])*BigInt(state.maximum)/BigInt(state.allocation);
    }else if(state.action==="rebalance-ecosystem"){
      const allocation=(await read(s,to,"percentageAllocatedToPulseEcosystem"))[0];if(allocation>=10000n)return false;let minerWeight=0n;for(let i=0;i<6;i++)minerWeight+=(await read(s,c.masterchef,"poolInfo",[i]))[0];const total=minerWeight*(100000000n/(10000n-allocation))/10000n;valid=true;for(let i=0;i<state.percentages.length;i++){const percent=(await read(s,to,"poolAllocationPercentage",[i+6]))[0],pool=await read(s,c.masterchef,"poolInfo",[i+6]);valid=valid&&percent===BigInt(state.percentages[i])&&pool[0]===total*percent/10000n;}
    }else if(state.action==="harvest-senate"||state.action==="publish-senate-credit"){
      const members=await senateState(s);if(json(members)!==json(state.members))return false;
      if(state.action==="publish-senate-credit")valid=(await read(s,c.masterchef,"credit",[review.quote.account]))[0]===0n&&(await read(s,c.masterchef,"totalPublished"))[0]>=BigInt(state.published)+BigInt(state.credit)&&logs(receipt,c.rewardToken,"Transfer").some(e=>address(e.args.from)===ZeroAddress&&address(e.args.to)===address(SENATE_PIN.address)&&e.args.value===BigInt(state.credit));
      else{
        const total=(await read(s,c.masterchef,"totalCreditRewards"))[0],accounted=(await read(s,c.masterchef,"totalCreditRewardsAtLastFairMint"))[0],published=(await read(s,c.masterchef,"fairTokensPublishedToSenate"))[0],difference=published-BigInt(state.published),count=BigInt(members.length);
        valid=accounted===total&&difference>0n&&difference%count===0n;for(let i=0;i<members.length;i++)valid=valid&&(await read(s,c.masterchef,"credit",[members[i]]))[0]===BigInt(state.credits[i])+difference/count;
      }
    }else{
      const farm=await verifyFeeFarm(rpc,s,state.farmId);if(state.action==="sync-fees")valid=(await read(s,to,"depositFee"))[0]===BigInt(state.nextDeposit)&&(await read(s,to,"fundingRate"))[0]===BigInt(state.nextRate);
      else if(state.action==="collect-fees"){
        const events=logs(receipt,to,"CollectedFee"),expected=new Map<string,bigint>();valid=(await read(s,to,"fundingRate"))[0]===BigInt(state.rate)&&(await read(s,to,"lastFundingChangeTimestamp"))[0]===BigInt(state.lastChange);
        for(const p of state.positions as FeePosition[]){const due=communityFeeDue(BigInt(p.amount),BigInt(p.last),BigInt(state.rate),BigInt(state.lastChange),BigInt(s.timestamp)),row=await read(s,farm.address,"userInfo(address,uint256)",[p.user,p.id]);if(due>0n){expected.set(p.user,(expected.get(p.user)??0n)+due);valid=valid&&row[0]===BigInt(p.amount)-due&&row[2]===BigInt(p.fees)+due&&row[3]<=BigInt(s.timestamp)&&BigInt(s.timestamp)-row[3]<3600n;}else valid=valid&&row[0]===BigInt(p.amount)&&row[2]===BigInt(p.fees);}
        if(expected.size===0)return false;for(const[user,amount]of expected){if(events.filter(e=>address(e.args.from)===user).reduce((sum,e)=>sum+e.args.amount,0n)!==amount)valid=false;}
      }
    }
    await s.finish();return valid;
  }catch{return false;}
}};

/** Independent live checks: a failed buyback RPC must not disable other verified modules. */
export async function readCommunityActionAvailability(rpc:FarmReadRpc,s:AccessSnapshot,base:{eventReady:boolean;eventId:string|null;reductionReady:boolean;rebalanceNeeded:boolean}){
  const actions=Object.fromEntries(COMMUNITY_MAINTENANCE_ACTIONS.map(v=>[v.id,{ready:false,reason:"Checking current protocol state."}])) as Record<CommunityMaintenanceAction,CommunityActionReadiness>;
  const checks:string[]=[],set=(id:CommunityMaintenanceAction,ready:boolean,reason:string)=>{actions[id]={ready,reason}};
  set("start-event",base.eventId===null,base.eventId===null?"Enter a scheduled proposal ID; eligibility is verified before review.":"A Reward Boost event is already active.");set("end-event",base.eventReady,base.eventReady?"The active event reached its on-chain end block.":base.eventId===null?"No Reward Boost event is active.":"The active event has not reached its end block.");
  set("reduce-rewards",base.reductionReady,base.reductionReady?"The seven-day waiting period is complete.":"The seven-day waiting period is still running, or the maximum is zero.");set("cap-ecosystem",base.rebalanceNeeded,base.rebalanceNeeded?"Current ecosystem percentages exceed the allowed maximum.":"Current ecosystem percentages are within the maximum.");
  set("rebalance-ecosystem",true,"Uses current community-approved allocation percentages.");set("collect-fees",true,"Choose a farm and a batch of users. Current positions and due fees are checked before review.");
  const buyback:{address:string;pls:string|null;remainingDailyAllowance:string|null;haltUntil:number|null;tokens:{asset:string;balance:string}[];error?:string}={address:d.buyback.address,pls:null,remainingDailyAllowance:null,haltUntil:null,tokens:[]};
  await Promise.all([
    (async()=>{try{await verifyBuyback(s);const[balance,allowance,halt]=await Promise.all([rpc.send("eth_getBalance",[d.buyback.address,s.tag]).then(BigInt),read(s,d.buyback.address,"getRemainingDailyAllowance"),read(s,d.buyback.address,"lastHaltTimestamp")]);buyback.pls=balance.toString();buyback.remainingDailyAllowance=String(allowance[0]);buyback.haltUntil=Number(halt[0])+86400;set("buyback",balance>0n&&allowance[0]>0n&&s.timestamp>buyback.haltUntil,balance===0n?"The buyback contract has no PLS.":allowance[0]===0n?"Today's buyback allowance is exhausted.":s.timestamp<=buyback.haltUntil?"Buying is temporarily halted by the contract.":"Buyback contract PLS and daily allowance are available.");for(const asset of ["PLSX","INC","HEX"]){const f=VERIFIED_FARM_WRITES.find(v=>v.symbol===asset)!;await verifyFarmTokenState(rpc,f,c.treasuryWallet,s.tag);buyback.tokens.push({asset,balance:String((await read(s,f.tokenAddress!,"balanceOf(address)",[d.buyback.address]))[0])});}set("convert-buyback",buyback.tokens.some(v=>BigInt(v.balance)>0n),buyback.tokens.some(v=>BigInt(v.balance)>0n)?"Choose a token held by the buyback contract.":"No PLSX, INC or HEX is available in the buyback contract.");}catch(e){const reason=e instanceof Error?e.message:"Buyback check unavailable.";buyback.error=reason;set("buyback",false,reason);set("convert-buyback",false,reason);checks.push("Buyback: "+reason)}})(),
    (async()=>{try{await verifyFarmer(s);const pending=(await read(s,d.incChef.address,"pendingInc",[9,d.farmer.address]))[0],inc=VERIFIED_FARM_WRITES.find(v=>v.id==="inc")!,balance=(await read(s,inc.tokenAddress!,"balanceOf(address)",[d.farmer.address]))[0];set("harvest-pulsex",pending+balance>0n,pending+balance>0n?formatEther(pending+balance)+" INC can be forwarded to the buyback contract.":"No INC rewards are currently available.");}catch(e){set("harvest-pulsex",false,e instanceof Error?e.message:"PulseX check unavailable.")}})(),
    (async()=>{try{let total=0n;for(const miner of MINER_PREVIEW_SPECS){await verifyAccessMiner(s,miner.id);total+=(await read(s,miner.address,"balanceOf()"))[0];}set("sync-staking",total>0n,total>0n?"All six miner deployments and mappings are verified.":"The miner pools are empty.");}catch(e){set("sync-staking",false,e instanceof Error?e.message:"Miner check unavailable.")}})(),
    (async()=>{try{const deposit=(await read(s,c.governor,"depositFee"))[0],funding=(await read(s,c.governor,"fundingRate"))[0];let changed=false;for(const id of ["pls","plsx","inc","hex"]){const farm=await verifyFeeFarm(rpc,s,id),oldDeposit=(await read(s,farm.address,"depositFee"))[0],oldFunding=(await read(s,farm.address,"fundingRate"))[0];changed=changed||oldDeposit!==deposit||oldFunding!==funding;}set("sync-fees",changed,changed?"At least one core farm has different Governor fee settings.":"All four core vaults already use the current Governor fees.");}catch(e){set("sync-fees",false,e instanceof Error?e.message:"Fee settings unavailable.")}})(),
    (async()=>{try{const members=await senateState(s);const enabled=(await read(s,c.masterchef,"senatorRewards"))[0],total=(await read(s,c.masterchef,"totalCreditRewards"))[0],accounted=(await read(s,c.masterchef,"totalCreditRewardsAtLastFairMint"))[0];set("harvest-senate",members.length>0&&enabled&&total>accounted,members.length===0?"The Senate currently has no members to receive credit.":enabled&&total>accounted?"Protocol credit accrued since the last Senate fair mint.":"No new Senate credit is available, or senator rewards are disabled.");set("publish-senate-credit",true,"Spends your wallet's mining credit to mint OINK to the Senate. Your exact credit is verified in the review.");}catch(e){const reason=e instanceof Error?e.message:"Senate check unavailable.";set("harvest-senate",false,reason);set("publish-senate-credit",false,reason)}})(),
  ]);
  return{actions,buyback,checks};
}


