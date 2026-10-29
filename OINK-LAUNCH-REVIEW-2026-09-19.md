# OINK launch and feature review — September 19, 2026

The current site has the main navigation, live data, six time-miner durations and working transaction flows for a limited set of actions. It can become a useful public interface without reproducing every old page. It does not yet replace all of the old application's main user actions.

Recommended approach: finish launch reliability and access first, expand the core mining actions next, and retain direct links to advanced tools until those workflows are implemented here.

## What was checked

- Inspected the [original live application](https://oink-pls.github.io/Piggy-Bank-UI/), including its dashboard, sale and referral pages.
- Compared the original application's page inventory and action handlers with the current routed React components and transaction code. A displayed contract, draft form or preview was not counted as a working transaction.
- Verified the original [repository](https://github.com/OINK-pls/Piggy-Bank-UI) still has main commit `e3500c8c81c3684556aa6c1a9679a2c7dd069428` using a fresh remote lookup.
- Typecheck and production build passed. All 241 existing tests passed.
- Verification covers source, read-only browsing, build and automated fixtures. Installed-wallet transactions, real mobile devices and the final hosted origin still need end-to-end verification.

Older README and migration documents describe earlier development stages. This report uses current code for implementation status.

## Main user features

| Feature | Current site | What matters before replacing the old interface |
| --- | --- | --- |
| Connect wallet | Browser-wallet picker, provider-specific connection, account/network changes and remembered sessions | Verify actual extensions and mobile wallet browsers. Ordinary mobile browsers have no WalletConnect/QR/deep-link connection path. Transaction preparation also rejects accounts with contract/delegated code; smart-wallet support is not established. Bound remembered-session reads so a hung wallet cannot leave the page loading. |
| Get OINK | Live sale inventory/quotes; external old-sale link | Add an obvious Buy OINK/swap entry. A swap URL exists in configuration but is only rendered by an unrouted old component. Sale purchasing remains on the old application. |
| Create time miners | Six durations, own-wallet deployment and gifting, with live review and wallet confirmation | Core flow is implemented. Complete final connected-wallet validation. |
| Manage time miners | Position views, growth estimates, full withdrawal, full transfer and full upgrade to a longer duration | Add renewal/rollover/recommit. Partial withdrawals, partial transfers and partial upgrades are also missing; these can follow renewal if old access remains obvious. |
| Farms | Seventeen listed vault/role records with balances, rewards, prices and rankings | Only PLS, PLSX and INC allow deposits, claims and full withdrawals here. Other ordinary assets and HEX T-Share management need verified actions or direct old-interface handoffs. A visible card does not mean its actions work. |
| Claim farm rewards | Individual PLS/PLSX/INC claims, including reward-destination selection | Expand supported assets. Claim all is disabled; batch convenience can wait while individual claims are available. |
| Emergency farm withdrawal | No emergency withdrawal flow, including on the three supported farms | The old interface offers an emergency principal-recovery path when normal reward-settling withdrawal fails, forfeiting rewards. Preserve access to that old route and verify an equivalent new flow before full replacement. |
| Referrals | Referral link, balances, payout estimates and a link to the original claim page | Native claims are missing. Newly created referrals are not applied by local deposits: deposits pass the zero address and preserve any existing on-chain referral. Generated links still point to oink-pls.com. |
| Governance | Live settings, proposal/history reads, voting power, delegates, Senate and upgrade information | All governance sends remain disabled. Core replacement needs voting-credit management, ordinary proposal creation/voting/execution, miner voting and delegation. Local draft forms do not submit proposals. |
| Treasury | Selected token balances across four protocol accounts and a decoded activity feed | Useful coverage, but not complete treasury valuation/inflows: locked positions, LP/NFT holdings, some tokens and native PLS activity are excluded. Full analytics can follow launch. |
| NFT mining | Contract references | The old UI already links to an external OINK+DEGEN NFT miner. Restore that entry point; a new native NFT implementation is not required just to preserve access. |
| Distribution claims | No eligibility/proof/claim workflow | Keep access to the old claim page until current distribution availability is checked. Treat separately from farm and referral rewards; do not assume old distributions remain active or are obsolete. |
| Maintenance and advanced governance | Mostly references or read views | Preserve direct links for community maintenance, Senate, treasury requests/grants, governor upgrades and NFT allocation. These can be implemented later; maintenance is not necessarily administrator-only. |

The largest functional gaps are broader farm support and recovery, miner renewal, and governance participation. Sale and referral handoffs already preserve some access; other unsupported areas need equally clear links. The old eHEX button is not evidence of a separate supported eHEX vault, and the treasury miner is a protocol stream rather than an ordinary public-deposit farm.

## Existing improvements to retain

- Farm search/filtering, favourites, rankings and wallet summaries.
- Clearer miner cards, maturity/lock progress and reward projections.
- Per-page loading tied to actual initial data, retry states and fresh-value checks.
- Transaction reviews with exact amounts, fees, destinations, contract checks, wallet confirmation and receipt handling.
- Consolidated guides, contract references, audit links and risk explanations.

## Launch fixes

1. **Make local assets work at the final URL.** `vite.config.ts` sets `base: './'`, but JSX still produces `/img/...` URLs in Home, Farms, footer and other UI assets. Production bundles retain them. These resolve at the domain root and break under a GitHub Pages repository subpath. Use base-aware asset URLs and test the actual hosting prefix. Root-domain hosting avoids this specific path issue.
2. **Make RPC retries recover.** `getPublicProvider()` permanently returns the first cached provider. After that endpoint fails, page retries keep using it rather than selecting another RPC. Add bounded requests and endpoint reselection while preserving chain/block checks.
3. **Finish wallet recovery and compatibility checks.** Saved-session `eth_accounts`/`eth_chainId` reads have no timeout. The current Cancel connection control provides manual recovery. Add a deadline and verify connect, cancel, reject, reload, account switch, network switch, transaction review and receipt recovery with supported real wallets. Decide whether ordinary mobile browsers require WalletConnect or clear wallet-browser entry instructions.
4. **Make unsupported features easy to reach.** Add Buy OINK, direct legacy governance/maintenance/claim links and the external NFT link where users need them. Broad links buried in Resources are not an adequate substitute for disabled action buttons.
5. **Finish public-site wording and deployment checks.** Some text still says “local interface”, “read-only” or “local preview”. X and YouTube icons lack destinations. Update wording to accurately describe ownership and supported actions, remove unused social buttons or provide verified URLs, and add the existing test suite to deployment CI.

The GitHub Pages build/deployment workflow already exists. A successful local build is not verification of the final public URL, wallet-origin permissions, mobile behavior or deployed transaction flows.

The full-data Farms loader intentionally waits for all required farm reads and market prices. This matches the requested loading behavior, but a missing price can block the whole initial page. Reliability work should improve recovery without silently inventing or zeroing missing values.

## Features that can wait

Full supply/allocation charts, miner-duration distribution, detailed treasury valuation, batch claim convenience, custom extra service periods for gifted miners, duplicate old list/card layouts, historical marketing sections and embedded advanced governance tools are not required for a useful first release. Retain old-site access for any deferred feature that manages existing funds or protocol operations.

For a first public version, prioritize launch fixes, Buy OINK, clear supported-action labels and direct handoffs. For a primary replacement, finish broader farm actions and emergency withdrawal, miner renewal and core governance before retiring the old interface.

## Evidence map

| Area | Current implementation evidence | Original reference |
| --- | --- | --- |
| Active routes / Buy OINK | `src/App.tsx`, `src/pages/DashboardPage.tsx`, `src/config/links.ts`, unrouted `src/pages/HomePage.tsx` | [Old navigation](https://github.com/OINK-pls/Piggy-Bank-UI/blob/main/sidebar.html) |
| Miner actions | `src/components/DeployMiners.tsx`, `src/components/MinerActions.tsx`, `src/lib/positionPreviews.ts`, `src/lib/positionTransactions.ts` | [Create miners](https://oink-pls.github.io/Piggy-Bank-UI/create-miner.html), [manage miners](https://oink-pls.github.io/Piggy-Bank-UI/view-all-miner.html) |
| Farm write coverage | `src/config/farmWriteVerification.ts`, `src/components/FarmDepositActions.tsx`, `src/components/PositionActionPreview.tsx` | [Asset mining](https://oink-pls.github.io/Piggy-Bank-UI/pulse-ecosystem-mining.html), [positions](https://oink-pls.github.io/Piggy-Bank-UI/view-pulse-ecosystem-miners.html) |
| Sale / referral | `src/components/MiningOffers.tsx`, `src/lib/miningOffers.ts`, `src/lib/farmTransactions.ts:145` | [Sale](https://oink-pls.github.io/Piggy-Bank-UI/pig-offering.html), [referrals](https://oink-pls.github.io/Piggy-Bank-UI/referral.html) |
| Governance | `src/pages/GovernancePage.tsx:43`, `src/lib/governanceTransactions.ts`, `src/lib/ordinaryGovernanceCalls.ts` | [Voting credit](https://oink-pls.github.io/Piggy-Bank-UI/voting-credit.html), [miner voting](https://oink-pls.github.io/Piggy-Bank-UI/miner-voting.html), [delegation](https://oink-pls.github.io/Piggy-Bank-UI/delegate-vote.html) |
| Advanced access | `src/pages/GovernancePage.tsx`, `src/pages/ProtocolPage.tsx`, `src/config/contracts.ts` | [Maintenance](https://oink-pls.github.io/Piggy-Bank-UI/available-actions.html), [NFT miner](https://degenstrategy.github.io/NFT-miner/), [distribution claims](https://oink-pls.github.io/Piggy-Bank-UI/claim.html) |
| Dashboard | `src/components/HomeSnapshot.tsx`, `src/components/TreasuryActivity.tsx` | [Original dashboard](https://oink-pls.github.io/Piggy-Bank-UI/) |
| Hosting / resilience | `vite.config.ts`, `.github/workflows/deploy-pages.yml`, `src/lib/chain.ts:13`, `src/lib/walletSession.ts:120`, `src/lib/farmSnapshot.ts` | Production bundle inspection and current source |

Checks run: TypeScript compiler with `tsconfig.app.json`; Vite production build; Node test runner over every `scripts/test-*.mjs` file (241 passed).
