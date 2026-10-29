# Local pre-launch link and wording check — September 19, 2026

This pass used read-only HTTP requests and source inspection. It did not publish the site, push to GitHub, change an external account, or request a wallet transaction. HTTP success only confirms that a destination responds; it does not establish its transaction behavior.

## Changes

- Removed the unconfigured X and YouTube buttons from the header. Telegram and DEX Screener retain their icons, styling and destinations. There are no inert social buttons or “link not configured” labels in the header.
- Updated the original miner-tool description to mention partial withdrawals/transfers. Additional renewal destinations are already available in this interface, so the former description was outdated.
- Replaced the disabled Create miner stub in the contract cards with a link to the existing Deploy miners route (`/mining?tab=deploy`). This navigates to the form; it does not start a transaction.
- Reworded the public-address miner lookup as read-only and removed its disabled management buttons. Management remains in the connected wallet's My miners view.
- Updated contract-tab wording for the eleven enabled farms and removed the DEGEN development-history sentence. Updated Protocol capability text for same-or-longer rollover and direct withdrawal/rollover wallet confirmation.
- No original-tool, documentation, audit or contract URL required replacement.

## Social-source evidence

The [official OINK homepage](https://oink-pls.com/), [technical page](https://oink-pls.com/tech.html), [contract directory](https://oink-pls.com/smart-contracts.html) and original [application](https://oink-pls.github.io/Piggy-Bank-UI/) did not identify an OINK X or YouTube destination. The website's YouTube icon has `href="#"`; this is not a usable account link. The homepage identifies [Telegram @OINKpls](https://t.me/OINKpls), which returns HTTP 200.

The configured [DEX Screener OINK/WPLS pair](https://dexscreener.com/pulsechain/0xef9ea3d72e28c7140481209190601c085027d6fe) returned HTTP 403 with a “Just a moment...” challenge to the HTTP client. This was not classified as a broken link. The [DEX Screener token-pairs API](https://api.dexscreener.com/token-pairs/v1/pulsechain/0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38) returned HTTP 200 and identifies the exact configured URL and pair, with OINK `0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38` as the base token and WPLS as the quote token. Its OINK profile identifies the same website and Telegram, with no X or YouTube link. A normal-browser DEX Screener visit remains the appropriate final visual check.

## HTTP checks

The following returned HTTP 200. HTML page titles and PDF content types were checked where applicable.

| Group | Destinations |
| --- | --- |
| OINK information | `https://oink-pls.com/`, `smart-contracts.html`, `FAQ.html`, `tech.html` |
| Documentation | `https://oink-pls.com/OINKpaper.pdf`, `whitepaper.pdf` |
| Audits | `https://oink-pls.com/SmartContract_Audit_Solidproof_PulseDAO.pdf`, `PulseDAO%20-%20Smart%20Contract%20Security%20Report.pdf`, `PulseDAO-Security-Review.pdf` |
| Official application | `https://oink-pls.github.io/Piggy-Bank-UI/` |
| Miner and farm tools under that application | `pulse-ecosystem-mining.html`, `view-all-miner.html`, `view-pulse-ecosystem-miners.html`, `pig-offering.html`, `referral.html` |
| Governance tools under that application | `voting-credit.html`, `miner-voting.html`, `delegate-vote.html`, `senate.html`, `propose-upgrade.html`, `basic-settings.html`, `treasury.html`, `issue-miner.html`, `NFT-allocation.html` |
| Other original tools | `claim.html`, `available-actions.html`, `https://degenstrategy.github.io/NFT-miner/` |
| Source repositories | `https://github.com/OINK-pls/PiggyBank`, `https://github.com/OINK-pls/Piggy-Bank-UI` |
| Buy OINK | Piteas application with the configured PLS → OINK hash-route parameters. HTTP confirms its app shell; it does not exercise the swap route or execute a swap. |
| Explorers | `https://scan.pulsechain.com/address/0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38`, `https://otter.pulsechain.com/`. No transaction-specific receipt was asserted from a homepage response. |

## Active UI wording checked

Ownership was extended by the main task to apply these small wording and navigation fixes. The theme, card structure and transaction logic were preserved.

- `MiningPage.tsx`: replaced DEGEN implementation history and the claim that all ecosystem forms still awaited verification with current pool data and eleven-farm availability.
- `TimeMinerCards.tsx`: replaced “Create miner — not enabled” with the existing Deploy miners route. `MiningPage.tsx` maps `tab=deploy` to the real deployment form.
- `MyMiners.tsx`: replaced “Management actions — not enabled” with a plain read-only lookup explanation and a direction to the connected wallet's My miners view.
- `ProtocolPage.tsx`: corrected the same-pool-only renewal and separate-review wording to the implemented same-or-longer rollover and direct withdrawal/rollover dialogs.
- Governance's Coverage tab contains an implementation checklist and contract details. This is secondary explanatory content, not an unconfigured transaction control to enable during link cleanup. Senate actions remain external by design.

## Validation and remaining manual checks

All six changed source files passed TypeScript syntax transforms. Source inspection confirms exactly two configured social links remain, no unconfigured-button branch remains, and the deployment link resolves to the existing route. Full compilation and regression tests are owned by the main launch pass. This subtask did not perform browser visual verification.

Before publication, open the DEX Screener page and Buy OINK route in a normal browser, and verify any newly supplied social account against an official source before adding it. Real installed-wallet signing, mined transaction results and mobile wallet-browser behavior are separate checks; none were performed by this link pass.
