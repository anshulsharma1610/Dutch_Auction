const { expect } = require("chai");

describe("NFT Dutch Auction", function () {
    let nftDutchAuction;
    let owner;
    let bidder1;
    let bidder2;
    let erc721Token;
    let tokenId;
    let tokenURI = "https://www.anshulsharma.me";

    const reservePrice = ethers.utils.parseEther("2");
    const numBlocksAuctionOpen = 10;
    const offerPriceDecrement = ethers.utils.parseEther("0.1");

    beforeEach(async function () {
        [owner, bidder1, bidder2, bidder3] = await ethers.getSigners();

        const ERC721Token = await ethers.getContractFactory("ERC721Token");
        erc721Token = await ERC721Token.deploy();

        await erc721Token.deployed();

        console.log("ERC721Token deployed to:", erc721Token.address);

        // Mint the NFT to the owner's address
        tokenId = await erc721Token.mint(owner.getAddress(), tokenURI);
        // console.log("tokenId is:", tokenId);

        const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");
        nftDutchAuction = await NFTDutchAuction.deploy(
            erc721Token.address,
            tokenId.value, // Replace with the desired token ID to auction
            reservePrice,
            numBlocksAuctionOpen,
            offerPriceDecrement,
        );

        await nftDutchAuction.deployed();

        // Approve the Dutch Auction contract to transfer the NFT token
        await erc721Token.approve(nftDutchAuction.address, tokenId.value);
        console.log("NFTDutchAuction deployed to:", nftDutchAuction.address);
    });

    it("should start the auction with correct parameters", async function () {
        expect(await nftDutchAuction.owner()).to.equal(owner.address);
        expect(await nftDutchAuction.erc721TokenAddress()).to.equal(erc721Token.address);
        expect(await nftDutchAuction.nftTokenId()).to.equal(0);
        expect(await nftDutchAuction.reservePrice()).to.equal(ethers.utils.parseEther("2"));
        expect(await nftDutchAuction.numBlocksAuctionOpen()).to.equal(10);
        expect(await nftDutchAuction.offerPriceDecrement()).to.equal(ethers.utils.parseEther("0.1"));
        expect(await nftDutchAuction.initialPrice()).to.equal(ethers.utils.parseEther("3"));
        expect(await nftDutchAuction.auctionStartTime()).to.be.above(0);
        expect(await nftDutchAuction.auctionEnded()).to.equal(false);
        expect(await nftDutchAuction.itemSold()).to.equal(false);
    });

    it("should allow a bidder to place a valid bid", async function () {
        await nftDutchAuction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('1') });
        await nftDutchAuction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('1') });
        await nftDutchAuction.connect(bidder3).placeBid({ value: ethers.utils.parseEther('8.5') });

        expect(await nftDutchAuction.bids(bidder1.address)).to.equal(ethers.utils.parseEther('1'));
        expect(await nftDutchAuction.bids(bidder2.address)).to.equal(ethers.utils.parseEther('1'));
        // expect(await nftDutchAuction.bids(bidder3.address)).to.equal(ethers.utils.parseEther('8.5'));
        expect(await nftDutchAuction.highestBidder()).to.equal(bidder3.address);
        expect(await nftDutchAuction.highestBid()).to.equal(ethers.utils.parseEther('8.5'));
    });

    it("should end the auction and transfer the NFT to the highest bidder when the auction duration is reached", async function () {
        // Place bids from different bidders
        const bid1 = ethers.utils.parseEther("1");
        await nftDutchAuction.connect(bidder1).placeBid({ value: bid1 });

        const bid2 = ethers.utils.parseEther("2");
        await nftDutchAuction.connect(bidder2).placeBid({ value: bid2 });

        // Increase block number to reach the end of the auction duration
        const auctionDuration = numBlocksAuctionOpen;
        await ethers.provider.send("evm_increaseTime", [auctionDuration]);

        // End the auction
        await nftDutchAuction.endAuction();

        // Check that the auction status is updated
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        // Check that the NFT is no longer owned by the contract
        const ownerOfNFT = await erc721Token.ownerOf(0);
        expect(ownerOfNFT).to.equal(bidder2.address);
    });

    it("should end the auction and transfer the NFT to the highest bidder when the auction duration is reached", async () => {
        // Place bids
        const bid1 = ethers.utils.parseEther("1");
        const bid2 = ethers.utils.parseEther("2");
        await nftDutchAuction.connect(bidder1).placeBid({ value: bid1 });
        await nftDutchAuction.connect(bidder2).placeBid({ value: bid2 });

        // Move to the next block after the auction duration
        const blockTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
        await ethers.provider.send("evm_setNextBlockTimestamp", [blockTimestamp + numBlocksAuctionOpen]);

        // End the auction
        await nftDutchAuction.endAuction();

        // Check the auction status
        expect(await nftDutchAuction.auctionEnded()).to.be.true;
        expect(await nftDutchAuction.itemSold()).to.be.true;
        console.log('owner:-', await erc721Token.ownerOf(0), owner.address)
        // Check the NFT transfer
        expect(await erc721Token.ownerOf(0)).to.equal(bidder2.address);

        // Check the refund to bidder1
        const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);
        await nftDutchAuction.connect(bidder1).refundBidders(bidder1.address);
        const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);
        // const bidder1RefundAmount = await nftDutchAuction.getBidderInfo(bidder1.address);
        expect(bidder1BalanceAfter.sub(bidder1BalanceBefore)).to.gte(1);
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

    it("Should not allow Auction creator to deploy contract if the NFT does not belong to them", async function () {
        //Mint NFT with tokenId 1 to bidder1
        await expect(erc721Token.mint(bidder1.address, "Test URI"))
            .to.emit(erc721Token, "Transfer")
            .withArgs(ethers.constants.AddressZero, bidder1.address, 1);

        //Deploy NFT contract with bidder1's tokenId, should fail
        const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");

        await expect(NFTDutchAuction.deploy(
            erc721Token.address,
            1, // Replace with the desired token ID to auction
            reservePrice,
            numBlocksAuctionOpen,
            offerPriceDecrement,
        )).to.be.revertedWith("NFT token Id does not belong to the Auction's Owner");
    });

    it("should end the auction if the bid amount is equal to or greater than the initial price", async function () {
        // Place a bid equal to the initial price
        const initialBidAmount = ethers.utils.parseEther("5");
        await nftDutchAuction.connect(bidder1).placeBid({ value: initialBidAmount });

        // Verify that the auction has ended and the item is sold
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        // Verify that the NFT is transferred to the recipient
        expect(await erc721Token.ownerOf(0)).to.equal(bidder1.address);

        // Verify that the recipient received the highest bid amount
        const recipientBalance = await ethers.provider.getBalance(owner.address);
        expect(recipientBalance).to.gte(initialBidAmount);

        // Verify that the other bidders are refunded
        const bidder1Balance = await ethers.provider.getBalance(bidder1.address);
        // expect(bidder1Balance).to.equal(0);
    });

    it("should emit AuctionEnded event with address(0) and 0 amount when no bids were placed", async () => {
        expect(await nftDutchAuction.auctionEnded()).to.equal(false);
        expect(await nftDutchAuction.itemSold()).to.equal(false);

        await expect(nftDutchAuction.endAuction()).to.emit(nftDutchAuction, "AuctionEnded").withArgs(ethers.constants.AddressZero, 0);

        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);
    });

    it('should not allow bids below the 0', async () => {
        await expect(nftDutchAuction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('0') })).to.be.revertedWith(
            'Bid amount must be greater than zero'
        );
    });

    it('should not allow the bidder to refund their bid if auction has not ended', async () => {
        await expect(nftDutchAuction.connect(bidder2).refundBidders(bidder2.address)).to.be.revertedWith('Auction has not ended yet');
    });

    it('should not allow bidder to refund if they do not have a bid', async () => {
        await nftDutchAuction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('1') });
        await nftDutchAuction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('4') });
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        await nftDutchAuction.connect(bidder1).refundBidders(bidder1.address);
        // bidder who did not place a bid
        await expect(nftDutchAuction.connect(bidder3).refundBidders(bidder3.address)).to.be.revertedWith("No bid to refund");
    });

    it('should not allow the highest bidder to refund their bid', async () => {
        await nftDutchAuction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('1') });
        await nftDutchAuction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('4') });
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        expect(await nftDutchAuction.itemSold()).to.equal(true);

        await expect(nftDutchAuction.connect(bidder2).refundBidders(bidder2.address)).to.be.revertedWith('Highest bidder cannot refund');
    });

    it('should not allow to end auction if auction has already ended', async () => {
        await nftDutchAuction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('4') });
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);
        await expect(nftDutchAuction.endAuction()).to.be.revertedWith('Auction has already ended');
    });

    it('should not allow to place bid if auction has already ended', async () => {
        await nftDutchAuction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('4') });
        expect(await nftDutchAuction.auctionEnded()).to.equal(true);

        await expect(nftDutchAuction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('6') })).to.be.revertedWith('Auction has already ended');
    });

});
