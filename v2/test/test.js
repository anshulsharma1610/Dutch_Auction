const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("NFTDutchAuction", function () {
    let nftDutchAuction;
    let owner;
    let bidder1;
    let bidder2;
    let erc721Token;
    let tokenId;

    const reservePrice = ethers.utils.parseEther("1");
    const numBlocksAuctionOpen = 10;
    const offerPriceDecrement = ethers.utils.parseEther("0.1");

    beforeEach(async function () {
        [owner, bidder1, bidder2] = await ethers.getSigners();

        const ERC721Token = await ethers.getContractFactory("ERC721Token");
        erc721Token = await ERC721Token.deploy();
        await erc721Token.deployed();
        tokenId = await mintNFTToken();

        const NFTDutchAuction = await ethers.getContractFactory("NFTDutchAuction");
        nftDutchAuction = await NFTDutchAuction.deploy(
            erc721Token.address,
            tokenId, // Replace with the actual NFT token ID
            reservePrice,
            numBlocksAuctionOpen,
            offerPriceDecrement
        );
        await nftDutchAuction.deployed();


    });

    async function mintNFTToken() {
        const tokenURI = "https://example.com/nft";
        const tokenId = 1; // Set the initial tokenId to 1 or any desired value
        await erc721Token.connect(owner).mint(owner.address, tokenId, tokenURI);
        return tokenId;
    }

    it("should start the auction with correct parameters", async function () {
        expect(await nftDutchAuction.owner()).to.equal(owner.address);
        expect(await nftDutchAuction.erc721TokenAddress()).to.equal(erc721Token.address);
        expect(await nftDutchAuction.nftTokenId()).to.equal(tokenId);
        expect(await nftDutchAuction.reservePrice()).to.equal(reservePrice);
        expect(await nftDutchAuction.numBlocksAuctionOpen()).to.equal(numBlocksAuctionOpen);
        expect(await nftDutchAuction.offerPriceDecrement()).to.equal(offerPriceDecrement);
    });

    it("should allow bidders to place bids", async function () {
        const bidAmount = ethers.utils.parseEther("1.5");

        await expect(nftDutchAuction.connect(bidder1).placeBid({ value: bidAmount }))
            .to.emit(nftDutchAuction, "BidPlaced")
            .withArgs(bidder1.address, bidAmount);

        await expect(nftDutchAuction.connect(bidder2).placeBid({ value: bidAmount }))
            .to.emit(nftDutchAuction, "BidPlaced")
            .withArgs(bidder2.address, bidAmount);
    });

    // it("should refund excess bid amount to bidders", async function () {
    //     const bidAmount = ethers.utils.parseEther("2");

    //     await nftDutchAuction.connect(bidder1).placeBid({ value: bidAmount });

    //     const balanceBeforeRefund = await ethers.provider.getBalance(bidder1.address);
    //     await nftDutchAuction.connect(bidder1).placeBid({ value: bidAmount });
    //     const balanceAfterRefund = await ethers.provider.getBalance(bidder1.address);

    //     const refundAmount = ethers.utils.parseEther("1");
    //     expect(balanceAfterRefund.sub(balanceBeforeRefund)).to.equal(refundAmount);
    // });

    it("should end the auction and transfer NFT to the highest bidder", async function () {
        const bidAmount1 = ethers.utils.parseEther("1.5");
        const bidAmount2 = ethers.utils.parseEther("2");

        await nftDutchAuction.connect(bidder1).placeBid({ value: bidAmount1 });
        await nftDutchAuction.connect(bidder2).placeBid({ value: bidAmount2 });

        const ownerBalanceBeforeEnd = await ethers.provider.getBalance(owner.address);
        const bidder1BalanceBeforeEnd = await ethers.provider.getBalance(bidder1.address);
        const bidder2BalanceBeforeEnd = await ethers.provider.getBalance(bidder2.address);

        await nftDutchAuction.endAuction();

        const ownerBalanceAfterEnd = await ethers.provider.getBalance(owner.address);
        const bidder1BalanceAfterEnd = await ethers.provider.getBalance(bidder1.address);
        const bidder2BalanceAfterEnd = await ethers.provider.getBalance(bidder2.address);

        const highestBidder = await nftDutchAuction.getHighestBidder();
        expect(highestBidder).to.equal(bidder2.address);

        expect(await erc721Token.ownerOf(tokenId)).to.equal(bidder2.address);

        const winningBid = ethers.utils.parseEther("2");
        expect(bidder2BalanceAfterEnd.sub(bidder2BalanceBeforeEnd)).to.equal(winningBid);

        const refundAmount = ethers.utils.parseEther("1");
        expect(bidder1BalanceAfterEnd.sub(bidder1BalanceBeforeEnd)).to.equal(refundAmount);
        expect(ownerBalanceAfterEnd.sub(ownerBalanceBeforeEnd)).to.equal(bidAmount1.add(refundAmount));
    });
});
