const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RewardPoints", function () {
  let rewardPoints;
  let owner;
  let minter;
  let user1;
  let user2;

  const TIER_BRONZE = 0;
  const TIER_SILVER = 1;
  const TIER_GOLD = 2;
  const TIER_PLATINUM = 3;

  beforeEach(async function () {
    [owner, minter, user1, user2] = await ethers.getSigners();

    const RewardPoints = await ethers.getContractFactory("RewardPoints");
    rewardPoints = await RewardPoints.deploy();
    await rewardPoints.waitForDeployment();

    await rewardPoints.grantRole(await rewardPoints.MINTER_ROLE(), minter.address);
  });

  describe("Deployment", function () {
    it("should set the deployer as owner", async function () {
      expect(await rewardPoints.owner()).to.equal(owner.address);
    });

    it("should set default min redemption to 100", async function () {
      expect(await rewardPoints.getMinRedemption()).to.equal(100);
    });

    it("should set default multiplier to 10000 (1x)", async function () {
      expect(await rewardPoints.getMultiplier()).to.equal(10000);
    });

    it("should grant minter role to owner", async function () {
      expect(await rewardPoints.hasRole(await rewardPoints.MINTER_ROLE(), owner.address)).to.be.true;
    });

    it("should have users start at Bronze tier", async function () {
      expect(await rewardPoints.getTier(user1.address)).to.equal(TIER_BRONZE);
    });
  });

  describe("Earn Points", function () {
    it("should allow owner to earn points", async function () {
      const amount = 500;
      await rewardPoints.earnPoints(user1.address, amount);

      expect(await rewardPoints.balanceOf(user1.address)).to.equal(amount);
      expect(await rewardPoints.totalPointsEarned(user1.address)).to.equal(amount);
      expect(await rewardPoints.getTier(user1.address)).to.equal(TIER_BRONZE);
    });

    it("should allow minter to earn points", async function () {
      const amount = 500;
      await rewardPoints.connect(minter).earnPoints(user1.address, amount);

      expect(await rewardPoints.balanceOf(user1.address)).to.equal(amount);
      expect(await rewardPoints.totalPointsEarned(user1.address)).to.equal(amount);
    });

    it("should revert if earning to zero address", async function () {
      await expect(
        rewardPoints.earnPoints(ethers.ZeroAddress, 500)
      ).to.be.revertedWith("RewardPoints: invalid user");
    });

    it("should revert if earning zero amount", async function () {
      await expect(
        rewardPoints.earnPoints(user1.address, 0)
      ).to.be.revertedWith("RewardPoints: amount must be greater than 0");
    });

    it("should emit PointsEarned event", async function () {
      await expect(rewardPoints.earnPoints(user1.address, 500))
        .to.emit(rewardPoints, "PointsEarned")
        .withArgs(user1.address, 500, TIER_BRONZE);
    });

    it("should emit TierChanged event on tier upgrade", async function () {
      await expect(rewardPoints.earnPoints(user1.address, 1500))
        .to.emit(rewardPoints, "TierChanged")
        .withArgs(user1.address, TIER_BRONZE, TIER_SILVER);
    });
  });

  describe("Redeem Points", function () {
    beforeEach(async function () {
      await rewardPoints.earnPoints(user1.address, 5000);
    });

    it("should allow user to redeem points above minimum", async function () {
      await rewardPoints.connect(user1).redeemPoints(500);

      expect(await rewardPoints.balanceOf(user1.address)).to.equal(4500);
    });

    it("should revert if redeeming below minimum threshold", async function () {
      await expect(
        rewardPoints.connect(user1).redeemPoints(50)
      ).to.be.revertedWith("RewardPoints: amount below minimum redemption");
    });

    it("should revert if redeeming more than balance", async function () {
      await expect(
        rewardPoints.connect(user1).redeemPoints(5001)
      ).to.be.revertedWith("RewardPoints: insufficient balance");
    });

    it("should revert if redeeming zero amount", async function () {
      await expect(
        rewardPoints.connect(user1).redeemPoints(0)
      ).to.be.revertedWith("RewardPoints: amount must be greater than 0");
    });

    it("should emit PointsRedeemed event", async function () {
      await expect(rewardPoints.connect(user1).redeemPoints(500))
        .to.emit(rewardPoints, "PointsRedeemed")
        .withArgs(user1.address, 500);
    });

    it("should allow redeeming exactly the minimum amount", async function () {
      await rewardPoints.connect(user1).redeemPoints(100);
      expect(await rewardPoints.balanceOf(user1.address)).to.equal(4900);
    });
  });

  describe("Point Tiers", function () {
    it("should return Bronze for 0 points", async function () {
      expect(await rewardPoints.getTier(user1.address)).to.equal(TIER_BRONZE);
    });

    it("should return Silver at 1,000 points", async function () {
      await rewardPoints.earnPoints(user1.address, 1000);
      expect(await rewardPoints.getTier(user1.address)).to.equal(TIER_SILVER);
    });

    it("should return Gold at 10,000 points", async function () {
      await rewardPoints.earnPoints(user1.address, 10000);
      expect(await rewardPoints.getTier(user1.address)).to.equal(TIER_GOLD);
    });

    it("should return Platinum at 100,000 points", async function () {
      await rewardPoints.earnPoints(user1.address, 100000);
      expect(await rewardPoints.getTier(user1.address)).to.equal(TIER_PLATINUM);
    });

    it("should return correct tier thresholds", async function () {
      expect(await rewardPoints.getTierThreshold(TIER_BRONZE)).to.equal(0);
      expect(await rewardPoints.getTierThreshold(TIER_SILVER)).to.equal(1000);
      expect(await rewardPoints.getTierThreshold(TIER_GOLD)).to.equal(10000);
      expect(await rewardPoints.getTierThreshold(TIER_PLATINUM)).to.equal(100000);
    });

    it("should return correct tier multipliers", async function () {
      expect(await rewardPoints.getTierMultiplier(TIER_BRONZE)).to.equal(10000);
      expect(await rewardPoints.getTierMultiplier(TIER_SILVER)).to.equal(12000);
      expect(await rewardPoints.getTierMultiplier(TIER_GOLD)).to.equal(15000);
      expect(await rewardPoints.getTierMultiplier(TIER_PLATINUM)).to.equal(20000);
    });
  });

  describe("Admin Controls", function () {
    it("should allow owner to set multiplier", async function () {
      await rewardPoints.setMultiplier(20000);
      expect(await rewardPoints.getMultiplier()).to.equal(20000);
    });

    it("should revert if non-owner sets multiplier", async function () {
      await expect(
        rewardPoints.connect(user1).setMultiplier(20000)
      ).to.be.reverted;
    });

    it("should revert if multiplier is zero", async function () {
      await expect(
        rewardPoints.setMultiplier(0)
      ).to.be.revertedWith("RewardPoints: multiplier must be greater than 0");
    });

    it("should revert if multiplier exceeds max (10x)", async function () {
      await expect(
        rewardPoints.setMultiplier(100001)
      ).to.be.revertedWith("RewardPoints: multiplier too high (max 10x)");
    });

    it("should emit MultiplierUpdated event", async function () {
      await expect(rewardPoints.setMultiplier(20000))
        .to.emit(rewardPoints, "MultiplierUpdated")
        .withArgs(20000);
    });

    it("should allow owner to set min redemption", async function () {
      await rewardPoints.setMinRedemption(500);
      expect(await rewardPoints.getMinRedemption()).to.equal(500);
    });

    it("should revert if non-owner sets min redemption", async function () {
      await expect(
        rewardPoints.connect(user1).setMinRedemption(500)
      ).to.be.reverted;
    });
  });

  describe("Pause / Unpause", function () {
    it("should pause user-facing functions", async function () {
      await rewardPoints.pause();

      await expect(
        rewardPoints.connect(user1).redeemPoints(100)
      ).to.be.revertedWithCustomError(rewardPoints, "EnforcedPause");

      await expect(
        rewardPoints.earnPoints(user1.address, 100)
      ).to.be.revertedWithCustomError(rewardPoints, "EnforcedPause");
    });

    it("should unpause user-facing functions", async function () {
      await rewardPoints.pause();
      await rewardPoints.unpause();

      await rewardPoints.earnPoints(user1.address, 500);
      await rewardPoints.connect(user1).redeemPoints(100);

      expect(await rewardPoints.balanceOf(user1.address)).to.equal(400);
    });

    it("should revert if non-owner tries to pause", async function () {
      await expect(
        rewardPoints.connect(user1).pause()
      ).to.be.reverted;
    });

    it("should revert if non-owner tries to unpause", async function () {
      await expect(
        rewardPoints.connect(user1).unpause()
      ).to.be.reverted;
    });
  });

  describe("Access Control", function () {
    it("should grant minter role to new minter", async function () {
      expect(await rewardPoints.hasRole(await rewardPoints.MINTER_ROLE(), minter.address)).to.be.true;
    });

    it("should revoke minter role", async function () {
      await rewardPoints.revokeRole(await rewardPoints.MINTER_ROLE(), minter.address);
      expect(await rewardPoints.hasRole(await rewardPoints.MINTER_ROLE(), minter.address)).to.be.false;

      await expect(
        rewardPoints.connect(minter).earnPoints(user1.address, 100)
      ).to.be.reverted;
    });
  });
});