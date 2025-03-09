import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const run = async () => {
  // Must be deployed by Owner
  const [owner] = await ethers.getSigners()

  await deployPlatformToken(owner)
  await deployPlayerTokenFactory(owner)
}

const deployPlatformToken = async (owner: HardhatEthersSigner) => {
  const scoutTokenFactory = await ethers.getContractFactory('ScoutiToken', owner)
  const scoutToken = await scoutTokenFactory.deploy()
  await scoutToken.waitForDeployment()

  const address = await scoutToken.getAddress()
  console.log(`PLATFORM_TOKEN_ADDRESS: '${address}'`)
}


const deployPlayerTokenFactory = async (owner: HardhatEthersSigner) => {
  const playerTokenFactory = await (
    await ethers.getContractFactory('PlayerTokenFactory', owner)
  ).deploy()
  await playerTokenFactory.waitForDeployment()

  const playerTokenFactoryAddress = await playerTokenFactory.getAddress()
  console.log(`PLAYER_TOKEN_FACTORY_ADDRESS: '${playerTokenFactoryAddress}'`)
}

run()
