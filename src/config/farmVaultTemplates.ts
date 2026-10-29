// Generated offline by scripts/generate-farm-vault-templates.mjs.
// Entire reviewed executable is hashed; only compiler-reported immutable
// address slots and the validated Solidity IPFS metadata trailer are normalized.
// Original and later helper implementations were reviewed in expanded-farm-vaults.json.
export type FarmVaultTemplate = {
  id: string; kind: "native" | "erc20"; compiler: string; optimizerEnabled: boolean; optimizerRuns: number;
  sourceCodeHash: string; normalizedExecutableHash: string; executableBytes: number; exemplarAddress: string;
  immutables: readonly { role: "rewardToken" | "stakeToken"; compilerAstId: string; offsets: readonly number[] }[];
};
export const FARM_VAULT_TEMPLATES = [
  {
    "id": "pls-vault-0.8.20-optimized",
    "kind": "native",
    "compiler": "v0.8.20+commit.a1b79de6",
    "optimizerEnabled": true,
    "optimizerRuns": 200,
    "sourceCodeHash": "0x94aa4db2673d9270829d32dee1647c6e503e2a1ffab13c53933abd7e6be4535f",
    "normalizedExecutableHash": "0x1ef00f7280bcc72d9af3b9b71e6ea78cb42785ff5c59757cd8a8bb4fcf791897",
    "executableBytes": 11453,
    "exemplarAddress": "0xE145932f6b010B0166aA6860D56b2730744B7d6f",
    "immutables": [
      {
        "role": "rewardToken",
        "compilerAstId": "2096",
        "offsets": [
          1798,
          7916
        ]
      }
    ]
  },
  {
    "id": "token-vault-0.8.20-optimized",
    "kind": "erc20",
    "compiler": "v0.8.20+commit.a1b79de6",
    "optimizerEnabled": true,
    "optimizerRuns": 200,
    "sourceCodeHash": "0x2872e463da6f073c9cda591d08e366afa2122ad27fb710aee6e221f1853ddb54",
    "normalizedExecutableHash": "0xfe8043488c1c371f1385e01bcf9385ed1b98bf40bc0f097ad259bb68de9f4d3d",
    "executableBytes": 11408,
    "exemplarAddress": "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03",
    "immutables": [
      {
        "role": "rewardToken",
        "compilerAstId": "2096",
        "offsets": [
          1414,
          7977
        ]
      },
      {
        "role": "stakeToken",
        "compilerAstId": "2099",
        "offsets": [
          868,
          2559,
          3350,
          4028,
          6379,
          6579,
          7539,
          7844,
          8090,
          9431
        ]
      }
    ]
  },
  {
    "id": "token-vault-0.8.20-unoptimized",
    "kind": "erc20",
    "compiler": "v0.8.20+commit.a1b79de6",
    "optimizerEnabled": false,
    "optimizerRuns": 200,
    "sourceCodeHash": "0x02b39eddbfd0a5aa41ba6b878ff7ce1bf16ce365b13649982d956c80121a35e8",
    "normalizedExecutableHash": "0x49fa55602474c057073fe6e7dad79895ea081cec557a881fd25547e07523f9bc",
    "executableBytes": 19454,
    "exemplarAddress": "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21",
    "immutables": [
      {
        "role": "rewardToken",
        "compilerAstId": "2096",
        "offsets": [
          12076,
          13295
        ]
      },
      {
        "role": "stakeToken",
        "compilerAstId": "2099",
        "offsets": [
          3777,
          4872,
          5418,
          5867,
          9539,
          10025,
          11543,
          11904,
          12218,
          14289
        ]
      }
    ]
  },
  {
    "id": "token-vault-later-0.8.20-unoptimized",
    "kind": "erc20",
    "compiler": "v0.8.20+commit.a1b79de6",
    "optimizerEnabled": false,
    "optimizerRuns": 200,
    "sourceCodeHash": "0x0e597a81c26179820a99420f091800d94f1add835bedf43444ed7169f83521ca",
    "normalizedExecutableHash": "0x2be1bdd8714acc2db6423d5fc437d6bc5606f43af6d876b0574a19a5ab5a7aa1",
    "executableBytes": 18803,
    "exemplarAddress": "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21",
    "immutables": [
      {
        "role": "rewardToken",
        "compilerAstId": "2013",
        "offsets": [
          12076,
          13295
        ]
      },
      {
        "role": "stakeToken",
        "compilerAstId": "2016",
        "offsets": [
          3777,
          4872,
          5418,
          5867,
          9539,
          10025,
          11543,
          11904,
          12218,
          14289
        ]
      }
    ]
  }
] as const satisfies readonly FarmVaultTemplate[];
