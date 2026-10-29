# Dynamic farm write and recovery integration

The integration uses an in-memory catalog of existing reviewed farms plus newly discovered farms. Browser storage stores request evidence only and cannot enable an unknown farm.

## Catalog contract

- `getFarmWriteSpec(id)` and `getFarmWriteSpecs()` expose current usable permissions.
- `replaceDiscoveredFarmSpecs(specs)` is called only after complete fresh canonical registry verification. A failed/partial refresh publishes an empty discovered list, while existing reviewed farms remain available.
- Discovered IDs are the immutable address-based form `registry-0x…`. Publication requires a reviewed native/token executable template ID, canonical discovery block hash, known reviewed asset precision/runtime/policy, reviewed dependencies, and non-conflicting IDs/addresses/pool IDs.
- Published discovered objects are cloned/frozen. UI subscriptions track permission changes; a newer snapshot of identical permissions does not invalidate an existing review.
- `farmSpecIdentity` and `assertCurrentFarmSpec` bind actions to current configuration. Deposit preparation checks at both ends; final wallet checks and receipt verification check again. Claim, normal/emergency withdrawal, and principal recovery have matching catalog guards.

## Recovery behavior

- Direct navigation to Protocol → recovery can independently refresh the registry after reload, without first visiting Farms or trusting a saved spec.
- A missing/changed discovered farm cannot prepare or send an action, or confirm a receipt against outdated permission.
- Position journals remain readable while a discovered farm is unavailable. Saved deposit-journal IDs are enumerated independently of current permission, so unavailable farms do not silently lose unresolved requests.
- Protocol recovery shows unresolved saved farm requests with their hashes/receipt links and an explicit manual resolution option. Receipt confirmation requires a matching currently verified spec; manual resolution is clearly not on-chain confirmation.
- A catalog change before the wallet send is identified as a pre-wallet failure, rather than suggesting a transaction might have been submitted.

## Validation

Focused application-library tests cover catalog rejection/publication, exact dynamic deposit pool/target/value, permission removal during wallet recheck, claim/withdraw/emergency target/pool and receipt binding, saved requests across catalog loss and rediscovery, native no-approval identity, exact principal units, and cancellation of stale recovery reads. Existing miner direct-flow tests are included to check the shared position/journal paths.

Run and results are recorded in `dynamic-farm-integration-tests.log`. These tests use simulated wallets/RPCs and fixture-only runtime substitutions. Default production catalog guards are exercised explicitly; older generic engine unit fixtures inject their synthetic authority rather than adding fake contracts to production permissions.

No installed wallet prompts, signing, broadcasts, publishing, or GitHub pushes were performed for this work. Passing tests establish the covered software behavior, not live transaction success.
