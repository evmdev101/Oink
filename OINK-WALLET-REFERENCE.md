# CashX navbar and wallet adaptation

Reference: https://github.com/evmdev101/CashX/blob/main/index.html (`CashXWallets`, picker, connection, chain switching and disconnect functions), inspected September 11, 2026. Screenshot supplied by the user establishes the navbar direction.

- Three-part desktop navbar: circular OINK links, centered OINK routes, subdued theme and address pills. Keeps OINK's theme and existing four link destinations; CashX social destinations and token branding are not copied.
- Searchable browser-wallet picker with detected/not-detected states. EIP-6963 announcements and legacy injected providers are deduplicated by provider object. Distinct providers are not merged solely by their displayed name. Wallet names are extension claims, not identity verification.
- CashX-style catalog: MetaMask, Internet Money, Rabby, SafePal, ZKX, Coinbase and Uniswap; other detected browser providers may also appear. Phantom is excluded as in the reference. Missing wallets are disabled, not fake connectors. No WalletConnect relay or QR flow is claimed.
- Only the selected provider receives account/transaction requests. The last successful provider choice uses an OINK-specific local preference. Restore reads existing permissions without prompting; ambiguous provider matches do not auto-restore. Disconnect clears that preference and the local session, not blockchain approvals.
- Chain switch/add is an explicit separate user action. Unlike the reference's automatic switch-on-connect, simply choosing a wallet does not change its network. All existing transaction chain/contract/authority checks remain in place.
- Account/network/disconnect events invalidate pending reviews. Governance account reads now follow the same selected wallet as farms instead of independently reading `window.ethereum`.
- Known wallet rows without an announced icon use initials; bounded data-image icons are rendered as images, never injected as HTML. No remote wallet icons or installation requests occur.
- No CashX contracts, token balances, signer shortcuts, approvals, or send routines were copied. OINK's previously verified transaction scope remains unchanged. No actual wallet permission prompt, signature or transaction was exercised in testing.

Validation: TypeScript, local build, mock discovery/deduplication tests and transaction/recovery regression tests. Existing local server remains at http://127.0.0.1:4174/#/farms . No publishing or DEGEN edits.
