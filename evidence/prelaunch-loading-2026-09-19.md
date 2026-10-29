# Local pre-launch loading review — 2026-09-19

Scope: routed Home, Miners, Farms, Governance and Protocol initial loading, read-only RPC failure handling, recovery controls and static mobile CSS review. No deployment, external writes, signing or real wallet transactions were performed.

## Changes

- Added a React error boundary around the page loading/content subtree in `src/components/PageLoadBoundary.tsx`. A rejected lazy page import or child rendering error now shows a reload/retry message. The header and route navigation remain outside this boundary. Reload fetches the current entry document instead of repeatedly using a rejected cached lazy import.
- Constrained loading content to its container and allowed long error text/labels to wrap in the loading-screen rules in `src/styles.css`.
- Extended `scripts/qa-page-loaders.tsx` with **Simulate page failure**. It throws from a routed child while leaving the fixture header outside the boundary; switching page resets the failure. This is manual fixture coverage, not a claim that a browser run passed during this review.

## Initial-read behavior checked in code

| Surface | Deadline and failure behavior |
| --- | --- |
| Home | Public supply/treasury read has a 45-second deadline, shows failure plus Retry, and retries automatically after 60 seconds. A later refresh failure retains the last successful snapshot and labels it. |
| My miners | Position read has a 60-second deadline. Missing pool/account reads do not qualify as complete; errors expose Retry. Disconnecting does not require position reads. |
| Deploy miners / miner contracts | Miner rates and wallet balances use bounded 60-second reads. Missing values remain unavailable, with retry. |
| OINK sale / referral | Initial reads have 60-second deadlines and retry; referral does not require account reads when disconnected. |
| Farms | Combined snapshot load is bounded at 60 seconds. Market HTTP reads have a 12-second abort. Completion requires all 17 farm rows and required fresh valuations; wallet values must belong to the current account. A failure exposes Retry and an independent emergency recovery route and is retried after 5 seconds. |
| Governance | Initial aggregate read is capped at 120 seconds and has abort/retry handling; later failure retains the prior snapshot with its age/error status. |
| Protocol guides / FAQ / contracts / audits / risks | Static sections have no chain-read prerequisite and are revealed after registration. |
| Protocol treasury | Holdings and activity each have a 45-second deadline and retry. Partial results do not silently count as complete. |
| Protocol tools | Distribution and maintenance reads have 60-second deadlines with retry. |
| Protocol farm recovery | Independent of the farm dashboard and prices; requested position reads have a 45-second deadline and generation/account guards. |

`PageLoadBoundary` keeps data components mounted while their content is hidden, avoiding a loader/read deadlock. It retains visible content after first successful load during background refresh. Its route/account key resets initial readiness for a new view. Initial errors remain visible with retry rather than inventing zero values.

## Verification completed

Commands completed successfully after the changes:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --pretty false
node --test scripts/test-public-rpc.mjs scripts/test-farm-loading.mjs scripts/test-farm-prices.mjs
```

Result: TypeScript check passed; **21 tests passed**.

Tests cover bounded hung-endpoint recovery, all-endpoint outage followed by recovery, wrong-chain rejection, malformed responses, concurrent batch IDs, cancellation, preserving historical block/calldata, separating contract reverts from network failures, prohibiting sends/signing through public RPC, rejecting incomplete/stale farm snapshots, account isolation, and rejecting stale/wrong-token/wrong-chain prices.

## Remaining limits and manual verification

- Browser automation was not used for this review. The new render-error fixture and mobile wrapping changes require a later visual pass. Full production build and broader tests are coordinated separately by the parent task.
- A persistent required price outage intentionally keeps the complete Farms view in its error/retry state. This follows the existing requirement that values be loaded before the loader dismisses. Emergency recovery remains independently reachable.
- Public RPC uses three endpoints with an 8-second per-endpoint deadline. Aggregate page deadlines provide the outer bound for multi-stage reads. These checks cannot guarantee external service availability.
- Static CSS inspection found bounded horizontal table wrappers for miner/governance data, wrapped token addresses and responsive farm grids. No page-wide CSS redesign was made. Long loading errors were the concrete wrapping issue addressed here.
- Wallet restoration/readiness is reviewed separately; no wallet code was changed.
- The boundary covers routed child failures after the entry bundle loads. It cannot recover a failure to download the initial HTML/main JavaScript itself.
