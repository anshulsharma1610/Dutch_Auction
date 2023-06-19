async function main() {
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
    console.log("auction address:", await auction.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });