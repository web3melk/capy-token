require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("solidity-coverage");
require("hardhat-gas-reporter");

const { alchemyApiKeyTestnet, alchemyApiKeyMainnet, scanApiKey } = require('./secrets.json');

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
    gasReporter: {
      enabled: (process.env.REPORT_GAS) ? true : false
    },
    networks: {
        mumbai: {
            url: `https://base-testnet.g.alchemy.com/v2/${alchemyApiKeyTestnet}`,
            chainId: 80001,
        },
        polygon: {
            url: `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKeyMainnet}`,
            chainId: 137,
        }
    },
    etherscan: {
        apiKey: scanApiKey
    },
};