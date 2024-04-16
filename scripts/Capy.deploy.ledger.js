// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
async function deployMainnet() {
    const hre = require("hardhat");
    const { LedgerSigner } = require("@anders-t/ethers-ledger");
    const { ledgerWallet } = require('../secrets.json');

    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // Get ledger wallet
    const ledger = new LedgerSigner(hre.ethers.provider, ledgerWallet);

    // We get the contract to deploy
    const Capy = await hre.ethers.getContractFactory("CapybaseSocietyToken");

    // Connect ledger to the contractFactory
    let contractFactory = await Capy.connect(ledger)

    // Deploy the contract
    const contract = await contractFactory.deploy();

    await contract.deployed();
    console.log("Capy deployed to:", contract.address);

    // Set Router UNISWAP on BASE
    // https://docs.uniswap.org/contracts/v2/reference/smart-contracts/v2-deployments
    // let routerAddress = "0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24";
    // await contract.setRouter(routerAddress);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
deployMainnet()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });