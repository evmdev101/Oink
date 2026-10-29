// Live read-only checks. No wallet provider, signatures, approvals or broadcasts.
import{registerHooks}from'node:module';
import{JsonRpcProvider,formatUnits,id}from'ethers';
import{writeFile}from'node:fs/promises';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {offerAbi,prepareOffer}=await import('../src/lib/offerTransactions.ts');
const {VERIFIED_FARM_WRITES}=await import('../src/config/farmWriteVerification.ts');
const {readSale,readReferral,REFERRAL_ADDRESS,SALE_ADDRESS}=await import('../src/lib/miningOffers.ts');
const provider=new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true}),calls=[];
const rpc={async send(method,params){if(!['eth_chainId','eth_getCode','eth_getBlockByNumber','eth_call','eth_getBalance','eth_estimateGas','eth_gasPrice'].includes(method))throw Error('Not a read: '+method);calls.push(method);return provider.send(method,params);}};
const core=VERIFIED_FARM_WRITES[0],rows=[],accounts=[core.treasuryWallet];
const read=async(to,method,args=[])=>offerAbi.decodeFunctionResult(method,await rpc.send('eth_call',[{to,data:offerAbi.encodeFunctionData(method,args)},'latest']));
for(const asset of ['PLS','PLSX','INC','HEX']){
 try{const quote=await readSale(rpc,asset,asset==='PLS'?'10000':'100','five-year');rows.push({kind:'publicSaleQuote',asset,...quote});}catch(e){rows.push({kind:'publicSaleQuote',asset,error:e.message});}
}
for(const destination of ['wallet','one-year','three-year','five-year']){
 try{const quote=await prepareOffer(rpc,core.treasuryWallet,{module:'offers',action:'sale',args:{asset:'PLS',amount:'10000',destination}});await rpc.send('eth_call',[{from:quote.account,to:quote.to,data:quote.data,value:quote.value},'0x'+quote.block.toString(16)]);rows.push({kind:'nativeSalePreflight',destination,block:quote.block,facts:quote.facts,simulation:'passed'});}catch(e){rows.push({kind:'nativeSalePreflight',destination,error:e.shortMessage??e.message});}
}
for(const asset of ['PLSX','INC','HEX']){
 const spec=VERIFIED_FARM_WRITES.find(v=>v.symbol===asset);
 try{const allowance=(await read(spec.tokenAddress,'allowance',[core.treasuryWallet,SALE_ADDRESS]))[0];const quote=await prepareOffer(rpc,core.treasuryWallet,{module:'offers',action:allowance===0n?'sale-approve':'sale-reset',args:{asset,amount:'1',destination:'wallet'}});rows.push({kind:'saleAllowancePreflight',asset,block:quote.block,facts:quote.facts,simulation:'passed'});}catch(e){rows.push({kind:'saleAllowancePreflight',asset,error:e.shortMessage??e.message});}
}
try{
 const url='https://api.scan.pulsechain.com/api?module=logs&action=getLogs&fromBlock=0&toBlock=latest&address='+REFERRAL_ADDRESS+'&topic0='+id('ClaimReferralReward(address,address,uint256)');
 const body=await(await fetch(url)).json();
 if(Array.isArray(body.result))for(const log of body.result.slice(-8)){const event=offerAbi.parseLog(log);if(event?.name==='ClaimReferralReward'&&!accounts.includes(event.args.user))accounts.push(event.args.user);}
}catch{}
for(const account of accounts){
 try{const data=await readReferral(rpc,account);rows.push({kind:'publicReferralBalance',account,block:data.block,remaining:data.remaining,bonus:data.bonus});if(BigInt(data.remaining.replace('.',''))>0n){for(const destination of ['wallet','five-year'])try{const quote=await prepareOffer(rpc,account,{module:'offers',action:'referral',args:{destination,points:data.remaining}});await rpc.send('eth_call',[{from:quote.account,to:quote.to,data:quote.data,value:quote.value},'0x'+quote.block.toString(16)]);rows.push({kind:'referralPreflight',account,destination,block:quote.block,facts:quote.facts,simulation:'passed'});}catch(e){rows.push({kind:'referralPreflight',account,destination,error:e.shortMessage??e.message});}break;}}catch(e){rows.push({kind:'publicReferralBalance',account,error:e.shortMessage??e.message});}
}
await writeFile('evidence/offer-preflight.json',JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,methods:[...new Set(calls)],rows},null,2));console.log(JSON.stringify(rows,null,2));provider.destroy();
