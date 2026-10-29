// Public-read verification only. This list NEVER grants transaction permissions.
// Explorer sources were recompiled with solc 0.8.20 and their optimizer settings.
// Executable bytes matched after masking compiler-declared immutables and metadata;
// the full runtime hash, pool, deposit token and decimals are pinned below.
// Evidence: scripts/verify-farm-readers.mjs, PulseChain block 27532582.
export const FARM_READ_CHEF = {
  address: "0x486fEa20eA242456b450B005ED7D019E3E984f28",
  runtimeCodeHash: "0x72e1439f55c801448cbaa41cb751af8d4ccd76b5d9be5f0a5a3bfb7d0bf8add7",
  rewardToken: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
} as const;
export const VERIFIED_FARM_READS = [
  {
    "id": "pls",
    "address": "0xE145932f6b010B0166aA6860D56b2730744B7d6f",
    "tokenAddress": null,
    "decimals": 18,
    "poolId": "6",
    "runtimeCodeHash": "0x5080e8894d36bdcc764a584ccbe690c4bb19df87329e93f905e735c60ff6839e"
  },
  {
    "id": "plsx",
    "address": "0x16233F6d7398f134EbCec11101e792c03ED296a4",
    "tokenAddress": "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    "decimals": 18,
    "poolId": "7",
    "runtimeCodeHash": "0x708ba7857acc91b3a704e5a927ab87b4d8c269548943e12dc596ab70f89cb10b"
  },
  {
    "id": "inc",
    "address": "0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868",
    "tokenAddress": "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    "decimals": 18,
    "poolId": "8",
    "runtimeCodeHash": "0x263b4c28d29ae461e341b99ef616586fe84171a871341d96644f783f00beb4b6"
  },
  {
    "id": "hex",
    "address": "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03",
    "tokenAddress": "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    "decimals": 8,
    "poolId": "9",
    "runtimeCodeHash": "0x39cdf4ba5b3bf531408c399acbb4bb403d3fa7575a790982a7102df53fb7857b"
  },
  {
    "id": "hoa",
    "address": "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21",
    "tokenAddress": "0x7901a3569679AEc3501dbeC59399F327854a70fe",
    "decimals": 18,
    "poolId": "12",
    "runtimeCodeHash": "0x69a94e7b48c5af68005d8ff899e35f83c19364311b9150f01bf8f754d9fa9a3a"
  },
  {
    "id": "pdai",
    "address": "0xc13b8974CD5caa67D7e539D2654C872b5AcA5105",
    "tokenAddress": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "decimals": 18,
    "poolId": "14",
    "runtimeCodeHash": "0xe4d87878cb9ef4de46065d49c44cfb0306e7a88a6aa25fc85c8874dddbe30587"
  },
  {
    "id": "atropa",
    "address": "0x7c61919AccF037975bbD3a91b0F5811c640018b1",
    "tokenAddress": "0xCc78A0acDF847A2C1714D2A925bB4477df5d48a6",
    "decimals": 18,
    "poolId": "13",
    "runtimeCodeHash": "0x660b549c1cf4063e45499b206185790ccba3ed88b8f92fbe747c176fc0d9dc26"
  },
  {
    "id": "solidx",
    "address": "0x2057dd1687eafCD809386a41012748AC509df542",
    "tokenAddress": "0x8Da17Db850315A34532108f0f5458fc0401525f6",
    "decimals": 18,
    "poolId": "15",
    "runtimeCodeHash": "0x6e321e2e4be921a8506946a5d57b4e73ec0ee7b3c24b1f8fc2e517c7899425de"
  },
  {
    "id": "pusdt",
    "address": "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21",
    "tokenAddress": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "decimals": 6,
    "poolId": "17",
    "runtimeCodeHash": "0xab2ec17866990c1ed2eb01196bfc7b518d1719331a7c774cdfce726ed11bbc38"
  },
  {
    "id": "pusdc",
    "address": "0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328",
    "tokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "decimals": 6,
    "poolId": "18",
    "runtimeCodeHash": "0x454b17198184ba79d7149f7bcb2f42bbf03ec3954b9c9b4c1f8042c7220916bd"
  },
  {
    "id": "pdrip",
    "address": "0xc49EF441FFb79108047E4dF812F375A7E48FD3De",
    "tokenAddress": "0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68",
    "decimals": 18,
    "poolId": "19",
    "runtimeCodeHash": "0x1c67e6f77b3e964457f47fffa51123d91be50405a1f6dbea1fbc70a6e9d012a9"
  },
  {
    "id": "emit",
    "address": "0x1aB20028a50477e11bC4066047D8942De1375eF7",
    "tokenAddress": "0x32fB5663619A657839A80133994E45c5e5cDf427",
    "decimals": 18,
    "poolId": "20",
    "runtimeCodeHash": "0x9ee2dfb530c509f8e42d62e74d63533acac6048610baee02e10f2fbf21e0ba0d"
  },
  {
    "id": "communitas",
    "address": "0x4441c3bDB96139A45dF653Ec0432d076631A6D9F",
    "tokenAddress": "0x5A9780Bfe63f3ec57f01b087cD65BD656C9034A8",
    "decimals": 12,
    "poolId": "21",
    "runtimeCodeHash": "0xa3a859517efbd7e91921042cbdeada0e0927dd593c8651ab3cd688c42cf4f23b"
  },
  {
    "id": "ptgc",
    "address": "0xa620473a3eb138c43e1f7065bda0ded0e039d8fd",
    "tokenAddress": "0x94534EeEe131840b1c0F61847c572228bdfDDE93",
    "decimals": 18,
    "poolId": "22",
    "runtimeCodeHash": "0xa17615ecabc54f0c7846d985cc9b2adb63d8a6d5478e6f82517e968f9ea44f1c"
  },
  {
    "id": "ufo",
    "address": "0xce34298e7456fd748e432e02cc4f107ac864c739",
    "tokenAddress": "0x456548A9B56eFBbD89Ca0309edd17a9E20b04018",
    "decimals": 18,
    "poolId": "23",
    "runtimeCodeHash": "0x1cad09a741a1ad3b5d6938b7092cade939ae0027825142fd7a8e38a84011da71"
  }
] as const;

