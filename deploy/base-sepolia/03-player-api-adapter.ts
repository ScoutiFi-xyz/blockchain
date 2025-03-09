import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import { BASE_SEPOLIA } from '../config'

const run = async () => {
  // Must be deployed by Fee Wallet as later it would be the one requesting Chainlink data updates
  const [_, feeWallet] = await ethers.getSigners()

  await deployPlayerApiAdapter(feeWallet)
}

const deployPlayerApiAdapter = async (deployer: HardhatEthersSigner) => {
  const playerApiAdapterFactory = await ethers.getContractFactory('PlayerApiAdapter', deployer)
  const playerApiAdapter = await playerApiAdapterFactory.deploy(
    BASE_SEPOLIA.CHAINLINK_FUNCTIONS_ROUTER_ADDRESS,
    BASE_SEPOLIA.REWARDS_DISTRIBUTION_ADDRESS
  )

  await playerApiAdapter.waitForDeployment()
  console.log(`PLAYER_API_ADAPTER_ADDRESS: '${await playerApiAdapter.getAddress()}'`)
}

run()
