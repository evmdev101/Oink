// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IEmitRewards.sol";
import "./interfaces/IVotingToken.sol";

contract EMIT is ERC20, Ownable {
    using SafeMath for uint256; 
    
    struct Proposal {
        uint256 id;
        string description;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        address proposer;
        mapping(address => bool) hasVoted;
    }
    
    uint256 public votingPeriod = 3 days;
    uint256 public PROPOSAL_THRESHOLD_BPS = 100; //1%
    uint256 public QUORUM_BPS = 1000; //10%
    uint256 public constant BPS_DENOMINATOR = 10000;

    address public masterchef;
    address public emitters;
    address public emitRewards;
    address public votingToken;

    mapping (address => bool) public isWhitelisted;
    uint256 public totalBurned;

    address public pair;

    IUniswapV2Router02 public pulseXRouter = IUniswapV2Router02(0x165C3410fC91EF562C50559f7d2289fEbed552d9);

    bool public swapEnabled = true;
    uint256 public swapThreshold = 50 ether;
    uint256 public stakeThreshold = 50000 ether;
    bool inSwap;

    uint256 burnFee = 100;
    uint256 stakeFee = 400;

    modifier swapping() { inSwap = true; _; inSwap = false; }
    
    mapping(uint256 => Proposal) public proposals;
    uint256 public proposalCount;
    
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startTime, uint256 endTime);
    event VoteCast(address indexed voter, uint256 indexed proposalId, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event VotingParametersUpdated(uint256 votingPeriod, uint256 proposalThresholdBps, uint256 quorumBps);
    event Burned(uint256 amount);

    constructor(address _emitters
    ) ERC20("EMIT", "EMIT") {
        emitters = _emitters;

        pair = IUniswapV2Factory(pulseXRouter.factory()).createPair(
            address(this),
            pulseXRouter.WPLS()
        );

        isWhitelisted[address(this)] =  true;
        isWhitelisted[msg.sender] = true;

        _mint(msg.sender, 100_000 * 10**18);
        _approve(address(this), address(pulseXRouter), type(uint256).max);
    }

    receive() external payable {}

    function shouldSwapBack() internal view returns (bool) {
        return msg.sender != pair
        && !inSwap
        && swapEnabled
        && balanceOf(address(this)) >= swapThreshold;
    }

    function swapBack() internal swapping {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = pulseXRouter.WPLS();

        pulseXRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            swapThreshold,
            0,
            path,
            address(this),
            block.timestamp
        );

        uint256 balance = address(this).balance;
        if (balance >= stakeThreshold) {
            try IEmitRewards(emitRewards).topUp{value: balance}() {} catch {}
        }
    }

    function _transfer(address sender, address recipient, uint256 amount) internal override(ERC20){
        if (isWhitelisted[recipient] || isWhitelisted[sender]) {
            super._transfer(sender, recipient, amount);
        } else {
            if(inSwap) { return super._transfer(sender, recipient, amount); }
            if(shouldSwapBack()) {swapBack();}

            uint256 toBurn = amount * burnFee / 10000;
            uint256 toStake = amount * stakeFee / 10000;
            uint256 afterFees = amount - toBurn - toStake;

            totalBurned += toBurn;
            _burn(sender, toBurn);
            emit Burned(toBurn);
            
            super._transfer(sender, address(this), toStake);
            super._transfer(sender, recipient, afterFees);
        }
    }

    function getProposalThreshold() public view returns (uint256) {
        return IVotingToken(votingToken).totalSupply().mul(PROPOSAL_THRESHOLD_BPS).div(BPS_DENOMINATOR);
    }
    
    function getQuorum() public view returns (uint256) {
        return IVotingToken(votingToken).totalSupply().mul(QUORUM_BPS).div(BPS_DENOMINATOR);
    }

    function mint(uint256 _amount) public onlyMasterchef returns (bool) {
        return mintFor(address(this), _amount);
    }

    function burn(uint256 _amount) public {
        totalBurned += _amount;
        _burn(msg.sender, _amount);
        emit Burned(_amount);
    }

    function setMasterchef(address _masterchef) external onlyOwner {
        masterchef = _masterchef;
    }
    
    // Add onlyMasterchef modifier
    modifier onlyMasterchef() {
        require(msg.sender == masterchef, "Caller is not the Masterchef");
        _;
    }

    function safeTokenTransfer(address _to, uint256 _amount) public onlyMasterchef {
        uint256 balance = balanceOf(address(this));
        if (_amount > balance) {
            _transfer(address(this), _to, balance);
        } else {
            _transfer(address(this), _to, _amount);
        }
    }

    function mintFor(
        address _address,
        uint256 _amount
    ) public onlyMasterchef returns (bool) {
        _mint(_address, _amount);
        return true;
    }
    
    function createProposal(string memory description) external returns (uint256) {
        require(IVotingToken(votingToken).balanceOf(msg.sender) >= getProposalThreshold(), "proposer votes below threshold");
        require(IERC721(emitters).balanceOf(msg.sender) > 0, "must hold emitters nft");
        
        proposalCount++;
        Proposal storage proposal = proposals[proposalCount];
        proposal.id = proposalCount;
        proposal.description = description;
        proposal.proposer = msg.sender;
        proposal.startTime = block.timestamp;
        proposal.endTime = block.timestamp + votingPeriod;
        
        emit ProposalCreated(proposalCount, msg.sender, description, proposal.startTime, proposal.endTime);
        
        return proposalCount;
    }
    
    function castVote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp <= proposal.endTime, "voting is closed");
        require(!proposal.hasVoted[msg.sender], "already voted");
        require(IERC721(emitters).balanceOf(msg.sender) > 0, "must hold emitters nft");
        
        uint256 votes = IVotingToken(votingToken).balanceOf(msg.sender);
        require(votes > 0, "no voting power");
        
        proposal.hasVoted[msg.sender] = true;
        
        if (support) {
            proposal.forVotes = proposal.forVotes.add(votes);
        } else {
            proposal.againstVotes = proposal.againstVotes.add(votes);
        }
        
        emit VoteCast(msg.sender, proposalId, support, votes);
    }
    
    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(block.timestamp > proposal.endTime, "voting still active");
        require(!proposal.executed, "proposal already executed");
        
        uint256 totalVotes = proposal.forVotes.add(proposal.againstVotes);
        require(totalVotes >= getQuorum(), "quorum not reached");
        require(proposal.forVotes > proposal.againstVotes, "proposal defeated");
        
        proposal.executed = true;
        
        emit ProposalExecuted(proposalId);
    }
    
    function hasVoted(uint256 proposalId, address voter) external view returns (bool) {
        return proposals[proposalId].hasVoted[voter];
    }
    
    function getProposalState(uint256 proposalId) external view returns (
        uint256 forVotes, 
        uint256 againstVotes, 
        bool active, 
        bool passed
    ) {
        Proposal storage proposal = proposals[proposalId];
        forVotes = proposal.forVotes;
        againstVotes = proposal.againstVotes;
        active = block.timestamp <= proposal.endTime;
        
        if (!active) {
            uint256 totalVotes = forVotes.add(againstVotes);
            passed = totalVotes >= getQuorum() && forVotes > againstVotes;
        }
    }
    
    function setVotingParameters(
        uint256 _votingPeriod,
        uint256 _proposalThresholdBps,
        uint256 _quorumBps
    ) external onlyOwner {
        require(_proposalThresholdBps <= BPS_DENOMINATOR, "threshold BPS exceeds denominator");
        require(_quorumBps <= BPS_DENOMINATOR, "quorum BPS exceeds denominator");
        
        votingPeriod = _votingPeriod;
        PROPOSAL_THRESHOLD_BPS = _proposalThresholdBps;
        QUORUM_BPS = _quorumBps;
        
        emit VotingParametersUpdated(_votingPeriod, _proposalThresholdBps, _quorumBps);
    }

    function setEmitters(address _emitters) external onlyOwner {
        emitters = _emitters;
    }

    function setVotingToken(address _votingToken) external onlyOwner {
        votingToken = _votingToken;
    }

    function addWhitelist(address account) external onlyOwner {
        isWhitelisted[account] = true;
    }

    function removeWhitelist(address account) external onlyOwner {
        isWhitelisted[account] = false;
    }

    function updateEmitRewards(address _emitRewards) external onlyOwner {
        emitRewards = _emitRewards;
    }

    function updateStakeThreshold(uint256 _amount) external onlyOwner {
        stakeThreshold = _amount;
    }

    function updateSwapThreshold(uint256 _amount) external onlyOwner {
        swapThreshold = _amount;
    }
}