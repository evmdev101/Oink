# OINK interface update — 2026-09-12

This file supersedes the earlier deposit-only / position-preview stage notes for the routes below. No production deployment or real transaction was performed.

## Implemented

- Six OINK time miners: self/gift deployment, full-position wallet transfer, trusted longer-duration hop, and full withdrawal. Existing compact Actions menus are retained. Every send requires live review, explicit consent and wallet confirmation.
- PLS, PLSX and INC farms: single-position claim and full withdrawal to the wallet or a supported OINK time miner. Reviews separate gross rewards, actual destination payout, Governor share, principal funding deduction, nominal duration and mandatory service.
- Transaction preparation checks pinned runtime code, current wiring, registrations, amounts, position tuples, locks, migration targets, trusted routes, simulations, gas and native balance. Final confirmation rechecks wallet account/network/session, review age and transaction terms. No automatic send retry.
- Persistent account-scoped transaction status, cross-tab wallet locks, reload recovery and canonical receipt/action-event checks. Existing deposit/approval controls share the same wallet lock and refuse new writes while a position request is unresolved.
- Miner gross values can tick between blockchain snapshots using current emissions and shares. They are explicitly estimated, capped at 60 seconds, and suppressed for stale data. Exit penalty percentages are modeled from source-matched miner rules at the snapshot. Deployment APR is current emissions annualized without compounding or fees.
- Sale inventory and contract quotes for PLS/PLSX/INC/HEX and OINK durations. No DEGEN discounts copied.
- Referral links use the original OINK numeric-base58 encoding. Reads deduct both current and legacy redemptions, apply current Governor referral bonus and source-vault payout/service settings, and check reward-contract funding. Points are not labeled liquid OINK.
- Protocol → Treasury & activity: PLS, OINK, PLSX, INC and HEX balances for the treasury wallet, Governor, treasury locked-miner address and NFT wallet. Missing reads remain unavailable. A paged 1,000-block feed decodes miner events, supported-farm claim/withdraw events and nonzero OINK flows involving these accounts. Links open source receipts. Home links to this view.
- Updated FAQ and removed stale preview-only wording and the obsolete disabled deployment form in Miner contracts.

## Verification

`scripts/verify-miner-builds.mjs` fetched explorer-published source and independently compiled all six time miners using official solc `0.8.20+commit.a1b79de6`, optimizer 200. Executable runtimes matched at block **27528508**, hash `0xe360eb551ba26a96b2eba743088296a801327aa7d82744888c6dc5c895ed8093`. Compiler-declared immutable slots and metadata are excluded from the compilation comparison; complete live runtime hashes remain pinned, and constructor-linked wiring is rechecked in transaction reviews. This comparison is not an audit.

`scripts/check-updates.mjs` only permits read/simulation RPC methods. It uses a previously identified public historical depositor, never the user's wallet or an injected browser account. At blocks 27528566–27528573 it successfully prepared six miner self-deployments and wallet-destination claims/withdrawals for all three farms, including gas estimates. One-month and five-year farm destination simulations also passed. Sale, referral, treasury and decoded-activity reads returned live data. No real sender, private key or wallet signing API is used by this script.

Regression: existing 149 tests plus 36 new transaction/live-display tests (185 total). New tests use a recording mock, including wallet sends; they never broadcast. Coverage includes exact calls, recipient handling, full-position actions, inactive/untrusted destinations, mandatory locks, wallet/session changes, expiry, failed simulation, changed terms, gas reserves, persistent recovery, receipt identity/canonicality for all seven action event types, referral encoding and bounded tick estimates. TypeScript and Vite build checks pass. Browser checks covered disconnected miners, live deployment APR, sale quote input/result, referral empty state, treasury balances and decoded activity. Real-wallet signing and real-fund end-to-end execution have **not** been tested.

## Boundaries retained

- Sale purchases and referral claims still use the original OINK interface. Local screens provide live reads/quotes, not these write flows.
- Other ecosystem farms, batch claims, partial miner actions, recommit/rollover and governance/maintenance writes are not enabled by this update.
- Farm USD/APR price inputs remain manually supplied. No live-price feed or guaranteed APY is claimed.
- Treasury holdings are a named-asset/account subset, not total protocol reserves; locked positions, NFTs, LP positions and other tokens are not valued. Activity is scoped, not a full indexer.
- The original index-based contracts do not enforce a UI-specific minimum output or deadline. Fresh checks cannot eliminate changes while mining or concurrent operations in another interface. The review explicitly states this. Avoid changing a position elsewhere while a request is pending.
- Only standard externally owned sender wallets are supported in these position transaction reviews. No approval is required for the inspected miner burn/share route; farm approvals remain exact-amount and separate.
