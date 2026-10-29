## Information parity and final verification — September 20, 2026

This update retains the horizontal site navigation; it introduces no sidebar. This section and the recent implementation sections supersede the original staged-audit tables below.

- Matched the original application's relevant category information: voting cost and delay, miner rollover and harvest fees, vault fees, pool allocation caps, Governor/treasury OINK, supply, emission, Reward Boost funding and event status.
- Added Reward Boost emission/duration and six-miner APR estimates using live allocation, pool balance and observed block timing. These are simple annualized estimates, not compound APY or guaranteed earnings.
- Added local date/time selection while preserving Unix-second contract arguments.
- Added advisory eligibility messages before Review. Transaction preparation still checks current on-chain terms independently.
- Added event-based NFT candidate and Senate membership ballot discovery. Empty successful reads are distinguished from failed/incomplete reads; manual address inspection remains available. The live checks currently report no candidates or Senate members.
- Read-only live verification: `evidence/governance-information-live.json`.
- Local Anvil fork verification: `evidence/governance-local-fork.json`. Ten actual local transactions passed review/simulation and receipt verification: credit deposit; ordinary proposal creation/support/execution; creation/opposition/veto; Reward Boost creation/start/end. The evidence array is the authoritative count. Test OINK and gas were seeded only on the local fork. No Senate initialization, public-network transactions or deployment occurred.
- 844 automated tests passed. TypeScript, production build and subdirectory asset checks passed. Browser checks covered loaded statistics, estimator input changes, the calendar field, empty candidate lists and mobile layout. No browser errors were reported.

Local fork coverage is representative, not exhaustive: NFT finalization, Senate membership changes and Governor replacement retain source-verified adapters and mocked edge-case tests, but were not executed in this fork run. An independent contract/security audit is outside this work.

---

# OINK governance coverage and contract map

## NFT allocation and Reward Boost follow-up update — 2026-09-20

- NFT allocation now has an in-site Governance tab: candidate inspection, credit-funded notification, direct/delegated miner voting, proposing, recording higher support, rejection and approval. Address-derived ballots remain exact BigInts; they are not Consensus proposal-array indices.
- The verified allocation proxy source was recompiled and matched deployed runtime. Live checks confirmed its Governor/token/credit wiring, 10% proposal threshold, 50% rejection threshold and seven-day rejection period (after the initial three-day delay). Both voting thresholds use strict greater-than comparisons; approval waits strictly beyond the deadline. These are current observations, not constants enforced by the interface.
- Compatibility probing is not a candidate code audit. Rejecting a pending broken candidate remains possible even when its compatibility getter fails. Governor-only parameter setters remain outside the public controls.
- Reward Boost includes ending expired active events and cancelling still-open competing proposals. Receipt checks verify the intended event, closure and emission changes. Cancellation never targets the active event.
- Validation: 823 tests passed; live contract reads confirmed wiring and correctly reported no active Reward Boost. No wallet transactions were submitted or deployment performed. Public candidates are entered by address; automatic candidate discovery remains a convenience enhancement.

## Implementation update — 2026-09-20

The local interface now includes all eleven ordinary proposal families, Senate ballots and membership finalization, Senate credit distribution, treasury requests and Governor replacement stages. Each uses the shared fresh review, simulation, wallet confirmation and persistent receipt monitor. The older audit below describes historical implementation gaps.

- Senate and treasury source executables were compiled with the explorer compiler settings and matched deployed bytecode. Evidence and the reproducible script are in `evidence/advanced-governance-verification.json` and `scripts/verify-advanced-governance.mjs`.
- The advanced adapter verifies core runtime hashes and wiring at a canonical block, current authority, paired proposal identity, integer thresholds and waits. Candidate contract hashes and material consequences appear in the review. Proposing a new contract is not an audit of that contract.
- Treasury approval and unsuccessful closure are separate actions. Receipt confirmation of ERC20 transfers requires the matching token transfer event because the treasury ignores a false ERC20 return. Native transfers use the verified treasury execution event.
- Governor relative and absolute veto signatures include the deployed boolean update argument. Silent no-op vetoes are blocked by preflight thresholds. Enforcement checks ownership, fee/developer destinations and the OINK transfer.
- Senate seat replacements require no ballots and a never-added candidate. Public majority finalization does not confer Governor-only initialization or administrative permission. Live checks currently report zero registered senators, so member-only voting is unavailable until the protocol initializes membership.
- No wallet transactions were sent and nothing was published. Validation includes unit/receipt regression tests, source compilation, public read-only calls, typechecking, production build and browser form checks. This is not an independent contract security audit.

## Historical implementation update — 2026-09-07

This section supersedes the earlier newest-only/history implementation statuses below; those remain a record of the initial audit.

- All 11 ordinary proposal arrays and the treasury array are scanned at one fixed block. Public reads are limited to 12 concurrent calls, stale work is cancelled on page cleanup, and counts above 5,000 per array produce an explicit incomplete-coverage error rather than truncation.
- Open/all filters and 20-record pagination are display-only. The full registry is loaded before publishing a snapshot. Initial scans can take about a minute on public RPCs.
- Governor proposals are discovered from all positive odd consensus positions, checking type 0, the opposite-position pair, and the reported governor proposal count. No proposal ID is hardcoded. Candidate invalidation is address-scoped in the contract, not per individual proposal.
- Snapshot block 27,486,367 contained 412 ordinary records (11 valid/open), 430 treasury requests (28 valid/open), and one Governor pair. These are observations, not permanent protocol counts or proof of executable actions.
- Governor getter links are checked against the configured Basic, Farms, RewardBoost, Consensus, Credit, Senate, and MasterChef addresses. A mismatch blocks the snapshot.
- Corrected Governor inflation share to read MasterChef `governorFee`, separate from Governor `fundingRate`. Vault funding is displayed as percent per hour (raw / 10,000); deposit/referral percentage fields use raw / 100. Individual vault settings may lag until synchronized.
- Senate ballots retain full decimal-string IDs; unavailable or misaligned ballot arrays are not treated as empty. Credit distribution gives each member the calculated 1% amount, not a fraction of a shared 1% pool.
- `ordinaryGovernanceCalls.ts` allowlists creation, support, opposition, veto, and execution signatures for all 11 families. Important source names include `executeSetMinDeposit`, `executeGovTax`, and `executeVault`; pool `updateFarm` also requires a boolean argument. This corrects shorthand names in the initial table below.
- Added blocked Treasury creation/credit-vote and Senate membership-ballot/removal builders. These are internal raw-unit encoders, not usable transaction forms or eligibility checks.
- `governanceSimulation.ts` performs only an `eth_call`, validates chain 369, deployed target code and a fixed block, and always returns a blocked result. A successful call can still reject/close a proposal without delivering funds. It never establishes a beneficial outcome or enables broadcasting.

Validation: `node --test scripts/test-governance-reads.mjs scripts/test-governance-actions.mjs`, `pnpm typecheck`, and `pnpm build`. The 67 automated cases cover encoding, exact ballot IDs, read concurrency, scan boundaries, and mocked simulation failures; they are not an independent security audit or live testing of every transaction.

Still required before enabling actions: typed user-facing forms with unit/range checks; action-specific fresh eligibility and deployed-call simulations; outcome/state-change verification on a local fork; Senate candidate and NFT-allocation discovery; voting-credit custody flows; transaction confirmation/error handling. Initialization, ownership changes, deployment, publication, and broadcasting remain outside this update.

Published-source references used for these corrections: [Consensus](https://github.com/OINK-pls/PiggyBank/blob/main/contracts/consensus.sol), [Senate](https://github.com/OINK-pls/PiggyBank/blob/main/contracts/senate.sol), [Basic settings](https://github.com/OINK-pls/PiggyBank/blob/main/contracts/basicSettings.sol), [Farms](https://github.com/OINK-pls/PiggyBank/blob/main/contracts/farms.sol), [Reward boost](https://github.com/OINK-pls/PiggyBank/blob/main/contracts/rewardBoost.sol), [token vault funding formula](https://github.com/OINK-pls/PiggyBank/blob/main/contracts/pulse-ecosystem/tokenVault.sol).

This audit keeps three kinds of evidence separate:

- **Verified live** — values read from deployed PulseChain contracts through a public RPC.
- **Published-source behavior** — rules found in the verified/published OINK Solidity source. This verifies code paths, not whether a proposed action is safe or beneficial.
- **Unresolved** — transaction preparation is deliberately disabled until calldata, caller authority, units, timing, and effects are tested together without broadcasting.

The refresh on 2026-09-07 observed PulseChain block **27,486,184**. The OINK token pointed to Governor `0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16`; that Governor pointed to Senate `0x147B43930283d1DDe43d805B7f17E4604b7ca493`, Consensus `0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3`, and Voting Credit `0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A`.

## 1. Ordinary proposals

Ordinary proposal creation and votes spend voting credit. Every proposal has its own requested delay, then uses the live Governor enforcement delay (86,400 seconds at the observed block). A proposal remains valid until a public caller vetoes or enforces it. The write column remains disabled throughout this stage.

| Original control | Contract function(s) | Caller / permission | Published voting and effect rule | Site status |
|---|---|---|---|---|
| Minimum voting cost | `initiateSetMinDeposit`, `voteSetMinDepositY/N`, `vetoSetMinDeposit`, `setMinDeposit` | Public; proposer/voters need credit | Proposed cost is capped at 0.01% of supply. Proposal deposit is at least the current cost, or the proposed higher cost. For/against credit is consumed. | Live value, count, newest history, exact value, and deadline implemented; writes disabled |
| Global enforcement delay | `initiateDelayBeforeEnforceProposal`, vote/veto/enforce family | Public; proposer/voters need credit | New global delay is constrained by source to 1–14 days. | Live value/history implemented; writes disabled |
| Rollover bonus | `initiateProposalRolloverBonus`, vote/veto/enforce family | Public; proposer/voters need credit | Proposal targets a specific time-miner address. Governor enforces a hard 15% cap. | Six current values and newest history implemented; writes disabled |
| Harvest call fee | `initiateSetCallFee`, vote/veto/enforce family | Public; proposer/voters need credit | Changes the call fee on the time-miner contracts; value is a basis-point-style integer displayed as percent only after source verification. | Current per-miner reads and newest history implemented; writes disabled |
| Reward-event threshold | `proposeSetMinThresholdFibonaccening`, vote/veto/enforce family | Public; proposer/voters need credit | Changes the OINK balance threshold required before a reward-boost event can start. | Live value/history implemented; writes disabled |
| Add a pool | `initiateNewPool`, vote/veto/enforce family | Public; proposer/voters need credit | Candidate must be a contract; published Governor enforces a maximum of 50 pools. | Newest history implemented; writes disabled |
| Ecosystem pool allocation | `initiateFarmProposal`, `voteFarmProposalY/N`, `vetoFarmProposal`, `updateFarm` | Public; proposer/voters need credit | Only post-time-miner pool IDs are accepted. NFT, per-pool Pulse ecosystem, and total Pulse ecosystem allocation caps apply. | Live caps/current aggregate and newest history implemented; writes disabled |
| Vault fee / funding / referral settings | `proposeVault`, `voteVaultY/N`, `vetoVault`, `updateVault` | Public; proposer/voters need credit | Type 0 deposit fee, type 1 funding rate, type 2 referral bonus. Governor source caps referral bonus at 25%; additional vault effects must be reviewed per type. | Live current settings and newest history implemented; writes disabled |
| Governor inflation share | `proposeGovTax`, `voteGovTaxY/N`, `vetoGovTax`, `updateGovTax` | Public; proposer/voters need credit | Proposed integer is capped at 1000 (10% in the contract scale), then applied to MasterChef by the Governor. | Live/current history implemented; writes disabled |
| Governor OINK transfer or burn | `proposeGovernorTransfer`, vote/veto/enforce family | Public; proposer/voters need credit | Amount cannot exceed Governor OINK balance; proposal selects a treasury transfer or burn and may schedule a timestamp. | Newest history implemented; writes disabled |
| Reward boost event | `proposeFibonaccening`, `voteFibonacceningY/N`, `vetoFibonaccening`, `leverPullFibonaccening` | Public; proposer/voters need credit | Requires threshold balance, no active event, duration 100–256,633 blocks, start timing constraints, and a 5% virtual-supply emission safeguard. | Live active flag/count/newest history implemented; writes disabled |
| Treasury withdrawal | `initiateTreasuryTransferProposal`, credit votes, miner positions, veto/approve/kill functions | Public; proposer needs at least 100 times voting cost | Uses both consumed credit and reusable weighted miner power. Approval source requires credit support at least opposition, weighted support at least 15% of locked OINK, and weighted opposition below one third of support. | Six newest targets, exact recipient/token/raw amount, both vote systems, and deadlines implemented; writes disabled |
| NFT allocation implementation | `notifyVote`, `proposeAllocationContract`, `updateVotes`, `rejectAllocationContract`, `approveAllocationContract` | Public; notification consumes 50 times voting cost; consensus uses miner positions derived from candidate address | Published source requires weighted support above 10% of total locked OINK, then permits rejection when opposition is above 50% of the proposal's highest committed support during the rejection period. Candidate compatibility is probed by calling `nftAllocation(address,uint256)`. | Contract and rules mapped; live candidate discovery and writes unresolved |
| Voting-credit wallet | `userCredit`, `depositCredit`, `burnCredit`; miner `votingCredit` | Public owner actions; whitelisted contracts can credit/deduct | `deductCredit` consumes the internal balance and can burn MasterChef credit for a shortfall. It is not miner voting power. | Existing connected wallet balance is read without requesting connection; writes disabled |

The current `proposalLengths()` order was verified from source before mapping:

- Basic: voting cost, new pool, enforcement delay, call fee, rollover bonus, reward-event threshold.
- Farms: pool allocation, vault setting, Governor transfer/burn, Governor tax.

## 2. Miner voting

| Control | Contract function(s) | Caller / permission | Published rule | Site status |
|---|---|---|---|---|
| Public miner totals | `totalShares`, `getPricePerFullShare` on all six time miners | Public view | Used to show the six independent locked-share systems. | Implemented |
| Connected-address power | `getUserTotalShares(address)` | Public view; requires an address | Consensus applies weights of 20%, 30%, 50%, 75%, 115%, and 150% for the six durations. | Implemented for an already-connected wallet; no connection prompt |
| Current proposal selection | `userVote(address)` | Public view | Each miner stores one selected consensus position per user. Position 0 is neutral. | Implemented; unmapped positions are not turned into actions |
| Select a proposal | `voteForProposal(proposalId,asProxy)` | Stake owner, or the miner's explicitly supported proxy path | Removes all of that user's shares from the prior ID and assigns them to the new ID. Power is reusable, not consumed. | Semantic selector design mapped; write disabled |
| Read/set delegate | `userDelegate`, `setDelegate(address,bool)` | Stake owner | Delegation is recorded separately in each time miner. | Read implemented; write disabled |
| Vote for delegators | `delegateeVote(address[],proposalId)` | Recorded delegate for every supplied voter | Reassigns each delegator's full shares in that miner. | Source mapped; write disabled pending bounded-list and gas review |
| Convert stake into voting credit | `votingCredit(shares,stakeId)` | Stake owner | This is a credit-minting path and is distinct from allocating reusable miner votes. | Source mapped; write disabled pending stake eligibility/effect tests |

The UI does not accept an unexplained numeric proposal ID. It builds semantic options from verified Governor and treasury proposal records. Unknown stored positions are shown as unmapped and remain non-actionable.

## 3. Senate

Live refresh: `senatorCount = 0`, `viewSenators = []`, `minSenators = 20`, `maxSenators = 100`. This independently refreshes the historical zero-member observation. Because no addresses are registered, there is currently no Senate electorate even though the raw majority expression would require a positive vote count.

| Control | Contract function(s) | Caller / permission | Published rule | Site status |
|---|---|---|---|---|
| Member list and count | `viewSenators`, `senatorCount`, `minSenators`, `maxSenators` | Public view | Only the on-chain registry proves membership. | Implemented without wallet connection |
| Connected-wallet status | `isSenator(address)` | Public view | True only for a currently registered member. | Implemented for an already-connected wallet |
| Recorded member ballots | `multiCall`, member vote data | Public view | Every member has an array of recorded ballot identifiers. | Implemented; explicit empty state now shown |
| Cast a Senate ballot | `vote(proposalId)` / `massVote` | Registered member | One vote per member per proposal; duplicate proposal vote is rejected. | Semantic ballot mapping designed; write disabled |
| Remove a ballot | `removeVote(proposalId,indexId)` | Registered member who recorded the vote | Requires both the semantic proposal identifier and its exact index in that member's vote array. | Read mapping implemented; write disabled |
| Finalize direct veto | `vetoProposal(consensusProposalId,treasuryProposalId)` | Public finalizer after Senate threshold | Requires `votesForProposal[id] > senatorCount()/2`: more than half of all registered members. Direct branch is Governor replacement for consensus type 0; otherwise the supplied treasury record must map to that consensus record. | Treasury targets mapped with clear label; write disabled |
| Add a voted candidate | `expandSenate(address)` | Public finalizer | Candidate ballot identifier is the candidate address encoded as an integer. Count must be below maximum; candidate must not be current or previously added; absolute majority required. | Source mapped; candidate discovery unresolved; write disabled |
| Governor-only add | `addSenator(address)` | Current Senate owner; live owner is Governor | No public-member voting path inside this function. | Authority displayed in coverage; write disabled |
| Remove a member | `expellSenator(address,index)` | Public finalizer | Ballot identifier is encoded address + 1; absolute majority required; count must remain above minimum; supplied array index must match. | Source mapped; write disabled |
| Self replacement | `selfReplaceSenator(new,index)` | The registered member being replaced | Caller must be the member at the supplied index, have no recorded votes, and choose an address never added before. | Source mapped; write disabled |
| Set membership count | `setSenatorCount(uint256)` | Senate owner / Governor | Restricted owner maintenance route. | Authority mapped; write disabled |
| Initial registration | `initializeSenators(address[])` | Original deployer; only when count is zero | One-time initialization route. The user expressly forbids calling it. | Documented only; intentionally not exposed |
| Credit distribution | `grantVotingCredit()` | Public finalizer | Published formula allocates `(MasterChef total credit - last recorded total) / 100` per registered member, then advances the recorded total. | Read/formula mapped; write disabled, especially with zero membership |

Direct Senate veto coverage is deliberately limited to the routes the deployed/published logic proves: Governor replacement and treasury withdrawals. The website does not claim that ordinary proposals have a direct Senate veto.

## 4. Protocol upgrades

One published Governor proposal exists. Its verified pair is support position 75 and opposition position 76, proposed for the same address as the current Governor. At the refresh block, `isGovInvalidated` returned `(true, true)`, `eligibleNewGovernor` was the zero address, `changeGovernorActivated` was false, and `newGovernorRequestBlock` was zero. The site therefore reports **no pending Governor replacement**, regardless of the original interface's stale “active” label.

| Stage | Contract function(s) | Caller / permission | Deployed/published rule | Site status |
|---|---|---|---|---|
| Read current/pending state | Token `governor`; Governor `eligibleNewGovernor`, `changeGovernorActivated`, `newGovernorRequestBlock`, `newGovernorBlockDelay`; Consensus proposal records | Public view | Contract state, not page copy, determines pending status. | Implemented |
| Propose replacement | `Consensus.proposeGovernor(address)` | Public; candidate must be a contract; proposer spends 100 times voting cost | Creates paired support/opposition miner positions. | Source/ABI mapped; write disabled |
| Allocate support/opposition | Each miner's `voteForProposal` | Locked-position owner/delegate/proxy as applicable | Reusable weighted miner power. | Historical pair and current totals implemented; write disabled |
| First-stage change | `Consensus.changeGovernor(supportId)` | Public finalizer after global time delay | Support must be at least 15% of total locked OINK. Opposition at least one third of support invalidates; otherwise Governor records the replacement. | Rule/read implemented; write disabled |
| Opposition veto | `vetoGovernor`, `vetoGovernor2` | Public finalizer | One path invalidates at opposition of at least one fifth of recorded support; another at opposition of at least 25% of total locked OINK. | Rule/read implemented; write disabled |
| Senate veto | `Consensus.senateVeto(supportId)` invoked by Senate | Senate contract only | Senate reaches its absolute-majority ballot, then its public finalizer calls the Consensus-only-Senate route. | State/rule implemented; write disabled |
| Final enforcement | `Consensus.enforceGovernor` → `Governor.enforceGovernor` | Public finalizer | Must wait until `newGovernorRequestBlock + newGovernorBlockDelay < block.number`. | Live delay/current state implemented; write disabled |
| Authority transferred | Governor → MasterChef and new Governor | Contract-controlled | Published source changes MasterChef fee and developer authority, transfers MasterChef ownership, and transfers the old Governor's OINK balance to the new Governor. | Effect warning implemented; no execution |

The original interface's 33% / 80% prose is not used for enforcement guidance because it does not match the currently verified deployed source conditions above.

## Remaining blockers before transaction preparation

Stage 1 semantic calldata builders are present in `src/lib/governanceTransactions.ts`. They encode only mapped, zero-native-value miner, Senate, treasury-finalization, and Governor-replacement calls; every returned object is explicitly marked blocked. There is no signer, broadcast helper, Senate initialization builder, ownership-change builder, or deployment path.

- Confirm candidate discovery and semantic ballot mapping from deployed event history for Senate additions, expulsions, and NFT allocation candidates.
- Preserve the raw treasury amount when token metadata cannot be read. For standard assets, the UI now reads deployed `decimals()` and `symbol()` before displaying a human amount.
- Model each action's current preconditions and expected revert reasons at a fixed block.
- Encode calldata only after the action's semantic target and array-index requirements are derived from live records.
- Test preparation and read-only simulation without a signer or broadcast path. A successful simulation still does not prove a proposal is safe or beneficial.
- Keep `initializeSenators`, ownership changes, deployments, broadcasts, and publication outside the application and test scope.

## Source references

- Official information: <https://oink-pls.com/>
- Official contract directory: <https://oink-pls.com/smart-contracts.html>
- Original Senate interface: <https://oink-pls.github.io/Piggy-Bank-UI/senate.html>
- Original interface source: <https://github.com/OINK-pls/Piggy-Bank-UI>
- Published contracts: <https://github.com/OINK-pls/PiggyBank>
- Repeatable local read-only audit: `scripts/audit-governance.mjs`
