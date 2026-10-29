import { getFarmCatalogPublication, replaceDiscoveredFarmSpecs } from "./farmCatalog";
import { discoverFarmPools } from "./farmDiscovery";
import { withFarmReadBudget } from "./farmReadBudget";
import type { FarmReadRpc } from "./farmTransactions";

// Recovery can refresh verified permissions on its own after a reload. It
// never reconstructs usable contracts from browser storage or saved reviews.
export async function refreshDiscoveredFarmCatalog(rpc: FarmReadRpc, signal?: AbortSignal) {
  const started = getFarmCatalogPublication();
  try {
    return await withFarmReadBudget(async child => {
      child.throwIfAborted();
      if (BigInt(await rpc.send("eth_chainId", [])) !== 369n) throw new Error("Farm discovery requires PulseChain.");
      const block = await rpc.send("eth_getBlockByNumber", ["latest", false]);
      if (!block?.number || !/^0x[0-9a-f]{64}$/i.test(block?.hash ?? "") || !block.timestamp) throw new Error("A current registry snapshot is unavailable.");
      const number = Number(BigInt(block.number)), timestamp = Number(BigInt(block.timestamp));
      const now = Date.now();
      if (!Number.isSafeInteger(number) || number < 0 || !Number.isSafeInteger(timestamp) || now - timestamp * 1000 >= 120000 || timestamp * 1000 - now > 30000) throw new Error("The farm registry snapshot is stale.");
      const result = await discoverFarmPools(rpc, { number, hash: block.hash, timestamp }, child);
      child.throwIfAborted();
      if (result.partial) throw new Error("The farm registry could not be fully checked. Existing verified farms remain available; try discovery again.");
      if ((await rpc.send("eth_getBlockByNumber", [block.number, false]))?.hash !== block.hash) throw new Error("The farm registry snapshot changed.");
      child.throwIfAborted();
      if (getFarmCatalogPublication() !== started) throw new Error("The farm catalog was refreshed elsewhere. Use the latest available farms.");
      replaceDiscoveredFarmSpecs(result.discoveries.flatMap(pool => pool.writeSpec ? [pool.writeSpec] : []));
      return result;
    }, signal);
  } catch (error) {
    if (!signal?.aborted && getFarmCatalogPublication() === started) replaceDiscoveredFarmSpecs([]);
    throw error;
  }
}
