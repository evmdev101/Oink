# Hex Bond findings and OINK improvements

Reviewed October 22, 2026. Changes are in the local OINK site at http://127.0.0.1:4174/#/farms.

## Why Hex Bond feels responsive

The public site gives useful evidence of several techniques working together. These explain how the interface can remain responsive while blockchain requests are still running; they do not establish a measured speed advantage on every device or connection.

| Observed technique | Benefit |
| --- | --- |
| The initial farms HTML already contains navigation, farm names and labels. Live values begin as placeholders. | The page can appear before every blockchain request finishes. |
| Its query defaults reuse results for 20 seconds, retain inactive cache entries for 30 minutes, and avoid refetching just because the window regains focus. | Returning to a page does not have to restart all its work. |
| Its transport groups requests, uses contract multicalls and ranks fallback endpoints. | Fewer separate requests and alternatives when an endpoint is slow. |
| Public farm data commonly refreshes every minute; active positions and quotes use shorter intervals where needed. | Frequent updates are concentrated on values that need them. |
| Token and pair metadata is memoized; transaction receipts invalidate relevant cached queries. | Stable details are reused while balances are refreshed after an action. |
| Farm inputs offer quick amounts, with secondary details tucked away. | Less typing and less visual work for the user. |

Primary references inspected:

- [Live farms page](https://hexbond.org/farms) and [HBBR overview](https://hexbond.org/hbbr).
- [Published query configuration](https://hexbond.org/_next/static/chunks/38sbkc63ade2-.js): `staleTime: 2e4`, `gcTime: 18e5`, window-focus refetch disabled.
- [Published transport configuration](https://hexbond.org/_next/static/chunks/3uf2e0aj0xfl0.js): HTTP batch wait 16 ms, multicall wait 50 ms and batch size 2048; endpoint ranking.
- [Published metadata readers](https://hexbond.org/_next/static/chunks/1lymdyut9sm8e.js) and [farm readers](https://hexbond.org/_next/static/chunks/0y1fw_wj9y63x.js).
- [Published farm interface](https://hexbond.org/_next/static/chunks/1l9bnplsnvg3m.js) and [fund-flow interface](https://hexbond.org/_next/static/chunks/3eyzu_-0vc6i9.js).

These generated filenames are a snapshot of the deployment and may change later. Saved copies are in `evidence/hexbond-public-js-2026-10-22/`. The app also references an indexed-data service; that alone does not prove all of its statistics are precomputed.

## What changed in OINK

OINK already had batched blockchain reads, shared caches, request deduplication, separate route bundles and progressive farm loading. A framework rewrite was unnecessary. This pass removed specific unnecessary work and added useful controls:

1. **Quieter startup and navigation.** Removed automatic loading of every route and speculative blockchain reads for several pages immediately after startup. Only likely destination code is warmed in idle time. Sustained navigation intent can warm shared display data after 200 ms, with one speculative read at a time and a per-route/account cooldown. Passing hover is cancelled. Hidden tabs and data-saving connections do not start this speculative work.
2. **No full farm scan just to count farms on the overview.** The overview previously loaded all vault data and prices for its listed-farm count in addition to reading the reward registry. It now counts from that existing registry, using the same address classification as discovery. The count still includes configured farms and new registered farm candidates while excluding time miners, helpers, governance and linked NFT dashboards. Invalid or stale registry data does not publish a fresh count.
3. **Fixed accumulating decorative animation loops.** Repeated changes to the same theme pattern could leave detached canvases, listeners and animation loops alive. The background now reuses one lifecycle, cleans up when changed, caches style values outside animation frames, pauses in hidden tabs and respects reduced motion. Drawing is capped at 60 Hz.
4. **Added 25%, 50%, 75% and Max input buttons.** Supported token farms fill exact amounts from the connected wallet's fresh balance. Integer arithmetic avoids rounding above the available balance. The wallet, network, farm, token and precision must match. These buttons only fill the field; the existing approval and transaction reviews remain separate. Native PLS remains manual so the user can reserve gas.

## Verification

- All **903 automated tests passed**, including navigation scheduling, animation cleanup, exact percentage amounts, stale/wrong-wallet rejection, farm counting and the existing transaction checks.
- Type checking and the production build passed.
- Tested the local site in Chrome: overview, portfolio, farms, grid/list controls and navigation through How it works.
- The overview loaded **17 listed farms** from a live registry with **28 registered pools**. Registered pools also include time miners and NFT pools, so those two counts represent different things.
- A live PLSX balance of `24131.358673705475930723` filled `6032.83966842636898268` at 25%, correctly rounding down to the token's smallest unit. No transaction review opened from this fill.
- Preview: `evidence/farm-shortcuts-2026-10-22.png`.
- Test and build logs: `evidence/hexbond-performance-tests-2026-10-22.log` and `evidence/hexbond-performance-build-2026-10-22.log`.

No transactions were submitted. The changes remove confirmed sources of unnecessary work; this review does not claim a particular FPS improvement, percentage speed gain or zero network delay.

## Further ideas worth adapting

The most useful next product idea is Hex Bond's clear funds-flow presentation: show what is in the wallet, what is deposited, what is pending and what is ready to claim, with a direct action for each. OINK already has portfolio breakdowns and a How it works route; extending those with a position-specific explanation would be more useful than adding another generic dashboard.

Collapsing inactive positions while keeping them discoverable is another useful pattern. OINK already has staked, favorite, search and sorting controls. Migration buttons should only be introduced when an OINK contract supports a verified equivalent; Hex Bond's Move to V3 action is specific to its contracts.

This performance pass does not establish complete transaction parity with the original OINK app. The remaining parity notes are in `evidence/site-parity-status-2026-10-21.md`.
