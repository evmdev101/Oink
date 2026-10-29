# OINK Feature and Contract Map

Current status (2026-09-11): selected PLS/PLSX/INC deposits and exact approval/reset flows are now enabled with wallet confirmation. See [transaction-stage evidence and limitations](OINK-TRANSACTION-STAGE.md). Claims, withdrawals, other farms, mining management and governance writes remain disabled. The Stage 1 descriptions below are preserved as the original historical reference, not the current global transaction status.

Research date: 2026-09-06

## Authority and provenance

- Project website: https://oink-pls.com/
- Official application linked by the project website: https://oink-pls.github.io/Piggy-Bank-UI/
- Application source: https://github.com/OINK-pls/Piggy-Bank-UI
- Published contract directory: https://oink-pls.com/smart-contracts.html
- Contract source linked by the project website: https://github.com/OINK-pls/PiggyBank
- PulseChain explorer: https://scan.pulsechain.com/

The official application repository snapshot inspected for this map had commit `e3500c8c81c3684556aa6c1a9679a2c7dd069428` dated 2026-01-10. The contract-source repository snapshot had commit `cf49720c083f098b2fb7c8c636cfa0e91ae8be05` dated 2025-01-11. Repository dates describe source activity, not deployment dates or bytecode equivalence.

The official application currently uses an injected browser wallet, PulseChain RPC access, and the `https://api.oink-pls.com/` service. This local build does not reuse its signer or transaction code.

## Current official application surface

| Area | Official routes observed | Current documented functionality | Local Stage 1 treatment |
| --- | --- | --- | --- |
| Dashboard | `index.html` | Treasury inflows, estimated OINK annual mining rewards, locked versus liquid supply, miners by lock-up | Public RPC snapshot only |
| OINK time mining | `create-miner.html`, `view-all-miner.html`, `view-miner-card.html` | Create or gift miners; view and manage miners; documented withdraw, transfer, hop, rollover, recommit, and divisible/partial operations | Six duration contracts listed; form disabled |
| Ecosystem mining | `pulse-ecosystem-mining.html`, `view-pulse-ecosystem-miners.html`, `referral.html` | Mine OINK with supported PulseChain assets, view positions, and use referrals | Seventeen vault contracts listed; account reads and writes disabled |
| Basic governance | `basic-settings.html`, `reward-boost.html`, `pools-farms.html`, `add-token.html`, `NFT-allocation.html` | Cost to vote, enforcement delay, rollover bonus, mining fees, reward events, pool allocation, new token, and NFT allocation | Always-open local draft UI; proposal reads and writes disabled |
| Consensus | `miner-voting.html`, `senate.html`, `delegate-vote.html`, `propose-upgrade.html` | Miner voting, Senate actions, delegation, and upgrade proposals | Modules mapped; thresholds and voting math not assumed |
| Treasury and deflation | `governor-tax.html`, `treasury.html`, `treasury-deposit.html`, `issue-miner.html`, `token-burn.html`, `available-actions.html` | Governor tax, treasury transfers, miner grants, token burns, buy-back, reward maintenance, pool rebalancing, and mining-fee collection | Modules mapped; every write disabled |
| Voting credit | `voting-credit.html` | Check, deposit, redeem from active miner, and burn voting credit | Contract listed; units and conversion behavior not assumed |
| Distribution and sale | `claim.html`, `pig-offering.html` | Distribution claim and a separate sale surface | Documented only; outside current build stage |

## Core contracts

| Role | Address | Candidate source file |
| --- | --- | --- |
| OINK token | `0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38` | `contracts/XPD.sol` |
| Governing contract | `0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16` | `contracts/governor.sol` |
| Inflation | `0x486fEa20eA242456b450B005ED7D019E3E984f28` | `contracts/masterchef.sol` |
| Senate | `0x147B43930283d1DDe43d805B7f17E4604b7ca493` | `contracts/senate.sol` |

## Distribution contracts

| Role | Address | Candidate source file |
| --- | --- | --- |
| Contributors | `0xE87C806f8AFA1cE543ab3C44D1c4b130B83574CE` | `contracts/token-distribution/distributionToContributors.sol` |
| Rewards | `0x51Aeb56C05a2BD781207B63D395475b7185c5fd7` | `contracts/token-distribution/distributionExtraPenalties.sol` |

## OINK time-miner contracts

| Duration | Address | Candidate source file |
| --- | --- | --- |
| 1 month | `0x39b3E852D6fFA1aF6694Ef87C062450de6778da8` | `contracts/mining/1Month.sol` |
| 3 months | `0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4` | `contracts/mining/3month.sol` |
| 6 months | `0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67` | `contracts/mining/6month.sol` |
| 1 year | `0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1` | `contracts/mining/1year.sol` |
| 3 years | `0x15b51Ece819f3B51ce814de67bB2419660701a3c` | `contracts/mining/3year.sol` |
| 5 years | `0xf3E82f4123d4262a2baEC25b03652f3932A91739` | `contracts/mining/5year.sol` |

These addresses are independent contracts. Reward multipliers, voting weight, early-end penalties, grace periods, rollover bonuses, and amount units must be verified from deployed getters and bytecode-matched ABIs before use.

## PulseChain ecosystem reward vaults

| Asset or role | Address | Candidate source family |
| --- | --- | --- |
| PLS | `0xE145932f6b010B0166aA6860D56b2730744B7d6f` | `contracts/pulse-ecosystem/plsVault.sol` |
| PLSX | `0x16233F6d7398f134EbCec11101e792c03ED296a4` | `contracts/pulse-ecosystem/tokenVault.sol` |
| INC | `0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868` | `contracts/pulse-ecosystem/tokenVault.sol` |
| HEX | `0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03` | `contracts/pulse-ecosystem/tokenVault.sol` |
| HEX T-Share | `0x6b465C480CD590852f90c8f1b41Ab22922a1BF85` | `contracts/pulse-ecosystem/hexSharesVault.sol` |
| HOA | `0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21` | `contracts/pulse-ecosystem/tokenVault.sol` |
| pDAI | `0xc13b8974CD5caa67D7e539D2654C872b5AcA5105` | `contracts/pulse-ecosystem/tokenVault.sol` |
| ATROPA | `0x7c61919AccF037975bbD3a91b0F5811c640018b1` | `contracts/pulse-ecosystem/tokenVault.sol` |
| SolidX | `0x2057dd1687eafCD809386a41012748AC509df542` | `contracts/pulse-ecosystem/tokenVault.sol` |
| Treasury miner | `0x96185280d32184C847580c35eaB77affaC835d98` | `contracts/pulse-ecosystem/tokenVault.sol` |
| pUSDT | `0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21` | `contracts/pulse-ecosystem/tokenVault.sol` |
| pUSDC | `0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328` | `contracts/pulse-ecosystem/tokenVault.sol` |
| PDRIP | `0xc49EF441FFb79108047E4dF812F375A7E48FD3De` | `contracts/pulse-ecosystem/tokenVault.sol` |
| EMIT | `0x1aB20028a50477e11bC4066047D8942De1375eF7` | `contracts/pulse-ecosystem/tokenVault.sol` |
| Communitas | `0x4441c3bDB96139A45dF653Ec0432d076631A6D9F` | `contracts/pulse-ecosystem/tokenVault.sol` |
| pTGC | `0xa620473a3eb138c43e1f7065bda0ded0e039d8fd` | `contracts/pulse-ecosystem/tokenVault.sol` |
| UFO | `0xce34298e7456fd748e432e02cc4f107ac864c739` | `contracts/pulse-ecosystem/tokenVault.sol` |

Every vault needs its own verification record for the deposit asset, token decimals, approval path, native-value behavior, fee basis, accounting getters, allocation units, reward harvest behavior, and exit method.

## Governance and protocol settings

| Module | Address | Candidate source file |
| --- | --- | --- |
| Consensus | `0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3` | `contracts/consensus.sol` |
| Reward boost | `0xc77c66913B5f60522Ccb98857228511930da7403` | `contracts/rewardBoost.sol` |
| Basic settings | `0x5DebADaf41ED55270e0F9944FD389745e73d29B9` | `contracts/basicSettings.sol` |
| Allocation settings | `0x0dc0Fabe4c9d57cCaD055b4cD627D0d24fA3C98E` | `contracts/farms.sol` |
| Voting credit | `0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A` | `contracts/votingCredit.sol` |
| Referral rewards | `0xf69357627d6dcc463ac30273Aae13fDB49B07C15` | `contracts/referralRewards.sol` |
| Referral rewards, old listing | `0x066F0a45801bcbc5232b11ed4b97c39E1369fe59` | Historical listing; not used locally |

## Treasury, NFT, and helper contracts

| Role | Address | Candidate source file |
| --- | --- | --- |
| Treasury wallet | `0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69` | `contracts/wallets/treasuryWallet.sol` |
| Treasury locked miner | `0x4807bdD7039a1fc236c14dc60D73a64eEa450731` | `contracts/helper/treasuryMiner.sol` |
| NFT wallet | `0x26E6e614C46dA4c459d0dB2121A986672F603c00` | `contracts/wallets/NFTwallet.sol` |
| NFT mining module | `0x140f16365d05DcC84Fa489194CD022d5CBee4cb2` | `contracts/NFT/NFTmining.sol` |
| NFT allocation | `0xD8508461e8134e25dc630871566B1551e797E1a7` | `contracts/NFT/allocationNFT.sol` |
| Buy-back | `0xa36d037B01C148025C54e4f86C0032F05a93D4Ce` | `contracts/helper/buyBackAndBurn.sol` |
| Proxy voting | `0x003F5d5bB97028AF17B0925B08cb184a74F9030f` | `contracts/helper/proxyVoting.sol` |
| Contract sync | `0x506D24B519AC4Af9724Cc5F9eaf006e987e753d6` | `contracts/helper/contractSync.sol` |

## Farming integrations listed by the project

These integrations are documented, but they remain outside the current local mining and governance implementation stage.

| Integration | Address |
| --- | --- |
| PulseX / Earn staking | `0xc6E9924Ea3141b5555b18b82f7Bd66f9BB084C2D` |
| Swap PLSX for INC and provide liquidity | `0xA6B1e4Fc9ECd29E9438421A32023E0b8d677D6fc` |
| Unwrap PLSX/INC liquidity | `0x14B9C777B078F8AB5F26B72d3007932a7e207e0E` |
| INC Printer, stake PRINT | `0x5C30303F7F9640E268d3CE5844E7E360009AC03C` |
| INC Printer, sell PRINT for INC | `0x026822796CAa38971523f2D8C4384F76b7C7b1B9` |
| INC Printer, sell rewards for DEGEN and burn | `0xE142C8cC17D9279A1aA01A0f8420A63E22F9782f` |
| Actuator HTT5000 | `0xbB3822Dc9c033D48b04Af93D4bF75f0A10ddda9d` |
| Actuator HTT7000 | `0x8B21bCBB2c67aa0aF2d8712853dCe80334621bE0` |
| Actuator HTT3000 | `0x599FE019e2e1dc71Dd11bc647AD53a4ac53a3b42` |
| Wrap PLS and send to INC Printer staking | `0xE479772CBA63913d8101DE4D198E974C1c19f686` |
| Actuator HTT5000, sell rewards for PLSX | `0x488C81D85501769CF4Ca79ED657aF0633607ab1e` |
| Actuator HTT7000, sell rewards for eHEX | `0xD3270DC3361f34a1cb0c4cd2b0b352adB64D4498` |
| Actuator HTT3000, sell rewards for OINK and burn | `0xCd026f1b1F8b04f045d13af21877Db98033FF84e` |
| EMIT stake OINK/DEGEN, rewards buy OINK | `0x6A15f253F73E98558A619CFbd1b8c5bc9A9107eF` |

## Required gate before any transaction is enabled

For each action, record and verify all of the following against the deployed address:

1. Bytecode identity or an explicit, defensible ABI provenance chain.
2. Exact function selector, overload, argument order, and return behavior.
3. Native value versus ERC-20 allowance/approval behavior.
4. Token decimals and every fixed-point, basis-point, percentage, timestamp, and duration unit.
5. Caller restrictions, role checks, proposal state, quorum, Senate veto, delay, expiry, and finalization conditions.
6. Read-only preflight calls and expected revert cases.
7. Event signatures needed to reconcile the submitted action.
8. User-facing summary of irreversible effects, fees, penalties, and recipient behavior.

Until that record exists, the control stays disabled. Testing must use reads, simulations, and local fixtures only. No deployment or transaction is authorized.
