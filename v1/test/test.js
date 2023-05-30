// const { ethers, waffle } = require("hardhat");
// const { expect } = require("chai");

// const { deployContract } = waffle;

// describe("BasicDutchAuction", function () {
//     let auction;
//     let seller;
//     let bidder1;
//     let bidder2;
//     let bidder3;

//     const RESERVE_PRICE = ethers.utils.parseEther("1");
//     const NUM_BLOCKS_AUCTION_OPEN = 10;
//     const OFFER_PRICE_DECREMENT = ethers.utils.parseEther("0.001"a);

//     beforeEach(async function () {
//         [seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

//         const BasicDutchAuction = await ethers.getContractFactory("BasicDutchAuction");
//         auction = await deployContract(seller, BasicDutchAuction, [
//             RESERVE_PRICE,
//             NUM_BLOCKS_AUCTION_OPEN,
//             OFFER_PRICE_DECREMENT,
//         ]);
//     });

//     it("should initialize the auction with correct parameters", async function () {
//         expect(await auction.seller()).to.equal(seller.address);
//         expect(await auction.reservePrice()).to.equal(RESERVE_PRICE);
//         expect(await auction.numBlocksAuctionOpen()).to.equal(NUM_BLOCKS_AUCTION_OPEN);
//         expect(await auction.offerPriceDecrement()).to.equal(OFFER_PRICE_DECREMENT);
//         expect(await auction.initialPrice()).to.equal(
//             RESERVE_PRICE.add(NUM_BLOCKS_AUCTION_OPEN.mul(OFFER_PRICE_DECREMENT))
//         );
//         expect(await auction.startBlock()).to.equal((await ethers.provider.getBlockNumber()) + 1);
//         expect(await auction.endBlock()).to.equal((await ethers.provider.getBlockNumber()) + NUM_BLOCKS_AUCTION_OPEN);
//         expect(await auction.auctionEnded()).to.be.false;
//         expect(await auction.itemSold()).to.be.false;
//         expect(await auction.highestBidder()).to.equal(ethers.constants.AddressZero);
//         expect(await auction.highestBid()).to.equal(0);
//     });

//     it("should place a bid and end the auction", async function () {
//         const bidAmount = await auction.initialPrice();

//         await auction.connect(bidder1).placeBid({ value: bidAmount });
//         expect(await auction.auctionEnded()).to.be.true;
//         expect(await auction.itemSold()).to.be.true;
//         expect(await auction.highestBidder()).to.equal(bidder1.address);
//         expect(await auction.highestBid()).to.equal(bidAmount);
//         expect(await ethers.provider.getBalance(seller.address)).to.equal(bidAmount);
//     });

//     it("should refund a bid", async function () {
//         const bidAmount = await auction.initialPrice();

//         await auction.connect(bidder1).placeBid({ value: bidAmount });
//         await auction.connect(bidder2).refundBid(bidder1.address);

//         expect(await ethers.provider.getBalance(bidder1.address)).to.equal(bidAmount);
//     });

//     it("should not refund a bid if the bidder is the highest bidder", async function () {
//         const bidAmount = await auction.initialPrice();

//         await auction.connect(bidder1).placeBid({ value: bidAmount });
//         await expect(auction.connect(bidder1).refundBid(bidder1.address)).to.be.revertedWith("Cannot refund highest bidder");
//     });

//     it("should not accept bids after the auction ends", async function () {
//         const bidAmount = await auction.initialPrice();

//         await auction.connect(bidder1).placeBid({ value: bidAmount });
//         await expect(auction.connect(bidder2).placeBid({ value: bidAmount })).to.be.revertedWith("Auction has already ended");
//     });
// });

// SPDX-License-Identifier: MIT
// pragma solidity ^ 0.8.0;

const { ethers, waffle } = require("hardhat");
const { expect } = require("chai");

describe("BasicDutchAuction", function () {
    let auction;
    let seller;
    let bidder1;
    let bidder2;
    let bidder3;

    const RESERVE_PRICE = ethers.utils.parseEther("1");
    const NUM_BLOCKS_AUCTION_OPEN = 10;
    const OFFER_PRICE_DECREMENT = ethers.utils.parseEther("0.001");

    beforeEach(async function () {
        [seller, bidder1, bidder2, bidder3] = await ethers.getSigners();

        const BasicDutchAuction = await ethers.getContractFactory("BasicDutchAuction");
        auction = await BasicDutchAuction.deploy(
            RESERVE_PRICE,
            NUM_BLOCKS_AUCTION_OPEN,
            OFFER_PRICE_DECREMENT
        );
        await auction.deployed();
    });

    it("should initialize the auction with correct parameters", async function () {
        expect(await auction.seller()).to.equal(seller.address);
        expect(await auction.reservePrice()).to.equal(RESERVE_PRICE);
        expect(await auction.numBlocksAuctionOpen()).to.equal(NUM_BLOCKS_AUCTION_OPEN);
        expect(await auction.offerPriceDecrement()).to.equal(OFFER_PRICE_DECREMENT);
        expect(await auction.initialPrice()).to.equal(
            RESERVE_PRICE.add(NUM_BLOCKS_AUCTION_OPEN.mul(OFFER_PRICE_DECREMENT))
        );
        expect(await auction.startBlock()).to.equal((await ethers.provider.getBlockNumber()) + 1);
        expect(await auction.endBlock()).to.equal((await ethers.provider.getBlockNumber()) + NUM_BLOCKS_AUCTION_OPEN);
        expect(await auction.auctionEnded()).to.be.false;
        expect(await auction.itemSold()).to.be.false;
        expect(await auction.highestBidder()).to.equal(ethers.constants.AddressZero);
        expect(await auction.highestBid()).to.equal(0);
    });

    it("should place a bid and end the auction", async function () {
        const bidAmount = await auction.initialPrice();

        await auction.connect(bidder1).placeBid({ value: bidAmount });
        expect(await auction.auctionEnded()).to.be.true;
        expect(await auction.itemSold()).to.be.true;
        expect(await auction.highestBidder()).to.equal(bidder1.address);
        expect(await auction.highestBid()).to.equal(bidAmount);
        expect(await ethers.provider.getBalance(seller.address)).to.equal(bidAmount);
    });

    it("should refund a bid", async function () {
        const bidAmount = await auction.initialPrice();

        await auction.connect(bidder1).placeBid({ value: bidAmount });
        await auction.connect(bidder2).refundBid(bidder1.address);

        expect(await ethers.provider.getBalance(bidder1.address)).to.equal(bidAmount);
    });

    it("should not refund a bid if the bidder is the highest bidder", async function () {
        const bidAmount = await auction.initialPrice();

        await auction.connect(bidder1).placeBid({ value: bidAmount });
        await expect(auction.connect(bidder1).refundBid(bidder1.address)).to.be.revertedWith("Cannot refund highest bidder");
    });

    it("should not accept bids after the auction ends", async function () {
        const bidAmount = await auction.initialPrice();

        await auction.connect(bidder1).placeBid({ value: bidAmount });
        await expect(auction.connect(bidder2).placeBid({ value: bidAmount })).to.be.revertedWith("Auction has already ended");
    });
});
