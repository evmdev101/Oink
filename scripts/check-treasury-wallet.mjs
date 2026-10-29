import {registerHooks} from 'node:module';
import fs from 'node:fs/promises';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {getPublicProvider}=await import('../src/lib/chain.ts');
const {readTreasuryHoldings,treasuryAccounts}=await import('../src/lib/treasuryActivity.ts');
const {readTreasuryStrategies}=await import('../src/lib/treasuryStrategies.ts');
const {readFarmPrices}=await import('../src/lib/farmPrices.ts');
const {treasuryWalletValues}=await import('../src/lib/treasuryValuation.ts');
const provider=await getPublicProvider();
try{
  const [wallet,strategies,prices]=await Promise.all([
    readTreasuryHoldings(provider,[treasuryAccounts[0]]),readTreasuryStrategies(provider),readFarmPrices(),
  ]);
  const report={checkedAt:new Date().toISOString(),readOnly:true,wallet,strategies,valuation:treasuryWalletValues(wallet.rows[0].assets,prices,Date.now()),prices};
  await fs.writeFile('evidence/treasury-wallet-live-2026-10-21.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({checkedAt:report.checkedAt,walletBlock:wallet.block,walletTotal:report.valuation.total,complete:report.valuation.complete,strategiesBlock:strategies.block,strategies:strategies.rows.map(row=>({label:row.label,error:row.error,assets:row.assets.map(asset=>({symbol:asset.symbol,balance:asset.balance}))}))},null,2));
}finally{provider.destroy();}
