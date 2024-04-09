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
function dollar(amount) {
  return ethers.utils.parseEther(amount.toString());
}
function ethFromDollar(dollar) {
  let amount = dollar / 3600;
  return ethers.utils.parseEther(amount.toFixed(18).toString());
}
function dollarFromETH(eth) {
  let amount = eth * 3600;
  return amount.toFixed(18).toString();
}

describe('Capy', function () {
  before(async function () {
    this.deadAddress = '0x000000000000000000000000000000000000dEaD'
    this.signers = await ethers.getSigners();
    this.deployer = this.signers[0]
    this.notAdmin = this.signers[1];
    this.og = this.signers[3];
    this.uniswapV2Pair = async function () {
      return (await this.contract.uniswapV2Pair()).toLowerCase();
    }
    this.addOGs = async function (total) {
      this.tokenPrice = total * 0.5 / 500_000_000 * 3600; // considering 1 ether = $3,600
      await this.og.sendTransaction({
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
    this.buy = async function (wallet, amountEth) {
      expect(Number(await ethers.provider.getBalance(wallet.address))).to.be.gte(Number(amountEth));
      return await this.uniswapRouter.connect(wallet).swapExactETHForTokensSupportingFeeOnTransferTokens(
        eth(0),
        [this.WETH.address, this.contract.address],
        wallet.address,
        (Date.now() + 1000 * 60 * 10),
        {
          value: amountEth // pass as eth(1) for 1 eth
        }
      );
    };
    this.sell = async function (wallet, amountToken) {
      expect(Number(await this.contract.balanceOf(wallet.address))).to.be.gte(Number(amountToken));

      await this.contract.connect(wallet).approve(this.uniswapRouter.address, eth(amountToken));
      return await this.uniswapRouter.connect(wallet).swapExactTokensForETHSupportingFeeOnTransferTokens(
        amountToken, // pass as eth(1) for 1 token
        0,
        [this.contract.address, this.WETH.address],
        wallet.address,
        (Date.now() + 1000 * 60 * 10),
      );
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
    this.emittedEvent = function(name, args, log = false) {
      return this.receipt.events.find((event) => {
        if (log) console.log(event.event, event.args);
        return event.event == name && JSON.stringify(event.args) == JSON.stringify(args)
      }) != undefined;
    }
  });

  beforeEach(async function () {
    // Deploy a new Capy contract for each test
    const contractFactory = await ethers.getContractFactory("CapybaseSocietyToken");
    this.contract = await contractFactory.deploy();
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
    it('set deployer as OG', async function () {
      expect(await this.contract.totalOGs()).to.equal(1);
      expect(await this.contract.OGs(0)).to.equal(this.deployer.address);
    });
    it('mints 1 billion tokens tokens', async function () {
      expect((await this.contract.totalSupply())).to.equal('1000000000000000000000000000');
      expect((await this.contract.balanceOf(this.contract.address))).to.equal('1000000000000000000000000000');
    });
    it('set fee exclusions', async function () {
      expect(this.emittedEvent('ExcludeFromFees', [this.deployer.address, true])).to.be.true;
      // expect(this.emittedEvent('ExcludeFromFees', [this.contract.address, true])).to.be.true;
      expect(this.emittedEvent('ExcludeFromFees', [this.deadAddress, true])).to.be.true;
    });
    it('set limit exclusions', async function () {
      expect(this.emittedEvent('ExcludeFromLimits', [this.deployer.address, true])).to.be.true;
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
        await this.addOGs(49);
        await expect(this.deployer.sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.be.revertedWith("Max OGs reached");
      });
      it('when 0.5 eth should add OG and exclude from fee', async function () {
        expect(await this.contract.totalOGs()).to.equal(1);
        await expect(this.signers[3].sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.emit(this.contract, 'ExcludeFromFees').withArgs(this.signers[3].address, true);
        expect(await this.contract.totalOGs()).to.equal(2);
        expect(await this.contract.OGs(1)).to.equal(this.signers[3].address);
      });
      it('when 1 eth should revert', async function () {
        await expect(this.signers[4].sendTransaction({
          to: this.contract.address,
          value: eth(1)
        })).to.be.revertedWith("Invalid amount");
      });
      it('when 0.4 eth should not add OG', async function () {
        await expect(this.signers[4].sendTransaction({
          to: this.contract.address,
          value: eth(0.4)
        })).to.be.revertedWith("Invalid amount");
      });
      it('should not add same OG twice', async function () {
        await expect(this.deployer.sendTransaction({
          to: this.contract.address,
          value: eth(0.5)
        })).to.be.revertedWith("Already an OG");
      });
      it("when 0.500001 eth should not add OG", async function () {
        await expect(
          this.signers[4].sendTransaction({
            to: this.contract.address,
            value: eth(0.50001),
          })
        ).to.be.revertedWith("Invalid amount")
      });
    });
    describe("pool already created", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addOGs(9);
        await this.contract.ownerLaunch();
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

  describe("setCheckReceive", function () {
    it('should block not owner', async function () {
      await expect(this.contract.connect(this.notAdmin).setCheckReceive(false)).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it('should change checkReceive', async function () {
      expect(await this.contract.checkReceive()).to.equal(true);
      await this.contract.setCheckReceive(false);
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

  describe("launch", function () {
    beforeEach(async function () {
      await this.deployUniswap();
    });
    it('should revert when not enough balance', async function () {
      await expect(this.contract.ownerLaunch()).to.be.revertedWith("Not enough ETH in the contract");
    });
    it('should create the pool and add liquidity', async function () {
      await this.addOGs(9);
      expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(1000000000));
      expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(4.5));
      await this.contract.ownerLaunch();
      let uniswapV2PairAddress = await this.contract.uniswapV2Pair();
      // Remain with no tokens
      expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(0));
      // Send passed amount of ETH to pool
      expect(await this.WETH.balanceOf(uniswapV2PairAddress)).to.equal(eth(4.5));
      expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
      // Send 50% of tokens to pool
      expect(await this.contract.balanceOf(uniswapV2PairAddress)).to.equal(eth(500_000_000));
      // Send 50% of tokens to OGs, total 10, so deployer receive 1/10 of 50%
      expect(await this.contract.balanceOf(this.deployer.address)).to.equal(eth(50_000_000));
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
            it('send tokens to OGs', async function () {
              expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(1000000000));
              await expect(this.contract.withdrawTokens()).to
                .emit(this.contract, 'Transfer')
                .withArgs(
                  this.contract.address,
                  this.deployer.address,
                  eth(1000000000)
                );
              expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(0));
              expect(await this.contract.balanceOf(this.deployer.address)).to.equal(eth(1000000000));
            });
          });
          describe("from OG", function () {
            it('should revert transaction', async function () {
              await expect(this.contract.connect(this.og).withdrawTokens()).to.be.revertedWith("caller is not the owner or OG after launch");
            });
          });
        });
      });

      it('from deployer to contract', async function () {
        await this.contract.withdrawTokens();
        let previousDeployerBalance = await this.contract.balanceOf(this.deployer.address);
        await expect(this.contract.transfer(this.contract.address, eth(500))).to
          .emit(this.contract, 'Transfer')
          .withArgs(
            this.deployer.address,
            this.contract.address,
            eth(500)
          );
        expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(500));
        expect(await this.contract.balanceOf(this.deployer.address)).to.equal(previousDeployerBalance.sub(eth(500)));
      });
      it('from deployer to another wallet', async function () {
        await this.contract.withdrawTokens();
        let previousDeployerBalance = await this.contract.balanceOf(this.deployer.address);
        await expect(this.contract.transfer(this.signers[4].address, eth(500))).to
          .emit(this.contract, 'Transfer')
          .withArgs(
            this.deployer.address,
            this.signers[4].address,
            eth(500)
          );
          expect(await this.contract.balanceOf(this.signers[4].address)).to.equal(eth(500));
        expect(await this.contract.balanceOf(this.deployer.address)).to.equal(previousDeployerBalance.sub(eth(500)));
      });
      it('from any address to another address', async function () {
        await this.contract.withdrawTokens();
        await this.contract.transfer(this.signers[4].address, eth(500));
        await expect(this.contract.connect(this.signers[4]).transfer(this.signers[5].address, eth(500))).to.revertedWith("Trading not started");
      });
      it('from whitelisted address to another address', async function () {
        await this.contract.excludeFromFees(this.signers[4].address, true);
        await this.contract.withdrawTokens();
        await this.contract.transfer(this.signers[4].address, eth(500));
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
        await this.contract.transfer(this.signers[4].address, eth(500));
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

    describe("trading started and no OGs", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addOGs(1);
        await this.contract.ownerLaunch();
        // removing OGs:
        await this.contract.connect(this.deployer).transfer(this.deadAddress, eth(500));
        await this.contract.connect(this.og).transfer(this.deadAddress, eth(500));
      });
      it('have no OGs', async function () {
        expect(await this.contract.totalOGs()).to.be.equal(0);
      });
      describe("withdrawTokens", function () {
        describe("without balance", function () {
          it('revert', async function () {
            await expect(this.contract.withdrawTokens()).to.be.revertedWith("Must have OGs");
          });
        });
        describe("with balance", function () {
          describe("from deployer", function () {
            it('send tokens to OGs from deployer', async function () {
              expect(await this.contract.totalOGs()).to.equal(0);
              let previousOGBalance = await this.contract.balanceOf(this.og.address);
              await expect(this.contract.withdrawTokens()).to.be.revertedWith("Must have OGs");
              let laterOGBalance = await this.contract.balanceOf(this.og.address);
              expect(laterOGBalance).to.equal(previousOGBalance);
            });
          });
          describe("from OG", function () {
            it('send tokens to OGs from OG', async function () {
              expect(await this.contract.totalOGs()).to.equal(0);
              await expect(this.contract.connect(this.og).withdrawTokens()).to.be.revertedWith("caller is not the owner or OG after launch");
            });
          });
        });
      });

      describe("fees", function () {
        describe("buy", function () {
          it('do not collect fees before 500 buys', async function () {
            expect(this.tokenPrice).to.be.closeTo(0.0000036, 0.0000001);
            await this.buy(this.signers[10], ethFromDollar(3.6));
            let balance = await this.contract.balanceOf(this.signers[10].address);
            expect(ethers.utils.formatEther(balance)).to.be.equal('995015.938219190933279041');
            expect(parseFloat(ethers.utils.formatEther(balance)) * this.tokenPrice).to.be.closeTo(3.6, 0.02)
          });
          it('do not collect fees after 500 buys', async function () {
            await this.contract.updateBuyCount(600);
            expect(this.tokenPrice).to.be.closeTo(0.0000036, 0.0000001);
            await this.buy(this.signers[10], ethFromDollar(3.6));
            let balance = await this.contract.balanceOf(this.signers[10].address);
            expect(ethers.utils.formatEther(balance)).to.be.equal('995015.938219190933279041');
            expect(parseFloat(ethers.utils.formatEther(balance)) * this.tokenPrice).to.be.closeTo(3.6, 0.02)
          });
        });
        describe("sell", function () {
          beforeEach(async function () {
            let wallet  = ethers.Wallet.createRandom();
            wallet =  wallet.connect(ethers.provider);
            await this.signers[15].sendTransaction({to: wallet.address, value: ethers.utils.parseEther("1")});
            this.sellSigner = wallet;
          });
          it('do not collect fees before 1000 buys', async function () {
            await this.contract.connect(this.deployer).transfer(this.sellSigner.address, eth(1_000_000));
            expect(this.tokenPrice).to.be.closeTo(0.0000036, 0.0000001);
            let previousBalance = await ethers.provider.getBalance(this.sellSigner.address);
            await this.sell(this.sellSigner, eth(1_000_000));
            expect(await this.contract.balanceOf(this.sellSigner.address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.sellSigner.address);
            let received = newBalance.sub(previousBalance);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceivedWithoutFeeETH)), 1000);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.0006, 0.0001);
          });
          it('do not collect fees after 500 buys and before 1000 buys', async function () {
            await this.contract.updateBuyCount(600);
            await this.contract.connect(this.deployer).transfer(this.sellSigner.address, eth(1_000_000));
            expect(this.tokenPrice).to.be.closeTo(0.0000036, 0.0000001);
            let previousBalance = await ethers.provider.getBalance(this.sellSigner.address);
            await this.sell(this.sellSigner, eth(1000000));
            expect(await this.contract.balanceOf(this.sellSigner.address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.sellSigner.address);
            let received = newBalance.sub(previousBalance);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceivedWithoutFeeETH)), 1000);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.0006, 0.0001);
          });
          it('do not collect fees after 1000 buys', async function () {
            await this.contract.updateBuyCount(1200);
            await this.contract.connect(this.deployer).transfer(this.sellSigner.address, eth(1_000_000));
            expect(this.tokenPrice).to.be.closeTo(0.0000036, 0.0000001);
            let previousBalance = await ethers.provider.getBalance(this.sellSigner.address);
            await this.sell(this.sellSigner, eth(1000000));
            expect(await this.contract.balanceOf(this.sellSigner.address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.sellSigner.address);
            let received = newBalance.sub(previousBalance);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceivedWithoutFeeETH)), 1000);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.0006, 0.0001);
          });
        });
        describe("auto swap", function () {
          beforeEach(async function () {
            // after _preventSwapBefore
            await this.contract.updateBuyCount(50);
            // transfer minimum threshold that is 1_000_000
            await this.contract.transfer(this.contract.address, eth(1_000_000));

            await this.contract.transfer(this.signers[14].address, eth(10));
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
          });
        });
      });
    });


    describe("trading started", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addOGs(9);
        await this.contract.ownerLaunch();
      });

      it("revert when amount exceed balance", async function () {
        // Attempt to transfer more than available
        await expect(this.contract.transfer(this.signers[3].address, await this.contract.totalSupply())).to.be.revertedWith(
          "ERC20: transfer amount exceeds balance"
        )
      })

      describe("limits are respected", function () {
        beforeEach(async function () {
          await this.contract.setMaxWalletAndMaxTransaction(eth(5_000_000), eth(7_000_000))
        });
        it("shoud set limits", async function () {
          expect(await this.contract.maxTransaction()).to.be.equal(eth(5_000_000))
          expect(await this.contract.maxWallet()).to.be.equal(eth(7_000_000))
        });
        describe("when transfering tokens", function () {
          it("do not enforces max wallet", async function () {
            await this.contract.excludeFromMaxTransaction(this.signers[3].address, false);
            await this.contract.transfer(this.signers[3].address, eth(6_000_000));
            await expect(this.contract.transfer(this.signers[3].address, eth(2_000_000))).not.to.be.reverted;
          });

          it("do not enforces max transaction", async function () {
            await this.contract.excludeFromMaxTransaction(this.signers[3].address, false);
            await expect(this.contract.transfer(this.signers[3].address, eth(6_000_000))).not.to.be.reverted;
          });
        });
        describe("when buying tokens", function () {
          it("should enforces max wallet", async function () {
            await this.contract.excludeFromMaxTransaction(this.signers[3].address, false);
            await this.buy(this.signers[2], eth(5_000_000 * this.tokenPrice / 3_600));
            let balance = await this.contract.balanceOf(this.signers[2].address)
            expect(parseFloat(ethers.utils.formatEther(balance))).to.be.closeTo(5_000_000, 100_000);
            await expect(this.buy(this.signers[2], eth(3_000_000 * this.tokenPrice / 3_600))).to.be.revertedWith(
              "UniswapV2: TRANSFER_FAILED"
            )
          });

          it("should enforces max transaction", async function () {
            await this.contract.excludeFromMaxTransaction(this.signers[3].address, false);
            await expect(this.buy(this.signers[2], eth(6_000_000 * this.tokenPrice / 3_600))).to.be.revertedWith(
              "UniswapV2: TRANSFER_FAILED"
            )
          });
        });
      });

      describe("withdrawTokens", function () {
        describe("without balance", function () {
          it('revert', async function () {
            await expect(this.contract.withdrawTokens()).to.be.revertedWith("Not enough tokens to withdraw");
          });
        });
        describe("with balance", function () {
          describe("from deployer", function () {
            it('send tokens to OGs from deployer', async function () {
              // deployer will lose the status of OG;
              await this.contract.connect(this.deployer).transfer(this.contract.address, eth(500));
              expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth('500'));
              expect(await this.contract.totalOGs()).to.equal(9);
              expect(await this.contract.balanceOf(this.og.address)).to.equal(eth(50000000));
              await expect(this.contract.withdrawTokens()).to
                .emit(this.contract, 'Transfer')
                .withArgs(
                  this.contract.address,
                  this.og.address,
                  eth('55.555555555555555555') // it is 50000000 / 9 OGs because deployer lose the status
                );
              expect(await this.contract.balanceOf(this.og.address)).to.equal(eth('50000055.555555555555555555'));
            });
          });
          describe("from OG", function () {
            it('send tokens to OGs from OG', async function () {
              // deployer will lose the status of OG;
              await this.contract.transfer(this.contract.address, eth(500));
              expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth('500'));
              expect(await this.contract.totalOGs()).to.equal(9);
              await expect(this.contract.connect(this.og).withdrawTokens()).to
                .emit(this.contract, 'Transfer')
                .withArgs(
                  this.contract.address,
                  this.og.address,
                  eth('55.555555555555555555')
                );
            });
          });
        });
      });

      describe("fees", function () {
        describe("buy", function () {
          it('collect no fees before 500 buys', async function () {
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            await this.buy(this.signers[10], ethFromDollar(3.24));
            let balance = await this.contract.balanceOf(this.signers[10].address);
            expect(ethers.utils.formatEther(balance)).to.be.equal('99680.12378331760646927');
            expect(parseFloat(ethers.utils.formatEther(balance)) * this.tokenPrice).to.be.closeTo(3.24, 0.02)
          });
          it('do collect fees after 500 buys', async function () {
            await this.contract.updateBuyCount(600);
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            await this.buy(this.signers[10], ethFromDollar(3.24));
            let balance = await this.contract.balanceOf(this.signers[10].address);
            // amount without fee is 99680.12378331760646927
            let fees = (eth('99680.12378331760646927').sub(balance));
            expect(parseFloat(ethers.utils.formatEther(fees)) / 100_000).to.be.closeTo(0.02, 0.001)
            expect(parseFloat(ethers.utils.formatEther(balance)) * this.tokenPrice).to.be.closeTo(3.16, 0.02)

          });
          it('do not collect fees after 500 buys when wallet is excluded', async function () {
            await this.contract.updateBuyCount(600);
            await this.contract.excludeFromFees(this.signers[10].address, true);
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            await this.buy(this.signers[10], ethFromDollar(3.24));
            let balance = await this.contract.balanceOf(this.signers[10].address);
            expect(ethers.utils.formatEther(balance)).to.be.equal('99680.12378331760646927');
            expect(parseFloat(ethers.utils.formatEther(balance)) * this.tokenPrice).to.be.closeTo(3.24, 0.02)
          });
        });
        describe("sell", function () {
          it('do collect 5% of fees before 1000 buys', async function () {
            let sellFee = 0.05;
            await this.contract.connect(this.deployer).transfer(this.signers[10].address, eth(1_000_000));
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            let previousBalance = await ethers.provider.getBalance(this.signers[10].address);
            await this.sell(this.signers[10], eth(1000000));
            expect(await this.contract.balanceOf(this.signers[10].address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.signers[10].address);
            let received = newBalance.sub(previousBalance);
            let wouldReceive = ethFromDollar(1000_000 * (1 - sellFee) * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceive)), 1000);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            let fees = wouldReceivedWithoutFeeETH.sub(received);
            expect((fees / wouldReceivedWithoutFeeETH) - 0.04).to.be.closeTo(sellFee, 0.025)
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.0081, 0.0001);
          });
          it('do collect 5% of fees after 500 buys and before 1000 buys', async function () {
            await this.contract.updateBuyCount(600);
            let sellFee = 0.05;
            await this.contract.connect(this.deployer).transfer(this.signers[10].address, eth(1_000_000));
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            let previousBalance = await ethers.provider.getBalance(this.signers[10].address);
            await this.sell(this.signers[10], eth(1000000));
            expect(await this.contract.balanceOf(this.signers[10].address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.signers[10].address);
            let received = newBalance.sub(previousBalance);
            let wouldReceive = ethFromDollar(1000_000 * (1 - sellFee) * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceive)), 1000);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            let fees = wouldReceivedWithoutFeeETH.sub(received);
            expect((fees / wouldReceivedWithoutFeeETH) - 0.04).to.be.closeTo(sellFee, 0.025)
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.0081, 0.0001);
          });
          it('collect 2% of fees after 1000 buys', async function () {
            await this.contract.updateBuyCount(1200);
            let sellFee = 0.02;
            await this.contract.connect(this.deployer).transfer(this.signers[10].address, eth(1_000_000));
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            let previousBalance = await ethers.provider.getBalance(this.signers[10].address);
            await this.sell(this.signers[10], eth(1000000));
            expect(await this.contract.balanceOf(this.signers[10].address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.signers[10].address);
            let received = newBalance.sub(previousBalance);
            let wouldReceive = ethFromDollar(1000_000 * (1 - sellFee) * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceive)), 1000);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            let fees = wouldReceivedWithoutFeeETH.sub(received);
            expect((fees / wouldReceivedWithoutFeeETH) - 0.04).to.be.closeTo(sellFee, 0.025)
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.0083, 0.0001);
          });
          it('do not collect fees after 1000 buys when wallet is excluded', async function () {
            await this.contract.updateBuyCount(1000);
            await this.contract.excludeFromFees(this.signers[10].address, true);
            await this.contract.connect(this.deployer).transfer(this.signers[10].address, eth(1_000_000));
            expect(this.tokenPrice.toString()).to.equal('0.0000324');
            let previousBalance = await ethers.provider.getBalance(this.signers[10].address);
            await this.sell(this.signers[10], eth(1000000));
            expect(await this.contract.balanceOf(this.signers[10].address)).to.equal(eth(0));
            let newBalance = await ethers.provider.getBalance(this.signers[10].address);
            let received = newBalance.sub(previousBalance);
            let wouldReceivedWithoutFeeETH = ethFromDollar(1000_000 * this.tokenPrice);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(parseFloat(ethers.utils.formatEther(wouldReceivedWithoutFeeETH)), 1000);
            expect(parseFloat(ethers.utils.formatEther(received))).to.be.closeTo(0.00862, 0.00001);
          });
        });
        describe("auto swap", function () {
          beforeEach(async function () {
            // after _preventSwapBefore
            await this.contract.updateBuyCount(50);
            // transfer minimum threshold that is 1_000_000
            await this.contract.transfer(this.contract.address, eth(1_000_000));

            await this.contract.transfer(this.signers[14].address, eth(10));
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
          });
        });
      });

      describe("OG wallet update on transfer", function () {
        beforeEach(async function () {
          expect(await this.contract.balanceOf(this.og.address)).to.equal(eth(50_000_000));
          expect(await this.contract.isOG(this.og.address)).to.be.true
          expect(await this.contract.totalOGs()).to.be.equal(10);
        });
        it('removes when selling all tokens', async function () {
          await this.sell(this.og, eth(50_000_000));
          expect(await this.contract.balanceOf(this.og.address)).to.equal(eth(0));
          expect(await this.contract.isOG(this.og.address)).to.be.false
           // do not add the to address because it is the pool
          expect(await this.contract.totalOGs()).to.be.equal(9);
        });

        it('removes when balance ends with less than distributed', async function () {
          await this.contract.connect(this.og).transfer('0x2546BcD3c84621e976D8185a91A922aE77ECEc30', eth(800_000));
          expect(await this.contract.balanceOf(this.og.address)).to.equal(eth(49_200_000));
          expect(await this.contract.isOG(this.og.address)).to.be.false
          expect(await this.contract.isOG('0x2546BcD3c84621e976D8185a91A922aE77ECEc30')).to.be.false
          expect(await this.contract.totalOGs()).to.be.equal(9);
        });

        it('do nothing when balance ends with more than distributed', async function () {
          await this.contract.connect(this.deployer).transfer(this.og.address, eth(800_000));
          await this.contract.connect(this.og).transfer('0x2546BcD3c84621e976D8185a91A922aE77ECEc30', eth(800_000));
          expect(await this.contract.balanceOf(this.og.address)).to.equal(eth(50_000_000));
          expect(await this.contract.isOG(this.og.address)).to.be.true
          expect(await this.contract.isOG('0x2546BcD3c84621e976D8185a91A922aE77ECEc30')).to.be.false
          expect(await this.contract.totalOGs()).to.be.equal(9); // because deployer lose OG when transfering 88000
        });

        it('updates when transfering all tokens', async function () {
          await this.contract.connect(this.og).transfer('0x2546BcD3c84621e976D8185a91A922aE77ECEc30', eth(50000000));
          expect(await this.contract.balanceOf(this.og.address)).to.equal(eth(0));
          expect(await this.contract.isOG(this.og.address)).to.be.false
          expect(await this.contract.isOG('0x2546BcD3c84621e976D8185a91A922aE77ECEc30')).to.be.true
          expect(await this.contract.totalOGs()).to.be.equal(10);
        });
      });

      it('from any address to another address', async function () {
        await this.contract.transfer(this.signers[4].address, eth(500));
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

  describe("withdrawETH", function () {
    describe("without balance", function () {
      it('revert withotu balance', async function () {
        await expect(this.contract.withdrawETH()).to.be.revertedWith("Not enough ETH to withdraw");
      });
    });
    describe("with low balance", function () {
      beforeEach(async function () {
        await this.addOGs(2);
      });
      it('revert with low balance', async function () {
        expect(await this.contract.totalOGs()).to.equal(3);
        await this.contract.withdrawETH();
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth('0.000000000000000001'));
        await expect(this.contract.withdrawETH()).to.be.revertedWith("Not enough ETH to withdraw");
      });
    });
    describe("with enough balance", function () {
      beforeEach(async function () {
        await this.addOGs(1); // OGs ill send 0.5
        await this.contract.setCheckReceive(false);
        await this.signers[4].sendTransaction({
          to: this.contract.address,
          value: eth(999.5) // OG will send 0.5 each, that's why 999.5 here
        });
        await this.contract.setCheckReceive(true);
      });
      it('send to OGs', async function () {
        expect(await this.contract.totalOGs()).to.equal(2);
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(1000));
        let previousOGBalance = await ethers.provider.getBalance(this.og.address);
        await this.contract.withdrawETH();
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
        expect(await ethers.provider.getBalance(this.og.address)).to.equal(previousOGBalance.add(eth(500))); // 400 to OG and 400 to deployer
      });
    });
  });

  describe("manualSwap", function () {
    it('should block not OG', async function () {
      await expect(this.contract.connect(this.notAdmin).manualSwap()).to.be.revertedWith("caller is not the owner or OG after launch");
    });
    describe("when OG", function () {
      beforeEach(async function () {
        await this.deployUniswap();
        await this.addOGs(9);
        await this.contract.setCheckReceive(false);
        await this.deployer.sendTransaction({
          to: this.contract.address,
          value: eth(100)
        });
        await this.contract.setCheckReceive(true);
        await this.contract.ownerLaunch();
        // deployer is loosing status of OG
        await this.contract.transfer(this.contract.address, eth(100000));
      });
      it('should revert when balance is 0', async function () {
        await this.contract.manualSwap();
        await expect(this.contract.manualSwap()).to.be.revertedWith("Not enough tokens to swap");
      });
      it('should swap tokens', async function () {
        expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(100000));
        expect(await ethers.provider.getBalance(this.contract.address)).to.equal(eth(0));
        let previousOGBalance = await ethers.provider.getBalance(this.og.address);
        await this.contract.manualSwap();
        let laterOGBalance = await ethers.provider.getBalance(this.og.address);
        expect(await this.contract.balanceOf(this.contract.address)).to.equal(eth(0));
        expect(await laterOGBalance.sub(previousOGBalance)).to.equal(eth("0.002314793985634819"));
      });
    });
  });
});