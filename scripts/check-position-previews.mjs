// Read-only live checks. No wallet connection, signer or broadcast method.
import { registerHooks } from 'node:module';
import { JsonRpcProvider, Interface } from 'ethers';
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { previewFarmExit, previewMiner } = await import('../src/lib/positionPreviews.ts');
const { VERIFIED_FARM_WRITES } = await import('../src/config/farmWriteVerification.ts');
const { MINER_PREVIEW_SPECS } = await import('../src/config/minerPreviewVerification.ts');
const provider = new JsonRpcProvider('https://rpc.pulsechain.com',369,{staticNetwork:true,batchMaxCount:6});
const permitted = new Set(['eth_chainId','eth_getBlockByNumber','eth_getCode','eth_call','eth_getBalance']);
const rpc = { send(method, args) { if (!permitted.has(method)) throw new Error('Forbidden RPC: '+method); return provider.send(method,args); } };
// Public historical depositor used by the existing preflight script. Not a
// connected wallet, not the user identity, never persisted in the application.
const account = '0x36f88aea238d4a5222c25df9dbf038c21e345677';
const countAbi = new Interface(['function getNrOfStakes(address) view returns(uint256)']);
async function count(address) { return countAbi.decodeFunctionResult('getNrOfStakes',await rpc.send('eth_call',[{to:address,data:countAbi.encodeFunctionData('getNrOfStakes',[account])},'latest']))[0]; }
try {
  for (const spec of VERIFIED_FARM_WRITES) {
    if (!await count(spec.address)) { console.log(spec.id+': no positions in historical test account; skipped'); continue; }
    for (const kind of ['claim','withdraw']) {
      const r = await previewFarmExit(rpc,spec.id,account,0,kind);
      console.log(JSON.stringify({id:spec.id,kind,block:r.block,facts:r.facts,simulation:r.simulation}));
    }
  }
  for (const spec of MINER_PREVIEW_SPECS) {
    const r = await previewMiner(rpc,spec.id,account,{kind:'deploy',amount:'0.001',recipient:account});
    console.log(JSON.stringify({id:spec.id,kind:'deploy',block:r.block,facts:r.facts,simulation:r.simulation}));
    if (await count(spec.address)) {
      const exit = await previewMiner(rpc,spec.id,account,{kind:'withdraw',index:0});
      console.log(JSON.stringify({id:spec.id,kind:'withdraw',block:exit.block,facts:exit.facts,simulation:exit.simulation}));
    }
  }
} finally { provider.destroy(); }
