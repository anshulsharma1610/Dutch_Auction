const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time, loadFixture, mine } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTDutchAuction", function () {
    let nftDutchAuction;
    let erc20Token;
    let erc721Token;
    let owner;
    let bidder1;
    let bidder2;
    let bidder3;
    let tokenId;
    let tokenURI = "https://www.anshulsharma.me";
    let upgradeNumber;

    const reservePrice = ethers.utils.parseEther("100", 18);
    const numBlocksAuctionOpen = 10;
    const offerPriceDecrement = ethers.utils.parseEther("0.1", 18);

    beforeEach(async function () {
        // Set up accounts
        [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

        const ERC721Token = await ethers.getContractFactory("ERC721Token");
        erc721Token = await ERC721Token.deploy();
        await erc721Token.deployed();

        const ERC20Token = await ethers.getContractFactory("ERC20Token");
        erc20Token = await ERC20Token.deploy();
        await erc20Token.deployed();

        // Mint the NFT to the owner's address
        tokenId = await erc721Token.mint(owner.getAddress(), tokenURI);

        upgradeNumber = "v1";

        // Deploy NFTDutchAuction_ERC20Bids contract
        const NFTDutchAuction_ERC20Bids = await ethers.getContractFactory('NFTDutchAuction_ERC20Bids');
        nftDutchAuction = await upgrades.deployProxy(
            NFTDutchAuction_ERC20Bids,
            [
                upgradeNumber,
                erc20Token.address,
                erc721Token.address,
                tokenId.value, // NFT token ID
                reservePrice,
                numBlocksAuctionOpen,
                offerPriceDecrement
            ], { initializer: 'initialize' }
        );

        // Approve NFT for the auction contract
        await erc721Token.approve(nftDutchAuction.address, tokenId.value);
    });

    it("should allow a bidder to place a valid ERC20 bid", async function () {
        const bidAmount = ethers.utils.parseUnits("10", 18);

        // Mint ERC20 tokens for the bidder and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bidAmount);
        await erc20Token.approve(nftDutchAuction.address, bidAmount);

        // Approve ERC20 tokens for the auction contract
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount);

        // Place a bid
        await expect(() =>
            nftDutchAuction.connect(bidder1).placeBid(bidAmount)
        ).to.changeTokenBalance(erc20Token, bidder1, ethers.utils.parseUnits("-10", 18));

        // Verify the bid information
        expect(await nftDutchAuction.highestBidder()).to.equal(bidder1.address);
        expect(await nftDutchAuction.highestBid()).to.equal(bidAmount);

        // Verify the bidder's balance and the contract's balance
        const finalBidderBalance = await erc20Token.balanceOf(bidder1.address);
        const contractBalance = await erc20Token.balanceOf(nftDutchAuction.address);

        expect(finalBidderBalance).to.equal(0);
        expect(contractBalance).to.equal(bidAmount);
    });

    it("should refund a non-winning bidder", async function () {
        const bid1Amount = ethers.utils.parseUnits("1", 18);
        const bid2Amount = ethers.utils.parseUnits("110", 18);

        // Mint ERC20 tokens for the bidders and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bid1Amount);
        await erc20Token.mint(bidder2.address, bid2Amount);

        // Approve ERC20 tokens for the auction contract
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bid1Amount);
        await erc20Token.connect(bidder2).approve(nftDutchAuction.address, bid2Amount);

        // Place a bid with the bidders
        await expect(() =>
            nftDutchAuction.connect(bidder1).placeBid(bid1Amount)
        ).to.changeTokenBalance(erc20Token, bidder1, ethers.utils.parseUnits("-1", 18));

        await expect(() =>
            nftDutchAuction.connect(bidder2).placeBid(bid2Amount)
        ).to.changeTokenBalance(erc20Token, bidder2, ethers.utils.parseUnits("-110", 18));

        // Refund the non-winning bidder
        await expect(() =>
            nftDutchAuction.refundBidders(bidder1.address)
        ).to.changeTokenBalance(erc20Token, bidder1, ethers.utils.parseUnits("1", 18));

        // Verify the bidder's balance
        const finalBidderBalance = await erc20Token.balanceOf(bidder1.address);
        expect(finalBidderBalance).to.gte(bid1Amount);
    });

    it("should end the auction and transfer the NFT to the highest bidder", async function () {
        const bidAmount = ethers.utils.parseUnits("100", 18);

        // Mint ERC20 tokens for the bidder and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bidAmount);
        await erc20Token.approve(nftDutchAuction.address, bidAmount);

        // Approve ERC20 tokens for the auction contract
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount);

        // Place a bid
        await expect(() =>
            nftDutchAuction.connect(bidder1).placeBid(bidAmount)
        ).to.changeTokenBalance(erc20Token, bidder1, ethers.utils.parseUnits("-100", 18));

        // End the auction
        await nftDutchAuction.endAuction();

        // Verify the auction status
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        // Verify the NFT ownership
        expect(await erc721Token.ownerOf(tokenId.value)).to.equal(bidder1.address);
    });

    it("should allow only owner to mint tokens", async function () {
        // Mint a token as the owner
        const tokenURI = "https://www.example.com/token1";
        const tx = await erc721Token.connect(owner).mint(owner.address, tokenURI);
        const receipt = await tx.wait();
        const tokenId = receipt.events[0].args.tokenId.toNumber();

        // Verify the token details
        const tokenOwner = await erc721Token.ownerOf(tokenId);
        expect(tokenOwner).to.equal(owner.address);

        const tokenURIStored = await erc721Token.tokenURI(tokenId);
        expect(tokenURIStored).to.equal(tokenURI);

        // Mint a token as a non-owner account (expecting a revert)
        const tokenURI2 = "https://www.example.com/token2";
        await expect(
            erc721Token.connect(bidder1).mint(bidder1.address, tokenURI2)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should allow only owner to mint tokens", async function () {
        // Mint a token as the owner
        const tokenURI = "https://www.example.com/token1";
        const tx = await erc721Token.connect(owner).mint(owner.address, tokenURI);
        const receipt = await tx.wait();
        const tokenId = receipt.events[0].args.tokenId.toNumber();

        // Verify the token details
        const tokenOwner = await erc721Token.ownerOf(tokenId);
        expect(tokenOwner).to.equal(owner.address);

        const tokenURIStored = await erc721Token.tokenURI(tokenId);
        expect(tokenURIStored).to.equal(tokenURI);

        // Mint a token as a non-owner account (expecting a revert)
        const tokenURI2 = "https://www.example.com/token2";
        await expect(
            erc721Token.connect(bidder1).mint(bidder1.address, tokenURI2)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should revert when a non-owner tries to mint tokens", async () => {
        const amount = 1000;

        // Non-owner attempts to mint tokens
        await expect(
            erc20Token.connect(bidder1).mint(owner.address, amount)
        ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should emit AuctionEnded event with address(0) and 0 amount when no bids were placed", async () => {
        expect(await nftDutchAuction.auctionEnded()).to.equal(false);
        expect(await nftDutchAuction.itemSold()).to.equal(false);

        await expect(nftDutchAuction.endAuction()).to.emit(nftDutchAuction, "AuctionEnded").withArgs(ethers.constants.AddressZero, 0);

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);
    });

    it('should not allow bids below the 0', async () => {
        await expect(nftDutchAuction.connect(bidder1).placeBid(ethers.utils.parseUnits('0', 0))).to.be.revertedWith(
            'Bid amount must be greater than zero'
        );
    });

    it('should not allow to end auction if auction has already ended', async () => {
        const bidAmount = ethers.utils.parseUnits("120", 18);
        // Mint ERC20 tokens for the bidder and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bidAmount);
        await erc20Token.approve(nftDutchAuction.address, bidAmount);

        // Approve ERC20 tokens for the auction contract
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount);

        // Place a bid
        await expect(() =>
            nftDutchAuction.connect(bidder1).placeBid(bidAmount)
        ).to.changeTokenBalance(erc20Token, bidder1, ethers.utils.parseUnits("-120", 18));

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        await expect(nftDutchAuction.endAuction()).to.be.revertedWith('Auction has already ended');
    });

    it('should not allow to place bids if auction has already ended', async () => {
        const bidAmount = ethers.utils.parseUnits("120", 18);
        // Mint ERC20 tokens for the bidder and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bidAmount);
        await erc20Token.approve(nftDutchAuction.address, bidAmount);

        // Approve ERC20 tokens for the auction contract
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount);

        // Place a bid
        await expect(() =>
            nftDutchAuction.connect(bidder1).placeBid(bidAmount)
        ).to.changeTokenBalance(erc20Token, bidder1, ethers.utils.parseUnits("-120", 18));

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);

        const bid2Amount = ethers.utils.parseUnits("200", 18);
        // Mint ERC20 tokens for the bidder and approve them for the auction contract
        await erc20Token.mint(bidder2.address, bid2Amount);
        await erc20Token.approve(nftDutchAuction.address, bid2Amount);

        // Approve ERC20 tokens for the auction contract
        erc20Token.connect(bidder2).approve(nftDutchAuction.address, bid2Amount);

        // Place a bid
        await expect(nftDutchAuction.connect(bidder1).placeBid(bidAmount)).to.be.revertedWith('Auction has already ended');
    });

    it("Should not allow Auction creator to deploy contract if the NFT does not belong to them", async function () {
        //Mint NFT with tokenId 1 to bidder1
        await expect(erc721Token.mint(bidder1.address, "Test URI"))
            .to.emit(erc721Token, "Transfer")
            .withArgs(ethers.constants.AddressZero, bidder1.address, 1);

        //Deploy NFT contract with bidder1's tokenId, should fail
        const NFTDutchAuction_ERC20Bids = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");

        await expect(upgrades.deployProxy(
            NFTDutchAuction_ERC20Bids,
            [
                upgradeNumber,
                erc20Token.address, // ERC20 token contract address
                erc721Token.address, // ERC721 token contract address
                1, // Replace with the desired token ID to auction
                reservePrice,
                numBlocksAuctionOpen,
                offerPriceDecrement
            ], { initializer: 'initialize' }
        )).to.be.revertedWith("NFT token Id does not belong to the Auction's Owner");
    });

    it('should place normal bids', async () => {
        const bid1Amount = ethers.utils.parseUnits("90", 18);
        const bid2Amount = ethers.utils.parseUnits("101", 18);
        // Mint ERC20 tokens for the bidder and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bid1Amount);
        await erc20Token.approve(nftDutchAuction.address, bid1Amount);
        await erc20Token.mint(bidder2.address, bid2Amount);
        await erc20Token.approve(nftDutchAuction.address, bid2Amount);

        // Approve ERC20 tokens for the auction contract
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bid1Amount);
        await erc20Token.connect(bidder2).approve(nftDutchAuction.address, bid2Amount);

        // Place a bid
        await nftDutchAuction.connect(bidder1).placeBid(bid1Amount);
        await nftDutchAuction.connect(bidder2).placeBid(bid2Amount);

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await erc721Token.ownerOf(0)).to.equal(bidder2.address);
    });

    it("should increase the highest bid and transfer tokens if bid amount is greater than current highest bid", async function () {
        const bid1Amount = ethers.utils.parseUnits("20", 18);
        const bid2Amount = ethers.utils.parseUnits("40", 18);

        // Mint ERC20 tokens for the bidders and approve them for the auction contract
        await erc20Token.mint(owner.address, bid1Amount);
        await erc20Token.mint(bidder1.address, bid2Amount);
        await erc20Token.approve(nftDutchAuction.address, bid1Amount); // Approve auction contract to spend tokens
        await erc20Token.approve(nftDutchAuction.address, bid2Amount); // Approve auction contract to spend tokens

        // Place a bid with the owner
        await nftDutchAuction.placeBid(bid1Amount);

        // Place a higher bid with the bidder
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bid2Amount); // Approve auction contract to spend tokens
        // await expect(() =>
        await nftDutchAuction.connect(bidder1).placeBid(bid2Amount);
        // ).to.changeTokenBalance(erc20Token, bidder1, bid2Amount);

        // Verify the highest bid and bidder
        const finalHighestBid = await nftDutchAuction.highestBid();
        expect(finalHighestBid).to.equal(bid2Amount);

        const finalHighestBidder = await nftDutchAuction.highestBidder();
        expect(finalHighestBidder).to.equal(bidder1.address);
    });

    it("should transfer tokens back to the bidder if bid amount is not greater than current highest bid", async function () {
        const bidAmount = ethers.utils.parseUnits("100", 18);

        // Mint ERC20 tokens for the bidders and approve them for the auction contract
        await erc20Token.mint(owner.address, bidAmount);
        await erc20Token.mint(bidder1.address, bidAmount);
        await erc20Token.approve(nftDutchAuction.address, bidAmount); // Approve auction contract to spend tokens

        // Place a bid with the owner
        await nftDutchAuction.placeBid(bidAmount);

        // Place a lower bid with the bidder
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount.div(2)); // Approve auction contract to spend tokens
        // await expect(() =>
        await nftDutchAuction.connect(bidder1).placeBid(bidAmount.div(2));
        // ).to.changeTokenBalance(erc20Token, bidder1, bidAmount.div(2));

        // Verify the highest bid and bidder remain unchanged
        const finalHighestBid = await nftDutchAuction.highestBid();
        expect(finalHighestBid).to.equal(bidAmount);

        const finalHighestBidder = await nftDutchAuction.highestBidder();
        expect(finalHighestBidder).to.equal(owner.address);
    });

    it('should not allow the bidder to refund their bid if auction has not ended', async () => {
        await expect(nftDutchAuction.connect(bidder2).refundBidders(bidder2.address)).to.be.revertedWith('Auction has not ended yet');
    });

    it('should not allow bidder to refund if they do not have a bid', async () => {
        const bidAmount = ethers.utils.parseUnits("200", 18);

        // Mint ERC20 tokens for the bidders and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bidAmount);
        // Place a lower bid with the bidder
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount); // Approve auction contract to spend tokens
        await nftDutchAuction.connect(bidder1).placeBid(bidAmount);

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        // bidder who did not place a bid
        await expect(nftDutchAuction.connect(bidder3).refundBidders(bidder3.address)).to.be.revertedWith("No bid to refund");
    });

    it('should not allow highest bidder to refund', async () => {
        const bidAmount = ethers.utils.parseUnits("200", 18);

        // Mint ERC20 tokens for the bidders and approve them for the auction contract
        await erc20Token.mint(bidder1.address, bidAmount);
        // Place a lower bid with the bidder
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, bidAmount); // Approve auction contract to spend tokens
        await nftDutchAuction.connect(bidder1).placeBid(bidAmount);

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        // bidder who did not place a bid
        await expect(nftDutchAuction.connect(bidder1).refundBidders(bidder1.address)).to.be.revertedWith("Highest bidder cannot refund");
    });

    it("Checking before proxy, response of getMessage() function should be v1", async function () {
        expect(await nftDutchAuction.getMessage()).to.equal('v1');
    });

    it("Checking after proxy, response of getMessage() function should be v2", async function () {
        const NFTDutchAuction_ERC20Bids = await ethers.getContractFactory('NFTDutchAuction_ERC20Bids');
        const nftDutchAuction_v2 = await upgrades.deployProxy(
            NFTDutchAuction_ERC20Bids,
            [
                "v2",
                erc20Token.address,
                erc721Token.address,
                tokenId.value, // NFT token ID
                reservePrice,
                numBlocksAuctionOpen,
                offerPriceDecrement
            ],
            {
                kind: 'uups',
                initializer: "initialize",
                timeout: 0
            });
        await nftDutchAuction_v2.deployed();
        expect(await nftDutchAuction_v2.getMessage()).to.equal('v2');
    });

    // ---------------------------------------

    it("should have correct name, symbol, and decimals", async function () {
        expect(await erc20Token.name()).to.equal("DOTToken");
        expect(await erc20Token.symbol()).to.equal("DOT");
        expect(await erc20Token.decimals()).to.equal(18);
    });

    it('should allow submitting a bid with a valid permit', async () => {
        // Mint some tokens for the user
        const tokenAmount = ethers.utils.parseEther('1000');
        await erc20Token.mint(bidder1.address, tokenAmount);

        // Generate a permit for the user
        const permitAmount = ethers.utils.parseEther('100');
        const permitDeadline = Math.floor(Date.now() / 1000) + 3600; // Set the deadline to 1 hour from now
        const nonce = await erc20Token.nonces(bidder1.address);
        const permit = await ethers.utils._TypedDataEncoder.hashDomain(
            {
                name: 'DOTToken',
                version: '1',
                chainId: ethers.provider.network.chainId,
                verifyingContract: erc20Token.address,
            },
            'Permit',
            [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
            ],
            [bidder1.address, nftDutchAuction.address, permitAmount, permitDeadline, nonce]
        );
        const permitSignature = await bidder1.signMessage(ethers.utils.arrayify(permit));

        const v = ethers.utils.splitSignature(permitSignature).v; // Retrieve the v value
        const r = ethers.utils.splitSignature(permitSignature).r; // Retrieve the r value
        const s = ethers.utils.splitSignature(permitSignature).s; // Retrieve the s value

        // Approve the NFTDutchAuction contract to spend tokens on behalf of the user
        await erc20Token.connect(bidder1).approve(nftDutchAuction.address, tokenAmount);

        // Submit a bid with the valid permit
        // Assuming `nftDutchAuction` is an instance of the NFTDutchAuction contract

        const bidAmount = ethers.utils.parseUnits("1", "ether"); // Example bid amount of 1 ETH
        console.log('permit sig', v, r, s, nonce);
        // Create a valid permitData object
        const permitData = {
            owner: owner.address, // Replace with the owner's address
            spender: bidder1.address, // Replace with the spender's address
            value: bidAmount, // Pass the bid amount as the value
            deadline: permitDeadline, // Replace with the permit deadline timestamp
            nonce: nonce, // Repace with the permit nonce
            v: v, // Replace with the v value from the permit signature
            r: r, // Replace with the r value from the permit signature
            s: s, // Replace with the s value from the permit signature
        };

        // Call the submitBidWithPermit function
        expect(await nftDutchAuction.submitBidWithPermit(bidAmount, permitData)).to.be.fulfilled;

        // Check the bid submission status and balances
        expect(await nftDutchAuction.bidderBids(bidder1.address)).to.equal(bidAmount);
        expect(await erc20Token.balanceOf(bidder1.address)).to.equal(tokenAmount.sub(bidAmount));
    });

});
