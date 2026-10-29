import { Interface, ZeroAddress, formatEther, getAddress, getCreateAddress, keccak256, toBeHex, zeroPadValue } from "ethers";
import build from "../config/minerDonationBuild.json" with { type: "json" };
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { parseFarmDepositAmount, verifyRuntime, type FarmReadRpc } from "./farmTransactions";
import { advancedGovernanceAdapter } from "./advancedGovernanceActions";
import { minerEvents } from "./positionTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolRequest, ProtocolReview } from "./protocolTransactions";

const core = VERIFIED_FARM_WRITES[0];
export const minerDonationAbi = new Interface([
  "constructor(address recipient,address pool,uint256 minServe)",
  "function token() view returns(address)", "function pool() view returns(address)", "function recipient() view returns(address)", "function minServe() view returns(uint256)", "function giftStake()",
  "function masterchef() view returns(address)", "function owner() view returns(address)", "function governor() view returns(address)", "function feeAddress() view returns(address)", "function dtx() view returns(address)", "function admin() view returns(address)", "function treasury() view returns(address)", "function migrationPool() view returns(address)",
  "function poolID() view returns(uint256)", "function poolInfo(uint256) view returns(uint256,uint256,address)", "function trustedContract(address) view returns(bool)",
  "function minimumGift() view returns(uint256)", "function balanceOf(address) view returns(uint256)", "function totalShares() view returns(uint256)", "function withdrawFeePeriod() view returns(uint256)", "function gracePeriod() view returns(uint256)",
]);
const poolValueAbi = new Interface(["function balanceOf() view returns(uint256)"]);
const equal = (a:string,b:string) => getAddress(a) === getAddress(b);
const nonzero = (input:string) => { const a=getAddress(input); if(a===ZeroAddress)throw Error("Enter a nonzero wallet or callback address."); return a; };
const encoded = (value:bigint|string) => zeroPadValue(typeof value === "bigint" ? toBeHex(value) : value,32).slice(2);
export function donationMandatorySeconds(days:string) {
  if(!/^(0|[1-9][0-9]*)$/.test(days))throw Error("Mandatory service must be a whole number of days, including zero.");
  const seconds=BigInt(days)*86400n;
  if(seconds>=2n**256n)throw Error("Mandatory service is outside the contract's supported range.");
  return seconds;
}
export function donationRuntime(recipient:string,pool:string,mandatory:bigint) {
  if(mandatory<0n||mandatory>=2n**256n)throw Error("Invalid mandatory service.");
  const values:Record<string,string>={token:encoded(core.rewardToken),recipient:encoded(nonzero(recipient)),pool:encoded(nonzero(pool)),minServe:encoded(mandatory)};
  let code=build.runtimeTemplate.slice(2);
  for(const [name,refs] of Object.entries(build.immutableReferences))for(const ref of refs){if(ref.length!==32||!values[name])throw Error("Unrecognized donation build."); code=code.slice(0,ref.start*2)+values[name]+code.slice((ref.start+ref.length)*2);}
  return "0x"+code;
}
export function donationInitCode(recipient:string,pool:string,mandatory:bigint) { return build.creationCode+minerDonationAbi.encodeDeploy([nonzero(recipient),nonzero(pool),mandatory]).slice(2); }
async function snapshot(rpc:FarmReadRpc,now=Date.now()) {
  if(BigInt(await rpc.send("eth_chainId",[]))!==369n)throw Error("Miner donations require PulseChain.");
  const block=await rpc.send("eth_getBlockByNumber",["latest",false]);
  if(!block?.hash||!block.number||!block.timestamp)throw Error("Donation snapshot unavailable.");
  const timestamp=Number(BigInt(block.timestamp));
  if(!Number.isSafeInteger(timestamp)||now-timestamp*1000>120000||timestamp*1000-now>30000)throw Error("Donation snapshot is stale. Refresh it.");
  const read=async(to:string,method:string,args:unknown[]=[],abi=minerDonationAbi)=>abi.decodeFunctionResult(method,await rpc.send("eth_call",[{to,data:abi.encodeFunctionData(method,args)},block.number]));
  const finish=async()=>{if((await rpc.send("eth_getBlockByNumber",[block.number,false]))?.hash!==block.hash)throw Error("Donation snapshot changed. Review again.");};
  return {block,timestamp,read,finish};
}
type DonationSnapshot=Awaited<ReturnType<typeof snapshot>>;
type MinerSpec=typeof MINER_PREVIEW_SPECS[number];
async function dependencies(rpc:FarmReadRpc,s:DonationSnapshot,miner:MinerSpec) {
  for(const pin of [miner,{address:core.rewardToken,runtimeCodeHash:core.rewardTokenRuntimeCodeHash},{address:core.masterchef,runtimeCodeHash:core.masterchefRuntimeCodeHash},{address:core.governor,runtimeCodeHash:core.governorRuntimeCodeHash}])verifyRuntime(await rpc.send("eth_getCode",[pin.address,s.block.number]),pin.runtimeCodeHash,"Donation dependency");
  for(const [to,method,expected] of [[miner.address,"token",core.rewardToken],[miner.address,"masterchef",core.masterchef],[miner.address,"admin",core.governor],[miner.address,"treasury",core.governor],[miner.address,"migrationPool",ZeroAddress],[core.masterchef,"owner",core.governor],[core.masterchef,"feeAddress",core.governor],[core.masterchef,"dtx",core.rewardToken],[core.rewardToken,"owner",core.masterchef],[core.rewardToken,"governor",core.governor],[core.governor,"masterchef",core.masterchef]])if(!equal((await s.read(to,method))[0],expected))throw Error("Donation dependency wiring changed.");
  if((await s.read(miner.address,"poolID"))[0]!==BigInt(miner.poolId)||!equal((await s.read(core.masterchef,"poolInfo",[miner.poolId]))[2],miner.address)||!(await s.read(core.masterchef,"trustedContract",[miner.address]))[0])throw Error("The donation miner is no longer registered or authorized.");
  if((await s.read(miner.address,"withdrawFeePeriod"))[0]!==BigInt(miner.durationDays)*86400n||(await s.read(miner.address,"gracePeriod"))[0]!==BigInt(miner.graceDays)*86400n)throw Error("The donation miner's lock rules changed.");
}
export type MinerDonationState={callback:string;recipient:string;minerId:string;minerLabel:string;pool:string;mandatorySeconds:string;balance:string;minimumGift:string;block:number;timestamp:number;runtimeHash:string};
async function inspect(rpc:FarmReadRpc,s:DonationSnapshot,input:string):Promise<MinerDonationState> {
  const callback=nonzero(input),[token,pool,recipient,mandatory]=await Promise.all(["token","pool","recipient","minServe"].map(method=>s.read(callback,method).then(row=>row[0])));
  if(!equal(token,core.rewardToken))throw Error("This donation callback does not use the current OINK token.");
  const miner=MINER_PREVIEW_SPECS.find(m=>equal(m.address,pool));
  if(!miner)throw Error("This donation callback targets an unknown miner.");
  const runtime=donationRuntime(recipient,pool,mandatory);
  if((await rpc.send("eth_getCode",[callback,s.block.number])).toLowerCase()!==runtime.toLowerCase())throw Error("The callback code does not match the reviewed donation helper.");
  await dependencies(rpc,s,miner);
  const [balance,minimum]=await Promise.all([s.read(core.rewardToken,"balanceOf",[callback]),s.read(pool,"minimumGift")]);
  return {callback,recipient:getAddress(recipient),minerId:miner.id,minerLabel:miner.label,pool:getAddress(pool),mandatorySeconds:mandatory.toString(),balance:balance[0].toString(),minimumGift:minimum[0].toString(),block:Number(BigInt(s.block.number)),timestamp:s.timestamp,runtimeHash:keccak256(runtime)};
}
export async function readMinerDonation(rpc:FarmReadRpc,address:string) { const s=await snapshot(rpc),state=await inspect(rpc,s,address); await s.finish(); return state; }
const details=(state:MinerDonationState):[string,string][]=>{
  const miner=MINER_PREVIEW_SPECS.find(row=>row.id===state.minerId)!;
  return [["Recipient wallet",state.recipient],["Time miner",state.minerLabel],["Nominal miner duration",miner.durationDays+" days"],["Grace period",miner.graceDays+" days"],["Mandatory service",formatEther(BigInt(state.mandatorySeconds)*10n**18n/86400n)+" days ("+state.mandatorySeconds+" seconds)"],["Callback address",state.callback],["Current callback balance",formatEther(BigInt(state.balance))+" OINK"]];
};
const terms=({block:_block,timestamp:_timestamp,...state}:MinerDonationState)=>state;
const treasuryRequest=(args:Record<string,string>,callback:string):ProtocolRequest=>({module:"advanced-governance",action:"treasury-create",args:{token:core.rewardToken,recipient:callback,amount:args.amount,credit:args.credit,delay:args.delay}});
export const minerDonationAdapter:ProtocolAdapter={
  async prepare(rpc,accountInput,request) {
    if(request.module!=="miner-donation"||!["deploy","propose","activate"].includes(request.action))throw Error("Unsupported miner donation action.");
    const account=nonzero(accountInput),s=await snapshot(rpc),a=request.args;
    if(request.action==="deploy") {
      const recipient=nonzero(a.recipient),miner=MINER_PREVIEW_SPECS.find(m=>m.id===a.miner),mandatory=donationMandatorySeconds(a.mandatoryDays);
      if(!miner)throw Error("Select an official OINK time miner.");
      if(MINER_PREVIEW_SPECS.some(m=>equal(m.address,recipient))||[core.rewardToken,core.masterchef,core.governor,core.treasuryWallet].some(v=>equal(v,recipient)))throw Error("Choose the recipient wallet, not a protocol contract.");
      await dependencies(rpc,s,miner);
      const nonce=await rpc.send("eth_getTransactionCount",[account,s.block.number]),to=getCreateAddress({from:account,nonce:BigInt(nonce)}),runtime=donationRuntime(recipient,miner.address,mandatory),data=donationInitCode(recipient,miner.address,mandatory);
      await s.finish();
      return {
        kind:"creation",creation:{nonce,runtime},title:"Review miner donation callback",account,
        block:Number(BigInt(s.block.number)),blockHash:s.block.hash,timestamp:s.timestamp,to,data,value:"0x0",
        fingerprint:JSON.stringify({recipient,pool:miner.address,mandatory:mandatory.toString(),nonce,runtimeHash:keccak256(runtime)}),
        facts:[["Recipient wallet",recipient],["Time miner",miner.label],["Nominal miner duration",miner.durationDays+" days"],["Grace period",miner.graceDays+" days"],["Mandatory service",a.mandatoryDays+" days ("+mandatory+" seconds)"],["OINK token",core.rewardToken],["Helper source", "New IssueStake helper based on the original OINK source"],["Compiler",build.compiler+" · optimizer "+build.optimizerRuns+" · "+build.evmVersion],["Helper source hash",build.sourceHash],["Expected runtime hash",keccak256(runtime)]],
        warnings:["This deploys a new donation callback and spends PLS gas. It does not take OINK from your wallet or fund a miner.","Treasury funding requires a separate proposal and successful community vote. Funding is not guaranteed.","The recipient, miner and mandatory service are fixed permanently. Once funded, anyone can activate its miner for this recipient. Mandatory service prevents withdrawal until that time has been served."]
      };
    }
    const state=await inspect(rpc,s,a.callback);
    await s.finish();
    if(request.action==="propose") {
      if(parseFarmDepositAmount(a.amount,18)+BigInt(state.balance)<BigInt(state.minimumGift))throw Error("Request enough funding for the callback to hold at least "+formatEther(BigInt(state.minimumGift))+" OINK, the miner's current minimum gift.");
      const base=await advancedGovernanceAdapter.prepare(rpc,account,treasuryRequest(a,state.callback));
      return {...base,title:"Review treasury-funded miner request",facts:[...details(state),...base.facts],fingerprint:JSON.stringify({donation:terms(state),advanced:base.fingerprint}),warnings:[...base.warnings,"An approved transfer pays OINK to this fixed donation callback. Activate the callback afterward to create the recipient's miner."]};
    }
    const amount=BigInt(state.balance),minimum=BigInt(state.minimumGift);
    if(amount<=0n||amount<minimum)throw Error("The callback needs at least "+formatEther(minimum)+" OINK before it can create a miner. Wait for approved treasury funding.");
    const total=(await s.read(state.pool,"totalShares"))[0],poolBalance=(await s.read(state.pool,"balanceOf",[],poolValueAbi))[0],shares=total===0n?amount:poolBalance>0n?amount*total/poolBalance:0n;
    if(shares<=0n)throw Error("This callback balance would create zero miner shares.");
    await s.finish();
    return {title:"Review donation miner activation",account,block:state.block,blockHash:s.block.hash,timestamp:s.timestamp,to:state.callback,data:minerDonationAbi.encodeFunctionData("giftStake"),value:"0x0",fingerprint:JSON.stringify({donation:terms(state)}),facts:[...details(state),["Estimated new shares",formatEther(shares)]],warnings:["This commits the callback's entire current OINK balance to a new miner owned by the fixed recipient. OINK does not return to the caller.","Estimated shares use current pool accounting and can change before mining. The review checks that the funded amount creates shares.","The new miner starts when this transaction is mined. Its duration, penalties and fixed mandatory service apply."]};
  },
  async verify(rpc,review,receipt) {
    try {
      const state=JSON.parse(review.quote.fingerprint);
      const s=await snapshotAtReceipt(rpc,receipt.blockNumber,receipt.blockHash);
      if(review.request.action==="deploy") {
        if(review.quote.kind!=="creation"||!receipt.contractAddress||!equal(receipt.contractAddress,review.quote.to))return false;
        const actual=await inspect(rpc,s,receipt.contractAddress);
        return equal(actual.recipient,state.recipient)&&equal(actual.pool,state.pool)&&actual.mandatorySeconds===state.mandatory;
      }
      const actual=await inspect(rpc,s,state.donation.callback);
      if(actual.runtimeHash!==state.donation.runtimeHash||!equal(actual.recipient,state.donation.recipient)||actual.mandatorySeconds!==state.donation.mandatorySeconds)return false;
      if(review.request.action==="propose") {
        const delegated:ProtocolReview={...review,request:treasuryRequest(review.request.args,actual.callback),quote:{...review.quote,fingerprint:state.advanced}};
        return advancedGovernanceAdapter.verify(rpc,delegated,receipt);
      }
      const events=receipt.logs.filter(log=>!log.removed&&equal(log.address,actual.pool)).flatMap(log=>{try{const p=minerEvents.parseLog(log);return p?.name==="GiftDeposit"?[p.args]:[];}catch{return[];}});
      return events.length===1&&equal(events[0].sender,actual.callback)&&equal(events[0].recipient,actual.recipient)&&events[0].amount>=BigInt(state.donation.balance)&&events[0].shares>0n&&events[0].lastDepositedTime===BigInt(s.timestamp);
    } catch { return false; }
  }
};
async function snapshotAtReceipt(rpc:FarmReadRpc,tag:string,hash:string):Promise<DonationSnapshot> {
  const block=await rpc.send("eth_getBlockByNumber",[tag,false]);if(!block?.hash||block.hash!==hash)throw Error("Receipt block changed.");
  const read=async(to:string,method:string,args:unknown[]=[],abi=minerDonationAbi)=>abi.decodeFunctionResult(method,await rpc.send("eth_call",[{to,data:abi.encodeFunctionData(method,args)},tag]));
  return {block,timestamp:Number(BigInt(block.timestamp)),read,finish:async()=>{if((await rpc.send("eth_getBlockByNumber",[tag,false]))?.hash!==hash)throw Error("Receipt changed.");}};
}
