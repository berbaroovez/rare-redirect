import { useEffect, useState, useRef } from "react";
import { useWeb3React, Web3ReactProvider } from "@web3-react/core";
import { InjectedConnector } from "@web3-react/injected-connector";
import { WalletConnectConnector } from "@web3-react/walletconnect-connector";
import { InfuraProvider, Web3Provider } from "@ethersproject/providers";
import useLocalStorage from "../hooks/useLocalStorage";
import { MetamaskIcon, WalletConnectIcon } from "../components/icons";
import Layout from "../components/Layout";
import abi from "../WavePortal.json";
import { ethers } from "ethers";
import RareRedirectJSON from "../abis/RareRedirect.json";
import VisuallyHidden from "@reach/visually-hidden";
import { Dialog, DialogOverlay, DialogContent } from "@reach/dialog";
import "@reach/dialog/styles.css";

const injected = new InjectedConnector({ supportedChainIds: [1, 3, 4, 5, 42] });
const wcConnector = new WalletConnectConnector({
  infuraId: process.env.NEXT_PUBLIC_INFURA_KEY,
});

const ConnectorNames = {
  Injected: "injected",
  WalletConnect: "walletconnect",
};

const W3Operations = {
  Connect: "connect",
  Disconnect: "disconnect",
};

function getLibrary(provider) {
  const library = new Web3Provider(provider);
  // library.pollingInterval = 12000;
  return library;
}

export default function WrapperHome() {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Home />
    </Web3ReactProvider>
  );
}

function Home() {
  const web3React = useWeb3React();
  const { active, activate, error } = web3React;
  const [loaded, setLoaded] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");
  const [currentPrice, setCurrentPrice] = useState(0);
  const [formUrl, setFormUrl] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [latestOp, setLatestOp] = useLocalStorage("latest_op", "");
  const [latestConnector, setLatestConnector] = useLocalStorage(
    "latest_connector",
    ""
  );
  const [showDialog, setShowDialog] = useState(false);
  const open = () => setShowDialog(true);
  const close = () => setShowDialog(false);

  const RareRedirectAddress = "0x90d7535F2b7b055Fee8B61aF299689b87D0b46aD";

  useEffect(() => {
    if (latestOp == "connect" && latestConnector == "injected") {
      injected
        .isAuthorized()
        .then((isAuthorized) => {
          setLoaded(true);
          if (isAuthorized && !web3React.active && !web3React.error) {
            web3React.activate(injected);
          }
        })
        .catch(() => {
          setLoaded(true);
        });
    } else if (latestOp == "connect" && latestConnector == "walletconnect") {
      web3React.activate(wcConnector);
    }
  }, []);

  useEffect(() => {
    const asyncFunction = async () => {
      const provider = new ethers.providers.InfuraProvider(
        "homestead",
        process.env.NEXT_PUBLIC_INFURA_KEY
      );

      const contract = new ethers.Contract(
        RareRedirectAddress,
        RareRedirectJSON.abi,
        provider
      );
      const url = await contract.getUrl();
      let priceFloor = await contract.priceFloor();
      priceFloor = ethers.utils.formatEther(priceFloor);
      setCurrentUrl(url);
      setCurrentPrice(priceFloor);
    };

    asyncFunction();
  }, []);

  const getTruncatedAddress = (address) => {
    if (address && address.startsWith("0x")) {
      return address.substr(0, 4) + "..." + address.substr(address.length - 4);
    }
    return address;
  };

  const setURL = async () => {
    const RareRedirectAbi = RareRedirectJSON.abi;

    const signer = web3React.library.getSigner();

    const RareRedirectContract = new ethers.Contract(
      RareRedirectAddress,
      RareRedirectAbi,
      signer
    );
    try {
      const waveTXN = await RareRedirectContract.setUrlPayable(
        "https://www.google.com",

        { gasLimit: 300000, value: ethers.utils.parseEther(formPrice) }
      );
    } catch (error) {
      //we need this because the website will error out when we cancel a transaction
    }
  };

  return (
    <>
      <Dialog isOpen={showDialog} onDismiss={close}>
        <div className="connect-wallet-container">
          <div className="connect-wallet-card">
            <div className="wallet-header">Connect your wallet</div>
            <div
              className="button metamask"
              onClick={() => {
                setLatestConnector(ConnectorNames.Injected);
                setLatestOp(W3Operations.Connect);
                web3React.activate(injected);
                close();
              }}
            >
              Metamask
              <MetamaskIcon />
            </div>
            <div
              className="button walletconnect"
              onClick={() => {
                setLatestConnector(ConnectorNames.WalletConnect);
                setLatestOp(W3Operations.Connect);
                web3React.activate(wcConnector);
                close();
              }}
            >
              WalletConnect
              <WalletConnectIcon />
            </div>
          </div>
        </div>
      </Dialog>
      <nav>
        <div>RareRedirect</div>
        {web3React.active ? (
          <div className="connected">
            <div className="nav-button" title={web3React.account}>
              {getTruncatedAddress(web3React.account)}
            </div>
            <div
              className="disconnect-button"
              title="Disconnect"
              onClick={() => {
                setLatestOp(W3Operations.Disconnect);
                web3React.deactivate();
              }}
            >
              X
            </div>
          </div>
        ) : (
          <div className="nav-button" onClick={open}>
            Connect Wallet
          </div>
        )}
      </nav>
      <Layout>
        <div className="container">
          <h1>Rare Redirect</h1>
          <div className="content">
            <p>
              UI interface for{" "}
              <a href="https://twitter.com/nickbytes">@nickbytes</a> Rare
              Redirect Contract
            </p>
            <p>
              Current Url: <a href={currentUrl}>{currentUrl}</a>
            </p>
            <p>Current Floor Price: {currentPrice}</p>
          </div>

          {web3React.active && (
            <div className="connected-container">
              <label htmlFor="url"> Url</label>
              <input
                type="text"
                name="url"
                value={formUrl}
                onChange={(e) => {
                  setFormUrl(e.target.value);
                }}
              />
              <label htmlFor="price"> Price</label>
              <input
                type="number"
                name="price"
                value={formPrice}
                onChange={(e) => {
                  setFormPrice(e.target.value);
                }}
              />
              <input type="submit" onClick={setURL} />
            </div>
          )}

          <div className="github">
            <a
              href="https://github.com/shivkanthb/web3-starter"
              target="_blank"
              rel="noreferrer"
            >
              web3-starter github
            </a>
            <a
              href="https://twitter.com/berbaroovez"
              target="_blank"
              rel="noreferrer"
            >
              @berbaroovez
            </a>
          </div>
        </div>
      </Layout>
    </>
  );
}
