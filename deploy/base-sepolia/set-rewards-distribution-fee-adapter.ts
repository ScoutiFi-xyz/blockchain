import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import { BASE_SEPOLIA } from '../config'
import rewardsDistributionConfig from '../../artifacts/contracts/RewardsDistribution.sol/RewardsDistribution.json'

const run = async () => {
  const [_, feeWallet] = await ethers.getSigners()

  await setRewardsDistributionFeeAdapter(feeWallet)
}

const setRewardsDistributionFeeAdapter = async (deployer: HardhatEthersSigner) => {
  const rewardsDistribution = new ethers.Contract(
    BASE_SEPOLIA.REWARDS_DISTRIBUTION_ADDRESS,
    rewardsDistributionConfig.abi,
    deployer
  )

  let feeAdapterAddress = await rewardsDistribution.getFeedAdapter()
  console.log(`Current feed adapter: ${feeAdapterAddress}`)

  await (
    await rewardsDistribution.setFeedAdapter(BASE_SEPOLIA.PLAYER_API_ADAPTER_ADDRESS)
  ).wait()

  feeAdapterAddress = await rewardsDistribution.getFeedAdapter()
  console.log(`Set feed adapter: ${feeAdapterAddress}`)
}

run()
