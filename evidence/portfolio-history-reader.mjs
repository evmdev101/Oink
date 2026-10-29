// src/lib/portfolioHistory.ts
import { zeroPadValue, getAddress as getAddress2 } from "ethers";

// src/config/contracts.ts
var CORE_CONTRACTS = [
  {
    id: "oink-token",
    label: "OINK token",
    address: "0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38",
    source: "contracts/XPD.sol"
  },
  {
    id: "governor",
    label: "Governing contract",
    address: "0x331146b366c0Cd2AcA542ce71E5D6fb66bf07D16",
    source: "contracts/governor.sol"
  },
  {
    id: "inflation",
    label: "Inflation",
    address: "0x486fEa20eA242456b450B005ED7D019E3E984f28",
    source: "contracts/masterchef.sol"
  },
  {
    id: "senate",
    label: "Senate",
    address: "0x147B43930283d1DDe43d805B7f17E4604b7ca493",
    source: "contracts/senate.sol"
  }
];
var TIME_MINER_CONTRACTS = [
  {
    id: "one-month",
    label: "1 month",
    address: "0x39b3E852D6fFA1aF6694Ef87C062450de6778da8",
    source: "contracts/mining/1Month.sol"
  },
  {
    id: "three-month",
    label: "3 months",
    address: "0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4",
    source: "contracts/mining/3month.sol"
  },
  {
    id: "six-month",
    label: "6 months",
    address: "0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67",
    source: "contracts/mining/6month.sol"
  },
  {
    id: "one-year",
    label: "1 year",
    address: "0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1",
    source: "contracts/mining/1year.sol"
  },
  {
    id: "three-year",
    label: "3 years",
    address: "0x15b51Ece819f3B51ce814de67bB2419660701a3c",
    source: "contracts/mining/3year.sol"
  },
  {
    id: "five-year",
    label: "5 years",
    address: "0xf3E82f4123d4262a2baEC25b03652f3932A91739",
    source: "contracts/mining/5year.sol"
  }
];
var ECOSYSTEM_MINER_CONTRACTS = [
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
  ["ufo", "UFO", "0xce34298e7456fd748e432e02cc4f107ac864c739", "contracts/pulse-ecosystem/tokenVault.sol"]
].map(([id, label, address, source]) => ({ id, label, address, source }));
var TREASURY_AND_HELPER_CONTRACTS = [
  {
    id: "treasury-wallet",
    label: "Treasury wallet",
    address: "0x3a4DA32dc29b146F26D8527e37FeaAe45fBebe69",
    source: "contracts/wallets/treasuryWallet.sol"
  },
  {
    id: "treasury-miner",
    label: "Treasury locked miner",
    address: "0x4807bdD7039a1fc236c14dc60D73a64eEa450731",
    source: "contracts/helper/treasuryMiner.sol"
  },
  {
    id: "nft-wallet",
    label: "NFT wallet",
    address: "0x26E6e614C46dA4c459d0dB2121A986672F603c00",
    source: "contracts/wallets/NFTwallet.sol"
  },
  {
    id: "nft-mining",
    label: "NFT mining module",
    address: "0x140f16365d05DcC84Fa489194CD022d5CBee4cb2",
    source: "contracts/NFT/NFTmining.sol"
  },
  {
    id: "nft-allocation",
    label: "NFT allocation",
    address: "0xD8508461e8134e25dc630871566B1551e797E1a7",
    source: "contracts/NFT/allocationNFT.sol"
  },
  {
    id: "buyback",
    label: "Buy-back",
    address: "0xa36d037B01C148025C54e4f86C0032F05a93D4Ce",
    source: "contracts/helper/buyBackAndBurn.sol"
  },
  {
    id: "proxy-voting",
    label: "Proxy voting",
    address: "0x003F5d5bB97028AF17B0925B08cb184a74F9030f",
    source: "contracts/helper/proxyVoting.sol"
  },
  {
    id: "contract-sync",
    label: "Contract sync",
    address: "0x506D24B519AC4Af9724Cc5F9eaf006e987e753d6",
    source: "contracts/helper/contractSync.sol"
  }
];
var OINK_TOKEN = CORE_CONTRACTS[0].address;
var TREASURY_WALLET = TREASURY_AND_HELPER_CONTRACTS[0].address;

// src/config/farmReadVerification.ts
var VERIFIED_FARM_READS = [
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
];

// src/lib/portfolioHistoryModel.ts
import { Interface, formatUnits, getAddress } from "ethers";
var portfolioMinerEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
  "event GiftDeposit(address indexed sender,address indexed recipient,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
  "event Withdraw(address indexed sender,uint256 amount,uint256 penalty,uint256 shares)",
  "event TransferStake(address indexed sender,address indexed recipient,uint256 shares,uint256 stakeID)",
  "event HopPool(address indexed sender,uint256 DTXamount,uint256 shares,address indexed newPool)",
  "event HopDeposit(address indexed recipient,uint256 amount,uint256 shares,uint256 previousLastDepositedTime,uint256 mandatoryTime)",
  "event AddAndExtendStake(address indexed sender,address indexed recipient,uint256 amount,uint256 stakeID,uint256 shares,uint256 lastDepositedTime)",
  "event MigrateStake(address indexed goodSamaritan,uint256 DTXamount,uint256 shares,address indexed recipient)"
]);
var portfolioFarmEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 debt,uint256 depositFee,address indexed referral)",
  "event SelfHarvest(address indexed user,address indexed harvestInto,uint256 harvestAmount,uint256 penalty)",
  "event Withdraw(address indexed sender,uint256 stakeID,uint256 harvestAmount,uint256 penalty)"
]);
var portfolioHexEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 debt,address indexed referredBy)",
  "event Harvest(address indexed user,address indexed harvestInto,uint256 harvestAmount,uint256 penalty)",
  "event Withdraw(address indexed sender,uint256 harvestAmount,uint256 penalty)"
]);
function decodeWalletActivity(log, source, account) {
  try {
    if (log.removed || getAddress(log.address) !== getAddress(source.address) || !/^0x[0-9a-f]{64}$/i.test(log.transactionHash)) return null;
    const abi = source.kind === "miners" ? portfolioMinerEvents : source.kind === "hex" ? portfolioHexEvents : portfolioFarmEvents;
    const event = abi.parseLog({ data: log.data, topics: log.topics.filter((topic) => topic != null) });
    if (!event) return null;
    const a = event.args, mine = (value) => typeof value === "string" && getAddress(value) === getAddress(account);
    const incoming = mine(a.recipient), outgoing = mine(a.sender ?? a.user);
    if (!incoming && !outgoing) return null;
    let label = "", amount = "0", symbol = "OINK", deposited = "0", withdrawn = "0", harvested = "0", penalty = "0";
    if (source.kind === "miners") {
      if (event.name === "Deposit" || event.name === "GiftDeposit") {
        label = event.name === "Deposit" ? "Created miner" : incoming ? "Received gifted miner" : "Gifted miner";
        amount = formatUnits(a.amount, 18);
        if (event.name === "Deposit" || incoming) deposited = amount;
      } else if (event.name === "Withdraw") {
        label = "Withdrew miner";
        amount = withdrawn = formatUnits(a.amount, 18);
        penalty = formatUnits(a.penalty, 18);
      } else if (event.name === "TransferStake") {
        label = incoming && outgoing ? "Transferred miner to self" : incoming ? "Received miner" : "Transferred miner";
        amount = formatUnits(a.shares, 18);
        symbol = "shares";
      } else if (event.name === "HopPool" || event.name === "MigrateStake") {
        label = event.name === "HopPool" ? "Upgraded miner" : "Migrated miner";
        amount = formatUnits(a.DTXamount, 18);
      } else {
        label = event.name === "HopDeposit" ? "Received upgraded miner" : "Extended miner";
        amount = formatUnits(a.amount, 18);
      }
    } else if (event.name === "Deposit") {
      if (!outgoing) return null;
      label = source.kind === "hex" ? "Registered HEX shares" : "Deposited into farm";
      amount = formatUnits(a.amount, source.decimals);
      symbol = source.symbol;
    } else {
      if (!outgoing) return null;
      label = event.name === "Withdraw" ? source.kind === "hex" ? "Unregistered HEX shares" : "Withdrew farm position" : "Harvested rewards";
      amount = harvested = formatUnits(a.harvestAmount, 18);
    }
    const block = Number(BigInt(log.blockNumber)), index = Number(BigInt(log.logIndex)), timestamp = Number(BigInt(log.timeStamp));
    if (![block, index, timestamp].every((n) => Number.isSafeInteger(n) && n >= 0) || timestamp === 0) return null;
    return { key: log.transactionHash + ":" + index, hash: log.transactionHash, block, index, timestamp, source: source.label, sourceId: source.id, category: source.kind, label, amount, symbol, deposited, withdrawn, harvested, penalty };
  } catch {
    return null;
  }
}
function mergeWalletActivity(rows) {
  return [...new Map(rows.map((row) => [row.key, row])).values()].sort((a, b) => a.block - b.block || a.index - b.index);
}

// src/lib/portfolioHistory.ts
var sources = [
  ...TIME_MINER_CONTRACTS.map((row) => ({ ...row, kind: "miners", decimals: 18, symbol: "OINK" })),
  ...VERIFIED_FARM_READS.map((row) => ({ ...row, kind: "farms", label: ECOSYSTEM_MINER_CONTRACTS.find((c) => c.id === row.id)?.label ?? row.id, symbol: ECOSYSTEM_MINER_CONTRACTS.find((c) => c.id === row.id)?.label ?? row.id })),
  { id: "t-share", address: "0x6b465C480CD590852f90c8f1b41Ab22922a1BF85", kind: "hex", label: "HEX share rewards", symbol: "HEX shares", decimals: 0 }
];
async function readPortfolioHistory(account, signal) {
  const wallet = getAddress2(account), topic = zeroPadValue(wallet, 32);
  const jobs = sources.flatMap((source) => (source.kind === "miners" ? [1, 2] : [1]).map((slot) => ({ source, slot })));
  let cursor = 0, failed = 0, capped = 0;
  const rows = [];
  const worker = async () => {
    while (cursor < jobs.length) {
      signal.throwIfAborted();
      const { source, slot } = jobs[cursor++];
      try {
        const params = new URLSearchParams({ module: "logs", action: "getLogs", fromBlock: "0", toBlock: "latest", address: source.address, ["topic" + slot]: topic, page: "1", offset: "1000" });
        const response = await fetch("https://api.scan.pulsechain.com/api?" + params, { signal: AbortSignal.any([signal, AbortSignal.timeout(15e3)]), credentials: "omit" });
        if (!response.ok) throw new Error("History unavailable");
        const result = await response.json();
        if (!Array.isArray(result.result) || result.status !== "1" && !(result.status === "0" && /no (logs|records)/i.test(result.message))) throw new Error("Invalid history response");
        if (result.result.length >= 1e3) capped++;
        for (const log of result.result) {
          const row = decodeWalletActivity(log, source, wallet);
          if (row) rows.push(row);
        }
      } catch {
        signal.throwIfAborted();
        failed++;
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return { account: wallet, rows: mergeWalletActivity(rows), failed, capped, loadedAt: Date.now(), sources: sources.length };
}
export {
  readPortfolioHistory
};
