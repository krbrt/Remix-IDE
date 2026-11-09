// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IRewardPoints.sol";

contract RewardPoints is IRewardPoints, Ownable, AccessControl, Pausable, ReentrancyGuard {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 public constant TIER_BRONZE = 0;
    uint8 public constant TIER_SILVER = 1;
    uint8 public constant TIER_GOLD = 2;
    uint8 public constant TIER_PLATINUM = 3;

    uint256 public constant TIER_SILVER_THRESHOLD = 1_000;
    uint256 public constant TIER_GOLD_THRESHOLD = 10_000;
    uint256 public constant TIER_PLATINUM_THRESHOLD = 100_000;

    uint256 public constant TIER_BRONZE_MULTIPLIER = 10_000;
    uint256 public constant TIER_SILVER_MULTIPLIER = 12_000;
    uint256 public constant TIER_GOLD_MULTIPLIER = 15_000;
    uint256 public constant TIER_PLATINUM_MULTIPLIER = 20_000;

    uint256 public minRedemption;
    uint256 public multiplier;

    mapping(address => uint256) public totalPointsEarned;
    mapping(address => uint256) public balanceOf;
    mapping(address => uint8) public userTier;

    constructor() Ownable(msg.sender) {
        minRedemption = 100;
        multiplier = 10_000;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    modifier onlyMinterOrOwner() {
        require(
            hasRole(MINTER_ROLE, msg.sender) || owner() == msg.sender,
            "RewardPoints: caller must have minter role or be owner"
        );
        _;
    }

    /**
     * @dev Returns the current tier of a user.
     * @param user The address to check
     * @return tier The current tier (0=Bronze, 1=Silver, 2=Gold, 3=Platinum)
     */
    function getTier(address user) external view override returns (uint8) {
        return userTier[user];
    }

    /**
     * @dev Returns the multiplier for a given tier in basis points.
     * @param tier The tier to get multiplier for
     * @return tierMultiplier The multiplier in basis points (10000 = 1x)
     */
    function getTierMultiplier(uint8 tier) external view override returns (uint256) {
        return _getTierMultiplier(tier);
    }

    /**
     * @dev Returns the points threshold required for a given tier.
     * @param tier The tier to get threshold for
     * @return threshold The points threshold
     */
    function getTierThreshold(uint8 tier) external view override returns (uint256) {
        if (tier == TIER_PLATINUM) return TIER_PLATINUM_THRESHOLD;
        if (tier == TIER_GOLD) return TIER_GOLD_THRESHOLD;
        if (tier == TIER_SILVER) return TIER_SILVER_THRESHOLD;
        return 0;
    }

    /**
     * @dev Returns the current global multiplier in basis points.
     * @return multiplier The global multiplier (10000 = 1x)
     */
    function getMultiplier() external view override returns (uint256) {
        return multiplier;
    }

    /**
     * @dev Returns the current minimum redemption threshold.
     * @return minRedemption The minimum redemption amount
     */
    function getMinRedemption() external view override returns (uint256) {
        return minRedemption;
    }

    // ========== Internal Functions ==========

    function _getTierFromPoints(uint256 points) internal pure returns (uint8) {
        if (points >= TIER_PLATINUM_THRESHOLD) return TIER_PLATINUM;
        if (points >= TIER_GOLD_THRESHOLD) return TIER_GOLD;
        if (points >= TIER_SILVER_THRESHOLD) return TIER_SILVER;
        return TIER_BRONZE;
    }

    function _getTierMultiplier(uint8 tier) internal pure returns (uint256) {
        if (tier == TIER_PLATINUM) return TIER_PLATINUM_MULTIPLIER;
        if (tier == TIER_GOLD) return TIER_GOLD_MULTIPLIER;
        if (tier == TIER_SILVER) return TIER_SILVER_MULTIPLIER;
        return TIER_BRONZE_MULTIPLIER;
    }

    // ========== Earning Points ==========

    /**
     * @dev Awards points to a user. Callable by owner or minter role.
     * Points are multiplied by the global multiplier and the user's tier multiplier.
     * Emits PointsEarned and TierChanged events if applicable.
     *
     * @param user The address to award points to
     * @param amount The base amount of points to award (before multipliers)
     */
    function earnPoints(address user, uint256 amount) external whenNotPaused onlyMinterOrOwner {
        require(user != address(0), "RewardPoints: invalid user");
        require(amount > 0, "RewardPoints: amount must be greater than 0");

        uint8 oldTier = userTier[user];

        uint256 tierMult = _getTierMultiplier(oldTier);
        uint256 totalMultiplier = (multiplier * tierMult) / 10_000;

        uint256 earnedAmount = (amount * totalMultiplier) / 10_000;

        totalPointsEarned[user] += earnedAmount;
        balanceOf[user] += earnedAmount;

        uint8 newTier = _getTierFromPoints(totalPointsEarned[user]);

        if (newTier != oldTier) {
            userTier[user] = newTier;
            emit TierChanged(user, oldTier, newTier);
        }

        emit PointsEarned(user, earnedAmount, newTier);
    }

    /**
     * @dev Redeems points for rewards. Callable by the point holder.
     * Requires amount to be >= minRedemption and user to have sufficient balance.
     * Protected against reentrancy attacks.
     *
     * @param amount The amount of points to redeem
     */
    function redeemPoints(uint256 amount) external whenNotPaused nonReentrant {
        require(amount > 0, "RewardPoints: amount must be greater than 0");
        require(amount >= minRedemption, "RewardPoints: amount below minimum redemption");
        require(balanceOf[msg.sender] >= amount, "RewardPoints: insufficient balance");

        balanceOf[msg.sender] -= amount;

        emit PointsRedeemed(msg.sender, amount);
    }

    /**
     * @dev Sets the global earning multiplier in basis points (10000 = 1x).
     * Callable only by the owner.
     *
     * @param newMultiplier The new multiplier value in basis points
     */
    function setMultiplier(uint256 newMultiplier) external onlyOwner {
        require(newMultiplier > 0, "RewardPoints: multiplier must be greater than 0");
        require(newMultiplier <= 100_000, "RewardPoints: multiplier too high (max 10x)");

        multiplier = newMultiplier;
        emit MultiplierUpdated(newMultiplier);
    }

    /**
     * @dev Sets the minimum redemption threshold.
     * Callable only by the owner.
     *
     * @param amount The new minimum redemption amount
     */
    function setMinRedemption(uint256 amount) external onlyOwner {
        minRedemption = amount;
    }

    /**
     * @dev Pauses all user-facing functions. Callable only by the owner.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpauses all user-facing functions. Callable only by the owner.
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}