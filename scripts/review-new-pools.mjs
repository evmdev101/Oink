import {readFile,writeFile} from 'node:fs/promises';
const pools=JSON.parse(await readFile('evidence/farm-discovery-live.json')).discoveredPools;
const results=[];
for(const pool of pools){const url='https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address='+pool.address;const data=await (await fetch(url,{signal:AbortSignal.timeout(30000)})).json();const s=data.result?.[0];results.push({...pool,sourceUrl:url,contractName:s?.ContractName,abi:s?.ABI,source:s?.SourceCode});}
await writeFile('evidence/new-pool-source-review.json',JSON.stringify(results,null,2));
console.log(results.map(x=>({pool:x.poolId,name:x.contractName,functions:JSON.parse(x.abi||'[]').filter(f=>f.type==='function').map(f=>f.name)})));
