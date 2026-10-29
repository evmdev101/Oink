# HEX shares, launch distributions and maintenance

Verified on PulseChain on 2026-09-19. All live checks were reads, `eth_call`, or gas estimation. No wallet transaction was requested or sent.

## Enabled flows

- HEX T-shares: register existing HEX stake shares with an optional referral, claim OINK, or unregister and settle rewards. Wallet and all six time-miner destinations are supported. HEX itself is neither moved nor ended.
- Launch distributions: validate the connected wallet's Merkle proof, show allocation and redeemed credit, and redeem a chosen amount into the wallet or any of the six miners. Locked payouts also require the verified voting-credit contract.
- Maintenance: show the last Governor rebalance, ecosystem allocation/cap, availability of the weekly cap reduction, and active reward-event expiry. Execution remains in the original maintenance interface.

## Source and state evidence

`verify-access-contracts.mjs` recompiled the flattened explorer source for the HEX-share vault and both distribution contracts using their exact solc 0.8.20 settings. Executable bytecode matched after masking compiler-declared immutables and stripping metadata. Full deployed runtime hashes and live wiring are pinned in `src/config/accessVerification.ts`; the source/compilation evidence is in `access-contracts.json` and the corresponding `access-*.sol` / source JSON files.

- Verification snapshot: block **27586407**, hash `0x9745e1e3875bb64b6dc6df3e088258ce97feafbf4e12aa912671b4a6aabc41f2`.
- Core runtime and wiring checks reuse the existing verified MasterChef, Governor and OINK token. HEX transfers/stake reads use the separately verified HEX runtime. Miner destinations reuse the exact miner runtime and wiring checks.
- Voting credit source/compiler evidence is in `participation-sources/credit.sol` and `participationVerification.ts`.
- Primary explorer sources: [HEX shares](https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=0x6b465C480CD590852f90c8f1b41Ab22922a1BF85), [contributors](https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=0xE87C806f8AFA1cE543ab3C44D1c4b130B83574CE), [launch rewards](https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=0x51Aeb56C05a2BD781207B63D395475b7185c5fd7).

The original distribution API returned all four proof/address files. `build-distribution-proofs.mjs` verified every row against the deployed root before building the portable local snapshot. There are **796 contributor** rows and **3,493 launch-reward** rows, covering **4,288 unique distribution/address entries**. One reward address has two valid allocations; the snapshot selects the larger valid allocation, never their sum, because redeemed credit is keyed by wallet. Valid zero allocations remain zero.

Live readers passed at blocks **27586452–27586454** (`access-live-smoke.json`). At that snapshot, contributor credit was approximately 243.37 million OINK; launch-reward credit was zero. The interface blocks unfunded claims and distinguishes exhausted funding from an absent proof. The launch reward contract's original sweep period has elapsed; its claim function does not itself enforce an expiry, so the interface does not invent one.

## Transaction and receipt checks

All prepares pin one block and verify its canonical hash, current runtimes, wiring, payout terms, account state, and destination. The shared protocol transaction framework performs a fresh simulation and gas check, rechecks terms immediately before the wallet request, and persists pending/uncertain requests.

HEX registration counts the same first `min(stakeCount, maxStakes)` HEX entries as deployed code. Claims honor the strict `lastAction + safePeriod < block.timestamp` boundary. Reward estimates include credited but unharvested credit in addition to pending MasterChef rewards. The register receipt verifies the exact shares and the emitted referral argument; deployed source emits the supplied argument even when a prior referral remains stored.

HEX claim/unregister receipts require the matching action event, payout-rate arithmetic, correct OINK mint(s), and—when selecting a miner—the burn and matching `GiftDeposit` for the wallet. A `Withdraw` event alone cannot confirm unregistration. Distribution receipts require the exact redeemed amount/destination and mint; locked claims additionally require the burn, gifted miner and added voting credit. The shared verifier checks transaction identity and canonical block hashes before and after semantic verification.

Focused verification: **22 tests pass** in `test-access-actions.mjs`; TypeScript passes. Tests cover all bundled proofs, invalid roots/addresses/proofs, precision, allowance-free calldata, capped share counting, safe-period boundaries, unavailable funding, all six miner destinations, changed dependencies/reorgs, and missing/incorrect receipt effects.

`check-access-simulations.mjs` uses public historical participants and refuses every RPC method outside its read-only allowlist. HEX claim/unregister simulations passed for wallet and five-year destinations; contributor wallet claiming passed. A 1 OINK five-year distribution quote was correctly rejected because the current minimum gift is 100 OINK; a 100 OINK simulation is recorded separately in `access-simulations.json`.

## Explicit boundaries

- **No `recalculate` button.** Deployed HEX code indexes `stakeLists(msg.sender, i)` while accepting a separate user argument and preserves old debt when the registered share amount changes. This path needs a separate contract-level review. The supported way to update this wallet's registration is to settle/unregister and register its current HEX shares again.
- **No maintenance sends or distribution sweeps.** Availability is read live; shared allocation changes, reward-event completion, and ending a distribution stay on the original tools.
- The old maintenance JavaScript refers to `pendingHarvestRewards()`, which is absent from the current verified Governor ABI. No fabricated harvester reward or nonexistent reader is shown.
- No real-wallet signing, transaction mining, or deployment was performed. Runtime/source matching is not a formal security audit.
