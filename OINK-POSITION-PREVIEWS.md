# Miner and farm action previews — September 12, 2026

## Implemented

- Six OINK miner deployment previews: fresh wallet balance, recipient, minimum gift check, estimated shares, actual duration/grace and source-derived maximum penalty. Self-deposit and gift-deposit simulations use public `eth_call` only. A gift draft adds zero extra mandatory service.
- Full miner withdrawal preview: fresh position/shares, mandatory service, integer early/late penalty and estimated net OINK. Mandatory lock equality remains blocked. Late penalties count from maturity once grace has ended, not from the end of grace.
- PLS, PLSX and INC single-position claim and full-withdrawal previews, direct to the connected wallet: fresh funding deduction, remaining/returned principal, gross reward, wallet payout and Governor remainder.
- Previews expire using block time, close on wallet/session/input changes, verify chain 369 and a canonical fixed block, and reject changed code/wiring. No wallet request is made by preview code.

## Source evidence and limits

Published sources were inspected through `https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=...` for the six addresses in `src/config/minerPreviewVerification.ts` and the three existing verified vaults in `src/config/farmWriteVerification.ts`.

Miner runtime pins were sampled at block 27528212, hash `0xeb6fa0881edcbc9b31ce8f7cb44a606a756a19d5c1db40055069ee2b4f7cda3c`. These are read-only model pins, NOT a write allowlist or an independent compilation match. Do not use this file as authorization to send transactions.

| Miner | Duration days | Grace days | Maximum penalty | Daily fee calculation in basis points |
| --- | ---: | ---: | ---: | --- |
| 1 month | 30 | 3 | 25% | whole days × 786 / 10 |
| 3 months | 91 | 5 | 35% | whole days × 382 / 10 |
| 6 months | 181 | 7 | 42% | whole days × 231 / 10 |
| 1 year | 365 | 14 | 50% | whole days × 1337 / 100 |
| 3 years | 1095 | 14 | 69% | whole days × 629 / 100 |
| 5 years | 1826 | 21 | 82% | whole days × 4269 / 1000 |

Early fees subtract the daily reduction from the maximum. Late fees apply after grace and are capped at the maximum. Integer rounding follows the source. Estimates do not guarantee an actual received amount.

Farm reward previews model the actual harvest accumulator using `(credit + pending - lastCredit)`, not just the original view helper's pending-only addition. Rewards are calculated before funding collection reduces stake. Funding uses whole hours since the later of last action and funding change, capped at 20% of that position per collection. No locked-miner reward destination or emergency withdrawal is enabled.

## Verification

- 149 regression tests passed, including 12 new preview tests. TypeScript and separate local production build passed.
- Public read-only smoke checks at blocks 27528236–27528242: all three farm claim and withdrawal simulations passed; all six self-deposit miner simulations passed. The historical test account's five-year withdrawal was correctly blocked by mandatory service. No unlocked miner withdrawal or gift recipient simulation is claimed as live-tested.
- Browser checked the local deployment controls in disconnected state. Positive connected-wallet modal interaction was not tested; no wallet provider was injected and no account was persisted for testing.
- The test script uses a public historical depositor only as an `eth_call` sender. It is never installed as the user's wallet. No signatures, transactions, contract deployments or publication occurred.

## Still required before enabling new wallet sends

1. Independently compile/match miner runtime and verify the MasterChef burn/publish and OINK permission routes. Existing farm deposit verification is not blanket approval of miner writes.
2. Extend transaction recovery and receipt verification for claim/withdraw effects, including token/native transfers, funding events, reward events and position removal.
3. Protect review identity using the complete fresh position tuple, not its mutable index alone; recheck before requesting a wallet transaction. The original methods have no minimum-output/position-fingerprint argument, so remaining mining-time race risk must be disclosed.
4. Test unlocked miner exits, gift deposits, zero-reward claims, rejects, changed settings, reorganizations, account/network changes and uncertain wallet outcomes.
5. Add separately verified recipient routes, partial withdrawal, transfer, hop, recommit and rollover flows. Existing actions remain disabled, not silently mapped onto deposit or harvest.

This completes the preview tranche, not the full miner/claim/withdraw transaction rollout. Existing deposit/approval sends and their journal are unchanged.
