# Voting credit and miner participation review

Verified on 19 September 2026. `participation-verification.json` records exact compiler comparisons of explorer-published voting-credit, consensus, and all six miner implementations at block 27586406. The script masks only compiler-declared immutable offsets and excludes Solidity metadata for executable comparison, then pins the full deployed runtime. Every review separately checks the relevant immutable and mutable wiring at one canonical block. `participation-live-check.json` records fresh wiring checks and successful read-only delegation simulations for all six miners.

## Enabled behavior

- `VotingCredit.depositCredit(amount)` calls the trusted MasterChef burn against the calling wallet, then issues equal credit. It does not call ERC20 `transferFrom` and needs no allowance. Liquid OINK is permanently burned; credit is nonwithdrawable.
- `VotingCredit.burnCredit(amount, forId)` subtracts existing credit and increases an arbitrary reference counter. This is not a governance proposal vote and does not convert credit back to tokens.
- Each miner's `voteForProposal(position, false)` moves the caller's entire current share balance from its prior consensus position. `setDelegate(address, false)` grants ongoing selection authority, including future shares; removing the delegate does not remove the recorded vote. The UI always uses `asProxy=false` and never asks the user to rely on `tx.origin`.
- `delegateeVote(addresses, position)` silently skips unauthorized addresses in the deployed contract. The new review instead requires all 1–25 unique, nonzero addresses to have delegated to the connected wallet, hold shares, and change selection. It verifies the expected per-wallet events and resulting selections.
- Votes are offered only for neutral or a verified paired treasury/Governor target. Treasury requests must remain open; Governor candidates must not be invalidated. Arbitrary raw consensus IDs are not accepted by the form.
- `votingCredit(shares, stakeId)` permanently removes miner shares, publishes the corresponding OINK to `treasury` (the pinned Governor address), and issues nonwithdrawable voting credit to the caller. It does not pay wallet OINK or apply ordinary withdrawal penalties. Conversion has no mandatory-service check in the source. It does not harvest first: available MasterChef credit must cover the calculated amount, and the public simulation must pass.

## Checks and limits

All quantities use integer arithmetic. Reviews and position pages use one block, verify full runtime hashes and contract wiring, then recheck canonicality. Miner conversion binds the complete recorded stake tuple to its review so index reuse changes the fingerprint. Its credit estimate can grow with pool rewards; the fixed user-authorized action is the exact share quantity. The receipt must match removed shares, voting credit received, and OINK minted to the Governor for one identical positive amount.

The shared protocol runner handles current account and chain checks, fresh review comparison, simulation, gas checks, a browser-wide pending gate, and canonical transaction/receipt validation. This adapter additionally verifies action-specific events and state. No local code can prevent another transaction changing chain state after the user's wallet opens. These checks do not constitute an independent contract security audit.

Validation: 30 dedicated tests cover six-miner direct voting, delegation, proposal pairing, closed/invalid targets, balance and share limits, conversion consequences, changed source/wiring/registration, stale and reorganized snapshots, pagination and large integers, and exact receipt events. TypeScript passes. All live calls were read-only; no wallet was connected and no real transaction was signed or broadcast.

Reproduce with `node scripts/verify-participation.mjs`, `node scripts/check-participation-live.mjs`, and `node --test scripts/test-participation.mjs`.
