// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "solmate/src/auth/Owned.sol";
import "solmate/src/tokens/ERC20.sol";

contract TokenEmission is Owned {
    uint256 public constant RATE_DENOMINATOR = 1_000;

    ERC20 public emissionToken;
    ERC20 public swapToken;
    uint256 public rate;

    constructor(
        address _emissionTokenAddress,
        address _swapTokenAddress,
        uint256 _rate
    ) Owned(msg.sender) {
        emissionToken = ERC20(_emissionTokenAddress);
        swapToken = ERC20(_swapTokenAddress);
        rate = _rate;
    }

    function qtyAvailable() public view returns(uint256 balance) {
        return emissionToken.balanceOf(address(this));
    }

    function buy(uint256 amount) public {
        require(emissionToken.balanceOf(address(this)) >= amount, "Amount exceeds available tokens for sale");

        uint256 cost = amount * rate / RATE_DENOMINATOR;

        swapToken.transferFrom(msg.sender, address(this), cost);

        emissionToken.transfer(msg.sender, amount);
    }

    function pullSwapTokens() public onlyOwner() {
        uint256 accumulated = swapToken.balanceOf(address(this));
        swapToken.transfer(msg.sender, accumulated);
    }
}
