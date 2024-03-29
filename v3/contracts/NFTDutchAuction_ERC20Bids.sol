// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract NFTDutchAuction_ERC20Bids {
    using Address for address payable;
    using SafeMath for uint256;

    IERC20 internal immutable erc20Token;
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

    constructor(
        address _erc20TokenAddress,
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
        initialPrice = reservePrice.add(numBlocksAuctionOpen.mul(offerPriceDecrement));
        auctionStartTime = block.number;
        auctionEnded = false;
        itemSold = false;

        erc20Token = IERC20(_erc20TokenAddress);
        nft = IERC721(_erc721TokenAddress);
        require(
            nft.ownerOf(_nftTokenId) == owner,
            "NFT token Id does not belong to the Auction's Owner"
        );
    }

    function placeBid(uint256 bidAmount) external {
        require(bidAmount > 0, "Bid amount must be greater than zero");
        require(!auctionEnded, "Auction has already ended");

        erc20Token.transferFrom(msg.sender, address(this), bidAmount);

        // if (bidAmount > highestBid) {
        //     if (highestBid != 0) {
        //         erc20Token.transfer(highestBidder, highestBid);
        //     }
        //     highestBidder = msg.sender;
        //     highestBid = bidAmount;
        // } 
        // else {
        //     erc20Token.transfer(msg.sender, bidAmount);
        //     bids[msg.sender] = bids[msg.sender].add(bidAmount);
        // }
        if (bidAmount > highestBid) {
            if (highestBid != 0) {
                bids[highestBidder] += highestBid;
            }
            highestBidder = msg.sender;
            highestBid = bidAmount;
        } else {
            bids[msg.sender] += bidAmount;
        }

        emit BidPlaced(msg.sender, bidAmount);

        if (bidAmount >= initialPrice) {
            endAuction();
        }
    }

    function endAuction() public {
        require(!auctionEnded, "Auction has already ended");
        auctionEnded = true;
        itemSold = true;

        if (highestBidder != address(0)) {
            bids[highestBidder] = 0;  // Reset the highest bidder's bid amount
            
            // Transfer the ERC721 token to the highest bidder
            nft.safeTransferFrom(
                nft.ownerOf(nftTokenId),
                highestBidder,
                nftTokenId
            );

            emit AuctionEnded(highestBidder, highestBid);
        } else {
            // Transfer the ERC721 token back to the owner
            nft.safeTransferFrom(
                nft.ownerOf(nftTokenId),
                owner,
                nftTokenId
            );
            
            emit AuctionEnded(address(0), 0);
        }
    }

    function refundBidders(address bidder) external {
        require(auctionEnded, "Auction has not ended yet"); 
        require(bidder != highestBidder, "Highest bidder cannot refund");
        require(bids[bidder] > 0, "No bid to refund");

        uint256 refundAmount = bids[bidder];
        bids[bidder] = 0;
        erc20Token.transfer(bidder, refundAmount);
    }
}
