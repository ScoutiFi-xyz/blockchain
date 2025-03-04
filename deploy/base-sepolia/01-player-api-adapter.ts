import { ethers } from 'hardhat'

// for base sepolia
const CHAINLINK_ROUTER_ADDRESS = '0xf9B8fc078197181C841c296C876945aaa425B278'

// Must be deployed by Fee Wallet as later it would be the one requesting Chainlink data updates
const run = async () => {
  const playerApiAdapterFactory = await ethers.getContractFactory('PlayerApiAdapter')
  const playerApiAdapter = await playerApiAdapterFactory.deploy(CHAINLINK_ROUTER_ADDRESS)

  console.log('Deploying...')
  await playerApiAdapter.waitForDeployment()
  console.log(`const PLAYER_API_ADAPTER_ADDRESS = '${await playerApiAdapter.getAddress()}'`)
}

run()
