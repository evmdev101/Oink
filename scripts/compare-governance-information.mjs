import fs from 'node:fs/promises';
await fs.mkdir('evidence/original-governance',{recursive:true});
const names=['basic-settings.html','reward-boost.html','pools-farms.html','governor-tax.html','token-burn.html','treasury-deposit.html','voting-credit.html','senate.html','NFT-allocation.html','available-actions.html'];
await Promise.all(names.map(async name=>{const r=await fetch('https://oink-pls.github.io/Piggy-Bank-UI/'+name,{signal:AbortSignal.timeout(20000)});const t=await r.text();await fs.writeFile('evidence/original-governance/'+name,t);console.log(name,r.status,t.length);}));
