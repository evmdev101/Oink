# Farm card estimates — local stage

Added expandable recorded positions, contract-address copy, projected reward tables, and a user-price APR calculator. Existing transaction restrictions are unchanged. Farm cards retain neutral borders without glow.

## What the estimate means

Only PLS, PLSX and INC currently qualify. At one snapshot, the reader checks the pinned vault and MasterChef runtime hashes, chain 369, MasterChef address, pool ID, pool participant, reward token, allocation and direct-payout bounds. Other vaults or failed checks return unavailable, not zero.

Pool daily gross OINK = DTXPerBlock × pool allocation / total allocation × estimated blocks per day. Block frequency is measured over the preceding 100 blocks. Wallet estimates multiply by recorded stake / current pool asset balance. Day, week and year are constant-state extrapolations, without compounding. Direct-wallet estimates apply defaultDirectPayout / 10,000. Estimates are not transaction simulations or executable quotes.

APR = annual gross OINK × user-entered OINK USD price / (pool asset balance × user-entered asset USD price) × 100. Direct-wallet reward APR also applies the payout fraction. No live price feed is represented. Fees, funding deductions, gas, future allocation/emission changes, changes in pool balance and changing block frequency are excluded. This is not a net-profit estimate. Existing pending rewards are not added to future projections.

Published behavior references:

- https://github.com/OINK-pls/PiggyBank/blob/main/contracts/masterchef.sol
- https://github.com/OINK-pls/PiggyBank/blob/main/contracts/pulse-ecosystem/tokenVault.sol
- https://github.com/OINK-pls/PiggyBank/blob/main/contracts/pulse-ecosystem/plsVault.sol

Published-source formulas are modeled, not an independent audit of the MasterChef. Runtime identity and live configuration checks do not prove economic safety. See OINK-TRANSACTION-STAGE.md for the limits of prior deployed-source verification.

## Read-only check

At PulseChain block 27,523,477 all three readers passed. The observed block interval was 10.4 seconds and direct payout was 50/10,000. Projected pool gross OINK/day: PLS 7012.876991837095166601; PLSX 35082.412920604080190762; INC 10510.301507046340571024. These are historical estimates, not promised returns. The application refreshes them with each successful snapshot.

Run scripts/check-farm-yield.mjs for a public-read-only refresh. It uses no wallet or signer. No transaction, deployment or publication was performed.

## Remaining work

Verified live price sourcing for automatic APR/USD values; deployment-specific readers for other vaults; funding-aware return modeling; destination-specific locked-miner payout models; claim and withdrawal verification. CashX reward reserves, expiry countdowns and generic stake shares are not assumed to describe OINK.
