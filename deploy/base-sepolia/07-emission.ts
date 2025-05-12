import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const run = async () => {
  // owner must be deployer as he also mints the tokens
  const [owner] = await ethers.getSigners()

  await deployEmission(owner)
}

const PLAYER_TOKEN_ID = '6821c134164e26370ca5df7c'
const PLAYER_TOKEN_ADDRESS = '0x712C2d3dde8DE454a7aA014D21073Cb4777c519F'
const STABLECOIN_ADDRESS = '0x6C8374476006Bc20588Ebc6bEaBf1b7B05aD5925'

const deployEmission = async (deployer: HardhatEthersSigner) => {
  const rate = 500 // 0.5 eur per player token
  const emission = 100

  const TokenEmissionFactory = await ethers.getContractFactory('TokenEmission', deployer)
  const tokenEmission = await TokenEmissionFactory.deploy(
    PLAYER_TOKEN_ADDRESS,
    STABLECOIN_ADDRESS,
    rate
  )
  await tokenEmission.waitForDeployment()

  const emissions = []
  const emissionAddress = await tokenEmission.getAddress()

  const playerToken = await ethers.getContractAt('ERC20', PLAYER_TOKEN_ADDRESS)

  await playerToken.transfer(emissionAddress, ethers.parseUnits(emission.toString(), 6))

  emissions.push({
    token: { $oid: PLAYER_TOKEN_ID },
    emissionAddress,
    rate,
    emission,
    active: true
  })
  console.log(JSON.stringify(emissions, null, 2))
}

run()
