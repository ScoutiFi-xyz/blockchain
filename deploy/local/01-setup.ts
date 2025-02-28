import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import poolManagerAbi from '@uniswap/v4-core/out/PoolManager.sol/PoolManager.json'
import positionManagerAbi from '@uniswap/v4-periphery/foundry-out/PositionManager.sol/PositionManager.json'
import stateViewAbi from '@uniswap/v4-periphery/foundry-out/StateView.sol/StateView.json'
import universalRouterAbi from '@uniswap/universal-router/out/UniversalRouter.sol/UniversalRouter.json'
import unsupportedProtocolAbi from '@uniswap/universal-router/out/UnsupportedProtocol.sol/UnsupportedProtocol.json'
import * as permit2Abi from '../../permit2/permit2'

// setup code
// https://github.com/uniswapfoundation/v4-template/blob/main/script/Anvil.s.sol
// Note: this script does some testing along deployment of the contracts, we don't need to do this here as testing !== setup
//
// deploys all singleton protocol contracts that should already exist on all major live networks
// https://docs.uniswap.org/contracts/v4/deployments
const run = async () => {
  const [owner] = await ethers.getSigners()

  const permit2Address = await deployPermit2(owner)

  const poolManagerAddress = await deployPoolManager(owner)

  const positionManagerAddress = await deployPositionManager(owner, permit2Address, poolManagerAddress)

  await deployStateView(owner, poolManagerAddress)

  await deployUniversalRouter(owner, permit2Address, poolManagerAddress, positionManagerAddress)

  // not a part of the protocol, but these too should already exist on a live network
  await deployTestTokens(owner)
}

// https://github.com/Uniswap/permit2
const deployPermit2 = async (owner: HardhatEthersSigner): Promise<string> => {
  // ERC-20 approval contract deployed on every major network
  // deployed by compiled bytecode in the foundry script, does not look really cool, and it's anvil specific
  // https://github.com/uniswapfoundation/v4-template/blob/main/test/utils/forks/DeployPermit2.sol#L23
  // this deployment is from the creation code in etherscan
  const permit2Factory = new ethers.ContractFactory(
    permit2Abi.abi,
    permit2Abi.contractCreationCode,
    owner,
  )
  const permit2 = await permit2Factory.deploy()
  await permit2.waitForDeployment()
  const permit2Address = await permit2.getAddress()

  console.log(`const PERMIT2_ADDRESS = '${permit2Address}'`)

  return permit2Address
}

// https://docs.uniswap.org/contracts/v4/concepts/PoolManager
const deployPoolManager = async (owner: HardhatEthersSigner): Promise<string> => {
  const poolManagerFactory = new ethers.ContractFactory(
    poolManagerAbi.abi,
    poolManagerAbi.bytecode,
    owner,
  )
  // 0x address - no owner
  const poolManager = await poolManagerFactory.deploy(ethers.ZeroAddress)
  await poolManager.waitForDeployment()
  const address = await poolManager.getAddress()

  console.log(`const POOL_MANAGER_ADDRESS = '${address}'`)

  return address
}

// https://docs.uniswap.org/contracts/v4/reference/periphery/PositionManager
const deployPositionManager = async (
  owner: HardhatEthersSigner,
  permit2Address: string,
  poolManagerAddress: string,
): Promise<string> => {
  // deploy position manager
  // https://github.com/uniswapfoundation/v4-template/blob/main/script/Anvil.s.sol#L92
  const unsubscribeGasLimit = 300_000
  const positionDescriptorAddress = ethers.ZeroAddress
  const weth9Address = ethers.ZeroAddress

  const positionManagerFactory = new ethers.ContractFactory(
    positionManagerAbi.abi,
    positionManagerAbi.bytecode,
    owner,
  )
  const positionManager = await positionManagerFactory.deploy(
    poolManagerAddress,
    permit2Address,
    unsubscribeGasLimit,
    positionDescriptorAddress,
    weth9Address
  )
  await positionManager.waitForDeployment()
  const address = await positionManager.getAddress()

  console.log(`const POSITION_MANAGER_ADDRESS = '${address}'`)

  return address
}

const deployStateView = async (owner: HardhatEthersSigner, poolManagerAddress: string): Promise<string> => {
  const stateViewFactory = new ethers.ContractFactory(
    stateViewAbi.abi,
    stateViewAbi.bytecode,
    owner
  )
  const stateView = await stateViewFactory.deploy(
    poolManagerAddress
  )
  await stateView.waitForDeployment()
  const address = await stateView.getAddress()

  console.log(`const STATE_VIEW_ADDRESS = '${address}'`)

  return address
}

const deployUniversalRouter = async (
  owner: HardhatEthersSigner,
  permit2Address: string,
  poolManagerAddress: string,
  positionManagerAddress: string
) => {
  // deploy a special placeholder contracvt for unavailable router protocols
  const unsupportedProtocol = await (
    new ethers.ContractFactory(
      unsupportedProtocolAbi.abi,
      unsupportedProtocolAbi.bytecode,
      owner
    ).deploy()
  )
  await unsupportedProtocol.waitForDeployment()
  const unsupportedProtocolAddress = await unsupportedProtocol.getAddress()

  const universalRouterFactory = new ethers.ContractFactory(
    universalRouterAbi.abi,
    universalRouterAbi.bytecode,
    owner
  )
  const universalRouter = await universalRouterFactory.deploy({
    permit2: permit2Address,
    weth9: unsupportedProtocolAddress,
    v2Factory: unsupportedProtocolAddress,
    v3Factory: unsupportedProtocolAddress,
    pairInitCodeHash: '0x0000000000000000000000000000000000000000000000000000000000000000', // Note: contract create tx maybe? no idea
    poolInitCodeHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
    v4PoolManager: poolManagerAddress,
    v3NFTPositionManager: unsupportedProtocolAddress,
    v4PositionManager: positionManagerAddress
  })
  await universalRouter.waitForDeployment()
  const address = await universalRouter.getAddress()

  console.log(`const UNIVERSAL_ROUTER_ADDRESS = '${address}'`)

  return address
}

const deployTestTokens = async (owner: HardhatEthersSigner) => {
  const MockERC20Factory = await ethers.getContractFactory('MockERC20', owner)

  const mockUsdc = await MockERC20Factory.deploy('Gusi USD', 'USDG', 6)
  console.log(`const USDC_TOKEN_ADDRESS = '${await mockUsdc.getAddress()}'`)

  const mockEure = await MockERC20Factory.deploy('Gusi EUR', 'EURG', 6)
  console.log(`const EURE_TOKEN_ADDRESS = '${await mockEure.getAddress()}'`)
}

run()
