import { ethers } from 'hardhat'
import { expect } from 'chai'
import { MockERC20, RewardsDistribution, PlayerApiAdapter, MockFeedAdapter } from '../typechain-types'

describe.only('RewardsDistribution', () => {
  let testToken: MockERC20
  let rewardsDistribution: RewardsDistribution
  let feedAdapter: PlayerApiAdapter
  let mockFeedAdapter: MockFeedAdapter
  let owner

  beforeEach(async () => {
    owner = (await ethers.getSigners())[0]

    const testTokenFactory = await ethers.getContractFactory('MockERC20')
    testToken = await testTokenFactory.deploy('Test USD', 'USDC', 6)

    const rewardsDistributionFactory = await ethers.getContractFactory('RewardsDistribution')
    rewardsDistribution = await rewardsDistributionFactory.deploy(
      await testToken.getAddress()
    )
    expect(await rewardsDistribution.getAddress()).to.exist

    const feedAdapterFactory = await ethers.getContractFactory('PlayerApiAdapter')
    feedAdapter = await feedAdapterFactory.deploy(ethers.ZeroAddress, await rewardsDistribution.getAddress())

    const mockFeedAdapterFactory = await ethers.getContractFactory('MockFeedAdapter')
    mockFeedAdapter = await mockFeedAdapterFactory.deploy(await rewardsDistribution.getAddress())
  })

  it('deploys contract', async () => {
    expect(await rewardsDistribution.rewardToken()).to.eq(await testToken.getAddress())
  })

  it('sets adapter contract', async () => {
    expect(await rewardsDistribution.getFeedAdapter()).to.eq(ethers.ZeroAddress)

    await rewardsDistribution.setFeedAdapter(await feedAdapter.getAddress())

    expect(await rewardsDistribution.getFeedAdapter()).to.eq(await feedAdapter.getAddress())
  })

  it('computes player hash from names', async () => {
    const names = 'Iliyan Stefanov'
    const hashFromContract = await rewardsDistribution.computePlayerHash(names)
    expect(ethers.keccak256(ethers.toUtf8Bytes(names))).to.eq(hashFromContract)
  })

  it('sets player rating', async () => {
    const hash = await rewardsDistribution.computePlayerHash('Georgi Kolev')

    // Note: we can't call setPlayerRating directly, so we call it through the mock contract
    await rewardsDistribution.setFeedAdapter(await mockFeedAdapter.getAddress())
    await mockFeedAdapter.fulfillRequest(hash, 690, BigInt(1741383730714))

    const [rating, ratedAt, updatedAt] = await rewardsDistribution.getPlayerRating(hash)
    expect(rating).to.eq(BigInt(690))
    expect(ratedAt).to.eq(BigInt(1741383730714))
    expect(updatedAt).to.exist
  })
})
