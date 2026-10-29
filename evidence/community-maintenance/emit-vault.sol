
// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/IERC20.sol


// OpenZeppelin Contracts (last updated v5.1.0) (token/ERC20/IERC20.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-20 standard as defined in the ERC.
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
     * @dev Returns the value of tokens in existence.
     */
    function totalSupply() external view returns (uint256);

    /**
     * @dev Returns the value of tokens owned by `account`.
     */
    function balanceOf(address account) external view returns (uint256);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transfer(address to, uint256 value) external returns (bool);

    /**
     * @dev Returns the remaining number of tokens that `spender` will be
     * allowed to spend on behalf of `owner` through {transferFrom}. This is
     * zero by default.
     *
     * This value changes when {approve} or {transferFrom} are called.
     */
    function allowance(address owner, address spender) external view returns (uint256);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens.
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
    function approve(address spender, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the
     * allowance mechanism. `value` is then deducted from the caller's
     * allowance.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/interfaces/IERC20.sol


// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC20.sol)

pragma solidity ^0.8.20;


// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/introspection/IERC165.sol


// OpenZeppelin Contracts (last updated v5.1.0) (utils/introspection/IERC165.sol)

pragma solidity ^0.8.20;

/**
 * @dev Interface of the ERC-165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[ERC].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[ERC section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/interfaces/IERC165.sol


// OpenZeppelin Contracts (last updated v5.0.0) (interfaces/IERC165.sol)

pragma solidity ^0.8.20;


// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/interfaces/IERC1363.sol


// OpenZeppelin Contracts (last updated v5.1.0) (interfaces/IERC1363.sol)

pragma solidity ^0.8.20;



/**
 * @title IERC1363
 * @dev Interface of the ERC-1363 standard as defined in the https://eips.ethereum.org/EIPS/eip-1363[ERC-1363].
 *
 * Defines an extension interface for ERC-20 tokens that supports executing code on a recipient contract
 * after `transfer` or `transferFrom`, or code on a spender contract after `approve`, in a single transaction.
 */
interface IERC1363 is IERC20, IERC165 {
    /*
     * Note: the ERC-165 identifier for this interface is 0xb0202a11.
     * 0xb0202a11 ===
     *   bytes4(keccak256('transferAndCall(address,uint256)')) ^
     *   bytes4(keccak256('transferAndCall(address,uint256,bytes)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256)')) ^
     *   bytes4(keccak256('transferFromAndCall(address,address,uint256,bytes)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256)')) ^
     *   bytes4(keccak256('approveAndCall(address,uint256,bytes)'))
     */

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from the caller's account to `to`
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferAndCall(address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value) external returns (bool);

    /**
     * @dev Moves a `value` amount of tokens from `from` to `to` using the allowance mechanism
     * and then calls {IERC1363Receiver-onTransferReceived} on `to`.
     * @param from The address which you want to send tokens from.
     * @param to The address which you want to transfer to.
     * @param value The amount of tokens to be transferred.
     * @param data Additional data with no specified format, sent in call to `to`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function transferFromAndCall(address from, address to, uint256 value, bytes calldata data) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value) external returns (bool);

    /**
     * @dev Sets a `value` amount of tokens as the allowance of `spender` over the
     * caller's tokens and then calls {IERC1363Spender-onApprovalReceived} on `spender`.
     * @param spender The address which will spend the funds.
     * @param value The amount of tokens to be spent.
     * @param data Additional data with no specified format, sent in call to `spender`.
     * @return A boolean value indicating whether the operation succeeded unless throwing.
     */
    function approveAndCall(address spender, uint256 value, bytes calldata data) external returns (bool);
}

// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC20/utils/SafeERC20.sol


// OpenZeppelin Contracts (last updated v5.3.0) (token/ERC20/utils/SafeERC20.sol)

pragma solidity ^0.8.20;



/**
 * @title SafeERC20
 * @dev Wrappers around ERC-20 operations that throw on failure (when the token
 * contract returns false). Tokens that return no value (and instead revert or
 * throw on failure) are also supported, non-reverting calls are assumed to be
 * successful.
 * To use this library you can add a `using SafeERC20 for IERC20;` statement to your contract,
 * which allows you to call the safe operations as `token.safeTransfer(...)`, etc.
 */
library SafeERC20 {
    /**
     * @dev An operation with an ERC-20 token failed.
     */
    error SafeERC20FailedOperation(address token);

    /**
     * @dev Indicates a failed `decreaseAllowance` request.
     */
    error SafeERC20FailedDecreaseAllowance(address spender, uint256 currentAllowance, uint256 requestedDecrease);

    /**
     * @dev Transfer `value` amount of `token` from the calling contract to `to`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Transfer `value` amount of `token` from `from` to `to`, spending the approval given by `from` to the
     * calling contract. If `token` returns no value, non-reverting calls are assumed to be successful.
     */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Variant of {safeTransfer} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransfer(IERC20 token, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transfer, (to, value)));
    }

    /**
     * @dev Variant of {safeTransferFrom} that returns a bool instead of reverting if the operation is not successful.
     */
    function trySafeTransferFrom(IERC20 token, address from, address to, uint256 value) internal returns (bool) {
        return _callOptionalReturnBool(token, abi.encodeCall(token.transferFrom, (from, to, value)));
    }

    /**
     * @dev Increase the calling contract's allowance toward `spender` by `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeIncreaseAllowance(IERC20 token, address spender, uint256 value) internal {
        uint256 oldAllowance = token.allowance(address(this), spender);
        forceApprove(token, spender, oldAllowance + value);
    }

    /**
     * @dev Decrease the calling contract's allowance toward `spender` by `requestedDecrease`. If `token` returns no
     * value, non-reverting calls are assumed to be successful.
     *
     * IMPORTANT: If the token implements ERC-7674 (ERC-20 with temporary allowance), and if the "client"
     * smart contract uses ERC-7674 to set temporary allowances, then the "client" smart contract should avoid using
     * this function. Performing a {safeIncreaseAllowance} or {safeDecreaseAllowance} operation on a token contract
     * that has a non-zero temporary allowance (for that particular owner-spender) will result in unexpected behavior.
     */
    function safeDecreaseAllowance(IERC20 token, address spender, uint256 requestedDecrease) internal {
        unchecked {
            uint256 currentAllowance = token.allowance(address(this), spender);
            if (currentAllowance < requestedDecrease) {
                revert SafeERC20FailedDecreaseAllowance(spender, currentAllowance, requestedDecrease);
            }
            forceApprove(token, spender, currentAllowance - requestedDecrease);
        }
    }

    /**
     * @dev Set the calling contract's allowance toward `spender` to `value`. If `token` returns no value,
     * non-reverting calls are assumed to be successful. Meant to be used with tokens that require the approval
     * to be set to zero before setting it to a non-zero value, such as USDT.
     *
     * NOTE: If the token implements ERC-7674, this function will not modify any temporary allowance. This function
     * only sets the "standard" allowance. Any temporary allowance will remain active, in addition to the value being
     * set here.
     */
    function forceApprove(IERC20 token, address spender, uint256 value) internal {
        bytes memory approvalCall = abi.encodeCall(token.approve, (spender, value));

        if (!_callOptionalReturnBool(token, approvalCall)) {
            _callOptionalReturn(token, abi.encodeCall(token.approve, (spender, 0)));
            _callOptionalReturn(token, approvalCall);
        }
    }

    /**
     * @dev Performs an {ERC1363} transferAndCall, with a fallback to the simple {ERC20} transfer if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            safeTransfer(token, to, value);
        } else if (!token.transferAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} transferFromAndCall, with a fallback to the simple {ERC20} transferFrom if the target
     * has no code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * Reverts if the returned value is other than `true`.
     */
    function transferFromAndCallRelaxed(
        IERC1363 token,
        address from,
        address to,
        uint256 value,
        bytes memory data
    ) internal {
        if (to.code.length == 0) {
            safeTransferFrom(token, from, to, value);
        } else if (!token.transferFromAndCall(from, to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Performs an {ERC1363} approveAndCall, with a fallback to the simple {ERC20} approve if the target has no
     * code. This can be used to implement an {ERC721}-like safe transfer that rely on {ERC1363} checks when
     * targeting contracts.
     *
     * NOTE: When the recipient address (`to`) has no code (i.e. is an EOA), this function behaves as {forceApprove}.
     * Opposedly, when the recipient address (`to`) has code, this function only attempts to call {ERC1363-approveAndCall}
     * once without retrying, and relies on the returned value to be true.
     *
     * Reverts if the returned value is other than `true`.
     */
    function approveAndCallRelaxed(IERC1363 token, address to, uint256 value, bytes memory data) internal {
        if (to.code.length == 0) {
            forceApprove(token, to, value);
        } else if (!token.approveAndCall(to, value, data)) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturnBool} that reverts if call fails to meet the requirements.
     */
    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            let success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            // bubble errors
            if iszero(success) {
                let ptr := mload(0x40)
                returndatacopy(ptr, 0, returndatasize())
                revert(ptr, returndatasize())
            }
            returnSize := returndatasize()
            returnValue := mload(0)
        }

        if (returnSize == 0 ? address(token).code.length == 0 : returnValue != 1) {
            revert SafeERC20FailedOperation(address(token));
        }
    }

    /**
     * @dev Imitates a Solidity high-level call (i.e. a regular function call to a contract), relaxing the requirement
     * on the return value: the return value is optional (but if data is returned, it must not be false).
     * @param token The token targeted by the call.
     * @param data The call data (encoded using abi.encode or one of its variants).
     *
     * This is a variant of {_callOptionalReturn} that silently catches all reverts and returns a bool instead.
     */
    function _callOptionalReturnBool(IERC20 token, bytes memory data) private returns (bool) {
        bool success;
        uint256 returnSize;
        uint256 returnValue;
        assembly ("memory-safe") {
            success := call(gas(), token, 0, add(data, 0x20), mload(data), 0, 0x20)
            returnSize := returndatasize()
            returnValue := mload(0)
        }
        return success && (returnSize == 0 ? address(token).code.length > 0 : returnValue == 1);
    }
}

// File: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.4.0/contracts/security/ReentrancyGuard.sol


// OpenZeppelin Contracts v4.4.0 (security/ReentrancyGuard.sol)

pragma solidity ^0.8.0;

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
abstract contract ReentrancyGuard {
    // Booleans are more expensive than uint256 or any type that takes up a full
    // word because each write operation emits an extra SLOAD to first read the
    // slot's contents, replace the bits taken up by the boolean, and then write
    // back. This is the compiler's defense against contract upgrades and
    // pointer aliasing, and it cannot be disabled.

    // The values being non-zero value makes deployment a bit more expensive,
    // but in exchange the refund on every call to nonReentrant will be lower in
    // amount. Since refunds are capped to a percentage of the total
    // transaction's gas, it is best to keep them low in cases like this one, to
    // increase the likelihood of the full refund coming into effect.
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and making it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _status = _ENTERED;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _status = _NOT_ENTERED;
    }
}

// File: contracts/PiggyBank-main/contracts/interface/IGovernor.sol


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

// File: contracts/PiggyBank-main/contracts/interface/IMasterChef.sol


// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.8.0. SEE SOURCE BELOW. !!
pragma solidity ^0.8.20;

interface IMasterChef {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event TransferCredit(address from, address to, uint256 amount);
    event TrustedContract(address contractAddress, bool setting);
    event UpdateEmissions(address indexed user, uint256 newEmissions);

    function DTXPerBlock() external view returns (uint256);

    function add(
        uint256 _allocPoint,
        address _participant,
        bool _withUpdate
    ) external;

    function burn(address _from, uint256 _amount) external returns (bool);

    function credit(address) external view returns (uint256);

    function dev(address _devaddr) external;

    function devaddr() external view returns (address);

    function dtx() external view returns (address);

    function existingParticipant(address) external view returns (bool);

    function fairMintSenate() external;

    function fairTokensPublishedToSenate() external view returns (uint256);

    function feeAddress() external view returns (address);

    function governorFee() external view returns (uint256);

    function massAdd(
        uint256[] memory _allocPoint,
        address[] memory _participant,
        bool[] memory _withUpdate
    ) external;

    function massUpdatePools() external;

    function owner() external view returns (address);

    function pendingDtx(uint256 _pid) external view returns (uint256);

    function poolInfo(uint256)
        external
        view
        returns (
            uint256 allocPoint,
            uint256 lastRewardBlock,
            address participant
        );

    function poolLength() external view returns (uint256);

    function publishTokens(address _to, uint256 _amount) external;

    function renounceOwnership() external;

    function renounceRewards() external;

    function rewardSenators(bool _e) external;

    function senatorRewards() external view returns (bool);

    function set(
        uint256 _pid,
        uint256 _allocPoint,
        bool _withUpdate
    ) external;

    function setFeeAddress(address _feeAddress) external;

    function setGovernorFee(uint256 _amount) external;

    function setTrustedContract(address _contractAddress, bool _setting)
        external;

    function startBlock() external view returns (uint256);

    function startPublishing(
        uint256 _pid,
        address _participant,
        uint256 _alloc
    ) external;

    function stopPublishing(uint256 _pid) external;

    function tokenChangeOwnership(address _newOwner) external;

    function totalAllocPoint() external view returns (uint256);

    function totalCreditRewards() external view returns (uint256);

    function totalCreditRewardsAtLastFairMint() external view returns (uint256);

    function totalPrincipalBurned() external view returns (uint256);

    function totalPublished() external view returns (uint256);

    function transferCredit(address _to, uint256 _amount) external;

    function transferOwnership(address newOwner) external;

    function trustedContract(address) external view returns (bool);

    function trustedContractCount() external view returns (uint256);

    function updateEmissionRate(uint256 _DTXPerBlock) external;

    function updatePool(uint256 _pid) external;

    function updateStartBlock(uint256 _startBlock) external;

    function virtualTotalSupply() external view returns (uint256);
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[{"internalType":"contract IDTX","name":"_DTX","type":"address"},{"internalType":"address","name":"_airdropFull","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"from","type":"address"},{"indexed":false,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"TransferCredit","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"bool","name":"setting","type":"bool"}],"name":"TrustedContract","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"newEmissions","type":"uint256"}],"name":"UpdateEmissions","type":"event"},{"inputs":[],"name":"DTXPerBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_allocPoint","type":"uint256"},{"internalType":"address","name":"_participant","type":"address"},{"internalType":"bool","name":"_withUpdate","type":"bool"}],"name":"add","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"burn","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"credit","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_devaddr","type":"address"}],"name":"dev","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"devaddr","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"dtx","outputs":[{"internalType":"contract IDTX","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"existingParticipant","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"fairMintSenate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"fairTokensPublishedToSenate","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"feeAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"governorFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"_allocPoint","type":"uint256[]"},{"internalType":"address[]","name":"_participant","type":"address[]"},{"internalType":"bool[]","name":"_withUpdate","type":"bool[]"}],"name":"massAdd","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"massUpdatePools","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"}],"name":"pendingDtx","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"poolInfo","outputs":[{"internalType":"uint256","name":"allocPoint","type":"uint256"},{"internalType":"uint256","name":"lastRewardBlock","type":"uint256"},{"internalType":"address","name":"participant","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolLength","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"publishTokens","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renounceRewards","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_e","type":"bool"}],"name":"rewardSenators","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"senatorRewards","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"uint256","name":"_allocPoint","type":"uint256"},{"internalType":"bool","name":"_withUpdate","type":"bool"}],"name":"set","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_feeAddress","type":"address"}],"name":"setFeeAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"setGovernorFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_contractAddress","type":"address"},{"internalType":"bool","name":"_setting","type":"bool"}],"name":"setTrustedContract","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"startBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"},{"internalType":"address","name":"_participant","type":"address"},{"internalType":"uint256","name":"_alloc","type":"uint256"}],"name":"startPublishing","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"}],"name":"stopPublishing","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newOwner","type":"address"}],"name":"tokenChangeOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"totalAllocPoint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalCreditRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalCreditRewardsAtLastFairMint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalPrincipalBurned","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalPublished","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_to","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"transferCredit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"trustedContract","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"trustedContractCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_DTXPerBlock","type":"uint256"}],"name":"updateEmissionRate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_pid","type":"uint256"}],"name":"updatePool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_startBlock","type":"uint256"}],"name":"updateStartBlock","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"virtualTotalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}]
*/

// File: contracts/PiggyBank-main/contracts/interface/IacPool.sol


// !! THIS FILE WAS AUTOGENERATED BY abi-to-sol v0.8.0. SEE SOURCE BELOW. !!
pragma solidity >=0.7.0 <0.9.0;

interface IacPool {
    event AddAndExtendStake(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 stakeID,
        uint256 shares,
        uint256 lastDepositedTime
    );
    event AddVotes(address indexed voter, uint256 proposalID, uint256 change);
    event Deposit(
        address indexed sender,
        uint256 amount,
        uint256 shares,
        uint256 lastDepositedTime
    );
    event GiftDeposit(
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 shares,
        uint256 lastDepositedTime
    );
    event HopDeposit(
        address indexed recipient,
        uint256 amount,
        uint256 shares,
        uint256 previousLastDepositedTime,
        uint256 mandatoryTime
    );
    event HopPool(
        address indexed sender,
        uint256 DTXamount,
        uint256 shares,
        address indexed newPool
    );
    event MigrateStake(
        address indexed goodSamaritan,
        uint256 DTXamount,
        uint256 shares,
        address indexed recipient
    );
    event RemoveVotes(
        address indexed voter,
        uint256 proposalID,
        uint256 change
    );
    event SetDelegate(address userDelegating, address delegatee);
    event StakeAllowanceRevoke(
        address owner,
        address spender,
        uint256 allowanceID
    );
    event StakeApproval(
        address owner,
        address spender,
        uint256 allowanceID,
        uint256 shareAllowance,
        uint256 lastDeposit,
        uint256 mandatoryTime
    );
    event TransferStake(
        address indexed sender,
        address indexed recipient,
        uint256 shares,
        uint256 stakeID
    );
    event TransferStakeFrom(
        address _from,
        address _to,
        uint256 _stakeID,
        uint256 _allowanceID
    );
    event TrustedPool(address contractAddress, bool setting);
    event TrustedSender(address contractAddress, bool setting);
    event Withdraw(
        address indexed sender,
        uint256 amount,
        uint256 penalty,
        uint256 shares
    );

    function addAndExtendStake(
        address _recipientAddr,
        uint256 _amount,
        uint256 _stakeID,
        uint256 _lockUpTokensInSeconds
    ) external;

    function admin() external view returns (address);

    function allowOrigin() external view returns (bool);

    function allowStakeTransfer() external view returns (bool);

    function allowStakeTransferFrom() external view returns (bool);

    function allowTxOrigin(bool _setting) external;

    function balanceOf() external view returns (uint256);

    function calculateHarvestDTXRewards() external view returns (uint256);

    function calculateTotalPendingDTXRewards() external view returns (uint256);

    function callFee() external view returns (uint256);

    function delegateeVote(address[] memory votingAddress, uint256 proposalID)
        external;

    function deposit(uint256 _amount) external;

    function enableDisableStakeTransfer(bool _setting) external;

    function enableDisableStakeTransferFrom(bool _setting) external;

    function getNrOfStakes(address _user) external view returns (uint256);

    function getPricePerFullShare() external view returns (uint256);

    function getUserShares(address _wallet, uint256 _stakeID)
        external
        view
        returns (uint256);

    function getUserTotalShares(address _user) external view returns (uint256);

    function giftDeposit(
        uint256 _amount,
        address _toAddress,
        uint256 _minToServeInSecs
    ) external;

    function giveStakeAllowance(address spender, uint256 _stakeID) external;

    function gracePeriod() external view returns (uint256);

    function hopDeposit(
        uint256 _amount,
        address _recipientAddress,
        uint256 previousLastDepositedTime,
        uint256 _mandatoryTime
    ) external;

    function hopStakeToAnotherPool(
        uint256 _shares,
        uint256 _stakeID,
        address _poolAddress
    ) external;

    function masterchef() external view returns (address);

    function migrateAllStakes(address _staker) external;

    function migrateStake(address _staker, uint256 _stakeID) external;

    function migrationPool() external view returns (address);

    function minimumGift() external view returns (uint256);

    function modifyPartialTransfers(bool _decision) external;

    function modifyPartialWithdrawals(bool _decision) external;

    function nrOfstakeAllowances(address owner, address spender)
        external
        view
        returns (uint256);

    function partialTransfers() external view returns (bool);

    function partialWithdrawals() external view returns (bool);

    function poolID() external view returns (uint256);

    function revokeStakeAllowance(address spender, uint256 allowanceID)
        external;

    function setAdmin() external;

    function setCallFee(uint256 _callFee) external;

    function setDelegate(address _delegate, bool asProxy) external;

    function setMasterChefAddress(address _masterchef, uint256 _newPoolID)
        external;

    function setMigrationPool(address _newPool) external;

    function setMinimumGiftDeposit(uint256 _amount, bool _setting) external;

    function setTrustedPool(address[] memory _pool, bool _setting) external;

    function setTrustedSender(address[] memory _sender, bool _setting) external;

    function stakeAllowances(
        address owner,
        address spender,
        uint256 allowanceID
    )
        external
        view
        returns (
            uint256,
            uint256,
            uint256
        );

    function stakeRollover(address _poolInto, uint256 _stakeID) external;

    function token() external view returns (address);

    function totalShares() external view returns (uint256);

    function totalVotesForID(uint256) external view returns (uint256);

    function transferStakeFrom(
        address _from,
        uint256 _stakeID,
        uint256 allowanceID,
        address _to
    ) external returns (bool);

    function transferStakeToAnotherWallet(
        uint256 _shares,
        uint256 _stakeID,
        address _recipientAddress
    ) external;

    function treasury() external view returns (address);

    function trustedPool(address) external view returns (bool);

    function trustedPoolCount() external view returns (uint256);

    function trustedSender(address) external view returns (bool);

    function trustedSenderCount() external view returns (uint256);

    function updateMinGiftGovernor() external view returns (bool);

    function updateMinimumGift() external;

    function userDelegate(address) external view returns (address);

    function userInfo(address, uint256)
        external
        view
        returns (
            uint256 shares,
            uint256 lastDepositedTime,
            uint256 dtxAtLastUserAction,
            uint256 lastUserActionTime,
            uint256 mandatoryTimeToServe
        );

    function userVote(address) external view returns (uint256);

    function voteForProposal(uint256 proposalID, bool asProxy) external;

    function votingCredit(uint256 _shares, uint256 _stakeID) external;

    function votingCreditAddress() external view returns (address);

    function withdraw(uint256 _shares, uint256 _stakeID) external;

    function withdrawAll(uint256 _stakeID) external;

    function withdrawFeePeriod() external view returns (uint256);

    function withdrawStuckTokens(address _tokenAddress) external;
}

// THIS FILE WAS AUTOGENERATED FROM THE FOLLOWING ABI JSON:
/*
[{"inputs":[{"internalType":"contract IDTX","name":"_token","type":"address"},{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakeID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lastDepositedTime","type":"uint256"}],"name":"AddAndExtendStake","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"proposalID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"change","type":"uint256"}],"name":"AddVotes","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lastDepositedTime","type":"uint256"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lastDepositedTime","type":"uint256"}],"name":"GiftDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"previousLastDepositedTime","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mandatoryTime","type":"uint256"}],"name":"HopDeposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"DTXamount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":true,"internalType":"address","name":"newPool","type":"address"}],"name":"HopPool","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"goodSamaritan","type":"address"},{"indexed":false,"internalType":"uint256","name":"DTXamount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"}],"name":"MigrateStake","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"proposalID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"change","type":"uint256"}],"name":"RemoveVotes","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"userDelegating","type":"address"},{"indexed":false,"internalType":"address","name":"delegatee","type":"address"}],"name":"SetDelegate","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"allowanceID","type":"uint256"}],"name":"StakeAllowanceRevoke","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"allowanceID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shareAllowance","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lastDeposit","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"mandatoryTime","type":"uint256"}],"name":"StakeApproval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":true,"internalType":"address","name":"recipient","type":"address"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"stakeID","type":"uint256"}],"name":"TransferStake","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"_from","type":"address"},{"indexed":false,"internalType":"address","name":"_to","type":"address"},{"indexed":false,"internalType":"uint256","name":"_stakeID","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"_allowanceID","type":"uint256"}],"name":"TransferStakeFrom","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"bool","name":"setting","type":"bool"}],"name":"TrustedPool","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"contractAddress","type":"address"},{"indexed":false,"internalType":"bool","name":"setting","type":"bool"}],"name":"TrustedSender","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"penalty","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"shares","type":"uint256"}],"name":"Withdraw","type":"event"},{"inputs":[{"internalType":"address","name":"_recipientAddr","type":"address"},{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"uint256","name":"_stakeID","type":"uint256"},{"internalType":"uint256","name":"_lockUpTokensInSeconds","type":"uint256"}],"name":"addAndExtendStake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"admin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowOrigin","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowStakeTransfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"allowStakeTransferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_setting","type":"bool"}],"name":"allowTxOrigin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"calculateHarvestDTXRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"calculateTotalPendingDTXRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"callFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"votingAddress","type":"address[]"},{"internalType":"uint256","name":"proposalID","type":"uint256"}],"name":"delegateeVote","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"}],"name":"deposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_setting","type":"bool"}],"name":"enableDisableStakeTransfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_setting","type":"bool"}],"name":"enableDisableStakeTransferFrom","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getNrOfStakes","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getPricePerFullShare","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_wallet","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"getUserShares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_user","type":"address"}],"name":"getUserTotalShares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_toAddress","type":"address"},{"internalType":"uint256","name":"_minToServeInSecs","type":"uint256"}],"name":"giftDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"giveStakeAllowance","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"gracePeriod","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"address","name":"_recipientAddress","type":"address"},{"internalType":"uint256","name":"previousLastDepositedTime","type":"uint256"},{"internalType":"uint256","name":"_mandatoryTime","type":"uint256"}],"name":"hopDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_shares","type":"uint256"},{"internalType":"uint256","name":"_stakeID","type":"uint256"},{"internalType":"address","name":"_poolAddress","type":"address"}],"name":"hopStakeToAnotherPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"masterchef","outputs":[{"internalType":"contract IMasterChef","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_staker","type":"address"}],"name":"migrateAllStakes","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_staker","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"migrateStake","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"migrationPool","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"minimumGift","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bool","name":"_decision","type":"bool"}],"name":"modifyPartialTransfers","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"_decision","type":"bool"}],"name":"modifyPartialWithdrawals","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"nrOfstakeAllowances","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"partialTransfers","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"partialWithdrawals","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"poolID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowanceID","type":"uint256"}],"name":"revokeStakeAllowance","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"setAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_callFee","type":"uint256"}],"name":"setCallFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_delegate","type":"address"},{"internalType":"bool","name":"asProxy","type":"bool"}],"name":"setDelegate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract IMasterChef","name":"_masterchef","type":"address"},{"internalType":"uint256","name":"_newPoolID","type":"uint256"}],"name":"setMasterChefAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newPool","type":"address"}],"name":"setMigrationPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_amount","type":"uint256"},{"internalType":"bool","name":"_setting","type":"bool"}],"name":"setMinimumGiftDeposit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_pool","type":"address[]"},{"internalType":"bool","name":"_setting","type":"bool"}],"name":"setTrustedPool","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"_sender","type":"address[]"},{"internalType":"bool","name":"_setting","type":"bool"}],"name":"setTrustedSender","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowanceID","type":"uint256"}],"name":"stakeAllowances","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_poolInto","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"stakeRollover","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"token","outputs":[{"internalType":"contract IDTX","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalShares","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"totalVotesForID","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_from","type":"address"},{"internalType":"uint256","name":"_stakeID","type":"uint256"},{"internalType":"uint256","name":"allowanceID","type":"uint256"},{"internalType":"address","name":"_to","type":"address"}],"name":"transferStakeFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_shares","type":"uint256"},{"internalType":"uint256","name":"_stakeID","type":"uint256"},{"internalType":"address","name":"_recipientAddress","type":"address"}],"name":"transferStakeToAnotherWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"treasury","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"trustedPool","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"trustedPoolCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"trustedSender","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"trustedSenderCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"updateMinGiftGovernor","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"updateMinimumGift","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userDelegate","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"uint256","name":"","type":"uint256"}],"name":"userInfo","outputs":[{"internalType":"uint256","name":"shares","type":"uint256"},{"internalType":"uint256","name":"lastDepositedTime","type":"uint256"},{"internalType":"uint256","name":"dtxAtLastUserAction","type":"uint256"},{"internalType":"uint256","name":"lastUserActionTime","type":"uint256"},{"internalType":"uint256","name":"mandatoryTimeToServe","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userVote","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"proposalID","type":"uint256"},{"internalType":"bool","name":"asProxy","type":"bool"}],"name":"voteForProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_shares","type":"uint256"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"votingCredit","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"votingCreditAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"_shares","type":"uint256"},{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"_stakeID","type":"uint256"}],"name":"withdrawAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawFeePeriod","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"}],"name":"withdrawStuckTokens","outputs":[],"stateMutability":"nonpayable","type":"function"}]
*/

// File: contracts/PiggyBank-main/contracts/pulse-ecosystem/tokenVault.sol



pragma solidity 0.8.20;







/**
 * Token vault (hex, inc, plsx)
 */
contract tokenVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct UserInfo {
        uint256 amount;
		uint256 debt;
		uint256 feesPaid;
		uint256 lastAction;
    }

    struct PoolPayout {
        uint256 amount;
        uint256 minServe;
    }
	
	uint256 public constant maxFee = 500; // max 5%
	uint256 public constant maxFundingFee = 250; // max 0.025% per hour
	
    IERC20 public immutable token = IERC20(0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38); //  token

    IERC20 public immutable stakeToken = IERC20(0x32fB5663619A657839A80133994E45c5e5cDf427); // plsx, inc, hex

    IMasterChef public masterchef = IMasterChef(0x486fEa20eA242456b450B005ED7D019E3E984f28);  

    mapping(address => UserInfo[]) public userInfo;
    mapping(address => PoolPayout) public poolPayout; //determines the percentage received depending on withdrawal option

	// Referral system: Track referrer + referral points
	mapping(address => address) public referredBy;
	mapping(address => uint256) public referralPoints;

	uint256 public poolID = 20; 
	uint256 public accDtxPerShare;
    address public treasury; // Governing contract
	address public treasuryWallet; // Actual treasury wallet

	uint256 public lastCredit; // Keep track of our latest credit score from masterchef
	
    uint256 public defaultDirectPayout = 50; //0.5% if withdrawn into wallet
	
	uint256 public depositFee = 0; // 0
	uint256 public fundingRate = 250;// 0
	uint256 public lastFundingChangeTimestamp; // save block.timestamp when funding rate is changed
	

    event Deposit(address indexed sender, uint256 amount, uint256 debt, uint256 depositFee, address indexed referral);
    event Withdraw(address indexed sender, uint256 stakeID, uint256 harvestAmount, uint256 penalty);

    event SelfHarvest(address indexed user, address indexed harvestInto, uint256 harvestAmount, uint256 penalty);
	
	event CollectedFee(address indexed from, uint256 amount);


    constructor() {
		poolPayout[0x39b3E852D6fFA1aF6694Ef87C062450de6778da8].amount = 100;
        poolPayout[0x39b3E852D6fFA1aF6694Ef87C062450de6778da8].minServe = 864000;

        poolPayout[0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4].amount = 300;
        poolPayout[0x9013B1067C52E897E713044dE36c56BfdA8Ec9B4].minServe = 2592000;

        poolPayout[0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67].amount = 500;
        poolPayout[0xb180450f064E79adBFD71Bc2fB086F9CD0Af0D67].minServe = 5184000;

        poolPayout[0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1].amount = 1000;
        poolPayout[0xc0483f1b0dcf601888fFD0d3A44b7124e80DB7D1].minServe = 8640000;

        poolPayout[0x15b51Ece819f3B51ce814de67bB2419660701a3c].amount = 2500;
        poolPayout[0x15b51Ece819f3B51ce814de67bB2419660701a3c].minServe = 20736000;

        poolPayout[0xf3E82f4123d4262a2baEC25b03652f3932A91739].amount = 10000;
        poolPayout[0xf3E82f4123d4262a2baEC25b03652f3932A91739].minServe = 31536000; 
    }
    
    /**
     * @notice Checks if the msg.sender is the admin
     */
    modifier decentralizedVoting() {
        require(msg.sender == IMasterChef(masterchef).owner(), "Decentralized Voting Only!");
        _;
    }

	
    /**
     * Creates a NEW stake
     */
    function deposit(uint256 _amount, address referral) external nonReentrant {
        require(_amount > 0, "invalid amount");
        harvest();
		stakeToken.safeTransferFrom(msg.sender, address(this), _amount);

		if(referredBy[msg.sender] == address(0) && referral != msg.sender) {
			referredBy[msg.sender] = referral;
		}

		uint256 _depositFee = 0;
		if(depositFee != 0) {
			_depositFee = _amount * depositFee / 10000;
			_amount = _amount - _depositFee;
		
        	stakeToken.safeTransfer(treasuryWallet, _depositFee);
		}
		
		uint256 _debt = accDtxPerShare;

        userInfo[msg.sender].push(
                UserInfo(_amount, _debt, _depositFee, block.timestamp)
            );

        emit Deposit(msg.sender, _amount, _debt, _depositFee, referredBy[msg.sender]);
    }

    /**
     * Harvests into pool
     */
    function harvest() public {
        IMasterChef(masterchef).updatePool(poolID);
		uint256 _currentCredit = IMasterChef(masterchef).credit(address(this));
		uint256 _accumulatedRewards = _currentCredit - lastCredit;
		lastCredit = _currentCredit;
		accDtxPerShare+= _accumulatedRewards * 1e12  / stakeToken.balanceOf(address(this));
    }


    /**
     * Withdraws all tokens
     */
    function withdraw(uint256 _stakeID, address _harvestInto) public nonReentrant {
        harvest();
        require(_stakeID < userInfo[msg.sender].length, "invalid stake ID");
        UserInfo storage user = userInfo[msg.sender][_stakeID];

		uint256 currentAmount = user.amount * (accDtxPerShare - user.debt) / 1e12;
		
		payFee(user, msg.sender);

		uint256 userTokens = user.amount; 
		
		_removeStake(msg.sender, _stakeID);

        uint256 _toWithdraw;      

        if(_harvestInto == msg.sender) { 
            _toWithdraw = currentAmount * defaultDirectPayout / 10000;
            currentAmount = currentAmount - _toWithdraw;
            IMasterChef(masterchef).publishTokens(msg.sender, _toWithdraw);
        } else {
            require(poolPayout[_harvestInto].amount != 0, "incorrect pool!");
            _toWithdraw = currentAmount * poolPayout[_harvestInto].amount / 10000;
            currentAmount = currentAmount - _toWithdraw;
			IMasterChef(masterchef).publishTokens(address(this), _toWithdraw);
            IacPool(_harvestInto).giftDeposit(_toWithdraw, msg.sender, poolPayout[_harvestInto].minServe);
        }

		if(referredBy[msg.sender] != address(0)) {
			referralPoints[msg.sender]+= _toWithdraw;
			referralPoints[referredBy[msg.sender]]+= _toWithdraw;
		}

		if(currentAmount > 0) {
        	IMasterChef(masterchef).publishTokens(treasury, currentAmount); //penalty goes to governing contract
		}
		
		lastCredit = lastCredit - (_toWithdraw + currentAmount);
		
		emit Withdraw(msg.sender, _stakeID, _toWithdraw, currentAmount);

        stakeToken.safeTransfer(msg.sender, userTokens);
    } 


	function selfHarvest(uint256[] calldata _stakeID, address _harvestInto) external nonReentrant {
        require(_stakeID.length <= userInfo[msg.sender].length, "incorrect Stake list");
        UserInfo[] storage user = userInfo[msg.sender];
        harvest();
        uint256 _toWithdraw = 0;
        uint256 _payout = 0;

        for(uint256 i = 0; i<_stakeID.length; ++i) {
            _toWithdraw+= user[_stakeID[i]].amount * (accDtxPerShare - user[_stakeID[i]].debt)/ 1e12;
			payFee(user[_stakeID[i]], msg.sender);
			user[_stakeID[i]].debt = accDtxPerShare;
        }

        if(_harvestInto == msg.sender) {
            _payout = _toWithdraw * defaultDirectPayout / 10000;
            IMasterChef(masterchef).publishTokens(msg.sender, _payout); 
		} else {
            require(poolPayout[_harvestInto].amount != 0, "incorrect pool!");
            _payout = _toWithdraw * poolPayout[_harvestInto].amount / 10000;
			IMasterChef(masterchef).publishTokens(address(this), _payout);
            IacPool(_harvestInto).giftDeposit(_payout, msg.sender, poolPayout[_harvestInto].minServe);
		}

		if(referredBy[msg.sender] != address(0)) {
			referralPoints[msg.sender]+= _payout;
			referralPoints[referredBy[msg.sender]]+= _payout;
		}

        uint256 _penalty = _toWithdraw - _payout;
		IMasterChef(masterchef).publishTokens(treasury, _penalty); //penalty to treasury
		
		lastCredit = lastCredit - (_payout + _penalty);

		emit SelfHarvest(msg.sender, _harvestInto, _payout, _penalty);        
    }

	// emergency withdraw, without caring about rewards
	function emergencyWithdraw(uint256 _stakeID) public nonReentrant {
		require(_stakeID < userInfo[msg.sender].length, "invalid stake ID");
		UserInfo storage user = userInfo[msg.sender][_stakeID];

        payFee(user, msg.sender);

		uint256 _amount = user.amount;
		
		_removeStake(msg.sender, _stakeID); //delete the stake
        emit Withdraw(msg.sender, _stakeID, 0, _amount);
        stakeToken.safeTransfer(msg.sender, _amount);
	}

	function emergencyWithdrawAll() external {
		uint256 _stakeID = userInfo[msg.sender].length;
		while(_stakeID > 0) {
			_stakeID--;
			emergencyWithdraw(_stakeID);
		}
	}
	
	function collectCommission(address[] calldata _beneficiary, uint256[][] calldata _stakeID) external nonReentrant {
		for(uint256 i = 0; i< _beneficiary.length; ++i) {
			for(uint256 j = 0; j< _stakeID[i].length; ++j) {
                UserInfo storage user = userInfo[_beneficiary[i]][_stakeID[i][j]];
                payFee(user, _beneficiary[i]);
            }
		}
	}
	
	function collectCommissionAuto(address[] calldata _beneficiary) external nonReentrant {
		for(uint256 i = 0; i< _beneficiary.length; ++i) {
			
			uint256 _nrOfStakes = getNrOfStakes(_beneficiary[i]);
			
			for(uint256 j = 0; j < _nrOfStakes; ++j) {
                UserInfo storage user = userInfo[_beneficiary[i]][j];
                payFee(user, _beneficiary[i]);
            }
		}
		
	}

	function updateFees() external {
		uint256 _depositFee = IGovernor(IMasterChef(masterchef).owner()).depositFee();
		uint256 _fundingRate = IGovernor(IMasterChef(masterchef).owner()).fundingRate();

		require(_depositFee <= maxFee, "out of limit");
		require(_fundingRate <= maxFundingFee, "out of limit");

		depositFee = _depositFee;

		if(_fundingRate != fundingRate) {
			fundingRate = _fundingRate;
			lastFundingChangeTimestamp = block.timestamp;
		} 
	}

	function updateTreasury() external {
		treasury = IMasterChef(masterchef).feeAddress();
		treasuryWallet = IGovernor(IMasterChef(masterchef).owner()).treasuryWallet();
	}
	
	
	/**
	 * option to withdraw wrongfully sent tokens(but requires change of the governing contract to do so)
	 * If you send wrong tokens to the contract address, consider them lost. Though there is possibility of recovery
	 */
	function withdrawStuckTokens(address _tokenAddress) external {
		require(_tokenAddress != address(token), "illegal token");
        require(_tokenAddress != address(stakeToken), "illegal token");
		
		IERC20(_tokenAddress).safeTransfer(treasuryWallet, IERC20(_tokenAddress).balanceOf(address(this)));
	}

	/*
	 * Unlikely, but Masterchef can be changed if needed to be used without changing pools
	 * masterchef = IMasterChef(token.owner());
	 * Must stop earning first(withdraw tokens from old chef)
	*/
	function setMasterChefAddress(IMasterChef _masterchef, uint256 _newPoolID) external decentralizedVoting {
		masterchef = _masterchef;
		poolID = _newPoolID; //in case pool ID changes
	}

    //need to set pools before launch or perhaps during contract launch
    //determines the payout depending on the pool. could set a governance process for it(determining amounts for pools)
	//allocation contract contains the decentralized proccess for updating setting, but so does the admin(governor)
    function setPoolPayout(address _poolAddress, uint256 _amount, uint256 _minServe) external decentralizedVoting {
		require(_amount <= 10000, "out of range"); 
		poolPayout[_poolAddress].amount = _amount;
		poolPayout[_poolAddress].minServe = _minServe; //mandatory lockup(else stake for 5yr, withdraw with 82% penalty and receive 18%)
    }

    
    function updateSettings(uint256 _defaultDirectHarvest) external decentralizedVoting {
		require(_defaultDirectHarvest <= 10_000, "maximum 100%");
        defaultDirectPayout = _defaultDirectHarvest;
    }
    
    function viewStakeEarnings(address _user, uint256 _stakeID) external view returns (uint256) {
		UserInfo storage _stake = userInfo[_user][_stakeID];
        uint256 _pending = _stake.amount * (virtualAccDtxPerShare() - _stake.debt) / 1e12 ;
        return _pending;
    }

    function viewUserTotalEarnings(address _user) external view returns (uint256) {
        UserInfo[] storage _stake = userInfo[_user];
        uint256 nrOfUserStakes = _stake.length;

		uint256 _totalPending = 0;
		
		for(uint256 i=0; i < nrOfUserStakes; ++i) {
			_totalPending+= _stake[i].amount * (virtualAccDtxPerShare() - _stake[i].debt) / 1e12 ;
		}
		
		return _totalPending;
    }
	//we want user deposit, we want total deposited, we want pending rewards, 
	function multiCall(address _user, uint256 _stakeID) external view returns(uint256, uint256, uint256, uint256) {
		UserInfo storage user = userInfo[_user][_stakeID];
		uint256 _pending = user.amount * (virtualAccDtxPerShare() - user.debt) / 1e12 ;
		return(user.amount, user.feesPaid, stakeToken.balanceOf(address(this)), _pending);
	}

    /**
     * @return Returns total pending dtx rewards
     */
    function calculateTotalPendingDTXRewards() external view returns (uint256) {
        return(IMasterChef(masterchef).pendingDtx(poolID));
    }

	function viewPoolPayout(address _contract) external view returns (uint256) {
		return poolPayout[_contract].amount;
	}

	function viewPoolMinServe(address _contract) external view returns (uint256) {
		return poolPayout[_contract].minServe;
	}

	/**
     * Returns number of stakes for a user
     */
    function getNrOfStakes(address _user) public view returns (uint256) {
        return userInfo[_user].length;
    }

	//public lookup for UI
    function publicBalanceOf() public view returns (uint256) {
        uint256 amount = IMasterChef(masterchef).pendingDtx(poolID); 
        uint256 _credit = IMasterChef(masterchef).credit(address(this));
        return _credit + amount;
    }

	// With "Virtual harvest" for external calls
	function virtualAccDtxPerShare() public view returns (uint256) {
		uint256 _pending = IMasterChef(masterchef).pendingDtx(poolID);
		return (accDtxPerShare + _pending * 1e12  / stakeToken.balanceOf(address(this)));
	}

    function payFee(UserInfo storage user, address _userAddress) private {
		uint256 _lastAction = user.lastAction;

		// Prevents charging new funding fee for the past (in case funding fee changes)
		// Before funding fee is changed, commissions must be manually collected
		if(lastFundingChangeTimestamp > _lastAction) {
			user.lastAction = lastFundingChangeTimestamp;
			_lastAction = lastFundingChangeTimestamp;
		}

        uint256 secondsSinceLastaction = block.timestamp - _lastAction;
				
		if(secondsSinceLastaction >= 3600  && fundingRate > 0) {
			user.lastAction = block.timestamp - (secondsSinceLastaction % 3600);
			
			uint256 commission = (block.timestamp - _lastAction) / 3600 * user.amount * fundingRate / 1000000;

			if(commission > user.amount * 2 / 10) {
				commission = user.amount * 2 / 10;
			}
			
            stakeToken.safeTransfer(treasuryWallet, commission);

            user.feesPaid = user.feesPaid + commission;
			
			user.amount = user.amount - commission;
			
			emit CollectedFee(_userAddress, commission);
		}
	}


    /**
     * removes the stake
     */
    function _removeStake(address _staker, uint256 _stakeID) private {
        UserInfo[] storage stakes = userInfo[_staker];
        uint256 lastStakeID = stakes.length - 1;
        
        if(_stakeID != lastStakeID) {
            stakes[_stakeID] = stakes[lastStakeID];
        }
        
        stakes.pop();
    }
}

