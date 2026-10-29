import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {JsonRpcProvider,Interface} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {checkedParticipationSnapshot}=await import('../src/lib/participationTransactions.ts');
const {readNftAllocation}=await import('../src/lib/nftAllocationState.ts');
const {NFT_ALLOCATION}=await import('../src/config/nftGovernanceVerification.ts');
const {prepareRewardMaintenance}=await import('../src/lib/rewardMaintenanceActions.ts');
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:8}),account='0x0000000000000000000000000000000000000002';
try{
 const s=await checkedParticipationSnapshot(rpc,account);
 // Rejection-mode inspection intentionally permits an incompatible candidate,
 // so protocol wiring and thresholds can be checked without publishing one.
 const state=await readNftAllocation(rpc,s,NFT_ALLOCATION.address,true);await s.finish();
 const result={readOnly:true,block:s.number,nft:{proxyWiringVerified:true,approveThreshold:String(state.approveThreshold),rejectThreshold:String(state.rejectThreshold),rejectionPeriod:String(state.rejectionPeriod)}};
 try{const q=await prepareRewardMaintenance(rpc,account,{module:'reward-maintenance',action:'end',args:{}});result.reward={simulation:await rpc.send('eth_call',[{from:account,to:q.to,data:q.data},'0x'+q.block.toString(16)]),block:q.block};}catch(e){result.reward={eligibility:e.shortMessage??e.message};}
 console.log(JSON.stringify(result,null,2));await fs.writeFile('evidence/nft-reward-live.json',JSON.stringify(result,null,2));
}finally{rpc.destroy()}
