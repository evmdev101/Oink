import { Interface, ZeroAddress, concat, formatEther, formatUnits, getAddress, keccak256, parseUnits, solidityPackedKeccak256 } from "ethers";
import { DISTRIBUTIONS, type DistributionId } from "../config/accessVerification";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { MINER_PREVIEW_SPECS } from "../config/minerPreviewVerification";
import { assetUrl } from "./assets";
import { parseFarmDepositAmount, type FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolReceipt, ProtocolRequest, ProtocolReview } from "./protocolTransactions";
import { accessSnapshot, sameAccessAddress, verifyAccessCore, verifyAccessMiner, type AccessSnapshot } from "./accessSnapshot";
export type DistributionProof={amount:string;proof:string[]};
export const distributionAbi=new Interface([
  "function merkleRoot() view returns(bytes32)","function amountRedeemed(address) view returns(uint256)","function totalRedeemed() view returns(uint256)","function directPayout() view returns(uint256)",
  "function payout(address) view returns(uint256)","function minToServe(address) view returns(uint256)","function votingCreditContract() view returns(address)",
  "function airdropContract() view returns(address)","function airdropContractLocked() view returns(address)","function isValid(address,uint256,bytes32[]) view returns(bool)",
  "function startTime() view returns(uint256)","function CLAIM_PERIOD_DAYS() view returns(uint256)","function claimAirdrop(uint256,uint256,address,bytes32[])",
  ...Array.from({length:6},(_,i)=>`function acPool${i+1}() view returns(address)`),
  "event RedeemCredit(uint256 amount,address user,address withdrawInto)","event Transfer(address indexed from,address indexed to,uint256 value)",
  "event GiftDeposit(address indexed sender,address indexed toAddress,uint256 amount,uint256 shares,uint256 lastDepositedTime)","event AddCredit(address indexed to,uint256 amount)",
]);
export function distributionSpec(id:string) { const found=DISTRIBUTIONS.find(v=>v.id===id);if(!found)throw Error("Unknown distribution.");return found; }
export function validateDistributionProof(accountInput:string,value:unknown,root:string):DistributionProof {
  const account=getAddress(accountInput),v=value as DistributionProof;
  if(!v||typeof v.amount!=="string"||!/^\d+$/.test(v.amount)||BigInt(v.amount)>=(1n<<256n)||!Array.isArray(v.proof)||v.proof.length>64||v.proof.some(p=>typeof p!=="string"||!/^0x[0-9a-f]{64}$/i.test(p)))throw Error("The published distribution proof is invalid.");
  let node=solidityPackedKeccak256(["address","uint256"],[account,BigInt(v.amount)]);
  for(const p of v.proof)node=keccak256(concat(BigInt(node)<BigInt(p)?[node,p]:[p,node]));
  if(node.toLowerCase()!==root.toLowerCase())throw Error("The distribution proof does not match the contract's current root.");
  return {amount:v.amount,proof:[...v.proof]};
}
let proofCache:Promise<unknown>|null=null;
export async function loadDistributionProof(id:DistributionId,account:string):Promise<DistributionProof|null> {
  if(!proofCache)proofCache=fetch(assetUrl("data/distribution-claims.json"),{signal:AbortSignal.timeout(20000)}).then(async r=>{if(!r.ok)throw Error("Distribution proofs could not be loaded.");return r.json()}).catch(error=>{proofCache=null;throw error});
  const data=await proofCache as {chainId?:number;distributions?:Record<string,{root?:string;entries?:Record<string,unknown>}>};
  const spec=distributionSpec(id),row=data?.distributions?.[id];
  if(data?.chainId!==369||row?.root?.toLowerCase()!==spec.root||!row.entries||typeof row.entries!=="object")throw Error("Distribution proof file is unavailable or incompatible.");
  const key=getAddress(account).toLowerCase();
  return Object.hasOwn(row.entries,key)?validateDistributionProof(account,row.entries[key],spec.root):null;
}
async function dependencies(s:AccessSnapshot,id:string) {
  const spec=distributionSpec(id),common=await verifyAccessCore(s);await s.runtime(spec.address,spec.runtimeCodeHash);
  await Promise.all([["masterchef",common.masterchef],["XPD",common.rewardToken],["owner",common.governor]].map(async([method,expected])=>sameAccessAddress((await s.read(spec.address,method))[0],expected,"Distribution "+method)));
  const root=(await s.read(spec.address,"merkleRoot",[],distributionAbi))[0] as string;if(root.toLowerCase()!==spec.root)throw Error("The distribution root changed. Updated verified proofs are required.");
  return {spec,common};
}
export async function readDistribution(rpc:FarmReadRpc,id:DistributionId,accountInput:string|null,proofOverride?:DistributionProof|null) {
  const account=accountInput?getAddress(accountInput):null;
  const proof=account?(proofOverride===undefined?await loadDistributionProof(id,account):proofOverride):null;
  const s=await accessSnapshot(rpc),{spec,common}=await dependencies(s,id),read=(method:string,args:unknown[]=[])=>s.read(spec.address,method,args,distributionAbi);
  const [credit,direct,totalRedeemed,redeemed]=await Promise.all([s.read(common.masterchef,"credit",[spec.address]),read("directPayout"),read("totalRedeemed"),account?read("amountRedeemed",[account]):null]);
  if(direct[0]>10000n)throw Error("Invalid distribution payout.");
  let allocation:bigint|null=null,remaining:bigint|null=null;
  if(proof&&account){const valid=validateDistributionProof(account,proof,spec.root);if(!(await read("isValid",[account,valid.amount,valid.proof]))[0])throw Error("The contract rejected this wallet's proof.");allocation=BigInt(valid.amount);if(redeemed![0]>allocation)throw Error("Redeemed credit exceeds the published allocation.");remaining=allocation-redeemed![0];}
  const destinations=await Promise.all(MINER_PREVIEW_SPECS.map(async(miner,i)=>{sameAccessAddress((await read("acPool"+(i+1)))[0],miner.address,"Distribution destination");const [payout,serve]=await Promise.all([read("payout",[miner.address]),id==="contributors"?Promise.resolve([0n]):read("minToServe",[miner.address])]);if(payout[0]>10000n)throw Error("Invalid distribution destination payout.");return{id:miner.id,label:miner.label,days:miner.durationDays,payout:payout[0].toString(),minServe:serve[0].toString()};}));
  const sweepAfter=id==="rewards"?Number((await read("startTime"))[0]+(await read("CLAIM_PERIOD_DAYS"))[0]*86400n):null;
  await s.finish();return {id,label:spec.label,account,block:s.block,blockHash:s.blockHash,timestamp:s.timestamp,credit:credit[0].toString(),direct:direct[0].toString(),totalRedeemed:totalRedeemed[0].toString(),redeemed:redeemed?.[0].toString()??null,allocation:allocation?.toString()??null,remaining:remaining?.toString()??null,proof,destinations,sweepAfter};
}
async function prepareDistribution(rpc:FarmReadRpc,accountInput:string,request:ProtocolRequest):Promise<ProtocolQuote>{
  if(request.module!=="distribution"||request.action!=="claim")throw Error("Unsupported distribution action.");
  const account=getAddress(accountInput),spec=distributionSpec(request.args.distribution),data=await readDistribution(rpc,spec.id,account),s=await accessSnapshot(rpc,data.block);
  if(s.blockHash!==data.blockHash)throw Error("Distribution snapshot changed.");
  if(!data.proof||data.remaining===null)throw Error("This wallet is not listed in the published distribution proofs.");
  const amount=parseFarmDepositAmount(request.args.amount,18);if(amount>BigInt(data.remaining))throw Error("The claim exceeds this wallet's remaining distribution allocation.");
  let into=account,payout=BigInt(data.direct),minServe=0n,days=0;
  if(request.args.destination!=="wallet"){
    const miner=await verifyAccessMiner(s,request.args.destination);into=getAddress(miner.address);days=miner.durationDays;
    const term=data.destinations.find(v=>v.id===miner.id)!;payout=BigInt(term.payout);minServe=BigInt(term.minServe);
    if(payout<=0n)throw Error("This distribution destination is disabled.");
    if(amount*payout/10000n<(await s.read(into,"minimumGift"))[0])throw Error("The claim is below this destination's minimum miner amount.");
    const credit=PARTICIPATION_CONTRACTS.credit;await s.runtime(credit.address,credit.runtimeCodeHash);
    sameAccessAddress((await s.read(spec.address,"votingCreditContract",[],distributionAbi))[0],credit.address,"Voting credit contract");
    for(const [method,id]of[["airdropContract","contributors"],["airdropContractLocked","rewards"]])sameAccessAddress((await s.read(credit.address,method,[],distributionAbi))[0],distributionSpec(id).address,"Voting credit distribution permission");
  }
  const output=amount*payout/10000n;
  if(output<=0n)throw Error("The selected amount rounds to zero OINK at this payout rate.");
  // Contributor claims consume gross credit (net + Governor deduction); reward
  // claims consume only the selected payout in this deployed contract.
  if(BigInt(data.credit)<(spec.id==="contributors"?amount:output))throw Error("The distribution contract has insufficient reward credit for this claim.");
  const facts:[string,string][]=[["Distribution",spec.label],["Allocation redeemed",formatEther(amount)],["Remaining allocation after claim",formatEther(BigInt(data.remaining)-amount)],["Reward destination",into],["Destination payout",formatUnits(payout,2)+"%"],["OINK received",formatEther(output)],["Payout reduction",formatEther(amount-output)]];
  const warnings=["This is a launch distribution claim, separate from farm and ongoing referral rewards.","Redeeming consumes the full allocation amount shown, even when your selected destination pays a smaller amount."];
  if(into!==account){facts.push(["Miner duration",days+" days"],["Mandatory service",(Number(minServe)/86400)+" days"]);warnings.push("The payout creates a locked miner. Ending it early has separate withdrawal penalties.");}
  if(data.sweepAfter!==null&&data.timestamp>data.sweepAfter)warnings.push("This distribution's original claim period has elapsed. Its remaining reward credit may be swept before this claim is mined.");
  await s.finish();return{title:"Claim distribution allocation",account,block:s.block,blockHash:s.blockHash,timestamp:s.timestamp,to:spec.address,data:distributionAbi.encodeFunctionData("claimAirdrop",[amount,data.proof.amount,into,data.proof.proof]),value:"0x0",facts,warnings,fingerprint:[spec.id,spec.root,data.redeemed,amount,payout,minServe,into,days].join("|")};
}
async function verifyDistribution(rpc:FarmReadRpc,review:ProtocolReview,receipt:ProtocolReceipt){
  const spec=distributionSpec(review.request.args.distribution),s=await accessSnapshot(rpc,Number(BigInt(receipt.blockNumber))),{common}=await dependencies(s,spec.id);
  const decoded=distributionAbi.parseTransaction({data:review.transaction.data});if(decoded?.name!=="claimAirdrop")return false;
  const logs=receipt.logs.filter(v=>getAddress(v.address)===getAddress(spec.address)).flatMap(v=>{try{const p=distributionAbi.parseLog(v);return p?.name==="RedeemCredit"?[p]:[]}catch{return[]}});
  if(logs.length!==1||logs[0].args.amount!==decoded.args[0]||getAddress(logs[0].args.user)!==getAddress(review.quote.account)||getAddress(logs[0].args.withdrawInto)!==getAddress(decoded.args[2]))return false;
  const expected=review.quote.facts.find(v=>v[0]==="OINK received")?.[1];if(!expected)return false;
  const destination=getAddress(decoded.args[2]);
  const transfers=receipt.logs.filter(v=>getAddress(v.address)===getAddress(common.rewardToken)).flatMap(v=>{try{const p=distributionAbi.parseLog(v);return p?.name==="Transfer"?[p]:[]}catch{return[]}});
  // Direct claims mint to the wallet; locked claims mint to the distribution
  // contract and burn the payout into new miner shares.
  const mintTo=destination===getAddress(review.quote.account)?destination:getAddress(spec.address);
  if(!transfers.some(v=>getAddress(v.args.from)===ZeroAddress&&getAddress(v.args.to)===mintTo&&v.args.value===parseUnits(expected,18)))return false;
  if(destination!==getAddress(review.quote.account)) {
    const miner=MINER_PREVIEW_SPECS.find(v=>getAddress(v.address)===destination);if(!miner)return false;
    await verifyAccessMiner(s,miner.id);
    await s.runtime(PARTICIPATION_CONTRACTS.credit.address,PARTICIPATION_CONTRACTS.credit.runtimeCodeHash);
    sameAccessAddress((await s.read(spec.address,"votingCreditContract",[],distributionAbi))[0],PARTICIPATION_CONTRACTS.credit.address,"Voting credit receipt dependency");
    if(!transfers.some(v=>getAddress(v.args.from)===getAddress(spec.address)&&getAddress(v.args.to)===ZeroAddress&&v.args.value===parseUnits(expected,18)))return false;
    const gifts=receipt.logs.filter(v=>getAddress(v.address)===destination).flatMap(v=>{try{const p=distributionAbi.parseLog(v);return p?.name==="GiftDeposit"?[p]:[]}catch{return[]}});
    if(gifts.length!==1||getAddress(gifts[0].args.sender)!==getAddress(spec.address)||getAddress(gifts[0].args.toAddress)!==getAddress(review.quote.account)||gifts[0].args.amount!==parseUnits(expected,18)||gifts[0].args.shares<=0n)return false;
    const credits=receipt.logs.filter(v=>getAddress(v.address)===getAddress(PARTICIPATION_CONTRACTS.credit.address)).flatMap(v=>{try{const p=distributionAbi.parseLog(v);return p?.name==="AddCredit"?[p]:[]}catch{return[]}});
    if(!credits.some(v=>getAddress(v.args.to)===getAddress(review.quote.account)&&v.args.amount===parseUnits(expected,18)))return false;
  }
  await s.finish();return true;
}
export const distributionAdapter:ProtocolAdapter={prepare:prepareDistribution,verify:verifyDistribution};
