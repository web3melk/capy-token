// test/Capy.test.js

// Load dependencies
const { expect } = require('chai');
const { ethers } = require("hardhat");

const chai = require('chai');
const { solidity } = require('ethereum-waffle');
chai.use(solidity);

function eth(amount) {
  return ethers.utils.parseEther(amount.toString());
}

const emittedEvents = [];
const saveEvents = async (tx) => {
  const receipt = await tx.wait()
  receipt.events.forEach(ev => {
    if (ev.event) {
      emittedEvents.push({
        name: ev.event,
        args: ev.args
      });
    }
  });
}

describe('Capy', function () {
  before(async function () {
    this.deadAddress = '0x000000000000000000000000000000000000dEaD'
    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0]
    this.notAdmin = this.signers[1];
    this.treasury = this.signers[2];
    this.founder = this.signers[3];
    this.addFounders = async function (total) {
      await this.founder.sendTransaction({
        to: this.contract.address,
        value: eth(0.5)
      });
      for (var i = 0; i < total-1; i++) {
        var wallet = ethers.Wallet.createRandom();
        wallet = wallet.connect(ethers.provider);
        await this.deployer.sendTransaction({
          to: wallet.address,
          value: eth(10)
        });
        await wallet.sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        });
      };
    };
    this.deployUniswap = async function () {
      const compiledUniswapFactory = require("@uniswap/v2-core/build/UniswapV2Factory.json");
      var uniswapFactory = await new ethers.ContractFactory(compiledUniswapFactory.interface, compiledUniswapFactory.bytecode, this.deployer)
      this.uniswapFactory = await uniswapFactory.deploy(this.deployer.address);
      await this.uniswapFactory.deployed();

      const compiledWETH = require("canonical-weth/build/contracts/WETH9.json");
      var WETH = await new ethers.ContractFactory(compiledWETH.abi, compiledWETH.bytecode, this.deployer)
      this.WETH = await WETH.deploy();
      await this.WETH.deployed();

      const compiledUniswapRouter = require("@uniswap/v2-periphery/build/UniswapV2Router02");
      var uniswapRouter = await new ethers.ContractFactory(compiledUniswapRouter.abi, compiledUniswapRouter.bytecode, this.deployer);
      this.uniswapRouter = await uniswapRouter.deploy(this.uniswapFactory.address, this.WETH.address);
      await this.uniswapRouter.deployed();

      await this.contract.setRouter(this.uniswapRouter.address);
    };
    this.emittedEvent = function(name, args) {
      return this.receipt.events.find((event) => {
        return event.event == name && JSON.stringify(event.args) == JSON.stringify(args)
      }) != undefined;
    }
  });

  beforeEach(async function () {
    // Deploy a new Capy contract for each test
    const contractFactory = await ethers.getContractFactory("CapybaseSocietyToken");
    this.contract = await contractFactory.deploy(this.treasury.address);
    await this.contract.deployed();
    this.receipt ||= await this.contract.deployTransaction.wait()
  });

  describe("Meta Data", function () {
    it('name is Capy', async function () {
      expect(await this.contract.name()).to.equal('Capybase Society Token');
    });
    it('symbol is Capy', async function () {
      expect(await this.contract.symbol()).to.equal('CAPY');
    });
    it('decimals is 18', async function () {
      expect(await this.contract.decimals()).to.equal(18);
    });
  });

  describe("Deployment", function () {
    it('deployer is owner', async function () {
      expect(await this.contract.owner()).to.equal(this.deployer.address);
    });
    it('set treasury', async function () {
      expect(await this.contract.treasury()).to.equal(this.treasury.address);
    });
    it('set deployer as founder', async function () {
      expect(await this.contract.totalFounders()).to.equal(1);
      expect(await this.contract.founders(0)).to.equal(this.deployer.address);
    });
    it('mints 1 billion tokens tokens', async function () {
      expect((await this.contract.totalSupply())).to.equal('1000000000000000000000000000');
      expect((await this.contract.balanceOf(this.contract.address))).to.equal('1000000000000000000000000000');
    });
    it('set fee exclusions', async function () {
      expect(this.emittedEvent('ExcludeFromFees', [this.deployer.address, true])).to.be.true;
      expect(this.emittedEvent('ExcludeFromFees', [this.treasury.address, true])).to.be.true;
      // expect(this.emittedEvent('ExcludeFromFees', [this.contract.address, true])).to.be.true;
      expect(this.emittedEvent('ExcludeFromFees', [this.deadAddress, true])).to.be.true;
    });
    it('set limit exclusions', async function () {
      expect(this.emittedEvent('ExcludeFromLimits', [this.deployer.address, true])).to.be.true;
      expect(this.emittedEvent('ExcludeFromLimits', [this.treasury.address, true])).to.be.true;
      // expect(this.emittedEvent('ExcludeFromLimits', [this.contract.address, true])).to.be.true;
      expect(this.emittedEvent('ExcludeFromLimits', [this.deadAddress, true])).to.be.true;
    });
  });

  describe("receive", function () {
    describe("pool not created", function () {
      beforeEach(async function () {
        expect(await this.contract.uniswapV2Pair()).to.equal('0x0000000000000000000000000000000000000000');
      });
      it('when limit reached should revert', async function () {
        await this.addFounders(49);
        await expect(this.deployer.sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.be.revertedWith("Max founders reached");
      });
      it('when 0.5 eth should add founder and exclude from fee', async function () {
        expect(await this.contract.totalFounders()).to.equal(1);
        await expect(this.signers[3].sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.emit(this.contract, 'ExcludeFromFees').withArgs(this.signers[3].address, true);
        expect(await this.contract.totalFounders()).to.equal(2);
        expect(await this.contract.founders(1)).to.equal(this.signers[3].address);
      });
      it('when 1 eth should revert', async function () {
        await expect(this.signers[2].sendTransaction({
          to: this.contract.address,
          value: eth(1)
        })).to.be.revertedWith("Exatcly 0.5 ETH required");
      });
      it('when 0.4 eth should not add founder', async function () {
        await expect(this.signers[2].sendTransaction({
          to: this.contract.address,
          value: eth(0.4)
        })).to.be.revertedWith("Exatcly 0.5 ETH required");
      });
      it('should not add same founder twice', async function () {
        await expect(this.deployer.sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.be.revertedWith("Already a founder");
      });
    });
    describe("pool already created", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addFounders(9);
        await this.contract.launch(eth(2));
        expect(await this.contract.uniswapV2Pair()).not.to.equal('0x0000000000000000000000000000000000000000');
      });
      it('should revert', async function () {
        await expect(this.signers[6].sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.be.revertedWith("Trading already started");
      });
    });
  });

  describe("toogleCheckReceive", function () {
    it('should block not owner', async function () {
      await expect(this.contract.connect(this.notAdmin).toogleCheckReceive(false)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should change checkReceive', async function () {
      expect(await this.contract.checkReceive()).to.equal(true);
      await this.contract.toogleCheckReceive(false);
      expect(await this.contract.checkReceive()).to.equal(false);
    });
  });

  describe("setSwapEnabled", function () {
    it('should block not owner', async function () {
      await expect(this.contract.connect(this.notAdmin).setSwapEnabled(true)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should change swapEnabled', async function () {
      expect(await this.contract.swapEnabled()).to.equal(false); // default to false
      await this.contract.setSwapEnabled(true);
      expect(await this.contract.swapEnabled()).to.equal(true);
    });
  });

  describe("excludeFromFees", function () {
    it('should put and remove from list', async function () {
      expect(await this.contract.isExcludedFromFees('0x90F79bf6EB2c4f870365E785982E1f101E93b906')).to.be.false;
      await expect(this.contract.excludeFromFees('0x90F79bf6EB2c4f870365E785982E1f101E93b906', true)).to.emit(this.contract, 'ExcludeFromFees').withArgs('0x90F79bf6EB2c4f870365E785982E1f101E93b906', true);
      expect(await this.contract.isExcludedFromFees('0x90F79bf6EB2c4f870365E785982E1f101E93b906')).to.be.true;
      await expect(this.contract.excludeFromFees('0x90F79bf6EB2c4f870365E785982E1f101E93b906', false)).to.emit(this.contract, 'ExcludeFromFees').withArgs('0x90F79bf6EB2c4f870365E785982E1f101E93b906', false);
      expect(await this.contract.isExcludedFromFees('0x90F79bf6EB2c4f870365E785982E1f101E93b906')).to.be.false;
    });
  });

  describe("excludeFromMaxTransaction", function () {
    it('should put and remove from list', async function () {
      expect(await this.contract.isExcludedFromMaxTransaction('0x90F79bf6EB2c4f870365E785982E1f101E93b906')).to.be.false;
      await expect(this.contract.excludeFromMaxTransaction('0x90F79bf6EB2c4f870365E785982E1f101E93b906', true)).to.emit(this.contract, 'ExcludeFromLimits').withArgs('0x90F79bf6EB2c4f870365E785982E1f101E93b906', true);
      expect(await this.contract.isExcludedFromMaxTransaction('0x90F79bf6EB2c4f870365E785982E1f101E93b906')).to.be.true;
      await expect(this.contract.excludeFromMaxTransaction('0x90F79bf6EB2c4f870365E785982E1f101E93b906', false)).to.emit(this.contract, 'ExcludeFromLimits').withArgs('0x90F79bf6EB2c4f870365E785982E1f101E93b906', false);
      expect(await this.contract.isExcludedFromMaxTransaction('0x90F79bf6EB2c4f870365E785982E1f101E93b906')).to.be.false;
    });
  });

  describe("setRouter", function () {
    it('should update Router', async function () {
      await this.contract.setRouter('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
      expect(await this.contract.Router()).to.equal('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC');
    });
  });

  describe("updateTreasury", function () {
    it('should block owner', async function () {
      await expect(this.contract.updateTreasury('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')).to.be.revertedWith("caller is not the treasury owner");
    });
    it('should block zero address', async function () {
      expect(await this.contract.treasury()).to.equal(this.treasury.address);
      await expect(this.contract.connect(this.treasury).updateTreasury('0x0000000000000000000000000000000000000000')).to.be.revertedWith("Cannot set treasury to the zero address");
    });
    it('should block contract address', async function () {
      expect(await this.contract.treasury()).to.equal(this.treasury.address);
      await expect(this.contract.connect(this.treasury).updateTreasury(this.contract.address)).to.be.revertedWith("Cannot set treasury to the contract address");
    });
    it('should update treasury and excluded fee list', async function () {
      expect(await this.contract.treasury()).to.equal(this.treasury.address);
      await expect(this.contract.connect(this.treasury).updateTreasury('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')).to.emit(this.contract, 'ExcludeFromFees').withArgs('0x70997970C51812dc3A010C7d01b50e0d17dc79C8', true);
      expect(await this.contract.treasury()).to.equal('0x70997970C51812dc3A010C7d01b50e0d17dc79C8');
    });
  });

  describe("launch", function () {
    beforeEach(async function () {
      await this.deployUniswap();
      await this.addFounders(9);
    });
    it('should revert when not enough balance', async function () {
      await expect(this.contract.launch(eth(5))).to.be.revertedWith("Not enough ETH in the contract");
    });
    it('should create the poll and add liquidity', async function () {
      let previousTreasuryBalance = await ethers.provider.getBalance(this.treasury.address);
      expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(1000000000));
      expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(4.5));
      await this.contract.launch(eth(2));
      let uniswapV2PairAddress = await this.contract.uniswapV2Pair();
      // Remain with no tokens
      expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(0));
      // Send passed amount of ETH to pool
      expect(await this.WETH.balanceOf(uniswapV2PairAddress)).to.equal(eth(2));
      // Send 100% of remaining ETH to treasury
      expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
      expect(await ethers.provider.getBalance(this.treasury.address)).to.equal(previousTreasuryBalance.add(eth(2.5)));
      // expect(await ethers.provider.getBalance(uniswapV2PairAddress)).to.equal(eth(100));
      // Send 95% of tokens to pool
      expect(await this.contract.balanceOf(uniswapV2PairAddress)).to.equal(eth(900000000));
      // Send 1% of tokens to treasury
      expect(await this.contract.balanceOf(this.treasury.address)).to.equal(eth(20000000));
      // Send 4% of tokens to founders, total 10, so deployer receive 1/10 of 4%
      expect(await this.contract.balanceOf(this.deployer.address)).to.equal(eth(8000000));
    });
  });

  describe("transfer", function () {
    describe("trading not started", function () {
      describe("withdrawTokens", function () {
        describe("without balance", function () {
          it('revert', async function () {
            await this.contract.withdrawTokens();
            await expect(this.contract.withdrawTokens()).to.be.revertedWith("Not enough tokens to withdraw");
          });
        });
        describe("with balance", function () {
          describe("from deployer", function () {
            it('send tokens to treasury and founders', async function () {
              expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(1000000000));
              await expect(this.contract.withdrawTokens()).to
                .emit(this.contract, 'Transfer')
                .withArgs(
                  this.contract.address,
                  this.treasury.address,
                  eth(200000000)
                );
              expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(0));
              expect(await this.contract.balanceOf(this.deployer.address)).to.equal(eth(800000000));
              expect(await this.contract.balanceOf(this.treasury.address)).to.equal(eth(200000000));
            });
          });
          describe("from founder", function () {
            it('should revert transaction', async function () {
              await expect(this.contract.connect(this.founder).withdrawTokens()).to.be.revertedWith("caller is not the owner or founder after launch");
            });
          });
        });
      });

      it('from treasury to contract', async function () {
        await this.contract.withdrawTokens();
        await expect(this.contract.connect(this.treasury).transfer(this.contract.address, eth(500))).to
          .emit(this.contract, 'Transfer')
          .withArgs(
            this.treasury.address,
            this.contract.address,
            eth(500)
          );
        expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(500));
        expect(await this.contract.balanceOf(this.treasury.address)).to.equal(eth(199999500));
      });

      it('from treasury to another wallet', async function () {
        await this.contract.withdrawTokens();
        await expect(this.contract.connect(this.treasury).transfer(this.signers[4].address, eth(500))).to
          .emit(this.contract, 'Transfer')
          .withArgs(
            this.treasury.address,
            this.signers[4].address,
            eth(500)
          );
        expect(await this.contract.balanceOf(this.treasury.address)).to.equal(eth(199999500));
        expect(await this.contract.balanceOf(this.signers[4].address)).to.equal(eth(500));
      });
      it('from any address to another address', async function () {
        await this.contract.withdrawTokens();
        await this.contract.connect(this.treasury).transfer(this.signers[4].address, eth(500));
        await expect(this.contract.connect(this.signers[4]).transfer(this.signers[5].address, eth(500))).to.revertedWith("Trading not started");
      });
      it('from whitelisted address to another address', async function () {
        await this.contract.excludeFromFees(this.signers[4].address, true);
        await this.contract.withdrawTokens();
        await this.contract.connect(this.treasury).transfer(this.signers[4].address, eth(500));
        await expect(this.contract.connect(this.signers[4]).transfer(this.signers[5].address, eth(500))).to
          .emit(this.contract, 'Transfer')
          .withArgs(
            this.signers[4].address,
            this.signers[5].address,
            eth(500)
          );
        expect(await this.contract.balanceOf(this.signers[4].address)).to.equal(eth(0));
        expect(await this.contract.balanceOf(this.signers[5].address)).to.equal(eth(500));
      });
      it('from any address to a whitelisted address', async function () {
        await this.contract.excludeFromFees(this.signers[5].address, true);
        await this.contract.withdrawTokens();
        await this.contract.connect(this.treasury).transfer(this.signers[4].address, eth(500));
        await expect(this.contract.connect(this.signers[4]).transfer(this.signers[5].address, eth(500))).to
          .emit(this.contract, 'Transfer')
          .withArgs(
            this.signers[4].address,
            this.signers[5].address,
            eth(500)
          );
        expect(await this.contract.balanceOf(this.signers[4].address)).to.equal(eth(0));
        expect(await this.contract.balanceOf(this.signers[5].address)).to.equal(eth(500));
      });
    });

    describe("trading started", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addFounders(9);
        await this.contract.toogleCheckReceive(false);
        await this.signers[19].sendTransaction({
          to: this.contract.address,
          value: eth(90)
        });
        await this.contract.toogleCheckReceive(true);
        await this.contract.launch(eth(90));
        // 90 ETH for 900M tokens = price 0.0000001 ETH per token
      });
      describe("after remove limits", function () {
        beforeEach(async function () {
          await this.contract.removeLimits();
        });
        describe("withdrawTokens", function () {
          describe("without balance", function () {
            it('revert', async function () {
              await expect(this.contract.withdrawTokens()).to.be.revertedWith("Not enough tokens to withdraw");
            });
          });
          describe("with balance", function () {
            describe("from deployer", function () {
              it('send tokens to treasury and founders', async function () {
                await this.contract.connect(this.treasury).transfer(this.contract.address, eth(500));
                expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth('500'));
                await expect(this.contract.withdrawTokens()).to
                  .emit(this.contract, 'Transfer')
                  .withArgs(
                    this.contract.address,
                    this.treasury.address,
                    eth('500').mul(20).div(100)
                  );
              });
            });
            describe("from founder", function () {
              it('send tokens to treasury and founders', async function () {
                await this.contract.connect(this.treasury).transfer(this.contract.address, eth(500));
                expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth('500'));
                await expect(this.contract.connect(this.founder).withdrawTokens()).to
                  .emit(this.contract, 'Transfer')
                  .withArgs(
                    this.contract.address,
                    this.treasury.address,
                    eth('500').mul(20).div(100)
                  );
              });
            });
          });
        });

        describe("fees", function () {
          before(async function () {
            this.buy = async function (wallet, amountEth) {
              await this.uniswapRouter.connect(wallet).swapExactETHForTokensSupportingFeeOnTransferTokens(
                eth(0),
                [this.WETH.address, this.contract.address],
                wallet.address,
                (Date.now() + 1000 * 60 * 10),
                {
                  value: eth(amountEth)
                }
              );
            };
            this.sell = async function (wallet, amountToken) {
              await this.contract.connect(wallet).approve(this.uniswapRouter.address, eth(amountToken));
              await this.uniswapRouter.connect(wallet).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(amountToken),
                0,
                [this.contract.address, this.WETH.address],
                wallet.address,
                (Date.now() + 1000 * 60 * 10),
              );
            };
          });
          describe("buy", function () {
            it('collect no fees before 500 buys', async function () {
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              await this.buy(this.signers[15], 0.00005);
              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth("498.499723886541825065"));
            });

            xit('collect fees after 500 buys', async function () {
              await this.contract.updateBuyCount(600);
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              await expect(this.uniswapRouter.connect(this.signers[15]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                eth(0),
                [this.WETH.address, this.contract.address],
                this.signers[15].address,
                (Date.now() + 1000 * 60 * 10),
                {
                  value: eth(0.00005)
                }
              )).to.emit(this.contract, 'Transfer').withArgs(
                this.signers[15].address,
                this.contract.address,
                eth('24.924986194327091253')
              );

              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth("498.499723886541825065").sub(eth('24.924986194327091253')));
            });
            xit('do not collect fees after 500 buys when wallet is excluded', async function () {
              await this.contract.updateBuyCount(600);
              await this.contract.excludeFromFees(this.signers[15].address, true);
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              await expect(this.uniswapRouter.connect(this.signers[15]).swapExactETHForTokensSupportingFeeOnTransferTokens(
                eth(0),
                [this.WETH.address, this.contract.address],
                this.signers[15].address,
                (Date.now() + 1000 * 60 * 10),
                {
                  value: eth(0.000005)
                }
              )).to.emit(this.contract, 'Transfer').withArgs(
                await this.contract.uniswapV2Pair(),
                this.signers[15].address,
                eth('49.849997238864041825')
              ); // these parameters are from the sell itself and not the fee

              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth("49.849997238864041825"));
            });
          });
          describe("sell", function () {
            xit('collect 25% of fees before 1000 buys', async function () {
              await this.contract.connect(this.treasury).transfer(this.signers[15].address, eth(10));
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              let previousContractBalance = await this.contract.balanceOf(this.contract.address);
              await this.contract.connect(this.signers[15]).approve(this.uniswapRouter.address, eth(1));
              await expect(this.uniswapRouter.connect(this.signers[15]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(1),
                eth(0),
                [this.contract.address, this.WETH.address],
                this.signers[15].address,
                (Date.now() + 1000 * 60 * 10),
              )).to.emit(this.contract, 'Transfer').withArgs(
                await this.contract.uniswapV2Pair(),
                this.contract.address,
                eth(0.25)
              );

              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth(1).mul(-1));
              let laterContractBalance = await this.contract.balanceOf(this.contract.address);
              expect(laterContractBalance.sub(previousContractBalance)).to.equal(eth(0.25));
            });
            xit('collect 25% of fees after 500 buys and before 1000 buys', async function () {
              await this.contract.updateBuyCount(600);
              await this.contract.connect(this.treasury).transfer(this.signers[15].address, eth(10));
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              let previousContractBalance = await this.contract.balanceOf(this.contract.address);
              await this.contract.connect(this.signers[15]).approve(this.uniswapRouter.address, eth(1));
              await expect(this.uniswapRouter.connect(this.signers[15]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(1),
                0,
                [this.contract.address, this.WETH.address],
                this.signers[15].address,
                (Date.now() + 1000 * 60 * 10),
              ));
              // .to.emit(this.contract, 'Transfer').withArgs(
              //   await this.contract.uniswapV2Pair(),
              //   this.contract.address,
              //   eth(0.25)
              // );

              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth(1).mul(-1));
              let laterContractBalance = await this.contract.balanceOf(this.contract.address);
              expect(laterContractBalance.sub(previousContractBalance)).to.equal(eth(0.25));
            });
            xit('collect 5% of fees after 1000 buys', async function () {
              await this.contract.updateBuyCount(1000);
              await this.contract.connect(this.treasury).transfer(this.signers[15].address, eth(10));
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              let previousContractBalance = await this.contract.balanceOf(this.contract.address);
              await this.contract.connect(this.signers[15]).approve(this.uniswapRouter.address, eth(1));
              await expect(this.uniswapRouter.connect(this.signers[15]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(1),
                0,
                [this.contract.address, this.WETH.address],
                this.signers[15].address,
                (Date.now() + 1000 * 60 * 10),
              )).to.emit(this.contract, 'Transfer').withArgs(
                await this.contract.uniswapV2Pair(),
                this.contract.address,
                eth(0.05)
              );

              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth(1).mul(-1));
              let laterContractBalance = await this.contract.balanceOf(this.contract.address);
              expect(laterContractBalance.sub(previousContractBalance)).to.equal(eth(0.05));
            });
            xit('do not collect fees after 1000 buys when wallet is excluded', async function () {
              await this.contract.updateBuyCount(1000);
              await this.contract.excludeFromFees(this.signers[15].address, true);
              await this.contract.connect(this.treasury).transfer(this.signers[15].address, eth(10));
              let previousFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              let previousContractBalance = await this.contract.balanceOf(this.contract.address);
              await this.contract.connect(this.signers[15]).approve(this.uniswapRouter.address, eth(1));
              await expect(this.uniswapRouter.connect(this.signers[15]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(1),
                0,
                [this.contract.address, this.WETH.address],
                this.signers[15].address,
                (Date.now() + 1000 * 60 * 10),
              )).to.emit(this.contract, 'Transfer').withArgs(
                this.signers[15].address,
                await this.contract.uniswapV2Pair(),
                eth(1)
              ); // these parameters are from the sell itself and not the fee

              let laterFounderBalance = await this.contract.balanceOf(this.signers[15].address);
              expect(laterFounderBalance.sub(previousFounderBalance)).to.equal(eth(1).mul(-1));
              let laterContractBalance = await this.contract.balanceOf(this.contract.address);
              expect(laterContractBalance.sub(previousContractBalance)).to.equal(eth(0));
            });
          });
          describe("auto swap", function () {
            beforeEach(async function () {
              // after _preventSwapBefore
              await this.contract.updateBuyCount(50);
              // transfer minimum threshold that is 1_000_000
              await this.contract.connect(this.treasury).transfer(this.contract.address, eth(1_000_000));

              await this.contract.connect(this.treasury).transfer(this.signers[14].address, eth(10));
              await this.contract.connect(this.signers[14]).approve(this.uniswapRouter.address, eth(1));
            });
            it('try to swap after trading started', async function () {
              await this.uniswapRouter.connect(this.signers[14]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(1),
                0,
                [this.contract.address, this.WETH.address],
                this.signers[14].address,
                (Date.now() + 1000 * 60 * 10),
              );
            });
            it('not try to swap wen disabled', async function () {
              await this.contract.setSwapEnabled(false);
              await this.uniswapRouter.connect(this.signers[14]).swapExactTokensForETHSupportingFeeOnTransferTokens(
                eth(1),
                0,
                [this.contract.address, this.WETH.address],
                this.signers[14].address,
                (Date.now() + 1000 * 60 * 10),
              );
              // await expect(this.uniswapRouter.connect(this.signers[14]).swapExactTokensForETHSupportingFeeOnTransferTokens(
              //   eth(1),
              //   0,
              //   [this.contract.address, this.WETH.address],
              //   this.signers[14].address,
              //   (Date.now() + 1000 * 60 * 10),
              // )).not.to.be.reverted;
            });
          });
        });

        it('from any address to another address', async function () {
          await this.contract.connect(this.treasury).transfer(this.signers[4].address, eth(500));
          await expect(this.contract.connect(this.signers[4]).transfer(this.signers[5].address, eth(500))).to
            .emit(this.contract, 'Transfer')
            .withArgs(
              this.signers[4].address,
              this.signers[5].address,
              eth(500)
            );
          expect(await this.contract.balanceOf(this.signers[4].address)).to.equal(eth(0));
          expect(await this.contract.balanceOf(this.signers[5].address)).to.equal(eth(500));
        });
      });
    });
  });

  describe("withdrawETH", function () {
    describe("without balance", function () {
      it('revert withotu balance', async function () {
        await expect(this.contract.withdrawETH()).to.be.revertedWith("Not enough ETH to withdraw");
      });
    });
    describe("with low balance", function () {
      beforeEach(async function () {
        await this.addFounders(2);
      });
      it('revert with low balance', async function () {
        expect(await this.contract.totalFounders()).to.equal(3);
        await this.contract.withdrawETH();
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth('0.000000000000000002'));
        await expect(this.contract.withdrawETH()).to.be.revertedWith("Not enough ETH to withdraw");
      });
    });
    describe("with enough balance", function () {
      beforeEach(async function () {
        await this.addFounders(1); // founders ill send 0.5
        await this.contract.toogleCheckReceive(false);
        await this.signers[4].sendTransaction({
          to: this.contract.address,
          value: eth(999.5) // founder will send 0.5 each, that's why 999.5 here
        });
        await this.contract.toogleCheckReceive(true);
      });
      it('send to treasury and founders', async function () {
        expect(await this.contract.totalFounders()).to.equal(2);
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(1000));
        let previousTreasuryBalance = await ethers.provider.getBalance(this.treasury.address);
        let previousFounderBalance = await ethers.provider.getBalance(this.founder.address);
        await this.contract.withdrawETH();
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
        expect(await ethers.provider.getBalance(this.treasury.address)).to.equal(previousTreasuryBalance.add(eth(200)));
        expect(await ethers.provider.getBalance(this.founder.address)).to.equal(previousFounderBalance.add(eth(400))); // 400 to founder and 400 to deployer
      });
    });
  });

  describe("manualSwap", function () {
    it('should block not founder', async function () {
      await expect(this.contract.connect(this.notAdmin).manualSwap()).to.be.revertedWith("caller is not the owner or founder after launch");
    });
    describe("when founder", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addFounders(9);
        await this.contract.toogleCheckReceive(false);
        await this.deployer.sendTransaction({
          to: this.contract.address,
          value: eth(100)
        });
        await this.contract.toogleCheckReceive(true);
        await this.contract.launch(eth(100));
        await this.contract.connect(this.treasury).transfer(this.contract.address, eth(100000));
      });
      it('should revert when balance is 0', async function () {
        await this.contract.manualSwap();
        await expect(this.contract.manualSwap()).to.be.revertedWith("Not enough tokens to swap");
      });
      it('should swap tokens', async function () {
        expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(100000));
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
        let previousFounderBalance = await ethers.provider.getBalance(this.founder.address);
        let previousTreasuryBalance = await ethers.provider.getBalance(this.treasury.address);
        await this.contract.manualSwap();
        let laterFounderBalance = await ethers.provider.getBalance(this.founder.address);
        let laterTreasuryBalance = await ethers.provider.getBalance(this.treasury.address);
        expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(0));
        expect(await laterFounderBalance.sub(previousFounderBalance)).to.equal(eth("0.00088612405936809"));
        expect(await laterTreasuryBalance.sub(previousTreasuryBalance)).to.equal(eth("0.002215310148420225")); // 20% of 0.000000221555531012
      });
    });
  });
  describe("emergencyWithdraw", function () {
    beforeEach(async function () {
      await this.addFounders(2);
      await this.contract.connect(this.deployer).allowEmergencyWithdraw();
    });
    it('should not allow founder permit twice', async function () {
      await expect(this.contract.connect(this.deployer).allowEmergencyWithdraw()).to.be.revertedWith("Already allowed");
    })
    describe("when majority of founders allowed", function () {
      it('send tokens to sender', async function () {
        await this.contract.connect(this.founder).allowEmergencyWithdraw();
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(1));
        expect(await this.contract.emergencyWithdraw()).to.changeEtherBalance(this.deployer, eth(1));
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
      });
    });
    describe("when founders did not allow", function () {
      it('send tokens to sender', async function () {
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(1));
        await expect(this.contract.emergencyWithdraw()).to.be.revertedWith("Not allowed by majority");
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(1));
      });
    });
  });
});