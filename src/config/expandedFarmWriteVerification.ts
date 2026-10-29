// Explicitly reviewed additions; never infer write support from the read catalog.
// Evidence: expanded-farm-vaults.json and expanded-tokens-{a,b}.json.
// The original three farms retain their earlier verification snapshot.
export const EXPANDED_FARM_WRITES = [
  {
    "id": "hex",
    "address": "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03",
    "tokenAddress": "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    "symbol": "HEX",
    "decimals": 8,
    "poolId": "9",
    "runtimeCodeHash": "0x39cdf4ba5b3bf531408c399acbb4bb403d3fa7575a790982a7102df53fb7857b",
    "tokenRuntimeCodeHash": "0x072dc3ede6578c96b5b547786fa670d627a18c956b0993a19c4435b8999563a6",
    "sourceUrl": "https://scan.pulsechain.com/address/0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281
  },
  {
    "id": "hoa",
    "address": "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21",
    "tokenAddress": "0x7901a3569679AEc3501dbeC59399F327854a70fe",
    "symbol": "HOA",
    "decimals": 18,
    "poolId": "12",
    "runtimeCodeHash": "0x69a94e7b48c5af68005d8ff899e35f83c19364311b9150f01bf8f754d9fa9a3a",
    "tokenRuntimeCodeHash": "0x7fc15dbaf378e641eda586f82968a15f1208644eade96ee542468ee42b4ab481",
    "sourceUrl": "https://scan.pulsechain.com/address/0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281
  },
  {
    "id": "pdai",
    "address": "0xc13b8974CD5caa67D7e539D2654C872b5AcA5105",
    "tokenAddress": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "symbol": "pDAI",
    "decimals": 18,
    "poolId": "14",
    "runtimeCodeHash": "0xe4d87878cb9ef4de46065d49c44cfb0306e7a88a6aa25fc85c8874dddbe30587",
    "tokenRuntimeCodeHash": "0x4e36f96ee1667a663dfaac57c4d185a0e369a3a217e0079d49620f34f85d1ac7",
    "sourceUrl": "https://scan.pulsechain.com/address/0xc13b8974CD5caa67D7e539D2654C872b5AcA5105#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281
  },
  {
    "id": "atropa",
    "address": "0x7c61919AccF037975bbD3a91b0F5811c640018b1",
    "tokenAddress": "0xCc78A0acDF847A2C1714D2A925bB4477df5d48a6",
    "symbol": "ATROPA",
    "decimals": 18,
    "poolId": "13",
    "runtimeCodeHash": "0x660b549c1cf4063e45499b206185790ccba3ed88b8f92fbe747c176fc0d9dc26",
    "tokenRuntimeCodeHash": "0xbdb34a5b8f52bcf6a50eca25dfe92351dda3f1e2d213cecf1f97c28838e54c54",
    "sourceUrl": "https://scan.pulsechain.com/address/0x7c61919AccF037975bbD3a91b0F5811c640018b1#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281
  },
  {
    "id": "solidx",
    "address": "0x2057dd1687eafCD809386a41012748AC509df542",
    "tokenAddress": "0x8Da17Db850315A34532108f0f5458fc0401525f6",
    "symbol": "SolidX",
    "decimals": 18,
    "poolId": "15",
    "runtimeCodeHash": "0x6e321e2e4be921a8506946a5d57b4e73ec0ee7b3c24b1f8fc2e517c7899425de",
    "tokenRuntimeCodeHash": "0x91733197bdd14cc58b75127f5b04ce88746569ec93c45fe5041c8f83fe4d3e71",
    "sourceUrl": "https://scan.pulsechain.com/address/0x2057dd1687eafCD809386a41012748AC509df542#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281
  },
  {
    "id": "pusdt",
    "address": "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21",
    "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "symbol": "pUSDT",
    "decimals": 6,
    "poolId": "17",
    "runtimeCodeHash": "0xab2ec17866990c1ed2eb01196bfc7b518d1719331a7c774cdfce726ed11bbc38",
    "tokenRuntimeCodeHash": "0xb44fb4e949d0f78f87f79ee46428f23a2a5713ce6fc6e0beb3dda78c2ac1ea55",
    "sourceUrl": "https://scan.pulsechain.com/address/0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281,
    "tokenPolicy": {
      "kind": "usdt"
    }
  },
  {
    "id": "pusdc",
    "address": "0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328",
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "symbol": "pUSDC",
    "decimals": 6,
    "poolId": "18",
    "runtimeCodeHash": "0x454b17198184ba79d7149f7bcb2f42bbf03ec3954b9c9b4c1f8042c7220916bd",
    "tokenRuntimeCodeHash": "0xd80d4b7c890cb9d6a4893e6b52bc34b56b25335cb13716e0d1d31383e6b41505",
    "sourceUrl": "https://scan.pulsechain.com/address/0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281,
    "tokenPolicy": {
      "kind": "usdc",
      "implementation": {
        "slot": "0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3",
        "address": "0xa2327a938febf5fec13bacfb16ae10ecbc4cbdcf",
        "runtimeCodeHash": "0x10d68f9bb2ba9f5e9163cadc4a3446be0c6b2ab8b1b65079e79dcd94a6dc329c"
      }
    }
  },
  {
    "id": "communitas",
    "address": "0x4441c3bDB96139A45dF653Ec0432d076631A6D9F",
    "tokenAddress": "0x5A9780Bfe63f3ec57f01b087cD65BD656C9034A8",
    "symbol": "COM",
    "decimals": 12,
    "poolId": "21",
    "runtimeCodeHash": "0xa3a859517efbd7e91921042cbdeada0e0927dd593c8651ab3cd688c42cf4f23b",
    "tokenRuntimeCodeHash": "0x7db9a94e27f245936f2ae956fc3c7931e3087fdb2628fae0afe0968141e0af3c",
    "sourceUrl": "https://scan.pulsechain.com/address/0x4441c3bDB96139A45dF653Ec0432d076631A6D9F#code",
    "verifiedAt": "2026-09-19T15:13:54.973Z",
    "verifiedBlock": 27586281
  }
] as const;
