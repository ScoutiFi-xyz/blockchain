import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import playerTokenFactoryConfig from '../../artifacts/contracts/PlayerTokenFactory.sol/PlayerTokenFactory.json'
import rewardsDistributionConfig from '../../artifacts/contracts/RewardsDistribution.sol/RewardsDistribution.json'
import { BASE_SEPOLIA } from '../config'

const run = async () => {
  const [owner, feeWallet] = await ethers.getSigners()

  await createTokens(owner)
  await linkTokens(feeWallet)
}

const createTokens = async (owner: HardhatEthersSigner) => {
  const playerTokenFactory = new ethers.Contract(
    BASE_SEPOLIA.PLAYER_TOKEN_FACTORY_ADDRESS,
    playerTokenFactoryConfig.abi,
    owner
  )

  // deploy player contracts
  await (
    await playerTokenFactory.createToken('SFTHP', ethers.parseUnits('1000', 6))
  ).wait()

  await (
    await playerTokenFactory.createToken('SFGBJ', ethers.parseUnits('1000', 6))
  ).wait()

  await (
    await playerTokenFactory.createToken('SFKDB', ethers.parseUnits('1000', 6))
  ).wait()

  await (
    await playerTokenFactory.createToken('SFASB', ethers.parseUnits('1000', 6))
  ).wait()

  await (
    await playerTokenFactory.createToken('SFVVD', ethers.parseUnits('1000', 6))
  ).wait()

  console.log('Players deployed')
}

const linkTokens = async (feeWallet: HardhatEthersSigner) => {
  const rewardsDistribution = new ethers.Contract(
    BASE_SEPOLIA.REWARDS_DISTRIBUTION_ADDRESS,
    rewardsDistributionConfig.abi,
    feeWallet
  )
  const playerTokenFactory = new ethers.Contract(
    BASE_SEPOLIA.PLAYER_TOKEN_FACTORY_ADDRESS,
    playerTokenFactoryConfig.abi,
    feeWallet
  )

  // get addresses
  const thomasParteyAddress = await playerTokenFactory.getTokenAddress('SFTHP')
  const gabrielJesusAddress = await playerTokenFactory.getTokenAddress('SFGBJ')
  const kevinDebruyneAddress = await playerTokenFactory.getTokenAddress('SFKDB')
  const alissonBackerAddress = await playerTokenFactory.getTokenAddress('SFASB')
  const virgilVanDykAddress = await playerTokenFactory.getTokenAddress('SFVVD')

  // link to distribution contract
  await rewardsDistribution.linkPlayerToken(
    await rewardsDistribution.computePlayerHash('T. Partey'),
    thomasParteyAddress
  )
  await rewardsDistribution.linkPlayerToken(
    await rewardsDistribution.computePlayerHash('Gabriel Jesus'),
    gabrielJesusAddress
  )
  await rewardsDistribution.linkPlayerToken(
    await rewardsDistribution.computePlayerHash('K. De Bruyne'),
    kevinDebruyneAddress
  )
  await rewardsDistribution.linkPlayerToken(
    await rewardsDistribution.computePlayerHash('Alisson Becker'),
    alissonBackerAddress
  )
  await rewardsDistribution.linkPlayerToken(
    await rewardsDistribution.computePlayerHash('V. van Dijk'),
    virgilVanDykAddress
  )

  console.log('Player tokens linked in distribution contract')
}

run()
