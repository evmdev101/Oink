// Explorer source compilation and live wiring: evidence/access-contracts.json.
// Exact deployed bytecode is pinned separately from the public farm catalog.
export const HEX_SHARE_WRITE = {
  address: "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85",
  runtimeCodeHash: "0x75aeddca36cf87f55a75a1a04a99d5581d8d1ad6d400769e3004778fe1391aa8",
  hex: "0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39",
  hexRuntimeCodeHash: "0x072dc3ede6578c96b5b547786fa670d627a18c956b0993a19c4435b8999563a6",
} as const;
export const DISTRIBUTIONS = [
  { id: "contributors", label: "Contributor distribution", address: "0xE87C806f8AFA1cE543ab3C44D1c4b130B83574CE", runtimeCodeHash: "0x19d3b54826e7e9abc8769f2dd5551880489a6c3bc710343a833b356b7ddf8f71", root: "0x975eba4e9e41f055593d5cbe5e8f4ac168d3b041fde5b63241434dd02fd9bc14" },
  { id: "rewards", label: "Launch reward distribution", address: "0x51Aeb56C05a2BD781207B63D395475b7185c5fd7", runtimeCodeHash: "0x81cb306ac43a09943f0e3fe55f4ed6373d7511bdda5d49fe143ee9da991b755c", root: "0xe7f9f77ee201843b8f336261da4b4106db4e3ffc7c03cad99c5d5144d98d3491" },
] as const;
export type DistributionId = typeof DISTRIBUTIONS[number]["id"];
