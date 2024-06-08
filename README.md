# Capybase Society

## Token

* Chain: BASE
* Contract Address: `0xB951df92512e9aEb407f840997F5ddf17d8D8bE4`
* Total Fixed Supply: `1,000,000,000` (1 Billion)
* Supply:
  * Liquidity Pool: `50%`
  * Presale: `50%`
* Ticker: `$CAPY`
* Decimals: `18`

## TL;DR

$CAPY is a meme coin with no intrinsic value or expectation of financial return. There is no formal team or roadmap. The coin is completely useless and for entertainment purposes only.

- An OG is the wallet that bought the token on the presale before the pool is created and the trading is started;
- To become an OG a wallet should send 0.1 ETH to contract address *before the trade is opened*;
- The contract creator becomes a OG without paying 0.1 ETH;
- There is a maximum of 50 OGs;
- The OGs will receive 50% of tokens at the moment that pool is created;
- The other 50% of tokens will be used to create the liquidity pool;
- There is a fee applied on every buy and sell
- 100% of all fees collected by the contract can be withdrawn to OGs;
- The first 500 buys will have no fee;
- The first 1,000 sells will have a increased fee.
- The initial LP tokens are automatically burned by the contract on pool creation (no chance to rug)

## Privileges

### For contract creator

The contract creator is the owner of the contract only before pool launch and have the ability to execute the following functions:
- Update the router to be used to create liquidity (used in testnets only)
- Exclude a wallet from the limit of maximum tokens per transaction
- Exclude a wallet from paying fees
- Enable/Disable the automatic swap of fees on sells
- Set the threshold of tokens in the contract to swap automatically
- Set the max transaction amount and max wallet amount (this is to avoid bots)
- Enables and disables checks on the receipt of eth by the contract (this is for safety in case there is any problem in swaps)
- Launch the pool and start trading even when maximum of OGs is not reached.

### For any OG

The following actions can be done by any OG *after the pool launch*:

- Launch the pool and start trading if the maximum of OGs is reached.
- Withdraw ETH from contract
- Withdraw tokens from contract
- Withdraw any ERC token that were transferred to the contract
- Manually swap CAPY tokens to ETH and withdraw

All withdrawals are made to all OGs proportionally.

### Trade

Trade on Uniswap: `(TBD)`

Uniswap Pair Address: `(TBD)`

### Fees

Fees are collected on purchases and sales from the liquidity pool.
There are no fees for transfers between wallets.

#### Buy

* Before the first `500` purchases: `0%`
* After the first `500` purchases: `0.2%`

#### Sell

* Before the first `1,000` purchases: `0.4%`
* After the first `1,000` purchases: `0.2%`

## OGs

On contract deployment, all tokens are minted to the contract address. The contract creator becomes the owner of contract and the first OG.

Any wallet will be able to transfer 0.1 ETH to the contract address to be a OG. There is a maximum of 50 OGs. All OGs are whitelisted and does not have the limit of transactions nor pay the fees.

At any time, the owner will be able to launch the token with just one transaction that:
1. Creates the liquidity pool with 50% of tokens and the total ETH amount locked on the contract.
2. Distribute the other 50% of tokens to all OGs.
3. Sets the maximum tokens per wallet to the distributed amount per OG.

On every buy and sell a fee will be aplied.
The fees are collected in CAPY tokens.
After the token launch, any OG can:
1) Swap CAPY token (received as fee) to ETH and withdraw
2) Withdraw CAPY tokens in the contract
3) Withdraw ETH in the contract (after a manual swap of CAPY tokens to ETH)

All withdrawals are made to all OGs proportionally.

Rules:
- If a wallet try to transfer ETH after the pool creation, or the maximum OGs reached, the transaction will be reverted.
- If a wallet try to transfer an amount different from 0.1 ETH, the transaction will be reverted.
- Each wallet will have only one spot as OG.
- In case of two transactions from the same wallet, the second transaction will be reverted, and the wallet will still be an OG.
- If an OG transfer part of the tokens received, the wallet lose the OG status and becomes a normal wallet that pays fees, has limits and do not receive fees.
- If an OG transfer ALL tokens from the whitelisted wallet to a new wallet, the status of OG is removed from the first one and added to the new one, so the fees will be collected by the new wallet. It happens only if the transfer amount is exactly the total amount of the OG wallet.

### Smart Contract Deployments

The smart contract code is open source and can be accessed at:
https://github.com/web3melk/capy-token/tree/main

#### Mainnet

Network: BASE

Token Address: `0xB951df92512e9aEb407f840997F5ddf17d8D8bE4`

Scan: https://basescan.org/address/0xB951df92512e9aEb407f840997F5ddf17d8D8bE4

Swap: https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency=0xB951df92512e9aEb407f840997F5ddf17d8D8bE4&chain=base

Launch: https://basescan.org/tx/0x4ef9db749b2957c1d9d0673a1cf8fc2c936fc418defd5555aa28d27c163c6430

Pool Created: https://basescan.org/address/0x7955C0937cE1408F3a02660962cEca88d3DC7614

#### Testnet MUMBAI #1

Network: Polygon Mumbai

Token Address: `0xBE596F38e0360488479321bE1E1f4c738d17F61E`

Scan: https://mumbai.polygonscan.com/address/0xBE596F38e0360488479321bE1E1f4c738d17F61E

Swap: https://app.sushi.com/swap?inputCurrency=ETH&outputCurrency=0xBE596F38e0360488479321bE1E1f4c738d17F61E&chainId=80001

Launch: https://mumbai.polygonscan.com/tx/0xef7badd41422c5fcc73ac9ce917ba798a10f3ba43e6dd7a39e8b1ff2694b2ded

Pool Created: https://mumbai.polygonscan.com/address/0x7ea5150cec77d3c10cc29b783b06cdded9bd95e3#tokentxns

#### Testnet MUMBAI #2

Network: Polygon Mumbai

Token Address: `0x229b1755BE8328E1d1C1a1A209C6ab36a367f4EA`

Scan: https://mumbai.polygonscan.com/address/0x229b1755BE8328E1d1C1a1A209C6ab36a367f4EA

Swap: https://app.sushi.com/swap?inputCurrency=ETH&outputCurrency=0x229b1755BE8328E1d1C1a1A209C6ab36a367f4EA&chainId=80001

Launch: 
Pool Created: 

#### Testnet Ethereum Sepolia #1

Network: Ethereum Sepolia

Token Address: `0xBE596F38e0360488479321bE1E1f4c738d17F61E`

Scan: https://sepolia.etherscan.io/address/0xBE596F38e0360488479321bE1E1f4c738d17F61E

Swap: https://1et.github.io/uniswap-v2-sepolia/#/swap

Launch: https://sepolia.etherscan.io/tx/0x1df44145f92e4d2c47fa220c47b848bdb2e08b1924d8faf07cf1e166399e73f2

Pool Created: https://sepolia.etherscan.io/address/0xedb21486d42323e136762f22d748ec0e3509291a#tokentxns

#### Testnet Ethereum Sepolia #2

Network: Ethereum Sepolia

Token Address: `0x6F4eFd347C2A36dB94D4DE022bE4a0C21E4Aa9ad`

Scan: https://sepolia.etherscan.io/address/0x6F4eFd347C2A36dB94D4DE022bE4a0C21E4Aa9ad

Swap: https://1et.github.io/uniswap-v2-sepolia/#/swap

Launch: https://sepolia.etherscan.io/tx/0xc248f060cc1fa709b5ee48acf0bab796f18c27ecbcb1d4d201d312598a461b47
Pool Created: https://sepolia.etherscan.io/address/0xceD1b95C7a87e8B7de12a36c5bdA9DB8E0746239

## Development

### Commands

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat node
npx hardhat help
```

### Testing the code

```shell
npx hardhat clean
npx hardhat compile
npx hardhat test
```

### Test Coverage

```shell
npx hardhat coverage
```

------------|----------|----------|----------|----------|----------------|
File        |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------|----------|----------|----------|----------|----------------|
 contracts/ |    85.71 |       68 |     87.1 |    87.84 |                |
  Capy.sol  |    85.71 |       68 |     87.1 |    87.84 |... 461,462,463 |
------------|----------|----------|----------|----------|----------------|
All files    |    85.71 |       68 |     87.1 |    87.84 |                |
------------|----------|----------|----------|----------|----------------|

### Hardhat config

Our hardhat config file implements the `mumbai network` for testing purpposes, but you can add other networks if you want. Sensitive variables are used through .env file.

### Deploy

To deploy on testnet

  $ npx hardhat run scripts/Capy.deploy.testnet.js --network mumbai

### Verify contract on Etherscan

To verify the contract on Sepolia

  $ npx hardhat verify --network sepolia 0xBE596F38e0360488479321bE1E1f4c738d17F61E

## License

Copyright © 2024 Capybase Core Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.