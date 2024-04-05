// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import '@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol';
import '@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol';
import "hardhat/console.sol";

contract CapybaseSocietyToken is ERC20, Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    mapping (address => bool) public isExcludedFromFees;
    mapping(address => bool) public isExcludedFromMaxTransaction;
    bool public swapEnabled;
    bool public tradingActive;
    bool public checkReceive = true;
    uint256 public ogDistributedTokens = 0;
    address[] public OGs;
    address public uniswapV2Pair;

    // UniswapV2Router02 on BASE from SUSHI
    address public Router = 0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891;

    mapping(address => bool) private _automatedMarketMakerPairs;
    uint256 private _priceOG = 0.5 ether;
    uint256 private _maxOGs = 50;
    uint256 private _initialBuyFee = 0;
    uint256 private _initialSellFee = 5; // 5%
    uint256 private _finalBuyFee = 2; // 2%
    uint256 private _finalSellFee = 2;
    uint256 private _increaseBuyFeeAt = 500; // 500 buys before increase
    uint256 private _reduceSellFeeAt = 1000; // 1000 sells before reduce
    uint256 private _preventSwapBefore = 50; // 50 buys before swap
    uint256 private _buyCount = 0;
    uint256 private _minWithdrawToken = 100_000; // 100,000 tokens
    uint256 private _minWithdrawETH = 1_000_000 gwei; // 0.001 ether
    uint8 private _decimals = 18;
    uint256 private _mintTotal = 1_000_000_000 * 10 ** _decimals;
    uint256 private _maxFeeSwap= 10_000_000 * 10 ** _decimals;
    bool private _swapping = false;
    uint256 public maxTransaction = _mintTotal;
    uint256 public maxWallet = _mintTotal / 50;
    uint256 public swapTokensAtAmount = (_mintTotal * 1) / 1000;

    IUniswapV2Router02 private uniswapV2Router;
    modifier lockTheSwap {
        _swapping = true;
        _;
        _swapping = false;
    }

    event ExcludeFromLimits(address indexed account, bool isExcluded);

    event ExcludeFromFees(address indexed account, bool isExcluded);

    event SetAutomatedMarketMakerPair(address indexed pair, bool indexed value);

    constructor()
        ERC20("Capybase Society Token", "CAPY")
        Ownable()
    {
        _excludeFromFees(msg.sender, true);
        _excludeFromFees(address(this), true);
        _excludeFromFees(address(0xdead), true);

        _excludeFromMaxTransaction(msg.sender, true);
        _excludeFromMaxTransaction(address(this), true);
        _excludeFromMaxTransaction(address(0xdead), true);

        _addOG(msg.sender);

        _mint(address(this), _mintTotal);
    }

    modifier onlyOGAfterLaunchOrOwner() {
        require(owner() == msg.sender || (isOG(msg.sender) && tradingActive), "caller is not the owner or OG after launch");
        _;
    }

    modifier onlyOG() {
        require(isOG(msg.sender), "caller is not a OG");
        _;
    }

    receive() external payable  {
        if (!_automatedMarketMakerPairs[msg.sender] && msg.sender != address(uniswapV2Router) && checkReceive) {
            require(!tradingActive, "Trading already started");
            require(OGs.length < _maxOGs, "Max OGs reached");
            require(!isOG(msg.sender), "Already an OG");
            require(msg.value == _priceOG, "Invalid amount");
            _addOG(msg.sender);
        }
    }

    function isOG(address account) public view returns (bool) {
        for(uint i = 0; i < OGs.length; i++) {
            if (OGs[i] == account) {
                return true;
            }
        }
        return false;
    }

    function totalOGs() public view returns (uint256) {
        return OGs.length;
    }

    function excludeFromMaxTransaction(address account, bool value)
        public
        onlyOwner
    {
        _excludeFromMaxTransaction(account, value);
    }

    function _excludeFromMaxTransaction(address account, bool value)
        private
    {
        isExcludedFromMaxTransaction[account] = value;
        emit ExcludeFromLimits(account, value);
    }

    function excludeFromFees(address account, bool value) public onlyOwner {
        _excludeFromFees(account, value);
    }

    function _excludeFromFees(address account, bool value) private {
        isExcludedFromFees[account] = value;
        emit ExcludeFromFees(account, value);
    }

    function setSwapEnabled(bool value) public onlyOwner {
        swapEnabled = value;
    }

    // missing tests
    function setSwapTokensAtAmount(uint256 amount) public onlyOwner {
        require(
            amount >= (totalSupply() * 1) / 100000,
            "ERC20: Swap amount cannot be lower than 0.001% total supply."
        );
        require(
            amount <= (totalSupply() * 5) / 1000,
            "ERC20: Swap amount cannot be higher than 0.5% total supply."
        );
        swapTokensAtAmount = amount;
    }

    // missing tests
    function setMaxWalletAndMaxTransaction(
        uint256 _maxTransaction,
        uint256 _maxWallet
    ) public onlyOwner {
        require(
            _maxTransaction >= ((totalSupply() * 5) / 1000),
            "ERC20: Cannot set maxTxn lower than 0.5%"
        );
        require(
            _maxWallet >= ((totalSupply() * 5) / 1000),
            "ERC20: Cannot set maxWallet lower than 0.5%"
        );
        maxTransaction = _maxTransaction;
        maxWallet = _maxWallet;
    }

    function toogleCheckReceive(bool value) public onlyOwner {
        checkReceive = value;
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(from != address(0), "ERC20: transfer from the zero address");
        require(to != address(0), "ERC20: transfer to the zero address");
        if (amount == 0) {
            super._transfer(from, to, 0);
            return;
        }

        if (
            from != owner() &&
            to != owner() &&
            to != address(0) &&
            to != address(0xdead) &&
            !_swapping
        ) {
            // Before trading active, only allows transfers between allowed addresses
            if (!tradingActive) {
                require(
                    isExcludedFromFees[from] || isExcludedFromFees[to],
                    "Trading not started"
                );
            }

            // test maxTransaction and maxWallet
            // when buy
            if (
                _automatedMarketMakerPairs[from] &&
                !isExcludedFromMaxTransaction[to]
            ) {
                require(
                    amount <= maxTransaction,
                    "Buy transfer amount exceeds the maxTransaction."
                );
                require(
                    amount + balanceOf(to) <= maxWallet,
                    "Max wallet exceeded"
                );
            }
            // when sell
            else if (
                _automatedMarketMakerPairs[to] &&
                !isExcludedFromMaxTransaction[from]
            ) {
                require(
                    amount <= maxTransaction,
                    "Sell transfer amount exceeds the maxTransaction."
                );
            }
            // when normal transfer
            else if (!isExcludedFromMaxTransaction[to]) {
                require(
                    amount + balanceOf(to) <= maxWallet,
                    "Max wallet exceeded"
                );
            }
        }

        uint256 contractTokenBalance = balanceOf(address(this));
        if (
            contractTokenBalance >= swapTokensAtAmount && // there is more tokens than threshold
            swapEnabled && // auto swap is enabled
            tradingActive && // pool is created
            !_swapping && // it is not a transfer of swap from contract
            !isExcludedFromFees[from] &&
            !isExcludedFromFees[to] &&
            _automatedMarketMakerPairs[to] && // it is a sell
            _buyCount >= _preventSwapBefore // it is not the first transactions
        ) {
            _swap(min(amount, min(contractTokenBalance, _maxFeeSwap)));
        }

        // If sender is not excluded from fees and not swaping, take fees
        if (!isExcludedFromFees[from] && !isExcludedFromFees[to] && !_swapping) {
            uint256 fees = 0;

            // on buy
            if (_automatedMarketMakerPairs[from] && !_automatedMarketMakerPairs[to] && ! isExcludedFromFees[to] ) {
                fees = amount.mul((_buyCount>=_increaseBuyFeeAt) ? _finalBuyFee : _initialBuyFee).div(100);
                _buyCount++; // only ocunts buys made by addresses not whitelabeled
            }
            // on sell
            else if (_automatedMarketMakerPairs[to] && ! isExcludedFromFees[from]) {
                fees = amount.mul((_buyCount>=_reduceSellFeeAt) ? _finalSellFee : _initialSellFee).div(100);
            }

            if (fees > 0) {
                super._transfer(from, address(this), fees);
            }

            amount -= fees;
        }

        // updates OG wallet when moving all tokens
        if(
            isOG(from) &&
            from != address(this) &&
            !_automatedMarketMakerPairs[to] &&
            amount == balanceOf(from) &&
            amount >= ogDistributedTokens)
        {
            _removeOG(from);
            _addOG(to);
        }

        super._transfer(from, to, amount);
    }

    // owner can launch at any time
    function ownerLaunch() external onlyOwner {
        _launch();
    }

    // OGs can launch after max OGs reached
    function launch() external onlyOG {
        require(OGs.length == _maxOGs, "Max OGs not reached");
        _launch();
    }

    function _launch() private {
        require(!tradingActive, "Trading already started");
        require(address(this).balance > 1 ether, "Not enough ETH in the contract");

        uniswapV2Router = IUniswapV2Router02(Router);
        _approve(address(this), address(uniswapV2Router), totalSupply());
        _excludeFromMaxTransaction(address(uniswapV2Router), true);

        uniswapV2Pair = IUniswapV2Factory(uniswapV2Router.factory()).createPair(address(this), uniswapV2Router.WETH());
        _approve(address(this), address(uniswapV2Pair), type(uint256).max); // usado no swap
        IERC20(uniswapV2Pair).approve(address(uniswapV2Router), type(uint).max);
        _setAutomatedMarketMakerPair(address(uniswapV2Pair), true);
        _excludeFromMaxTransaction(address(uniswapV2Pair), true);

        uint256 amountTokenDesired = balanceOf(address(this)) * 50 / 100;
        uniswapV2Router.addLiquidityETH {
          value: address(this).balance
        }(
          address(this), // token
          amountTokenDesired, // amountTokenDesired
          0, // amountTokenMin
          0, // amountETHMin
          address(0), // to
          block.timestamp // deadline
        );

        // Withdraw to OGs the initial distribution
        // Do not use _withdrawTokens because it will remove OGs without balance
        ogDistributedTokens = balanceOf(address(this)).div(OGs.length);
        for(uint i = 0; i < OGs.length; i++) {
            _transfer(address(this), OGs[i], ogDistributedTokens);
        }

        tradingActive = true;
        swapEnabled = true;
    }

    function setRouter(address router) external onlyOwner {
        Router = router;
    }

    function manualSwap() external onlyOGAfterLaunchOrOwner {
        uint256 tokenBalance = balanceOf(address(this));
        require(tokenBalance > _minWithdrawToken, "Not enough tokens to swap");
        _swap(tokenBalance);
    }

    function _swap(uint256 amount) private lockTheSwap {
        // swap tokens for ETH
        if (amount < _minWithdrawToken) {
            return;
        }

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapV2Router.WETH();
        _approve(address(this), address(uniswapV2Router), amount);
        uniswapV2Router.swapExactTokensForETHSupportingFeeOnTransferTokens(
            amount, // The amount of input tokens to send.
            0, // The minimum amount of output tokens that must be received for the transaction not to revert.
            path, // An array of token addresses. path.length must be >= 2. Pools for each consecutive pair of addresses must exist and have liquidity.
            address(this), // Recipient of the ETH.
            block.timestamp // Unix timestamp after which the transaction will revert.
        );

        // send ETH to OGs
        _withdrawETH(address(this).balance);
    }

    function withdrawTokens() external onlyOGAfterLaunchOrOwner {
        uint256 tokenBalance = balanceOf(address(this));
        require(tokenBalance > _minWithdrawToken, "Not enough tokens to withdraw");
        _withdrawTokens(tokenBalance);
    }

    function _withdrawTokens(uint256 amount) private {
        if (amount > _minWithdrawToken) {
            _checkOGBalance();
            uint256 ogAmount = amount.div(OGs.length);
            for(uint i = 0; i < OGs.length; i++) {
                _transfer(address(this), OGs[i], ogAmount);
            }
        }
    }

    function withdrawETH() external onlyOGAfterLaunchOrOwner {
        uint256 ethBalance = address(this).balance;
        require(ethBalance > _minWithdrawETH, "Not enough ETH to withdraw");
        _withdrawETH(ethBalance);
    }

    function _withdrawETH(uint256 amount) private {
        if(amount > _minWithdrawETH) {
            _checkOGBalance();
            uint256 ogAmount = amount.div(OGs.length);
            for(uint i = 0; i < OGs.length; i++) {
                payable(OGs[i]).transfer(ogAmount);
            }
        }
    }

    function _checkOGBalance() private {
        if(ogDistributedTokens == 0) return;

        for(uint i = 0; i < OGs.length; i++) {
            if(balanceOf(OGs[i]) < ogDistributedTokens) {
                _removeOG(OGs[i]);
            }
        }
    }

    function _addOG(address account) private {
        _excludeFromFees(account, true);
        _excludeFromMaxTransaction(account, true);
        OGs.push(account);
    }

    function _removeOG(address account) private {
        uint index;
        for(uint i = 0; i < OGs.length; i++) {
            if (OGs[i] == account) {
                index = i;
                break;
            }
        }

        for (uint i = index; i < OGs.length-1; i++){
            OGs[i] = OGs[i+1];
        }
        OGs.pop();
        _excludeFromFees(account, false);
        _excludeFromMaxTransaction(account, false);
    }

    function _setAutomatedMarketMakerPair(address pair, bool value) private {
        _automatedMarketMakerPairs[pair] = value;
        emit SetAutomatedMarketMakerPair(pair, value);
    }

    // missing tests
    function withdrawStuckTokens(address tkn) external onlyOwner {
        bool success;
        if (tkn == address(0))
            (success, ) = address(msg.sender).call{
                value: address(this).balance
            }("");
        else {
            require(IERC20(tkn).balanceOf(address(this)) > 0, "No tokens");
            uint256 amount = IERC20(tkn).balanceOf(address(this));
            uint256 ogAmount = amount.div(OGs.length);
            for(uint i = 0; i < OGs.length; i++) {
                IERC20(tkn).transfer(OGs[i], ogAmount);
            }

        }
    }

    // This method is used only in tests, not usable in producton.
    function updateBuyCount(uint256 count) external onlyOwner {
        require(_buyCount == 0, "Not zero");
        _buyCount = count;
    }

    function min(uint256 a, uint256 b) private pure returns (uint256) {
        return (a>b)?b:a;
    }
}