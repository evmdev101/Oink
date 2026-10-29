// Public reads only; no wallet, signer or transaction preparation.
import { registerHooks } from "node:module";
import { JsonRpcProvider } from "ethers";
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(specifier + '.ts', context); throw error; }
} });
const { readFarmYield } = await import('../src/lib/farmYield.ts');
const { snapshotRunner } = await import('../src/lib/governanceReadSafety.ts');
const rpc = new JsonRpcProvider('https://rpc.pulsechain.com', 369, { staticNetwork: true });
try {
  if (BigInt(await rpc.send('eth_chainId', [])) !== 369n) throw new Error('Wrong chain');
  const block = await rpc.getBlock('latest');
  const runner = snapshotRunner(rpc, block.number);
  for (const id of ['pls', 'plsx', 'inc']) {
    const result = await readFarmYield(id, runner, rpc, block.number, block.timestamp);
    if (!result) throw new Error('Yield verification unavailable: ' + id);
    console.log(JSON.stringify({ id, block: block.number, ...result }));
  }
  if ((await rpc.getBlock(block.number)).hash !== block.hash) throw new Error('Snapshot changed');
} finally { rpc.destroy(); }
