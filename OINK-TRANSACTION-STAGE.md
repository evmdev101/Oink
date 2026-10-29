# OINK local transaction stage — September 11, 2026

September 12 update: read-only miner deployment/withdrawal and PLS/PLSX/INC direct-wallet claim/withdrawal previews are now available. See `OINK-POSITION-PREVIEWS.md`. This does not enable additional wallet sends or change the deposit/approval allowlist below.

This supersedes the original globally read-only status, not the remaining per-action verification requirements. The user's current request authorizes enabling verified wallet actions. It does not authorize the agent to send transactions, initialize the Senate, change ownership, deploy contracts, or publish this site. DEGEN is unchanged.

Local preview: `http://127.0.0.1:4174/#/farms`. Use a current browser with an injected wallet. The in-app preview currently has no wallet provider and reports that explicitly. Connecting requests account access only; no transaction or signature is automatically requested. PulseChain chain ID 369 is required. Contract/delegated-code accounts are deliberately unsupported in this first stage.

## Enabled controls

| Farm | Verified vault | Enabled wallet calls |
| --- | --- | --- |
| Native PLS | `0xE145932f6b010B0166aA6860D56b2730744B7d6f` | `deposit(uint256,address)`; native value exactly equals the amount; no approval |
| PLSX | `0x16233F6d7398f134EbCec11101e792c03ED296a4` | Exact `approve(vault,amount)`, `approve(vault,0)`, and separate `deposit(uint256,address)` with zero native value |
| INC | `0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868` | Exact `approve(vault,amount)`, `approve(vault,0)`, and separate `deposit(uint256,address)` with zero native value |

PLSX deposit token: `0x95B303987A60C71504D99Aa1b13B4DA07b0790ab`. INC deposit token: `0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d`. All three assets use 18 decimals. A new nonzero approval requires the previous allowance to be zero. There is no unlimited approval or automatic approve-and-deposit sequence. Approvals are limited to a quantity the connected wallet currently holds. A manual address lookup never becomes the transaction sender.

Claims, withdrawals, batch actions, other vaults, time-miner management, voting credit, Senate and all governance writes remain disabled. Depositing does not make exiting available here: the review explicitly warns that exiting would require the official or another verified interface. Do not deposit if this limitation is unacceptable. `harvest()` updates pool accounting; it is not used as a wallet claim.

## Evidence and its limits

- Official inventory: [OINK contract directory](https://oink-pls.com/smart-contracts.html). Published behavior references: [original interface](https://github.com/OINK-pls/Piggy-Bank-UI) and [published contracts](https://github.com/OINK-pls/PiggyBank).
- Exact manifest and evidence are in `src/config/farmWriteVerification.ts`. Three explorer-published vault sources were independently compiled with Solidity 0.8.20, optimizer 200. Their executable runtime bytes matched deployment after removing compiler metadata and masking only compiler-declared immutable positions. Full live runtime hashes are separately pinned for fail-closed preparation.
- PLSX and INC explorer sources, including inherited contracts, were independently compiled with Solidity 0.8.12, optimizer 999999, London EVM, and matched their deployed executable code. Their transfer and approval semantics were inspected. This does not extend to every listed token.
- MasterChef, Governor and OINK dependency runtime hashes and live wiring are checked, but those dependencies were not independently recompiled in this farm stage. Hash matching is not a security audit or a proof that an entire dependency is safe.
- Manifest snapshot: PulseChain block 27,523,086 at 2026-09-12 01:51:12 UTC. Current values are read again for every review and immediately before a wallet request. An unexpected code hash or authority/wiring change blocks preparation.
- The published repository includes constructor placeholders. Its presence alone was not treated as proof of deployed constructor settings.

## Terms checked and disclosed

The verified source uses deposit fees divided by 10,000 and hourly funding rates divided by 1,000,000. Deposit fees are bounded by raw 500 (5%); hourly funding by raw 250 (0.025%). Fee rounding and recorded stake use bigint arithmetic. Funding charges reduce the recorded deposit over time.

The inspected direct-wallet payout setting was raw 50 of 10,000: only **0.5% of gross OINK rewards**, with 99.5% going to the Governor. This is refreshed and displayed in the deposit review, not assumed to stay fixed. Other reward destinations can create locked time miners. Gross farm accounting is not a claimable cash balance or a verified reward reserve. APR and USD valuations remain unavailable rather than invented.

Deposits pass a zero referral argument, which adds no referral and preserves an already recorded referral. The current referral is read, shown, and checked again. Native PLS excludes incoming value from the existing-balance harvest denominator. Vault balance, allocation, credit accounting, asset, decimals, allowance, balance, fee bounds and authority links are checked before simulation. The actual MasterChef pool tuple is `(allocPoint,lastRewardBlock,participant)`, not a generic ERC20 MasterChef tuple.

## Wallet and recovery safeguards

- A review shows sender, destination, asset, exact amount/calldata, fees, native value, gas estimate, referral and exit limitations. It expires after 60 seconds, requires a fresh unchecked consent box, and is invalidated on account/network changes.
- A fixed-block `eth_call` and gas estimate must succeed. Code, permissions/wiring and terms are rechecked before the explicit **Open wallet to confirm** button can request a transaction. Success is only a feasibility check, not proof of safety, suitability or profitability. State and wallet gas pricing can still change before mining.
- The user confirms in their own wallet. No private keys or signatures are retained by this app. No automatic retries or batch broadcasts exist.
- A per-wallet/per-farm transaction journal is persisted before requesting the wallet. Pending hashes are retained even if a card unmounts. Browser storage failures block new requests. Same-origin browser locks coordinate requests, receipts and acknowledgment between tabs; a current browser with Web Locks support is required.
- Pending, uncertain and unverified outcomes stay blocked. A verified receipt or explicit acknowledgment after checking wallet activity is required before another review. Acknowledgment is clearly labeled as the user's decision, not on-chain proof. Never acknowledge a still-pending transaction merely to repeat it.
- Receipt checks match hash, sender, target, calldata, native value, status, canonical mined block and expected deposit event or approval allowance. One observed mined receipt is not an absolute finality guarantee. Transaction hashes link to the direct PulseChain Otterscan viewer.
- The journal keeps the most recent request for each wallet/farm, not a complete portfolio transaction history. Clearing site storage or switching browser/origin removes that recovery context; inspect wallet activity before resubmitting. A failed post-submit storage write can leave the persisted record in `requesting` state, so save the displayed hash and use wallet history.
- Allowance reset currently uses the same strict vault/dependency checks. If those checks block revocation, this UI is not a universal recovery tool; use a separately verified token allowance/revocation interface. Local disconnect does not revoke allowances or wallet permissions.

## Verification performed without transactions

- Final regression run: **135 tests passed**, including 48 transaction tests and 13 journal tests. TypeScript and the separate local production build passed.
- Mock-only transaction tests cover strict amount parsing, call construction, wallet/network changes, runtime/wiring and fee failures, simulation failures, exact approvals, rejection/uncertain outcomes and receipt mismatches/reorgs.
- Mock-storage tests cover bigint persistence, malformed identity/state, unavailable/corrupt storage and all blocking journal states.
- Existing farm-display, mining, governance-read and governance-action regression suites are retained.
- Read-only live smoke checks use a public historical depositor, not a connected user wallet. PLS deposit preflight passed at block 27,523,119 (estimated gas 210,454), and PLSX approval preflight passed at block 27,523,120 (55,501). No transaction was broadcast. Historical PLSX deposit `eth_call` succeeded, but historical gas estimation was not established because the endpoint appeared to use latest allowance state; this is not claimed as a full historical execution test.
- Browser QA checks the live farms preview, disconnected controls and missing-wallet message. No positive real-wallet confirmation or send is tested. Test results do not establish complete economic safety or full protocol parity.

Local test commands (Node required):

```powershell
node --test scripts/test-farm-transactions.mjs scripts/test-farm-journal.mjs scripts/test-farm-display.mjs scripts/test-mining.mjs scripts/test-governance-reads.mjs scripts/test-governance-actions.mjs
node scripts/check-farm-preflight.mjs
node node_modules/typescript/bin/tsc -p tsconfig.app.json --pretty false
node node_modules/vite/bin/vite.js build --outDir dist-transactions-preview --emptyOutDir false
```

The separate local build output preserves the previous `dist` output. Nothing is published. Next stages require exact destination, position-index, fee/penalty, authority and effect checks before enabling claims, withdrawals or governance.
