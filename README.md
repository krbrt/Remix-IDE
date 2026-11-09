# Reward Points System

A Solidity smart contract for managing reward points with tier-based multipliers, admin controls, and secure access management.

## Project Structure

```
reward-points-system/
├── contracts/
│   ├── RewardPoints.sol          # Main contract
│   └── interfaces/
│       └── IRewardPoints.sol     # Contract interface
├── test/
│   └── RewardPoints.test.js      # Hardhat + ethers.js tests
├── hardhat.config.js             # Hardhat configuration
├── package.json                  # Dependencies and scripts
└── README.md                     # This file
```

## Features

### 1. Earning Points
- `earnPoints(address user, uint256 amount)` — Award points to a user
- Only callable by the contract owner or addresses with the `MINTER_ROLE`
- Points are multiplied by the global multiplier and the user's tier multiplier
- Tracks both lifetime points earned and current redeemable balance

### 2. Redeeming Points
- `redeemPoints(uint256 amount)` — Redeem points for rewards
- Minimum redemption threshold (configurable, default 100)
- Protected by ReentrancyGuard
- Emits `PointsRedeemed(address user, uint256 amount)`

### 3. Point Tiers
Four tiers based on lifetime points earned:

| Tier | Threshold | Multiplier |
|------|-----------|------------|
| Bronze | 0+ | 1.0x |
| Silver | 1,000+ | 1.2x |
| Gold | 10,000+ | 1.5x |
| Platinum | 100,000+ | 2.0x |

- `getTier(address user)` — Returns the current tier of a user
- Tier upgrades are automatic when thresholds are met
- Emits `TierChanged(address user, uint8 oldTier, uint8 newTier)` on tier change

### 4. Admin Controls
- `setMultiplier(uint256 newMultiplier)` — Set global earning multiplier (basis points, 10000 = 1x, max 10x)
- `setMinRedemption(uint256 amount)` — Set minimum redemption threshold
- `pause()` / `unpause()` — Pause/unpause all user-facing functions
- All admin functions are `onlyOwner`

### 5. Events
- `PointsEarned(address user, uint256 amount, uint8 tier)`
- `PointsRedeemed(address user, uint256 amount)`
- `TierChanged(address user, uint8 oldTier, uint8 newTier)`
- `MultiplierUpdated(uint256 newMultiplier)`

### 6. Security
- **ReentrancyGuard** on `redeemPoints()`
- **Pausable** on all user-facing functions (`earnPoints`, `redeemPoints`)
- **AccessControl** with `MINTER_ROLE` for authorized point minters
- **Ownable** for administrative functions

## Installation

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Start local Hardhat node
npx hardhat node
```

## Smart Contract Details

### RewardPoints.sol

**Inherits:** `IRewardPoints`, `Ownable`, `AccessControl`, `Pausable`, `ReentrancyGuard`

**Roles:**
- `DEFAULT_ADMIN_ROLE` — Granted to deployer, can manage all roles
- `MINTER_ROLE` — Can call `earnPoints()`
- `PAUSER_ROLE` — Can call `pause()`/`unpause()` (also granted to owner)

**State Variables:**
- `minRedemption` — Minimum points required for redemption (default: 100)
- `multiplier` — Global earning multiplier in basis points (default: 10000 = 1x)
- `totalPointsEarned[user]` — Lifetime points earned by user
- `balanceOf[user]` — Current redeemable points balance
- `userTier[user]` — Current tier of user

### IRewardPoints.sol

Defines the interface with all events, tier constants, and external functions.

## Testing

The test suite covers:
- Deployment and initial state
- Earning points (owner, minter, unauthorized, edge cases)
- Redeeming points (success, below minimum, insufficient balance, zero amount)
- Tier progression (Bronze → Silver → Gold → Platinum)
- Tier thresholds and multipliers
- Admin controls (multiplier, min redemption, access restrictions)
- Pausing and unpausing
- Access control (granting/revoking minter role)

Run tests with:
```bash
npx hardhat test
```

## Deployment via Remix IDE

### Step 1: Compile the Contract

1. Open [Remix IDE](https://remix.ethereum.org/)
2. Create a new file `RewardPoints.sol` in the `contracts/` folder
3. Copy the contents of `contracts/RewardPoints.sol` into the file
4. Create `contracts/interfaces/IRewardPoints.sol` and copy the interface contents
5. Go to the **Solidity compiler** tab
6. Select compiler version `0.8.20`
7. Click **Compile RewardPoints.sol**

### Step 2: Deploy to Ethereum Mainnet

1. Go to the **Deploy & run transactions** tab
2. Select **Injected Provider (MetaMask)** as the environment
3. Make sure your MetaMask is connected to Ethereum Mainnet
4. Select `RewardPoints` from the contract dropdown
5. Click **Deploy**
6. Confirm the transaction in MetaMask

### Step 3: Interact with the Deployed Contract

After deployment, you can interact with the contract using Remix:

**Earn points (owner/minter only):**
- Call `earnPoints(address user, uint256 amount)`
- Enter the user's address and the amount of points

**Redeem points (any user):**
- Call `redeemPoints(uint256 amount)` from the user's account
- Enter the amount of points to redeem

**Check tier:**
- Call `getTier(address user)` to get a user's tier
- Returns: 0=Bronze, 1=Silver, 2=Gold, 3=Platinum

**Admin functions (owner only):**
- `setMultiplier(uint256 newMultiplier)` — Set earning multiplier
- `setMinRedemption(uint256 amount)` — Set minimum redemption
- `pause()` / `unpause()` — Pause/unpause contract

## Network Configuration

The contract is chain-agnostic and can be deployed to any EVM-compatible network. The `hardhat.config.js` includes configurations for:

- **Hardhat Network** (default, for local testing)
- **Localhost** (for local node)
- **Ethereum Mainnet** (commented out, uncomment and configure for mainnet deployment)

To deploy to mainnet, uncomment the mainnet network configuration in `hardhat.config.js` and set the following environment variables:
- `PRIVATE_KEY` — Deployer's private key
- `INFURA_URL` or `ALCHEMY_URL` — Ethereum node URL

```bash
# Example deployment to mainnet
npx hardhat run scripts/deploy.js --network mainnet
```

## License

MIT