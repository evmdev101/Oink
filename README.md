# Piggy Bank (OINK)

## Public preview — October 28, 2026

Farm and miner transactions are enabled, including approvals, deposits, withdrawals, claims, transfers, renewals and OINK purchases, subject to their existing contract and wallet checks. Governance actions remain temporarily disabled while that section is completed and tested. The Governance page displays a warning.

`src/config/publicPreview.ts` controls the governance pause. Governance controls are disabled, and both the direct submission flow and transaction-request engine reject governance requests before any wallet interaction. This includes voting credit, votes, proposals, delegation, NFT allocation, Reward Boost governance, Senate credit and donation funding proposals, including equivalent entry points on other pages. Donation helper creation and activation remain available. This restriction does not pause the deployed contracts or other websites. Re-enabling governance requires a deliberate source change and a new deployment.

The sections below describe implemented features and earlier development history; governance transaction features remain unavailable in this public preview.

If a saved request remains unresolved, **Previous request** appears with recovery controls. It can recheck a receipt, attach a missing matching transaction hash, verify a mined replacement using the same nonce, or recover an unsent cancelled wallet prompt after explicit wallet review. No-hash cancellation recovery requires a stale request, no active app request lock and no pending wallet nonce detected. Mined transactions whose detailed effects cannot be verified require the user to review the result before recovery; they are not labeled confirmed. Recovery retains the saved record and never resends a transaction or clears unrelated site data.

## Current implementation — September 19, 2026

OINK is a Vite, React and TypeScript interface for Piggy Bank on PulseChain (chain ID 369). Home, Miners, Farms, Governance and Protocol share wallet selection, themes and page loading that waits for initial data. This build remains local; no website publication or real wallet transaction was performed during this launch pass.

Implemented transaction flows require a fresh review and explicit wallet confirmation:

| Area | Supported actions |
| --- | --- |
| Six OINK time miners | Deposit for yourself or gift a miner; transfer a full position; move a full position into a verified longer-duration pool; roll over a mature full position into the same or a longer available duration with its current bonus; withdraw a full position. |
| Eleven farms: PLS, PLSX, INC, HEX, HOA, pDAI, ATROPA, SolidX, pUSDT, pUSDC and Communis | Deposit, approve/reset token allowance where required, claim rewards, withdraw a full position, or emergency-withdraw principal after funding fees while forfeiting its OINK rewards. Normal claims and withdrawals offer verified wallet or locked-miner reward destinations. |
| Governance | Voting-credit deposits and burns, miner-share conversion, miner votes, delegation and delegated votes. Ten ordinary proposal families support creation, support, opposition, veto and execution. Senate/upgrade records and selected treasury balances/activity remain readable. |
| OINK sale and referrals | Purchase with PLS, PLSX, INC or HEX into a wallet or 1/3/5-year miner. Exact approvals and resets, referral reward claims, and deployment-aware referral links applied to farm deposits. |
| HEX T-shares | Register existing HEX stake shares and read registered shares, pending rewards and payout settings. Current controls prepare registration only; receipt verification remains available for previously saved claim/unregister transactions. |
| Launch distributions | Validate published contributor/reward proofs, allocations, redemptions and funding; claim into a wallet or supported miner. |

pDRIP, EMIT, pTGC and UFO deposits, partial miner operations, HEX-share recalculation, new-pool proposals, Senate administration, treasury requests/grants, Governor replacement execution, NFT mining/allocation and maintenance transactions remain external or deferred. Maintenance availability is read on-chain. Direct original-tool links preserve access, and Home includes Buy OINK. The external tools have their own contracts, availability and wallet permissions; a link does not verify their current transaction behavior.

Miner cards show a compact Penalty row with the maturity and grace dates, just above Actions. After maturity it shows Roll-Over, matching the original site's renewal status; before maturity it shows the verified contract penalty. A mature miner can still acquire a late withdrawal penalty after grace, which is rechecked and shown in the withdrawal dialog. List view uses the same display.

The withdrawal dialog shows the current penalty and estimated return. Withdraw can be clicked while those numbers load; the same click continues to the wallet after the checks finish, without a second review window or checkbox. Closing the dialog before the wallet opens cancels that action. Submitted requests remain tracked after closing the dialog, and duplicate submissions are blocked.

The rollover dialog follows the original duration-selector and bonus-list layout, using each destination's actual bonus rate. Extend My Miner rechecks the displayed selection before opening the wallet and shows the selected duration and bonus while awaiting confirmation. Closing that screen does not cancel a wallet request. Cross-pool renewals verify trust, credit, lock and mandatory-service rules, simulation, and the destination position and bonus receipt.

The original sale contract has no on-chain minimum-output argument or deadline; purchase reviews disclose that quoted output can change before mining. All new write flows persist pending requests, coordinate across tabs with existing miner/farm actions, and verify the mined transaction and expected effects before confirming completion. These checks are not a security audit.

Protocol → Farm recovery contains independent emergency farm recovery. It loads recorded stakes across the eleven supported farms without waiting for dashboard rewards, market prices, distribution or maintenance reads; selecting an emergency exit explicitly forfeits that position's OINK rewards.

Public RPC reads now use bounded requests and endpoint failover while preserving explicit block arguments and chain checks. Wallet session reads and interactive connection requests have timeouts and cancellation; late responses cannot restore an obsolete session. Public RPC failover never signs or broadcasts a transaction. Transaction reviews still check allowlisted runtimes, live dependencies, balances, simulation, account/network identity and receipts.

## Local development

Use Node.js 24 and pnpm 11.7.0, matching the repository workflow.

```sh
pnpm install --frozen-lockfile
pnpm dev          # http://127.0.0.1:4174/
pnpm test         # Node regression suite; fixtures do not send real transactions
pnpm typecheck
pnpm build        # Typecheck and production build into dist/
pnpm preview      # Serve the existing dist/ build at http://127.0.0.1:4174/
```

Run development and preview servers separately because both use port 4174. Rebuild before using preview to inspect changed source. A normal browser with a supported installed wallet is needed for real extension testing; automated wallet fixtures are not a substitute for that check.

## GitHub Pages

The existing [Pages workflow](.github/workflows/deploy-pages.yml) installs dependencies, builds, runs the regression suite and publishes `dist/`. In the configured GitHub repository it runs on pushes to `main` or a manual workflow dispatch. Pages must use **GitHub Actions** as its source.

`HashRouter` handles page routes and Vite uses `base: './'`. App asset URLs use the Vite base so the build can run under a repository path as well as a domain root. Verify the intended hosted path and wallet origin before release. Local build/preview checks do not publish the site; this pass did not run a publication workflow.

## Evidence and remaining checks

The earlier [local pre-launch check](OINK-PRELAUNCH-CHECK-2026-09-19.md) records the final cleanup, 621 passing tests, successful production build and local production-file checks. Installed-wallet, fresh visual/mobile and real transaction checks remain outstanding; nothing was published or pushed.

See [the remaining-updates report](OINK-REMAINING-UPDATES-2026-09-19.md), [the expanded-farm verification and implementation report](OINK-FARM-EXPANSION-2026-09-19.md) and [the September 19 implementation progress](OINK-LAUNCH-PROGRESS-2026-09-19.md) for changes, validation and remaining launch checks. The [launch review](OINK-LAUNCH-REVIEW-2026-09-19.md) records the findings before this implementation pass and is preserved unchanged. Earlier rebuild, migration, transaction-stage and preview documents describe historical development stages; use current source and the latest update report for supported-action status.

Installed-wallet end-to-end behavior, mobile wallet browsers and the final public origin still need verification. The current transaction path supports standard externally owned wallets; smart/delegated-code wallets and WalletConnect/QR connections are not established here.

## Automatic farm discovery and status-panel cleanup

The Farms page now checks the on-chain registry for added pools. New vaults matching reviewed contract templates and existing reviewed assets can appear automatically. Unfamiliar pool types remain visible as awaiting integration; new token models still require explicit integration. Discovery failures do not hide the existing farms. See [the local completion report](OINK-FARM-DISCOVERY-2026-09-19.md).

Persistent transaction-status panels have been removed throughout the site. Receipt verification runs in the background while connected; unresolved requests retain duplicate protection. Nothing was pushed or deployed.
