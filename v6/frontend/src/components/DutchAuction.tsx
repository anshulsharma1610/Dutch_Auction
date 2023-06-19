import { useWeb3React } from "@web3-react/core";
import { Contract, ethers, Signer } from "ethers";
import {
    ChangeEvent,
    MouseEvent,
    ReactElement,
    useEffect,
    useState,
} from "react";
import styled from "styled-components";
import BasicDutchAuctionArtifact from "../artifacts/contracts/BasicDutchAuction.sol/BasicDutchAuction.json";
import { Provider } from "../utils/provider";
import { SectionDivider } from "./SectionDivider";
import { act } from "react-dom/test-utils";

const StyledDeployContractButton = styled.button`
    width: 180px;
    height: 2rem;
    border-radius: 1rem;
    border-color: blue;
    cursor: pointer;
    place-self: center;
`;

const StyledAuctionInputDiv = styled.div`
    display: grid;
    grid-template-rows: repeat(4, 1fr);
    grid-gap: 10px;
    place-self: center;
    align-items: center;
`;

const StyledLabel = styled.label`
    font-weight: bold;
`;

const StyledInput = styled.input`
    padding: 0.4rem 0.6rem;
    line-height: 2fr;
`;

const StyledButton = styled.button`
    width: 150px;
    height: 2rem;
    border-radius: 1rem;
    border-color: blue;
    cursor: pointer;
`;

export function DutchAuction(): JSX.Element {
    const [active, setActive] = useState<boolean>(false);
    const [signer, setSigner] = useState<Signer | null>(null);
    const [auctionContract, setAuctionContract] = useState<any>(null);
    const [auctionContractAddr, setAuctionContractAddr] = useState<string>("");
    const [reservePrice, setReservePrice] = useState<string>("");
    const [numBlocksAuctionOpen, setNumBlocksAuctionOpen] =
        useState<string>("");
    const [offerPriceDecrement, setOfferPriceDecrement] = useState<string>("");
    const [lookupAddress, setLookupAddress] = useState<string>("");
    const [auctionInfo, setAuctionInfo] = useState<any>(null);
    const [bidAddress, setBidAddress] = useState<string>("");
    const [bidAmount, setBidAmount] = useState<string>("");
    const [errorMessage, setErrorMessage] = useState<string>("");
    const [successMessage, setSuccessMessage] = useState<string>("");

    useEffect(() => {
        async function enableEthereum() {
            if ((window as any).ethereum) {
                try {
                    await (window as any).ethereum.request({
                        method: "eth_requestAccounts",
                    });
                    setActive(true);
                    setSigner(
                        new ethers.providers.Web3Provider(
                            (window as any).ethereum
                        ).getSigner()
                    );
                } catch (error) {
                    console.error(error);
                }
            }
        }

        enableEthereum();
    }, []);

    async function getAuctionInfo(address: string): Promise<void> {
        if (!active || !signer) return;

        try {
            const auctionContract = new ethers.Contract(
                address,
                BasicDutchAuctionArtifact.abi,
                signer
            );
            const winner = await auctionContract.highestBidder();
            const winningBid = await auctionContract.highestBid();
            const reservePrice = await auctionContract.reservePrice();
            const numBlocksAuctionOpen =
                await auctionContract.numBlocksAuctionOpen();
            const offerPriceDecrement =
                await auctionContract.offerPriceDecrement();
            const auctionOpen = await auctionContract.auctionEnded();

            setAuctionInfo({
                winner: winner,
                winningBid: winningBid.toString(10),
                reservePrice: reservePrice.toString(10),
                numBlocksAuctionOpen: numBlocksAuctionOpen.toString(10),
                offerPriceDecrement: offerPriceDecrement.toString(10),
                auctionOpen: !auctionOpen,
            });
        } catch (error: any) {
            setErrorMessage(`Error retrieving auction info: ${error.message}`);
        }
    }

    async function submitBid(): Promise<void> {
        const auctionContract = await fetchExistingAuctionContract(bidAddress);
        if (!active || !signer || !auctionContract) return;

        try {
            const auction = auctionContract.connect(signer);
            const bidTxn = await auction.placeBid({
                value: ethers.utils.parseEther(bidAmount),
            });
            await bidTxn.wait();
            setSuccessMessage("Bid submitted successfully!");
        } catch (error: any) {
            setErrorMessage(`Error submitting bid: ${error.message}`);
        }
    }

    async function fetchExistingAuctionContract(address: string): Promise<any> {
        if (!active || !signer) return;

        try {
            console.log("fetchExistingAuctionContract");
            const auctionContract = new ethers.Contract(
                address,
                BasicDutchAuctionArtifact.abi,
                signer
            );
            await setAuctionContract(auctionContract);
            await setAuctionContractAddr(address);
            return auctionContract;
        } catch (error: any) {
            console.error(error);
            setErrorMessage(
                `Error fetching existing auction contract: ${error.message}`
            );
            return null;
        }
    }

    async function refundBid(): Promise<void> {
        if (!active || !signer) return;
        try {
            const address = await signer.getAddress();
            const auction = await fetchExistingAuctionContract(lookupAddress);
            const tx = await auction.refundBid(address);
            await tx.wait();
            setSuccessMessage("Bid refunded successfully.");
        } catch (error) {
            console.error(error);
            setErrorMessage("Failed to refund bid.");
        }
    }

    function handleDeployContract(event: MouseEvent<HTMLButtonElement>): void {
        event.preventDefault();

        if (!active || !signer) return;

        async function deployAuctionContract(signer: Signer): Promise<void> {
            const Auction = new ethers.ContractFactory(
                BasicDutchAuctionArtifact.abi,
                BasicDutchAuctionArtifact.bytecode,
                signer
            );

            try {
                const auctionContract = await Auction.deploy(
                    ethers.utils.parseEther(reservePrice),
                    parseInt(numBlocksAuctionOpen),
                    ethers.utils.parseEther(offerPriceDecrement)
                );
                await auctionContract.deployed();
                setAuctionContract(auctionContract);
                setAuctionContractAddr(auctionContract.address);
                setSuccessMessage("Auction contract deployed successfully.");
            } catch (error: any) {
                setErrorMessage(
                    `Error deploying auction contract: ${error.message}`
                );
            }
        }

        deployAuctionContract(signer);
    }

    return (
        <>
            <h1>Dutch Auction</h1>

            <StyledAuctionInputDiv>
                <StyledLabel>Reserve Price:</StyledLabel>
                <StyledInput
                    type="number"
                    step="0.01"
                    pattern="\d+(\.\d{0,2})?"
                    value={reservePrice}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setReservePrice(e.target.value)
                    }
                />

                <StyledLabel>Number of Blocks Auction Open:</StyledLabel>
                <StyledInput
                    type="number"
                    step="1"
                    pattern="\d*"
                    value={numBlocksAuctionOpen}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNumBlocksAuctionOpen(e.target.value)
                    }
                />

                <StyledLabel>Offer Price Decrement:</StyledLabel>
                <StyledInput
                    type="number"
                    step="0.01"
                    pattern="\d+(\.\d{0,2})?"
                    value={offerPriceDecrement}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setOfferPriceDecrement(e.target.value)
                    }
                />

                <StyledButton type="button" onClick={handleDeployContract}>
                    Deploy
                </StyledButton>

                {auctionContractAddr && (
                    <StyledLabel>
                        New Auction Contract Address: {auctionContractAddr}
                    </StyledLabel>
                )}
            </StyledAuctionInputDiv>

            <SectionDivider />

            <StyledAuctionInputDiv>
                <StyledLabel>Address of BasicDutchAuction:</StyledLabel>
                <StyledInput
                    type="text"
                    value={lookupAddress}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setLookupAddress(e.target.value)
                    }
                />

                <StyledButton
                    type="button"
                    onClick={() => getAuctionInfo(lookupAddress)}
                >
                    Show Info
                </StyledButton>

                {auctionInfo && (
                    <>
                        <StyledLabel>
                            Current Winner: {auctionInfo.winner}
                        </StyledLabel>
                        <StyledLabel>
                            Highest Bid: {auctionInfo.winningBid}
                        </StyledLabel>
                        <StyledLabel>
                            Reserve Price: {auctionInfo.reservePrice}
                        </StyledLabel>
                        <StyledLabel>
                            Number of Blocks Auction Open:{" "}
                            {auctionInfo.numBlocksAuctionOpen}
                        </StyledLabel>
                        <StyledLabel>
                            Offer Price Decrement:{" "}
                            {auctionInfo.offerPriceDecrement}
                        </StyledLabel>

                        {auctionInfo.auctionOpen && (
                            <p>Auction is currently open.</p>
                        )}
                        {!auctionInfo.auctionOpen && auctionInfo.winner && (
                            <div>
                                <p>Auction has ended.</p>
                                <p>Refund the bid:</p>
                                <StyledButton onClick={refundBid}>
                                    Refund
                                </StyledButton>
                            </div>
                        )}
                    </>
                )}
            </StyledAuctionInputDiv>

            <SectionDivider />

            <StyledAuctionInputDiv>
                <StyledLabel>Your Bid Address:</StyledLabel>
                <StyledInput
                    type="text"
                    value={bidAddress}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setBidAddress(e.target.value)
                    }
                />

                <StyledLabel>Your Bid Amount:</StyledLabel>
                <StyledInput
                    type="number"
                    step="0.01"
                    pattern="\d+(\.\d{0,2})?"
                    value={bidAmount}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setBidAmount(e.target.value)
                    }
                />

                <StyledButton type="button" onClick={submitBid}>
                    Submit Bid
                </StyledButton>
            </StyledAuctionInputDiv>

            {errorMessage && <p>{errorMessage}</p>}
            {successMessage && <p>{successMessage}</p>}
        </>
    );
}
