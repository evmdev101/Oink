import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAddress } from 'ethers';
import fs from 'node:fs';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context); } catch { /* Fall through. */ }
  }
  return next(specifier, context);
} });
import { VERIFIED_FARM_READS, FARM_READ_CHEF } from '../src/config/farmReadVerification.ts';
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
import { ECOSYSTEM_MINER_CONTRACTS, OINK_TOKEN } from '../src/config/contracts.ts';
import { FARM_PRICE_TOKENS, selectFarmPrices } from '../src/lib/farmPrices.ts';

test('all 15 standard farms have pinned readers and exact-address market sources',()=>{
  const standard=ECOSYSTEM_MINER_CONTRACTS.filter(r=>!['t-share','treasury'].includes(r.id));
  assert.equal(VERIFIED_FARM_READS.length,15);
  assert.equal(new Set(VERIFIED_FARM_READS.map(r=>r.id)).size,15);
  assert.equal(new Set(VERIFIED_FARM_READS.map(r=>r.poolId)).size,15);
  for(const row of standard) {
    const spec=VERIFIED_FARM_READS.find(s=>s.id===row.id);
    assert.ok(spec,row.id);
    assert.equal(getAddress(spec.address),getAddress(row.address));
    assert.match(spec.runtimeCodeHash,/^0x[0-9a-f]{64}$/);
    assert.ok([6,8,12,18].includes(spec.decimals));
    if(spec.tokenAddress)assert.equal(getAddress(FARM_PRICE_TOKENS[row.id]),getAddress(spec.tokenAddress));
  }
  assert.equal(VERIFIED_FARM_READS.find(r=>r.id==='hex').decimals,8);
  assert.equal(VERIFIED_FARM_READS.find(r=>r.id==='pusdc').decimals,6);
  assert.equal(VERIFIED_FARM_READS.find(r=>r.id==='communitas').decimals,12);
  assert.equal(getAddress(FARM_READ_CHEF.rewardToken),getAddress(OINK_TOKEN));
});

test('transaction allowlist includes all fifteen original farm assets',()=>{
  assert.deepEqual(VERIFIED_FARM_WRITES.map(s=>s.id),['pls','plsx','inc','pdrip','emit','ptgc','ufo','hex','hoa','pdai','atropa','solidx','pusdt','pusdc','communitas']);
  for(const write of VERIFIED_FARM_WRITES) {
    const read=VERIFIED_FARM_READS.find(r=>r.id===write.id);
    for(const key of ['address','runtimeCodeHash','poolId','tokenAddress','decimals'])assert.equal(read[key],write[key]);
  }
});

test('expanded transaction bindings match independent vault and token evidence',()=>{
  const readEvidence = name => JSON.parse(fs.readFileSync(new URL('../evidence/' + name, import.meta.url), 'utf8'));
  const vaults=readEvidence('expanded-farm-vaults.json');
  const tokens=[...readEvidence('expanded-tokens-a.json').tokens,...readEvidence('expanded-tokens-b.json').tokens];
  for(const spec of VERIFIED_FARM_WRITES.slice(3).filter(row=>row.tokenPolicy?.kind!=='variable-transfer')) {
    const vault=vaults.rows.find(r=>r.id===spec.id), token=tokens.find(r=>r.id===spec.id);
    assert.equal(vault.executableMatchesCompiledSource,true,spec.id);
    assert.equal(vault.exactVaultModelCandidate,true,spec.id);
    assert.deepEqual(vault.liveBlockers,[],spec.id);
    for(const key of ['address','tokenAddress','poolId','decimals','runtimeCodeHash','tokenRuntimeCodeHash']) assert.equal(spec[key],vault[key],spec.id+' '+key);
    assert.equal(token.executableMatches??token.build.executableMatches,true,spec.id);
    assert.equal(spec.tokenRuntimeCodeHash,token.runtimeCodeHash??token.runtimeHash);
    assert.equal(spec.verifiedBlock,vaults.block);
    if(spec.id==='pusdt') assert.deepEqual(spec.tokenPolicy,{kind:'usdt'});
    else if(spec.id==='pusdc') {
      assert.equal(token.implementation.build.executableMatches,true);
      assert.deepEqual(spec.tokenPolicy,{kind:'usdc',implementation:{slot:token.implementation.slot,address:token.implementation.address,runtimeCodeHash:token.implementation.runtimeHash}});
    } else assert.equal(spec.tokenPolicy,undefined);
  }
});

test('forked stablecoins and low-decimal-price assets retain actual PulseChain quotes',()=>{
  const pair=(id,usd)=>({chainId:'pulsechain',baseToken:{address:FARM_PRICE_TOKENS[id]},priceUsd:usd,liquidity:{usd:100},pairAddress:'0x'+'1'.repeat(40)});
  const result=selectFarmPrices([pair('pusdc','0.0009537'),pair('communitas','0.000000000005179'),{...pair('pdai','1.0'),chainId:'ethereum'}],100);
  assert.equal(result.pusdc.usd,'0.0009537');
  assert.equal(result.communitas.usd,'0.000000000005179');
  assert.equal(result.pdai,undefined);
});
