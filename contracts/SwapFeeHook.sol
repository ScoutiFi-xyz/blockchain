// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import { BaseHook } from "@uniswap/v4-periphery/src/utils/BaseHook.sol";

import { Hooks } from "@uniswap/v4-core/src/libraries/Hooks.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { PoolKey } from "@uniswap/v4-core/src/types/PoolKey.sol";
import { Currency } from "@uniswap/v4-core/src/types/Currency.sol";
import { PoolId, PoolIdLibrary } from "@uniswap/v4-core/src/types/PoolId.sol";
import { BalanceDelta } from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import { BeforeSwapDelta, toBeforeSwapDelta } from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";

contract SwapFeeHook is BaseHook {
    uint256 public constant HOOK_FEE_PERCENTAGE = 350; // 0.35%
    uint256 public constant FEE_DENOMINATOR = 100000;

    address public immutable feeWallet;

    constructor(IPoolManager _poolManager) BaseHook(_poolManager) {
        feeWallet = msg.sender;
    }

    function getHookPermissions()
        public
        pure
        override
        returns (Hooks.Permissions memory)
    {
        return
            Hooks.Permissions({
                beforeInitialize: false,
                afterInitialize: false,
                beforeAddLiquidity: false,
                afterAddLiquidity: false,
                beforeRemoveLiquidity: false,
                afterRemoveLiquidity: false,
                beforeSwap: true,
                afterSwap: false,
                beforeDonate: false,
                afterDonate: false,
                beforeSwapReturnDelta: true,
                afterSwapReturnDelta: false,
                afterAddLiquidityReturnDelta: false,
                afterRemoveLiquidityReturnDelta: false
            });
    }

    function _beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        uint256 swapAmount = params.amountSpecified < 0
            ? uint256(-params.amountSpecified)
            : uint256(params.amountSpecified);

        uint256 feeAmount = (swapAmount * HOOK_FEE_PERCENTAGE) / FEE_DENOMINATOR;
        Currency feeCurrency = params.zeroForOne ? key.currency0 : key.currency1;

        // TODO: check if feeCurrency is within PlayerTokenFactory.playerTokenAddresses
        // double the fee if so

        poolManager.take(feeCurrency, feeWallet, feeAmount);

        BeforeSwapDelta returnDelta = toBeforeSwapDelta(
            int128(int256(feeAmount)), // Specified delta (fee amount)
            0 // Unspecified delta (no change)
        );

        return (BaseHook.beforeSwap.selector, returnDelta, 0);
    }
}
