The BasicDutchAuction.sol contract works as follows:
The seller instantiates a DutchAuction contract to manage the auction of a single, physical item at a single auction event. The contract is initialized with the following parameters: 
reservePrice: the minimum amount of wei that the seller is willing to accept for the item 
numBlocksAuctionOpen: the number of blockchain blocks that the auction is open for
offerPriceDecrement: the amount of wei that the auction price should decrease by during each subsequent block. 
The seller is the owner of the contract. 
The auction begins at the block in which the contract is created. 
The initial price of the item is derived from reservePrice, numBlocksAuctionOpen, and  offerPriceDecrement: initialPrice = reservePrice + numBlocksAuctionOpen*offerPriceDecrement 
A bid can be submitted by any Ethereum externally-owned account. 
The first bid processed by the contract that sends wei greater than or equal to the current price is the  winner. The wei should be transferred immediately to the seller and the contract should not accept  any more bids. All bids besides the winning bid should be refunded immediately. 

Implement a ReactJS user interface for your BasicDutchAuction.sol. The UI should enable a user to:
Deploy a new BasicDutchAuction and specify all the parameters for its constructor.
Look up a specific BasicDutchAuction by its address, view important information about the contract, and 
Submit a bid
The UI should have three sections. Feel free to use the following layouts in your app, or something similar.
Section 1: Deployment
Inputs:
A textbox for each parameter in the constructor
A button called “Deploy”
Outputs:
A label with the address of the newly created BasicDutchAuction
Section 2: Look up info on an auction
Inputs:
A textbox for the address of a BasicDutchAction.
A button called “Show Info”
Outputs:
A label for each property of the BasicDutchAction:
Winner, if one already exists
Constructor parameters
Current price
Section 3: Submit a bid
Input: 
A textbox for the address of a BasicDutchAction.
A textbox for the bid
A button called “Bid”
Outputs:
A label indicating whether the bid was accepted as the winner or not


BasicDutchAuction
    ✔ should initialize the contract correctly (78ms)
    ✔ should allow bidders to place valid bids (65ms)
    ✔ should emit AuctionEnded event with address(0) and 0 amount when no bids were placed
    ✔ should not allow bids below the 0 (41ms)
    ✔ should end the auction and transfer funds to the seller (39ms)
    ✔ should allow bidders to refund their bids if they are not the highest bidder (48ms)
    ✔ should not allow the highest bidder to refund their bid (43ms)
    ✔ should not allow the bidder to refund their bid if auction has not ended
    ✔ should not allow bidder to refund if they do not have a bid (47ms)
    ✔ should accumulate bid amount for bidders who do not have the highest bid
    ✔ should revert when placing a bid after the auction has ended
    ✔ should end the auction and transfer funds to the seller when the highest bid is non-zero


  12 passing (1s)

------------------------|----------|----------|----------|----------|----------------|
File                    |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
------------------------|----------|----------|----------|----------|----------------|
 contracts\             |      100 |      100 |      100 |      100 |                |
  BasicDutchAuction.sol |      100 |      100 |      100 |      100 |                |
------------------------|----------|----------|----------|----------|----------------|
All files               |      100 |      100 |      100 |      100 |                |
------------------------|----------|----------|----------|----------|----------------|