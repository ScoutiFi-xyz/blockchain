// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../RewardsDistribution.sol";

contract MockFeedAdapter {
  RewardsDistribution public rewardsDistribution;

  constructor(address rewardsDistributionAddress) {
    rewardsDistribution = RewardsDistribution(rewardsDistributionAddress);
  }

  function fulfillRequest(bytes32 playerHash, uint16 rating, uint64 ratedAt) external {
    rewardsDistribution.setPlayerRating(playerHash, rating, ratedAt);
  }
}
