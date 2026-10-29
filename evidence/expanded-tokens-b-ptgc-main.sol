pragma solidity 0.8.2;

// SPDX-License-Identifier: Unlicensed

import "./Ownable.sol";
import "./ERC20.sol";
import "./SafeMath.sol";
import "./IPulseX.sol";

interface IStaking {
   function updatePool(uint256 amount) external;
}

contract pTGC is Ownable, ERC20 {
	using SafeMath for uint256;
	
    mapping (address => uint256) public rOwned;
    mapping (address => uint256) public tOwned;
	mapping (address => uint256) public totalSend;
    mapping (address => uint256) public totalReceived;
	mapping (address => uint256) public lockedAmount;
	
    mapping (address => bool) public isExcludedFromFee;
	mapping (address => bool) public isExcludedFromMaxBuyPerWallet;
    mapping (address => bool) public isExcludedFromReward;
	mapping (address => bool) public isAutomatedMarketMakerPairs;
	mapping (address => bool) public isHolder;
	
    address[] private _excluded;
	
	address public burnWallet;
	address public DAOContract;
	IStaking public stakingContract;
	
    uint256 private constant MAX = ~uint256(0);
    uint256 private constant _tTotal = 333333333333 * (10**18);
    uint256 private _rTotal = (MAX - (MAX % _tTotal));
    uint256 private _tFeeTotal;
	
	uint256 public liquidityFeeTotal;
    uint256 public DAOFeeTotal;
	uint256 public holders;
	
	uint256[] public liquidityFee;
	uint256[] public DAOFee;
	uint256[] public reflectionFee;
	uint256[] public stakingFee;
	uint256[] public burnFee;
	
	uint256 private _liquidityFee;
	uint256 private _DAOFee;
	uint256 private _reflectionFee;
	uint256 private _stakingFee;
	uint256 private _burnFee;
	
	IPulseXRouter public pulseXRouter;
    address public pulseXPair;
	
	bool private swapping;
	
    uint256 public swapTokensAtAmount;
	uint256 public maxBuyPerWallet;
	
	event LockToken(uint256 amount, address user);
	event UnLockToken(uint256 amount, address user);
	event SwapTokensAmountUpdated(uint256 amount);
	
    constructor (address owner) ERC20("The Grays Currency", "pTGC") {
		rOwned[owner] = _rTotal;
		
		pulseXRouter = IPulseXRouter(0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02);
		pulseXPair = IPulseXFactory(pulseXRouter.factory()).createPair(address(this), pulseXRouter.WPLS());
		
		burnWallet = address(0x0000000000000000000000000000000000000369);
		swapTokensAtAmount = 33333333 * (10**18);
		maxBuyPerWallet = 6666666666 * (10**18);
		
		isExcludedFromFee[owner] = true;
		isExcludedFromFee[address(this)] = true;
		
		isExcludedFromMaxBuyPerWallet[address(pulseXPair)] = true;
		isExcludedFromMaxBuyPerWallet[address(this)] = true;
		isExcludedFromMaxBuyPerWallet[owner] = true;
		
		DAOFee.push(200);
		DAOFee.push(200);
		DAOFee.push(200);
		
		reflectionFee.push(100);
		reflectionFee.push(100);
		reflectionFee.push(100);
		
		stakingFee.push(100);
		stakingFee.push(100);
		stakingFee.push(100);
		
		burnFee.push(50);
		burnFee.push(50);
		burnFee.push(50);
		
		liquidityFee.push(50);
		liquidityFee.push(50);
		liquidityFee.push(50);
		
		_excludeFromReward(address(burnWallet));
		_excludeFromReward(address(pulseXPair));
		_excludeFromReward(address(this));
		_setAutomatedMarketMakerPair(pulseXPair, true);
		
		isHolder[owner] = true;
		holders += 1;
		
		totalReceived[owner] +=_tTotal;
		emit Transfer(address(0), owner, _tTotal);
    }
	
	receive() external payable {}
	
	function excludeFromLimit(address account, bool status) external onlyOwner {
       isExcludedFromMaxBuyPerWallet[address(account)] = status;
	   isExcludedFromFee[address(account)] = status;
    }
	
	function updateAutomatedMarketMakerPair(address pair, bool value) external onlyOwner{
        require(pair != address(0), "Zero address");
		_setAutomatedMarketMakerPair(pair, value);
		if(value)
		{
		   _excludeFromReward(address(pair));
		   isExcludedFromMaxBuyPerWallet[address(pair)] = true;
		}
		else
		{
		   _includeInReward(address(pair));
		   isExcludedFromMaxBuyPerWallet[address(pair)] = false;
		}
    }
	
    function totalSupply() public override pure returns (uint256) {
        return _tTotal;
    }
	
    function balanceOf(address account) public override view returns (uint256) {
        if (isExcludedFromReward[account]) return tOwned[account];
        return tokenFromReflection(rOwned[account]);
    }
	
    function tokenFromReflection(uint256 rAmount) public view returns(uint256) {
        require(rAmount <= _rTotal, "Amount must be less than total reflections");
        uint256 currentRate =  _getRate();
        return rAmount.div(currentRate);
    }
	
	function _excludeFromReward(address account) internal {
        if(rOwned[account] > 0) {
            tOwned[account] = tokenFromReflection(rOwned[account]);
        }
        isExcludedFromReward[account] = true;
        _excluded.push(account);
    }
	
	function _includeInReward(address account) internal {
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_excluded[i] == account) {
                _excluded[i] = _excluded[_excluded.length - 1];
                tOwned[account] = 0;
                isExcludedFromReward[account] = false;
                _excluded.pop();
                break;
            }
        }
    }
	
    function _setAutomatedMarketMakerPair(address pair, bool value) private {
        require(isAutomatedMarketMakerPairs[pair] != value, "Automated market maker pair is already set to that value");
        isAutomatedMarketMakerPairs[pair] = value;
    }
	
	function setStakingContract(IStaking contractAddress) external onlyOwner{
	    require(address(contractAddress) != address(0), "Zero address");
	    require(address(stakingContract) == address(0), "Staking contract already set");
	   
	    stakingContract = IStaking(contractAddress);
	   
	    _excludeFromReward(address(stakingContract));
	    isExcludedFromFee[address(stakingContract)] = true;
    }
	
	function setDAOContract(address wallet) external onlyOwner {
	    require(address(wallet) != address(0), "Zero address");
	    require(address(DAOContract) == address(0), "DAO contract already set");
	   
	    DAOContract = wallet;
		
	    _excludeFromReward(address(DAOContract));
	    isExcludedFromFee[address(DAOContract)] = true;
    }
	
	function lockToken(uint256 amount, address user) external {
	    require(msg.sender == address(stakingContract), "sender not allowed");
	   
	    uint256 unlockBalance = balanceOf(user) - lockedAmount[user];
	    require(unlockBalance >= amount, "locking amount exceeds balance");
	    lockedAmount[user] += amount;
	    emit LockToken(amount, user);
    }
	
	function unlockToken(uint256 amount, address user) external {
	    require(msg.sender == address(stakingContract), "sender not allowed");
	    require(lockedAmount[user] >= amount, "amount is not correct");
	   
	    lockedAmount[user] -= amount;
	    emit UnLockToken(amount, user);
    }
	
	function unlockSend(uint256 amount, address user) external {
	    require(msg.sender == address(stakingContract), "sender not allowed");
	    require(lockedAmount[user] >= amount, "amount is not correct");
	   
	    lockedAmount[user] -= amount;
	    IERC20(address(this)).transferFrom(address(user), address(stakingContract), amount);
	    emit UnLockToken(amount, user);
    }
	
	function airdropToken(uint256 amount) external {
        require(amount > 0, "Transfer amount must be greater than zero");
	    require(balanceOf(msg.sender) - lockedAmount[msg.sender] >= amount, "transfer amount exceeds balance");
		
	    _tokenTransfer(msg.sender, address(this), amount, true, true);
	}
	
    function _reflectFee(uint256 rFee, uint256 tFee) private {
        _rTotal = _rTotal.sub(rFee);
        _tFeeTotal = _tFeeTotal.add(tFee);
    }
	
    function _getValues(uint256 tAmount) private view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256) {
        (uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tDAO) = _getTValues(tAmount);
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee) = _getRValues(tAmount, tFee, tLiquidity, tDAO, _getRate());
        return (rAmount, rTransferAmount, rFee, tTransferAmount, tFee, tLiquidity, tDAO);
    }
	
    function _getTValues(uint256 tAmount) private view returns (uint256, uint256, uint256, uint256) {
		uint256 tFee = calculateReflectionFee(tAmount);
        uint256 tLiquidity = calculateLiquidityFee(tAmount);
        uint256 tDAO = calculateDAOFee(tAmount);
		
		uint256 tTransferAmount = tAmount.sub(tFee).sub(tLiquidity).sub(tDAO);
        return (tTransferAmount, tFee, tLiquidity, tDAO);
    }
	
    function _getRValues(uint256 tAmount, uint256 tFee, uint256 tLiquidity, uint256 tDAO, uint256 currentRate) private pure returns (uint256, uint256, uint256) {
        uint256 rAmount = tAmount.mul(currentRate);
        uint256 rFee = tFee.mul(currentRate);
        uint256 rLiquidity = tLiquidity.mul(currentRate);
        uint256 rDAO = tDAO.mul(currentRate);
		
		uint256 rTransferAmount = rAmount.sub(rFee).sub(rLiquidity).sub(rDAO);
        return (rAmount, rTransferAmount, rFee);
    }

    function _getRate() private view returns(uint256) {
        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        return rSupply.div(tSupply);
    }
	
    function _getCurrentSupply() private view returns(uint256, uint256) {
        uint256 rSupply = _rTotal;
        uint256 tSupply = _tTotal;      
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (rOwned[_excluded[i]] > rSupply || tOwned[_excluded[i]] > tSupply) return (_rTotal, _tTotal);
            rSupply = rSupply.sub(rOwned[_excluded[i]]);
            tSupply = tSupply.sub(tOwned[_excluded[i]]);
        }
        if (rSupply < _rTotal.div(_tTotal)) return (_rTotal, _tTotal);
        return (rSupply, tSupply);
    }
	
    function _takeLiquidity(uint256 tLiquidity) private {
        uint256 currentRate =  _getRate();
        uint256 rLiquidity = tLiquidity.mul(currentRate);
        rOwned[address(this)] = rOwned[address(this)].add(rLiquidity);
        if(isExcludedFromReward[address(this)])
            tOwned[address(this)] = tOwned[address(this)].add(tLiquidity);
    }
	
    function _takeDAO(uint256 tDAO) private {
        uint256 currentRate =  _getRate();
        uint256 rDAO = tDAO.mul(currentRate);
        rOwned[address(this)] = rOwned[address(this)].add(rDAO);
        if(isExcludedFromReward[address(this)])
           tOwned[address(this)] = tOwned[address(this)].add(tDAO);
    }
	
	function _takeStaking(uint256 tStaking) private {
        uint256 currentRate =  _getRate();
        uint256 rStaking = tStaking.mul(currentRate);
        rOwned[address(stakingContract)] = rOwned[address(stakingContract)].add(rStaking);
        if(isExcludedFromReward[address(stakingContract)])
            tOwned[address(stakingContract)] = tOwned[address(stakingContract)].add(tStaking);
    }
	
	function _takeBurn(uint256 tBurn) private {
        uint256 currentRate =  _getRate();
        uint256 rBurn = tBurn.mul(currentRate);
        rOwned[burnWallet] = rOwned[burnWallet].add(rBurn);
        if(isExcludedFromReward[burnWallet])
            tOwned[burnWallet] = tOwned[burnWallet].add(tBurn);
    }
	
    function calculateReflectionFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_reflectionFee).div(10000);
    }
	
    function calculateDAOFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_DAOFee).div(10000);
    }
	
	function calculateStakingFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_stakingFee).div(10000);
    }
	
    function calculateLiquidityFee(uint256 _amount) private view returns (uint256) {
        return _amount.mul(_liquidityFee).div(10000);
    }
	
	function calculateBurnFee(uint256 _amount) private view returns (uint256) {
		return _amount.mul(_burnFee).div(10000);
    }
	
    function removeAllFee() private {
	   _reflectionFee = 0;
	   _stakingFee = 0;
	   _DAOFee = 0;
	   _liquidityFee = 0;
	   _burnFee = 0;
    }
	
    function applyBuyFee() private {
	   _reflectionFee = reflectionFee[0];
	   _stakingFee = stakingFee[0];
       _DAOFee = DAOFee[0];
       _liquidityFee = liquidityFee[0];
	   _burnFee = burnFee[0];
    }
	
	function applySellFee() private {
	   _reflectionFee = reflectionFee[1];
	   _stakingFee = stakingFee[1];
       _DAOFee = DAOFee[1];
       _liquidityFee = liquidityFee[1];
	   _burnFee = burnFee[1];
    }
	
	function applyP2PFee() private {
	   _reflectionFee = reflectionFee[2];
	   _stakingFee = stakingFee[2];
       _DAOFee = DAOFee[2];
       _liquidityFee = liquidityFee[2];
	   _burnFee = burnFee[2];
    }
	
	function applyAirdropFee() private {
	   _reflectionFee = 10000;
	   _stakingFee = 0;
       _DAOFee = 0;
       _liquidityFee = 0;
	   _burnFee = 0;
    }
	
    function _transfer(address from, address to, uint256 amount) internal override{
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        require(amount > 0, "Transfer amount must be greater than zero");
		require(balanceOf(from) - lockedAmount[from] >= amount, "transfer amount exceeds balance");
		
		if(!isHolder[address(to)]) {
		   isHolder[to] = true;
		   holders += 1;
		}
		
		if((balanceOf(from) - amount) == 0) {
		   isHolder[from] = false;
		   holders -= 1;
		}
		
		if(!isExcludedFromMaxBuyPerWallet[to] && isAutomatedMarketMakerPairs[from])
		{
            uint256 balanceRecepient = balanceOf(to);
            require(balanceRecepient + amount <= maxBuyPerWallet, "Exceeds maximum buy per wallet limit");
        }
		
        uint256 contractTokenBalance = balanceOf(address(this));
		bool canSwap = contractTokenBalance >= swapTokensAtAmount;
		
        if (canSwap && !swapping && isAutomatedMarketMakerPairs[to]) 
		{
		    uint256 tokenToLiqudity = liquidityFeeTotal.div(2);
			uint256 tokenToDAO = DAOFeeTotal;
			uint256 tokenToSwap = tokenToLiqudity.add(tokenToDAO);
			
			if(tokenToSwap >= swapTokensAtAmount) 
			{
			    swapping = true;
				swapTokensForPLS(swapTokensAtAmount);
				uint256 PLSBalance = address(this).balance;
				
				uint256 liqudityPart = PLSBalance.mul(tokenToLiqudity).div(tokenToSwap);
				uint256 DAOPart = PLSBalance - liqudityPart;
				
				if(liqudityPart > 0)
				{
				    uint256 liqudityToken = swapTokensAtAmount.mul(tokenToLiqudity).div(tokenToSwap);
					addLiquidity(liqudityToken, liqudityPart);
					liquidityFeeTotal = liquidityFeeTotal.sub(liqudityToken).sub(liqudityToken);
				}
				if(DAOPart > 0) 
				{
				    (bool sent, ) = DAOContract.call{value: DAOPart}("");
					DAOFeeTotal = DAOFeeTotal.sub(swapTokensAtAmount.mul(tokenToDAO).div(tokenToSwap));
				}
				swapping = false;
			}
        }
		
        bool takeFee = true;
        if(isExcludedFromFee[from] || isExcludedFromFee[to])
		{
            takeFee = false;
        }
		else
		{
		    if(!isHolder[address(this)]) {
			   isHolder[address(this)] = true;
			   holders += 1;
			}
			
			if(!isHolder[address(stakingContract)]) {
			   isHolder[address(stakingContract)] = true;
			   holders += 1;
			}
			
			if(!isHolder[address(burnWallet)]) {
			   isHolder[address(burnWallet)] = true;
			   holders += 1;
			}
		}
        _tokenTransfer(from,to,amount,takeFee,false);
    }
	
    function _tokenTransfer(address sender, address recipient, uint256 amount, bool takeFee, bool airdrop) private {
		totalSend[sender] += amount;
		
		if(!takeFee) 
		{
		    removeAllFee();
		}
		else if(airdrop)
		{
		    applyAirdropFee();
		}
		else if(!isAutomatedMarketMakerPairs[sender] && !isAutomatedMarketMakerPairs[recipient])
		{
			applyP2PFee();
		}
		else if(isAutomatedMarketMakerPairs[recipient])
		{
		    applySellFee();
		}
		else
		{
		    applyBuyFee();
		}
		
		uint256 _totalFee = _reflectionFee + _stakingFee + _DAOFee + _liquidityFee + _burnFee;
		if(_totalFee > 0)
		{
		    uint256 _feeAmount = amount.mul(_totalFee).div(10000);
		    totalReceived[recipient] += amount.sub(_feeAmount);
		}
		else
		{
		    totalReceived[recipient] += amount;
		}
		
		uint256 tBurn = calculateBurnFee(amount);
		if(tBurn > 0)
		{
		   _takeBurn(tBurn);
		   emit Transfer(sender, address(burnWallet), tBurn);
		}
		
		uint256 tStaking = calculateStakingFee(amount);
		if(tStaking > 0) 
		{
		    _takeStaking(tStaking);
		    stakingContract.updatePool(tStaking);
		    emit Transfer(sender, address(stakingContract), tStaking);
		}
		
        if (isExcludedFromReward[sender] && !isExcludedFromReward[recipient]) 
		{
            _transferFromExcluded(sender, recipient, amount, tStaking, tBurn);
        } 
		else if (!isExcludedFromReward[sender] && isExcludedFromReward[recipient]) 
		{
            _transferToExcluded(sender, recipient, amount, tStaking, tBurn);
        } 
		else if (!isExcludedFromReward[sender] && !isExcludedFromReward[recipient]) 
		{
            _transferStandard(sender, recipient, amount, tStaking, tBurn);
        } 
		else if (isExcludedFromReward[sender] && isExcludedFromReward[recipient]) 
		{
            _transferBothExcluded(sender, recipient, amount, tStaking, tBurn);
        } 
		else 
		{
            _transferStandard(sender, recipient, amount, tStaking, tBurn);
        }
    }
	
    function _transferStandard(address sender, address recipient, uint256 tAmount, uint256 tStaking, uint256 tBurn) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tDAO) = _getValues(tAmount);
        
		tTransferAmount = tTransferAmount.sub(tStaking).sub(tBurn);
		rTransferAmount = rTransferAmount.sub(tStaking.mul(_getRate())).sub(tBurn.mul(_getRate()));
		
		rOwned[sender] = rOwned[sender].sub(rAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount);
		
        _takeLiquidity(tLiquidity);
        _takeDAO(tDAO);
        _reflectFee(rFee, tFee);
		
		liquidityFeeTotal += tLiquidity;
        DAOFeeTotal += tDAO;
		
		if(tDAO.add(tLiquidity) > 0)
		{
		    emit Transfer(sender, address(this), tDAO.add(tLiquidity));
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }
	
    function _transferToExcluded(address sender, address recipient, uint256 tAmount, uint256 tStaking, uint256 tBurn) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tDAO) = _getValues(tAmount);
        
		tTransferAmount = tTransferAmount.sub(tStaking).sub(tBurn);
		rTransferAmount = rTransferAmount.sub(tStaking.mul(_getRate())).sub(tBurn.mul(_getRate()));
		
		rOwned[sender] = rOwned[sender].sub(rAmount);
        tOwned[recipient] = tOwned[recipient].add(tTransferAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount);  
		
        _takeLiquidity(tLiquidity);
        _takeDAO(tDAO);
        _reflectFee(rFee, tFee);
		
		liquidityFeeTotal += tLiquidity;
        DAOFeeTotal += tDAO;
		
		if(tDAO.add(tLiquidity) > 0)
		{
		    emit Transfer(sender, address(this), tDAO.add(tLiquidity));
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }

    function _transferFromExcluded(address sender, address recipient, uint256 tAmount, uint256 tStaking, uint256 tBurn) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tDAO) = _getValues(tAmount);
        
		tTransferAmount = tTransferAmount.sub(tStaking).sub(tBurn);
		rTransferAmount = rTransferAmount.sub(tStaking.mul(_getRate())).sub(tBurn.mul(_getRate()));
		
		tOwned[sender] = tOwned[sender].sub(tAmount);
        rOwned[sender] = rOwned[sender].sub(rAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount); 
		
        _takeLiquidity(tLiquidity);
        _takeDAO(tDAO);
        _reflectFee(rFee, tFee);
		
		liquidityFeeTotal += tLiquidity;
        DAOFeeTotal += tDAO;
		
		if(tDAO.add(tLiquidity) > 0)
		{
		    emit Transfer(sender, address(this), tDAO.add(tLiquidity));
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }
	
	function _transferBothExcluded(address sender, address recipient, uint256 tAmount, uint256 tStaking, uint256 tBurn) private {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tDAO) = _getValues(tAmount);
        
		tTransferAmount = tTransferAmount.sub(tStaking).sub(tBurn);
		rTransferAmount = rTransferAmount.sub(tStaking.mul(_getRate())).sub(tBurn.mul(_getRate()));
		
		tOwned[sender] = tOwned[sender].sub(tAmount);
        rOwned[sender] = rOwned[sender].sub(rAmount);
        tOwned[recipient] = tOwned[recipient].add(tTransferAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount);   
		
        _takeLiquidity(tLiquidity);
        _takeDAO(tDAO);
        _reflectFee(rFee, tFee);
		
		liquidityFeeTotal += tLiquidity;
        DAOFeeTotal += tDAO;
		
		if(tDAO.add(tLiquidity) > 0)
		{
		    emit Transfer(sender, address(this), tDAO.add(tLiquidity));
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }
	
	function swapTokensForPLS(uint256 tokenAmount) private {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = pulseXRouter.WPLS();
		
        _approve(address(this), address(pulseXRouter), tokenAmount);
        pulseXRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0,
            path,
            address(this),
            block.timestamp
        );
    }
	
	function addLiquidity(uint256 tokenAmount, uint256 PLSAmount) private {
        _approve(address(this), address(pulseXRouter), tokenAmount);
        pulseXRouter.addLiquidityETH{value: PLSAmount}(
            address(this),
            tokenAmount,
            0, 
            0,
            address(this),
            block.timestamp
        );
    }
}