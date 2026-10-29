# Deposit token review: pUSDC, pDRIP, EMIT, Communis, pTGC, UFO

Read-only review for the next ordinary-farm write expansion. This document does not authorize transactions. No signer, wallet permission request, transaction broadcast, or local-fork transaction was used.

## Reproduction and evidence

Run `node scripts/verify-expanded-tokens-b.mjs --block=27586251`. Add `--refresh-sources` to fetch explorer source again. Without an explicit block, the script takes one current snapshot. RPC transport timeout is 15 seconds; source/compiler fetches are bounded to 25/30 seconds.

Snapshot: PulseChain chain ID 369, block **27586251**, block hash `0x32b9a33af567db28a5924e0194a646f527a7b0d933e6c184512c21edcabd7ef5`, timestamp 1789830485. The block hash is read again after all token checks. `expanded-tokens-b.json` stores full runtimes, compiler settings, source hashes, implementation-slot reads, getter results and read-only call results. The `expanded-tokens-b-*-source.json` files are exact explorer response caches, including additional Solidity source units. `*-main.sol` files are convenient extracted review copies.

Verified explorer source is compiled with its reported Solidity version, optimizer and EVM settings. Compiled and deployed executable bytes must match after Solidity metadata removal and only compiler-declared immutable masking. All reviewed group-B contracts have no compiler-declared immutables. Full, unmodified runtime hashes are retained for application preflight pins. pDRIP's proxy matches, but its implementation lacks verified source and is explicitly excluded.

## Support recommendation

| Token | Decimals | Recommendation for this stage | Reason |
|---|---:|---|---|
| Communis (`communitas`, COM) | 12 | Support with runtime pin and existing standard-token preflight | Exact inherited ERC20 transfer accounting; no transfer hooks, proxy, tax, pause, blacklist or rebase |
| pUSDC | 6 | Support only with additional proxy and pause/blacklist guards | Exact ERC20 accounting in verified live implementation, but proxy and administrative transfer restrictions are mutable |
| pDRIP | 18 | Keep original-site link | Live implementation has no explorer-verified source |
| EMIT | 18 | Keep original-site link | Nonwhitelisted transfers burn 1% and retain 4% for staking, and can invoke a swap/rewards path; farm vault is not whitelisted |
| pTGC | 18 | Keep original-site link | 5% standard P2P fees, reflection balance accounting, staking callback and token-lock accounting; farm vault is not exempt |
| UFO | 18 | Keep original-site link | 6% fees including 1% reflection, reflection balance accounting and mutable LPStaking callbacks; farm vault is not exempt |

These recommendations concern compatibility with the application's existing exact-principal review and receipt checks. A successful ERC20 `eth_call` alone does not establish exact received amount, transfer-tax absence, future administrative behavior, economic safety, or live wallet compatibility.

## Communis

- Token: `0x5A9780Bfe63f3ec57f01b087cD65BD656C9034A8`.
- Full runtime hash: `0x7db9a94e27f245936f2ae956fc3c7931e3087fdb2628fae0afe0968141e0af3c`.
- Recompiled with Solidity `v0.8.16+commit.07a7930e`, optimizer 200, EVM Petersburg; executable matches.
- `approve` (main source line 278), `transfer` (255) and `transferFrom` (300) return `true` after success. `transferFrom` spends allowance; maximum allowance is not decremented. Existing exact-amount allowance policy remains appropriate.
- `_transfer` (368) subtracts and adds exactly `amount`. `_beforeTokenTransfer` (500) and `_afterTokenTransfer` (520) are empty and not overridden. Communis's only override of ERC20 behavior is `decimals()` (596), returning 12.
- The HEX reference serves Communis mining/minting functions. It is not invoked by approval or transfer paths. There are no mutable owner/fee/blacklist/pause switches on those paths.
- Read-only calls from the farm vault observed ABI boolean `true` for approve(1), transfer(1) and transferFrom(0). The source/runtime comparison, not these small simulations, establishes exact accounting.
- Primary source: [PulseChain verified token](https://scan.pulsechain.com/address/0x5A9780Bfe63f3ec57f01b087cD65BD656C9034A8#code).

## pUSDC

- Proxy: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`.
- Proxy full runtime hash: `0xd80d4b7c890cb9d6a4893e6b52bc34b56b25335cb13716e0d1d31383e6b41505`.
- Implementation slot: `0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3` (`keccak256("org.zeppelinos.proxy.implementation")`, **not** the EIP-1967 slot).
- Snapshot implementation: `0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf` (FiatTokenV2_1).
- Implementation full runtime hash: `0x10d68f9bb2ba9f5e9163cadc4a3446be0c6b2ab8b1b65079e79dcd94a6dc329c`.
- Proxy independently recompiles with Solidity 0.4.24, optimizer off; implementation independently recompiles with Solidity 0.6.12, optimizer 10,000,000, EVM Istanbul. Both executable byte comparisons match.
- Implementation `approve` (788), `transferFrom` (824), and `transfer` (852) return `true`; `_transfer` (870) directly subtracts/adds the same requested value and emits it. No fee, reflection, rebase, router or external callback occurs in these methods.
- `approve` requires not paused and both owner and spender not blacklisted. `transferFrom` checks caller, source and recipient; `transfer` checks caller and recipient. Nonzero source/recipient and adequate allowance/balance are required. Unlike some ERC20 tokens, `transferFrom` decrements even maximum allowance.
- Each application preflight/revalidation must pin proxy runtime, read the implementation slot, require the expected implementation address, pin implementation runtime, check `paused() == false`, and check `isBlacklisted(address) == false` for account, vault and any fee treasury participating in a token transfer. Normal token-decimal, allowance, balance and exact-call simulation checks still apply. Any changed implementation must invalidate the pending review.
- Live proxy admin slot: `0x10d6a54a4754c8869d6886b5f5d7fbfa5b4522237ea5c60d11bc4e7a1ff9390b`; admin address `0x807a96288a1a408dbc13de2b1d087d10356395d2`. Transparent proxy admin cannot use fallback; exact-call simulation rejects that edge case. Admin may change/upgrade implementation, and pauser/blacklister may alter transfer restrictions after a preflight.
- Snapshot: `paused=false`; farm vault not blacklisted; approve(1), transfer(1), transferFrom(0) all returned boolean true.
- Primary sources: [proxy](https://scan.pulsechain.com/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48#code), [implementation](https://scan.pulsechain.com/address/0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf#code).

## Deferred tokens

### pDRIP

The transparent proxy's full runtime hash is `0x6bec2bf64f7e824109f6ed55f77dd7665801d6195e461666ad6a5342a9f6daf5` and its source recompiles exactly with Solidity 0.8.9, optimizer 200. EIP-1967 slot `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc` contains `0x565a58a0ac78d2a2e2a8f4dd0ec006f8b3afd281`; its runtime hash is `0x9438911f90e699373445c81073207c2fbedfcf94f1d0728c2c9aea434df42d53`. Explorer source response contains only its address, no ABI/source/compiler. Therefore approval return convention, transfer taxes, reflection and mutable switches are unverified. The proxy administrator is `0x1a33dc938ba148362163f8e1cefba7ebae676ace`. Do not infer implementation semantics from a standard proxy ABI or token name.

Primary sources: [proxy](https://scan.pulsechain.com/address/0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68#code), [unverified implementation](https://scan.pulsechain.com/address/0x565a58a0ac78d2a2e2a8f4dd0ec006f8b3afd281#code).

### EMIT

Full runtime `0xfc47a5d6dd16377039e483a23ad342dd1296b0bd1f1ccfbb0c220c8ddb7b3542`; source recompiles exactly (0.8.20, optimizer 200, Paris). `_transfer` (main source 109) uses plain ERC20 accounting only if either participant is whitelisted. Otherwise it may run `swapBack`, burns `amount * 100 / 10000`, transfers `amount * 400 / 10000` to itself, and only transfers the remainder to the recipient. SwapBack interacts with PulseX and may top up the configurable reward contract. `addWhitelist`, `removeWhitelist`, reward address and thresholds are owner mutable. The vault's `isWhitelisted` is false. The 1-wei simulation returning true rounds fees to zero and must not be mistaken for tax exemption. Approval itself follows ERC20 boolean semantics; full exact-principal support would need a different reviewed model or a live vault-whitelist requirement maintained throughout transaction confirmation.

Primary source: [EMIT](https://scan.pulsechain.com/address/0x32fB5663619A657839A80133994E45c5e5cDf427#code).

### pTGC

Full runtime `0x5f67ca880f42b0293e2e8a56aa7163a8cadb6a8690ae2bbd5dd2f322897b53b8`; source recompiles exactly (0.8.2, optimizer 200). `_transfer` (371) checks positive amount and unlocked balance, accounts holders and optional max-wallet limits, and invokes reflection-aware transfer routines. The ordinary P2P fee arrays select 100 bps reflection, 100 staking, 200 DAO, 50 liquidity, 50 burn: 5% total. Staking fee calls `stakingContract.updatePool`. Vault is not fee-excluded, not reflection-excluded, not an AMM pair, and its `lockedAmount` is zero at the snapshot. Owner is renounced at zero, but the staking contract still has locking-related powers defined in token methods. Balances may rise from reflections despite fixed nominal `totalSupply`. Approve returns boolean; transferFrom returns boolean on successful positive transfer but rejects a zero amount. This is not compatible with an unconditional exact-received-amount assumption.

Primary source: [pTGC](https://scan.pulsechain.com/address/0x94534EeEe131840b1c0F61847c572228bdfDDE93#code).

### UFO

Full runtime `0x2ffa98dffdc6b9726c95fe058b0b356b2f1d0a630a4a939d9b942ea166b3630e`; source recompiles exactly (0.8.2, optimizer 200). `_transfer` (223) uses reflection accounting and a configurable LPStaking contract. Ordinary transfer fee values are 100 bps reflection, 100 buy/burn, 100 pTGC buy/burn and 300 LP providers: 6% total. Pair transfers can initiate swap/buyback/LP distribution; even other transfers call `LPStaking.process` within try/catch. Owner can change LPStaking, fee exemptions, reflection membership, swap threshold and processing gas. Vault is not fee-excluded or reflection-excluded and is not a liquidity pair. ERC20 approve/transfer/transferFrom return booleans, but that does not establish exact recipient amounts. Defer pending dedicated fee/reflection and callback review.

Primary source: [UFO](https://scan.pulsechain.com/address/0x456548A9B56eFBbD89Ca0309edd17a9E20b04018#code).
