# Local pre-launch check — September 19, 2026

Status: local code cleanup and automated/static verification complete. Installed-wallet, fresh visual/mobile, and real transaction verification remain outstanding. This is not a public-release sign-off.

No GitHub push, workflow dispatch, deployment, domain change, wallet authorization, signature, or transaction was performed. The existing localhost server at `127.0.0.1:4174` remains running. The temporary asset-check server was closed.

## Changes completed

- Removed the inactive X and YouTube buttons. Official sources provided working Telegram and DEX links but no usable X or YouTube destination.
- Replaced the disabled miner-creation placeholder with navigation to the existing Deploy miners form.
- Clarified public-wallet lookup as read-only and corrected outdated farm, rollover and withdrawal descriptions.
- Added a page error boundary so a failed page-module load/render displays Retry instead of losing the routed interface. Navigation remains outside the boundary.
- Constrained long loading/error text so it wraps inside narrow layouts.
- Added `scripts/check-production-assets.mjs`, a local-only production-file check under `/oink-launch/`.

## Results

| Check | Result and scope |
| --- | --- |
| Full regression suite | 621 passed; zero failures or skipped tests. Providers, RPC responses and transaction sends in these tests are simulated. |
| TypeScript | Passed on the final source. |
| Production build | Passed on the final source; updated `dist/` locally. |
| Production files under repository prefix | All 55 files served byte-for-byte from the local `/oink-launch/` prefix; six local HTML/CSS references resolved. This does not execute JavaScript routes or verify a public host. |
| Wallet and transaction review | 327 focused tests passed for sessions, rejection/cancellation, account/network changes, action arguments, request coordination and receipt handling. Included in the full-suite total. |
| Loading/RPC review | 21 focused tests passed for bounded failures, recovery, account isolation and snapshot/price readiness. Included in the full-suite total. |
| External links | Original documents and tools responded successfully. DEX Screener's page challenged the HTTP client; its API confirmed the configured OINK pair. HTTP app-shell availability does not verify swap execution. |
| Browser/installed wallet | Not completed this pass. Windows browser control stopped because the current Chrome URL could not be identified reliably. No browser input or real wallet operation followed that stop. |
| Mobile | Static layout rules reviewed and long loading-text wrapping corrected. The changed interface still needs a fresh visual check and a real mobile-wallet check. |

## Before publication

1. In the installed browser wallet, verify connect/disconnect/reload, rejection/cancellation, changing accounts and changing networks. Confirm the site keeps the selected account and returns to PulseChain correctly.
2. For any deposit, claim, withdrawal or rollover the owner intends to perform, verify the wallet request, mined receipt, refreshed balances and pending-request recovery. Signing and execution remain user-controlled and were not tested by this pass.
3. Visually check all five pages, updated navigation and error/retry screens on desktop and phone widths, then check injection/connection in an actual mobile wallet browser. The manual loader fixture at `/scripts/qa-page-loaders.html` includes **Simulate page failure**.
4. Choose the final repository/domain and verify the hosted origin only when publication is explicitly authorized. Keep original-tool links for deferred features.

## Evidence

- [Wallet review](evidence/prelaunch-wallet-2026-09-19.md)
- [Loading and recovery review](evidence/prelaunch-loading-2026-09-19.md)
- [Links and wording review](evidence/prelaunch-links-2026-09-19.md)
- [Final regression output](evidence/prelaunch-full-tests-2026-09-19.log)
- [Production-file result](evidence/prelaunch-production-assets-2026-09-19.json)

The log files are local evidence and are excluded by the existing `*.log` ignore rule.
