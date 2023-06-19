const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("BasicDutchAuction", function () {
    let auction;
    let seller;
    let bidder1;
    let bidder2;
    let bidder3;

    beforeEach(async () => {
        const Auction = await ethers.getContractFactory('BasicDutchAuction');

        [seller, bidder1, bidder2, bidder3] = await ethers.getSigners();
        reservePrice = ethers.utils.parseEther("3");
        numBlocksAuctionOpen = ethers.BigNumber.from(10); // Convert to BigNumber
        offerPriceDecrement = ethers.utils.parseEther("0.5");

        auction = await Auction.deploy(
            reservePrice, // Reserve price: 1 Ether
            numBlocksAuctionOpen, // Number of blocks auction open: 10
            offerPriceDecrement // Offer price decrement: 0.1 Ether
        );
        await auction.deployed();
    });

    it('should initialize the contract correctly', async () => {
        expect(await auction.seller()).to.equal(seller.address);
        expect(await auction.reservePrice()).to.equal(ethers.utils.parseEther('3'));
        expect(await auction.numBlocksAuctionOpen()).to.equal(10);
        expect(await auction.offerPriceDecrement()).to.equal(ethers.utils.parseEther('0.5'));
        expect(await auction.initialPrice()).to.equal(ethers.utils.parseEther('8'));
        expect(await auction.startBlock()).to.equal(await ethers.provider.getBlockNumber());
        expect(await auction.endBlock()).to.equal(await ethers.provider.getBlockNumber() + 10);
        expect(await auction.auctionEnded()).to.equal(false);
        expect(await auction.itemSold()).to.equal(false);
        expect(await auction.highestBidder()).to.equal(ethers.constants.AddressZero);
        expect(await auction.highestBid()).to.equal(0);
    });

    it('should allow bidders to place valid bids', async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('2') });
        await auction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('3') });
        await auction.connect(bidder3).placeBid({ value: ethers.utils.parseEther('8.5') });

        // expect(await auction.bids(bidder1.address)).to.equal(ethers.utils.parseEther('2'));
        // expect(await auction.bids(bidder2.address)).to.equal(ethers.utils.parseEther('3'));
        // expect(await auction.bids(bidder3.address)).to.equal(ethers.utils.parseEther('8.5'));
        expect(await auction.highestBidder()).to.equal(bidder3.address);
        expect(await auction.highestBid()).to.equal(ethers.utils.parseEther('8.5'));
    });

    it("should emit AuctionEnded event with address(0) and 0 amount when no bids were placed", async () => {
        expect(await auction.auctionEnded()).to.equal(false);
        expect(await auction.itemSold()).to.equal(false);

        await expect(auction.endAuction()).to.emit(auction, "AuctionEnded").withArgs(ethers.constants.AddressZero, 0);

        expect(await auction.auctionEnded()).to.equal(true);
        expect(await auction.itemSold()).to.equal(true);
    });

    it('should not allow bids below the 0', async () => {
        await expect(auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('0') })).to.be.revertedWith(
            'Bid amount must be greater than 0'
        );
    });

    it("should end the auction and transfer funds to the seller", async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('9') });

        const startBlock = await auction.startBlock();
        const endBlock = await auction.endBlock();

        // Move the current block to the end block of the auction
        for (let i = startBlock.toNumber() + 1; i <= endBlock.toNumber(); i++) {
            await ethers.provider.send('evm_mine');
        }

        expect(await ethers.provider.getBalance(seller.address)).gte(ethers.utils.parseEther('9'));
        expect(await auction.auctionEnded()).to.equal(true);
        expect(await auction.itemSold()).to.equal(true);
    });

    it('should allow bidders to refund their bids if they are not the highest bidder', async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('5') });
        await auction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('8') });
        expect(await auction.auctionEnded()).to.equal(true);
        expect(await auction.itemSold()).to.equal(true);

        // await auction.connect(bidder1).refundBid(bidder1.address);

        expect(await auction.bids(bidder1.address)).to.equal(0);
        expect(await ethers.provider.getBalance(bidder1.address)).gte(ethers.utils.parseEther('5'));
    });

    it('should not allow the highest bidder to refund their bid', async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('5') });
        await auction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('8') });
        expect(await auction.auctionEnded()).to.equal(true);
        expect(await auction.itemSold()).to.equal(true);

        await expect(auction.connect(bidder2).refundBid(bidder2.address)).to.be.revertedWith('No bid to refund');
    });

    it('should not allow the bidder to refund their bid if auction has not ended', async () => {
        await expect(auction.connect(bidder2).refundBid(bidder2.address)).to.be.revertedWith('No bid to refund');
    });

    it('should not allow bidder to refund if they do not have a bid', async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('5') });
        await auction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('8') });
        expect(await auction.auctionEnded()).to.equal(true);
        expect(await auction.itemSold()).to.equal(true);

        // bidder who did not place a bid
        await expect(auction.connect(bidder3).refundBid(bidder3.address)).to.be.revertedWith("No bid to refund");
    });

    // it("should accumulate bid amount for bidders who do not have the highest bid", async () => {
    //     // Place initial bid
    //     await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther("3") });
    //     // Another bidder places a lower bid
    //     await auction.connect(bidder2).placeBid({ value: ethers.utils.parseEther("2") });

    //     // Check the bid amounts of the bidders
    //     const bidder2BidAmount = await auction.bids(bidder2.address);

    //     // Expect bidder 2 to have accumulated bid amount (2 ETH)
    //     expect(bidder2BidAmount).to.equal(ethers.utils.parseEther("2"));
    // });

    it("should revert when placing a bid after the auction has ended", async () => {
        // Move the current block to the end block of the auction
        await auction.endAuction();
        // Attempt to place a bid after the auction has ended
        await expect(auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('2') })).to.be.revertedWith("Auction already ended");
    });

    it("should end the auction and transfer funds to the seller when the highest bid is non-zero", async () => {
        // Place a bid higher than the reserve price
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther("10") });

        // Check if the auction has ended and the item is sold
        const auctionEnded = await auction.auctionEnded();
        expect(auctionEnded).to.be.true;

        // Check if the auction has ended and the item is sold
        expect(await auction.auctionEnded()).to.equal(true);
        expect(await auction.itemSold()).to.equal(true);

        // console.log('---------', auction.functions, await auction.highestBid(), await auction.highestBidder())
        // Check if the funds were transferred to the seller
        const sellerBalance = await ethers.provider.getBalance(await auction.seller());
        expect(sellerBalance).gte(ethers.utils.parseEther("10"));
    });

    it('should not allow bidder to place bid lower than current highest bid', async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('5') });
        await expect(auction.connect(bidder2).placeBid({ value: ethers.utils.parseEther('4') })).to.be.revertedWith('Bid amount is below current highest Bid');
    });

    it('should not allow to end auction if its already ended', async () => {
        await auction.connect(bidder1).placeBid({ value: ethers.utils.parseEther('10') });
        await expect(auction.endAuction()).to.be.revertedWith('Auction already ended');
    });

});
