# Tab loading verification

Local changes only, 2026-09-20.

- Route code warms after initial paint; navigation intent and a sequential background pass warm shared display reads.
- Display cache retains last-known values for up to 30 minutes. Freshness TTLs and transaction preflight remain independent.
- Farms publishes canonical, per-card progress independently of prices and optional discovery; Miners publishes duration positions before optional yields.
- Governance reads base + selected section; its initial ordinary page does not scan treasury/upgrades.
- Snapshot getter aggregation pins every call to one block, verifies Multicall runtime, preserves explicit callers/overrides on direct reads, bounds batches to 40, and falls back at the same block.

## Live read-only measurements

These are one-run measurements, not guaranteed network timings.

- Same 100 treasury getters: individual calls 10,872 ms / 100 eth_calls; Multicall 923 ms / 3 eth_calls. Exact returned data matched at block 27,597,120.
- Governance cold base 2.680 s; ordinary Pool allocation category including 264 records 3.949 s; cached read 0 ms.
- Farms cold first populated row 2.944 s; all 17 configured farms 4.941 s; registry completion 6.779 s; cached load 0.136 ms.
- Browser navigation checks: Governance 480 ms, Farms 726 ms, Miners 203 ms including automation wait overhead. Farms and Governance values visible from cache during background refresh. Miners public contract values and six deployment APRs verified; wallet disconnected for browser checks.

## Validation

- 735 tests passed.
- TypeScript and Vite production build passed.
- Static asset verification passed (81 files).
- Browser hot-update context error during editing cleared on reload; subsequent navigation checks succeeded.
