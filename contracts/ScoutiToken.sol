// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import "solmate/src/tokens/ERC20.sol";
import "solmate/src/auth/Owned.sol";

contract ScoutiToken is ERC20, Owned {
    constructor()
        ERC20("ScoutiFI Platform Token", "SCOUTI", 6)
        Owned(msg.sender)
    {}

    function mint(address to, uint256 value) public virtual onlyOwner() {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public virtual onlyOwner() {
        _burn(from, value);
    }
}
