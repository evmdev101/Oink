import { Interface, id, keccak256, makeError, type Provider, type TransactionRequest } from "ethers";

// PulseChain's canonical Multicall3 deployment. Runtime checked at the snapshot block.
// https://github.com/mds1/multicall/blob/main/deployments.json (chain 369)
export const MULTICALL_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
export const MULTICALL_RUNTIME_HASH = "0xd5c15df687b16f2ff992fc8d767b4216323184a2bbc6ee2f9c398c318e770891";
export const multicallInterface = new Interface(["function aggregate3((address target,bool allowFailure,bytes callData)[] calls) payable returns ((bool success,bytes returnData)[] returnData)"]);
// Only display getters with explicit account arguments or caller-independent state.
// Transaction simulations and calls with overrides always retain their original caller.
const getters = new Set([
  "DTXPerBlock()",
  "MAX_SUPPLY()",
  "totalAllocPoint()",
  "virtualTotalSupply()",
  "fibonacceningActivatedBlock()",
  "calculateUpcomingRewardPerBlock()",
  "balanceOf()",
  "balanceOf(address)",
  "basicContract()",
  "callFee()",
  "callFeeProposal(uint256)",
  "changeGovernorActivated()",
  "consensusContract()",
  "consensusProposal(uint256)",
  "costToVote()",
  "creditContract()",
  "decimals()",
  "defaultDirectPayout()",
  "delayBeforeEnforce()",
  "delayProposals(uint256)",
  "depositFee()",
  "dtx()",
  "eligibleNewGovernor()",
  "eventFibonacceningActive()",
  "farmContract()",
  "fibonacceningActiveID()",
  "fibonacceningContract()",
  "fibonacceningProposals(uint256)",
  "fundingRate()",
  "getNrOfStakes(address)",
  "getPricePerFullShare()",
  "getRollBonus(address)",
  "getUserTotalShares(address)",
  "govTaxProposals(uint256)",
  "governor()",
  "governorCount()",
  "governorFee()",
  "governorTransferProposals(uint256)",
  "gracePeriod()",
  "hexC()",
  "highestConsensusVotes(uint256)",
  "isGovInvalidated(address)",
  "isSenator(address)",
  "masterchef()",
  "maxNftAllocation()",
  "maxPulseEcoAllocation()",
  "maxPulseEcoTotalAllocation()",
  "maxSenators()",
  "maxStakes()",
  "minDepositProposals(uint256)",
  "minSenators()",
  "minThresholdFibonacceningProposal(uint256)",
  "multiCall()",
  "multiCall(address)",
  "multiCall(address,uint256)",
  "newGovernorBlockDelay()",
  "newGovernorRequestBlock()",
  "newPoolProposal(uint256)",
  "owner()",
  "percentageAllocatedToPulseEcosystem()",
  "poolID()",
  "poolInfo(uint256)",
  "proposalFarmUpdate(uint256)",
  "proposalLengths()",
  "publicBalanceOf()",
  "referralBonus()",
  "rolloverBonuses(uint256)",
  "safePeriod()",
  "senateContract()",
  "senatorCount()",
  "stakeToken()",
  "startBlock()",
  "symbol()",
  "thresholdFibonaccening()",
  "token()",
  "tokensCastedPerVote(uint256)",
  "totalAllocPoint()",
  "totalDTXStaked()",
  "totalShares()",
  "totalTshares()",
  "treasury()",
  "treasuryProposal(uint256)",
  "userCredit(address)",
  "userDelegate(address)",
  "userInfo(address,uint256)",
  "userVote(address)",
  "vaultProposals(uint256)",
  "viewSenators()",
  "withdrawFeePeriod()"
].map(signature => id(signature).slice(0,10)));

type Call = (tx: TransactionRequest) => Promise<string>;
type Item = { tx: TransactionRequest; resolve: (data:string) => void; reject: (reason:unknown) => void };
export function snapshotBatchCall(provider: Pick<Provider,"getCode">, direct:Call, block:number, signal?:AbortSignal):Call {
  let queued:Item[] = [];
  let scheduled = false;
  let supported:Promise<boolean> | undefined;
  const memo = new Map<string,Promise<string>>();
  const flush = async () => {
    scheduled = false;
    const items = queued.splice(0,40);
    if (queued.length) { scheduled = true; setTimeout(() => { void flush(); },0); }
    try {
      signal?.throwIfAborted();
      supported ??= provider.getCode(MULTICALL_ADDRESS,block).then(code => keccak256(code) === MULTICALL_RUNTIME_HASH).catch(() => false);
      if (!await supported) {
        await Promise.all(items.map(item => direct(item.tx).then(item.resolve,item.reject)));
        return;
      }
      signal?.throwIfAborted();
      let results;
      try {
        const data = multicallInterface.encodeFunctionData("aggregate3",[items.map(({tx}) => [tx.to,true,tx.data])]);
        const raw = await direct({to:MULTICALL_ADDRESS,data,blockTag:block});
        results = multicallInterface.decodeFunctionResult("aggregate3",raw)[0];
        if (results.length !== items.length) throw Error("Incomplete Multicall response");
      } catch {
        // Some endpoints impose smaller gas/response limits. Retry these same
        // getters individually at the same block; never silently use latest.
        signal?.throwIfAborted();
        await Promise.all(items.map(item => direct(item.tx).then(item.resolve,item.reject)));
        return;
      }
      signal?.throwIfAborted();
      items.forEach((item,index) => {
        const row = results[index];
        if (row[0]) item.resolve(row[1]);
        else item.reject(makeError("Snapshot getter reverted", "CALL_EXCEPTION", {action:"call",data:row[1],reason:null,invocation:null,revert:null,transaction:{to:String(item.tx.to),data:String(item.tx.data)}}));
      });
    } catch (error) { items.forEach(item => item.reject(error)); }
  };
  return tx => {
    if (signal?.aborted) return Promise.reject(signal.reason);
    const keys = Object.keys(tx).filter(key => tx[key as keyof TransactionRequest] != null);
    if (typeof tx.to !== "string" || !/^0x[0-9a-f]{40}$/i.test(tx.to) || typeof tx.data !== "string"
      || !getters.has(tx.data.slice(0,10)) || keys.some(key => !["to","data","blockTag"].includes(key))) return direct(tx);
    const key = tx.to.toLowerCase()+":"+tx.data;
    let result = memo.get(key);
    if (!result) {
      result = new Promise<string>((resolve,reject) => {
        queued.push({tx,resolve,reject});
        if (!scheduled) { scheduled = true; setTimeout(() => { void flush(); },0); }
      });
      memo.set(key,result);
      void result.catch(() => { memo.delete(key); });
    }
    return result;
  };
}
