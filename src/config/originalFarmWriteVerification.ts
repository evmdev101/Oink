// Original OINK farm deployments. Vault and asset runtimes are pinned.
// PDRIP implementation source is unpublished: its exact proxy implementation
// is pinned separately and every user action must pass a fresh simulation.
// pTGC/UFO use received-token deposits and vaultBalance reward accounting.
export const ORIGINAL_FARM_WRITES = [
  {
    "id": "pdrip",
    "address": "0xc49EF441FFb79108047E4dF812F375A7E48FD3De",
    "tokenAddress": "0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68",
    "symbol": "PDRIP",
    "decimals": 18,
    "poolId": "19",
    "runtimeCodeHash": "0x1c67e6f77b3e964457f47fffa51123d91be50405a1f6dbea1fbc70a6e9d012a9",
    "tokenRuntimeCodeHash": "0x6bec2bf64f7e824109f6ed55f77dd7665801d6195e461666ad6a5342a9f6daf5",
    "sourceUrl": "https://scan.pulsechain.com/address/0xc49EF441FFb79108047E4dF812F375A7E48FD3De#code",
    "verifiedAt": "2026-10-31T14:12:14.079Z",
    "verifiedBlock": 27938803,
    "tokenPolicy": {
      "kind": "variable-transfer",
      "accounting": "nominal",
      "implementation": {
        "slot": "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
        "address": "0x565a58a0ac78d2a2e2a8f4dd0ec006f8b3afd281",
        "runtimeCodeHash": "0x9438911f90e699373445c81073207c2fbedfcf94f1d0728c2c9aea434df42d53"
      }
    }
  },
  {
    "id": "emit",
    "address": "0x1aB20028a50477e11bC4066047D8942De1375eF7",
    "tokenAddress": "0x32fB5663619A657839A80133994E45c5e5cDf427",
    "symbol": "EMIT",
    "decimals": 18,
    "poolId": "20",
    "runtimeCodeHash": "0x9ee2dfb530c509f8e42d62e74d63533acac6048610baee02e10f2fbf21e0ba0d",
    "tokenRuntimeCodeHash": "0xfc47a5d6dd16377039e483a23ad342dd1296b0bd1f1ccfbb0c220c8ddb7b3542",
    "sourceUrl": "https://scan.pulsechain.com/address/0x1aB20028a50477e11bC4066047D8942De1375eF7#code",
    "verifiedAt": "2026-10-31T14:12:14.079Z",
    "verifiedBlock": 27938803,
    "tokenPolicy": {
      "kind": "variable-transfer",
      "accounting": "nominal"
    }
  },
  {
    "id": "ptgc",
    "address": "0xa620473a3eb138c43e1f7065bda0ded0e039d8fd",
    "tokenAddress": "0x94534EeEe131840b1c0F61847c572228bdfDDE93",
    "symbol": "pTGC",
    "decimals": 18,
    "poolId": "22",
    "runtimeCodeHash": "0xa17615ecabc54f0c7846d985cc9b2adb63d8a6d5478e6f82517e968f9ea44f1c",
    "tokenRuntimeCodeHash": "0x5f67ca880f42b0293e2e8a56aa7163a8cadb6a8690ae2bbd5dd2f322897b53b8",
    "sourceUrl": "https://scan.pulsechain.com/address/0xa620473a3eb138c43e1f7065bda0ded0e039d8fd#code",
    "verifiedAt": "2026-10-31T14:12:14.079Z",
    "verifiedBlock": 27938803,
    "tokenPolicy": {
      "kind": "variable-transfer",
      "accounting": "received",
      "lockedBalance": "lockedAmount"
    }
  },
  {
    "id": "ufo",
    "address": "0xce34298e7456fd748e432e02cc4f107ac864c739",
    "tokenAddress": "0x456548A9B56eFBbD89Ca0309edd17a9E20b04018",
    "symbol": "UFO",
    "decimals": 18,
    "poolId": "23",
    "runtimeCodeHash": "0x1cad09a741a1ad3b5d6938b7092cade939ae0027825142fd7a8e38a84011da71",
    "tokenRuntimeCodeHash": "0x2ffa98dffdc6b9726c95fe058b0b356b2f1d0a630a4a939d9b942ea166b3630e",
    "sourceUrl": "https://scan.pulsechain.com/address/0xce34298e7456fd748e432e02cc4f107ac864c739#code",
    "verifiedAt": "2026-10-31T14:12:14.079Z",
    "verifiedBlock": 27938803,
    "tokenPolicy": {
      "kind": "variable-transfer",
      "accounting": "received"
    }
  }
] as const;
