// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import "solmate/src/auth/Owned.sol";
import "solmate/src/tokens/ERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";
import "./PlayerApiAdapter.sol";
import "./PlayerToken.sol";

contract RewardsDistribution is Owned {
  using EnumerableMap for EnumerableMap.Bytes32ToAddressMap;

  struct Player {
    uint16 rating;
    uint64 ratedAt;
    uint256 updatedAt;
  }

  uint16 MAX_RATING = 1000;

  // claimable reward token
  ERC20 public rewardToken;

  // contract that will update player data (setPlayerRating caller)
  PlayerApiAdapter public feedAdapter;

  // amount of unclaimed reward tokens by player holder
  mapping(address => uint256) private unclaimed;

  // current rating of a given player by hash
  mapping(bytes32 => Player) private ratings;

  // token contract of a given player by hash
  EnumerableMap.Bytes32ToAddressMap private tokens;

  // addresses that should not receive rewards
  // platform service contracts should be set here (AMMs, Emission contracts)
  mapping(address => bool) private blacklist;

  event FeedAdapterChanged(address oldAdapter, address newAdapter);
  event PlayerRatingChanged(bytes32 playerHash, uint16 rating, uint64 ratedAt, uint256 updatedAt);
  event PlayerLinked(bytes32 playerHash, address playerToken);
  event PlayerUnlinked(bytes32 playerHash, address playerToken);
  event PlayerReward(address playerToken, uint256 amount);
  event Reward(address claimer, uint256 amount);

  constructor(address rewardTokenAddress)
    Owned(msg.sender) {
      rewardToken = ERC20(rewardTokenAddress);
  }

  modifier requireFeedAdapter() virtual {
    require(address(feedAdapter) != address(0), "NO_FEED_ADAPTER_SET");

    _;
  }

  /**
   * Get contract that updates player rating data
   */
  function getFeedAdapter() external view returns (address) {
    return address(feedAdapter);
  }

  /**
   * Change contract that updates player rating data
   */
  function setFeedAdapter(address adapterContract) external onlyOwner() {
    address oldAdapterAddress = address(feedAdapter);
    feedAdapter = PlayerApiAdapter(adapterContract);

    emit FeedAdapterChanged(oldAdapterAddress, address(feedAdapter));
  }

  /**
   * Skip address when distributing holder rewards.
   * It's share would be proportionally distributed among others from this point forward.
   */
  function revokeRewardRights(address holder) public onlyOwner() {
    blacklist[holder] = true;
  }

  /**
   * Distribute holder rewards to this address.
   * Enabled by default.
   */
  function grantRewardRights(address holder) public onlyOwner() {
    delete blacklist[holder];
  }

  /**
   * Compute hash that this contract uses internally to identify players
   */
  function computePlayerHash(string calldata names) external pure returns (bytes32) {
    return keccak256(abi.encodePacked(names));
  }

  /**
   * Link player token address with player hash.
   *
   * Needed for decoupling of player token contracts from player hashes.
   * This allows for:
   *  - update of a player-token mapping if name / data source changes
   *  - disable reward distribution for a given player if we need to for some reason
   */
  function linkPlayerToken(bytes32 playerHash, address playerToken) external onlyOwner() {
    tokens.set(playerHash, playerToken);

    emit PlayerLinked(playerHash, playerToken);
  }

  /**
   * Unlink player token address from player hash.
   */
  function unlinkPlayerToken(bytes32 playerHash) external onlyOwner() {
    address prevAddress = tokens.get(playerHash);
    tokens.remove(playerHash);

    emit PlayerUnlinked(playerHash, prevAddress);
  }

  /**
   * Get latest updated player rating.
   */
  function getPlayerRating(bytes32 playerHash) external view returns (Player memory) {
    return ratings[playerHash];
  }

  /**
   * Update player rating.
   * Callable only by feed adapter contract.
   */
  function setPlayerRating(
    bytes32 playerHash,
    uint16 rating,
    uint64 ratedAt
  ) external requireFeedAdapter() {
    require(msg.sender == address(feedAdapter), "UNAUTHORIZED");
    require(rating >= 0 && rating <= MAX_RATING, "INVALID_RATING");

    ratings[playerHash] = Player(rating, ratedAt, block.timestamp);

    emit PlayerRatingChanged(playerHash,rating, ratedAt, block.timestamp);
  }

  /**
   * Distribute reward tokens based on player token ownership and player rating.
   */
  function reward(uint256 amount) external {
    require(amount > 0, "INVALID_AMOUNT");

    // pull funds into this contract
    rewardToken.transferFrom(msg.sender, address(this), amount);
    uint256 leftover = amount;

    uint256 playersCount = tokens.length();
    require(playersCount > 0, "NO_TOKENS_LINKED");

    uint256 maxRewardPerPlayer = amount / playersCount;

    for (uint i=0; i < playersCount; i++) {
      (bytes32 playerHash, address tokenAddress) = tokens.at(i);
      if (
        // validate linked addresses
        tokenAddress == address(0) ||
        // filter players with ratings from the last 7 days
        ratings[playerHash].ratedAt < (block.timestamp - 604800) * 1000
      ) {
        continue;
      }

      uint256 rewardPerPlayerAssigned = (ratings[playerHash].rating * maxRewardPerPlayer) / MAX_RATING;

      PlayerToken token = PlayerToken(tokenAddress);
      address[] memory tokenHolders = token.getHolders();
      uint256 holdersCount = tokenHolders.length;

      // get holder balances
      address[] memory assignedReceivers = new address[](holdersCount);
      uint256[] memory assignedReceiversBalances = new uint256[](holdersCount);
      uint256 balancesSum = 0;
      for (uint h=0; h < holdersCount; h++) {
        uint256 holderBalance = token.balanceOf(tokenHolders[h]);

        if (
          // skip blacklisted holders
          blacklist[tokenHolders[h]] ||
          // double check holder balance
          holderBalance <= 0
        ) {
          assignedReceivers[h] = address(0);
          assignedReceiversBalances[h] = 0;
        } else {
          assignedReceivers[h] = tokenHolders[h];
          assignedReceiversBalances[h] = holderBalance;
          balancesSum += holderBalance;
        }
      }

      // assign reward
      for (uint r=0; r < assignedReceivers.length; r++) {
        if (assignedReceivers[r] == address(0)) {
          continue;
        }

        uint256 receiverReward = (rewardPerPlayerAssigned * assignedReceiversBalances[r]) / balancesSum;
        unclaimed[assignedReceivers[r]] += receiverReward;
        leftover -= receiverReward;
      }

      emit PlayerReward(tokenAddress, rewardPerPlayerAssigned);
    }

    // refund leftover amount
    rewardToken.transfer(msg.sender, leftover);
  }

  /**
   * Distribute custom individual reward for a holder.
   */
  function rewardTo(address claimer, uint256 amount) external {
    rewardToken.transfer(address(this), amount);

    unclaimed[claimer] += amount;
    emit Reward(claimer, amount);
  }

  /**
   * Amount of claimable reward token for a given address.
   */
  function claimable(address claimer) external view returns (uint256) {
    return unclaimed[claimer];
  }

  /**
   * Transfer all assigned rewards to function caller.
   */
  function claim() external {
    rewardToken.transfer(msg.sender, unclaimed[msg.sender]);
    delete unclaimed[msg.sender];
  }

  /**
   * Backdoor in case of emergencies, should never be used.
   */
  function claimOnBehalfOf(address claimer) external onlyOwner() {
    rewardToken.transfer(msg.sender, unclaimed[claimer]);
    delete unclaimed[claimer];
  }
}
