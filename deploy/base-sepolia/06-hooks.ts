import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import { BASE_SEPOLIA } from '../config'

const run = async () => {
  // feeWallet must be deployer as it will collect the fees
  const [_, feeWallet] = await ethers.getSigners()

  await deployV4Hooks(feeWallet)
}

const deployV4Hooks = async (deployer: HardhatEthersSigner) => {
  const poolManager = await ethers.getContractAt('IPoolManager', BASE_SEPOLIA.POOL_MANAGER_ADDRESS)

  const SwapFeeHookFactory = await ethers.getContractFactory('SwapFeeHook', deployer)

  // TODO: deploy tx fails?!?
  const swapFeeHook = await SwapFeeHookFactory.deploy(
    poolManager,
    // { gasLimit: 1_000_000}
  )
  await swapFeeHook.waitForDeployment()
  console.log(`SWAP_FEE_HOOK: '${await swapFeeHook.getAddress()}'`)
}

run()
