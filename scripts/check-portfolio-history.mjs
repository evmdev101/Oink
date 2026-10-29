// Read-only diagnostics for a public address; never connects or submits a transaction.
import {registerHooks} from 'node:module';
import {writeFile} from 'node:fs/promises';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {getPublicProvider}=await import('../src/lib/chain.ts');
const {readPortfolioHistory}=await import('../src/lib/portfolioHistory.ts');
const {sumFarmAmounts}=await import('../src/lib/farmDisplay.ts');
const {cumulativeHistory}=await import('../src/lib/portfolioHistoryModel.ts');
const {sharedDisplayReads}=await import('../src/lib/sharedReadCache.ts');
const account=process.argv[2];
if(!account)throw Error('Provide the public wallet address to check.');
const provider=await getPublicProvider(),started=Date.now(),progress=[];
try{
  const result=await readPortfolioHistory(account,AbortSignal.timeout(50000),value=>{
    const step={ms:Date.now()-started,rows:value.rows.length,failed:value.failed};
    progress.push(step);console.log(JSON.stringify({progress:step}));
  });
  const firstLoadMs=Date.now()-started;
  sharedDisplayReads.clear('369:history:rpc:');
  const refreshStart=Date.now();
  const refreshed=await readPortfolioHistory(account,AbortSignal.timeout(50000));
  const report={checkedAt:new Date().toISOString(),readOnly:true,ms:firstLoadMs,account:result.account,rows:result.rows.length,failed:result.failed,capped:result.capped,sources:result.sources,toBlock:result.toBlock,totals:Object.fromEntries(['deposited','withdrawn','harvested','penalty'].map(key=>[key,sumFarmAmounts(result.rows.map(row=>row[key]))])),categories:Object.fromEntries(['miners','farms','hex'].map(category=>[category,result.rows.filter(row=>row.category===category).length])),chartPoints:Object.fromEntries(['deposited','withdrawn','harvested'].map(key=>[key,cumulativeHistory(result.rows,key).length])),progress,refresh:{ms:Date.now()-refreshStart,rows:refreshed.rows.length,failed:refreshed.failed,toBlock:refreshed.toBlock}};
  await writeFile('evidence/portfolio-history-live-2026-10-25.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{provider.destroy();}
