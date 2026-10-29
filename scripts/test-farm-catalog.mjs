import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { VERIFIED_FARM_WRITES: known } = await import('../src/config/farmWriteVerification.ts');
const c = await import('../src/lib/farmCatalog.ts');
const { prepareFarmTransaction, requestReviewedFarmTransaction, verifyFarmReceipt } = await import('../src/lib/farmTransactions.ts');
const addr = '0x0000000000000000000000000000000000000099';
const hash = '0x'+'ab'.repeat(32);
const spec = (base = known.find(f=>f.id==='plsx')) => ({...structuredClone(base), id:'registry-'+addr, address:addr, poolId:'999', discoveryTemplateId:base.tokenAddress?'token-vault-0.8.20-optimized':'pls-vault-0.8.20-optimized', discoveryBlockHash:hash});

test('catalog begins with reviewed farms only and atomically adds independent discovered farms',()=>{
  c.replaceDiscoveredFarmSpecs([]);
  assert.equal(c.getFarmWriteSpecs().length,known.length); assert.equal(c.getFarmWriteSpec('registry-'+addr),undefined);
  const dynamic=spec(), events=[]; const stop=c.subscribeFarmCatalog(()=>events.push(c.getFarmCatalogRevision()));
  try{
    c.replaceDiscoveredFarmSpecs([dynamic]);
    assert.equal(c.getFarmWriteSpecs().length,known.length+1);
    assert.equal(c.getFarmWriteSpec(dynamic.id).address,addr); c.assertCurrentFarmSpec(dynamic);
    const previous=c.getFarmCatalogRevision();
    c.replaceDiscoveredFarmSpecs([{...dynamic,verifiedBlock:dynamic.verifiedBlock+1,discoveryBlockHash:'0x'+'cd'.repeat(32)}]);
    assert.equal(c.getFarmCatalogRevision(),previous,'same verified permissions at a newer snapshot do not invalidate a review');
    assert.equal(events.length,1);
    dynamic.poolId='1000'; assert.equal(c.getFarmWriteSpec(dynamic.id).poolId,'999','caller cannot mutate published permission');
    assert(Object.isFrozen(c.getFarmWriteSpec(dynamic.id)));
    assert.throws(()=>c.assertCurrentFarmSpec(dynamic),/unavailable or changed/);
    c.replaceDiscoveredFarmSpecs([]); assert.equal(events.length,2); assert.equal(c.getFarmWriteSpec(dynamic.id),undefined);
  }finally{stop();c.replaceDiscoveredFarmSpecs([]);}
});

for(const [name,change] of [
  ['address/id mismatch',s=>{s.address=known[0].address;}],
  ['unknown template',s=>{s.discoveryTemplateId='same-abi-is-not-reviewed';}],
  ['missing block proof',s=>{delete s.discoveryBlockHash;}],
  ['unknown token',s=>{s.tokenAddress='0x0000000000000000000000000000000000000088';}],
  ['changed token precision',s=>{s.decimals=6;}],
  ['changed token runtime',s=>{s.tokenRuntimeCodeHash=hash;}],
  ['changed dependency',s=>{s.masterchef=addr;}],
  ['changed dependency runtime',s=>{s.governorRuntimeCodeHash=hash;}],
  ['known pool collision',s=>{s.poolId=known[0].poolId;}],
  ['missing token policy',s=>{Object.assign(s,spec(known.find(f=>f.tokenPolicy?.kind==='usdc')));delete s.tokenPolicy;}],
])test('catalog refuses '+name,()=>{
  c.replaceDiscoveredFarmSpecs([]);const candidate=spec();change(candidate);
  assert.throws(()=>c.replaceDiscoveredFarmSpecs([candidate]));
  assert.equal(c.getFarmWriteSpec(candidate.id),undefined);assert.equal(c.getFarmWriteSpecs().length,known.length);
});

test('native discovered farms retain no-approval identity and token templates cannot be substituted',()=>{
  const dynamic=spec(known[0]);
  try{c.replaceDiscoveredFarmSpecs([dynamic]);assert.equal(c.getFarmWriteSpec(dynamic.id).tokenAddress,null);
    assert.throws(()=>c.replaceDiscoveredFarmSpecs([{...dynamic,discoveryTemplateId:'token-vault-0.8.20-optimized'}]),/model/);
  }finally{c.replaceDiscoveredFarmSpecs([]);}
});

test('unknown or removed saved specs never authorize default prepare, send or receipt verification',async()=>{
  const candidate=spec(),calls=[],rpc={send:async(method)=>{calls.push(method);throw Error('No reads allowed');}},provider={request:async()=>{throw Error('No wallet requests allowed');}};
  for(const input of [candidate,{...candidate,id:'unknown-but-looks-valid'}]){
    await assert.rejects(prepareFarmTransaction(rpc,input,addr,'1','deposit'),/unavailable or changed/);
    await assert.rejects(requestReviewedFarmTransaction({spec:input},provider,rpc,()=>true),error=>/unavailable or changed/.test(error.message)&&error.walletRequestStarted===false);
    await assert.rejects(verifyFarmReceipt(rpc,{spec:input},hash),/unavailable or changed/);
  }
  assert.deepEqual(calls,[]);
});
