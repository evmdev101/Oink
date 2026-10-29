# Expanded farm support — September 19, 2026

The local interface now supports reviewed deposits, exact token approvals and allowance resets, claims, full withdrawals and emergency withdrawals for eleven ordinary farms. Eight additions join PLS, PLSX and INC. These additions use the existing review, wallet confirmation, account-change protection and transaction journal; opening a page never sends a transaction.

| Newly supported farm | Token precision | Additional handling |
| --- | ---: | --- |
| HEX | 8 | Exact integer amounts throughout preparation and receipts |
| HOA | 18 | Verified ordinary ERC20 transfers |
| pDAI | 18 | Verified PulseChain token; market price is not assumed to be $1 |
| ATROPA | 18 | Verified ordinary ERC20 transfers |
| SolidX | 18 | Verified ordinary ERC20 transfers |
| pUSDT | 6 | Legacy empty-return approval; zero reset before replacing an existing allowance; live transfer-mode checks |
| pUSDC | 6 | Proxy and implementation both pinned; live pause and blacklist checks |
| Communis (COM, catalog ID `communitas`) | 12 | Exact integer amounts; later vault source generation independently checked |

All eleven farms also appear in Protocol → More OINK tools → Emergency farm recovery. Recovery reads recorded principal without waiting for prices or reward accounting. Emergency withdrawal closes the selected full position, applies funding fees and forfeits that position's OINK rewards. Normal claim and withdrawal reviews still support the verified wallet and locked-miner reward destinations.

An explicit allowance-reset button now exposes the existing zero-approval review. It does not require a deposit amount. The application still refuses replacement approval while an existing allowance is nonzero; the user can use sufficient allowance or review a separate reset first.

## Verification and safeguards

The new write allowlist is explicit, separate from the fifteen-farm read catalog. Each new vault and deposit token was compiled from explorer-verified source using the published compiler/settings, then compared with deployed executable code. Complete runtime hashes remain pinned during reviews. Vault verification used block **27586281**; token checks used blocks **27586249** and **27586251**. Source-generation differences were checked beyond ABI compatibility, including optional ERC20 return handling, constructor/initializer differences, funding charges, principal accounting and payout methods.

- [Vault source and state review](evidence/expanded-farm-vaults.md), with [machine-readable evidence](evidence/expanded-farm-vaults.json).
- [HEX, HOA, pDAI, ATROPA, SolidX and pUSDT token review](evidence/expanded-tokens-a-review.md), with [evidence](evidence/expanded-tokens-a.json).
- [pUSDC, Communis and deferred-token review](evidence/expanded-tokens-b-review.md), with [evidence](evidence/expanded-tokens-b.json).
- [Fresh application-level read-only checks](evidence/expanded-farm-live-state.json): all eleven farms passed at block **27586305**, including runtime, wiring, precision, fee and reward-state checks. The token-policy probe used each vault address, not a connected user wallet.

pUSDT requires zero fee settings, no deprecation, no pause, and unblocked wallet/vault/fee-recipient addresses. Its verified approval returns empty data; other supported ERC20 approvals must return an exact true boolean. pUSDC checks its implementation storage slot, implementation address and runtime hash, plus pause and blacklist status. The implementation slot is specific to the verified historical USDC proxy.

These checks run at the review block, again before requesting the wallet transaction, and at the receipt block. Reviews disclose that token administrators can change settings before mining. Checks are observations, not atomic constraints on future administrative changes. Receipt verification also checks the canonical block after asynchronous token-policy reads. Principal uses each asset's native precision; OINK rewards remain 18 decimals.

## Deliberately deferred

| Farm | Reason local transaction controls remain disabled |
| --- | --- |
| pDRIP | Current proxy implementation lacks verified source needed for the transfer/accounting review. |
| EMIT | Transfers have burn/staking charges and hooks; vault was not exempt. Reward allocation was also zero at verification. |
| pTGC | Transfers have fees and reflection behavior; the vault was not exempt. Additional vault source differences remain deferred. |
| UFO | Transfer fees, reflection and an external hook need a separate model; the vault was not exempt. Additional vault source differences remain deferred. |

Their read views and original-interface links remain available. HEX T-Shares and the protocol treasury miner retain their distinct treatment. A link to the original interface is not a verification of its current transaction behavior. Batch claims, governance writes and the other deferred workflows in the earlier launch report were not enabled in this pass.

## Validation and limits

- Full Node regression suite: **387 passed**, zero failures or skips. Coverage includes all eleven farm position/recovery flows, 6/8/12/18-decimal calldata and receipts, exact approvals and resets, USDT return conventions, changed USDC implementations, blocked sends, journals and reorganized receipt blocks.
- TypeScript app check and Vite production build passed.
- Independent review found no binding or transaction-model blockers in the eight activated additions.
- Browser checks passed on the local development site and the production build served under `/oink-launch/`: all seventeen cards rendered, eleven normal claim/withdraw controls were available, and the four deferred ordinary farms retained disabled actions plus original-site links. All ten ERC20 allowance-reset controls were present and disabled while disconnected. Opening the pUSDT withdrawal dialog preserved wallet gating and showed the separate emergency option. The recovery selector included all eleven farms, including COM, and remained gated while disconnected. The production browser reported no warning/error logs. The temporary production tab and server were closed afterward; the user's development tab remains open.

No real wallet was connected, transaction broadcast or site published. Installed-wallet end-to-end testing and the final public hosting origin remain release checks. Source matching and successful simulations do not establish economic safety or future returns; shared protocol dependency runtimes were pinned and their wiring checked, not independently recompiled in this expansion.

Reproduce the fresh read-only check with `node scripts/check-expanded-farm-state.mjs`. The broader `verify-expanded-farm-vaults.mjs` script deliberately exits nonzero for the deferred pTGC/UFO source variants; it does not activate application permissions.
