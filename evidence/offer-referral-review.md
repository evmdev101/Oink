# OINK sale and referral review — 19 September 2026

This pass adds the original sale and referral-redemption actions to the new interface. It does not deploy contracts or send transactions.

## Verification

`scripts/verify-offer-builds.mjs` fetched primary PulseChain explorer sources and compiled the deployed sale, current referral contract, legacy referral contract and four pricing pairs. Executable bytecode matched at block **27586410**. Only compiler-declared immutable offsets and Solidity metadata were excluded from compilation comparisons; full deployed runtime hashes are pinned in `src/config/offerVerification.ts`. Sources and compiler hashes are recorded in `offer-builds.json` and `offer-sources/`.

`scripts/read-offer-state.mjs` records the sale's OINK/Governor/treasury wiring, pair token ordering/reserves and the 17 current referral point sources. The latter list is pinned explicitly: a new point source requires review instead of being silently trusted. The legacy contract is read only to subtract prior redemptions.

## Sale behavior

- Payment assets: native PLS, PLSX, INC and HEX. HEX uses 8 decimals; all other payment assets use 18. Intermediate multiplication/division follows the deployed contract's integer operation order, including HEX normalization.
- All payment goes to the current, reviewed treasury. There is no separate sale fee.
- Only the **1-year, 3-year and 5-year** miner addresses create locked miners. They receive 11%, 18% and 25% extra OINK. Other addresses in the deployed contract select liquid payment to the buyer. The previous display incorrectly listed shorter miners; these choices have been replaced with an explicit liquid-wallet option.
- Tokens use an exact-amount approval followed by a separately reviewed purchase. A nonzero allowance must be cleared before a replacement approval. Approval simulations must return a canonical `true` value.
- Reviews check full runtime hashes, token decimals/balance/allowance, Governor wiring, both price-pair tokens and nonempty reserves, minimum price, inventory and the selected miner's deployed model and gift/share feasibility. Contract quotes must match the independent integer calculation.
- **The existing sale contract has no minimum-output argument or deadline.** A fresh review can detect changed terms before opening the wallet but cannot guarantee output at mining. The page and confirmation review say this explicitly. A receipt with output below the reviewed amount remains unresolved rather than being labeled a matching success.
- Receipt checks require BUY plus the matching liquid transfer or miner GiftDeposit. ERC20 payment additionally requires the exact payment transfer from buyer to reviewed treasury; all sale receipts recheck treasury wiring in the mined block.

## Referral behavior

- Available points equal the current total minus both the current and legacy redeemed totals. The current Governor bonus is applied first, then the PLS vault's destination payout rate, in raw integer units.
- The full selected point amount is consumed, including points whose reward is reduced by the chosen destination. Reviews show consumed points, remaining points, gross OINK, deduction, net OINK, destination, mandatory service and miner terms.
- Wallet claims return liquid OINK. Active miner destinations create a gift miner owned by the caller. Empty/underfunded rewards, inactive routes, changed registered point sources and invalid miner configurations block preparation.
- Generated links use the current deployment's origin and path and the original numeric base58 encoding. Visiting `?r=...` validates and saves the address, then removes the parameter so clearing cannot accidentally reselect it. A visible notice shows the full address and clear control.
- Farm deposits retain a farm's existing `referredBy` value. A selected link is supplied only when no referral exists. Self-selection supplies zero. The actual resulting referrer appears in the review and must match the deposit event. Saved journals accept the optional new fields while older entries remain readable.
- Changing the selected referral invalidates an open deposit review. Pre-send preparation uses the reviewed selection and rechecks the on-chain referrer and calldata; it never reads a new selection into an already-approved transaction.

## Validation

At this handoff, 118 focused mock tests pass across offer transactions, referral links/storage, farm transactions and farm journals. TypeScript checks pass. These tests use in-memory providers and do not connect a wallet.

`offer-preflight.json` records live public read-only checks: all four payment quotes, PLS purchase simulations into the wallet and all three supported locked destinations, and exact PLSX/INC/HEX approval simulations passed. The public treasury address was used as an `eth_call` sender; no keys, connected wallet, approvals or transactions were used. The sampled referral balance was zero, so that account did not provide a live positive-balance claim simulation.

These checks verify the implemented contract paths and current wiring; they are not a security audit or a guarantee of execution, liquidity or returns.
