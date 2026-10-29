export type CoverageState = "live" | "source" | "blocked" | "write";

export type GovernanceCoverage = {
  section: "Ordinary proposals" | "Miner voting" | "Senate" | "Protocol upgrades" | "NFT allocation";
  control: string;
  contractCall: string;
  permission: string;
  rule: string;
  status: CoverageState;
};

export const GOVERNANCE_COVERAGE: readonly GovernanceCoverage[] = [
  { section: "NFT allocation", control: "Announce, propose, update, reject and approve candidates", contractCall: "notifyVote, proposeAllocationContract, updateVotes, rejectAllocationContract, approveAllocationContract", permission: "Public caller; announcement consumes 50 times the voting cost", rule: "Address-based miner voting, strict weighted thresholds, three-day initial delay and configured rejection period. Approval reviews refuse an outcome that would reject the candidate.", status: "write" },
  { section: "NFT allocation", control: "Direct and delegated miner voting", contractCall: "voteForProposal, delegateeVote", permission: "Miner share owner or current delegate", rule: "Support uses the candidate address as a uint160 ballot; opposition is ballot + 1. Full shares move from the previous selection without spending credit.", status: "write" },
  { section: "Ordinary proposals", control: "Reward Boost follow-up actions", contractCall: "endFibonaccening, cancleFibonaccening", permission: "Public finalizer", rule: "End only after the active event reaches its final block. Cancel only open competing proposals during an active event. Receipts verify event closure and emission changes.", status: "write" },
  { section: "Senate", control: "Treasury requests", contractCall: "initiateTreasuryTransferProposal, voteTreasuryTransferProposalY/N, vetoTreasuryTransferProposal, killTreasuryTransferProposal, approveTreasuryTransfer", permission: "Credit holder or public finalizer as applicable", rule: "Reviews distinguish an actual transfer from closing a rejected request. Miner high-water votes and waiting periods are checked before signing.", status: "write" },
  {
    section: "Ordinary proposals",
    control: "Read current protocol settings",
    contractCall: "Governor getters; Farms allocation getters",
    permission: "Public view",
    rule: "Values and units are read from the deployed contracts.",
    status: "live",
  },
  {
    section: "Ordinary proposals",
    control: "Read proposal history and exact changes",
    contractCall: "Basic, Farms, and RewardBoost public proposal arrays",
    permission: "Public view",
    rule: "All ordinary proposal-array records are scanned at one block. Open and all-record filters are paginated; scan failures are explicit.",
    status: "live",
  },
  {
    section: "Ordinary proposals",
    control: "Create and vote on ordinary proposals",
    contractCall: "initiate*/propose*, vote*Y, vote*N, veto*, enforce*",
    permission: "Public caller with sufficient voting credit",
    rule: "Eleven proposal families support creation, voting, veto and execution. Voting permanently consumes credit and can burn wallet OINK if stored credit falls short.",
    status: "write",
  },
  {
    section: "Ordinary proposals",
    control: "Voting-credit custody",
    contractCall: "depositCredit, burnCredit; miner.votingCredit",
    permission: "Credit owner or eligible locked-position owner",
    rule: "A credit deposit permanently burns wallet OINK. Converting miner shares sends their OINK value to the Governor and issues nonwithdrawable credit. burnCredit destroys credit without casting a vote.",
    status: "write",
  },
  {
    section: "Miner voting",
    control: "Read locked-position voting power",
    contractCall: "getUserTotalShares, getPricePerFullShare",
    permission: "Public view; a wallet address is needed for personal totals",
    rule: "Six time miners apply published weights of 20%, 30%, 50%, 75%, 115%, and 150%.",
    status: "live",
  },
  {
    section: "Miner voting",
    control: "Select a consensus position",
    contractCall: "voteForProposal(uint256,bool)",
    permission: "Connected locked-position owner; direct wallet route",
    rule: "All shares in that miner move from the previous selection to the new selection; they are not burned.",
    status: "write",
  },
  {
    section: "Miner voting",
    control: "Delegate and cast delegated votes",
    contractCall: "setDelegate(address,bool); delegateeVote(address[],uint256)",
    permission: "Stake owner sets a delegate; only the recorded delegate can act for that address",
    rule: "Delegation is recorded independently by each of the six miners.",
    status: "write",
  },
  {
    section: "Senate",
    control: "Public members, limits, votes, and wallet status",
    contractCall: "viewSenators, senatorCount, minSenators, maxSenators, multiCall, isSenator",
    permission: "Public view",
    rule: "The registered on-chain list is authoritative; nomination lists are not membership proof.",
    status: "live",
  },
  {
    section: "Senate",
    control: "Vote and remove a recorded vote",
    contractCall: "vote(uint256); removeVote(uint256,uint256)",
    permission: "Registered Senate member",
    rule: "One vote per member and proposal; removal also needs the member's vote-array index.",
    status: "write",
  },
  {
    section: "Senate",
    control: "Block a Governor replacement or treasury withdrawal",
    contractCall: "vetoProposal(consensusProposalId,treasuryProposalId)",
    permission: "Public finalizer after Senate ballots reach threshold",
    rule: "Requires more than half of all currently registered members, not half of participants.",
    status: "write",
  },
  {
    section: "Senate",
    control: "Add, remove, or replace a seat",
    contractCall: "expandSenate, expellSenator, selfReplaceSenator",
    permission: "Majority finalizer or the member being replaced",
    rule: "Expulsion cannot take membership below the minimum; replacement requires no recorded member votes.",
    status: "write",
  },
  {
    section: "Senate",
    control: "Distribute voting credit",
    contractCall: "grantVotingCredit()",
    permission: "Public finalizer",
    rule: "Published source assigns 1% of newly recorded MasterChef credit to EACH registered member, then advances the recorded total; it does not divide a shared 1% pool.",
    status: "write",
  },
  {
    section: "Protocol upgrades",
    control: "Read current and proposed Governor state",
    contractCall: "token.governor; Governor eligibleNewGovernor/changeGovernorActivated; Consensus records",
    permission: "Public view",
    rule: "A proposal label is not treated as pending unless the deployed contracts agree.",
    status: "live",
  },
  {
    section: "Protocol upgrades",
    control: "Propose a replacement Governor",
    contractCall: "proposeGovernor",
    permission: "Public proposer with 100x voting cost",
    rule: "First stage needs at least 15% of total weighted locked OINK and opposition below one third of support.",
    status: "write",
  },
  {
    section: "Protocol upgrades",
    control: "Support or oppose an existing Governor proposal",
    contractCall: "miner.voteForProposal on verified paired consensus positions",
    permission: "Locked-position owner or current delegate",
    rule: "Available through Miner voting. Full miner shares move to the chosen support or opposition position without consuming credit.",
    status: "write",
  },
  {
    section: "Protocol upgrades",
    control: "Veto and finalize a Governor replacement",
    contractCall: "changeGovernor, vetoGovernor, vetoGovernor2, senateVeto, enforceGovernor",
    permission: "Public finalizer, except senateVeto is Senate-contract only",
    rule: "Post-pass opposition vetoes and a block-based Governor delay apply before authority transfers.",
    status: "write",
  },
] as const;

export const coverageLabel: Record<CoverageState, string> = {
  live: "Live read implemented",
  write: "Review and wallet confirmation",
  source: "Published source mapped",
  blocked: "Write disabled",
};
