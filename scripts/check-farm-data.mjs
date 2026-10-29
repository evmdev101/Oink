// End-to-end public reads only: no connected wallet, signatures or transactions.
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { readEcosystemVaults } = await import('../src/lib/miningAccounts.ts');
const { getPublicProvider } = await import('../src/lib/chain.ts');
const { readFarmPrices } = await import('../src/lib/farmPrices.ts');
const { farmRankings, displayRankValue } = await import('../src/lib/farmRankings.ts');
try {
  const [snapshot, prices] = await Promise.all([readEcosystemVaults(AbortSignal.timeout(90000)), readFarmPrices()]);
  const ranks=farmRankings(snapshot.rows,prices,snapshot.timestamp);
  for(const row of snapshot.rows) console.log(JSON.stringify({id:row.id,pool:(row.special??row.data)?.pool,price:prices[row.id]?.usd,apr:ranks.metrics[row.id].apr==null?null:displayRankValue(ranks.metrics[row.id].apr,'apr'),tvl:ranks.metrics[row.id].tvl==null?null:displayRankValue(ranks.metrics[row.id].tvl,'tvl'),emissions:!!(row.special??row.data)?.yieldEstimate,registeredPoolShares:row.special?.registeredPoolShares,pendingPoolRewards:row.special?.rewardCredit,error:row.error}));
  console.log(JSON.stringify({block:snapshot.block,readCoverage:snapshot.rows.filter(r=>r.data||r.special).length,aprCoverage:ranks.apr.length,pricedCoverage:ranks.tvl.length,emissionCoverage:ranks.rewards.length}));
  if(snapshot.rows.length!==17 || snapshot.rows.some(r=>!(r.special??r.data)?.yieldEstimate))throw Error('A farm reader failed');
} finally {(await getPublicProvider()).destroy();}
