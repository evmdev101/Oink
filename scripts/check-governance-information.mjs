import {registerHooks} from 'node:module';
import fs from 'node:fs/promises';
registerHooks({resolve(s,c,n){try{return n(s,c)}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e}}});
const {readGovernanceMetrics}=await import('../src/lib/governanceMetrics.ts');
const {readGovernanceCandidates}=await import('../src/lib/governanceDiscovery.ts');
const {getPublicProvider}=await import('../src/lib/chain.ts');
try {const results=await Promise.allSettled([readGovernanceMetrics(),readGovernanceCandidates('nft'),readGovernanceCandidates('senate')]);const output=results.map((r,i)=>({kind:['metrics','nft','senate'][i],...(r.status==='fulfilled'?{data:r.value}:{error:String(r.reason)})}));console.log(JSON.stringify(output,null,2));await fs.writeFile('evidence/governance-information-live.json',JSON.stringify(output,null,2));if(results.some(r=>r.status==='rejected'))process.exitCode=1;} finally {(await getPublicProvider()).destroy();}
