import { Interface, getAddress } from "ethers";

// Published-source ABI allowlist. All quantities must be raw contract integers.
// These encoders do not check balances, permissions, timing, or expected effects.
export const ORDINARY_CALLS = {
  "Voting cost": {
    "create": "function initiateSetMinDeposit(uint256 depositingTokens, uint256 newMinDeposit, uint256 delay)",
    "support": "function voteSetMinDepositY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteSetMinDepositN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoSetMinDeposit(uint256 proposalID)",
    "execute": "function executeSetMinDeposit(uint256 proposalID)"
  },
  "New pool": {
    "create": "function initiateNewPool(uint256 depositingTokens, address _newPool, uint256 delay)",
    "support": "function voteNewPoolY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteNewPoolN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoNewPool(uint256 proposalID)",
    "execute": "function executeNewPool(uint256 proposalID)"
  },
  "Enforcement delay": {
    "create": "function initiateDelayBeforeEnforceProposal(uint256 depositingTokens, uint256 newDelay, uint256 delay)",
    "support": "function voteDelayBeforeEnforceProposalY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteDelayBeforeEnforceProposalN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoDelayBeforeEnforceProposal(uint256 proposalID)",
    "execute": "function executeDelayBeforeEnforceProposal(uint256 proposalID)"
  },
  "Rollover bonus": {
    "create": "function initiateProposalRolloverBonus(uint256 depositingTokens, address _forPoolAddress, uint256 _newBonus, uint256 delay)",
    "support": "function voteProposalRolloverBonusY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteProposalRolloverBonusN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoProposalRolloverBonus(uint256 proposalID)",
    "execute": "function executeProposalRolloverBonus(uint256 proposalID)"
  },
  "Harvest call fee": {
    "create": "function initiateSetCallFee(uint256 depositingTokens, uint256 newCallFee, uint256 delay)",
    "support": "function voteSetCallFeeY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteSetCallFeeN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoSetCallFee(uint256 proposalID)",
    "execute": "function executeSetCallFee(uint256 proposalID)"
  },
  "Reward-event threshold": {
    "create": "function proposeSetMinThresholdFibonaccening(uint256 depositingTokens, uint256 newMinimum, uint256 delay)",
    "support": "function voteSetMinThresholdFibonacceningY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteSetMinThresholdFibonacceningN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoSetMinThresholdFibonaccening(uint256 proposalID)",
    "execute": "function executeSetMinThresholdFibonaccening(uint256 proposalID)"
  },
  "Pool allocation": {
    "create": "function initiateFarmProposal( uint256 depositingTokens, uint256 poolid, uint256 newAllocation, uint16 depositFee, uint256 delay )",
    "support": "function voteFarmProposalY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteFarmProposalN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoFarmProposal(uint256 proposalID)",
    "execute": "function updateFarm(uint256 proposalID, bool _withUpdate)"
  },
  "Vault setting": {
    "create": "function proposeVault(uint256 depositingTokens, uint256 _type, uint256 _amount, uint256 delay)",
    "support": "function voteVaultY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteVaultN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoVault(uint256 proposalID)",
    "execute": "function executeVault(uint256 proposalID)"
  },
  "Governor transfer or burn": {
    "create": "function proposeGovernorTransfer(uint256 depositingTokens, uint256 _amount, bool _isBurn, uint256 _timestamp, uint256 delay)",
    "support": "function voteGovernorTransferY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteGovernorTransferN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoGovernorTransfer(uint256 proposalID)",
    "execute": "function executeGovernorTransfer(uint256 proposalID)"
  },
  "Governor tax": {
    "create": "function proposeGovTax(uint256 depositingTokens, uint256 _amount, uint256 delay)",
    "support": "function voteGovTaxY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteGovTaxN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoGovTax(uint256 proposalID)",
    "execute": "function executeGovTax(uint256 proposalID)"
  },
  "Reward boost": {
    "create": "function proposeFibonaccening( uint256 depositingTokens, uint256 newRewardPerBlock, uint256 durationInBlocks, uint256 startTimestamp, uint256 delay )",
    "support": "function voteFibonacceningY(uint256 proposalID, uint256 withTokens)",
    "oppose": "function voteFibonacceningN(uint256 proposalID, uint256 withTokens, bool withAction)",
    "veto": "function vetoFibonaccening(uint256 proposalID)",
    "execute": "function leverPullFibonaccening(uint256 proposalID)"
  }
} as const;

export type OrdinaryFamily = keyof typeof ORDINARY_CALLS;
export type OrdinaryStage = keyof (typeof ORDINARY_CALLS)[OrdinaryFamily];

export function encodeOrdinaryAction(family: OrdinaryFamily, stage: OrdinaryStage, args: readonly (bigint | string | boolean)[]) {
  const signature = ORDINARY_CALLS[family][stage];
  const iface = new Interface([signature]);
  const method = signature.match(/function (\w+)/)![1];
  return iface.encodeFunctionData(method, args);
}

export function prepareOrdinaryAction(contractAddress: string, family: OrdinaryFamily, stage: OrdinaryStage, args: readonly (bigint | string | boolean)[]) {
  return { label: `${stage}: ${family}`, to: getAddress(contractAddress),
    data: encodeOrdinaryAction(family, stage, args), value: 0n as const, blocked: true as const };
}
