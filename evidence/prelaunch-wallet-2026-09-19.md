# Local pre-launch wallet and transaction review

Date: 2026-09-19

This review used source inspection and simulated providers/RPC responses only. It did not connect an installed wallet, request a signature, broadcast a transaction, push to GitHub, or publish the site.

## Result

The focused suite passed **327 tests, 0 failures, 0 skipped**. No concrete launch-impacting regression was found in the wallet session and transaction-library paths inspected. No production code was changed by this review.

Command:

```powershell
node --test scripts/test-wallet-session.mjs scripts/test-wallet-preference.mjs scripts/test-wallet-discovery.mjs scripts/test-farm-transactions.mjs scripts/test-farm-journal.mjs scripts/test-farm-recovery.mjs scripts/test-position-transactions.mjs scripts/test-miner-withdrawal-flow.mjs scripts/test-miner-rollover-flow.mjs scripts/test-protocol-transactions.mjs
```

Raw result: [prelaunch-wallet-tests-2026-09-19.log](./prelaunch-wallet-tests-2026-09-19.log).

## Verified with source review and simulated tests

- Wallet discovery does not request accounts, signatures, chain changes, or transactions. Distinct providers remain separate, and delayed providers can be discovered when opening the picker.
- Restoration requires the saved announced provider identity and saved account. It does not substitute a legacy or same-brand provider, select a different account, prompt for accounts, or switch networks on reload.
- Explicit connection requests accounts once. Unknown PulseChain configuration is added and selected before completion. Account changes during connection or network switching prevent the old account from being published as connected.
- Cancellation, rejection, disconnection, passive-read failures, and request timeouts clear the local session. Late responses and detached provider events cannot overwrite a newer session. Concurrent changes keep the newest completed account/network refresh.
- Deposits and approvals preserve exact token units; approval defaults to the reviewed amount, with a zero reset where required. Simulation, contract/token configuration, gas funding, current account/network, and reviewed terms are checked before the mocked send.
- Miner deployment, withdrawal, rollover, upgrade, and transfer, plus farm claims/withdrawals, use their intended action routes and validate the selected position. Changed position details or a reduced expected output stop submission.
- Direct miner withdrawal and rollover hold a shared request lock, persist the request before calling the mocked wallet, make one send, and retain a returned hash after a dialog closes or persistence encounters an error. Rejection is resolved; uncertain outcomes stay blocked for reconciliation instead of being retried.
- Saved unresolved requests survive reloads. Corrupt storage and unsuccessful persistence block new sends. Receipt checks distinguish pending, reverted, and unverified outcomes and validate transaction identity, expected effects, and canonical block information.

The receipt and transaction tests use controlled responses. Their passing result establishes the tested application behavior, not live wallet or on-chain execution success.

## Not verified in this review

- Actual installed desktop wallet discovery, account authorization, native wallet confirmation/rejection screens, or switching among real extensions.
- Real signing, real deposit/claim/withdrawal/rollover execution, fees charged, mined receipts, or resulting live balances.
- Mobile wallet app injection and its native prompts. Fresh browser layout checks also remain pending because browser control stopped during the parent task.
- Production hosting, public-domain configuration, or deployed-site storage and wallet behavior. Publishing remains outside this local pass.
