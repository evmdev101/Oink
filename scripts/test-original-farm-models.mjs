import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { Interface, keccak256, zeroPadValue } from 'ethers';
import { readFileSync } from 'node:fs';
registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const { getFarmWriteSpec, assertCurrentFarmSpec } = await import('../src/lib/farmCatalog.ts');
const { verifyFarmTokenState } = await import('../src/lib/farmTokenSafety.ts');
const { readFarmAssetBalance, readFarmRewardBalance } = await import('../src/lib/farmAccounting.ts');
const abi=new Interface(['function balanceOf(address) view returns(uint256)','function vaultBalance() view returns(uint256)']);
const evidence=JSON.parse(readFileSync(new URL('../evidence/original-farm-parity-verification.json',import.meta.url),'utf8'));

for(const id of ['pdrip','emit','ptgc','ufo']) test(id+' has an explicit source-compiled vault binding and complete transaction identity',()=>{
  const spec=getFarmWriteSpec(id),proof=evidence.rows.find(row=>row.id===id);
  assert.ok(spec);assert.equal(proof.compiledVaultMatches,true);
  assert.equal(spec.address,proof.vault);assert.equal(spec.tokenAddress,proof.token);
  assert.equal(spec.runtimeCodeHash,proof.vaultRuntimeHash);assert.equal(spec.tokenRuntimeCodeHash,proof.tokenRuntimeHash);
  assert.equal(spec.tokenPolicy.accounting,proof.accounting);
  assert.equal(VERIFIED_FARM_WRITES.filter(row=>row.id===id).length,1);
  const changed=structuredClone(spec);changed.tokenPolicy.accounting=proof.accounting==='nominal'?'received':'nominal';
  assert.throws(()=>assertCurrentFarmSpec(changed),/unavailable or changed/);
});

test('reflection accounting reads a block-pinned ledger while liquidity remains a separate token balance',async()=>{
  const calls=[],spec=getFarmWriteSpec('ptgc');
  const rpc={async send(method,[tx,tag]){calls.push({method,tx,tag});assert.equal(method,'eth_call');assert.equal(tag,'0x100');const p=abi.parseTransaction(tx);return abi.encodeFunctionResult(p.fragment,[p.name==='vaultBalance'?80n:100n]);}};
  assert.equal(await readFarmRewardBalance(rpc,spec,256),80n);
  assert.equal(await readFarmAssetBalance(rpc,spec,'0x100'),100n);
  assert.equal(calls[0].tx.to,spec.address);assert.equal(calls[1].tx.to,spec.tokenAddress);
});

test('PDRIP proxy pin blocks changed implementations and changed implementation code',async()=>{
  const spec=structuredClone(getFarmWriteSpec('pdrip')),proxy='0x6001',implementation='0x6002',pin=spec.tokenPolicy.implementation;
  spec.tokenRuntimeCodeHash=keccak256(proxy);pin.runtimeCodeHash=keccak256(implementation);
  let word=zeroPadValue(pin.address,32),code=implementation;
  const rpc={async send(method,params){assert.equal(params.at(-1),'0x100');if(method==='eth_getStorageAt'){assert.equal(params[1],pin.slot);return word;}assert.equal(method,'eth_getCode');return params[0]===spec.tokenAddress?proxy:code;}};
  await verifyFarmTokenState(rpc,spec,'0x'+'11'.repeat(20),'0x100');
  word=zeroPadValue('0x'+'22'.repeat(20),32);
  await assert.rejects(verifyFarmTokenState(rpc,spec,'0x'+'11'.repeat(20),'0x100'),/implementation changed/);
  word=zeroPadValue(pin.address,32);code='0x6003';
  await assert.rejects(verifyFarmTokenState(rpc,spec,'0x'+'11'.repeat(20),'0x100'),/implementation runtime changed/);
});
