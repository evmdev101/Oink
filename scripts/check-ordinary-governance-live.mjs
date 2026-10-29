// Real deployed dependency and outcome getters only; no signer or transaction sends.
import fs from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { Interface, JsonRpcProvider, getAddress, formatEther, toQuantity } from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {ordinaryDependencies,ordinaryReadAbi,prepareOrdinaryProposal}=await import('../src/lib/ordinaryProposalActions.ts');
const {ORDINARY_DEPLOYMENTS}=await import('../src/config/ordinaryGovernanceVerification.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const {VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');
const {verifyRuntime}=await import('../src/lib/farmTransactions.ts');
const rpc=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6}),common=VERIFIED_FARM_WRITES[0];
try {
 const block=await rpc.getBlock('latest'),tag=toQuantity(block.number),rows=[];
 for(const deployment of ['basic','farms','reward']){
  const read=await ordinaryDependencies(rpc,deployment,tag),abi=new Interface(ORDINARY_DEPLOYMENTS[deployment].abi);
  const counts=await read(ORDINARY_DEPLOYMENTS[deployment].address,'proposalLengths',[],abi);
  rows.push({deployment,pinnedRuntimeAndWiringPassed:true,proposalCounts:Array.from(counts,String)});
  console.log(deployment+' current source pins, permissions and dependency wiring passed');
 }
 const read=await ordinaryDependencies(rpc,'basic',tag),miners=[];
 for(const [i,miner]of MINER_PREVIEW_SPECS.entries()){
  if(getAddress((await read(common.governor,'acPool'+(i+1)))[0])!==getAddress(miner.address))throw Error('Governor miner mismatch');
  verifyRuntime(await rpc.send('eth_getCode',[miner.address,tag]),miner.runtimeCodeHash,'Call fee target');
  miners.push({id:miner.id,callFee:(await read(miner.address,'callFee'))[0].toString()});
 }
 const cost=(await read(common.governor,'costToVote'))[0],delay=(await read(common.governor,'delayBeforeEnforce'))[0],threshold=(await read(common.governor,'thresholdFibonaccening'))[0];
 const emptyWallet='0x0000000000000000000000000000000000000002';let balanceGuardPassed=false;
 try{await prepareOrdinaryProposal(rpc,emptyWallet,{module:'ordinary',action:'create',args:{family:'Voting cost',value:formatEther(cost),credit:formatEther(cost),delay:'0'}});}catch(error){if(!/Deposit enough voting credit/.test(error.message))throw error;balanceGuardPassed=true;}
 if(!balanceGuardPassed)throw Error('Expected zero-credit account to be rejected');
 const state={cost:cost.toString(),delay:delay.toString(),threshold:threshold.toString(),eventActive:(await read(common.governor,'eventFibonacceningActive'))[0],governorFee:(await read(common.masterchef,'governorFee'))[0].toString(),emissions:(await read(common.masterchef,'DTXPerBlock'))[0].toString()};
 if((await rpc.getBlock(block.number)).hash!==block.hash)throw Error('Canonical block changed');
 await fs.writeFile('evidence/ordinary-live-check.json',JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,chainId:369,block:block.number,blockHash:block.hash,rows,miners,state,zeroCreditGuardPassed:balanceGuardPassed},null,2)+'\n');
 console.log('Six fee targets, live outcome getters and zero-credit guard passed');
}finally{rpc.destroy();}
