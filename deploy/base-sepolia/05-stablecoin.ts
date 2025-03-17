import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const run = async () => {
  const [owner] = await ethers.getSigners()

  await deployAndMintStablecoin(owner)
}

const deployAndMintStablecoin = async (owner: HardhatEthersSigner) => {
  const MockERC20Factory = await ethers.getContractFactory('MockERC20', owner)

  const mockEure = await MockERC20Factory.deploy('Gusi EUR', 'EURG', 6)
  console.log(`STABLECOIN_TOKEN_ADDRESS: '${await mockEure.getAddress()}'`)

  await mockEure.mint(owner, ethers.parseUnits('100000', 6))
}

run()
