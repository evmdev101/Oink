import { Interface, formatEther, getAddress } from "ethers";
import { OINK_TOKEN, TREASURY_WALLET, CORE_CONTRACTS } from "../config/contracts";
import { DISTRIBUTIONS } from "../config/accessVerification";
import { accessSnapshot } from "./accessSnapshot";
import type { FarmReadRpc } from "./farmTransactions";

const chef = CORE_CONTRACTS.find(row => row.id === "inflation")!.address;
const governor = CORE_CONTRACTS.find(row => row.id === "governor")!.address;
const abi = new Interface([
  "function totalSupply() view returns(uint256)", "function virtualTotalSupply() view returns(uint256)",
  "function balanceOf(address) view returns(uint256)", "function credit(address) view returns(uint256)",
  "function decimals() view returns(uint8)", "function owner() view returns(address)", "function governor() view returns(address)",
]);
export const protocolBalanceRows = [
  { id: "supply", label: "Existing OINK supply", contract: OINK_TOKEN, method: "totalSupply", args: [] },
  { id: "virtual", label: "Virtual OINK supply", contract: chef, method: "virtualTotalSupply", args: [] },
  { id: "treasury", label: "Treasury wallet OINK", contract: OINK_TOKEN, method: "balanceOf", args: [TREASURY_WALLET] },
  { id: "governor", label: "Governor OINK balance", contract: OINK_TOKEN, method: "balanceOf", args: [governor] },
  { id: "referral", label: "Current referral contract OINK", contract: OINK_TOKEN, method: "balanceOf", args: ["0xf69357627d6dcc463ac30273Aae13fDB49B07C15"] },
  { id: "legacy-referral", label: "Legacy referral contract OINK", contract: OINK_TOKEN, method: "balanceOf", args: ["0x066F0a45801bcbc5232b11ed4b97c39E1369fe59"] },
  ...DISTRIBUTIONS.map(row => ({ id: row.id, label: row.label + " reward credit", contract: chef, method: "credit", args: [row.address] })),
];
export async function readProtocolBalances(rpc: FarmReadRpc) {
  const s = await accessSnapshot(rpc);
  const [decimals, owner, mapped] = await Promise.all([
    s.read(OINK_TOKEN, "decimals", [], abi), s.read(OINK_TOKEN, "owner", [], abi), s.read(OINK_TOKEN, "governor", [], abi),
  ]);
  if (decimals[0] !== 18n || getAddress(owner[0]) !== getAddress(chef) || getAddress(mapped[0]) !== getAddress(governor)) throw Error("OINK supply mapping changed.");
  const results = await Promise.allSettled(protocolBalanceRows.map(async row => formatEther((await s.read(row.contract, row.method, row.args, abi))[0])));
  await s.finish();
  return { block: s.block, timestamp: s.timestamp, rows: protocolBalanceRows.map((row, index) => ({ id: row.id, label: row.label, value: results[index].status === "fulfilled" ? results[index].value : null })) };
}
