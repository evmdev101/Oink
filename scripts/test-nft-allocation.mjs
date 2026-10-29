import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, ZeroAddress, getAddress, keccak256 } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {prepareParticipation,participationAdapter,participationAbi,participationUint,participationVoters,readParticipationPositions}=await import('../src/lib/participationTransactions.ts');
const {PARTICIPATION_CONTRACTS}=await import('../src/config/participationVerification.ts');
const {VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const { NFT_ALLOCATION } = await import('../src/config/nftGovernanceVerification.ts');
const {nftAllocationAbi,nftReadAbi,allocationPositions}=await import('../src/lib/nftAllocationState.ts');
const {prepareNftAllocation,nftAllocationAdapter,nftActionEligibility}=await import('../src/lib/nftAllocationActions.ts');
const common=VERIFIED_FARM_WRITES[0],{credit,consensus}=PARTICIPATION_CONTRACTS;
const code='0x60006000',hash=keccak256(code),U=10n**18n;
for(const target of [credit,consensus,NFT_ALLOCATION,...MINER_PREVIEW_SPECS])target.runtimeCodeHash=hash;
common.masterchefRuntimeCodeHash=common.governorRuntimeCodeHash=common.rewardTokenRuntimeCodeHash=hash;
const account=getAddress('0x'+'11'.repeat(20)),other=getAddress('0x'+'22'.repeat(20)),third=getAddress('0x'+'33'.repeat(20));
const blockHash='0x'+'aa'.repeat(32),now=Date.now(),timestamp=Math.floor(now/1000),tag='0x100';
const poolAbi=new Interface(['function balanceOf() view returns(uint256)']);
const request=(action,args={})=>({module:'participation',action,args:{minerId:'one-month',...args}});
const opts=()=>({walletBalance:100n*U,credit:50n*U,currentVote:1n,shares:5n*U,delegate:account,total:20n*U,poolBalance:40n*U,chefCredit:40n*U,position:[5n*U,1n,5n*U,2n,300n],count:1n});
function mock(overrides={}){
 const o={...opts(),...overrides},calls=[];let blocks=0;
 return {calls,o,async send(method,args){calls.push([method,args]);
  if(method==='eth_chainId')return o.wrongChain?'0x1':'0x171';
  if(method==='eth_getCode')return o.badCode?'0x6001':code;
  if(method==='eth_getBlockByNumber')return {number:tag,hash:o.reorg&&blocks++?'0x'+'bb'.repeat(32):blockHash,timestamp:'0x'+(timestamp+(o.timestampDelta??0)).toString(16)};
  if(method!=='eth_call')throw Error('Unexpected method '+method);
  assert.equal(args[1],tag,'all calls use snapshot/receipt block');
  const to=getAddress(args[0].to);let decoded,abi=participationAbi;
  try{decoded=abi.parseTransaction(args[0]);}catch{}
  if(!decoded){for(const iface of [poolAbi,nftAllocationAbi,nftReadAbi]){const found=iface.parseTransaction(args[0]);if(found){abi=iface;decoded=found;break;}}}
  const name=decoded.name;
  let value;
  const miner=MINER_PREVIEW_SPECS.find(row=>getAddress(row.address)===to);
  switch(name){
   case 'nftAllocationContract':value=NFT_ALLOCATION.address;break;
   case 'nftAllocation':if(o.incompatible)throw Error('Incompatible candidate');value=1n*U;break;
   case 'pendingContract':return abi.encodeFunctionResult(name,decoded.args[0]===other?[!!o.pending,BigInt(o.pendingTime??1),o.committed??200n]:[!!o.predecessor,0n,0n]);
   case 'allocationContract':value=!!o.approved;break;
   case 'approveThreshold':value=100n;break;
   case 'rejectThreshold':value=500n;break;
   case 'rejectionPeriod':value=604800n;break;
   case 'tokensCastedPerVote':value=decoded.args[0]===BigInt(other)?o.yes??300n:o.no??0n;break;
   case 'totalDTXStaked':value=1000n;break;
   case 'costToVote':value=1n*U;break;
   case 'deductingContract':value=!o.revoked;break;
   case 'token':case 'dtx':value=common.rewardToken;break;
   case 'masterchef':value=common.masterchef;break;
   case 'owner':value=to===getAddress(common.rewardToken)?common.masterchef:common.governor;break;
   case 'governor':case 'admin':case 'treasury':value=common.governor;break;
   case 'creditContract':case 'votingCreditAddress':value=o.badCreditWiring?other:credit.address;break;
   case 'consensusContract':value=consensus.address;break;
   case 'migrationPool':value=o.migration?other:ZeroAddress;break;
   case 'trustedContract':value=!o.untrusted;break;
   case 'creditingContract':value=!o.notCrediting;break;
   case 'poolID':value=o.wrongPool?99n:BigInt(miner.poolId);break;
   case 'poolInfo':return abi.encodeFunctionResult(name,[1n,1n,o.wrongParticipant?other:MINER_PREVIEW_SPECS[Number(decoded.args[0])].address]);
   case 'userCredit':value=o.credit;break;
   case 'balanceOf':value=decoded.args.length?o.walletBalance:o.poolBalance;break;
   case 'credit':value=o.chefCredit;break;
   case 'totalShares':value=o.total;break;
   case 'getNrOfStakes':value=o.count;break;
   case 'userInfo':return abi.encodeFunctionResult(name,o.position);
   case 'getUserTotalShares':value=o.shares;break;
   case 'userVote':value=o.currentVote;break;
   case 'userDelegate':value=o.delegate;break;
   case 'proposalLengths':return abi.encodeFunctionResult(name,[3n,7n]);
   case 'consensusProposal':return abi.encodeFunctionResult(name,[decoded.args[0]<3n?0n:1n,decoded.args[0]<3n?other:consensus.address,o.badPair&&decoded.args[0]===4n?999n:1n]);
   case 'isGovInvalidated':return abi.encodeFunctionResult(name,[!!o.invalidGovernor,false]);
   case 'treasuryProposal':return abi.encodeFunctionResult(name,[!o.closed,1n,0n,0n,1n,common.rewardToken,third,25n*U,o.badMapping?1n:3n]);
   default:throw Error('Unexpected read '+name);
  }
  return abi.encodeFunctionResult(name,[value]);
 }};
}
const nftRequest=(action)=>({module:'nft-allocation',action,args:{candidate:other}});
test('address ballots retain all 160 bits and use +1 for opposition',()=>{
 const row=allocationPositions('0xffffffffffffffffffffffffffffffffffffffff');
 assert.equal(row.support,2n**160n-1n);assert.equal(row.opposition,2n**160n);
 assert.throws(()=>allocationPositions(ZeroAddress));
});
for(const [action,settings,method] of [['notify',{},'notifyVote'],['propose',{},'proposeAllocationContract'],['update',{pending:true},'updateVotes'],['reject',{pending:true,no:101n},'rejectAllocationContract'],['approve',{pending:true},'approveAllocationContract']])test(action+' uses the deployed allocation call',async()=>{
 const q=await prepareNftAllocation(mock(settings),account,nftRequest(action));
 const tx=nftAllocationAbi.parseTransaction(q);assert.equal(tx.name,method);assert.equal(tx.args[0],other);
 if(action==='notify')assert.match(q.warnings.join(' '),/burn the shortfall/);
});
for(const [action,settings,pattern] of [
 ['notify',{credit:49n*U},/50 times/],['notify',{revoked:true},/authorized/],['notify',{incompatible:true},/Incompatible/],
 ['propose',{yes:100n},/exceed/],['propose',{pending:true},/pending/],['propose',{predecessor:true},/collides/],
 ['propose',{pendingTime:timestamp},/cooling/],['update',{pending:true,yes:200n},/higher/],
 ['reject',{pending:true,no:100n},/exceed/],['approve',{pending:true,no:101n},/would reject/],
 ['approve',{pending:true,pendingTime:timestamp-604800},/waiting period/],['approve',{approved:true},/already approved/],
 ['propose',{reorg:true},/block changed/],['notify',{badCode:true},/runtime/],
])test(action+' rejects '+pattern,async()=>assert.rejects(prepareNftAllocation(mock(settings),account,nftRequest(action)),pattern));
test('broken candidate compatibility cannot prevent rejection',async()=>{
 const q=await prepareNftAllocation(mock({pending:true,no:101n,incompatible:true}),account,nftRequest('reject'));
 assert.equal(nftAllocationAbi.parseTransaction(q).name,'rejectAllocationContract');
});
test('NFT miner votes use address ballots rather than consensus array indices',async()=>{
 for(const action of ['miner-vote','delegated-vote'])for(const stance of ['support','oppose']){
  const r=request(action,{targetKind:'nft',candidate:other,stance,voters:third});
  const q=await prepareParticipation(mock(),account,r,now),tx=participationAbi.parseTransaction(q);
  assert.equal(tx.args[action==='miner-vote'?0:1],BigInt(other)+(stance==='oppose'?1n:0n));
 }
});
test('allocation approval cannot confirm rejection, wrong contract, or an open pending record',async()=>{
 const rpc=mock({pending:true}),r=nftRequest('approve'),quote=await prepareNftAllocation(rpc,account,r),review={request:r,quote};
 const event=(name,values)=>({...nftAllocationAbi.encodeEventLog(nftAllocationAbi.getEvent(name),values),address:NFT_ALLOCATION.address});
 const logs=[event('SetPendingContract',[other,BigInt(other),true]),event('SetAllocationContract',[other,true])];
 assert.equal(await nftAllocationAdapter.verify(rpc,review,{blockNumber:tag,logs}),false);
 rpc.o.pending=false;rpc.o.approved=true;
 assert.equal(await nftAllocationAdapter.verify(rpc,review,{blockNumber:tag,logs}),true);
 assert.equal(await nftAllocationAdapter.verify(rpc,review,{blockNumber:tag,logs:[event('SetPendingContract',[other,BigInt(other),false])]}),false);
 logs[1].address=third;assert.equal(await nftAllocationAdapter.verify(rpc,review,{blockNumber:tag,logs}),false);
});
test('notification receipt requires a real matching credit spend',async()=>{
 const rpc=mock(),r=nftRequest('notify'),quote=await prepareNftAllocation(rpc,account,r),review={request:r,quote};
 const notification={...nftAllocationAbi.encodeEventLog(nftAllocationAbi.getEvent('NotifyVote'),[other,BigInt(other),account]),address:NFT_ALLOCATION.address};
 const spendAbi=new Interface(['event DeductCredit(address indexed from,uint256 amount)']);
 const spent={...spendAbi.encodeEventLog(spendAbi.getEvent('DeductCredit'),[account,50n*U]),address:credit.address};
 assert.equal(await nftAllocationAdapter.verify(rpc,review,{blockNumber:tag,logs:[notification]}),false);
 assert.equal(await nftAllocationAdapter.verify(rpc,review,{blockNumber:tag,logs:[notification,spent]}),true);
});
