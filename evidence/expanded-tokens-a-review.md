# Expanded ordinary-farm deposit tokens, group A

Verified on PulseChain (chain 369), block **27586249**. Run:

```sh
node scripts/verify-expanded-tokens-a.mjs --block=27586249
```

`expanded-tokens-a.json` records the block hash, complete token runtime hashes,
source hashes, compiler versions/settings/hashes, decimals, raw zero-amount
`eth_call` return encodings and relevant mutable state. The corresponding
`expanded-tokens-a-sources` files preserve explorer responses, Solidity source
and complete runtime bytecode. This script makes no transaction sends and uses
no signer. Compiler JavaScript comes from Solidity's official binary CDN;
downloaded contract source is compiled, not executed.

All six explorer sources compile to the observed executable runtime after
removing Solidity's length-delimited metadata suffix. No token has compiler
immutable references requiring masking. Their complete runtime hashes remain
pinned, including metadata. Each source declares no proxy at its deployed
address; pUSDT's explicit deprecation forwarding is separately addressed below.
Zero-amount approve/transfer/transferFrom calls use the relevant farm vault as
the simulated caller and token owner. These calls confirm encoding; source
inspection establishes nonzero amount semantics.

| Token | Decimals | Runtime keccak256 | Return encoding |
|---|---:|---|---|
| HEX | 8 | `0x072dc3ede6578c96b5b547786fa670d627a18c956b0993a19c4435b8999563a6` | bool true |
| HOA | 18 | `0x7fc15dbaf378e641eda586f82968a15f1208644eade96ee542468ee42b4ab481` | bool true |
| pDAI | 18 | `0x4e36f96ee1667a663dfaac57c4d185a0e369a3a217e0079d49620f34f85d1ac7` | bool true |
| ATROPA | 18 | `0xbdb34a5b8f52bcf6a50eca25dfe92351dda3f1e2d213cecf1f97c28838e54c54` | bool true |
| SOLIDX | 18 | `0x91733197bdd14cc58b75127f5b04ce88746569ec93c45fe5041c8f83fe4d3e71` | bool true |
| pUSDT | 6 | `0xb44fb4e949d0f78f87f79ee46428f23a2a5713ce6fc6e0beb3dda78c2ac1ea55` | empty `0x` |

## Ordinary ERC20 candidates

**HEX** (`hex.sol:318-418`) uses the inherited ERC20 exact balance subtraction
and addition, returning true for transfer, transferFrom and approve. Its staking,
claim and inflation mint/burn mechanisms are separate entry points; ordinary
wallet balances do not rebase and there is no transfer fee, pause, blacklist or
upgrade switch. Allowance spending checks the entire amount.

**HOA** (`hoa.sol:264-385`, constructor at end) is the unmodified ERC20
implementation. GoPulseToken only supplies its constructor mint. No external
mint, burn, owner, fee, transfer hook override, pause or upgrade exists.

**pDAI** (`pdai.sol:122-157`) moves the exact amount, returns true, and checks
allowance except for the owner transferring their own balance or an unlimited
allowance. `wards` administrators can mint and change authorization. Burn requires
ownership/allowance. These operations do not alter ERC20 transfer semantics or
rebase existing wallet balances. There is no pause, blacklist, transfer fee or
implementation switch. This integration uses ordinary approvals, not permit.

**ATROPA** (`atropa.sol:317-448,626-633`) inherits unmodified ERC20 and
ERC20Burnable. Ownable only authorizes explicit mint and ownership changes. The
live owner is the zero address, so that mint authority is renounced. There are no
transfer fees, pause/blacklist hooks, rebases or implementation switches.

**SOLIDX** (`solidx.sol:257-383`, Token declaration at end) inherits unmodified
ERC20 and ERC20Burnable. A constructor-set router is used only by the separate
explicit addLiquidity path. Ordinary approve/transfer/transferFrom do not call
the router. No external mint, ownership setting, transfer fee, pause, blacklist,
rebase or upgrade mechanism exists.

These five are compatible with exact-amount ordinary ERC20 farm writes, subject
to the independently verified vault contract, token runtime/decimals pinning,
allowance checks, fresh simulation and receipt validation already required by
the application.

## pUSDT: conditional support only

Source `pusdt.sol:126-211,340-389,429-437` establishes:

- All three ERC20 mutations return **no ABI data**, not bool. Empty approval
  results must be allowed only for this explicitly identified token policy.
- Nonzero approval requires an existing allowance of zero. Reset to zero first
  when replacing a nonzero allowance, then set the exact requested amount.
- Transfer fee is `min(amount * basisPointsRate / 10000, maximumFee)` and is
  credited to the owner. Both fee settings are mutable by the owner.
- `paused` rejects transfer and transferFrom. Transfer rejects a blacklisted
  caller; transferFrom rejects a blacklisted source account. Approval itself
  does not check pause or blacklist.
- `deprecated=true` redirects approve/transfer/transferFrom and balance/allowance
  reads to `upgradedAddress`. This is an explicit upgrade path even though the
  explorer does not label the contract a proxy.
- Owner can blacklist accounts, destroy a blacklisted balance, issue/redeem
  supply and change ownership. This is not a rebase token, but an owner can
  confiscate a blacklisted balance.

At the pinned block: deprecated=false, upgradedAddress=zero, paused=false,
basisPointsRate=0, maximumFee=0, farm vault not blacklisted. Owner is
`0xC6CDE7C39eB2f0F0095F41570af89eFC2C1Ea828`.

Recommended conservative application policy: require both fee fields zero,
deprecated=false, paused=false and the account/vault/treasury unblacklisted at
each fresh preparation and pre-send validation. Pin the complete token runtime,
use the empty-return approval policy, and retain exact reset approvals. The
source only blocks the transfer source, but checking every involved account
also avoids obvious frozen destinations. This token's administrator can change
state after a preflight; such token-level authority is not removed by frontend
checks. Do not imply that a UI preflight can prevent a later administrative
change.

An additional live read confirmed address
`0x0000000000000000000000000000000000000001` is blacklisted, and its zero transfer
reverts despite the healthy global flags. That observed failure confirms the
need for account-specific checks rather than a global token-health check alone.

This review verifies token behavior for integration; it does not certify the
token economics or replace the separate farm/treasury/reward dependency review.
