// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import { NFTDutchAuction } from "./NFTDutchAuction.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ERC721Token is ERC721URIStorage, Ownable {
    constructor() ERC721("MyToken", "MTK") {}

    // function mint(address to, uint256 tokenId, string memory tokenURI) external onlyOwner {
    //     _mint(to, tokenId);
    //     _setTokenURI(tokenId, tokenURI);
    // }
    function mint(address to, uint256 tokenId, string memory tokenURI) external onlyOwner {
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        // Approve NFTDutchAuction contract to transfer the token
        NFTDutchAuction(nftDutchAuctionContractAddress).receiveApproval(address(this), tokenId);
    }
}
