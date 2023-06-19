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

Deploy your Version 6.0 dapp on an Ethereum testnet.
This step will require getting test eth from a faucet.
Sometimes these faucets can be unreliable so you’ll have to keep searching online for a faucet that gives you enough eth to successfully deploy your contract.
Hardhat can deploy your contracts for you: https://hardhat.org/tutorial/deploying-to-a-live-network
Host your UI through IPFS. 
You will host your UI on your own machine, and you will use IPFS to enable others to access it through an ipfs:// url.
Get the CID of your build directory that contains your built UI, and prefix the CID with “ipfs://”.
For example if your CID is QmRgCTtKd91QkgoTiJQky57pCRda2drKEvTyFkUznaoKm3, the URL to access the content is ipfs://QmRgCTtKd91QkgoTiJQky57pCRda2drKEvTyFkUznaoKm3
Steps:
Generate build files for your UI
Install IPFS desktop and IPFS browser plugin.
Pin your UI build files to your IPFS Desktop node.
Add the IPFS url to your README.md file in your repo.
Use IPNS to generate a fixed name for your UI: https://docs.ipfs.tech/concepts/ipns/#mutability-in-ipfs

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


IPNS URL: http://k51qzi5uqu5dmk8ml6yn4pvjy8u1wwj7d62g7s9w0fgj9c0acrq49lagwslhfj.ipns.localhost:8080/