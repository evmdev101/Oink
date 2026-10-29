# Expanded ordinary farm vault verification

Checked on 2026-09-19 at 15:13:54 UTC using only public HTTP/RPC reads. Snapshot: PulseChain block **27586281**, timestamp 15:13:45 UTC, hash `0x132a3ff40696ed0e83bab077d22cda1e48f6c415d2ab20a76967ac5e78eb8d74`. The block hash was checked again after all reads.

The eight proposed vault additions—HEX, HOA, pDAI, ATROPA, SolidX, pUSDT, pUSDC and Communitas—match the existing ordinary-vault transaction model and have no vault-state blocker at this snapshot. This conclusion covers the vaults. Each deposit token needs its separate source/transfer/approval/proxy review before application activation.

| Vault | Source generation | Vault model | Reward allocation | Result |
|---|---|---|---:|---|
| HEX | SafeERC20 4.9, optimized | Matched | 155 | Candidate after token review |
| HOA | SafeERC20 4.9, unoptimized | Matched | 38 | Candidate after token review |
| pDAI | SafeERC20 4.9, unoptimized | Matched | 583 | Candidate after token review |
| ATROPA | SafeERC20 4.9, unoptimized | Matched | 38 | Candidate after token review |
| SolidX | SafeERC20 4.9, unoptimized | Matched | 77 | Candidate after token review |
| pUSDT | SafeERC20 5.2, unoptimized | Matched | 38 | Requires token behavior guards |
| pUSDC | SafeERC20 5.2, unoptimized | Matched | 38 | Requires token implementation and behavior guards |
| PDRIP | SafeERC20 5.3, inline deployment settings | Matched | 38 | Separate token review blocks activation |
| EMIT | SafeERC20 5.3, inline settings, initial funding rate 250 | Matched | 0 | Deposit blocked by zero allocation; separate token review also required |
| Communitas | SafeERC20 5.3, inline settings, initial funding rate 250 | Matched | 389 | Candidate after token review |
| pTGC | Additional source variant | Deferred | Not assessed by this run | Separate token review already blocks activation |
| UFO | Additional source variant | Deferred | Not assessed by this run | Separate token review already blocks activation |

## What was checked

For each matched row, the explorer source was compiled with Solidity `0.8.20+commit.a1b79de6` and its published optimizer settings. The deployed executable matched the compiled executable after removing metadata and masking only compiler-declared immutable slots. Every immutable reference was then checked for consistent values matching the actual deposit and OINK tokens. The full unmodified runtime hashes also matched the existing read-verification pins.

The verifier compares the complete vault and helper source as Solidity tokens, with narrowly described deployment differences. It separately compares the full text of `deposit`, `harvest`, `withdraw`, `selfHarvest`, `emergencyWithdraw`, `payFee`, `_removeStake`, `updateFees`, `updateTreasury`, `setPoolPayout` and `updateSettings`. Their per-method hashes are retained in the JSON evidence.

Later source variants move token/chef/pool constructor inputs into declaration initializers. Only the expected exact addresses and pool number are normalized. The final four vaults initialize `fundingRate` at 250 instead of 0; the fee calculation, limits and current values are checked separately. Constructor miner payout settings remain part of the comparison. SafeERC20 5.2/5.3 has the same relevant nominal-transfer model, optional return handling and revert propagation; its low-level transfer implementation was inspected separately from the 4.9 baseline. No ABI-only compatibility assumption was used.

At the fixed block, the audit checked vault token, reward token, MasterChef, pool ID, registered pool address, Governor/treasury recipients, MasterChef owner/reward token/fee recipient, Governor MasterChef/treasury, OINK owner/Governor, token decimals, token balance, current reward credit, pending reward credit and reward allocation. MasterChef, Governor and OINK runtime hashes matched the existing pins.

All ten matched vaults had deposit fee 0, funding rate 250, maximum deposit fee 500, maximum funding rate 250 and direct reward payout 50. These are raw contract units: 0% entry fee; up to 0.025% funding per whole hour with the existing per-collection 20% cap; 0.5% direct OINK payout. These values are mutable and must be rechecked during every transaction review.

## Action semantics retained

- Deposit harvests first, requests an exact nominal token transfer, deducts the deposit fee and records the nominal remainder. **It does not measure the amount actually received**, so taxed/rebasing/otherwise nonstandard token behavior cannot be ignored.
- Claim accrues rewards before the funding fee, updates debt and splits OINK according to the chosen wallet/miner payout. Existing referral credit behavior is unchanged.
- Withdrawal removes the full indexed position using swap-and-pop, applies the funding fee, splits OINK and transfers the remaining nominal principal.
- Emergency withdrawal applies the funding fee, removes the position, forfeits all OINK and skips harvest. Its `Withdraw` event uses the `penalty` field for the returned nominal principal.
- Passing a zero referral on deposit preserves any existing `referredBy`; successful claim/withdraw adds the paid OINK amount to sender/referrer referral points.

## Reproduction and limits

Run `node scripts/verify-expanded-farm-vaults.mjs`. It writes `evidence/expanded-farm-vaults.json` with source/compiler/runtime/method hashes and raw fixed-block values. Each HTTP/RPC request has a 45-second timeout. The script deliberately exits nonzero while a source variant remains unreviewed; it does not activate an allowlist or change application code.

Primary sources are the [PLSX vault verified source](https://scan.pulsechain.com/address/0x16233F6d7398f134EbCec11101e792c03ED296a4#code), [pUSDT vault verified source](https://scan.pulsechain.com/address/0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21#code), each row's explorer source URL in the JSON, and live PulseChain RPC state. Dependency runtimes were pinned and checked, not independently recompiled by this script. Token runtime hashes and decimals are observations, not proof of standard transfer behavior. No wallet was contacted, transaction broadcast, or balance-changing simulation performed.
