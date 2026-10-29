
// File: @openzeppelin/contracts/token/ERC20/IERC20.sol


// OpenZeppelin Contracts (last updated v4.9.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC20 standard as defined in the EIP.
 */
interface IERC20 {
    /**
     * @dev Emitted when `value` tokens are moved from one account (`from`) to
     * another (`to`).
     *
     * Note that `value` may be zero.
     */
    event Transfer(address indexed from, address indexed to, uint256 value);

    /**
     * @dev Emitted when the allowance of a `spender` for an `owner` is set by
     * a call to {approve}. `value` is the new allowance.
     */
    event Approval(address indexed owner, address indexed spender, uint256 value);

    /**
     * @dev Returns the amount of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * IMPORTANT: Beware that changing an allowance with this method brings the risk
     * that someone may use both the old and the new allowance by unfortunate
     * transaction ordering. One possible solution to mitigate this race
     * condition is to first reduce the spender's allowance to 0 and set the
     * desired value afterwards:
     * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
     *
     * Emits an {Approval} event.
     */
    function approve(address spender, uint256 amount) external returns (bool);

    /**
     * @dev Moves `amount` tokens from `from` to `to` using the
     * allowance mechanism. `amount` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

// File: https://github.com/Uniswap/uniswap-v2-periphery/blob/master/contracts/interfaces/IUniswapV2Router01.sol

pragma solidity >=0.6.2;

interface IUniswapV2Router01 {
    function factory() external pure returns (address);
    function WETH() external pure returns (address);

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint amountADesired,
        uint amountBDesired,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB, uint liquidity);
    function addLiquidityETH(
        address token,
        uint amountTokenDesired,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external payable returns (uint amountToken, uint amountETH, uint liquidity);
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETH(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountToken, uint amountETH);
    function removeLiquidityWithPermit(
        address tokenA,
        address tokenB,
        uint liquidity,
        uint amountAMin,
        uint amountBMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountA, uint amountB);
    function removeLiquidityETHWithPermit(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountToken, uint amountETH);
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);
    function swapTokensForExactETH(uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
        external
        returns (uint[] memory amounts);
    function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        external
        payable
        returns (uint[] memory amounts);

    function quote(uint amountA, uint reserveA, uint reserveB) external pure returns (uint amountB);
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) external pure returns (uint amountOut);
    function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) external pure returns (uint amountIn);
    function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory amounts);
    function getAmountsIn(uint amountOut, address[] calldata path) external view returns (uint[] memory amounts);
}

// File: https://github.com/Uniswap/uniswap-v2-periphery/blob/master/contracts/interfaces/IUniswapV2Router02.sol

pragma solidity >=0.6.2;


interface IUniswapV2Router02 is IUniswapV2Router01 {
    function removeLiquidityETHSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline
    ) external returns (uint amountETH);
    function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens(
        address token,
        uint liquidity,
        uint amountTokenMin,
        uint amountETHMin,
        address to,
        uint deadline,
        bool approveMax, uint8 v, bytes32 r, bytes32 s
    ) external returns (uint amountETH);

    function swapExactTokensForTokensSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
    function swapExactETHForTokensSupportingFeeOnTransferTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable;
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external;
}

// File: @uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol

pragma solidity >=0.5.0;

interface IUniswapV2Pair {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external pure returns (string memory);
    function symbol() external pure returns (string memory);
    function decimals() external pure returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function PERMIT_TYPEHASH() external pure returns (bytes32);
    function nonces(address owner) external view returns (uint);

    function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external;

    event Mint(address indexed sender, uint amount0, uint amount1);
    event Burn(address indexed sender, uint amount0, uint amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint amount0In,
        uint amount1In,
        uint amount0Out,
        uint amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    function MINIMUM_LIQUIDITY() external pure returns (uint);
    function factory() external view returns (address);
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function price0CumulativeLast() external view returns (uint);
    function price1CumulativeLast() external view returns (uint);
    function kLast() external view returns (uint);

    function mint(address to) external returns (uint liquidity);
    function burn(address to) external returns (uint amount0, uint amount1);
    function swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) external;
    function skim(address to) external;
    function sync() external;

    function initialize(address, address) external;
}

// File: @uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol

pragma solidity >=0.5.0;

interface IUniswapV2Factory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function feeTo() external view returns (address);
    function feeToSetter() external view returns (address);

    function getPair(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);

    function createPair(address tokenA, address tokenB) external returns (address pair);

    function setFeeTo(address) external;
    function setFeeToSetter(address) external;
}

// File: FINAL-MAINNET/PulseDAO-main/contracts/interface/IDTX.sol


// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.8.0. SEE SOURCE BELOW. !!
pragma solidity ^0.8.20;

interface IDTX {
    error ERC20InsufficientAllowance(
        address spender,
        uint256 allowance,
        uint256 needed
    );
    error ERC20InsufficientBalance(
        address sender,
        uint256 balance,
        uint256 needed
    );
    error ERC20InvalidApprover(address approver);
    error ERC20InvalidReceiver(address receiver);
    error ERC20InvalidSender(address sender);
    error ERC20InvalidSpender(address spender);
    error OwnableInvalidOwner(address owner);
    error OwnableUnauthorizedAccount(address account);
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event Transfer(address indexed from, address indexed to, uint256 value);

    function MAX_SUPPLY() external view returns (uint256);

    function allowance(address owner, address spender)
        external
        view
        returns (uint256);

    function approve(address spender, uint256 value) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function burn(uint256 value) external;

    function burnFrom(address account, uint256 value) external;

    function burnToken(address account, uint256 amount) external returns (bool);

    function decimals() external view returns (uint8);

    function governor() external view returns (address);

    function masterchefAddress() external view returns (address);

    function mint(address to, uint256 amount) external;

    function name() external view returns (string memory);

    function owner() external view returns (address);

    function rebrandName(string memory _newName) external;

    function rebrandSymbol(string memory _newSymbol) external;

    function renounceOwnership() external;

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function transfer(address to, uint256 value) external returns (bool);

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) external returns (bool);

    function transferOwnership(address newOwner) external;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientAllowance","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientBalance","type":"error"},{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC20InvalidApprover","type":"error"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC20InvalidReceiver","type":"error"},{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC20InvalidSender","type":"error"},{"inputs":[{"internalType":"address","name":"spender","type":"address"}],"name":"ERC20InvalidSpender","type":"error"},{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[],"name":"MAX_SUPPLY","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"value","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"burnFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnToken","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"masterchefAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"_newName","type":"string"}],"name":"rebrandName","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"_newSymbol","type":"string"}],"name":"rebrandSymbol","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}]
*/

// File: FINAL-MAINNET/PulseDAO-main/contracts/interface/IGovernor.sol


// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.8.0. SEE SOURCE BELOW. !!
pragma solidity ^0.8.20;

interface IGovernor {
    event EnforceGovernor(
        address indexed _newGovernor,
        address indexed enforcer
    );
    event GiveRolloverBonus(
        address indexed recipient,
        uint256 amount,
        address indexed poolInto
    );
    event Harvest(address indexed sender, uint256 callFee);
    event SetInflation(uint256 rewardPerBlock);

    function acPool1() external view returns (address);

    function acPool1ID() external view returns (uint256);

    function acPool2() external view returns (address);

    function acPool2ID() external view returns (uint256);

    function acPool3() external view returns (address);

    function acPool3ID() external view returns (uint256);

    function acPool4() external view returns (address);

    function acPool4ID() external view returns (uint256);

    function acPool5() external view returns (address);

    function acPool5ID() external view returns (uint256);

    function acPool6() external view returns (address);

    function acPool6ID() external view returns (uint256);

    function addNewPool(address _pool) external;

    function allocationPercentages(uint256) external view returns (uint256);

    function basicContract() external view returns (address);

    function beginMintingPhase() external;

    function burnTokens(uint256 amount) external;

    function changeGovernorActivated() external view returns (bool);

    function changeGovernorForSecurityPriorMintingBegins(address _newGovernor)
        external;

    function consensusContract() external view returns (address);

    function costToVote() external view returns (uint256);

    function creditContract() external view returns (address);

    function delayBeforeEnforce() external view returns (uint256);

    function depositFee() external view returns (uint256);

    function eligibleNewGovernor() external view returns (address);

    function enforceGovernor() external;

    function eventFibonacceningActive() external view returns (bool);

    function farmContract() external view returns (address);

    function fibonacceningContract() external view returns (address);

    function fundingRate() external view returns (uint256);

    function getRollBonus(address _bonusForPool)
        external
        view
        returns (uint256);

    function governorRejected() external;

    function harvest() external;

    function hexVault() external view returns (address);

    function incVault() external view returns (address);

    function lastHarvestedTime() external view returns (uint256);

    function lastRegularReward() external view returns (uint256);

    function lastTotalCredit() external view returns (uint256);

    function masterchef() external view returns (address);

    function maxDelay() external view returns (uint256);

    function minDelay() external view returns (uint256);

    function mintingPhase() external view returns (bool);

    function mintingPhaseLaunchDate() external view returns (uint256);

    function newGovernorBlockDelay() external view returns (uint256);

    function newGovernorRequestBlock() external view returns (uint256);

    function nftAllocationContract() external view returns (address);

    function nftStakingContract() external view returns (address);

    function nftStakingPoolID() external view returns (uint256);

    function nftWallet() external view returns (address);

    function pendingHarvestRewards() external view returns (uint256);

    function plsVault() external view returns (address);

    function plsxVault() external view returns (address);

    function postGrandFibIncreaseCount() external;

    function rebalancePools() external;

    function referralBonus() external view returns (uint256);

    function rememberReward() external;

    function rewardContract() external view returns (address);

    function senateContract() external view returns (address);

    function setActivateFibonaccening(bool _arg) external;

    function setCallFee(address _acPool, uint256 _newCallFee) external;

    function setGovernorTax(uint256 _amount) external;

    function setInflation(uint256 rewardPerBlock) external;

    function setNewGovernor(address beneficiary) external;

    function setPool(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external;

    function setThresholdFibonaccening(uint256 newThreshold) external;

    function stakeRolloverBonus(
        address _toAddress,
        address _depositToPool,
        uint256 _bonusToPay,
        uint256 _stakeID
    ) external;

    function thresholdFibonaccening() external view returns (uint256);

    function token() external view returns (address);

    function tokenDistributionContract() external view returns (address);

    function tokenDistributionContractExtraPenalty()
        external
        view
        returns (address);

    function totalFibonacciEventsAfterGrand() external view returns (uint256);

    function transferCollectedFees(address _tokenContract) external;

    function transferRewardBoostThreshold() external;

    function transferToReferralContract() external;

    function transferToTreasury(uint256 amount) external;

    function treasuryRequest(
        address _tokenAddr,
        address _recipient,
        uint256 _amountToSend
    ) external;

    function treasuryWallet() external view returns (address);

    function tshareVault() external view returns (address);

    function updateCostToVote(uint256 newCostToVote) external;

    function updateDelayBeforeEnforce(uint256 newDelay) external;

    function updateRolloverBonus(address _forPool, uint256 _bonus) external;

    function updateVault(uint256 _type, uint256 _amount) external;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_newGovernor","type":"address"},{"indexed":true,"internalType":"address","name":"enforcer","type":"address"}],"name":"EnforceGovernor","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"address","name":"poolInto","type":"address"}],"name":"GiveRolloverBonus","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"callFee","type":"uint256"}],"name":"Harvest","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"rewardPerBlock","type":"uint256"}],"name":"SetInflation","type":"event"},{"inputs":[],"name":"acPool1","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool1ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool2","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool2ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool3","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool3ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool4","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool4ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool5","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool5ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool6","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"acPool6ID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_pool","type":"address"}],"name":"addNewPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"allocationPercentages","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"basicContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"beginMintingPhase","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burnTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"changeGovernorActivated","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_newGovernor","type":"address"}],"name":"changeGovernorForSecurityPriorMintingBegins","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"consensusContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"costToVote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"creditContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"delayBeforeEnforce","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"depositFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"eligibleNewGovernor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"enforceGovernor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"eventFibonacceningActive","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"farmContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"fibonacceningContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"fundingRate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_bonusForPool","type":"address"}],"name":"getRollBonus","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governorRejected","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"harvest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"hexVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"incVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastHarvestedTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastRegularReward","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"lastTotalCredit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"masterchef","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"maxDelay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minDelay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"mintingPhase","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"mintingPhaseLaunchDate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"newGovernorBlockDelay","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"newGovernorRequestBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nftAllocationContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nftStakingContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nftStakingPoolID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"nftWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pendingHarvestRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"plsVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"plsxVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"postGrandFibIncreaseCount","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"rebalancePools","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"referralBonus","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"rememberReward","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"rewardContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"senateContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_arg","type":"bool"}],"name":"setActivateFibonaccening","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_acPool","type":"address"},{"internalType":"uint256","name":"_newCallFee","type":"uint256"}],"name":"setCallFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"setGovernorTax","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"rewardPerBlock","type":"uint256"}],"name":"setInflation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"beneficiary","type":"address"}],"name":"setNewGovernor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_allocPoint","type":"uint256"},{"internalType":"bool","name":"_withUpdate","type":"bool"}],"name":"setPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newThreshold","type":"uint256"}],"name":"setThresholdFibonaccening","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_toAddress","type":"address"},{"internalType":"address","name":"_depositToPool","type":"address"},{"internalType":"uint256","name":"_bonusToPay","type":"uint256"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"stakeRolloverBonus","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"thresholdFibonaccening","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tokenDistributionContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tokenDistributionContractExtraPenalty","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalFibonacciEventsAfterGrand","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenContract","type":"address"}],"name":"transferCollectedFees","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"transferRewardBoostThreshold","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"transferToReferralContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferToTreasury","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddr","type":"address"},{"internalType":"address","name":"_recipient","type":"address"},{"internalType":"uint256","name":"_amountToSend","type":"uint256"}],"name":"treasuryRequest","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"treasuryWallet","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"tshareVault","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"newCostToVote","type":"uint256"}],"name":"updateCostToVote","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"newDelay","type":"uint256"}],"name":"updateDelayBeforeEnforce","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_forPool","type":"address"},{"internalType":"uint256","name":"_bonus","type":"uint256"}],"name":"updateRolloverBonus","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_type","type":"uint256"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"updateVault","outputs":[],"stateMutability":"nonpayable","type":"function"}]
*/

// File: FINAL-MAINNET/PulseDAO-main/contracts/interface/IVoting.sol


// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.8.0. SEE SOURCE BELOW. !!
pragma solidity ^0.8.20;

interface IVoting {
    event AddCredit(address indexed depositor, uint256 amount);
    event BurnCredit(
        address indexed burnFrom,
        uint256 amount,
        uint256 indexed forId
    );
    event DeductCredit(address indexed from, uint256 amount);
    event SetCreditingContract(address indexed _contract, bool setting);
    event SetDeductingContract(address indexed _contract, bool setting);

    function addCredit(uint256 amount, address _beneficiary) external;

    function airdropContract() external view returns (address);

    function airdropContractLocked() external view returns (address);

    function airdropVotingCredit(uint256 amount, address beneficiary) external;

    function burnCredit(uint256 amount, uint256 _forId) external;

    function burnedForId(uint256) external view returns (uint256);

    function creditingContract(address) external view returns (bool);

    function creditingContractCount() external view returns (uint256);

    function deductCredit(address from, uint256 amount) external returns (bool);

    function deductingContract(address) external view returns (bool);

    function deductingContractCount() external view returns (uint256);

    function depositCredit(uint256 amount) external;

    function masterchef() external view returns (address);

    function modifyCreditingContract(address _contract, bool setting) external;

    function modifyDeductingContract(address _contract, bool setting) external;

    function owner() external view returns (address);

    function redeemGovernor() external;

    function syncOwner() external;

    function token() external view returns (address);

    function updateChef() external;

    function userCredit(address) external view returns (uint256);
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[{"internalType":"contract IDTX","name":"_token","type":"address"},{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"address","name":"_airdropContract","type":"address"},{"internalType":"address","name":"_airdropContractLocked","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"depositor","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"AddCredit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"burnFrom","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"forId","type":"uint256"}],"name":"BurnCredit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"DeductCredit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_contract","type":"address"},{"indexed":false,"internalType":"bool","name":"setting","type":"bool"}],"name":"SetCreditingContract","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_contract","type":"address"},{"indexed":false,"internalType":"bool","name":"setting","type":"bool"}],"name":"SetDeductingContract","type":"event"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"_beneficiary","type":"address"}],"name":"addCredit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"airdropContract","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"airdropContractLocked","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"beneficiary","type":"address"}],"name":"airdropVotingCredit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"uint256","name":"_forId","type":"uint256"}],"name":"burnCredit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"burnedForId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"creditingContract","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"creditingContractCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"deductCredit","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deductingContract","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"deductingContractCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"depositCredit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"masterchef","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"},{"internalType":"bool","name":"setting","type":"bool"}],"name":"modifyCreditingContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_contract","type":"address"},{"internalType":"bool","name":"setting","type":"bool"}],"name":"modifyDeductingContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"redeemGovernor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"syncOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IDTX","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"updateChef","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userCredit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/

// File: FINAL-MAINNET/PulseDAO-main/contracts/helper/buy.sol


pragma solidity 0.8.20;








contract AccumulateDTX {
    uint256 public constant MAX_SWAP = 100000000 * 1e18;
    uint256 public constant MAX_DAILY_PERCENT = 5; // 5% daily limit
    address public constant UNISWAP_ROUTER_ADDRESS = 0x165C3410fC91EF562C50559f7d2289fEbed552d9;
    address public immutable DTX = 0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38;
    address public immutable wPLS = 0xA1077a294dDE1B09bB078844df40758a5D0f9a27;
    address public immutable votingCreditContract = 0xCF14DbcfFA6E99A444539aBbc9aE273a7bb5d75A;
    
    uint256 public timesBuyHalted = 0;
    uint256 public lastHaltTimestamp = 0;
    uint256 public haltProposalStartingId = 10000000; //arbitrary starting proposal ID

    bool public withdrawalStarted = false;
    uint256 public withdrawalStartedTime = 0;
    bool public canWithdraw = false;
    uint256 public withdrawalStartedCount = 0;

    IUniswapV2Router02 public uniswapRouter;
    
    // New state variables for tracking daily usage
    mapping(uint256 => uint256) public dailyPLSUsed;
    address public immutable PAIR_ADDRESS; // DTX-PLS pair address

    constructor() {
        uniswapRouter = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
        IERC20(0xA1077a294dDE1B09bB078844df40758a5D0f9a27).approve(UNISWAP_ROUTER_ADDRESS, type(uint256).max);
        IERC20(0x95B303987A60C71504D99Aa1b13B4DA07b0790ab).approve(UNISWAP_ROUTER_ADDRESS, type(uint256).max);
        IERC20(0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d).approve(UNISWAP_ROUTER_ADDRESS, type(uint256).max);
        IERC20(0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39).approve(UNISWAP_ROUTER_ADDRESS, type(uint256).max);
        
        // Get pair address from factory
        address factory = uniswapRouter.factory();
        PAIR_ADDRESS = IUniswapV2Factory(factory).getPair(DTX, wPLS);
        require(PAIR_ADDRESS != address(0), "Pair does not exist");
    }

    // Helper function to get current UTC day
    function getCurrentDay() public view returns (uint256) {
        return block.timestamp / 1 days;
    }

    // Function to get PLS balance in the pool
    function getPLSPoolBalance() public view returns (uint256) {
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(PAIR_ADDRESS).getReserves();
        // Determine which token is PLS based on token ordering in the pair
        return IUniswapV2Pair(PAIR_ADDRESS).token0() == wPLS ? reserve0 : reserve1;
    }

    // Function to get remaining daily allowance
    function getRemainingDailyAllowance() public view returns (uint256) {
        uint256 poolBalance = getPLSPoolBalance();
        uint256 maxDaily = (poolBalance * MAX_DAILY_PERCENT) / 100;
        uint256 used = dailyPLSUsed[getCurrentDay()];
        return used >= maxDaily ? 0 : maxDaily - used;
    }

    function buyWithPLS() public {
        require(msg.sender == tx.origin);
        
        uint256 currentDay = getCurrentDay();
        uint256 _swapAmount = address(this).balance;

        // Check daily limit
        uint256 poolBalance = getPLSPoolBalance();
        uint256 maxDaily = (poolBalance * MAX_DAILY_PERCENT) / 100;
        uint256 currentDayUsed = dailyPLSUsed[currentDay];
        if(currentDayUsed + _swapAmount > maxDaily) { 
            _swapAmount = maxDaily - currentDayUsed; 
            if(_swapAmount > MAX_SWAP) {
                _swapAmount = MAX_SWAP;
            }
        }

        require(lastHaltTimestamp + 86400 < block.timestamp, "Buying is halted");

        uint deadline = block.timestamp + 15;
        uint[] memory _minOutT = getEstimatedDTXforETH();
        uint _minOut = _minOutT[_minOutT.length-1] * 99 / 100;
        
        // Update daily usage before swap
        dailyPLSUsed[currentDay] = currentDayUsed + _swapAmount;
        
        uniswapRouter.swapETHForExactTokens{ value: _swapAmount }(_minOut, getPLSpath(), address(this), deadline);
        IERC20(DTX).transfer(treasury(), IERC20(DTX).balanceOf(address(this)));
    }

    // Rest of the contract remains the same...
    function swapTokenForPLS(address _token, uint256 _amount) external {
        require(msg.sender == tx.origin);
        uint deadline = block.timestamp + 15; 
        uint256 _swapAmount = IERC20(_token).balanceOf(address(this));
        uint[] memory _minOutT = getEstimatedPLSforToken(_token);
        uint _minOut = _minOutT[_minOutT.length-1] * 99 / 100;
        uniswapRouter.swapTokensForExactETH(_minOut, _swapAmount, getTokenPath(_token), address(this), deadline);
    }

    function withdraw() external {
        require(msg.sender == governor(), "only thru decentralized Governance");
        payable(treasury()).transfer(address(this).balance);
    }
    
    function withdrawERC(address _a) external {
        require(msg.sender == governor(), "only thru decentralized Governance");
        require(IERC20(_a).transfer(treasury(), IERC20(_a).balanceOf(address(this))));
    }
    
    function enableToken(address _token) external {
        IERC20(_token).approve(UNISWAP_ROUTER_ADDRESS, type(uint256).max);
    }

    function getEstimatedDTXforETH() public view returns (uint[] memory) {
        uint256 _swapAmount = address(this).balance;
        if(_swapAmount > MAX_SWAP) { _swapAmount = MAX_SWAP; }
        return uniswapRouter.getAmountsOut(_swapAmount, getPLSpath());
    }
    
    function getEstimatedPLSforToken(address _token) public view returns (uint[] memory) {
        return uniswapRouter.getAmountsOut(IERC20(_token).balanceOf(address(this)), getTokenPath(_token)); 
    }
    
    function getPLSpath() private view returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = wPLS;
        path[1] = DTX;
        return path;
    }
    
    function getTokenPath(address _token) private view returns (address[] memory) {
        address[] memory path = new address[](2);
        path[0] = _token;
        path[1] = wPLS;
        return path;
    }

    function governor() public view returns (address) {
        return IDTX(DTX).governor();
    }

    function treasury() public view returns (address) {
        return IGovernor(governor()).treasuryWallet();
    }

    //
    function haltBuy() external {
        if(IVoting(votingCreditContract).burnedForId(haltProposalStartingId + timesBuyHalted) > 3000000 * 1e18) {
            lastHaltTimestamp = block.timestamp;
            timesBuyHalted++;
        }
    }

    function emergencyWithdraw() external {
        require(!canWithdraw, "withdrawal already enabled");
        if(!withdrawalStarted) {
            require(IVoting(votingCreditContract).burnedForId(haltProposalStartingId + 1000 + withdrawalStartedCount) > 5000000 * 1e18, "insufficient burned voting credit");   
            withdrawalStarted = true;
            withdrawalStartedTime = block.timestamp;
        } else {
            require(block.timestamp > withdrawalStartedTime + 20 hours, "must wait 20hours");// after 20 hours
                if(IVoting(votingCreditContract).burnedForId(haltProposalStartingId + 1000 + withdrawalStartedCount) >
                                    IVoting(votingCreditContract).burnedForId(haltProposalStartingId + 1000 + withdrawalStartedCount + 1)) {
                    canWithdraw = true;
                } else {
                    withdrawalStarted = false;
                    withdrawalStartedCount = withdrawalStartedCount + 2;
                }
            }
        }
    

    function withdrawToken(address _token) external {
        require(canWithdraw, "Withdrawal not allowed");
        require(IERC20(_token).transfer(treasury(), IERC20(_token).balanceOf(address(this))));
    }

    function withdrawPLS() external {
        require(canWithdraw, "Withdrawal not allowed");
        payable(treasury()).transfer(address(this).balance);
    }

    receive() external payable {}
    fallback() external payable {}
}
