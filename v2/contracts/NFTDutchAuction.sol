// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract NFTDutchAuction {
    address public owner;
    address public erc721TokenAddress;
    uint256 public nftTokenId;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public initialPrice;
    bool public auctionEnded;
    bool public itemSold;
    // address public highestBidder;
    // uint256 public highestBid;

    mapping(address => uint256) public bids;
    address[] public bidderAddresses;

    uint256 public auctionStartTime;

    event BidPlaced(address indexed bidder, uint256 bidAmount);
    event AuctionEnded(address indexed winner, uint256 winningBidAmount);

    constructor(
        address _erc721TokenAddress,
        uint256 _nftTokenId,
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) {
        owner = msg.sender;
        erc721TokenAddress = _erc721TokenAddress;
        nftTokenId = _nftTokenId;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initialPrice = reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
        auctionStartTime = block.number;
        auctionEnded = false;
        itemSold = false;
    }

    function placeBid() external payable {
        require(msg.value > 0, "Bid amount must be greater than zero");

        if (bids[msg.sender] == 0) {
            bidderAddresses.push(msg.sender);
        }

        bids[msg.sender] += msg.value;

        emit BidPlaced(msg.sender, msg.value);

        if (msg.value >= initialPrice) {
            endAuction();
        }
    }

    function receiveApproval(address _from, uint256 _tokenId) external {
        require(msg.sender == erc721TokenAddress, "Approval must come from the ERC721 token contract");
        require(_tokenId == nftTokenId, "Approval must be for the correct token ID");

        // You can optionally perform additional validations here if needed

        endAuction();
    }

    function endAuction() public {
        // require(msg.sender == owner, "Only the owner can end the auction");

        address highestBidder = getHighestBidder();
        require(highestBidder != address(0), "No bids have been placed");

        uint256 highestBid = bids[highestBidder];
        require(highestBid >= reservePrice, "Reserve price not met");

        Address.sendValue(payable(owner), highestBid);

        // Refund remaining bidders
        refundBidders();

        // Transfer NFT to the highest bidder
        IERC721(erc721TokenAddress).transferFrom(address(this), highestBidder, nftTokenId);
    }

   function refundBidders() private {
        uint256 contractBalance = address(this).balance;
        uint256 totalBidAmount = 0;

        for (uint256 i = 0; i < bidderAddresses.length; i++) {
            totalBidAmount += bids[bidderAddresses[i]];
        }

        for (uint256 i = 0; i < bidderAddresses.length; i++) {
            address payable bidder = payable(bidderAddresses[i]);
            if (bidder != address(0) && bidder != owner) {
                uint256 bidAmount = bids[bidder];
                if (bidAmount > 0) {
                    uint256 refundAmount = (bidAmount * contractBalance) / totalBidAmount;
                    contractBalance -= refundAmount;
                    Address.sendValue(bidder, refundAmount);
                    bids[bidder] = 0;
                }
            }
        }
    }


    function getHighestBidder() private view returns (address) {
        address highestBidder = address(0);
        uint256 highestBid = 0;

        for (uint256 i = 0; i < bidderAddresses.length; i++) {
            address bidder = bidderAddresses[i];
            if (bidder != address(0) && bidder != owner) {
                uint256 bidAmount = bids[bidder];
                if (bidAmount > highestBid) {
                    highestBid = bidAmount;
                    highestBidder = bidder;
                }
            }
        }

        return highestBidder;
    }
}
