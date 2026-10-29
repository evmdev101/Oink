# Pool and wallet follow-up

## Pool review

Read-only verified-source API review and fixed-block public RPC reads. Live block: 27588834. All four contracts identify as NFTVault, use ERC-1155 mining units, and expose two reward streams (OINK and DEGEN). This is a feature assessment, not a complete runtime/security verification for enabling writes.

| Pool | OINK allocation points | Reported total NFTs |
| --- | ---: | ---: |
| 24 | 0 | 1 |
| 25 | 0 | 224 |
| 26 | 0 | 225 |
| 27 | 3503 | 658 |

Pool 27 is the highest-priority integration candidate because it currently has OINK allocation. Pools 24-26 have zero OINK allocation, but existing NFTs and potential reward credits mean they should remain visible. Zero allocation does not prove there are no claimable rewards or no DEGEN rewards.

An NFT integration needs balances/counts, both reward estimates, payout settings and fee handling, reviewed claim destinations, and separate mint-contract handling. The vault burn method is restricted to its mint contract; normal farm deposit/withdraw controls cannot be reused. Pool 27 also exposes migration/settings controls. No NFT transaction actions were enabled by this review.

Evidence: evidence/new-pool-source-review.json and evidence/new-pool-live-review.json. Reproduce via scripts/review-new-pools.mjs then scripts/check-new-pool-details.mjs. Both scripts use public read-only requests.

## UI and wallet checks

Added a compact Farms last-updated time based on the displayed blockchain snapshot, with refreshing/update-delayed text. Failed refreshes do not advance the displayed timestamp.

At a 390px viewport, Home, Miners (disconnected), Farms, and Protocol had no document-level horizontal overflow. Primary navigation scrolls within its own row. The mobile wallet picker fits and correctly reports zero detected wallets in the in-app preview; no default account is displayed. Governance also completed its live snapshot (block 27,588,839), showing 412 scanned ordinary proposals, with no document-level overflow. Its initial load was noticeably slower than other routes. All five main route layouts were checked while disconnected; connected-account dialogs and every subsection are not covered by this pass. The temporary viewport override was reset.

34 focused wallet/session/preference/discovery and receipt-monitor tests passed. TypeScript, production build, and static production asset checks passed. Existing automated tests simulate wallet providers; they do not verify an installed extension.

The available browser is the in-app preview and has no wallet extension. Actual account switching, network switching, wallet rejection and completed transaction testing remain outstanding in the user's installed-wallet browser. No account permission, signature or transaction was requested. Nothing was pushed or deployed.
