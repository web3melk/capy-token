async function deployToken() {
  const hre = require("hardhat");
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contract with the account:", deployer.address);

  console.log("Account balance:", (await deployer.getBalance()).toString());

  const Capy = await hre.ethers.getContractFactory("CapybaseSocietyToken");

  const contract = await Capy.deploy();

  await contract.deployed();
  console.log("Token address:", contract.address);

  // Set Router SUSHI on Mumbai
  // https://docs.sushi.com/docs/Products/Classic%20AMM/Deployment%20Addresses
  let routerAddress = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506";
  await contract.setRouter(routerAddress);
}

deployToken()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
