require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("dotenv").config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async(_taskArgs, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
        console.log(account.address);
    }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
    solidity: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
    gasReporter: {
      enabled: (process.env.REPORT_GAS) ? true : false
    },
    networks: {
        'base-sepolia': {
            url: `https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_BASE_SEPOLIA}`,
            accounts: [process.env.WALLET_KEY],
            chainId: 84532,
        },
        'base-mainnet': {
            url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_BASE_MAINNET}`,
            accounts: [process.env.WALLET_KEY],
            chainId: 8453,
        },
        'mumbai': {
            url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_MUMBAI}`,
            accounts: [process.env.WALLET_KEY],
            chainId: 80001,
      }
    },
    etherscan: {
      apiKey: {
        polygonMumbai: process.env.POLYGON_MUMBAI_API_KEY
      }
    },
};