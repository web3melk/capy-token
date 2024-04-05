# Capybase Society

## Token

* Chain: BASE
* Contract Address: `(TBD)`
* Total Fixed Supply: `1,000,000,000` (1 Billion)
* Supply:
  * Liquidity Pool: `90%`
  * Treasury: `10%`
* Ticker: `$CAPY`
* Decimals: `18`

## TL;DR

$CAPY is a meme coin with no intrinsic value or expectation of financial return. There is no formal team or roadmap. The coin is completely useless and for entertainment purposes only.

- The first 500 buys will have no fee.
- The first 1,000 sells will have a increased fee.
- The first 50 wallets that send 0.5 ETH to contract address *before the trade is opened* will be the founders and will receive 80% of all fees forever.
- The initial LP tokens are automatically burned (no chance to rug)
- After some time the contract creator will renounce ownership.

## Privileges

### For contract creator

The contract creator is the owner of the contract with the ability to execute the following functions:
- Blacklist an address
- Remove fee for an address
- Update the Router to be used to create the poll (default to UniswapV2)
- Update the treasury address (which is a SAFE wallet of developers)

### For any founder

The following actions can be done by any founder *after the pool launch*:

- Withdraw ETH from contract to treasury and founders after (always in a proportion of 20%/80% respectively)
- Withdraw tokens from contract to treasury and founders (always in a proportion of 20%/80% respectively)
- Manual swap CAPY tokens to ETH and distribute

### Trade

Trade on Uniswap: `(TBD)`

Uniswap Pair Address: `(TBD)`

### Fees

Fees are collected on purchases and sales from the liquidity pool.
There are no fees for transfers between wallets.

#### Buy

* Before the first `500` purchases: `0%`
* After the first `500` purchases: `5%`

#### Sell

* Before the first `1,000` purchases: `25%`
* After the first `1,000` purchases: `5%`

## Founders

On contract deployment, all tokens are minted to the contract address and a treasury wallet is defined. The contract creator becomes the owner of contract.

Anyone will be able to transfer 0.5 ETH to the contract address to be a founder. There is a maximum of 50 founders.
At any time, the owner will be able to create the liquidity pool with an arbitrary amount of ETH in the contract and trading will be open. At this moment the remaining ETH in the contract will go to the treasury and 10% of tokens will be distributed to the treasury and to all founders in a proportion of 20%/80% respectively.

Rules:
- If you try to transfer 0.5 ETH after the pool creation, or the maximum founders reached, the transaction will be reverted.
- Each wallet will have only one spot as founder.
- In case of two transactions from the same wallet, the second transaction will be reverted, and the wallet will still be a founder in the list.

On every buy and sell a fee will be aplied.
The fees are collected in CAPY tokens.
At any time, any founder can:
1) Swap CAPY token to ETH and distribute
2) Distribute CAPY tokens in the contract
3) Distribute ETH in the contract

In any case the distribution will follow the proportion:
  - 20% to the treasury (defined on contract creation)
  - 80% equaly to all founders (max 50 wallets, so at least 1,6% for each founder)

### Smart Contract Deployments

The smart contract code is open source and can be accessed at:
https://github.com/web3melk/capy-token/tree/main

#### Mainnet

Contract Creation:
Token Address:

#### Testnet

Network: Polygon Mumbai
Token Address: `0xBE596F38e0360488479321bE1E1f4c738d17F61E`
Scan: https://mumbai.polygonscan.com/address/0xBE596F38e0360488479321bE1E1f4c738d17F61E

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
 contracts/ |      100 |    76.47 |      100 |      100 |                |
  Capy.sol  |      100 |    76.47 |      100 |      100 |                |
------------|----------|----------|----------|----------|----------------|
 All files   |      100 |    76.47 |      100 |      100 |                |
------------|----------|----------|----------|----------|----------------|

### Hardhat config

Our hardhat config file implements the `mumbai network` for testing purpposes, but you can add other networks if you want. Sensitive variables are used through .env file.

### Deploy

To deploy on testnet

  $ npx hardhat run scripts/Capy.deploy.testnet.js --network mumbai

### Verify contract on Polygonscan

To verify the contract on Mumbai

  $ npx hardhat verify --network mumbai 0xBE596F38e0360488479321bE1E1f4c738d17F61E

## License

Copyright © 2024 Capybase Core Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.