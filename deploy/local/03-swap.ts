import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import { Contract } from 'ethers'
import {
  POOL_MANAGER_ADDRESS,
  POSITION_MANAGER_ADDRESS,
  USDC_TOKEN_ADDRESS,
  EURE_TOKEN_ADDRESS,
  PERMIT2_ADDRESS,
  STATE_VIEW_ADDRESS,
  UNIVERSAL_ROUTER_ADDRESS
} from '../config'
import {
  FeeAmount,
  TICK_SPACINGS,
  FULL_RANGE_TICK_LOWER,
  FULL_RANGE_TICK_UPPER,
  universalRouterCommands,
  v4RouterActions,
  positionManagerActions,
} from '../const'
import {
  poolKeyToId,
  pricesFromSqrtPricesX96,
  adjustTicks
} from '../utils'

import erc20Abi from '../../artifacts/solmate/src/test/utils/mocks/MockERC20.sol/MockERC20.json'
import { abi as permit2Abi } from '../../permit2/permit2'
import positionManagerAbi from '@uniswap/v4-periphery/foundry-out/PositionManager.sol/PositionManager.json'
import stateViewAbi from '@uniswap/v4-periphery/foundry-out/StateView.sol/StateView.json'
import universalRouterAbi from '@uniswap/universal-router/out/UniversalRouter.sol/UniversalRouter.json'

// Note: fun-fun-fun
// ethers v5.7 is required for uniswap sdks, but it is not included in the v4-sdk package.json
// guess what, you need to `npm i ethers@5.7 --force` into the node_module, no other way of overriding this
import { V4Planner, Pool, Actions } from '@uniswap/v4-sdk'
import { Token } from '@uniswap/sdk-core'

const run = async () => {
  const tokens = [USDC_TOKEN_ADDRESS, EURE_TOKEN_ADDRESS].sort()
  const currency0 = tokens[0]
  const currency1 = tokens[1]
  const fee = FeeAmount.MEDIUM // 0.30%
  const tickSpacing = TICK_SPACINGS[FeeAmount.MEDIUM]
  const hooks = ethers.ZeroAddress
  const poolKey = {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
  }

  const [owner] = await ethers.getSigners()

  await mintFunds(owner)
  await logBalances(owner)

  await approveFunds(owner)

  await addLiquidity(owner, poolKey)
  await logPoolState(owner, poolKey)
  await logBalances(owner)

  // buy ptmp
  await swap(owner, poolKey)
  await logPoolState(owner, poolKey)
  await logBalances(owner)
}

const mintFunds = async (owner: HardhatEthersSigner) => {
  const currency0 = new ethers.Contract(USDC_TOKEN_ADDRESS, erc20Abi.abi, owner)
  const currency1 = new ethers.Contract(EURE_TOKEN_ADDRESS, erc20Abi.abi, owner)

  await currency0.mint(owner, ethers.parseUnits('10000', 6))
  await currency1.mint(owner, ethers.parseUnits('10000', 6))
}

const approveFunds = async (owner: HardhatEthersSigner): Promise<void> => {
  const currency0 = new ethers.Contract(USDC_TOKEN_ADDRESS, erc20Abi.abi, owner)
  const currency1 = new ethers.Contract(EURE_TOKEN_ADDRESS, erc20Abi.abi, owner)

  // approve `Permit2` as a spender
  await currency0.approve(PERMIT2_ADDRESS, ethers.MaxUint256)
  await currency1.approve(PERMIT2_ADDRESS, ethers.MaxUint256)

  // approve `PositionManager` as a spender of permit2
  const permit2 = new ethers.Contract(PERMIT2_ADDRESS, permit2Abi, owner)
  const maxUint160 = BigInt(2) ** BigInt(160) - BigInt(1) // amount
  const maxUint48 = BigInt(2) ** BigInt(48) - BigInt(1) // expiration
  await permit2.approve(currency0, POSITION_MANAGER_ADDRESS, maxUint160, maxUint48)
  await permit2.approve(currency1, POSITION_MANAGER_ADDRESS, maxUint160, maxUint48)

  // approve `UniversalRouter` as a spender of permit2, for swaps
  await permit2.approve(currency0, UNIVERSAL_ROUTER_ADDRESS, maxUint160, maxUint48)
  await permit2.approve(currency1, UNIVERSAL_ROUTER_ADDRESS, maxUint160, maxUint48)
}

// mint ERC-721 position with some initial liquidity, full range ticks
const addLiquidity = async (owner: HardhatEthersSigner, poolKey: any) => {
  const positionManager = new ethers.Contract(POSITION_MANAGER_ADDRESS, positionManagerAbi.abi, owner)

  const abiCoder = ethers.AbiCoder.defaultAbiCoder()
  // toBeHex converets number to 1 byte hex string
  const actions = ethers.concat([
    ethers.toBeHex(positionManagerActions.MINT_POSITION, 1),
    ethers.toBeHex(positionManagerActions.SETTLE_PAIR, 1)
  ])

  const [tickLower, tickUpper] = adjustTicks(FULL_RANGE_TICK_LOWER, FULL_RANGE_TICK_UPPER, poolKey.tickSpacing)
  const liquidity = ethers.parseUnits('100', 6)
  // Note: small values will break this, needs to be enough to cover the asked liquidity at the current price
  const amount0Max = ethers.parseUnits('100', 6)
  const amount1Max = ethers.parseUnits('100', 6)
  const hookData = '0x'

  const mintParams: string[] = [
    abiCoder.encode(
      [
        '(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)',
        'int24',
        'int24',
        'uint256',
        'uint128',
        'uint128',
        'address',
        'bytes'
      ],
      [poolKey, tickLower, tickUpper, liquidity, amount0Max, amount1Max, owner.address, hookData]
    ),
    abiCoder.encode(['address', 'address'], [poolKey.currency0, poolKey.currency1])
  ]

  const unlockData = abiCoder.encode(
    ['bytes', 'bytes[]'],
    [actions, mintParams]
  )

  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp || 0
  const deadline = blockTimestamp + 300

  const tx = await positionManager.modifyLiquidities(unlockData, deadline)
  // console.log('modifyLiquidities tx', tx)
  const receipt = await tx.wait()
  // console.log('modifyLiquidities receipt', receipt)
  console.log(`Modify liquidity tx: ${receipt.status === 1 ? '✓' : '✗'}`)

  // Note: PositionManager also has multicall with which you can initialize and provide liquidity in a single call
  // https://docs.uniswap.org/contracts/v4/quickstart/create-pool
}

const swap = async (owner: HardhatEthersSigner, poolKey: any) => {
  // https://docs.uniswap.org/contracts/v4/quickstart/swap
  const universalRouter = new ethers.Contract(
    UNIVERSAL_ROUTER_ADDRESS,
    universalRouterAbi.abi,
    owner
  )

  const abiCoder = ethers.AbiCoder.defaultAbiCoder()

  // v4 router swap actions input
  const actions = ethers.concat([
    ethers.toBeHex(v4RouterActions.SWAP_EXACT_IN_SINGLE, 1),
    ethers.toBeHex(v4RouterActions.SETTLE_ALL, 1),
    ethers.toBeHex(v4RouterActions.TAKE_ALL, 1)
  ])
  const zeroForOne = true // true if we're swapping token0 for token1
  const amountIn = ethers.parseUnits('10', 6) // amount of tokens we're swapping
  const amountOutMinimum = ethers.parseUnits('8', 6) // minimum amount we expect to receive
  const hookData = '0x' // no hook data needed
  const swap = { poolKey, zeroForOne, amountIn, amountOutMinimum, hookData }
  const params = [
    abiCoder.encode(
      [
        '((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)'
      ],
      [swap]
    ),
    abiCoder.encode(
      ['address', 'uint256'],
      [poolKey.currency0, amountIn]
    ),
    abiCoder.encode(
      ['address', 'uint256'],
      [poolKey.currency1, amountOutMinimum]
    )
  ]
  const v4RouterSwapInput = abiCoder.encode(
    ['bytes', 'bytes[]'],
    [actions, params]
  )

  // universal router commands
  const commands = ethers.concat([ethers.toBeHex(universalRouterCommands.V4_SWAP)])
  const inputs = [v4RouterSwapInput]

  const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp || 0
  const deadline = blockTimestamp + 300

  // Note: fn selector used here, as we have overloading execute functions in abi
  const tx = await universalRouter['execute(bytes,bytes[],uint256)'](commands, inputs, deadline)
  // console.log('swap tx', tx)
  const receipt = await tx.wait()
  // console.log('swap tx receipt', receipt)
  console.log(`Swap tx: ${receipt.status === 1 ? '✓' : '✗'}`)
}

const logPoolState = async (owner: HardhatEthersSigner, poolKey: any) => {
  const stateView = new ethers.Contract(STATE_VIEW_ADDRESS, stateViewAbi.abi, owner)
  const poolId = poolKeyToId(poolKey)

  const [sqrtPriceX96, tick, protocolFee, lpFee] = await stateView.getSlot0(poolId)
  const liquidityUnits = await stateView.getLiquidity(poolId)
  const [token0Price, token1Price] = pricesFromSqrtPricesX96(sqrtPriceX96)

  // console.log(`sqrtPriceX96: ${sqrtPriceX96}; tick: ${tick}; protocolFee: ${protocolFee}; lpFee: ${lpFee}`)
  // console.log(`Liquidity: ${ethers.formatUnits(liquidityUnits, 6)}`)
  // const [token0Amount, token1Amount] = amountsFromLiquidity(sqrtPriceX96, liquidityUnits)
  // console.log(`Token 0 @${token0Price}`)
  // console.log(`Token 1 @${token1Price}`)

  console.table({
    sqrtPriceX96,
    tick,
    protocolFee,
    lpFee,
    liquidityUnits: ethers.formatUnits(liquidityUnits, 6),
    token0Price,
    token1Price
  })
}

const logBalances = async (owner: HardhatEthersSigner) => {
  const usdc = new ethers.Contract(USDC_TOKEN_ADDRESS, erc20Abi.abi, owner)
  const ptmp = new ethers.Contract(EURE_TOKEN_ADDRESS, erc20Abi.abi, owner)
  //   console.log(`USDC balance: ${ethers.formatUnits(await usdc.balanceOf(owner), 6)}`)
  //   console.log(`PTMP balance: ${ethers.formatUnits(await ptmp.balanceOf(owner), 6)}`)

  console.table({
    usdcBalance: ethers.formatUnits(await usdc.balanceOf(owner), 6),
    ptmpBalance: ethers.formatUnits(await ptmp.balanceOf(owner), 6)
  })
}

run()

const addMintWithSdk = async () => {
  // const planner = new V4Planner()
  // const tickLower = 0 // -60000 // TODO: calculate from tickSpacing
  // const tickUpper = 0 // 60000 // TODO: calculate from tickSpacing
  // const liquidity = 0 // ethers.parseEther('1000')
  // const amount0Max = 0 // ethers.parseUnits('10000', 6)
  // const amount1Max = 0 // ethers.parseUnits('10000', 6)
  // const hookData = '0x'
  // planner.addAction(Actions.MINT_POSITION, [
  //   Pool.getPoolKey(
  //     new Token(1337, currency0, 6),
  //     new Token(1337, currency1, 6),
  //     fee,
  //     tickSpacing,
  //     hooks
  //   ),
  //   tickLower,
  //   tickUpper,
  //   liquidity.toString(),
  //   amount0Max.toString(),
  //   amount1Max.toString(),
  //   owner.address,
  //   hookData,
  // ])
  // planner.addAction(Actions.SETTLE_PAIR, [currency0, currency1])

  // const unlockData = planner.finalize()
  // console.log('unlockData', unlockData)
  // console.log('planner.actions', planner.actions)
  // console.log('planner.params', planner.params)

  // UNLOCK DATA IS COMPLETELY THE SAME REGARDLESS OF USING THE SDK FOR ENCODING OR NOT
}

// TODO: swap more and swap all back
// const swap2 = async (owner: HardhatEthersSigner, poolKey: any) => {
//   // https://docs.uniswap.org/contracts/v4/quickstart/swap
//   const universalRouter = new ethers.Contract(
//     UNIVERSAL_ROUTER_ADDRESS,
//     universalRouterAbi.abi,
//     owner
//   )

//   const abiCoder = ethers.AbiCoder.defaultAbiCoder()

//   // v4 router swap actions input
//   const actions = ethers.concat([
//     ethers.toBeHex(v4RouterActions.SWAP_EXACT_IN_SINGLE, 1),
//     ethers.toBeHex(v4RouterActions.SETTLE_ALL, 1),
//     ethers.toBeHex(v4RouterActions.TAKE_ALL, 1)
//   ])
//   const zeroForOne = true // true if we're swapping token0 for token1
//   const amountIn = ethers.parseUnits('90', 6) // amount of tokens we're swapping
//   const amountOutMinimum = ethers.parseUnits('50', 6) // minimum amount we expect to receive
//   const hookData = '0x' // no hook data needed
//   const swap = { poolKey, zeroForOne, amountIn, amountOutMinimum, hookData }
//   const params = [
//     abiCoder.encode(
//       [
//         '((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 amountIn,uint128 amountOutMinimum,bytes hookData)'
//       ],
//       [swap]
//     ),
//     abiCoder.encode(
//       ['address', 'uint256'],
//       [poolKey.currency0, amountIn]
//     ),
//     abiCoder.encode(
//       ['address', 'uint256'],
//       [poolKey.currency1, amountOutMinimum]
//     )
//   ]
//   const v4RouterSwapInput = abiCoder.encode(
//     ['bytes', 'bytes[]'],
//     [actions, params]
//   )

//   // universal router commands
//   const commands = ethers.concat([ethers.toBeHex(universalRouterCommands.V4_SWAP)])
//   const inputs = [v4RouterSwapInput]

//   const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp || 0
//   const deadline = blockTimestamp + 300

//   // Note: fn selector used here, as we have overloading execute functions in abi
//   const tx = await universalRouter['execute(bytes,bytes[],uint256)'](commands, inputs, deadline)
//   // console.log('swap tx', tx)
//   const receipt = await tx.wait()
//   // console.log('swap tx receipt', receipt)
//   console.log(`Swap tx: ${receipt.status === 1 ? '✓' : '✗'}`)
// }

// const swap3 = async (owner: HardhatEthersSigner, poolKey: any) => {
//   // https://docs.uniswap.org/contracts/v4/quickstart/swap
//   const universalRouter = new ethers.Contract(
//     UNIVERSAL_ROUTER_ADDRESS,
//     universalRouterAbi.abi,
//     owner
//   )

//   const abiCoder = ethers.AbiCoder.defaultAbiCoder()

//   // v4 router swap actions input
//   const actions = ethers.concat([
//     ethers.toBeHex(0x08, 1),
//     ethers.toBeHex(v4RouterActions.SETTLE_ALL, 1),
//     ethers.toBeHex(v4RouterActions.TAKE_ALL, 1)
//   ])
//   const zeroForOne = true // true if we're swapping token0 for token1
//   const amountOut = ethers.parseUnits('100', 6) // amount of tokens we're swapping
//   const amountInMaximum = ethers.parseUnits('150', 6) // minimum amount we expect to receive
//   const hookData = '0x' // no hook data needed
//   const swap = { poolKey, zeroForOne, amountOut, amountInMaximum, hookData }
//   const params = [
//     abiCoder.encode(
//       [
//         '((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 amountOut,uint128 amountInMaximum,bytes hookData)'
//       ],
//       [swap]
//     ),
//     abiCoder.encode(
//       ['address', 'uint256'],
//       [poolKey.currency1, amountInMaximum]
//     ),
//     abiCoder.encode(
//       ['address', 'uint256'],
//       [poolKey.currency0, amountOut]
//     )
//   ]
//   const v4RouterSwapInput = abiCoder.encode(
//     ['bytes', 'bytes[]'],
//     [actions, params]
//   )

//   // universal router commands
//   const commands = ethers.concat([ethers.toBeHex(universalRouterCommands.V4_SWAP)])
//   const inputs = [v4RouterSwapInput]

//   const blockTimestamp = (await ethers.provider.getBlock('latest'))?.timestamp || 0
//   const deadline = blockTimestamp + 300

//   // Note: fn selector used here, as we have overloading execute functions in abi
//   const tx = await universalRouter['execute(bytes,bytes[],uint256)'](commands, inputs, deadline)
//   // console.log('swap tx', tx)
//   const receipt = await tx.wait()
//   // console.log('swap tx receipt', receipt)
//   console.log(`Swap tx: ${receipt.status === 1 ? '✓' : '✗'}`)
// }
