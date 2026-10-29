import fs from 'node:fs/promises';
await Promise.all(['reward-boost.js','poolsFarms.js','NFT-allocation.js','senate.js','governorTax.js'].map(async name=>{const r=await fetch('https://oink-pls.github.io/Piggy-Bank-UI/js/'+name,{signal:AbortSignal.timeout(20000)});await fs.writeFile('evidence/original-governance/'+name,await r.text());}));
const p=await(await fetch('https://registry.npmjs.org/@foundry-rs/anvil-win32-amd64/latest',{signal:AbortSignal.timeout(20000)})).json();console.log(JSON.stringify({version:p.version,dist:p.dist,bin:p.bin}));
await fs.writeFile('evidence/anvil-package.json',JSON.stringify(p));
