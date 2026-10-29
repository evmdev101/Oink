// Public, read-only diagnostics: no wallet connection or transaction requests.
import {registerHooks} from 'node:module';
import {writeFile} from 'node:fs/promises';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {getPublicProvider}=await import('../src/lib/chain.ts');
const {readSaleMaximum}=await import('../src/lib/miningOffers.ts');
const {readSaleMaximumsFromRpc,saleMaximumKey}=await import('../src/lib/saleMaximumDisplay.ts');
const account=process.argv[2];
if(!account)throw Error('Provide a public wallet address for the read-only balance check.');
const provider=await getPublicProvider(),failures=[];
const rpc={async send(method,params){try{return await provider.send(method,params);}catch(error){failures.push({method,to:params?.[0]?.to,data:params?.[0]?.data,message:error.shortMessage??error.message});throw error;}}};
const results=[];
try{
  const started=Date.now();
  const preloaded=process.argv.includes('--prefetch')?await readSaleMaximumsFromRpc(rpc,account):null;
  const prefetchMs=preloaded?Date.now()-started:null;
  for(const asset of ['PLS','PLSX','INC','HEX']){
    try{
      const state=preloaded?preloaded[saleMaximumKey(asset,'five-year')]:await readSaleMaximum(rpc,asset,'five-year',account);
      if(!state)throw Error('This token maximum was unavailable.');
      const quote=state;
      const row={asset,block:state.block,balance:state.balance,maxReceive:state.maxReceive,maxError:state.maxError,quote:quote&&{amount:quote.quote,payment:quote.paymentAmount,funded:quote.quoteFunded,balanceEnough:quote.balanceEnough,error:quote.quoteError}};
      results.push(row);console.log(JSON.stringify(row));
    }catch(error){const row={asset,error:error.shortMessage??error.message};results.push(row);console.log(JSON.stringify(row));}
  }
  const file=preloaded?'evidence/sale-max-prefetch-live-2026-10-24.json':'evidence/sale-max-live-2026-10-24.json';
  await writeFile(file,JSON.stringify({checkedAt:new Date().toISOString(),readOnly:true,maximumMode:preloaded?'inventory':'wallet',account,preloadedPairs:preloaded?Object.keys(preloaded).length:null,prefetchMs,results,failures},null,2));
}finally{provider.destroy();}
