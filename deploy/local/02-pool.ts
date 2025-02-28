import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import poolManagerAbi from '@uniswap/v4-core/out/PoolManager.sol/PoolManager.json'
import {
  POOL_MANAGER_ADDRESS,
  POSITION_MANAGER_ADDRESS,
  USDC_TOKEN_ADDRESS,
  EURE_TOKEN_ADDRESS,
} from '../config'
import {
  FeeAmount,
  TICK_SPACINGS,
} from '../const'

const run = async () => {
  const [owner] = await ethers.getSigners()

  const poolManager = new ethers.Contract(
    POOL_MANAGER_ADDRESS,
    poolManagerAbi.abi,
    owner
  )

  // create pool
  // https://github.com/uniswapfoundation/v4-template/blob/main/script/Anvil.s.sol#L122
  const tokens = [USDC_TOKEN_ADDRESS, EURE_TOKEN_ADDRESS].sort()
  const currency0 = tokens[0]
  const currency1 = tokens[1]
  const fee = FeeAmount.MEDIUM // 0.30%
  const tickSpacing = TICK_SPACINGS[FeeAmount.MEDIUM]
  const hooks = ethers.ZeroAddress
  // the startingPrice is expressed as sqrtPriceX96: floor(sqrt(token1 / token0) * 2^96)
  // 79228162514264337593543950336 is the starting price for a 1:1 pool
  const SQRT_PRICE_1_1 = BigInt('79228162514264337593543950336')

  const poolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  }
  const tx = await poolManager.initialize(poolKey, SQRT_PRICE_1_1)
  // console.log('tx', tx)

  const receipt = await tx.wait()
  // console.log('receipt', receipt)
  console.log(`Pool create tx: ${receipt.status === 1 ? '✓' : '✗'}`)
}

run()
