import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const run = async () => {
  // owner must be deployer as he also mints the tokens
  const [owner] = await ethers.getSigners()

  await deployEmission(owner)
}

const SFASB_ADDRESS = '0x619755E5D7933adf671BC75BA2407bA6930766C4'
const STABLECOIN_ADDRESS = '0x6C8374476006Bc20588Ebc6bEaBf1b7B05aD5925'

const deployEmission = async (deployer: HardhatEthersSigner) => {
  const rate = 500 // 0.5 eur per player token

  const TokenEmissionFactory = await ethers.getContractFactory('TokenEmission', deployer)
  const tokenEmission = await TokenEmissionFactory.deploy(
    SFASB_ADDRESS,
    STABLECOIN_ADDRESS,
    rate
  )
  await tokenEmission.waitForDeployment()

  const emissionAddress = await tokenEmission.getAddress()
  console.log(`TOKEN_EMISSION_ADDRESS_SFASB: '${emissionAddress}'`)

  const sfasbToken = await ethers.getContractAt('ERC20', SFASB_ADDRESS)

  await sfasbToken.transfer(emissionAddress, ethers.parseUnits('100', 6))
}

run()
