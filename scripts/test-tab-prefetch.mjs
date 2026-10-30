import {test} from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const calls=[];globalThis.tabPrefetchCalls=calls;
const exportsFor=names=>names.map(name=>`export async function ${name}(...args){globalThis.tabPrefetchCalls.push({name:${JSON.stringify(name)},args});}`).join('\n');
registerHooks({
 resolve(s,c,next){try{return next(s,c);}catch(error){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))for(const extension of ['.ts','.tsx']){try{return next(s+extension,c);}catch{}}throw error;}},
 load(url,c,next){
  let names;
  if(url.endsWith('/src/lib/miningAccounts.ts'))names=['readMinerPositions','readEcosystemVaults'];
  if(url.endsWith('/src/lib/minerDisplayReads.ts'))names=['readTimeMinerSummary','readPublicMinerYields','readMinerWalletBalance'];
  if(url.endsWith('/src/lib/miningOfferDisplayReads.ts'))names=['readSaleDisplay','readReferralDisplay'];
  if(url.endsWith('/src/lib/farmPrices.ts'))names=['readFarmPrices'];
  if(names)return {format:'module',shortCircuit:true,source:exportsFor(names)};
  if(url.includes('/src/pages/'))return {format:'module',shortCircuit:true,source:'export const routeCode=true;'};
  return next(url,c);
 }
});
const {preloadPage}=await import('../src/lib/preloadPage.ts');
async function warm(path,account=null){calls.length=0;await preloadPage(path,account);return [...calls];}
test('deploy intent warms APR and wallet balance without loading miner positions or contract summary',async()=>{
 const rows=await warm('/mining?tab=deploy','alice');assert.deepEqual(rows.map(r=>r.name).sort(),['readMinerWalletBalance','readPublicMinerYields']);
});
test('My miners intent warms only the selected wallet positions',async()=>{
 assert.deepEqual(await warm('/mining','alice'),[{name:'readMinerPositions',args:['alice']}]);assert.deepEqual(await warm('/mining'),[]);
});
test('sale intent warms the actual receive-amount form instead of unrelated miner reads',async()=>{
 assert.deepEqual(await warm('/mining?tab=sale','bob'),[{name:'readSaleDisplay',args:['PLS','','five-year','bob',undefined,'receive']}]);
});
test('contract and referral tabs warm only their own display reads',async()=>{
 assert.deepEqual((await warm('/mining?tab=contracts')).map(r=>r.name),['readTimeMinerSummary']);
 assert.deepEqual(await warm('/mining?tab=referral','alice'),[{name:'readReferralDisplay',args:['alice']}]);
 assert.deepEqual(await warm('/mining?tab=referral'),[]);
});
test('portfolio intent shares live prices, miners and farms for its account',async()=>{
 const rows=await warm('/portfolio','alice');assert.deepEqual(rows.map(r=>r.name).sort(),['readEcosystemVaults','readFarmPrices','readMinerPositions']);
 assert.deepEqual(rows.find(r=>r.name==='readEcosystemVaults').args,[undefined,'alice']);
});
test('documentation and donation tabs do not start unrelated speculative blockchain requests',async()=>{
 assert.deepEqual(await warm('/docs'),[]);assert.deepEqual(await warm('/mining?tab=donations','alice'),[]);
});
