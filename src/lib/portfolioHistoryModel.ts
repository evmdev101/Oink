import { Interface, formatUnits, getAddress } from "ethers";

export const portfolioMinerEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
  "event GiftDeposit(address indexed sender,address indexed recipient,uint256 amount,uint256 shares,uint256 lastDepositedTime)",
  "event Withdraw(address indexed sender,uint256 amount,uint256 penalty,uint256 shares)",
  "event TransferStake(address indexed sender,address indexed recipient,uint256 shares,uint256 stakeID)",
  "event HopPool(address indexed sender,uint256 DTXamount,uint256 shares,address indexed newPool)",
  "event HopDeposit(address indexed recipient,uint256 amount,uint256 shares,uint256 previousLastDepositedTime,uint256 mandatoryTime)",
  "event AddAndExtendStake(address indexed sender,address indexed recipient,uint256 amount,uint256 stakeID,uint256 shares,uint256 lastDepositedTime)",
  "event MigrateStake(address indexed goodSamaritan,uint256 DTXamount,uint256 shares,address indexed recipient)",
]);
export const portfolioFarmEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 debt,uint256 depositFee,address indexed referral)",
  "event SelfHarvest(address indexed user,address indexed harvestInto,uint256 harvestAmount,uint256 penalty)",
  "event Withdraw(address indexed sender,uint256 stakeID,uint256 harvestAmount,uint256 penalty)",
]);
export const portfolioHexEvents = new Interface([
  "event Deposit(address indexed sender,uint256 amount,uint256 debt,address indexed referredBy)",
  "event Harvest(address indexed user,address indexed harvestInto,uint256 harvestAmount,uint256 penalty)",
  "event Withdraw(address indexed sender,uint256 harvestAmount,uint256 penalty)",
]);
export type HistorySource = { address:string; id:string; label:string; kind:"miners" | "farms" | "hex"; decimals:number; symbol:string };
export type WalletActivity = { key:string; hash:string; block:number; index:number; timestamp:number; source:string; sourceId:string; category:HistorySource["kind"]; label:string; amount:string; symbol:string; deposited:string; withdrawn:string; harvested:string; penalty:string };
export type HistoryLog = { address:string; topics:(string | null)[]; data:string; transactionHash:string; blockNumber:string; logIndex:string; timeStamp:string; removed?:boolean };

export function decodeWalletActivity(log:HistoryLog, source:HistorySource, account:string):WalletActivity | null {
  try {
    if (log.removed || getAddress(log.address) !== getAddress(source.address) || !/^0x[0-9a-f]{64}$/i.test(log.transactionHash)) return null;
    const abi = source.kind === "miners" ? portfolioMinerEvents : source.kind === "hex" ? portfolioHexEvents : portfolioFarmEvents;
    const event = abi.parseLog({ data:log.data, topics:log.topics.filter((topic):topic is string => topic != null) });
    if (!event) return null;
    const a = event.args, mine = (value:unknown) => typeof value === "string" && getAddress(value) === getAddress(account);
    const incoming = mine(a.recipient), outgoing = mine(a.sender ?? a.user);
    if (!incoming && !outgoing) return null;
    let label = "", amount = "0", symbol = "OINK", deposited = "0", withdrawn = "0", harvested = "0", penalty = "0";
    if (source.kind === "miners") {
      if (event.name === "Deposit" || event.name === "GiftDeposit") {
        label = event.name === "Deposit" ? "Created miner" : incoming ? "Received gifted miner" : "Gifted miner";
        amount = formatUnits(a.amount,18);
        if (event.name === "Deposit" || incoming) deposited = amount;
      } else if (event.name === "Withdraw") {
        label = "Withdrew miner"; amount = withdrawn = formatUnits(a.amount,18); penalty = formatUnits(a.penalty,18);
      } else if (event.name === "TransferStake") {
        label = incoming && outgoing ? "Transferred miner to self" : incoming ? "Received miner" : "Transferred miner"; amount = formatUnits(a.shares,18); symbol = "shares";
      } else if (event.name === "HopPool" || event.name === "MigrateStake") {
        label = event.name === "HopPool" ? "Upgraded miner" : "Migrated miner"; amount = formatUnits(a.DTXamount,18);
      } else {
        label = event.name === "HopDeposit" ? "Received upgraded miner" : "Extended miner"; amount = formatUnits(a.amount,18);
      }
    } else if (event.name === "Deposit") {
      if (!outgoing) return null;
      label = source.kind === "hex" ? "Registered HEX shares" : "Deposited into farm";
      amount = formatUnits(a.amount,source.decimals); symbol = source.symbol;
    } else {
      if (!outgoing) return null;
      label = event.name === "Withdraw" ? source.kind === "hex" ? "Unregistered HEX shares" : "Withdrew farm position" : "Harvested rewards";
      amount = harvested = formatUnits(a.harvestAmount,18);
      // Farm Withdraw.penalty is NOT a miner penalty; some vaults emit asset
      // principal in this slot. Never add it to OINK penalties.
    }
    const block = Number(BigInt(log.blockNumber)), index = Number(BigInt(log.logIndex)), timestamp = Number(BigInt(log.timeStamp));
    if (![block,index,timestamp].every(n => Number.isSafeInteger(n) && n >= 0) || timestamp === 0) return null;
    return { key:log.transactionHash + ":" + index, hash:log.transactionHash, block,index,timestamp,source:source.label,sourceId:source.id,category:source.kind,label,amount,symbol,deposited,withdrawn,harvested,penalty };
  } catch { return null; }
}
export function mergeWalletActivity(rows:WalletActivity[]) {
  return [...new Map(rows.map(row => [row.key,row])).values()].sort((a,b) => a.block - b.block || a.index - b.index);
}
export function cumulativeHistory(rows:WalletActivity[], field:"deposited" | "withdrawn" | "harvested") {
  let total = 0n;
  return mergeWalletActivity(rows).filter(row => BigInt(row[field].replace(".","").replace(/^0+/,"") || "0") > 0n).map(row => {
    const [whole,fraction = ""] = row[field].split(".");
    total += BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18,"0"));
    return { timestamp:row.timestamp, value:total.toString() };
  });
}
