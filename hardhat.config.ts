require("dotenv").config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-dependency-compiler";
import '@nomicfoundation/hardhat-verify';

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  dependencyCompiler: {
    paths: [
      "solmate/src/test/utils/mocks/MockERC20.sol"
    ],
  },
  networks: {
    baseSepolia: {
      url: process.env.RPC_URL,
      accounts: [
        process.env.SCOUTIFI_OWNER_PRIVATE_KEY || '',
        process.env.SCOUTIFI_FEE_WALLET_PRIVATE_KEY || ''
      ],
      chainId: 84532
    }
  },
  etherscan: {
    apiKey: {
      baseSepolia: process.env.BASESCAN_API_KEY || '',
      base: process.env.BASESCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'baseSepolia',
        chainId: 84532,
        urls: {
          apiURL: 'https://api-sepolia.basescan.org/api',
          browserURL: 'https://sepolia.basescan.org'
        }
      },
      {
        network: 'base',
        chainId: 8453,
        urls: {
          apiURL: 'https://api.basescan.org/api',
          browserURL: 'https://basescan.org'
        }
      }
    ]
  }
};

export default config;
