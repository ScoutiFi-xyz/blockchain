import { ethers } from 'hardhat'
import poolManagerAbi from '@uniswap/v4-core/out/PoolManager.sol/PoolManager.json'

describe('Uniswap V4 Hook', function () {
  // Note: this address can only work if we override and disable validateHookAddress function in the hook
  it.skip('deployment works', async function () {
    const [owner] = await ethers.getSigners()

    const poolManagerFactory = new ethers.ContractFactory(
      poolManagerAbi.abi,
      poolManagerAbi.bytecode,
      owner,
    )
    const poolManager = await poolManagerFactory.deploy(ethers.ZeroAddress)

    const SwapFeeHookFactory = await ethers.getContractFactory('SwapFeeHook')
    const swapFeeHook = await SwapFeeHookFactory.deploy(poolManager)

    console.log(await swapFeeHook.getAddress())
  })
})
