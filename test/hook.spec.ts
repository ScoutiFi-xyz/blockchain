import { ethers } from 'hardhat'
import poolManagerAbi from '@uniswap/v4-core/out/PoolManager.sol/PoolManager.json'

describe('Uniswap V4 Hook', function () {
  it('deployment works', async function () {
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
