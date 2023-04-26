import Head from "next/head";
import Image from "next/image";
import { ethers } from "ethers";
import axios from "axios";
import Web3Modal from "web3modal";
import { useEffect, useState } from "react";
import { marketplaceAddress, marketplaceABI } from "../config";

export default function Home() {
  const [nfts, setNfts] = useState([]);
  const [loadingState, setLoadingState] = useState("not-loaded");
  const [account, setCurrentAccount] = useState();

  useEffect(() => {
    connectWallet();
    checkIfWalletIsConnected();
    loadNFTs();
  }, []);

  const checkIfWalletIsConnected = async () => {
    // setLoading(true);
    try {
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Please install Metamask!");
      } else {
        // console.log("We have Ethereum object", ethereum);
      }

      const accounts = await ethereum.request({ method: "eth_accounts" });

      if (accounts.length) {
        const account = accounts[0];
        // console.log("Authorized account has found", account);
        setCurrentAccount(account);
      } else {
        setCurrentAccount("");
        console.log("No authorized account has found!");
      }
      setLoadingState("Not-loaded");
    } catch (error) {
      console.error(error.message);
      // setLoading(false);
    }
  };

  const connectWallet = async () => {
    // setLoading(true);
    try {
      const { ethereum } = window;

      if (!ethereum) {
        alert("Metamask has found!");
        return;
      }

      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
      setLoadingState("Not-loaded");
    } catch (err) {
      console.error(err.message);
      setLoadingState("Not-loaded");
    }
  };

  async function loadNFTs() {
    /* create a generic provider and query for unsold market items */
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(
      marketplaceAddress,
      marketplaceABI,
      provider
    );
    const data = await contract.fetchMarketItems();

    /*
     *  map over items returned from smart contract and format
     *  them as well as fetch their token metadata
     */
    const items = await Promise.all(
      data.map(async (i) => {
        const tokenUri = await contract.tokenURI(i.tokenId);
        const response = await fetch(tokenUri);
        const meta = await response.json();
        let price = ethers.utils.formatUnits(i.price.toString(), "ether");
        let item = {
          price,
          tokenId: i.tokenId.toNumber(),
          seller: i.seller,
          owner: i.owner,
          image: meta.image,
          name: meta.name,
          description: meta.description,
        };
        console.log(item);
        return item;
      })
    );
    setNfts(items);
    setLoadingState("loaded");
  }

  async function buyNft(nft) {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(
        marketplaceAddress,
        marketplaceABI,
        signer
      );

      /* user will be prompted to pay the asking proces to complete the transaction */
      const price = ethers.utils.parseUnits(nft.price.toString(), "ether");
      const transaction = await contract.createMarketSale(nft.tokenId, {
        value: price,
      });
      await transaction.wait();
      loadNFTs();
    } catch (error) {
      console.error(error);
    }
  }
  if (loadingState === "loaded" && !nfts.length)
    return <h1 className="px-20 py-10 text-3xl">No items in marketplace</h1>;
  return (
    <div className="flex justify-center">
      <div className="px-4" style={{ maxWidth: "1600px" }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
          {nfts.map((nft, i) => (
            <div key={i} className="border shadow rounded-xl overflow-hidden">
              <img src={nft.image} />
              <div className="p-4">
                <p
                  style={{ height: "64px" }}
                  className="text-2xl font-semibold"
                >
                  {nft.name}
                </p>
                <div style={{ height: "70px", overflow: "hidden" }}>
                  <p className="text-gray-500">{nft.description}</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-gray-700 to-gray-500">
                <p className="p-2 text-2xl font-bold text-white">⟠Price: {nft.price} ETH</p>
                <button
                  className="mt-2 w-full py-3 font-semibold text-2xl text-blue-100 rounded bg-gradient-to-r from-blue-600 to-blue-400"
                  onClick={() => buyNft(nft)}
                >
                  Buy
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
