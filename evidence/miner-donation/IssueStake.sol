// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

// Original helper: OINK-pls/PiggyBank, contracts/helper/stakeDonation.sol,
// commit cf49720c083f098b2fb7c8c636cfa0e91ae8be05.
// Its public source leaves IToken() blank; bind the current OINK deployment.
interface IacPool {
    function giftDeposit(uint256 amount, address recipient, uint256 minToServeInSecs) external;
}
interface IToken {
    function balanceOf(address account) external view returns (uint256);
}
contract IssueStake {
    IToken public immutable token = IToken(0xFAaC6a85C3e123AB2CF7669B1024f146cFef0b38);
    address public immutable pool;
    address public immutable recipient;
    uint256 public immutable minServe;

    constructor(address _recipient, address _pool, uint256 _minServe) {
        recipient = _recipient;
        pool = _pool;
        minServe = _minServe;
    }
    function giftStake() external {
        IacPool(pool).giftDeposit(token.balanceOf(address(this)), recipient, minServe);
    }
}
