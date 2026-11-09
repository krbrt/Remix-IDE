// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRewardPoints
 * @dev Interface for the RewardPoints contract.
 * Defines all external functions, events, and errors for the Reward Points System.
 */
interface IRewardPoints {
    // ========== Events ==========

    /// @notice Emitted when points are earned by a user
    event PointsEarned(address indexed user, uint256 amount, uint8 tier);

    /// @notice Emitted when points are redeemed by a user
    event PointsRedeemed(address indexed user, uint256 amount);

    /// @notice Emitted when a user's tier changes
    event TierChanged(address indexed user, uint8 oldTier, uint8 newTier);

    /// @notice Emitted when the global multiplier is updated by the owner
    event MultiplierUpdated(uint256 newMultiplier);

    // ========== External Functions ==========

    /// @notice Awards points to a user (callable by owner or minter role)
    /// @param user The address to award points to
    /// @param amount The base amount of points to award (before multiplier)
    function earnPoints(address user, uint256 amount) external;

    /// @notice Redeems points for rewards (callable by the point holder)
    /// @param amount The amount of points to redeem
    function redeemPoints(uint256 amount) external;

    /// @notice Sets the global earning multiplier (basis points, 10000 = 1x)
    /// @param newMultiplier The new multiplier value
    function setMultiplier(uint256 newMultiplier) external;

    /// @notice Sets the minimum redemption threshold
    /// @param amount The new minimum redemption amount
    function setMinRedemption(uint256 amount) external;

    /// @notice Pauses all user-facing functions
    function pause() external;

    /// @notice Unpauses all user-facing functions
    function unpause() external;

    // ========== View Functions ==========

    /// @notice Returns the current tier of a user
    /// @param user The address to check
    /// @return tier The current tier (0=Bronze, 1=Silver, 2=Gold, 3=Platinum)
    function getTier(address user) external view returns (uint8);

    /// @notice Returns the total points earned by a user (lifetime)
    /// @param user The address to check
    /// @return totalPoints Total lifetime points earned
    function totalPointsEarned(address user) external view returns (uint256);

    /// @notice Returns the current redeemable points balance of a user
    /// @param user The address to check
    /// @return balance Current redeemable points balance
    function balanceOf(address user) external view returns (uint256);

    /// @notice Returns the current global multiplier (basis points)
    function getMultiplier() external view returns (uint256);

    /// @notice Returns the current minimum redemption threshold
    function getMinRedemption() external view returns (uint256);

    /// @notice Returns the multiplier for a given tier (basis points)
    /// @param tier The tier to get multiplier for
    function getTierMultiplier(uint8 tier) external view returns (uint256);

    /// @notice Returns the points threshold required for a given tier
    /// @param tier The tier to get threshold for
    function getTierThreshold(uint8 tier) external view returns (uint256);
}