import { ethers } from 'hardhat'
import { Decimal } from 'decimal.js'

export const poolKeyToId = (poolKey: any) => {
  const isNativeCurrency = false // TODO: we don't expect to work with a native currency in out pools
  const currency0Addr = isNativeCurrency ? ethers.ZeroAddress : poolKey.currency0
  const currency1Addr = isNativeCurrency ? ethers.ZeroAddress : poolKey.currency1
  const tokens = [currency0Addr, currency1Addr].sort()

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'address', 'uint24', 'int24', 'address'],
    [tokens[0], tokens[1], poolKey.fee, poolKey.tickSpacing, poolKey.hooks]
  )

  const hash = ethers.solidityPackedKeccak256(['bytes'], [encoded])

  return hash
}

export const pricesFromSqrtPricesX96 = (sqrtPriceX96Str: string, token0Decimals = 6, token1Decimals = 6): [string, string] => {
  const sqrtPriceX96 = BigInt(sqrtPriceX96Str)
  const priceComponent0 = BigInt(2) ** BigInt(192)
  const priceComponent1 = sqrtPriceX96 * sqrtPriceX96

  const token0Price = Decimal.div(priceComponent0.toString(), priceComponent1.toString())
  const token1Price = Decimal.div(priceComponent1.toString(), priceComponent0.toString())
  const tokenDecimalsDiff = token0Decimals - token1Decimals

  return [
    token0Price.mul(10 ** tokenDecimalsDiff).toString(),
    token1Price.mul(10 ** tokenDecimalsDiff).toString()
  ]
}

// TODO: not really
// amounts also depend on the actual ticks provided
// https://github.com/Uniswap/v3-sdk/blob/08a7c05/src/utils/sqrtPriceMath.ts#L25-L46
// see the actual sdk implementation
const amountsFromLiquidity = (
  sqrtPriceX96Str: string,
  liquidityUnitsStr: string,
  token0Decimals = 6,
  token1Decimals = 6
): [string, string] => {
  const sqrtPriceX96 = BigInt(sqrtPriceX96Str)
  const liquidityUnits = BigInt(liquidityUnitsStr)

  const token0Amount = liquidityUnits / sqrtPriceX96
  const token1Amount = (liquidityUnits * sqrtPriceX96) / BigInt(2)

  return [
    ethers.formatUnits(token0Amount, token0Decimals),
    ethers.formatUnits(token1Amount, token1Decimals)
  ]
}

export const adjustTicks = (tickLower: number, tickUpper: number, tickSpacing: number) => {
  // adjust ticks to the nearest multiple of tickSpacing
  // Note: going out of bounds or not properly adjusting to tickSpacing causes an error
  // Note: ticks too close to each other may end up the same number after adjusting
  const tickLowerAdjusted = Math.ceil(tickLower / tickSpacing) * tickSpacing;
  const tickUpperAdjusted = Math.floor(tickUpper / tickSpacing) * tickSpacing;

  return [tickLowerAdjusted, tickUpperAdjusted]
}
