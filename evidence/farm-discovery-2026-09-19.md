# Bounded farm discovery verification

The new `src/lib/farmDiscovery.ts` reads the reviewed PulseChain MasterChef registry at one supplied block. It does not request accounts, call a wallet, simulate a user transaction, submit transactions, or publish catalog permissions.

## Permission boundary

- Chain 369 and the existing full MasterChef, Governor and OINK runtime pins must match. Their reward, owner, treasury, fee-recipient and Governor wiring must also match at that block.
- `poolLength` is capped at 50; every `poolInfo` is read with its explicit block tag. Allocation and last reward block remain raw decimal strings. Zero allocation is visible and is not mistaken for a missing pool.
- All requests, including token-policy calls, share a limit of four concurrent RPC requests. Cancellation and a 30-second deadline terminate discovery even if a provider call never settles. An uncancellable underlying call retains its semaphore permit until it settles.
- Canonical block hash/number/timestamp are checked before and after discovery. Inputs older than 120 seconds or more than 30 seconds in the future are rejected.
- Incomplete registry reads, duplicate participant addresses and zero addresses prevent all new write permissions. Readable entries remain visible as awaiting integration. Existing configured farms, time miners and protocol helpers remain in the registry result and are excluded from duplicate cards.
- Previously unintegrated NFT modules and other contracts remain visible as generic registered pools awaiting integration. Their familiar-looking ABI or label grants no permission.
- A new supported contract must match the entire normalized executable of one of four reviewed compiler outputs. Only compiler-reported immutable address words and the exact Solidity 0.8.20 IPFS metadata trailer are normalized. Every repeated immutable must agree, fit a canonical nonzero address and match the live getters. Arbitrary new deposit tokens are never authorized.
- The deposit asset must already be independently reviewed in `VERIFIED_FARM_WRITES`, with identical runtime, decimals and token policy. Discovery checks proxy/transfer policy where applicable, including the vault and treasury blacklist state. Actual wallet blacklist status is checked again by normal transaction preparation.
- Every supported result contains the current full unmodified vault runtime hash and discovery template/block provenance. A caller publishes only a current complete snapshot. Normal deposit/exit/recovery preparation still checks runtime, registry membership, live wiring, token policy and actual wallet state before any wallet request.

## Compiler evidence and reproduction

`scripts/generate-farm-vault-templates.mjs` reproduces the generated `src/config/farmVaultTemplates.ts` entirely offline using cached verified source/runtime inputs in `evidence/farm-vault-template-inputs.json` and the pinned local compiler. `--refresh` performs public read-only source/runtime collection first. Neither mode contacts a wallet or sends transactions.

The cached inputs were collected at PulseChain block **27588586**, hash `0xd6db30962daa8c46c93e5b382be3626431d3a77b99b28cd989f0108a806785b0`. The compiler is Solidity `0.8.20+commit.a1b79de6`; its complete JavaScript file hash is `0x3a420fa9963772eee5b9221ebb8cf9548eea8f88b09537390960ea9b440f333c`. Source hashes and normalized executable hashes are independently compared to the existing original/expanded farm verification pins. Every cached exemplar's full executable equals its freshly compiled output after masking only compiler-reported immutable positions.

Templates: original optimized native PLS; original optimized tokenVault; original unoptimized tokenVault; and the reviewed later unoptimized tokenVault helper variant. Unknown compilers, changed implementations and new assets require integration review.

## Focused validation

- Offline generator successfully reproduced all four templates after the initial public read-only collection.
- `node --test scripts/test-farm-discovery.mjs`: 43 tests cover real compiler-bytecode fixtures, mixed template variants, new supported known-asset pools, native PLS, zero allocation, unknown assets/modules, opcode/metadata/immutable mutations, getter lies, dependency wiring, stale/future snapshots, reorg, precision/fee bounds, token runtime and pUSDT policy, incomplete/duplicate/zero registry entries, isolated vault-read failures, abort and hung-call deadline handling, and bounded 50-entry cancellation. Four integration tests additionally verify recovery-catalog publication, invalid snapshot clearing, protection against late/aborted refreshes overwriting newer publication, and permission rehydration through fresh reads after a clear.
- `node node_modules/typescript/bin/tsc -p tsconfig.app.json --pretty false` passed with the initial discovery integration.
- Independent read-only review found no blocking defect in the classifier, normalization or permission boundary.

These focused tests use only in-memory recording RPC mocks and public bytecode fixtures. They do not establish future token economics, verify arbitrary assets, or constitute a mainnet transaction test. The root task performs application integration, live snapshot checks and full-suite/build verification separately.
