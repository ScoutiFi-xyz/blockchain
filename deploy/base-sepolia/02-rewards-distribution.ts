import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import { BASE_SEPOLIA } from '../config'

const run = async () => {
  // Should be deployed by Fee Wallet
  const [_, feeWallet] = await ethers.getSigners()

  await deployRewardsDistribution(feeWallet)
}

const deployRewardsDistribution = async (deployer: HardhatEthersSigner) => {
  const rewardsDistributionFactory = await ethers.getContractFactory('RewardsDistribution', deployer)
  const rewardsDistribution = await rewardsDistributionFactory.deploy(
    BASE_SEPOLIA.PLATFORM_TOKEN_ADDRESS
  )
  await rewardsDistribution.waitForDeployment()

  const address = await rewardsDistribution.getAddress()
  console.log(`REWARDS_DISTRIBUTION_ADDRESS: '${address}'`)
}

run()
