// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NFTDutchAuction {
    using Address for address payable;
    using SafeMath for uint256;

    IERC721 internal immutable nft;
    address payable public immutable owner;
    address public erc721TokenAddress;
    uint256 public nftTokenId;
    uint256 public reservePrice;
    uint256 public numBlocksAuctionOpen;
    uint256 public offerPriceDecrement;
    uint256 public initialPrice;
    bool public auctionEnded;
    bool public itemSold;
    mapping(address => uint256) public bids;
    address public highestBidder;
    uint256 public highestBid;
    uint256 public auctionStartTime;

    event BidPlaced(address indexed bidder, uint256 bidAmount);
    event AuctionEnded(address indexed winner, uint256 winningBidAmount);

    // modifier onlyNFTOwner() {
    //     require(
    //         IERC721(erc721TokenAddress).ownerOf(nftTokenId) == msg.sender,
    //         "Only the NFT owner can perform this action"
    //     );
    //     _;
    // }

    constructor(
        address _erc721TokenAddress,
        uint256 _nftTokenId,
        uint256 _reservePrice,
        uint256 _numBlocksAuctionOpen,
        uint256 _offerPriceDecrement
    ) {
        owner = payable(msg.sender);
        erc721TokenAddress = _erc721TokenAddress;
        nftTokenId = _nftTokenId;
        reservePrice = _reservePrice;
        numBlocksAuctionOpen = _numBlocksAuctionOpen;
        offerPriceDecrement = _offerPriceDecrement;
        initialPrice = reservePrice + numBlocksAuctionOpen * offerPriceDecrement;
        auctionStartTime = block.number;
        auctionEnded = false;
        itemSold = false;

        nft = IERC721(_erc721TokenAddress);
        require(
            nft.ownerOf(_nftTokenId) == owner,
            "NFT token Id does not belong to the Auction's Owner"
        );
    }

    function placeBid() external payable {
        require(msg.value > 0, "Bid amount must be greater than zero");
        require(!auctionEnded, "Auction has already ended");

        if (msg.value > highestBid) {
            if (highestBid != 0) {
                bids[highestBidder] += highestBid;
            }
            highestBidder = msg.sender;
            highestBid = msg.value;
        } else {
            bids[msg.sender] += msg.value;
        }

        emit BidPlaced(msg.sender, msg.value);
        if (msg.value >= initialPrice) {
            endAuction();
        }
    }

    function endAuction() public {
        require(!auctionEnded, "Auction has already ended");
        auctionEnded = true;
        itemSold = true;

        if (highestBidder != address(0)) {
            bids[highestBidder] = 0;  // Reset the highest bidder's bid amount
            
            // Transfer the funds to the seller
            owner.transfer(highestBid);
            
            // Transfer the NFT to the highest bidder
            IERC721(erc721TokenAddress).safeTransferFrom(
                IERC721(erc721TokenAddress).ownerOf(nftTokenId),
                highestBidder,
                nftTokenId
            );
            emit AuctionEnded(highestBidder, highestBid);
        } else {
            // Transfer the NFT to the seller
            IERC721(erc721TokenAddress).safeTransferFrom(
                IERC721(erc721TokenAddress).ownerOf(nftTokenId),
                owner,
                nftTokenId
            );
            emit AuctionEnded(address(0), 0);
        }
        emit AuctionEnded(highestBidder, highestBid);
    }


    function refundBidders(address bidder) external {
        require(auctionEnded, "Auction has not ended yet"); 
        require(bidder != highestBidder, "Highest bidder cannot refund");
        require(bids[bidder] > 0, "No bid to refund");

        uint256 refundAmount = bids[bidder];
        bids[bidder] = 0;
        payable(bidder).transfer(refundAmount);
    }
}
