# Ordinary governance final review

Reviewed the ten enabled ordinary proposal families against the exact explorer sources compiled in `ordinary-governance.json`. Receipt verification now checks more than a generic successful execution event:

- Create and vote actions require the matching voting-credit deduction. If credit was consumed elsewhere before mining, the deployed `deductCredit` fallback burns wallet OINK and emits its shortfall rather than the original commitment. The verifier accepts only a matching OINK burn no larger than the amount authorized in the review.
- Veto and execution require the selected proposal to be closed, with its immutable parameters matching the reviewed record. A rejected proposal is never confirmed as a successful execution.
- Executed voting cost, delay, threshold, rollover bonus, Governor share and vault settings must match their receipt-block getters.
- Harvest-fee execution verifies all six pinned miner targets and each resulting fee. Its review also verifies the Governor's six miner addresses before a wallet request.
- Pool allocation execution verifies the stored percentage and the selected MasterChef allocation using the deployed integer rebalance calculation.
- Governor transfer/burn requires an exact OINK transfer from the Governor to the reviewed treasury or the zero address, respectively.
- Reward-boost execution requires the exact reviewed Governor threshold transfer to RewardBoost and its corresponding burn, matching Governor/MasterChef emission events, active event ID, activation block and current emission value. A changed threshold cannot silently confirm.

The shared receipt runner checks canonicality again after these asynchronous reads. Another transaction in the same block can subsequently change a setting, in which case the outcome remains uncertain rather than presenting a false confirmation.

`node --test scripts/test-ordinary-proposals.mjs`: 55 passing tests. TypeScript passes. `node scripts/check-ordinary-governance-live.mjs` performed live source-pin, permission and wiring checks for all three governance modules, all six fee destinations, live outcome getters and the zero-credit rejection guard at block 27586511. No real transaction was signed or broadcast. Live evidence is in `ordinary-live-check.json`.

Coverage wording now distinguishes the implemented miner votes on existing Governor proposals from the still-external creation/finalization of replacements, and accurately explains irreversible voting-credit deposits and stake conversions.
