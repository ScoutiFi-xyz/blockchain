import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  TokenEmission,
  MockERC20
} from '../typechain-types'

describe('TokenEmission', () => {
  let token1: MockERC20
  let token2: MockERC20
  let tokenEmission: TokenEmission
  let owner

  const oneToHalfRatio = 500

  beforeEach(async () => {
    owner = (await ethers.getSigners())[0]

    const MockERC20Factory = await ethers.getContractFactory('MockERC20')
    token1 = await MockERC20Factory.deploy('Token One', 'T1', 6)
    token2 = await MockERC20Factory.deploy('Token Two', 'T2', 6)

    const tokenEmissionFactory = await ethers.getContractFactory('TokenEmission')
    tokenEmission = await tokenEmissionFactory.deploy(
      (await token1.getAddress()),
      (await token2.getAddress()),
      oneToHalfRatio
    )
  })

  it('deploys', async () => {
    expect(await tokenEmission.rate()).to.eq(oneToHalfRatio)
  })
})
