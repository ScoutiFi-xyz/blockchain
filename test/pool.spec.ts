import { ethers } from 'hardhat'
import { expect } from 'chai'
// import { PoolKey } from '@uniswap/v4-core/src/types/PoolKey.sol'

describe('Token contract', function () {
  it('initializes pool', async function () {
    const [owner] = await ethers.getSigners()

    const MockERC20Factory = await ethers.getContractFactory('MockERC20')
    const mockUsdc = await MockERC20Factory.deploy('Circle USD', 'USDC', 6)
    console.log(`const USDC_TOKEN_ADDRESS = '${await mockUsdc.getAddress()}'`)
  })
})
