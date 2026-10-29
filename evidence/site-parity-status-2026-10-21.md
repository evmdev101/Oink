# OINK site parity and live-data review — October 21, 2026

## Completed

- Treasury Wallet Holdings now reads the treasury wallet only. It no longer adds the Governor's OINK to that heading.
- Restored PRINT, EARN and the three HEX Time Tokens, with exact token decimals checked on-chain. HEX Time Token has an expandable breakdown.
- Includes additional nonzero supported treasury assets such as pDAI, Communitas, HOA, ATROPA, SolidX, pUSDC and pUSDT.
- Added the wallet USD total. If a nonzero balance lacks a current price, the display labels the amount as a known subtotal rather than a complete total.
- Protocol-owned OINK/PLS liquidity retains the treasury's ownership fraction and now shows its combined USD value.
- Added Treasury farming positions: all three documented PRINT strategies, six HEX Time Token strategies, and the documented EARN helper. These include underlying LP assets, loose strategy assets and separately staked PRINT. Farming assets are separate from spendable wallet assets and from the treasury's OINK/PLS liquidity.
- Farming positions have their own value, a wallet-plus-farming value, and an expandable list of every tracked strategy. Pending farm rewards and unverified assets are excluded.
- Reward allocation now exposes every registered pool, including inactive pools, unfamiliar contracts and NFT pools. Percentages come from current registry points and pool addresses, rather than old fixed percentages or assumed pool order.
- Added Show all OINK balances & supply: issued and virtual supply, treasury and Governor balances, current and legacy referral reserves, and distribution reward credit. Credit and token balances are explicitly distinguished.
- Home balances, treasury, farming positions, reward allocation, recent protocol activity, portfolio history and Docs treasury activity refresh automatically. Latest views refresh every minute; failures retry. Browsing historical pages pauses replacement of that history until the user returns to latest data.
- Added visible update times/block numbers and freshness handling. Expired balances and expired prices do not masquerade as current values.
- Finished the earlier sale request: enter desired OINK, see the calculated payment, and use Max when connected to PulseChain. Max respects wallet funds and available sale inventory, with a native PLS fee buffer. Miner bonuses are included in the entered receive target.
- Corrected obsolete documentation about supported governance actions and fixed farm counts.

## Why the figures can still differ from the original

The original overview obtains treasury figures from its off-chain API. The local version reads current, fixed-block chain state and current market quotes. Some original treasury figures reflect deployed farming assets; a wallet-only balance is therefore not equivalent to the combined figure. The local site now shows both categories explicitly.

The original feed's nonzero EARN amount could not be reconciled with current balance reads for the treasury wallet, the documented EARN helper, and that helper's staking registry. Those current reads returned zero. A matching number has not been invented or copied from a feed without an independently verified update time.

The local total additionally includes other supported assets actually held by the treasury. Original displayed USD prices and its supported asset selection can differ. Pending rewards and OINK/PLS liquidity are not silently counted a second time.

Live reader results, exact balances, block numbers and quotes are saved in `treasury-wallet-live-2026-10-21.json`. At the verified snapshot, the ten tracked farming strategies all returned successfully. Across the PRINT strategies, the reader found approximately 1.62 million PRINT; all three HEX Time Token variants had deployed positions.

## Remaining functional differences

These are still differences from complete original-app transaction coverage, not missing dashboard numbers:

1. Partial miner withdrawals and partial transfers are not enabled.
2. PDRIP, EMIT, pTGC and UFO have public readers but do not have the same verified write integration as the supported farms.
3. Buyback execution, treasury farming maintenance and some shared allocation maintenance actions remain status views or original-app workflows. Reward Boost follow-up controls are already implemented separately.
4. Full NFT holdings and transaction workflows remain in the linked NFT dashboard; NFT governance allocation controls are available locally.
5. Treasury inflow summaries cover supported ERC-20 transfers. Native PLS transfers and arbitrary unrecognized tokens are excluded and labeled as such. They would require a separately verified indexing source for complete history.
6. The farming reader covers the ten explicitly listed strategies, not arbitrary future governance deployments. New strategy types need an identified reader before their positions can be valued.

## Validation

- TypeScript check and production build passed.
- Full automated suite: **882 passed, 0 failed**.
- Treasury valuation tests cover independent prices for each HEX Time Token, partial totals, missing/stale prices, exact decimals and wallet-only accounting.
- Strategy tests cover LP ownership rounding, combining loose and deposited LP exactly once, separately staked PRINT, changed contract mappings, failed reads, cancellation and canonical block changes.
- Sale tests cover all four payment assets, miner bonuses, minimum sufficient reverse quotes, wallet/inventory limits and fee reserves.
- Browser verification confirmed treasury and farming values, current allocation data, update timestamps and the desired-OINK sale field. A live target of 1,000 OINK produced payment quotes in PLS and HEX.
- No wallet approval, purchase, deployment, governance vote or other chain transaction was submitted.

## Primary references

- Original UI: https://oink-pls.github.io/Piggy-Bank-UI/
- Original dashboard source: https://github.com/OINK-pls/Piggy-Bank-UI/blob/main/js/index.js
- Original contract directory: https://github.com/OINK-pls/PiggyBank
- Original feed: https://api.oink-pls.com/api/treasuryBalances.txt
- Deployed strategy source/ABI responses: `treasury-strategy-sources-2026-10-21.json` and `treasury-earn-staking-source-2026-10-21.json`.
