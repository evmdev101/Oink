# OINK launch implementation progress — September 19, 2026

This records the first implementation pass following [the launch review](OINK-LAUNCH-REVIEW-2026-09-19.md). That review remains unchanged as the before-state. Work in this pass changed local application code and tests; no real wallet transaction or website publication was performed.

## Completed changes

| Change | Result and implementation evidence |
| --- | --- |
| Clear purchase and deferred-tool access | Home exposes Buy OINK. Shared original-tool URLs cover existing miners/farms, voting credit, voting/delegation, Senate, upgrades, treasury/grants, maintenance, distribution claims and external NFT tools. See `src/pages/DashboardPage.tsx`, `src/config/links.ts` and the current navigation/components that render those links. |
| Assets under a repository URL | Shared asset resolution uses the Vite base instead of assuming the domain root. The production configuration retains `base: './'` and hash routing. See `src/lib/assets.ts`, `vite.config.ts` and `src/App.tsx`. |
| Recoverable public reads | `src/lib/publicRpcProvider.ts` provides bounded, read-only HTTP batches, endpoint health/failover and per-batch chain verification. Explicit block parameters remain intact. Contract reverts are retained rather than retried as successful reads. Signing and broadcast methods are rejected by this provider. `src/lib/chain.ts` supplies it to the app. |
| Recoverable wallet sessions | `src/lib/walletSession.ts` bounds noninteractive reads and interactive requests, releases cancelled work and rejects stale responses. Default deadlines are 15 seconds for reads and 120 seconds for interactive connection/network requests. Provider/account selection remains explicit. |
| Same-pool miner renewal | All six verified miner models accept a mature full-position rollover into the same pool. `src/components/MinerActions.tsx` exposes renewal; `src/lib/positionPreviews.ts` verifies the exact position, strict maturity, live bonus, Governor reserve and nonzero bonus shares before simulation. |
| Farm emergency exit | PLS/PLSX/INC withdrawal UI offers an explicit emergency option. It returns the remaining staked asset after funding fees and forfeits pending OINK rewards. `src/components/PositionActionPreview.tsx` makes the forfeiture explicit; `src/lib/positionPreviews.ts` bypasses reward-accounting reads for this recovery route. |
| Recovery during dashboard failures | Protocol → More OINK tools includes independent emergency recovery. `src/lib/farmRecovery.ts` reads only the selected farm's position count and recorded stakes, with runtime, chain and canonical-block checks. Twenty-position pages and an index lookup cover large wallets without depending on reward or price reads. Farms exposes the route in its error state and footer; the normal complete-values loader remains unchanged. |
| Receipt verification for new actions | `src/lib/positionTransactions.ts` requires matching miner `AddAndExtendStake` and Governor `GiveRolloverBonus` events for rollover. Emergency exit validates the source vault's `Withdraw(sender, stakeID, 0, netPrincipal)` semantics; its final ABI field is misleadingly named `penalty`. |
| Repeatable validation and CI | `pnpm test` runs `scripts/test-*.mjs`. `.github/workflows/deploy-pages.yml` runs tests as well as the production build before its existing Pages deployment job. README now describes current actions and commands. |

## Action boundaries retained

- Miner renewal is a same-pool, full-position action after maturity. It renews the nominal duration, adds the Governor-funded bonus to the miner and resets the additional mandatory-service value to zero. Early/late withdrawal penalties still apply to the renewed position. This does not add partial actions, top-up/recommit before maturity, or rollover into a different pool.
- Emergency withdrawal is limited to the existing verified PLS/PLSX/INC deployments and returns to the connected wallet. It still charges funding fees, including the existing per-collection 20% cap. It does not claim or redirect OINK rewards.
- Preflight preserves runtime/dependency verification, fresh block/account/network checks, simulation and gas checks. Confirmation runs another preflight. Changed terms or reduced outputs require review again; sends are not automatically retried.
- Broader farm assets, HEX T-Shares, native governance/voting-credit/delegation/Senate/treasury actions, native sale/referral/distribution claims and native NFT/maintenance workflows remain outside this pass. Their existing external tools remain available through links.

## Contract evidence

The rollover implementation follows `contracts/mining/1Month.sol:228–261,432–449` and `contracts/governor.sol:140–147` in the inspected PiggyBank source. The same rollover and extension function bodies occur in all six inspected miner contracts. The one-month implementation and Governor bonus functions were also compared with the explorer-published sources during this pass.

Emergency behavior follows `contracts/pulse-ecosystem/plsVault.sol:233–243,392–419` and `contracts/pulse-ecosystem/tokenVault.sol:237–247,397–424`. Relevant functions matched explorer-published source, and the PLS/token-vault source hashes matched existing verification metadata. Preflight continues to use the deployed-runtime allowlists in `src/config/minerPreviewVerification.ts` and `src/config/farmWriteVerification.ts` rather than allowing arbitrary ABI-compatible contracts.

These checks establish the implemented call model and its scope; they are not a new smart-contract security audit or proof of future execution.

## Validation

- Focused position backend checkpoint: **64 tests passed** across `scripts/test-position-previews.mjs` and `scripts/test-position-transactions.mjs`; project typecheck passed at that checkpoint.
- Tests cover strict maturity boundaries, zero/dust bonuses, insufficient Governor reserves, zero funding fees, the funding cap, insufficient vault liquidity, failed simulations, changed terms, avoiding reward reads during emergency recovery, and rejecting missing/mismatched/removed receipt events.
- Final combined regression run: **293 passed, 0 failed** (`node --test scripts/test-*.mjs`). This includes 14 public-RPC tests, 23 wallet-session tests, 64 position-action tests and 10 independent recovery-reader tests.
- Final typecheck and production build passed using `node node_modules/typescript/bin/tsc -p tsconfig.app.json --pretty false` and `node node_modules/vite/bin/vite.js build`.
- Browser checks: the production build served at `http://127.0.0.1:4190/oink-launch/` loaded Home and all 17 farm cards with public values. Home, farm and wallet image checks found no completed broken images. Buy OINK and direct original-tool links were present. Emergency withdrawal switches the dialog to principal-only return and explicit reward forfeiture; disconnected review stays disabled. The same-pool renewal menu/dialog was checked through the existing isolated, disconnected UI fixture.
- Phone-width checks at 390 × 844 covered Home, wallet picker, renewal dialog and Protocol's independent recovery section/asset selector. The recovery page had no document-width overflow; the existing navigation uses its own horizontal scroll. The viewport override was reset after checking. These are browser layout checks, not real mobile-wallet verification.
- Live public recovery reads passed for all three farms at block 27,586,221 using neutral address `0x0000000000000000000000000000000000000001`. Runtime checks were active and each result correctly reported zero positions. Production Governance also completed its initial scan at block 27,586,214. No wallet connection or transaction was requested by these checks.

## Remaining release checks

Verify installed-wallet connect/reject/cancel/reload, account and network switching, review expiry and receipt recovery in a wallet-enabled browser. Verify mobile wallet browsers and the final hosted prefix/origin. Standard externally owned wallets are the supported transaction account type; ordinary mobile browsers without an injected provider, WalletConnect/QR and smart/delegated-code wallets are not established by the current tests.

The broader feature gaps in the launch review remain relevant where not explicitly completed above. Retain access to the old application until replacement actions exist and have been verified. No Pages publication was performed in this pass.
