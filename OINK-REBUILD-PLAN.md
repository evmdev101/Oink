# OINK replacement interface — feature parity plan

## Product direction

Rebuild the original OINK application as its own website, using DEGEN's navigation, compact statistics, miner/farm card grids, category tabs, large forms, and scrollable proposal lists. Keep OINK branding and themes. Reuse presentation patterns only: contract addresses, approvals, units, penalties, roles, and transaction rules must come from OINK.

No new token, contract deployment, protocol restart, migration, or ownership change is part of this website rebuild. DEGEN remains a separate project.

## Delivery sequence and acceptance criteria

Each feature progresses through: source mapping → correct public/account reads → user-facing form → exact calldata and validation → read-only simulation/local-fork effects → explicit transaction activation review. A disabled button or an ABI encoder is not a completed feature.

| Priority | New workspace | Original application routes | Current position / required work |
| --- | --- | --- | --- |
| 1 | Miners | create-miner, view-all-miner, view-miner-card | Six public time-miner cards added. Next: address-based position discovery, balances, maturity, fees and penalties. Then create/gift, withdraw, transfer, hop, rollover, recommit and partial operations. |
| 2 | Farms / ecosystem vaults | pulse-ecosystem-mining, view-pulse-ecosystem-miners | Seventeen listed contracts only. Verify each deposit asset/decimals/native PLS path, allocation and reward data. Build DEGEN-style cards and position management. Do not invent APR. |
| 3 | Governance | basic-settings, reward-boost, pools-farms, add-token, governor-tax, token-burn, treasury | Complete registry reads for the mapped ordinary/treasury arrays; blocked encoders. Finish typed forms, eligibility and outcome tests. Treasury approval can close a rejected proposal without transferring funds. |
| 4 | Miner voting and Senate | miner-voting, senate, delegate-vote, propose-upgrade | Public reads and blocked encoders. Finish connected/address-based state, candidate discovery and per-action checks. Never assume an off-chain nomination list is registered membership. |
| 5 | Voting credit | voting-credit | Public balance exists for previously connected wallets. Implement deposit, burn and stake-to-credit paths with clear irreversible effects and distinct units. |
| 6 | Treasury / protocol tools | treasury-deposit, issue-miner, available-actions, latest-actions | Map deposit, grant/issue miner, buybacks, harvest/rebalance/maintenance and event history. Show caller restrictions and exact effects; do not expose owner-only calls as public actions. |
| 7 | Referrals | referral | Verify current referral contract against Governor wiring and the original UI; historical listings differ. Add read-only balances, links and eligibility before any claim action. |
| 8 | NFT-related features | NFT-allocation | OINK's NFT allocation/mining modules are not DEGEN's NFT sale. Map actual supported user workflows and candidate discovery before adding NFT navigation. |
| 9 | Claims / sale | claim, pig-offering | Determine whether each deployed route remains active or historical, with dates/eligibility read from contracts. No obsolete sale presented as open. |
| 10 | Home / dashboard | index | Complete supply, treasury inflows, locked/liquid figures and mining data. Verify every APR formula and price source; show timestamps and unavailable states. |

Navigation direction: Home, Miners, Farms, Governance, Protocol. Add additional navigation only when the underlying OINK feature warrants it. The current combined Mining page remains until ecosystem cards are ready; avoid creating empty navigation destinations.

## Current implementation boundaries

### Selected wallet transactions — 2026-09-11

PLS, PLSX and INC vault deposits, exact token approvals and allowance resets are enabled after independent vault/token executable-bytecode matching, fresh read-only preflight, an explicit review and user wallet confirmation. This is not full transaction parity. Claims, withdrawals, the other vaults, time-miner management and governance remain disabled. Persistent request recovery and same-origin cross-tab locking prevent an unresolved request from being silently forgotten on card navigation. See [transaction-stage evidence, risks and test limits](OINK-TRANSACTION-STAGE.md). No actual transaction, ownership change, deployment or publication was performed. Earlier read-only stage notes below remain historical.

### Account and farms update — 2026-09-07

- Added `/farms` and separate Miners/Farms navigation. Ecosystem cards read deposit-token metadata, vault-held asset balances, deposit/funding fees, pool IDs, and gross OINK reward accounting at one block. Native PLS is read separately. HEX T-Share explicitly remains unsupported until its specialized accounting is verified; failed token metadata/getters are not shown as zero.
- Added public-address lookup for all six time miners: every position index (maximum 1,000 per pool), shares, gross accounting value, nominal maturity, grace end and mandatory-lock end. Contract failures are reported per pool. No wallet connection or signer is requested.
- Added public-address lookup for supported ecosystem vaults: position indexes, recorded deposits, fees paid and gross pending OINK. Missing reads are distinguished from an empty position list. These are not executable withdrawal/harvest quotes.
- Position windows respect the mandatory-lock strict timestamp check and the early/maturity/grace boundaries. Numeric accounting uses bigint before formatting. Penalty amounts, APR and after-fee payout guarantees are deliberately not invented.
- Built and checked the live Farms route. Automated suite now includes 71 tests across governance and mining math. Account lookup still needs positive-wallet end-to-end fixtures and per-action fork simulations before enabling management transactions.
- Remaining work is substantial: action forms and effect validation, HEX T-Share accounting, referrals, voting-credit custody, protocol maintenance, NFT-allocation and claims/sale verification. This update does not complete the entire replacement site.

- Governance has fixed-block reads, full mapped proposal-array discovery, pagination, Senate reads, upgrade discovery, and disabled transaction preparation.
- The six time-miner cards read totalShares, getPricePerFullShare, and callFee at one block; shares use 18-decimal accounting and call fee uses raw/100 percent, consistent with the existing OINK governance read model. Pool shares are not wallet balances. Share price is not APR or a promised exit value.
- Miner-card failures are explicit per contract. Snapshot age, manual refresh, automatic refresh, and reorganization checks are included.
- Mining management and ecosystem vault transactions remain disabled. Personal position discovery is provided by the new address-lookup components, not the public time-miner cards.
- Writes remain disabled. No wallet connection, transaction, deployment or publication is performed by this stage.

## Original source inventory

Reviewed original application repository route tree on 2026-09-07:
[OINK application source](https://github.com/OINK-pls/Piggy-Bank-UI),
[OINK contracts](https://github.com/OINK-pls/PiggyBank).

Original `.html` routes are grouped above; `sidebar.html` is shared navigation. Keep `OINK-FEATURE-CONTRACT-MAP.md` for addresses/provenance and `OINK-GOVERNANCE-COVERAGE.md` for governance implementation details. Neither repository source nor an original UI button alone proves deployed behavior.
