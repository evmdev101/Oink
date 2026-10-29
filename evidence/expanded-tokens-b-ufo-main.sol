pragma solidity 0.8.2;

// SPDX-License-Identifier: Unlicensed

import "./Ownable.sol";
import "./ERC20.sol";
import "./SafeMath.sol";
import "./IPulseX.sol";

interface IStaking {
   function updatePool(uint256 amount) external;
   function stake(address LPPool, uint256 amount, address staker) external;
   function process(uint256 gas) external;
}

contract UFO is Ownable, ERC20 {
	using SafeMath for uint256;
	
    uint256 private constant MAX = ~uint256(0);
    uint256 private constant _tTotal = 999999999051 * (10**18);
	
    uint256 private _rTotal = (MAX - (MAX % _tTotal));
    uint256 private _tFeeTotal;
	
	uint256 public reflectionFee;
	uint256 public buyBurnFee;
	uint256 public pTGCBuyBurnFee;
	uint256 public LPProviderFee;
	
	uint256 private _reflectionFee;
	uint256 private _buyBurnFee;
	uint256 private _pTGCBuyBurnFee;
	uint256 private _LPProviderFee;
	
	uint256 public swapThreshold;
	uint256 public processGas;
	
	IPulseXRouter public pulseXRouter;
	IStaking public LPStaking;
	
	address private burnWallet = address(0x0000000000000000000000000000000000000369);
	address private pTGC = address(0x94534EeEe131840b1c0F61847c572228bdfDDE93);
	
	address[] public pairs;
	
	bool private swapping;
	address[] private _excluded;
	
	mapping(address => uint256) public rOwned;
    mapping(address => uint256) public tOwned;
	mapping(address => uint256) public totalSend;
    mapping(address => uint256) public totalReceived;
    mapping(address => bool) public isExcludedFromFee;
    mapping(address => bool) public isExcludedFromReflection;
	mapping(address => bool) public isExcludedFromReward;
	mapping(address => bool) public isliquidityPair;
	
	event SwapThresholdUpdated(uint256 amount);
	event AccountExcludeFromFee(address account, bool status);
    event AccountIncludeInReflection(address account);
    event AccountExcludeFromReflection(address account);
	event LPStakingAddressAdded(address newAddress);
	event ProcessGasUpdated(uint256 newGas);
	
	constructor(address owner) ERC20("UFO", "UFO") {
	    require(address(owner) != address(0), "Zero address");
		
		rOwned[address(owner)] = _rTotal;
		pulseXRouter = IPulseXRouter(0x165C3410fC91EF562C50559f7d2289fEbed552d9);
		
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0xA1077a294dDE1B09bB078844df40758a5D0f9a27))); //WPLS
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0x94534EeEe131840b1c0F61847c572228bdfDDE93))); //pTGC
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d))); //INC
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0x95B303987A60C71504D99Aa1b13B4DA07b0790ab))); //PLSX
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39))); //HEX
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0x57fde0a71132198BBeC939B98976993d8D89D225))); //HEXETH
		pairs.push(IPulseXFactory(pulseXRouter.factory()).createPair(address(this), address(0x6B175474E89094C44Da98b954EedeAC495271d0F))); //DAI
		
		_excludeFromReflection(address(burnWallet));
		_excludeFromReflection(address(this));
		_excludeFromReflection(address(owner));
		
		_setLiquidityPair(pairs[0]);
		_setLiquidityPair(pairs[1]);
		_setLiquidityPair(pairs[2]);
		_setLiquidityPair(pairs[3]);
		_setLiquidityPair(pairs[4]);
		_setLiquidityPair(pairs[5]);
		_setLiquidityPair(pairs[6]);
		
		_excludeFromFee(address(owner), true);
		_excludeFromFee(address(this), true);
		
		_excludeFromReward(address(owner), true);
		_excludeFromReward(address(burnWallet), true);
		
		swapThreshold = 99999999 * (10**18);
		
		reflectionFee = 100;
	    buyBurnFee = 100;
	    pTGCBuyBurnFee = 100;
		LPProviderFee = 300;
		
		processGas = 250000;
		
		totalReceived[address(owner)] +=_tTotal;
		emit Transfer(address(0), address(owner), _tTotal);
    }
	
	receive() external payable {}

    function totalSupply() public override pure returns (uint256) {
        return _tTotal;
    }
	
    function balanceOf(address account) public override view returns (uint256) {
        if (isExcludedFromReflection[account]) return tOwned[account];
        return tokenFromReflection(rOwned[account]);
    }
	
    function tokenFromReflection(uint256 rAmount) public view returns(uint256) {
        require(rAmount <= _rTotal, "Amount must be less than total reflections");
        uint256 currentRate =  _getRate();
        return rAmount.div(currentRate);
    }
	
	function _excludeFromReflection(address account) internal {
        if(rOwned[account] > 0) {
            tOwned[account] = tokenFromReflection(rOwned[account]);
        }
        isExcludedFromReflection[account] = true;
        _excluded.push(account);
    }
	
	function _excludeFromReward(address account, bool value) internal {
        isExcludedFromReward[account] = value;
    }
	
    function _setLiquidityPair(address pair) internal {
        isliquidityPair[address(pair)] = true;
		_excludeFromReflection(address(pair));
    }
	
	function _excludeFromFee(address account, bool value) internal {
        isExcludedFromFee[account] = value;
    }
	
    function _reflectFee(uint256 rFee, uint256 tFee) internal {
        _rTotal = _rTotal.sub(rFee);
        _tFeeTotal = _tFeeTotal.add(tFee);
    }
	
	function _contractFee(uint256 tContract) internal {
        uint256 currentRate =  _getRate();
        uint256 rContract = tContract.mul(currentRate);
        rOwned[address(this)] = rOwned[address(this)].add(rContract);
        if(isExcludedFromReflection[address(this)])
            tOwned[address(this)] = tOwned[address(this)].add(tContract);
    }
	
    function _getValues(uint256 tAmount) internal view returns (uint256, uint256, uint256, uint256, uint256, uint256) {
        (uint256 tTransferAmount, uint256 tFee, uint256 tContract) = _getTValues(tAmount);
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee) = _getRValues(tAmount, tFee, tContract, _getRate());
        return (rAmount, rTransferAmount, rFee, tTransferAmount, tFee, tContract);
    }
	
    function _getTValues(uint256 tAmount) internal view returns (uint256, uint256, uint256) {
		uint256 tFee = calculateReflectionFee(tAmount);
        uint256 tContract = calculateContractFee(tAmount);
		
		uint256 tTransferAmount = tAmount.sub(tFee).sub(tContract);
        return (tTransferAmount, tFee, tContract);
    }
	
    function _getRValues(uint256 tAmount, uint256 tFee, uint256 tContract, uint256 currentRate) internal pure returns (uint256, uint256, uint256) {
        uint256 rAmount = tAmount.mul(currentRate);
        uint256 rFee = tFee.mul(currentRate);
        uint256 rContract = tContract.mul(currentRate);
		
		uint256 rTransferAmount = rAmount.sub(rFee).sub(rContract);
        return (rAmount, rTransferAmount, rFee);
    }

    function _getRate() internal view returns(uint256) {
        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        return rSupply.div(tSupply);
    }
	
    function _getCurrentSupply() internal view returns(uint256, uint256) {
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
    
    function calculateReflectionFee(uint256 _amount) internal view returns (uint256) {
        return _amount.mul(_reflectionFee).div(10000);
    }
	
    function calculateContractFee(uint256 _amount) internal view returns (uint256) {
        return _amount.mul((_buyBurnFee + _pTGCBuyBurnFee + _LPProviderFee)).div(10000);
    }
	
    function removeAllFee() internal {
	   _reflectionFee = 0;
	   _buyBurnFee = 0;
	   _pTGCBuyBurnFee = 0;
	   _LPProviderFee = 0;
    }
	
    function restoreAllFee() internal {
	   _reflectionFee = reflectionFee;
	   _buyBurnFee = buyBurnFee;
	   _pTGCBuyBurnFee = pTGCBuyBurnFee;
	   _LPProviderFee = LPProviderFee;
    }
	
    function _transfer(address from, address to, uint256 amount) internal override {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
		require(balanceOf(from) >= amount, "transfer amount exceeds balance");
		
        uint256 contractTokenBalance = balanceOf(address(this));
		bool canSwap = contractTokenBalance >= swapThreshold;
		
        if(canSwap && !swapping && isliquidityPair[to] && from != address(this)) 
		{
			swapping = true;
			swapTokensForPLS(swapThreshold);
			uint256 PLSBalance = address(this).balance;
			uint256 allFee = buyBurnFee.add(pTGCBuyBurnFee).add(LPProviderFee);
			
			uint256 buyBurnPart = PLSBalance.mul(buyBurnFee).div(allFee);
			uint256 pTGCBuyBurnPart = PLSBalance.mul(pTGCBuyBurnFee).div(allFee);
			uint256 LPProviderPart = PLSBalance.sub(buyBurnPart).sub(pTGCBuyBurnPart);
			
			if(buyBurnPart > 0)
			{
			    buybackBurnUFO(buyBurnPart);
			}
			if(pTGCBuyBurnPart > 0) 
			{
			    buybackBurnpTGC(buyBurnPart);
			}
			if(LPProviderPart > 0) 
			{
			   (bool success, ) = address(LPStaking).call{value: LPProviderPart}("");
			   require(success, "Failed to send PLS on staking address");
			   LPStaking.updatePool(LPProviderPart);
			}
			swapping = false;
        }
		
        bool takeFee = true;
        if(isExcludedFromFee[from] || isExcludedFromFee[to]) 
		{
           takeFee = false;
        }
        _tokenTransfer(from, to, amount, takeFee);
		try LPStaking.process(processGas) {} catch {}
    }
	
    function _tokenTransfer(address sender, address recipient, uint256 amount, bool takeFee) internal {
	    totalSend[sender] += amount;
		if(!takeFee)
		{
		   removeAllFee();
		}
		
		uint256 _totalFee = _reflectionFee + _buyBurnFee + _pTGCBuyBurnFee + _LPProviderFee;
		if(_totalFee > 0)
		{
		    uint256 _feeAmount = amount.mul(_totalFee).div(10000);
		    totalReceived[recipient] += amount.sub(_feeAmount);
		}
		else
		{
		    totalReceived[recipient] += amount;
		}
        if (isExcludedFromReflection[sender] && !isExcludedFromReflection[recipient]) 
		{
            _transferFromExcluded(sender, recipient, amount);
        } 
		else if (!isExcludedFromReflection[sender] && isExcludedFromReflection[recipient]) 
		{
            _transferToExcluded(sender, recipient, amount);
        } 
		else if (!isExcludedFromReflection[sender] && !isExcludedFromReflection[recipient]) 
		{
            _transferStandard(sender, recipient, amount);
        } 
		else if (isExcludedFromReflection[sender] && isExcludedFromReflection[recipient]) 
		{
            _transferBothExcluded(sender, recipient, amount);
        } 
		else 
		{
            _transferStandard(sender, recipient, amount);
        }
		if(!takeFee) 
		{
		   restoreAllFee();
		}
    }
	
    function _transferStandard(address sender, address recipient, uint256 tAmount) internal {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tContract) = _getValues(tAmount);
        
		rOwned[sender] = rOwned[sender].sub(rAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount);
		
        _contractFee(tContract);
        _reflectFee(rFee, tFee);
		
		if(tContract > 0)
		{
		   emit Transfer(sender, address(this), tContract);
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }
	
    function _transferToExcluded(address sender, address recipient, uint256 tAmount) internal {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tContract) = _getValues(tAmount);
        
		rOwned[sender] = rOwned[sender].sub(rAmount);
        tOwned[recipient] = tOwned[recipient].add(tTransferAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount);  
		
        _contractFee(tContract);
        _reflectFee(rFee, tFee);
		
		if(tContract > 0)
		{
		   emit Transfer(sender, address(this), tContract);
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }

    function _transferFromExcluded(address sender, address recipient, uint256 tAmount) internal {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tContract) = _getValues(tAmount);
        
		tOwned[sender] = tOwned[sender].sub(tAmount);
        rOwned[sender] = rOwned[sender].sub(rAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount); 
		
        _contractFee(tContract);
        _reflectFee(rFee, tFee);
		
		if(tContract > 0)
		{
		   emit Transfer(sender, address(this), tContract);
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }
	
	function _transferBothExcluded(address sender, address recipient, uint256 tAmount) internal {
        (uint256 rAmount, uint256 rTransferAmount, uint256 rFee, uint256 tTransferAmount, uint256 tFee, uint256 tContract) = _getValues(tAmount);
		
		tOwned[sender] = tOwned[sender].sub(tAmount);
        rOwned[sender] = rOwned[sender].sub(rAmount);
        tOwned[recipient] = tOwned[recipient].add(tTransferAmount);
        rOwned[recipient] = rOwned[recipient].add(rTransferAmount);   
		
        _contractFee(tContract);
        _reflectFee(rFee, tFee);
		
		if(tContract > 0)
		{
		   emit Transfer(sender, address(this), tContract);
		}
        emit Transfer(sender, recipient, tTransferAmount);
    }
	
	function swapTokensForPLS(uint256 tokenAmount) internal {
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
	
	function buybackBurnUFO(uint256 PLSAmount) internal {
        address[] memory path = new address[](2);
        path[0] = pulseXRouter.WPLS();
        path[1] = address(this);
		
        pulseXRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: PLSAmount}(
            0,
            path,
            address(burnWallet),
            block.timestamp
        );
    }
	
	function buybackBurnpTGC(uint256 PLSAmount) internal {
        address[] memory path = new address[](2);
        path[0] = pulseXRouter.WPLS();
        path[1] = address(pTGC);
		
        pulseXRouter.swapExactETHForTokensSupportingFeeOnTransferTokens{value: PLSAmount}(
            0,
            path,
            address(burnWallet),
            block.timestamp
        );
    }
	
	function addLiquidityETH(uint256 UFOToken) external payable {
	
	    _transfer(address(msg.sender), address(this), UFOToken);
        _approve(address(this), address(pulseXRouter), UFOToken);
		
        (, , uint256 liquidity) = pulseXRouter.addLiquidityETH{value: msg.value}(address(this), UFOToken, 0,  0, address(msg.sender), block.timestamp);
		LPStaking.stake(address(pairs[0]), liquidity, address(msg.sender));
    }
	
	function addLiquidity(address pair, uint256 token0Amount, uint256 token1Amount) external {
	    require(isliquidityPair[pair], "Liquidity pair is not correct");
		
		address token0 = address(PulseXPair(pair).token0());
		address token1 = address(PulseXPair(pair).token1());
		
		uint256 token0Balance = IERC20(token0).balanceOf(address(this));
		uint256 token1Balance = IERC20(token1).balanceOf(address(this));
		
		IERC20(token0).transferFrom(address(msg.sender), address(this), token0Amount);
		IERC20(token1).transferFrom(address(msg.sender), address(this), token1Amount);
		
		uint256 token0NewBalance = (IERC20(token0).balanceOf(address(this))) - token0Balance;
		uint256 token1NewBalance = (IERC20(token1).balanceOf(address(this))) - token1Balance;
		
		IERC20(token0).approve(address(pulseXRouter), token0NewBalance);
		IERC20(token1).approve(address(pulseXRouter), token1NewBalance);
		
		(, , uint256 liquidity) = pulseXRouter.addLiquidity(address(token0), address(token1), token0NewBalance, token1NewBalance, 0, 0, address(msg.sender), block.timestamp);
	    
		LPStaking.stake(address(pair), liquidity, address(msg.sender));
    }
	
	function removeLiquidity(address pair, uint256 liquidity) external {
	    require(isliquidityPair[pair], "Liquidity pair is not correct");
		
		if(isExcludedFromFee[address(msg.sender)])
		{
		   address token0 = address(PulseXPair(pair).token0());
		   address token1 = address(PulseXPair(pair).token1());
		   
		   IERC20(pair).transferFrom(address(msg.sender), address(this), liquidity);
		   IERC20(pair).approve(address(pulseXRouter), liquidity);
		   
		   pulseXRouter.removeLiquidity(
				address(token0),
				address(token1),
				liquidity,
				0,
				0,
				address(msg.sender),
				block.timestamp
		   );
		}
		else
		{
		    address token0 = address(PulseXPair(pair).token0());
			address token1 = address(PulseXPair(pair).token1());
			
			IERC20(pair).transferFrom(address(msg.sender), address(this), liquidity);
			IERC20(pair).approve(address(pulseXRouter), liquidity);
			
			isExcludedFromFee[address(msg.sender)] = true;
			
			pulseXRouter.removeLiquidity(
				address(token0),
				address(token1),
				liquidity,
				0,
				0,
				address(msg.sender),
				block.timestamp
		   );
		   
		   isExcludedFromFee[address(msg.sender)] = false;
		}
    }
	
	function removeLiquidityETH(address pair, uint256 liquidity) external {
	    require(isliquidityPair[pair], "Liquidity pair is not correct");
		
		if(isExcludedFromFee[address(msg.sender)])
		{
		    IERC20(pair).transferFrom(address(msg.sender), address(this), liquidity);
		    IERC20(pair).approve(address(pulseXRouter), liquidity);
		   
		    pulseXRouter.removeLiquidityETHSupportingFeeOnTransferTokens(
				address(this),
				liquidity,
				0,
				0,
				address(msg.sender),
				block.timestamp
		    );
		}
		else
		{
		    isExcludedFromFee[address(msg.sender)] = true;
			
		    IERC20(pair).transferFrom(address(msg.sender), address(this), liquidity);
			IERC20(pair).approve(address(pulseXRouter), liquidity);
			
			pulseXRouter.removeLiquidityETHSupportingFeeOnTransferTokens(
				address(this),
				liquidity,
				0,
				0,
				address(msg.sender),
				block.timestamp
		   );
		   
		   isExcludedFromFee[address(msg.sender)] = false;
		}
    }
	
	function updateDistributorGas(uint256 gas) external onlyOwner {
       require(gas < 750000, "Gas is greater than limit");
	   
       processGas = gas;
	   emit ProcessGasUpdated(gas);
    }
	
	function updatedSwapThreshold(uint256 amount) external onlyOwner {
  	    require(amount <= totalSupply(), "Amount cannot be over the total supply.");
		require(amount >= 1000 * (10 ** 18), "Minimum `1000` token per swap required");
		
		swapThreshold = amount;
		emit SwapThresholdUpdated(amount);
  	}
	
	function excludeFromReflection(address account) public onlyOwner() {
       require(!isExcludedFromReflection[account], "Account is already excluded");
	   
	   _excludeFromReflection(account);
	   emit AccountExcludeFromReflection(account);
    }
	
    function includeInReflection(address account) external onlyOwner() {
        require(isExcludedFromReflection[account], "Account is already included");
        for (uint256 i = 0; i < _excluded.length; i++) {
            if (_excluded[i] == account) {
                _excluded[i] = _excluded[_excluded.length - 1];
                tOwned[account] = 0;
                isExcludedFromReflection[account] = false;
                _excluded.pop();
                break;
            }
        }
		emit AccountIncludeInReflection(account);
    }
	
	function excludeFromFee(address account, bool status) external onlyOwner {
        require(account != address(0), "Wallet address is not correct");
		
		_excludeFromFee(account, status);
		emit AccountExcludeFromFee(account, status);
    }
	
	function setLPStakingAddress(IStaking newAddress) external onlyOwner {
		require(address(LPStaking) == address(0), "Staking contract already set");
		
	    LPStaking = IStaking(newAddress);
	    emit LPStakingAddressAdded(address(newAddress));
    }
}