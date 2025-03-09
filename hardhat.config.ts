require("dotenv").config();
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-dependency-compiler";

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
    apiKey: process.env.BASESCAN_API_KEY
  }
};

export default config;
