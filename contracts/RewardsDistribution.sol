// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import "solmate/src/auth/Owned.sol";
import "solmate/src/tokens/ERC20.sol";
import "./PlayerApiAdapter.sol";

contract RewardsDistribution is Owned {
  struct Player {
    uint16 rating;
    uint64 ratedAt;
    uint256 updatedAt;
  }

  ERC20 public rewardToken;
  PlayerApiAdapter public feedAdapter;

  mapping(address => uint256) private unclaimed;
  mapping(bytes32 => Player) private ratings;

  event FeedAdapterChanged(address oldAdapter, address newAdapter);
  event PlayerRatingChanged(bytes32 playerHash, uint16 rating, uint64 ratedAt, uint256 updatedAt);

  constructor(address rewardTokenAddress)
    Owned(msg.sender) {
      rewardToken = ERC20(rewardTokenAddress);
  }

  modifier requireFeedAdapter() virtual {
    require(address(feedAdapter) != address(0), "NO_FEED_ADAPTER_SET");

    _;
  }

  function getFeedAdapter() external view returns (address) {
    return address(feedAdapter);
  }

  function setFeedAdapter(address adapterContract) external onlyOwner() {
    address oldAdapterAddress = address(feedAdapter);
    feedAdapter = PlayerApiAdapter(adapterContract);

    emit FeedAdapterChanged(oldAdapterAddress, address(feedAdapter));
  }

  function computePlayerHash(string calldata names) external pure returns (bytes32) {
    return keccak256(abi.encodePacked(names));
  }

  function getPlayerRating(bytes32 playerHash) external view returns (Player memory) {
    return ratings[playerHash];
  }

  function setPlayerRating(
    bytes32 playerHash,
    uint16 rating,
    uint64 ratedAt
  ) external requireFeedAdapter() {
    require(msg.sender == address(feedAdapter), "UNAUTHORIZED");

    ratings[playerHash] = Player(rating, ratedAt, block.timestamp);

    emit PlayerRatingChanged(playerHash,rating, ratedAt, block.timestamp);
  }
}

// function reward(amount uint256)
// emit event for each player distibution, so we know how much rewards we've paid per player
// open for everyone
// player stats matter only if the user owns a given player at the time of distribution (like stock dividends)
// claim action will transfer the assigned share of funds from contract to tx caller wallet

// function rewardTo(amount uint256)
// in case of a custom rewardable event happened
// open for everyone

// function withdrawFrom(user address)
//  from user
//  backdoor in case of emergencies, but should never really be used
// only owner

// function claimable(address)
// open for everyone
// returns total rewards claimable

// function claim
// open for everyone
