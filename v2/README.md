Create a new contract called NFTDutchAuction.sol. It should have the same functionality as BasicDutchAuction.sol but it sells an NFT instead of a physical item. The constructor for the NFTDutchAuction.sol should be:
constructor(address erc721TokenAddress, uint256 _nftTokenId, uint256 _reservePrice, uint256 _numBlocksAuctionOpen, uint256 _offerPriceDecrement)

NFT Dutch Auction
    ✔ should start the auction with correct parameters (51ms)
    ✔ should allow a bidder to place a valid bid (67ms)
    ✔ should end the auction and transfer the NFT to the highest bidder when the auction duration is reached (55ms)
    ✔ should end the auction and transfer the NFT to the highest bidder when the auction duration is reached (81ms)
    ✔ should allow only owner to mint tokens (51ms)
    ✔ Should not allow Auction creator to deploy contract if the NFT does not belong to them (47ms)
    ✔ should end the auction if the bid amount is equal to or greater than the initial price
    ✔ should emit AuctionEnded event with address(0) and 0 amount when no bids were placed
    ✔ should not allow bids below the 0
    ✔ should not allow the bidder to refund their bid if auction has not ended
    ✔ should not allow bidder to refund if they do not have a bid (55ms)
    ✔ should not allow the highest bidder to refund their bid (44ms)
    ✔ should not allow to end auction if auction has already ended
    ✔ should not allow to place bid if auction has already ended


  14 passing (2s)

----------------------|----------|----------|----------|----------|----------------|
File                  |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
----------------------|----------|----------|----------|----------|----------------|
 contracts\           |      100 |      100 |      100 |      100 |                |
  ERC721Token.sol     |      100 |      100 |      100 |      100 |                |
  NFTDutchAuction.sol |      100 |      100 |      100 |      100 |                |
----------------------|----------|----------|----------|----------|----------------|
All files             |      100 |      100 |      100 |      100 |                |
----------------------|----------|----------|----------|----------|----------------|