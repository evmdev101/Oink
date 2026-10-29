import { registerHooks } from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const { getPublicProvider } = await import('../src/lib/chain.ts');
const { readTreasuryInflows } = await import('../src/lib/treasuryInflows.ts');
const { treasuryActivityAssets } = await import('../src/lib/treasuryActivity.ts');
const { inflowWindowSummary } = await import('../src/lib/dashboardStats.ts');
const { FARM_PRICE_TOKENS, readFarmPrices, freshFarmPrice } = await import('../src/lib/farmPrices.ts');
const rpc = await getPublicProvider();
try {
  const history = await readTreasuryInflows(rpc,null,AbortSignal.timeout(90000));
  const prices = await readFarmPrices();
  const now = Date.now()/1000;
  const summaries = [1,7,30].map(days => ({days,...inflowWindowSummary(history.rows,history,days*86400,now,symbol=>{
    const token = treasuryActivityAssets.find(asset=>asset.symbol===symbol);
    const id = Object.entries(FARM_PRICE_TOKENS).find(([,address])=>address.toLowerCase()===token?.address.toLowerCase())?.[0];
    return freshFarmPrice(prices[id]);
  })}));
  assert.ok(summaries.every(summary=>summary.complete && summary.usd!==null),'All windows must have full history and prices.');
  const refreshed = await readTreasuryInflows(rpc,history,AbortSignal.timeout(90000));
  assert.ok(refreshed.to>=history.to);
  const report = {checkedAt:new Date().toISOString(),readOnly:true,summaries,history,refreshTo:refreshed.to};
  fs.writeFileSync('evidence/treasury-inflows-2026-10-10.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({...report,history:{...history,rows:history.rows.length}},null,2));
} finally { rpc.destroy(); }
