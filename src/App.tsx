import { useEffect, useState } from "react";
import {
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  TransactionInstruction
} from "@solana/web3.js";
import './App.css';

import {createMemoInstruction, MEMO_PROGRAM_ID} from './memo'

type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface requestObj {
  method: PhantomRequestMethod, 
  params: any
}

interface response {
  publicKey: string,
  signature: string
}

interface prevResponse {
  response: response,
  message: string
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  signAndSendTransaction: (transaction: TransactionInstruction) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (obj:requestObj) => Promise<response>;
}


function App() {

  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
    undefined
  );
  const [pubKey, setPubKey] = useState<PublicKey | undefined>(undefined);
  const [walletKeyString, setWalletKeyString] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState<string>("");
  const [prevResponse, setPrevResponse] = useState<prevResponse | undefined>(undefined);

  /**
   * @description gets Phantom provider, if it exists
   */
  const getProvider = (): PhantomProvider | undefined => {
    if ("solana" in window) {
      // @ts-ignore
      const provider = window.solana as any;
      if (provider.isPhantom) return provider as PhantomProvider;
    }
  };

  /**
   * @description prompts user to connect wallet if it exists
   */
   const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (solana) {
      try {
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
        setWalletKey(response.publicKey.toString());
        setPubKey(response.publicKey);
        setWalletKeyString(response.publicKey.toString());
      } catch (err) {
       // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  /**
   * @description disconnect Phantom wallet
   */
   const disconnectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

    if (walletKey && solana) {
      await (solana as PhantomProvider).disconnect();
      setWalletKey(undefined);
    }
  };

   /**
   * @description sign message with Phantom wallet
   */
    const signMessage = async (e:any) => {
      e.preventDefault();
      const encodedMessage = new TextEncoder().encode(message);
      if(provider){
        provider.request({
          method: "signMessage",
          params: {
            message: encodedMessage,
            display: "utf8", //hex,utf8
          },
        }).then((signedMessage)=>{
          setPrevResponse({
            response: signedMessage,
            message: message
          })
          console.log(signedMessage);
          setMessage('');
        })
      }
    };

    const signAndSendTransaction = async (provider: PhantomProvider, transaction: TransactionInstruction): Promise<string | undefined> => {
      try {
        const { signature } = await provider.signAndSendTransaction(transaction);
        return signature;
      } catch (error) {
        console.warn(error);
        //throw new Error(error.message);
      }
    };

    const memoTxn = async(e:any) => {
      e.preventDefault();
      if(pubKey && provider){
        const transaction = createMemoInstruction(message, [pubKey])
        console.log(transaction)
        
        const signature = signAndSendTransaction(provider, transaction);
        console.log(signature)
      }

      console.log('no pub ')
      setMessage('');
    }

  // detect phantom provider exists
  useEffect(() => {
    const provider = getProvider();

    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);


  return (
    <div className="App">
        <div className="nav-bar">
          <h2>Sol.Sign</h2>
          <div className="button-container">
            {provider && !walletKey && (
              <button
                style={{
                  fontSize: "16px",
                  padding: "15px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                }}
                onClick={connectWallet}
              >
                Connect to Phantom Wallet
              </button>
            )}

            {provider && walletKey && (
              <div className="address-holder">
                <p><b>Address:</b> {walletKeyString}</p>

                <button
                  onClick={disconnectWallet}
                >
                  Disconnect
                </button>
              </div>
            )}

            {!provider && (
              <p>
                No provider found. Install{" "}
                <a href="https://phantom.app/">Phantom Browser extension</a>
              </p>
            )}
          </div>

        </div>

        <div>
            <form>
              <input className="Input-text" type='text' placeholder="Message" value={message} onChange={(e) =>setMessage(e.target.value)} required />
              <button className="sign" onClick={signMessage}>Sign</button>
              <button className="sign" onClick={memoTxn}>Memo Tx</button>
            </form>
        </div>

        <div className="response">
          {prevResponse !== undefined ? 
          <div>
            <p><b>Message:</b> {prevResponse.message}</p>
            <p><b>Signature / Tx Hash:</b> {prevResponse.response.signature}</p> 
          </div>
          : null}
        </div>
    </div>
  );
}

export default App;
