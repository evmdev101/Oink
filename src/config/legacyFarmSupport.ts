// These original farms have token-specific transaction models.
// Display explanations do not grant permissions; the write catalog does.
export const LEGACY_FARM_SUPPORT = {
  pdrip: {
    label: "PDRIP",
    reason: "PDRIP uses an upgradeable token whose implementation source is unpublished. The integration pins its current implementation and simulates each action before opening the wallet.",
    accounting: "The displayed stake is the vault's recorded amount. It is not a verified amount you can withdraw.",
    tokenAddress: "0xeB2CEed77147893Ba8B250c796c2d4EF02a72B68",
    implementationAddress: "0x565a58a0ac78d2a2e2a8f4dd0ec006f8b3afd281",
  },
  emit: {
    label: "EMIT",
    reason: "EMIT can deduct transfer fees and trigger swap or reward callbacks. Its vault records the nominal deposit, so recorded stake can differ from tokens actually received.",
    accounting: "Recorded stake can exceed the tokens received by the vault after token fees. A withdrawal can also incur token fees, separately from the farm's own fees.",
    tokenAddress: "0x32fB5663619A657839A80133994E45c5e5cDf427",
  },
  ptgc: {
    label: "pTGC",
    reason: "pTGC uses transfer fees and reflection rewards. Its vault credits the tokens actually received and calculates OINK rewards using its separate recorded vault balance.",
    accounting: "Recorded stake and token balance are different measures. Reflections and transfer fees can change the amount ultimately received on withdrawal.",
    tokenAddress: "0x94534EeEe131840b1c0F61847c572228bdfDDE93",
  },
  ufo: {
    label: "UFO",
    reason: "UFO uses transfer fees, reflection rewards and a configurable staking callback. Its vault credits actual received tokens and uses a separate balance for OINK rewards.",
    accounting: "Recorded stake and token balance are different measures. Reflections and transfer fees can change the amount ultimately received on withdrawal.",
    tokenAddress: "0x456548A9B56eFBbD89Ca0309edd17a9E20b04018",
  },
} as const;

export function legacyFarmSupport(id: string) {
  return Object.prototype.hasOwnProperty.call(LEGACY_FARM_SUPPORT, id)
    ? LEGACY_FARM_SUPPORT[id as keyof typeof LEGACY_FARM_SUPPORT]
    : null;
}
