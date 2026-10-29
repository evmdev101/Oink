# OINK remaining updates — September 19, 2026

This pass implements the main remaining user flows in the local React interface. It uses the existing PulseChain contracts. No contracts were deployed, no wallet transactions were sent, and the website has not been published.

## Available in this build

| Where | Added behavior |
| --- | --- |
| My miners | A compact Penalty row beside the maturity/grace details shows Roll-Over after maturity, or the verified withdrawal percentage before maturity. There is no separate box or subtitle. Unknown penalties show Check on exit. List view matches. The withdrawal dialog shows the current penalty and return; Withdraw rechecks those terms and opens the wallet directly without a second review window. |
| Miner rollover | Original-style duration selector, live per-destination bonus list, Extend My Miner and wallet-waiting screens. Mature full positions can renew in the same or a verified longer-duration miner. Displayed terms are checked again before sending; closing the dialog preserves pending transaction status. |
| Miners → OINK sale | Pay with PLS, PLSX, INC or HEX, with liquid-wallet or 1/3/5-year miner destinations. Exact token approvals and allowance resets are separate reviewed actions. |
| Miners → Referral | Generate links for this deployment and claim ongoing referral rewards to a wallet or supported miner. |
| Incoming referral links | Validate the original base58 code, display the full selected address and a Clear control, and apply it to new farm referrals. Existing on-chain referrers take precedence; self-referrals are ignored. The actual referrer is shown and rechecked in deposit reviews. |
| Farms → Manage HEX shares | Register existing HEX stake shares, claim rewards, or unregister and settle rewards. Payout destinations and waiting periods are checked. HEX remains in its original stake. |
| Governance → Ordinary proposals | Manage voting credit and create, support, oppose, veto or execute proposals in ten verified categories. |
| Governance → Miner voting | Vote with a miner's shares, set/remove delegates, cast delegated votes, and convert selected miner shares to voting credit. Irreversible consequences appear in the review. |
| Protocol → More OINK tools | Contributor and launch-reward distribution claims use locally bundled, verified Merkle proofs. Live maintenance status and original-tool links remain available. |
| Protocol → Farm recovery | Independent emergency recovery avoids waiting for prices, distribution, maintenance or dashboard rewards. Emergency withdrawal forfeits that position's OINK rewards. |

Ordinary categories are voting cost, enforcement delay, rollover bonus, harvest call fee, reward-event threshold, pool allocation, vault settings, Governor tax, Governor transfer/burn and reward boost. Original-tool links remain for advanced features.

The new write flows share simulation, account/network checks, fresh pre-send reviews, exact transaction data, cross-tab wallet-request coordination, persisted pending/uncertain status, and receipt verification. Existing miner and farm flows also block an unresolved protocol request. Neither an event alone nor an RPC success response is treated as proof of the expected result.

## Contract findings that affect the interface

- The original sale locks only the 1/3/5-year destinations. Shorter-duration selections were removed because those addresses would instead produce liquid OINK. The sale has no on-chain minimum-output parameter or deadline; its quote can change before mining. This limitation appears on the page and in reviews.
- At the checked snapshot the launch-reward distribution had zero reward credit. Claims are disabled when funding is unavailable even if a wallet has a valid allocation. Contributor distribution credit was available. These are current reads, not permanent assumptions.
- Voting-credit deposits burn liquid OINK and are not redeemable. Miner-share conversion removes shares and sends their represented OINK to the Governor. Ordinary voting consumes credit; the deployed fallback can burn wallet OINK if credit has been consumed elsewhere before mining. Reviews disclose this behavior.
- The Penalty row shows Roll-Over after maturity as on the original site. This is a renewal status, not a promise of a free withdrawal: the withdrawal dialog retains the actual early/late percentage from verified contract rules.

## Verification

- Full regression suite: **621 tests passed**, none failed or skipped.
- TypeScript check and production Vite build passed.
- Source recompilation/runtime matching and read-only live checks are recorded in the evidence below. Sale/approval, HEX settlement and contributor-claim simulations used `eth_call`/gas estimation only.
- All **4,288 unique distribution/address entries** in the bundled proof file were checked against the pinned on-chain roots. Duplicate valid reward allocations use the larger allocation, not their sum.
- Production preview uses a repository-style `/oink-launch/` path to check routes, assets and the distribution proof file.
- Browser checks confirmed governance navigation/controls, loaded sale inventory and a live amount quote, HEX-share management, distribution funding and maintenance values, the independent recovery tab, and referral address capture/clear while preserving the hosted path. Production preview logged no browser errors during these checks.
- Miner penalty states (early, grace, late and unknown) were rendered using the actual component/CSS in an isolated read-only fixture. Desktop and 390-pixel mobile layouts fit; mobile distribution cards also fit without page overflow. Fixture amounts were sample data, not connected-wallet balances. Temporary preview servers were stopped after verification.
- Rollover tests cover destination-specific rates, one-block selector reads, trust/credit/lock checks, carried mandatory service, exact receipt correlations, changed terms, wallet rejection, duplicate requests and closing during wallet confirmation. Browser fixtures checked the duration/bonus dialog and wallet-waiting screen with simulated data only.
- At PulseChain block 27,586,853, a read-only probe matched all six miner runtimes and locks. The 3-month miner's same/longer destination rates were 1.5%, 2%, 2.5%, 3% and 1%, with the required cross-pool trust available. These are snapshot values, not fixed UI constants.

Detailed evidence:

- [Sale and referrals](evidence/offer-referral-review.md)
- [HEX shares, distributions and maintenance](evidence/access-review.md)
- [Ordinary governance receipt checks](evidence/ordinary-receipt-review.md)
- [Voting-credit and miner participation](evidence/participation-review.md)
- [Expanded farm support](OINK-FARM-EXPANSION-2026-09-19.md)

## Remaining boundaries before launch

The four previously deferred farms (pDRIP, EMIT, pTGC and UFO), partial miner operations, HEX-share recalculation, new-pool proposals, Senate administration, treasury requests/grants, Governor replacement creation/finalization, NFT allocation and maintenance transactions remain in the original tools. Their contract-specific limitations are documented; they are not silently treated as enabled here.

HEX recalculation is intentionally absent because the deployed path has accounting behavior needing a separate contract review. Registration can be refreshed through settlement/unregistration and then registration. Maintenance status does not invent the old interface's absent Governor reward getter.

The production site origin/repository still needs to be selected and published. Real installed-wallet signing/mining and mobile wallet-browser behavior have not been exercised in this pass. The implemented transaction path supports standard externally owned wallets; WalletConnect/QR and smart/delegated-code wallets are not established. Source/runtime matching, simulation and tests are not a security audit.
