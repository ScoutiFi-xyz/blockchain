// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import "solmate/src/tokens/ERC20.sol";
import "solmate/src/auth/Owned.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract PlayerToken is ERC20, Owned {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private holders;

    constructor(string memory _symbol)
        ERC20("ScoutiFI Player Token", _symbol, 6)
        Owned(msg.sender)
    {}

    function updateHolders(address from, address to) internal {
        if (!holders.contains(to)) {
            holders.add(to);
        }
        if (balanceOf[from] == 0) {
            holders.remove(from);
        }
    }

    function getHolders() public view returns(address[] memory) {
        return holders.values();
    }

    function mint(address to, uint256 value) public onlyOwner() {
        _mint(to, value);
    }

    function burn(address from, uint256 value) public onlyOwner() {
        _burn(from, value);
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool ok = super.transfer(to, amount);
        updateHolders(msg.sender, to);

        return ok;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        bool ok = super.transferFrom(from, to, amount);
        updateHolders(from, to);

        return ok;
    }
}
