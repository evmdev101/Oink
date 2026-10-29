import type { FarmWriteSpec } from "../lib/farmTransactions";
import { EXPANDED_FARM_WRITES } from "./expandedFarmWriteVerification";

// Explicit farm transaction allowlist. Sending always needs a fresh review and wallet confirmation.
// Recompiled the explorer's verified sources with the exact compiler settings:
// executable runtime matched after removing Solidity metadata and masking only
// compiler-reported immutable slots. Full, unmodified runtime hashes below must
// match at preflight; live getters independently verify the immutable addresses.
// All values were read at one PulseChain block. Revalidate mutable wiring, fees,
// balances, allowances, and the exact call before every wallet confirmation.
const COMMON = {
  decimals: 18,
  masterchef: "0x486fEa20eA242456b450B005ED7D019E3E984f28",
  governor: "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16",
  rewardToken: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
  treasuryWallet: "0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69",
  masterchefRuntimeCodeHash: "0x72e1439f55c801448cbaa41cb751af8d4ccd76b5d9be5f0a5a3bfb7d0bf8add7",
  governorRuntimeCodeHash: "0xbf0068e99a4e77c65840829edc205943d6aa9eeb7024c5d03f2f68ca9d9953c0",
  rewardTokenRuntimeCodeHash: "0x9cb905e3b06ca991654cbba486fa3d1166a06ba931daac17afaf76f9c11fc421",
  verifiedAt: "2026-09-12T01:51:12Z",
  verifiedBlock: 27523086,
} as const;

export const VERIFIED_FARM_WRITES = [
  {
    ...COMMON,
    id: "pls",
    address: "0xE145932f6b010B0166aA6860D56b2730744B7d6f",
    tokenAddress: null,
    symbol: "PLS",
    poolId: "6",
    runtimeCodeHash: "0x5080e8894d36bdcc764a584ccbe690c4bb19df87329e93f905e735c60ff6839e",
    tokenRuntimeCodeHash: null,
    sourceUrl: "https://scan.pulsechain.com/address/0xE145932f6b010B0166aA6860D56b2730744B7d6f#code",
  },
  {
    ...COMMON,
    id: "plsx",
    address: "0x16233F6d7398f134EbCec11101e792c03ED296a4",
    tokenAddress: "0x95B303987A60C71504D99Aa1b13B4DA07b0790ab",
    symbol: "PLSX",
    poolId: "7",
    runtimeCodeHash: "0x708ba7857acc91b3a704e5a927ab87b4d8c269548943e12dc596ab70f89cb10b",
    tokenRuntimeCodeHash: "0x1708627a8bae161fc2cbb85a3acc6e6b15c298e1dc41f9624c25a35638150c3c",
    sourceUrl: "https://scan.pulsechain.com/address/0x16233F6d7398f134EbCec11101e792c03ED296a4#code",
  },
  {
    ...COMMON,
    id: "inc",
    address: "0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868",
    tokenAddress: "0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d",
    symbol: "INC",
    poolId: "8",
    runtimeCodeHash: "0x263b4c28d29ae461e341b99ef616586fe84171a871341d96644f783f00beb4b6",
    tokenRuntimeCodeHash: "0x2f96a22dfc774288303b34d1bb4f743821296fe0a65660abd0f4ca2729ff809c",
    sourceUrl: "https://scan.pulsechain.com/address/0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868#code",
  },
  ...EXPANDED_FARM_WRITES.map((entry) => ({ ...COMMON, ...entry })),
] as const satisfies readonly FarmWriteSpec[];

export const FARM_WRITE_VERIFICATION_EVIDENCE = {
  // Historical original-three deposit audit; later actions and assets have their own evidence.
  officialDirectory: "https://oink-pls.com/smart-contracts.html",
  sourceApi: "https://api.scan.pulsechain.com/api?module=contract&action=getsourcecode&address=",
  verifiedSnapshotTimestamp: "2026-09-12T01:48:05Z",
  vaultCompiler: "0.8.20+commit.a1b79de6",
  vaultOptimizerRuns: 200,
  vaultCompilerUrl: "https://binaries.soliditylang.org/bin/soljson-v0.8.20+commit.a1b79de6.js",
  tokenCompiler: "0.8.12+commit.f00d7308",
  tokenOptimizerRuns: 999999,
  tokenEvmVersion: "london",
  tokenCompilerUrl: "https://binaries.soliditylang.org/bin/soljson-v0.8.12+commit.f00d7308.js",
  independentlyCompiled: ["pls", "plsx", "inc", "PLSX token", "INC token"],
  // These are keccak256 hashes of the exact SourceCode strings returned by
  // the explorer, not normalized source text or compiled bytecode hashes.
  sourceCodeHashes: {
    plsVault: "0x94aa4db2673d9270829d32dee1647c6e503e2a1ffab13c53933abd7e6be4535f",
    tokenVault: "0x2872e463da6f073c9cda591d08e366afa2122ad27fb710aee6e221f1853ddb54",
    plsxTokenMainSource: "0xba1952cf176c5050e4e5a3d02c82118521956eef6f29488c878c8c9774b148d9",
    incTokenMainSource: "0x7a7d84271ecbdbac607f2f4542d83da17b67ffff3b69b9ab1423ae61ab6a07fd",
  },
  normalizedExecutableHashes: {
    plsVault: "0x1ef00f7280bcc72d9af3b9b71e6ea78cb42785ff5c59757cd8a8bb4fcf791897",
    tokenVault: "0xfe8043488c1c371f1385e01bcf9385ed1b98bf40bc0f097ad259bb68de9f4d3d",
    plsxToken: "0x33f1d924785f4042e6e7b2fbda5d37aa3922efb91c535625a5f42b71482833a5",
    incToken: "0x8833d17b14b7acaa8488aa3b292abdc1d177d42fb13b509ff2ecee618be4e73a",
  },
  liveSettingsAtVerification: {
    depositFee: "0",
    fundingRate: "250",
    maxFee: "500",
    maxFundingFee: "250",
    defaultDirectPayout: "50",
  },
  depositSignature: "deposit(uint256,address)",
  approvalSignature: "approve(address,uint256)",
  approvalSpender: "The allowlisted vault address only",
  referralPolicy: "Zero address; existing on-chain referral remains unchanged",
  fundingFormula: "wholeHours * recordedAmount * fundingRate / 1000000; capped at 20% of that position per collection",
  directPayoutFormula: "grossReward * defaultDirectPayout / 10000; remaining OINK goes to Governor",
  limitations: [
    "MasterChef, Governor and OINK dependency runtimes are pinned and live wiring checked; these dependencies were not independently recompiled in this farm audit.",
    "Successful simulation verifies call execution, not economic safety or future returns.",
    "Harvests, withdrawals, other farm assets and T-Share are outside this deposit allowlist.",
    "No transaction was broadcast and no local-fork transaction was sent during verification.",
  ],
} as const;
