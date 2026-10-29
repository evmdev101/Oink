# Miner portions and treasury-funded miner donations

Verified reference contracts and original UI:

- `evidence/participation-sources/{one-month,three-month,six-month,one-year,three-year,five-year}.sol`: explorer-published time miner sources whose full deployed runtime hashes are pinned by `minerPreviewVerification.ts`.
- Original source: https://github.com/OINK-pls/PiggyBank/blob/cf49720c083f098b2fb7c8c636cfa0e91ae8be05/contracts/helper/stakeDonation.sol
- Original UI: https://oink-pls.github.io/Piggy-Bank-UI/issue-miner.html and archived `evidence/original-ui-parity-2026-10-24/js__issueStake.js`.

## Miner portions

The verified methods accept shares, not OINK token units: `withdraw(shares,index)`, `transferStakeToAnotherWallet(shares,index,recipient)` and `hopStakeToAnotherPool(shares,index,pool)`. Gross value is `floor(poolBalance * selectedShares / totalShares)` at one pinned block. Exit penalty math then applies to that gross amount with the source's exact integer ordering. `partialWithdrawals` gates both withdrawal and upgrade portions; `partialTransfers` gates wallet transfer portions. Transfers also require `allowStakeTransfer` and value at least `minimumGift`. A partial withdrawal must serve exactly the same mandatory time as a full withdrawal. Remaining shares retain their original start time and mandatory service.

The UI supports full positions or exact decimal shares, with 25/50/75/MAX shortcuts. Quote identity includes selected shares; changing the selection cancels earlier quotes. Both fresh preflight and receipt checks retain the selected share amount. Account, network, request lock and uncertain/pending-journal protections are unchanged.

## Donation correction and review

The original UI creates an `IssueStake` callback, then asks for a treasury transfer to that callback. Community voting approves or rejects funding. Any caller can activate `giftStake()` after funding; it deposits the callback's complete OINK balance into the fixed recipient's miner with fixed mandatory service.

The original public helper source leaves `IToken()` unbound. Its UI's embedded creation code hardcodes older token `0x633372effed18f98ce7ddf2f0a58312609fbfea5`, rather than current OINK `0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38`. The local helper uses the same MIT implementation with an explicit current-token binding. It is a newly deployed helper, not a claim that an existing deployed protocol contract was changed.

`IssueStake.sol` is the exact reviewed source; its public copy is `public/contracts/IssueStake.sol`. Reproduce the artifact with `node scripts/build-miner-donation.mjs`. Compiler: official Solidity 0.8.20+commit.a1b79de6, optimizer 200 runs, Paris EVM, no metadata content hash. Source Keccak: `0xa34becfddf5a41ffcf914d962e48e0e91a6410687220c77621a2990bc3131512`. Full creation bytecode, runtime template and compiler-derived immutable locations are in `src/config/minerDonationBuild.json`. The wallet review displays source/compiler/runtime hashes and exact creation data.

Creation is explicit in the generic protocol engine. It pins the account nonce and predicted address, blocks conflicting pending nonces, omits `to` from the actual creation call/send, and requires read-only creation simulation to return the exact expected runtime. Receipt checks require null destinations, exact nonce, exact created address and complete deployed runtime. Normal protocol calls retain the existing nonzero target rules. All sends still require explicit product review and wallet confirmation; no transaction was broadcast while implementing or testing.

Funding proposals reuse the existing advanced governance checks for treasury authority, voting-credit cost, time windows, proposal events and receipts. Activation re-verifies helper code, immutable recipient/pool/service, current OINK and miner dependencies, minimum gift and share issuance, then matches the miner's GiftDeposit event. Fingerprints omit display-only block/timestamp metadata so unchanged terms remain valid across new blocks.

Tests: `scripts/test-miner-donations.mjs`, `scripts/test-protocol-transactions.mjs`, `scripts/test-position-transactions.mjs`, and existing direct withdrawal/rollover tests. All tests use isolated fake RPC/wallet implementations; none signs or broadcasts.
