// Read-only models recompiled and matched by scripts/verify-farm-readers.mjs --special.
// These entries never authorize wallet transactions.
export const SPECIAL_FARM_READS = [
  {
    "id": "t-share",
    "address": "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85",
    "tokenAddress": "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
    "decimals": 12,
    "poolId": "10",
    "runtimeCodeHash": "0x75aeddca36cf87f55a75a1a04a99d5581d8d1ad6d400769e3004778fe1391aa8",
    "treasury": "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16"
  },
  {
    "id": "treasury",
    "address": "0x96185280d32184C847580c35eaB77affaC835d98",
    "tokenAddress": null,
    "decimals": 18,
    "poolId": "16",
    "runtimeCodeHash": "0xdda4175ced9e7cea51efe91d6a508895c5751fa830679dfbe1042354b4049c04",
    "treasury": "0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69"
  }
] as const;
