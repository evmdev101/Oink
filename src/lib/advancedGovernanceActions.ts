import { Interface, ZeroAddress, getAddress, formatEther, formatUnits, keccak256 } from "ethers";
import { SENATE_ACTION_ABI, CONSENSUS_ACTION_ABI, SENATE_PIN, TREASURY_PIN } from "../config/advancedGovernanceVerification";
import { PARTICIPATION_CONTRACTS } from "../config/participationVerification";
import { VERIFIED_FARM_WRITES } from "../config/farmWriteVerification";
import { checkedParticipationSnapshot, participationUint } from "./participationTransactions";
import { parseFarmDepositAmount, verifyRuntime, type FarmReadRpc } from "./farmTransactions";
import type { ProtocolAdapter, ProtocolQuote, ProtocolRequest } from "./protocolTransactions";

const common = VERIFIED_FARM_WRITES[0], { consensus, credit } = PARTICIPATION_CONTRACTS;
const senateAbi = new Interface(SENATE_ACTION_ABI), consensusAbi = new Interface(CONSENSUS_ACTION_ABI);
const extraAbi = new Interface([
  ...["senateContract", "eligibleNewGovernor", "treasuryWallet", "feeAddress", "devaddr"].map(name => `function ${name}() view returns(address)`),
  ...["costToVote", "delayBeforeEnforce", "newGovernorRequestBlock", "newGovernorBlockDelay", "totalCreditRewards"].map(name => `function ${name}() view returns(uint256)`),
  "function changeGovernorActivated() view returns(bool)", "function deductingContract(address) view returns(bool)",
  "function decimals() view returns(uint8)", "function governorRejected()",
  "event EnforceGovernor(address indexed newGovernor,address indexed enforcer)",
  "event ExecuteTransaction(address indexed token,address indexed receiver,uint256 value)",
  "event Transfer(address indexed from,address indexed to,uint256 value)",
  "event DeductCredit(address indexed from,uint256 amount)",
]);
const eq = (a: string, b: string) => getAddress(a) === getAddress(b);
const stringify = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v);
const address = (value: string) => { const result = getAddress(value); if (result === ZeroAddress) throw Error("Enter a nonzero address."); return result; };
const requireThat = (ok: unknown, message: string) => { if (!ok) throw Error(message); };
const native = (token: string) => eq(token, ZeroAddress) || eq(token, "0x0000000000000000000000000000000000001010");
export function treasuryApprovalPasses(creditYes: bigint, creditNo: bigint, yes: bigint, no: bigint, total: bigint) {
  return creditYes >= creditNo && yes >= total * 15n / 100n && no < yes * 33n / 100n;
}
export function governorVetoPasses(stage: "ratio" | "total", yes: bigint, no: bigint, total: bigint) {
  return stage === "ratio" ? no >= yes / 5n : no >= total * 25n / 100n;
}

export async function prepareAdvancedGovernance(rpc: FarmReadRpc, account: string, request: ProtocolRequest): Promise<ProtocolQuote> {
  requireThat(request.module === "advanced-governance", "Unsupported governance module.");
  const s = await checkedParticipationSnapshot(rpc, account), a = request.args, action = request.action;
  const state: Record<string, any> = { action, args: a }, facts: [string, string][] = [], warnings: string[] = [];
  const read = async (to: string, method: string, args: unknown[] = []) => s.read(to, method, args,
    eq(to, consensus.address) && consensusAbi.hasFunction(method) ? consensusAbi : eq(to, SENATE_PIN.address) && senateAbi.hasFunction(method) ? senateAbi : extraAbi.hasFunction(method) ? extraAbi : undefined);
  const one = async (to: string, method: string, args: unknown[] = []) => (await read(to, method, args))[0];
  const cost = await one(common.governor, "costToVote"), delay = await one(common.governor, "delayBeforeEnforce");
  state.cost = cost; state.delay = delay;
  let to: string = consensus.address; let abi = consensusAbi, method = "", values: unknown[] = [], spend = 0n;
  const inspectCode = async (target: string) => { const code = await rpc.send("eth_getCode", [target, s.block.number]); requireThat(code && code !== "0x", "The target must be a deployed contract."); const hash = keccak256(code); state.targetCode = hash; facts.push(["Contract", target], ["Runtime hash", hash]); };
  const proposal = async (kind: "treasury" | "governor", id: bigint) => {
    const counts = await read(consensus.address, "proposalLengths");
    let row: any, position = id;
    if (kind === "treasury") { requireThat(id < counts[0], "Treasury request does not exist."); row = await read(consensus.address, "treasuryProposal", [id]); requireThat(row[0], "The treasury request is closed."); position = row[8]; state.treasury = Array.from(row); }
    requireThat(position > 0n && position % 2n === 1n && position + 1n < counts[1], "Invalid paired proposal position.");
    const yes = await read(consensus.address, "consensusProposal", [position]), no = await read(consensus.address, "consensusProposal", [position + 1n]);
    requireThat(stringify(yes) === stringify(no) && yes[0] === (kind === "treasury" ? 1n : 0n), "Proposal positions do not match.");
    if (kind === "treasury") requireThat(eq(yes[1], consensus.address), "Invalid treasury proposal mapping.");
    else { const status = await read(consensus.address, "isGovInvalidated", [yes[1]]); requireThat(!status[0], "This Governor candidate is invalidated."); state.status = Array.from(status); state.candidate = getAddress(yes[1]); }
    state.proposal = Array.from(yes); state.position = position; state.id = id;
    facts.push([kind === "treasury" ? "Treasury request" : "Governor proposal", id.toString()]);
    return { row, position, yes };
  };
  const powers = async (position: bigint) => {
    const result = await Promise.all([one(consensus.address, "tokensCastedPerVote", [position]), one(consensus.address, "tokensCastedPerVote", [position + 1n]), one(consensus.address, "totalDTXStaked")]);
    state.powers = result; return result as bigint[];
  };
  if (action.startsWith("senate-")) {
    to = SENATE_PIN.address; abi = senateAbi;
    verifyRuntime(await rpc.send("eth_getCode", [to, s.block.number]), SENATE_PIN.runtimeCodeHash, "Senate");
    requireThat(eq(await one(common.governor, "senateContract"), to) && eq(await one(to, "owner"), common.governor) && eq(await one(to, "token"), common.rewardToken), "Senate wiring changed.");
    const all = await read(to, "multiCall"), members = Array.from(all[0], String), myIndex = members.findIndex(member => eq(member, s.account));
    const ballots: bigint[] = myIndex < 0 ? [] : Array.from(all[1][myIndex]);
    state.members = members; state.ballots = ballots;
    let ballot = 0n;
    if (["senate-vote", "senate-veto"].includes(action)) {
      requireThat(a.kind === "treasury" || a.kind === "governor", "Choose the proposal category.");
      ballot = (await proposal(a.kind as "treasury" | "governor", participationUint(a.id, "Proposal ID"))).position;
    } else if (action === "senate-membership-vote") {
      const candidate = address(a.candidate); requireThat(a.outcome === "add" || a.outcome === "remove", "Choose add or remove.");
      const member = await one(to, "isSenator", [candidate]), added = await one(to, "addedSenator", [candidate]);
      requireThat(a.outcome === "add" ? !member && !added : member, "This member cannot receive the selected membership change.");
      ballot = BigInt(candidate) + (a.outcome === "remove" ? 1n : 0n); facts.push(["Candidate", candidate], ["Membership change", a.outcome]);
    }
    if (["senate-vote", "senate-membership-vote", "senate-remove-vote"].includes(action)) {
      requireThat(myIndex >= 0 && await one(to, "isSenator", [s.account]), "Only a current Senate member can change their ballot.");
      if (action === "senate-remove-vote") {
        ballot = participationUint(a.ballot, "Recorded ballot"); const index = ballots.findIndex(value => value === ballot);
        requireThat(index >= 0, "This ballot is not recorded for your wallet."); method = "removeVote"; values = [ballot, index];
      } else { requireThat(!ballots.includes(ballot), "You already voted on this ballot."); method = "vote"; values = [ballot]; }
      state.ballot = ballot; facts.push(["Ballot", ballot.toString()]);
    } else if (action === "senate-veto") {
      const votes = await one(to, "votesForProposal", [ballot]); state.votes = votes;
      requireThat(votes > BigInt(members.length) / 2n, "A Senate veto needs more than half of all members.");
      method = "vetoProposal"; values = [ballot, a.kind === "treasury" ? state.id : 0n];
      warnings.push("This closes the selected proposal as rejected. A rejected active Governor may also need the Clear rejected replacement action.");
    } else if (["senate-add", "senate-expel", "senate-replace"].includes(action)) {
      const candidate = address(a.candidate); state.candidate = candidate;
      const member = await one(to, "isSenator", [candidate]), added = await one(to, "addedSenator", [candidate]);
      facts.push(["Member address", candidate]);
      if (action === "senate-replace") {
        requireThat(myIndex >= 0 && !ballots.length && !added && !member, "Replacing your seat requires membership, no recorded ballots, and a never-added replacement.");
        method = "selfReplaceSenator"; values = [candidate, myIndex]; warnings.push("You permanently give your Senate seat to this address.");
      } else {
        const adding = action === "senate-add", index = members.findIndex(member => eq(member, candidate));
        const limit = await one(to, adding ? "maxSenators" : "minSenators"), votes = await one(to, "votesForProposal", [BigInt(candidate) + (adding ? 0n : 1n)]);
        state.limit = limit; state.votes = votes;
        requireThat(votes > BigInt(members.length) / 2n, "Membership changes need more than half of all members.");
        requireThat(adding ? !member && !added && BigInt(members.length) < limit : member && index >= 0 && BigInt(members.length) > limit, "Membership eligibility or Senate size prevents this change.");
        method = adding ? "expandSenate" : "expellSenator"; values = adding ? [candidate] : [candidate, index];
      }
    } else if (action === "senate-credit") {
      requireThat(members.length > 0 && all[3] > 0n && await one(credit.address, "creditingContract", [to]), "No distributable Senate credit is available.");
      state.reward = all[3]; facts.push(["Credit issued to each member", formatEther(all[3]) + " OINK"], ["Recipients", members.join(", ")]); method = "grantVotingCredit";
    } else throw Error("Unsupported Senate action.");
  } else if (action.startsWith("treasury-")) {
    verifyRuntime(await rpc.send("eth_getCode", [TREASURY_PIN.address, s.block.number]), TREASURY_PIN.runtimeCodeHash, "Treasury");
    requireThat(eq(await one(common.governor, "treasuryWallet"), TREASURY_PIN.address) && eq(await one(TREASURY_PIN.address, "token"), common.rewardToken), "Treasury authority changed.");
    if (action === "treasury-create") {
      const token = getAddress(a.token), recipient = address(a.recipient), seconds = participationUint(a.delay, "Voting window in hours") * 3600n;
      let decimals = 18; if (!native(token)) { await inspectCode(token); decimals = Number(await one(token, "decimals")); }
      const amount = parseFarmDepositAmount(a.amount, decimals); spend = parseFarmDepositAmount(a.credit, 18);
      requireThat(seconds <= delay && spend >= cost * 100n, "Treasury proposals require 100 times the voting cost and a window no longer than the global delay.");
      method = "initiateTreasuryTransferProposal"; values = [spend, token, recipient, amount, seconds];
      facts.push(["Asset address", token], ["Amount", formatUnits(amount, decimals)], ["Recipient", recipient], ["Initial voting window", seconds + " seconds"]);
      warnings.push("This creates a request to spend protocol treasury funds. It does not transfer funds yet.");
    } else {
      const id = participationUint(a.id, "Treasury request ID"), { row, position } = await proposal("treasury", id);
      facts.push(["Asset", row[5]], ["Recipient", row[6]], ["Amount in base units", row[7].toString()]); values = [id];
      const start = row[1] + row[4], end = start + delay, now = BigInt(s.timestamp);
      if (["treasury-support", "treasury-oppose"].includes(action)) {
        requireThat(now < end, "Credit voting is closed."); spend = parseFarmDepositAmount(a.credit, 18);
        method = action === "treasury-support" ? "voteTreasuryTransferProposalY" : "voteTreasuryTransferProposalN"; values = action === "treasury-support" ? [id, spend] : [id, spend, false];
      } else if (action === "treasury-veto") {
        requireThat(now >= start && now <= end && row[3] > row[2], "Credit veto needs greater opposition and an open veto window."); method = "vetoTreasuryTransferProposal";
      } else if (action === "treasury-kill") {
        const [, no, total] = await powers(position); requireThat(no >= total * 15n / 100n, "Rejecting this request needs 15% of total weighted miner power in opposition."); method = "killTreasuryTransferProposal";
      } else if (action === "treasury-approve" || action === "treasury-close") {
        requireThat(now >= end + delay, "The final treasury waiting period has not ended.");
        const [currentYes, currentNo, total] = await powers(position), oldYes = await one(consensus.address, "highestConsensusVotes", [position]), oldNo = await one(consensus.address, "highestConsensusVotes", [position + 1n]);
        const yes = currentYes > oldYes ? currentYes : oldYes, no = currentNo > oldNo ? currentNo : oldNo;
        const passes = treasuryApprovalPasses(row[2], row[3], yes, no, total); state.highest = [yes, no];
        requireThat(passes === (action === "treasury-approve"), passes ? "This request would transfer funds; choose Approve transfer." : "This request would be rejected without transferring funds; choose Close unsuccessful request.");
        method = "approveTreasuryTransfer";
        if (passes) {
          if (!native(row[5])) { await inspectCode(row[5]); requireThat(await one(row[5], "balanceOf", [TREASURY_PIN.address]) >= row[7], "Treasury token balance is insufficient."); }
          else requireThat(BigInt(await rpc.send("eth_getBalance", [TREASURY_PIN.address, s.block.number])) >= row[7], "Treasury PLS balance is insufficient.");
          warnings.push("This transfers the specified treasury assets to the recipient. The transfer cannot be undone by this interface.");
        }
      } else throw Error("Unsupported treasury action.");
    }
  } else if (action.startsWith("governor-")) {
    const active = await one(common.governor, "changeGovernorActivated"), eligible = await one(common.governor, "eligibleNewGovernor");
    state.active = active; state.eligible = eligible;
    if (action === "governor-propose") {
      const candidate = address(a.candidate); await inspectCode(candidate);
      requireThat(!eq(candidate, common.governor) && !(await read(consensus.address, "isGovInvalidated", [candidate])).some(Boolean), "This candidate is already used or invalidated.");
      method = "proposeGovernor"; values = [candidate]; state.candidate = candidate; spend = cost * 100n;
    } else if (action === "governor-clear") {
      requireThat(active && (await read(consensus.address, "isGovInvalidated", [eligible]))[0], "There is no rejected active replacement to clear.");
      to = common.governor; abi = extraAbi; method = "governorRejected";
    } else {
      const id = participationUint(a.id, "Governor proposal ID"), { yes } = await proposal("governor", id), candidate = state.candidate;
      values = [id]; facts.push(["Candidate", candidate]);
      if (action === "governor-enforce") {
        const requested = await one(common.governor, "newGovernorRequestBlock"), blocks = await one(common.governor, "newGovernorBlockDelay"); state.requested = requested; state.blocks = blocks;
        requireThat(active && state.status[1] && eq(eligible, candidate) && BigInt(s.number) > requested + blocks, "This replacement is not active or its block waiting period has not ended.");
        await inspectCode(candidate); state.governorBalance = await one(common.rewardToken, "balanceOf", [common.governor]); method = "enforceGovernor";
        facts.push(["Governor OINK transferred", formatEther(state.governorBalance) + " OINK (balance at review)"]);
      } else {
        const [support, opposition, total] = await powers(id);
        if (action === "governor-activate" || action === "governor-reject-first") {
          requireThat(!active && !state.status[1] && BigInt(s.timestamp) >= yes[2] + delay && support >= total * 15n / 100n && (opposition < support / 3n) === (action === "governor-activate"), "The proposal has not met its waiting period and selected first-stage outcome thresholds."); method = "changeGovernor";
        } else if (action === "governor-veto" || action === "governor-veto-total") {
          requireThat((action !== "governor-veto" || state.status[1]) && governorVetoPasses(action === "governor-veto" ? "ratio" : "total", support, opposition, total), "The selected veto threshold has not been met.");
          method = action === "governor-veto" ? "vetoGovernor" : "vetoGovernor2"; values = [id, active && eq(eligible, candidate)];
        } else throw Error("Unsupported Governor action.");
      }
    }
    if (["governor-propose", "governor-activate", "governor-enforce"].includes(action)) warnings.push("A finalized replacement receives MasterChef ownership, fee and developer authority, and the old Governor's OINK balance. A deployed candidate is not necessarily audited or safe; independently review its code before supporting it.");
  } else throw Error("Unsupported governance action.");
  if (spend > 0n) {
    requireThat(await one(credit.address, "deductingContract", [consensus.address]), "Consensus cannot deduct voting credit.");
    const stored = await one(credit.address, "userCredit", [s.account]); requireThat(stored >= spend, "Deposit sufficient voting credit first."); state.stored = stored;
    facts.push(["Voting credit consumed", formatEther(spend) + " OINK"], ["Maximum fallback wallet burn", formatEther(spend) + " OINK"]);
    warnings.push("Credit is spent permanently. If your stored credit falls before mining, the contract can burn the shortfall from wallet OINK without a token approval.");
  }
  state.method = method; state.values = values; state.spend = spend;
  await s.finish();
  return { title: "Review " + action.replaceAll("-", " "), account: s.account, block: s.number, blockHash: s.block.hash, timestamp: s.timestamp, to, data: abi.encodeFunctionData(method, values), value: "0x0", facts, warnings, fingerprint: stringify(state) };
}

export const advancedGovernanceAdapter: ProtocolAdapter = {
  prepare: prepareAdvancedGovernance,
  async verify(rpc, review, receipt) {
    try {
      const state = JSON.parse(review.quote.fingerprint), action = review.request.action, account = review.quote.account;
      const read = async (to: string, method: string, args: unknown[] = [], abi = consensusAbi) => abi.decodeFunctionResult(method, await rpc.send("eth_call", [{ to, data: abi.encodeFunctionData(method, args) }, receipt.blockNumber]));
      const events = (to: string, name: string, abi = consensusAbi) => receipt.logs.filter(l => !l.removed && eq(l.address, to)).flatMap(l => { try { const e = abi.parseLog(l); return e?.name === name ? [e.args] : []; } catch { return []; } });
      for (const pin of [consensus, credit, {address: common.governor, runtimeCodeHash: common.governorRuntimeCodeHash}, {address: common.masterchef, runtimeCodeHash: common.masterchefRuntimeCodeHash}, {address: common.rewardToken, runtimeCodeHash: common.rewardTokenRuntimeCodeHash}, ...(action.startsWith("senate-") ? [SENATE_PIN] : [])]) verifyRuntime(await rpc.send("eth_getCode", [pin.address, receipt.blockNumber]), pin.runtimeCodeHash, "Governance receipt contract");
      if (BigInt(state.spend ?? 0) > 0n) {
        const spend = BigInt(state.spend), deductions = events(credit.address, "DeductCredit", extraAbi).filter(e => eq(e[0], account));
        const burns = events(common.rewardToken, "Transfer", extraAbi).filter(e => eq(e[0], account) && eq(e[1], ZeroAddress)).reduce((sum, e) => sum + e[2], 0n);
        if (deductions.length !== 1 || burns > spend || deductions[0][1] !== (burns > 0n ? burns : spend)) return false;
      }
      const id = BigInt(state.id ?? 0), candidate = state.candidate;
      if (action === "senate-vote" || action === "senate-membership-vote" || action === "senate-remove-vote") return events(SENATE_PIN.address, action === "senate-remove-vote" ? "RemoveVote" : "AddVote", senateAbi).some(e => eq(e[0], account) && e[1] === BigInt(state.ballot));
      if (["senate-add", "senate-expel", "senate-replace"].includes(action)) {
        const added = events(SENATE_PIN.address, "AddSenator", senateAbi).some(e => eq(e[0], candidate)), removed = events(SENATE_PIN.address, "RemoveSenator", senateAbi).some(e => eq(e[0], action === "senate-replace" ? account : candidate));
        return action === "senate-add" ? added : action === "senate-expel" ? removed : added && removed;
      }
      if (action === "senate-credit") {
        const creditEvents = new Interface(["event AddCredit(address indexed depositor,uint256 amount)"]);
        return state.members.length > 0 && state.members.every((member: string) => events(credit.address, "AddCredit", creditEvents).some(e => eq(e[0], member) && e[1] > 0n));
      }
      if (action === "treasury-create") return events(consensus.address, "TreasuryProposal").some(e => eq(e[6], account) && e[1] === BigInt(state.values[0]) && eq(e[2], state.values[1]) && eq(e[3], state.values[2]) && e[4] === BigInt(state.values[3]) && e[7] === BigInt(state.values[4]));
      if (action === "treasury-support" || action === "treasury-oppose") return events(consensus.address, "AddVotes").some(e => e[0] === 0n && e[1] === id && eq(e[2], account) && e[3] === BigInt(state.spend) && e[4] === (action === "treasury-support"));
      if (action.startsWith("treasury-") || action === "senate-veto" && review.request.args.kind === "treasury") {
        const approves = action === "treasury-approve";
        if (!events(consensus.address, "TreasuryEnforce").some(e => e[0] === id && eq(e[1], account) && e[2] === approves) || (await read(consensus.address, "treasuryProposal", [id]))[0]) return false;
        if (!approves) return true;
        verifyRuntime(await rpc.send("eth_getCode", [TREASURY_PIN.address, receipt.blockNumber]), TREASURY_PIN.runtimeCodeHash, "Treasury receipt");
        const row = state.treasury;
        // The treasury ignores ERC20 false returns: its own success event alone is insufficient.
        return native(row[5]) ? events(TREASURY_PIN.address, "ExecuteTransaction", extraAbi).some(e => eq(e[0], row[5]) && eq(e[1], row[6]) && e[2] === BigInt(row[7])) : events(row[5], "Transfer", extraAbi).some(e => eq(e[0], TREASURY_PIN.address) && eq(e[1], row[6]) && e[2] === BigInt(row[7]));
      }
      if (action === "governor-propose") return events(consensus.address, "ProposeGovernor").some(e => eq(e[1], candidate) && eq(e[2], account));
      if (action === "governor-clear") return !(await read(common.governor, "changeGovernorActivated", [], extraAbi))[0];
      if (action === "governor-enforce") {
        const ownerAbi = new Interface(["function owner() view returns(address)"]);
        return events(common.governor, "EnforceGovernor", extraAbi).some(e => eq(e[0], candidate) && eq(e[1], consensus.address)) && events(common.rewardToken, "Transfer", extraAbi).some(e => eq(e[0], common.governor) && eq(e[1], candidate) && e[2] >= BigInt(state.governorBalance)) && eq((await read(common.masterchef, "owner", [], ownerAbi))[0], candidate) && eq((await read(common.masterchef, "feeAddress", [], extraAbi))[0], candidate) && eq((await read(common.masterchef, "devaddr", [], extraAbi))[0], candidate);
      }
      if (["governor-activate", "governor-reject-first", "governor-veto", "governor-veto-total", "senate-veto"].includes(action)) {
        const passed = action === "governor-activate";
        return events(consensus.address, "ChangeGovernor").some(e => e[0] === BigInt(state.position) && eq(e[1], account) && e[2] === passed) && (await read(consensus.address, "isGovInvalidated", [candidate]))[passed ? 1 : 0] === true;
      }
      return false;
    } catch { return false; }
  },
};
