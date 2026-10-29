import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) {
  if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) {
    try { return next(specifier + '.ts', context); } catch { /* Normal resolution below. */ }
  }
  return next(specifier, context);
} });
const { getPublicProvider } = await import('../src/lib/chain.ts');
const { readTimeMinerSummary, readPublicMinerYields, peekTimeMinerSummary } = await import('../src/lib/minerDisplayReads.ts');
const rpc = await getPublicProvider();
let calls = 0;
const call = rpc.call.bind(rpc);
rpc.call = async tx => { calls++; return call(tx); };
try {
  const start = performance.now();
  const [summary, yields] = await Promise.all([readTimeMinerSummary(), readPublicMinerYields()]);
  const coldMs = Math.round(performance.now() - start);
  const coldCalls = calls;
  const peekAt = performance.now();
  const cached = peekTimeMinerSummary();
  const peekMs = performance.now() - peekAt;
  const revisitAt = performance.now();
  const [warmSummary, warmYields] = await Promise.all([readTimeMinerSummary(), readPublicMinerYields()]);
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), publicReadOnly: true, block: summary.block,
    coldMs, coldContractCalls: coldCalls, cachedPeekMs: Number(peekMs.toFixed(3)),
    revisitMs: Number((performance.now() - revisitAt).toFixed(3)), revisitContractCalls: calls - coldCalls,
    summaryRows: summary.rows.filter(Boolean).length, yieldRows: Object.values(yields.yields).filter(Boolean).length,
    reusedSameValues: cached === summary && warmSummary === summary && warmYields === yields,
  }, null, 2));
} finally { rpc.destroy(); }
