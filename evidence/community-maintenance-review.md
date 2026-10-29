# Community maintenance verification — 2026-10-24

The adapter uses the shared exact-transaction review, simulation, gas budget,
fresh preflight, canonical block and receipt pipeline. No wallet was connected,
no transaction was broadcast, and no on-chain writes were performed by this work.

## Source and runtime authority

The original public `available-actions.html` and its decoded script were used to
inventory controls. The original script is evidence, not execution authority.
For new helpers, `scripts/verify-community-maintenance.mjs` downloaded explorer
verified source, compiled it with the exact compiler and optimizer settings,
compared executable runtime after masking compiler-reported immutable locations
and Solidity metadata, and pinned the full unmodified runtime hash. It verified
the buyback helper and PulseX farmer. See `community-maintenance.json` for source
hashes, ABIs, compiler versions, runtime hashes and canonical snapshot.

Every review rechecks pinned core/module/helper/dependency runtime and current
addresses. The verified core, governance, miner and farm source evidence is
reused from its existing manifests. The frontend new manifest contains only
addresses and runtime hashes; full evidence and ABIs stay outside the bundle.

## Implemented methods

| Control | Deployed method | Outcome verification |
| --- | --- | --- |
| PLS buyback | `AccumulateDTX.buyWithPLS()` | Daily accounting increment and OINK transfer from helper to pinned treasury |
| PLSX/INC/HEX conversion | `swapTokenForPLS(token,balance)` | Input token transfer and WPLS withdrawal to router for quoted PLS |
| PulseX rewards | `Farmer.harvest(9)` | Positive INC transfer from farmer to buyback helper |
| Miner rebalance | `Governor.harvest()` | Receipt-block timestamp and all six computed MasterChef weights |
| Start Reward Boost | `leverPullFibonaccening(id)` | Existing ordinary governance receipt verifier: proposal outcome, OINK burn and emissions |
| End Reward Boost | `endFibonaccening()` | Existing reward maintenance receipt verifier: event closure and emissions |
| Weekly maximum reduction | `reduceMaxPulseAllocation()` | Exact old maximum × 99 / 100 and receipt-block timestamp |
| Enforce ecosystem cap | `rebalanceIfPulseAllocationExceedsMaximum()` | Total allocation plus every proportionally scaled pool percentage |
| Ecosystem rebalance | `rebalancePools()` | Every current MasterChef ecosystem weight |
| Funding fee batch | Verified vault `collectCommission(users,stakeIds)` | Per-position amount/fees/timestamp and matching per-user CollectedFee totals |
| Vault fees | `updateFees()` | Exact reviewed Governor deposit and funding settings |
| Senate distribution | `MasterChef.fairMintSenate()` | Every current senator's credit and aggregate accounting |
| Publish to Senate | `MasterChef.publishTokens(senate,callerCredit)` | Caller credit consumed, publication accounting, matching OINK mint to Senate |

Fee batches enumerate current positions on-chain; they do not infer positions,
fees or eligibility from the original site's off-chain text files. Inputs are
bounded to 50 distinct nonzero user addresses and 200 total positions. The
unverified original fee proxy is bypassed using each verified vault directly.
Fee accounting follows whole hours, the funding-rate change boundary, and the
20% per-position collection cap. EMIT is included only for this existing fee
path, with a nominal deduction warning because taxed token transfers can leave
the treasury with less than the position deduction.

## Deliberate fail-closed cases

- The pDRIP token is a proxy whose current implementation has no verified public
  source. Its fee control reports this exact reason and remains external.
- The old UI's `harvestForSenate()` does not exist in the verified deployed chef;
  the deployed `fairMintSenate()` is used. An empty Senate cannot consume a fair
  mint period through this UI.
- The original Senate publication code reads Senate credit although deployed
  `publishTokens` consumes `credit[msg.sender]`. The new control explicitly uses
  and labels the caller's actual credit and the Senate destination.
- Old unused referral/reduction handlers refer to methods absent from verified
  deployed code and are not enabled as fabricated operations.

## Testing and live reads

`scripts/test-community-maintenance.mjs` covers all 13 catalog actions, exact
calldata, all buyback assets, funding bounds, fee math, changed runtimes/wiring,
wrong chain, stale/reorganized blocks, inactive/expired events, empty Senate,
all receipt paths, and changed fresh preflight preventing a wallet request.

`scripts/check-community-maintenance-live.mjs` reads public PulseChain state and
builds quotes only. At block 27,882,317 it successfully prepared buyback, token
conversion, staking rebalance, weekly maximum reduction and ecosystem rebalance.
No INC was available to harvest, core vault fees were already in sync, no boost
was active, and current ecosystem allocation was below its maximum. These
conditions are displayed independently rather than disabling all maintenance.

Conservative receipt state comparisons can return “needs review” if another
valid transaction changes the same state in the receipt block. They do not turn
an ambiguous outcome into a false confirmation or recommend repeating it.
