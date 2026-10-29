export type ContractRecord = {
  id: string;
  label: string;
  address: `0x${string}`;
  source?: string;
  note?: string;
};

export const OFFICIAL_SOURCES = {
  website: "https://oink-pls.com/",
  application: "https://oink-pls.github.io/Piggy-Bank-UI/",
  applicationSource: "https://github.com/OINK-pls/Piggy-Bank-UI",
  contractsPage: "https://oink-pls.com/smart-contracts.html",
  contractSource: "https://github.com/OINK-pls/PiggyBank",
  explorer: "https://scan.pulsechain.com/address/",
} as const;

export const CORE_CONTRACTS = [
  {
    id: "oink-token",
    label: "OINK token",
    address: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
    source: "contracts/XPD.sol",
  },
  {
    id: "governor",
    label: "Governing contract",
    address: "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16",
    source: "contracts/governor.sol",
  },
  {
    id: "inflation",
    label: "Inflation",
    address: "0x486fEa20eA242456b450B005ED7D019E3E984f28",
    source: "contracts/masterchef.sol",
  },
  {
    id: "senate",
    label: "Senate",
    address: "0x147B43930283d1DDe43d805B7f17E4604b7ca493",
    source: "contracts/senate.sol",
  },
] as const satisfies readonly ContractRecord[];

export const TIME_MINER_CONTRACTS = [
  {
    id: "one-month",
    label: "1 month",
    address: "0x39b3E852D6fFA1aF6694Ef87C062450de6778da8",
    source: "contracts/mining/1Month.sol",
  },
  {
    id: "three-month",
    label: "3 months",
    address: "0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4",
    source: "contracts/mining/3month.sol",
  },
  {
    id: "six-month",
    label: "6 months",
    address: "0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67",
    source: "contracts/mining/6month.sol",
  },
  {
    id: "one-year",
    label: "1 year",
    address: "0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1",
    source: "contracts/mining/1year.sol",
  },
  {
    id: "three-year",
    label: "3 years",
    address: "0x15b51Ece819f3B51ce814de67bB2419660701a3c",
    source: "contracts/mining/3year.sol",
  },
  {
    id: "five-year",
    label: "5 years",
    address: "0xf3E82f4123d4262a2baEC25b03652f3932A91739",
    source: "contracts/mining/5year.sol",
  },
] as const satisfies readonly ContractRecord[];

export const ECOSYSTEM_MINER_CONTRACTS = [
  ["pls", "PLS", "0xE145932f6b010B0166aA6860D56b2730744B7d6f", "contracts/pulse-ecosystem/plsVault.sol"],
  ["plsx", "PLSX", "0x16233F6d7398f134EbCec11101e792c03ED296a4", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["inc", "INC", "0x852443CB5b5f5B10e514CA74104bBF2Cd6CeF868", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["hex", "HEX", "0x164D4C1fDd74A5b7256Fd9Eca958c9ff70617c03", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["t-share", "HEX T-Share", "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85", "contracts/pulse-ecosystem/hexSharesVault.sol"],
  ["hoa", "HOA", "0x9E70665aDee807f262Ae59Dc1f8D4Dd878320C21", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pdai", "pDAI", "0xc13b8974CD5caa67D7e539D2654C872b5AcA5105", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["atropa", "ATROPA", "0x7c61919AccF037975bbD3a91b0F5811c640018b1", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["solidx", "SolidX", "0x2057dd1687eafCD809386a41012748AC509df542", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["treasury", "Treasury miner", "0x96185280d32184C847580c35eaB77affaC835d98", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pusdt", "pUSDT", "0xed1b56c799d28a988bd79bbf2f7e238c2ba15c21", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pusdc", "pUSDC", "0xf46810ce204a9a85a673ea9bbcc1bf5481ee1328", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["pdrip", "PDRIP", "0xc49EF441FFb79108047E4dF812F375A7E48FD3De", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["emit", "EMIT", "0x1aB20028a50477e11bC4066047D8942De1375eF7", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["communitas", "Communitas", "0x4441c3bDB96139A45dF653Ec0432d076631A6D9F", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["ptgc", "pTGC", "0xa620473a3eb138c43e1f7065bda0ded0e039d8fd", "contracts/pulse-ecosystem/tokenVault.sol"],
  ["ufo", "UFO", "0xce34298e7456fd748e432e02cc4f107ac864c739", "contracts/pulse-ecosystem/tokenVault.sol"],
].map(([id, label, address, source]) => ({ id, label, address, source })) as ContractRecord[];

export const GOVERNANCE_CONTRACTS = [
  {
    id: "consensus",
    label: "Consensus",
    address: "0x7917e04Eb4463CF80Cc00040BA0f1fF125926eF3",
    source: "contracts/consensus.sol",
  },
  {
    id: "reward-boost",
    label: "Reward boost",
    address: "0xc77c66913B5f60522Ccb98857228511930da7403",
    source: "contracts/rewardBoost.sol",
  },
  {
    id: "basic-settings",
    label: "Basic settings",
    address: "0x5DebADaf41ED55270e0F9944FD389745e73d29B9",
    source: "contracts/basicSettings.sol",
  },
  {
    id: "allocation-settings",
    label: "Allocation settings",
    address: "0x0dc0Fabe4c9d57cCaD055b4cD627D0d24fA3C98E",
    source: "contracts/farms.sol",
  },
  {
    id: "voting-credit",
    label: "Voting credit",
    address: "0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A",
    source: "contracts/votingCredit.sol",
  },
  {
    id: "referral-rewards",
    label: "Referral rewards",
    address: "0xf69357627d6dcc463ac30273Aae13fDB49B07C15",
    source: "contracts/referralRewards.sol",
  },
] as const satisfies readonly ContractRecord[];

export const TREASURY_AND_HELPER_CONTRACTS = [
  {
    id: "treasury-wallet",
    label: "Treasury wallet",
    address: "0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69",
    source: "contracts/wallets/treasuryWallet.sol",
  },
  {
    id: "treasury-miner",
    label: "Treasury locked miner",
    address: "0x4807bdD7039a1fc236c14dc60D73a64eEa450731",
    source: "contracts/helper/treasuryMiner.sol",
  },
  {
    id: "nft-wallet",
    label: "NFT wallet",
    address: "0x26E6e614C46dA4c459d0dB2121A986672F603c00",
    source: "contracts/wallets/NFTwallet.sol",
  },
  {
    id: "nft-mining",
    label: "NFT mining module",
    address: "0x140f16365d05DcC84Fa489194CD022d5CBee4cb2",
    source: "contracts/NFT/NFTmining.sol",
  },
  {
    id: "nft-allocation",
    label: "NFT allocation",
    address: "0xD8508461e8134e25dc630871566B1551e797E1a7",
    source: "contracts/NFT/allocationNFT.sol",
  },
  {
    id: "buyback",
    label: "Buy-back",
    address: "0xa36d037B01C148025C54e4f86C0032F05a93D4Ce",
    source: "contracts/helper/buyBackAndBurn.sol",
  },
  {
    id: "proxy-voting",
    label: "Proxy voting",
    address: "0x003F5d5bB97028AF17B0925B08cb184a74F9030f",
    source: "contracts/helper/proxyVoting.sol",
  },
  {
    id: "contract-sync",
    label: "Contract sync",
    address: "0x506D24B519AC4Af9724Cc5F9eaf006e987e753d6",
    source: "contracts/helper/contractSync.sol",
  },
] as const satisfies readonly ContractRecord[];

export const OINK_TOKEN = CORE_CONTRACTS[0].address;
export const TREASURY_WALLET = TREASURY_AND_HELPER_CONTRACTS[0].address;

export function explorerUrl(address: string) {
  return `${OFFICIAL_SOURCES.explorer}${address}`;
}

export function sourceUrl(source: string) {
  return `${OFFICIAL_SOURCES.contractSource}/blob/main/${source}`;
}
