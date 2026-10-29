// Public RPC reads/simulations only. Never creates or connects a wallet.
import {registerHooks} from 'node:module';
import {JsonRpcProvider,Contract} from 'ethers';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {readSale,readReferral}=await import('../src/lib/miningOffers.ts');
const {readTreasuryHoldings,readActivity}=await import('../src/lib/treasuryActivity.ts');
const {readMinerYield}=await import('../src/lib/minerLive.ts');
const {snapshotRunner}=await import('../src/lib/governanceReadSafety.ts');
const {MINER_PREVIEW_SPECS}=await import('../src/config/minerPreviewVerification.ts');
const {preparePositionTransaction}=await import('../src/lib/positionTransactions.ts');
const {previewFarmExit}=await import('../src/lib/positionPreviews.ts');
const provider=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const methods=new Set(['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call','eth_getBalance','eth_getLogs','eth_estimateGas','eth_gasPrice']);
const rpc={send(method,args){if(!methods.has(method))throw Error('Forbidden RPC: '+method);return provider.send(method,args);}};
const account='0x36f88aea238d4a5222c25df9dbf038c21e345677'; // historical public fixture, NOT the user's wallet
try {
 for(const [name,fn] of [
  ['sale',()=>readSale(rpc,'PLS','1000','five-year')],
  ['referral',()=>readReferral(rpc,account)],
  ['treasury',()=>readTreasuryHoldings(rpc)],
  ['activity',()=>readActivity(rpc)],
 ]){try{const result=await fn();console.log(name,JSON.stringify(result));}catch(e){console.log(name,'FAILED',e.message);process.exitCode=1;}}
 const block=await provider.getBlock('latest'),runner=snapshotRunner(provider,block.number);
 for(const m of MINER_PREVIEW_SPECS){console.log('yield',m.id,JSON.stringify(await readMinerYield(m.id,runner,provider,block.number,block.timestamp)));}
 for(const id of ['pls','plsx','inc'])for(const kind of ['claim','withdraw']){
  try{const result=await preparePositionTransaction(rpc,account,{type:'farm',id,index:0,kind,destination:'wallet'});console.log('prepared',id,kind,'block',result.quote.block,'gas',result.transaction.gas);}catch(e){console.log('prepare failed',id,kind,e.message);process.exitCode=1;}
 }
 for(const m of MINER_PREVIEW_SPECS){try{const result=await preparePositionTransaction(rpc,account,{type:'miner',id:m.id,action:{kind:'deploy',amount:'0.001',recipient:account}});console.log('prepared',m.id,'deploy block',result.quote.block,'gas',result.transaction.gas);}catch(e){console.log('prepare failed',m.id,e.message);process.exitCode=1;}}
 for(const destination of ['one-month','five-year']){try{const q=await previewFarmExit(rpc,'pls',account,0,'claim',Date.now(),destination);console.log('destination',destination,q.simulation,q.facts.filter(([key])=>key.includes('payout')||key.includes('Mandatory')));}catch(e){console.log('destination unavailable',destination,e.message);}}
}finally{provider.destroy();}
