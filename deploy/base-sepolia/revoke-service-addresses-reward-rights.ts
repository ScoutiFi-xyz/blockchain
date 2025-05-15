import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import { BASE_SEPOLIA } from '../config'
import rewardsDistributionConfig from '../../artifacts/contracts/RewardsDistribution.sol/RewardsDistribution.json'

const run = async () => {
  const [_, feeWallet] = await ethers.getSigners()

  await revokeServiceAddressesRewardRights(feeWallet)
}

const revokeServiceAddressesRewardRights = async (deployer: HardhatEthersSigner) => {
  const rewardsDistribution = new ethers.Contract(
    BASE_SEPOLIA.REWARDS_DISTRIBUTION_ADDRESS,
    rewardsDistributionConfig.abi,
    deployer
  )

  const serviceAdresses = [
    // emission contracts
    '0x0499A7008A4753063f7c9022C4d4aDe190b92450',
    '0x6E0853d6917129728E6282c7385E39C450C28839',
    '0xeCD7e577cF31BBad6C24C43480624b71B71b9B95',
    '0x1482e95466609FD489C12F424c0Ad1369Ec1ad29',
    '0xFB121470E26aaAcCba2EBF6BAAafEf60B05785fa',
    '0x26624f2BBEBa03806c1f78Ee19fCD72D8F58B1d5',
    '0x874c9fC5d3cb0259bd7AC0130B47D601d3233eAd',
    '0x757B735d430c777C06Cf1ADE870Bb51d38b93d2d',
    // uniswap v4 pool manager
    '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408'
  ]

  for (const address of serviceAdresses) {
    await (
      await rewardsDistribution.revokeRewardRights(address)
    ).wait()
  }
}

run()
