// Read-only integration check. Never accesses a wallet or submits transactions.
import { registerHooks } from 'node:module';
import { writeFile } from 'node:fs/promises';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const { loadFarmSnapshot } = await import('../src/lib/farmSnapshot.ts');
const { getPublicProvider } = await import('../src/lib/chain.ts');
const started=Date.now();
try {
  const {snapshot,prices}=await loadFarmSnapshot('',AbortSignal.timeout(60000));
  const evidence={checkedAt:new Date().toISOString(),durationMs:Date.now()-started,block:snapshot.block,blockHash:snapshot.blockHash,
    registryPools:snapshot.registry?.pools.length??null,partial:snapshot.registry?.partial??null,discoveryError:snapshot.discoveryError,
    existingFarms:snapshot.rows.filter(row=>!row.discovery).map(row=>({id:row.id,loaded:!!(row.data??row.special),yieldLoaded:!!(row.data??row.special)?.yieldEstimate})),
    discoveredPools:snapshot.rows.filter(row=>row.discovery).map(row=>({id:row.id,address:row.address,poolId:row.discovery.poolId,status:row.discovery.status,allocation:row.discovery.allocPoint,reason:row.discovery.reason,hasWriteSpec:!!row.discovery.writeSpec,loaded:!!row.data,hasPrice:!!prices[row.id]})),
  };
  await writeFile(new URL('../evidence/farm-discovery-live.json',import.meta.url),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify(evidence,null,2));
  if(!snapshot.registry || snapshot.registry.partial) throw Error('Registry discovery incomplete. See evidence.');
} finally {(await getPublicProvider()).destroy();}
