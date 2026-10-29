import fs from 'node:fs/promises';
import {registerHooks} from 'node:module';
import {JsonRpcProvider,Interface,getAddress} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {prepareAdvancedGovernance}=await import('../src/lib/advancedGovernanceActions.ts');
const {SENATE_ACTION_ABI,SENATE_PIN,CONSENSUS_ACTION_ABI}=await import('../src/config/advancedGovernanceVerification.ts');
const {PARTICIPATION_CONTRACTS}=await import('../src/config/participationVerification.ts');
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
try{
 const abi=new Interface(SENATE_ACTION_ABI),con=new Interface(CONSENSUS_ACTION_ABI);
 const block=await rpc.getBlock('latest');
 const call=async(to,i,m,args=[])=>i.decodeFunctionResult(m,await rpc.send('eth_call',[{to,data:i.encodeFunctionData(m,args)},'0x'+block.number.toString(16)]));
 const members=(await call(SENATE_PIN.address,abi,'viewSenators'))[0];
 const account=members.length?members[0]:'0x0000000000000000000000000000000000000002';
 const rows=[];
 for(const request of [{module:'advanced-governance',action:'senate-credit',args:{}},{module:'advanced-governance',action:'senate-membership-vote',args:{candidate:'0x0000000000000000000000000000000000000002',outcome:'add'}}]){
  try{const quote=await prepareAdvancedGovernance(rpc,account,request);const result=await rpc.send('eth_call',[{from:account,to:quote.to,data:quote.data},'0x'+quote.block.toString(16)]);rows.push({action:request.action,result,block:quote.block,simulationPassed:true});}
  catch(e){rows.push({action:request.action,eligibility:e.shortMessage??e.message});}
 }
 const count=Number((await call(PARTICIPATION_CONTRACTS.consensus.address,con,'proposalLengths'))[0]);
 const latest=await Promise.all(Array.from({length:Math.min(20,count)},async(_,offset)=>{const id=count-1-offset;return {id,row:await call(PARTICIPATION_CONTRACTS.consensus.address,con,'treasuryProposal',[id])};}));
 const target=latest.find(item=>item.row[0]);
 if(target){
  for(const action of ['treasury-close','treasury-approve']){
   try{const quote=await prepareAdvancedGovernance(rpc,account,{module:'advanced-governance',action,args:{id:String(target.id)}});const result=await rpc.send('eth_call',[{from:account,to:quote.to,data:quote.data},'0x'+quote.block.toString(16)]);rows.push({action,id:target.id,result,block:quote.block,simulationPassed:true});break;}
   catch(e){rows.push({action,id:target.id,eligibility:e.shortMessage??e.message});}
  }
 }
 const record={readOnly:true,checkedAt:new Date().toISOString(),block:block.number,memberCount:members.length,rows};console.log(JSON.stringify(record,null,2));await fs.writeFile('evidence/advanced-governance-live.json',JSON.stringify(record,null,2));
}finally{rpc.destroy()}
