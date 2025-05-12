import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import playerTokenFactoryConfig from '../../artifacts/contracts/PlayerTokenFactory.sol/PlayerTokenFactory.json'
import rewardsDistributionConfig from '../../artifacts/contracts/RewardsDistribution.sol/RewardsDistribution.json'
import { BASE_SEPOLIA } from '../config'

const players = [{
  id: '681e2698164e26370ca5df0a',
  tokenSymbol: 'SF-NCO',
  externalName: 'Nnamdi Chinonso Offor',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df06',
  tokenSymbol: 'SF-MAP',
  externalName: 'Marin Petkov',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df0c',
  tokenSymbol: 'SF-MAV',
  externalName: 'Martin Velichkov',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df0f',
  tokenSymbol: 'SF-MZS',
  externalName: 'Mazire Soula',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df09',
  tokenSymbol: 'SF-JME',
  externalName: 'James Eto\'o',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df0d',
  tokenSymbol: 'SF-IVP',
  externalName: 'Ivelin Popov',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df10',
  tokenSymbol: 'SF-SON',
  externalName: 'Son',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df08',
  tokenSymbol: 'SF-STS',
  externalName: 'Stanislav Shopov',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df0b',
  tokenSymbol: 'SF-LRG',
  externalName: 'Leandro Godoy',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df0e',
  tokenSymbol: 'SF-VIP',
  externalName: 'Viktor Popov',
  icoValue: '1000'
}, {
  id: '681e2698164e26370ca5df07',
  tokenSymbol: 'SF-WTS',
  externalName: 'Wenderson Tsunami',
  icoValue: '1000'
}]

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
  for (const player of players) {
    await (
      await playerTokenFactory.createToken(
        player.tokenSymbol,
        ethers.parseUnits(player.icoValue, 6)
      )
    ).wait()
  }

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

  const playerTokens = []

  // link to distribution contract
  for (const player of players) {
    const playerHash = await rewardsDistribution.computePlayerHash(player.externalName)
    const address = await playerTokenFactory.getTokenAddress(player.tokenSymbol)

    await rewardsDistribution.linkPlayerToken(playerHash, address)

    playerTokens.push({
      player: { $oid: player.id },
      symbol: player.tokenSymbol,
      address,
      linkedHash: playerHash
    })
  }

  console.log('Player tokens linked in distribution contract')

  console.log('PlayerToken records to import in db')
  console.log(JSON.stringify(playerTokens, null, 2))
}

run()
