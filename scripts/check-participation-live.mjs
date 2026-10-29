// Public RPC only. No wallet connection, signature, gas estimate, or broadcast.
import fs from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { JsonRpcProvider, Interface } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {prepareParticipation,checkedParticipationSnapshot}=await import('../src/lib/participationTransactions.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const account='0x0000000000000000000000000000000000000002', delegate='0x0000000000000000000000000000000000000003';
try {
 const state=await checkedParticipationSnapshot(rpc,account);await state.finish();
 const rows=[];
 for(const miner of MINER_PREVIEW_SPECS){
  const quote=await prepareParticipation(rpc,account,{module:'participation',action:'delegate',args:{minerId:miner.id,delegate}});
  const result=await rpc.send('eth_call',[{from:account,to:quote.to,data:quote.data,value:'0x0'},'0x'+quote.block.toString(16)]);
  if(result!=='0x')throw Error('Unexpected delegation return');
  rows.push({id:miner.id,block:quote.block,blockHash:quote.blockHash,pinnedDependenciesPassed:true,delegationSimulationPassed:true});
  console.log(miner.id+' dependency wiring and eth_call passed');
 }
 const helperAbi=new Interface(['function creditingContract(address) view returns(bool)','function airdropContract() view returns(address)','function airdropContractLocked() view returns(address)']);
 const result={checkedAt:new Date().toISOString(),readOnly:true,account,coreBlock:state.number,coreHash:state.block.hash,miners:rows};
 await fs.writeFile('evidence/participation-live-check.json',JSON.stringify(result,null,2)+'\n');
}finally{rpc.destroy();}
