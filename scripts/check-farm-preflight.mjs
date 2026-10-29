// Read-only live smoke check. This script has no signer and rejects every RPC
// method outside the list below, including all transaction-broadcast methods.
import { JsonRpcProvider } from "ethers";
import { registerHooks } from "node:module";
registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context); }
  catch (error) { if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(specifier + ".ts", context); throw error; }
} });
const { prepareFarmTransaction } = await import("../src/lib/farmTransactions.ts");
import { VERIFIED_FARM_WRITES } from "../src/config/farmWriteVerification.ts";

const publicRpc = new JsonRpcProvider("https://rpc.pulsechain.com", 369, { staticNetwork: true, batchMaxCount: 6 });
const permittedMethods = new Set([
  "eth_chainId", "eth_getBlockByNumber", "eth_getCode", "eth_getBalance",
  "eth_call", "eth_estimateGas", "eth_gasPrice",
]);
const methods = new Map();
const readOnlyRpc = {
  async send(method, params) {
    if (!permittedMethods.has(method)) throw new Error("Read-only audit rejected RPC method: " + method);
    methods.set(method, (methods.get(method) ?? 0) + 1);
    return publicRpc.send(method, params);
  },
};

// Public historical depositor, discovered from these existing on-chain records:
// PLS deposit 0x7bcfd6ad7ee8f98ebff310dbf502862a38d7e09d9aad473caf6e3833d381a7d6
// PLSX deposit 0xf64cf84247d39e9b6aeb28305d83fc3fdfdec19cf82899545e67841fa5614e66
// It is only an eth_call sender; this script neither owns nor connects it.
const publicDepositor = "0x36f88aea238d4a5222c25df9dbf038c21e345677";
try {
  for (const [id, kind] of [["pls", "deposit"], ["plsx", "approve"]]) {
    const spec = VERIFIED_FARM_WRITES.find((candidate) => candidate.id === id);
    if (!spec) throw new Error("Missing audited farm: " + id);
    const review = await prepareFarmTransaction(readOnlyRpc, spec, publicDepositor, "0.001", kind);
    console.log(JSON.stringify({
      farm: id, kind, block: review.block, blockHash: review.blockHash,
      account: review.account, amount: review.amount.toString(),
      target: review.transaction.to, value: review.transaction.value,
      depositFee: review.depositFee.toString(), fundingRate: review.fundingRate.toString(),
      gasEstimate: review.gasEstimate.toString(),
      result: "All deployment, wiring, state, eth_call and eth_estimateGas preflight checks passed; nothing broadcast",
    }));
  }
  console.log(JSON.stringify({ rpcMethods: Object.fromEntries(methods) }));
} finally {
  publicRpc.destroy();
}
