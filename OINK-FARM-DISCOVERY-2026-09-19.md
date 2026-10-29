# Local farm discovery and interface updates — September 19, 2026

Implemented registry discovery, reviewed-template matching, dynamic farm catalog integration, and visible cards for unfamiliar pools. Only supported, verified assets/models receive transaction actions. Zero-allocation pools remain visible. Existing farm loading is independent of incomplete new-pool data.

A read-only live check found 28 registry entries, all 17 existing dashboard farms loaded, and four additional NFT pools (24–27) awaiting integration. Desktop grid/list and a 390px mobile fixture were checked, including filtering and overflow. No wallet transaction was sent.

Removed global, protocol, and farm transaction-status panels everywhere, including saved-request panels introduced during discovery implementation. Headless receipt checks update journals and refresh data. Pending and uncertain requests retain duplicate protection; the monitor never resends a transaction. This supersedes references to saved-request UI in earlier implementation evidence.

Validation: 687 existing tests passed, plus six new receipt-monitor tests passed (693 total); TypeScript, production build, and production asset checks passed. The new tests cover confirmations, pending/uncertain outcomes, RPC errors, account changes, replaced journals, and reverted receipts.

The compiler-template generator now uses a portable temporary directory and gives explicit pinned-compiler setup instructions if the compiler is missing. Production discovery does not download or compile contracts.

Everything remains local. No GitHub push or deployment. Installed-wallet end-to-end and final hosted-origin testing remain separate release checks.
