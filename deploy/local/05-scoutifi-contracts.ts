import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import playerTokenAbi from '../../artifacts/contracts/PlayerToken.sol/PlayerToken.json'

const testPlayers = [{
  name: 'Martin Velichkov',
  ticker: 'MVCH',
  ico: 1_000
}, {
  name: 'Marin Petkov',
  ticker: 'MPTK',
  ico: 5_000
}, {
  name: 'Vasil Panayotov',
  ticker: 'VPNT',
  ico: 2_000
}]

const run = async () => {
  const [owner] = await ethers.getSigners()

  await deployPlatformToken(owner)
  await deployPlayerTokens(owner)
}

const deployPlatformToken = async (owner: HardhatEthersSigner) => {
  const scoutTokenFactory = await ethers.getContractFactory('ScoutiToken', owner)
  const scoutToken = await scoutTokenFactory.deploy()
  await scoutToken.waitForDeployment()
  const address = await scoutToken.getAddress()

  console.log(`const PLATFORM_TOKEN_ADDRESS = '${address}'`)
}

const deployPlayerTokens = async (owner: HardhatEthersSigner) => {
  const playerTokenFactory = await (await ethers.getContractFactory('PlayerTokenFactory', owner)).deploy()
  await playerTokenFactory.waitForDeployment()
  const playerTokenFactoryAddress = await playerTokenFactory.getAddress()

  console.log(`const PLAYER_TOKEN_FACTORY_ADDRESS = '${playerTokenFactoryAddress}'`)

  const tx1 = await playerTokenFactory.createToken('MVCH', ethers.parseUnits('1000', 6))
  const receipt1 = await tx1.wait()
  console.log(`Player 1: ${receipt1?.status === 1 ? '✓' : '✗'}`)
  const tx2 = await playerTokenFactory.createToken('MPTK', ethers.parseUnits('5000', 6))
  const receipt2 = await tx2.wait()
  console.log(`Player 2: ${receipt2?.status === 1 ? '✓' : '✗'}`)
  const tx3 = await playerTokenFactory.createToken('VPNT', ethers.parseUnits('2000', 6))
  const receipt3 = await tx3.wait()
  console.log(`Player 3: ${receipt3?.status === 1 ? '✓' : '✗'}`)

  const martinVelichkov = new ethers.Contract(
    await playerTokenFactory.getTokenAddress('MVCH'),
    playerTokenAbi.abi,
    owner
  )
  const marinPetkov = new ethers.Contract(
    await playerTokenFactory.getTokenAddress('MPTK'),
    playerTokenAbi.abi,
    owner
  )
  const vasilPanayotov = new ethers.Contract(
    await playerTokenFactory.getTokenAddress('VPNT'),
    playerTokenAbi.abi,
    owner
  )

  console.table({
    martinVelichkov: ethers.formatUnits(await martinVelichkov.balanceOf(owner), 6),
    marinPetkov: ethers.formatUnits(await marinPetkov.balanceOf(owner), 6),
    vasilPanayotov: ethers.formatUnits(await vasilPanayotov.balanceOf(owner), 6)
  })
}

run()
