// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

// TODO: use Auth.sol as this will be used by platform operators
import "solmate/src/auth/Owned.sol";
import { Bytes32AddressLib } from "solmate/src/utils/Bytes32AddressLib.sol";
import "./PlayerToken.sol";

contract PlayerTokenFactory is Owned {
    using Bytes32AddressLib for bytes32;

    address[] public playerTokenAddresses;

    event TokenCreated(address indexed playerTokenAddress, uint count);

    constructor() Owned(msg.sender) {}

    function playerTokenContractsCount() external view returns (uint) {
        return playerTokenAddresses.length;
    }

    function createToken(string memory symbol, uint256 icoValue) external onlyOwner() {
        bytes memory bytecode = type(PlayerToken).creationCode;
        bytes memory constructorArgs = abi.encode(symbol);
        bytes memory bytecodeWithArgs = abi.encodePacked(bytecode, constructorArgs);
        bytes32 salt = keccak256(abi.encodePacked(symbol));

        address token;
        assembly {
            token := create2(0, add(bytecodeWithArgs, 32), mload(bytecodeWithArgs), salt)
        }

        PlayerToken(token).mint(msg.sender, icoValue);

        emit TokenCreated(token, this.playerTokenContractsCount());
    }

    function getTokenAddress(string memory symbol) external view returns (address token) {
        bytes memory bytecode = type(PlayerToken).creationCode;
        bytes memory constructorArgs = abi.encode(symbol);
        bytes memory bytecodeWithArgs = abi.encodePacked(bytecode, constructorArgs);
        bytes32 salt = keccak256(abi.encodePacked(symbol));

        token = keccak256(
            abi.encodePacked(
                // Prefix:
                bytes1(0xFF),
                // Creator:
                address(this),
                // Salt:
                salt,
                // Bytecode hash:
                keccak256(bytecodeWithArgs)
            )
        ).fromLast20Bytes();
    }
}
