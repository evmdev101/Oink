// Token identities checked against the original interface's markets and on-chain metadata.
export const TREASURY_EXTRA_TOKENS = [
  { symbol: "PRINT", priceId: "print", address: "0x6C203A555824ec90a215f37916cf8Db58EBe2fA3", decimals: 18 },
  { symbol: "EARN", priceId: "earn", address: "0xb513038BbFdF9D40B676F41606f4F61D4b02c4A2", decimals: 18 },
  { symbol: "HTT-3000", priceId: "htt3000", address: "0xE9E1340A2b31d5D2a2dB28FB854a794E106b430a", decimals: 8 },
  { symbol: "HTT-5000", priceId: "htt5000", address: "0xE2D03779147A32064511dd2b9D37F66f3EeFAd7C", decimals: 8 },
  { symbol: "HTT-7000", priceId: "htt7000", address: "0x47810bb3ECDc6b080CeB2d39E769F21Ff14AB7E9", decimals: 8 },
] as const;
