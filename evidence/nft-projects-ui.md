# NFT Projects section — local implementation

Farms now includes an NFT Projects section with a CSS artwork banner using the existing OINK asset, project description, reward-token labels, an external-dashboard button, favorites, search, All projects/Earning OINK/Favorites filters, and expandable current/earlier vault details.

Project identity is stored in src/config/nftProjects.ts separately from blockchain snapshots. Reviewed addresses group existing NFT vaults into a single project; these entries confer no transaction permissions. Add future project identity and vetted HTTPS dashboard links here only after checking their relationship to the registered contracts. Unrecognized discovered contracts continue appearing as generic registered pool cards; they are not assumed to be NFTs or associated with DEGEN.

The reward badge uses fresh successful discovery data: any matching positive OINK allocation is active; all listed contracts must have confirmed zero allocation to show no allocation. Incomplete or stale state is unavailable. DEGEN is listed as a supported reward stream, not a claimed live DEGEN allocation. No artificial New/Verified badge, wallet balance, claim button, or creator submission backend was added.

Validation: 3 status/grouping regression tests, TypeScript, production build and asset checks passed. Live browser verified current pool #27 and earlier pools #24-26; favorites, empty search, matching search and active filter worked. At a 390px viewport document width and scroll width both measured 375px (scrollbar excluded); screenshot inspected. Temporary viewport reset. The fresh preview tab was left open because the prior user tab was stuck on a connection error.

Public project submissions and My NFTs ownership filtering are future additions. The current scope provides project browsing and links to the existing published DEGEN dashboard. No wallet request, push or deployment was performed.
