// Source recompilation and runtime evidence: evidence/ordinary-governance.json
export const ORDINARY_DEPLOYMENTS = {
  "basic": {
    "address": "0x5DebADaf41ED55270e0F9944FD389745e73d29B9",
    "runtimeCodeHash": "0x07603344f49ceb5388bdedca49236e4cea7475d66c00b02a00dc9d8c88bf92af",
    "abi": [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_DTX",
            "type": "address"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "voter",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "tokensSacrificed",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_for",
            "type": "bool"
          }
        ],
        "name": "AddVotes",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "proposedMinDeposit",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "DelayBeforeEnforce",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "isSuccess",
            "type": "bool"
          }
        ],
        "name": "EnforceProposal",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "forPool",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "newBonus",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "InitiateRolloverBonus",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "newCallFee",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "InitiateSetCallFee",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "proposedMinDeposit",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeMinDeposit",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "address",
            "name": "newPool",
            "type": "address"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeNewPool",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "proposedMinDeposit",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeSetMinThresholdFibonaccening",
        "type": "event"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "callFeeProposal",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "creditContract",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "delayProposals",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeDelayBeforeEnforceProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeNewPool",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeProposalRolloverBonus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeSetCallFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeSetMinDeposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeSetMinThresholdFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newDelay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "initiateDelayBeforeEnforceProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "_newPool",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "initiateNewPool",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "_forPoolAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_newBonus",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "initiateProposalRolloverBonus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newCallFee",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "initiateSetCallFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newMinDeposit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "initiateSetMinDeposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "minDepositProposals",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "minThresholdFibonacceningProposal",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "newPoolProposal",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "newPool",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "proposalLengths",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newMinimum",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "proposeSetMinThresholdFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "rolloverBonuses",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "poolAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "newBonus",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "syncCreditContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "syncOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "updateNewPoolProposalThreshold",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoDelayBeforeEnforceProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoNewPool",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoProposalRolloverBonus",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoSetCallFee",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoSetMinDeposit",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoSetMinThresholdFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteDelayBeforeEnforceProposalN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteDelayBeforeEnforceProposalY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteNewPoolN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteNewPoolY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteProposalRolloverBonusN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteProposalRolloverBonusY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteSetCallFeeN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteSetCallFeeY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteSetMinDepositN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteSetMinDepositY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteSetMinThresholdFibonacceningN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteSetMinThresholdFibonacceningY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]
  },
  "farms": {
    "address": "0x0dc0Fabe4c9d57cCaD055b4cD627D0d24fA3C98E",
    "runtimeCodeHash": "0x0595b92b318d7dbb97610c55ae7789373ffeeae8541824228d372587993d04ac",
    "abi": [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_DTX",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "_masterchef",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "_launch",
            "type": "uint256"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "voter",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "tokensSacrificed",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_for",
            "type": "bool"
          }
        ],
        "name": "AddVotes",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "isSuccess",
            "type": "bool"
          }
        ],
        "name": "EnforceProposal",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "poolid",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "newAllocation",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint16",
            "name": "depositFee",
            "type": "uint16"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "InitiateFarmProposal",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "proposedTax",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeGovTax",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "proposedAmount",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "isBurn",
            "type": "bool"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeGovernorTransfer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeVault",
        "type": "event"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_nft",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_maxPulse",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_maxPulseTotal",
            "type": "uint256"
          }
        ],
        "name": "changeMaxAllocations",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "creditContract",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeGovTax",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeGovernorTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "executeVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "govTaxProposals",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "governorTransferProposals",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isBurn",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "poolid",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newAllocation",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "depositFee",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "initiateFarmProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "lastReducePulseAllocation",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "masterchef",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "maxNftAllocation",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "maxPulseEcoAllocation",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "maxPulseEcoTotalAllocation",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "percentageAllocatedToPulseEcosystem",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "poolAllocationPercentage",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "proposalFarmUpdate",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "poolid",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newAllocation",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "newDepositFee",
            "type": "uint16"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "proposalLengths",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "proposeGovTax",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "_isBurn",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "_timestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "proposeGovernorTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "proposeVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "rebalanceIfPulseAllocationExceedsMaximum",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "rebalancePools",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "reduceMaxPulseAllocation",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "setMasterchef",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "syncCreditContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "syncOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "_withUpdate",
            "type": "bool"
          }
        ],
        "name": "updateFarm",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "vaultProposals",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedType",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "proposedValue",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoFarmProposal",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoGovTax",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoGovernorTransfer",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoVault",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteFarmProposalN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteFarmProposalY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteGovTaxN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteGovTaxY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteGovernorTransferN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteGovernorTransferY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteVaultN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteVaultY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]
  },
  "reward": {
    "address": "0xc77c66913B5f60522Ccb98857228511930da7403",
    "runtimeCodeHash": "0xd4261acef06e18d486801fce80459b22f5440201d3a178d016178bedc3f040fe",
    "abi": [
      {
        "inputs": [
          {
            "internalType": "address",
            "name": "_DTX",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "_masterchef",
            "type": "address"
          }
        ],
        "stateMutability": "nonpayable",
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "voter",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "tokensSacrificed",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "_for",
            "type": "bool"
          }
        ],
        "name": "AddVotes",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          }
        ],
        "name": "CancleFibonaccening",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          }
        ],
        "name": "EndFibonaccening",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "_type",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "bool",
            "name": "isSuccess",
            "type": "bool"
          }
        ],
        "name": "EnforceProposal",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": true,
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "durationInBlocks",
            "type": "uint256"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "newRewardPerBlock",
            "type": "uint256"
          },
          {
            "indexed": true,
            "internalType": "address",
            "name": "enforcer",
            "type": "address"
          },
          {
            "indexed": false,
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "ProposeFibonaccening",
        "type": "event"
      },
      {
        "inputs": [],
        "name": "calculateUpcomingRewardPerBlock",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "cancleFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "creditContract",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "endFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "expiredGrandFibonaccening",
        "outputs": [
          {
            "internalType": "bool",
            "name": "",
            "type": "bool"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "fibonacceningActivatedBlock",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "fibonacceningActiveID",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "name": "fibonacceningProposals",
        "outputs": [
          {
            "internalType": "bool",
            "name": "valid",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "firstCallTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedForVote",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "valueSacrificedAgainst",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "rewardPerBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "duration",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTime",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "leverPullFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "masterchef",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "proposalLengths",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "depositingTokens",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "newRewardPerBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "durationInBlocks",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "startTimestamp",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "delay",
            "type": "uint256"
          }
        ],
        "name": "proposeFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "rewardReduceBy",
        "outputs": [
          {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "setMasterchef",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "_amount",
            "type": "uint256"
          }
        ],
        "name": "setRewardReduceBy",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "syncCreditContract",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "syncOwner",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "token",
        "outputs": [
          {
            "internalType": "address",
            "name": "",
            "type": "address"
          }
        ],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          }
        ],
        "name": "vetoFibonaccening",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "withAction",
            "type": "bool"
          }
        ],
        "name": "voteFibonacceningN",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      },
      {
        "inputs": [
          {
            "internalType": "uint256",
            "name": "proposalID",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "withTokens",
            "type": "uint256"
          }
        ],
        "name": "voteFibonacceningY",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
      }
    ]
  }
} as const;
