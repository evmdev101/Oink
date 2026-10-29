# Portfolio expansion verification

- Detailed OINK/farm valuation columns, combined positions panel, HEX share figures.
- Indexed history from api.scan.pulsechain.com with wallet checks, emitter checks, deduplication and explicit coverage limits.
- Cumulative miner deposits/withdrawals and farm/HEX harvest charts; activity category filters and 16-event pagination.
- Live reader probe: 148 events, 22 configured sources, 0 failed requests, 0 capped requests; miner, farm and HEX categories present.
- Explorer CORS allows browser reads.
- All 704 tests passed. TypeScript and production build passed.
- History is indexed activity, not an all-contract wallet ledger. Miner flow charts are not historical portfolio balances. NFT activity and dynamically discovered contracts are not included in history.
- No transactions submitted and no publishing performed.
