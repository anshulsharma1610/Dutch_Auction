Add an upgrade proxy to make your NFTDutchAuction_ERC20Bids.sol upgradeable. You don’t need to make the NFT or ERC20 contracts upgradeable. Just the DutchAuction contract.
Read the documentation on upgradeable contracts
Use the UUPS proxy instead of a transparent proxy: https://docs.openzeppelin.com/contracts/4.x/api/proxy


  NFTDutchAuction
    ✔ should allow a bidder to place a valid ERC20 bid (110ms)
    ✔ should refund a non-winning bidder (152ms)
    ✔ should end the auction and transfer the NFT to the highest bidder (93ms)
    ✔ should allow only owner to mint tokens (56ms)
    ✔ should allow only owner to mint tokens (39ms)
    ✔ should revert when a non-owner tries to mint tokens
    ✔ should emit AuctionEnded event with address(0) and 0 amount when no bids were placed (38ms)
    ✔ should not allow bids below the 0
    ✔ should not allow to end auction if auction has already ended (82ms)
    ✔ should not allow to place bids if auction has already ended (110ms)
    ✔ Should not allow Auction creator to deploy contract if the NFT does not belong to them (43ms)
    ✔ should place normal bids (100ms)
    ✔ should increase the highest bid and transfer tokens if bid amount is greater than current highest bid (75ms)
    ✔ should transfer tokens back to the bidder if bid amount is not greater than current highest bid (66ms)
    ✔ should not allow the bidder to refund their bid if auction has not ended
    ✔ should not allow bidder to refund if they do not have a bid (56ms)
    ✔ should not allow highest bidder to refund (57ms)


  17 passing (4s)

--------------------------------|----------|----------|----------|----------|----------------|
File                            |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
--------------------------------|----------|----------|----------|----------|----------------|
 contracts\                     |      100 |      100 |      100 |      100 |                |
  ERC20Token.sol                |      100 |      100 |      100 |      100 |                |
  ERC721Token.sol               |      100 |      100 |      100 |      100 |                |
  NFTDutchAuction_ERC20Bids.sol |      100 |      100 |      100 |      100 |                |
--------------------------------|----------|----------|----------|----------|----------------|
All files                       |      100 |      100 |      100 |      100 |                |
--------------------------------|----------|----------|----------|----------|----------------|
