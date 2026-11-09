/**
 * Hardhat configuration for Reward Points System
 * Chain-agnostic configuration - works with any EVM-compatible network
 */

require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Ethereum mainnet configuration (requires PRIVATE_KEY and INFURA/ALCHEMY_URL in .env)
    // Uncomment and configure for mainnet deployment:
    /*
    mainnet: {
      url: process.env.INFURA_URL || "https://mainnet.infura.io/v3/YOUR-PROJECT-ID",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 1,
    },
    */
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 40000,
  },
};