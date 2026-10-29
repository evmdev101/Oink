// Public reads and eth_call only. No wallet provider, signer or send method.
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import {Interface,JsonRpcProvider,formatEther} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {minerDonationAdapter}=await import('../src/lib/minerDonationTransactions.ts');
const {protocolWalletTransaction}=await import('../src/lib/protocolTransactions.ts');
const {previewMiner,previewAbi}=await import('../src/lib/positionPreviews.ts');
const {MINER_PREVIEW_SPECS:miners}=await import('../src/config/minerPreviewVerification.ts');
const allowed=new Set(['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_getTransactionCount','eth_call']);
const provider=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const rpc={send(method,params){if(!allowed.has(method))throw Error('Forbidden RPC: '+method);return provider.send(method,params);}};
// Public historical depositor already used by the repository's preflight checks.
const account='0x36f88aea238d4a5222c25df9dbf038c21e345677';
const result={checkedAt:new Date().toISOString(),readOnly:true,creation:null,miners:[]};
const minerAbi=new Interface([...previewAbi.fragments,'function userInfo(address,uint256) view returns(uint256,uint256,uint256,uint256,uint256)']);
try{
 const quote=await minerDonationAdapter.prepare(rpc,account,{module:'miner-donation',action:'deploy',args:{recipient:account,miner:'one-year',mandatoryDays:'365'}});
 const tx=protocolWalletTransaction({quote,transaction:{from:account,to:quote.to,data:quote.data,value:'0x0',chainId:'0x171',gas:'0x100000',nonce:quote.creation.nonce}});
 const runtime=await rpc.send('eth_call',[tx,'0x'+quote.block.toString(16)]);
 result.creation={block:quote.block,blockHash:quote.blockHash,runtimeMatches:runtime.toLowerCase()===quote.creation.runtime.toLowerCase(),sourceHash:Object.fromEntries(quote.facts)['Helper source hash']};
 for(const miner of miners){
  const at='0x'+quote.block.toString(16),read=async(method,args=[])=>minerAbi.decodeFunctionResult(method,await rpc.send('eth_call',[{to:miner.address,data:minerAbi.encodeFunctionData(method,args)},at]))[0];
  const [withdrawals,transfers,enabled,minimum,count]=await Promise.all(['partialWithdrawals','partialTransfers','allowStakeTransfer','minimumGift','getNrOfStakes'].map(method=>read(method,method==='getNrOfStakes'?[account]:[])));
  const row={id:miner.id,partialWithdrawals:withdrawals,partialTransfers:transfers,transfersEnabled:enabled,minimumGift:formatEther(minimum),historicalPositions:count.toString(),previews:[]};
  if(count>0n){
   const data=await rpc.send('eth_call',[{to:miner.address,data:minerAbi.encodeFunctionData('userInfo',[account,0])},at]),position=minerAbi.decodeFunctionResult('userInfo',data),shares=position[0]/2n;
   if(shares>0n)for(const kind of ['withdraw','transfer'])try{const preview=await previewMiner(rpc,miner.id,account,{kind,index:0,shares:formatEther(shares),...(kind==='transfer'?{recipient:'0x0000000000000000000000000000000000000012'}:{})});row.previews.push({kind,block:preview.block,simulation:preview.simulation,selectedShares:preview.execution?.shares});}catch(error){row.previews.push({kind,message:error.message});}
  }
  result.miners.push(row);
 }
 fs.writeFileSync('evidence/miner-donation/live-checks-2026-10-24.json',JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({creation:result.creation,miners:result.miners.map(row=>({id:row.id,partialWithdrawals:row.partialWithdrawals,partialTransfers:row.partialTransfers,previews:row.previews}))}));
}finally{provider.destroy();}
