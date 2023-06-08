const { expect } = require("chai");

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

        // Deploy the NFTDutchAuction contract and ERC20 token contract
        const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");
        nftDutchAuction = await NFTDutchAuction.deploy(
            erc20Token.address, // ERC20 token contract address
            erc721Token.address, // ERC721 token contract address
            tokenId.value, // NFT token ID
            reservePrice,
            numBlocksAuctionOpen,
            offerPriceDecrement
        );
        await nftDutchAuction.deployed();

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
        const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction_ERC20Bids");

        await expect(NFTDutchAuction.deploy(
            erc20Token.address, // ERC20 token contract address
            erc721Token.address, // ERC721 token contract address
            1, // Replace with the desired token ID to auction
            reservePrice,
            numBlocksAuctionOpen,
            offerPriceDecrement,
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

});
