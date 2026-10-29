# OINK content migration — September 12, 2026

## Review scope

Read the public information site's Home, FAQ, Technology and contract-directory pages. Enumerated and fetched all 27 root HTML files in the original Piggy-Bank-UI repository, including shared sidebar and alternate position views. Reviewed page-level headings and controls against the existing feature/contract and governance maps. Sources:

- https://oink-pls.com/
- https://oink-pls.com/FAQ.html
- https://oink-pls.com/tech.html
- https://oink-pls.com/smart-contracts.html
- https://github.com/OINK-pls/Piggy-Bank-UI/tree/main

The full page-by-page inventory and implementation status are in src/config/siteCoverage.ts as an internal project checklist. Every listed application HTML page fetched successfully during this pass. This is a content/navigation review, not exhaustive execution of JavaScript-generated wallet controls, complete PDF review, fresh on-chain audit of every module, or confirmation that every external link works. Audit reports remain original references; their current applicability is unresolved.

## Implemented content structure

- Home: brief identity, three feature entry points, fixed-block token/treasury-wallet reads, two participation explanations, five FAQ answers, resource footer.
- Miners/Farms: contextual locks, fees, reward-destination and action limitations stay next to the actions.
- Governance: separate ordinary proposals, miner voting, Senate and upgrades remain intact.
- Protocol: guides/sources, grouped contracts, audit links, FAQ and risks/limitations. The feature-coverage checklist is retained in project files, not displayed on the site.
- Original documents remain accessible; no claim to be the official replacement. DEGEN untouched. No publication or transactions.

## Important additions, in order

1. Resolve the user's unfamiliar restored wallet identity before any further transaction testing. Source review alone did not establish who owns that account.
2. Complete time-miner and farm claim/exit verification: full/partial operations, exact indices, fees, locks, recipient routes and expected effects. Existing deposits do not imply exits are supported here.
3. Reconcile original asset options with deployed directory and current pool registration. The original ecosystem UI also labels LP, eHEX and HEX-share choices; these are not automatically equivalent to the 17 existing ordinary vault records.
4. Sale and referral read-only eligibility: current sale address/availability, supported assets, inventory, quotes, delivery locks, current versus old referral contracts, link encoding and destination rules. Do not fabricate discounts, default balances or referral links.
5. Distribution claims: separate contributor/reward Merkle distributions, valid proofs, claimed state and eligibility. Not the same as farm or referral rewards.
6. Treasury overview: holdings across treasury wallet, Governor, treasury miners and external farms; inflows/outflows with prices and timestamps. Existing Home values are only the named wallet's OINK and PLS, not total reserves or TVL.
7. Supply/emission analytics and miner distribution with defined circulating/liquid/locked accounting. Avoid double-counting virtual credit and minted supply.
8. NFT staking/allocation: collection eligibility, allocation implementation candidates, positions and custody. Governance candidate reads are incomplete.
9. Miner donations/grants: issuing authority, recipient, amount and mandatory service.
10. Read-only maintenance/action center: buybacks, harvesting, reward-event transitions, fee collection and synchronization. An available button is not proof that calling it is safe or beneficial.
11. Decoded activity feed with exact transaction links and provenance; existing proposal history is not a full activity feed.
12. Smooth miner-growth display as a labeled estimate that reconciles with fresh chain reads and stops on stale/failed data. Not implemented by this content migration.

## Claims not migrated as facts

- 'Free' mining and suggestions that principal is safe: fees, locks and contract risks apply.
- Fixed APY badges, fixed reward cadence, old launch-date text ('20th Of November'), sale urgency and marketing comparisons.
- Claims of exactly 100 serving senators or a blanket Senate veto over all proposals. Membership must be refreshed on chain; documented powers need exact route verification.
- 'No admin keys'/'fully decentralized' assurances without current authority and upgrade-path analysis.
- Audit graphics as a blanket safety badge. PulseDAO branding is noted as historical; equivalence to current deployments is not established by a name change.
- Existing external farm addresses as automatic new user-facing supported farms.

## Remaining verification boundaries

Live Home reads use PulseChain chain-ID verification, one block for token supply and named wallet balances, a canonical block check, periodic refresh, and explicit failure/stale states. No APR, total reserve valuation, price target or safety guarantee is invented. Existing transaction allowlists and explicit confirmations are unchanged.
