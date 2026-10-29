# Independent maintenance review — 2026-10-24

Compared `src/lib/communityMaintenanceActions.ts` and the status UI against the exact sources in `evidence/community-maintenance/`, `evidence/access-chef.sol`, `evidence/access-governor.sol`, and `evidence/ordinary-governance/farms.sol`. Read-only live evidence is in `community-maintenance-live.json`; deployment recompilation and wiring evidence is in `community-maintenance.json`. No wallet or transaction was used in this review.

Verified source semantics:

- Buyback uses exact-output router calls. Its native PLS spending branch only applies MAX_SWAP when the daily-limit branch is entered; its separate output quote always caps the quoted input at MAX_SWAP. The adapter preserves this deployed behavior instead of assuming a simpler universal cap.
- Token conversion ignores the supplied amount argument in the deployed implementation and uses the buyback contract's complete live token balance as maximum input. The review makes this visible.
- PulseX harvest forwards all INC held by the protocol farmer to its pinned buyback contract.
- Governor harvest rebalances all six time-miner reward weights, without withdrawing wallet positions.
- The weekly ecosystem maximum decreases by 1% of its current integer value, not one percentage point. Applying the maximum and assigning MasterChef weights are separate calls. Allocation scaling and MasterChef weighting use the same integer rounding as source.
- Funding fees accrue in whole hours from the later of the position's action time and the vault's funding-change time, capped at 20% of nominal position principal per collection. Updating the funding rate resets the charge window, so reviews tell users to collect existing fees first.
- The current MasterChef provides `fairMintSenate`, not the old original UI's `harvestForSenate`. It allocates mining credit directly to members. `publishTokens` always spends the caller's credit; publication to the Senate does not spend Senate-owned credit.
- Core, module, vault, router, wrapped-token, pair and destination identities are pinned and checked before review. Generic receipt checks require the reviewed sender, target, calldata, value and canonical successful receipt; module checks inspect relevant events and resulting state. A mismatched outcome remains uncertain, rather than reporting a false success.

Issues found and corrected during review:

1. EMIT fee deduction must be labelled nominal, since token fees may reduce the treasury's actual receipt. The adapter now states this limitation explicitly.
2. Allocation review facts initially truncated fractional percentages. They now preserve the on-chain basis-point precision.
3. Empty Senate membership must block fair-mint distribution. The deployed call would otherwise advance the accrual marker while rewarding nobody. The adapter and readiness checks now reject this case; the current live snapshot has no Senate members.

Remaining explicit integration limits:

- PDRIP's implementation is not publicly source-verified. Its local fee collection remains disabled and the UI exposes the published original action page.
- EMIT fee collection is a reviewed nominal-deduction path; it does not authorize EMIT user deposits or pretend its token has standard transfer accounting.
- Taxed/reflection-token deposit integrations and PDRIP still require their own reviewed models. Public balances remain readable, with token-specific explanations and original action links.
- Conservative post-receipt state comparisons may report uncertainty when another valid transaction changes relevant state in the same block. They must never encourage resubmission of a mined action.

Final verification: the shared TypeScript check passed; all 979 tests passed in `full-site-parity-tests-2026-10-24.log`; all 50 maintenance tests passed in `community-maintenance-tests.log`; the production build passed in `full-site-parity-build-2026-10-24.log`. These checks are source/model and build verification, not wallet transactions.
