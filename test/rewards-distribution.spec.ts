import { ethers } from 'hardhat'
import { expect } from 'chai'
import {
  ScoutiToken,
  RewardsDistribution,
  PlayerApiAdapter,
  MockFeedAdapter,
  PlayerTokenFactory,
  PlayerToken
} from '../typechain-types'
import playerTokenConfig from '../artifacts/contracts/PlayerToken.sol/PlayerToken.json'

describe('RewardsDistribution', () => {
  let platformToken: ScoutiToken
  let rewardsDistribution: RewardsDistribution
  let feedAdapter: PlayerApiAdapter
  let mockFeedAdapter: MockFeedAdapter
  let owner

  beforeEach(async () => {
    owner = (await ethers.getSigners())[0]

    const platforTokenFactory = await ethers.getContractFactory('ScoutiToken')
    platformToken = await platforTokenFactory.deploy()

    const rewardsDistributionFactory = await ethers.getContractFactory('RewardsDistribution')
    rewardsDistribution = await rewardsDistributionFactory.deploy(
      await platformToken.getAddress()
    )
    expect(await rewardsDistribution.getAddress()).to.exist

    const feedAdapterFactory = await ethers.getContractFactory('PlayerApiAdapter')
    feedAdapter = await feedAdapterFactory.deploy(ethers.ZeroAddress, await rewardsDistribution.getAddress())

    const mockFeedAdapterFactory = await ethers.getContractFactory('MockFeedAdapter')
    mockFeedAdapter = await mockFeedAdapterFactory.deploy(await rewardsDistribution.getAddress())
  })

  it('deploys contract', async () => {
    expect(await rewardsDistribution.rewardToken()).to.eq(await platformToken.getAddress())
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

  it.only('invest - reward flow', async () => {
    // set token holdings
    const [owner, feeWallet, holder1, holder2] = await ethers.getSigners()
    await platformToken.mint(feeWallet, 10_000)

    const playerTokenFactory: PlayerTokenFactory = await (
      await ethers.getContractFactory('PlayerTokenFactory')
    ).deploy()
    await playerTokenFactory.createToken('GK', 10_000)
    await playerTokenFactory.createToken('EB', 10_000)
    const gkToken = new ethers.Contract(
      await playerTokenFactory.getTokenAddress('GK'),
      playerTokenConfig.abi,
      owner
    ) as unknown as PlayerToken
    const ebToken: PlayerToken = new ethers.Contract(
      await playerTokenFactory.getTokenAddress('EB'),
      playerTokenConfig.abi,
      owner
    ) as unknown as PlayerToken

    await gkToken.transfer(holder1, 10_000)
    await ebToken.transfer(holder1, 2_500)
    await ebToken.transfer(holder2, 7_500)

    // link into distribution contract
    const kolevHash = await rewardsDistribution.computePlayerHash('Georgi Kolev')
    const balaHash = await rewardsDistribution.computePlayerHash('Everton Bala')
    await rewardsDistribution.linkPlayerToken(kolevHash, await gkToken.getAddress())
    await rewardsDistribution.linkPlayerToken(balaHash, await ebToken.getAddress())

    // set player ratings
    await rewardsDistribution.setFeedAdapter(await mockFeedAdapter.getAddress())
    await mockFeedAdapter.fulfillRequest(kolevHash, 470, BigInt(Date.now() - 24 * 60 * 60 * 1000))

    await rewardsDistribution.setFeedAdapter(await mockFeedAdapter.getAddress())
    await mockFeedAdapter.fulfillRequest(balaHash, 780, BigInt(Date.now() - 12 * 60 * 60 * 1000))

    // assert no claimable
    expect(
      await rewardsDistribution.claimable(holder1)
    ).to.eq(0)
    expect(
      await rewardsDistribution.claimable(holder2)
    ).to.eq(0)

    // allow rewards contract to spend feeWallet platform tokens
    await platformToken.connect(feeWallet).approve(await rewardsDistribution.getAddress(), 1000)

    // run
    await rewardsDistribution.connect(feeWallet).reward(1000)

    // assert claimable
    expect(
      await rewardsDistribution.claimable(holder1)
    ).to.eq(
      332 // (500 * 0.47) + (500 * 0.25 * 0.78)
    )
    expect(
      await rewardsDistribution.claimable(holder2)
    ).to.eq(
      292 // 500 * 0.75 * 0.78
    )
    expect(
      await platformToken.balanceOf(await rewardsDistribution.getAddress())
    ).to.eq(
      624 // claimable rewards are collateralized
    )
    expect(
      await platformToken.balanceOf(feeWallet)
    ).to.eq(
      9376 // not spend + remainder from reward operation returned back
    )

    // claim
    await rewardsDistribution.connect(holder1).claim()

    // assert claimed
    expect(
      await platformToken.balanceOf(holder1)
    ).to.eq(
      332
    )

    // assert claimed no longer claimable
    expect(
      await rewardsDistribution.claimable(holder1)
    ).to.eq(
      0
    )
  })
})
