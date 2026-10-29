import {
  OFFICIAL_SOURCES,
  OINK_TOKEN,
  TREASURY_WALLET,
} from "./contracts";

export { OINK_TOKEN, TREASURY_WALLET };

export const LINKS = {
  telegram: "https://t.me/OINKpls",
  website: OFFICIAL_SOURCES.website,
  buyOink: `https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=${OINK_TOKEN}`,
  miningMudpit: OFFICIAL_SOURCES.application,
  nftMining: "https://degenstrategy.github.io/NFT-miner/",
  dexscreener:
    "https://dexscreener.com/pulsechain/0xef9ea3d72e28c7140481209190601c085027d6fe",
  github: OFFICIAL_SOURCES.contractSource,
  applicationSource: OFFICIAL_SOURCES.applicationSource,
  contractsPage: OFFICIAL_SOURCES.contractsPage,
  oinkpaperPdf: "https://oink-pls.com/OINKpaper.pdf",
  whitepaperPdf: "https://oink-pls.com/whitepaper.pdf",
  scan: (address: string) => `https://scan.pulsechain.com/address/${address}`,
  audits: {
    solidproof: "https://oink-pls.com/SmartContract_Audit_Solidproof_PulseDAO.pdf",
    rdAuditors: "https://oink-pls.com/PulseDAO%20-%20Smart%20Contract%20Security%20Report.pdf",
    independent: "https://oink-pls.com/PulseDAO-Security-Review.pdf",
  },
} as const;
