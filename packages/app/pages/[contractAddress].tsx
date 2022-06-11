import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { ethers } from "ethers";
import {
  UnlockableNFT,
  UnlockableNFT__factory,
} from "../../hardhat/typechain-types";
import { NextPage } from "next";
import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import {
  useAccount,
  useSigner,
  useContract,
  useContractRead,
  useProvider,
  useConnect,
} from "wagmi";

import UnlockableNFTJSON from "../../hardhat/artifacts/contracts/UnlockableNFT.sol/UnlockableNFT.json";
import { Blurhash } from "react-blurhash";
import { encodeImageToBlurhash } from "../src/blurhashHelper";
import { providers } from "ethers";
import { Web3Storage } from "web3.storage";
import * as sigUtil from "@metamask/eth-sig-util";
import * as ethUtil from "ethereumjs-util";

enum NFTState {
  onSale,
  WaitingForApproval,
  Sold,
}

const ContractPage = (props: { contractAddress: string }) => {
  const { data: account, isSuccess: isAccountSuccess } = useAccount();
  const { data: signer, isSuccess: isSignerSuccess } = useSigner();

  const contract = useContract<UnlockableNFT>({
    addressOrName: props.contractAddress,
    contractInterface: UnlockableNFTJSON.abi,
    signerOrProvider: signer,
  });
  window!.contract = contract;

  const { data: nfts, isLoading: nftsLoading } = useContractRead(
    {
      addressOrName: props.contractAddress,
      contractInterface: UnlockableNFTJSON.abi,
    },
    "fetchNFTs",
    {
      watch: true,
    }
  ) as { data?: UnlockableNFT.NFTStructOutput[]; isLoading: boolean };

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (isAccountSuccess && isSignerSuccess && account && signer) {
    console.log("signer: ", account, contract, UnlockableNFTJSON);

    return (
      <div>
        <button
          onClick={async () => {
            console.log("owner", await contract.greet());
          }}
        >
          owner
        </button>

        <button
          onClick={async () => {
            console.log(
              "owner",
              await contract.makePayment("payment", {
                value: ethers.utils.parseEther("1"),
              })
            );
          }}
        >
          payment
        </button>

        <Button variant="outlined" onClick={handleClickOpen}>
          createNFT
        </Button>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          scroll="paper"
        >
          <DialogTitle id="alert-dialog-title">
            {"Use Google's location service?"}
          </DialogTitle>
          <DialogContent>
            <MintNFT
              contractAddress={props.contractAddress}
              close={handleClose}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Close</Button>
          </DialogActions>
        </Dialog>

        <button
          onClick={async () => {
            console.log(
              "change owner",
              await contract.setGreeting("new" + Math.random())
            );
          }}
        >
          owner
        </button>
        <Button
          onClick={async () => {
            console.log(
              "tx: ",

              await signer.sendTransaction({
                to: contract.address,
                value: ethers.utils.parseEther("1"),
              })
            );

            // console.log(
            //   "owner",
            //   await contract.functions.transfer(
            //     "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            //     1,
            //     { gasLimit: 1000000, value: 10 }
            //   )
            // );
          }}
        >
          Transfer
        </Button>

        <Button
          onClick={async () => {
            console.log(
              "balance",
              (await contract.balanceOf(account!.address)).toString()
            );
          }}
        >
          balance
        </Button>
        <br />
        <GlowText>
          {!nftsLoading ? (
            <Box>
              <div
                style={{
                  wordWrap: "break-word",
                }}
              >
                {JSON.stringify(nfts)}
              </div>

              <br />
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                }}
              >
                {nfts
                  ?.slice()
                  .reverse()
                  .map((nft) => {
                    return (
                      <Card
                        key={"id" + nft.id}
                        sx={{ maxWidth: 300, margin: 2 }}
                      >
                        <CardMedia
                          component={UnlockImage}
                          unlockableURL={nft.unlockableURL}
                          blurhash={nft.publicURL}
                          tryUnlock={nft.owner === account!.address}
                        />
                        <CardContent>
                          <Typography gutterBottom variant="h6" component="div">
                            Lizard id:{nft.id.toString()} eth:
                            {nft.price.toString()}
                          </Typography>
                          <Typography gutterBottom variant="h6" component="div">
                            owner:0x...{nft.owner.slice(nft.owner.length - 6)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Lizards are a widespread group of squamate reptiles,
                            with over 6,000 species, ranging across all
                            continents except Antarctica
                          </Typography>
                        </CardContent>
                        <CardActions>
                          {nft.owner === account.address ? (
                            <>
                              {nft.state === NFTState.Sold && (
                                <Button
                                  size="small"
                                  onClick={async () => {
                                    let price = prompt("price ETH?");
                                    if (
                                      price &&
                                      Number.isInteger(Number(price))
                                    ) {
                                      await contract.functions.updateNFT(
                                        nft.id,
                                        ethers.utils.parseEther(price),
                                        true,
                                        {
                                          gasLimit: 4000000,
                                        }
                                      );
                                    }
                                  }}
                                >
                                  <Typography color="text.secondary">
                                    Sell
                                  </Typography>
                                </Button>
                              )}
                              {nft.state === NFTState.WaitingForApproval && (
                                <Button
                                  size="small"
                                  onClick={async () => {
                                    await contract.functions.approveSale(
                                      nft.id,
                                      "newunlockablenft",
                                      {
                                        gasLimit: 4000000,
                                      }
                                    );
                                  }}
                                >
                                  <Typography color="text.secondary">
                                    Approve Sale
                                  </Typography>
                                </Button>
                              )}
                              {nft.state === NFTState.onSale && (
                                <Button
                                  size="small"
                                  onClick={async () => {
                                    await contract.functions.updateNFT(
                                      nft.id,
                                      1,
                                      false,
                                      {
                                        gasLimit: 4000000,
                                      }
                                    );
                                  }}
                                >
                                  <Typography color="text.secondary">
                                    Revoke sell
                                  </Typography>
                                </Button>
                              )}
                            </>
                          ) : (
                            nft.state === NFTState.onSale && (
                              <Button
                                size="small"
                                onClick={async () => {
                                  await contract.functions.buyNFT(nft.id, {
                                    value: nft.price,
                                    gasLimit: 4000000,
                                  });
                                }}
                              >
                                <Typography color="text.secondary">
                                  {nft.price.toString()} ETH - Buy to unlock
                                </Typography>
                              </Button>
                            )
                          )}
                        </CardActions>
                      </Card>
                    );
                  })}
              </div>
            </Box>
          ) : (
            <div>Loading...</div>
          )}
        </GlowText>
      </div>
    );
  } else {
    return <div>fail</div>;
  }
};

const requestPublicKey = async (
  web3: providers.Web3Provider,
  account: string
) => {
  return (await web3.send("eth_getEncryptionPublicKey", [account])).result;
};

const encrypt = (publicKey: string, text: string) => {
  const result = sigUtil.encrypt({
    publicKey,
    data: text,
    // https://github.com/MetaMask/eth-sig-util/blob/v4.0.0/src/encryption.ts#L40
    version: "x25519-xsalsa20-poly1305",
  });

  // https://docs.metamask.io/guide/rpc-api.html#other-rpc-methods
  return ethUtil.bufferToHex(Buffer.from(JSON.stringify(result), "utf8"));
};

const decrypt = async (
  web3: providers.Web3Provider,
  account: string,
  text: string
) => {
  const result = (await web3.send("eth_decrypt", [text, account])).result;
  return result;
};

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });

const MintNFT = (props: { contractAddress: string; close: () => void }) => {
  const { data: account, isSuccess: isAccountSuccess } = useAccount();
  const { data: signer, isSuccess: isSignerSuccess } = useSigner();
  const connector = useConnect();

  const contract = useContract<UnlockableNFT>({
    addressOrName: props.contractAddress,
    contractInterface: UnlockableNFTJSON.abi,
    signerOrProvider: signer,
  });

  const fileInput = useRef<HTMLInputElement>(null);

  const [selectedFile, setselectedFile] = useState<File | null>(null);

  const [base64Img, setbase64Img] = useState("");

  const [blurImg, setblurImg] = useState("");
  useEffect(() => {
    if (selectedFile) {
      toBase64(selectedFile).then((base64) => {
        setbase64Img(base64);
        encodeImageToBlurhash(base64).then((blurhash) => {
          console.log("blurhash", blurhash);
          setblurImg(blurhash);
        });
      });
    }
  }, [selectedFile]);

  const [publicKey, setpublicKey] = useState("");

  const [name, setname] = useState("");
  const [description, setdescription] = useState("");

  const uploadFile = async (file: File) => {
    console.log("> 📦 creating web3.storage client");
    const client = new Web3Storage({
      token:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDU4NjdiYzJCRDg1MTMxODVFNDcyMWFjNzFlY2U1NThCMDk5OUE5NTQiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NTMxNjgwMDY3NzksIm5hbWUiOiJhIn0.0qstMA40uMWGKc1qIyDK3MdaXooUT5v1ChcyRWKLwXE",
    });

    console.log(
      "> 🤖 chunking and hashing the files (in your browser!) to calculate the Content ID"
    );
    const cid = await client.put([file], {
      onRootCidReady: (localCid) => {
        console.log(`> 🔑 locally calculated Content ID: ${localCid} `);
        console.log("> 📡 sending files to web3.storage ");
      },
      onStoredChunk: (bytes) =>
        console.log(`> 🛰 sent ${bytes.toLocaleString()} bytes to web3.storage`),
    });
    console.log(`> ✅ web3.storage now hosting ${cid}`);
    console.log(`https://dweb.link/ipfs/${cid}`);

    // console.log("> 📡 fetching the list of all unique uploads on this account");
    // let totalBytes = 0;
    // for await (const upload of client.list()) {
    //   console.log(`> 📄 ${upload.cid}  ${upload.name}`);
    //   totalBytes += upload.dagSize || 0;
    // }
    // console.log(`> ⁂ ${totalBytes.toLocaleString()} bytes stored!`);
    return cid;
  };

  const [minting, setminting] = useState(false);

  return (
    <>
      <TextField
        value={name}
        onChange={(e) => setname(e.target.value)}
        id="outlined-basic"
        label="Name"
        variant="outlined"
        margin="normal"
        required
        fullWidth
      />
      <TextField
        value={description}
        onChange={(e) => setdescription(e.target.value)}
        id="outlined-basic"
        label="Description"
        variant="outlined"
        margin="normal"
        required
        fullWidth
        multiline
      />

      <TextField
        value={publicKey}
        onChange={(e) => setpublicKey(e.target.value)}
        id="outlined-basic"
        label={publicKey ? "Public Key" : "Please click to get public key"}
        variant="outlined"
        disabled
        onClick={async () => {
          if (!publicKey) {
            let a =
              (await connector.activeConnector?.getProvider()) as providers.Web3Provider;
            console.log("mtt:", a);

            requestPublicKey(a, account!.address).then((res) => {
              console.log("public key:", res);
              setpublicKey(res);
            });
          }
        }}
        margin="normal"
        required
        fullWidth
      />

      {blurImg && (
        <>
          <Typography variant="body2" color="text.secondary">
            Public Image:
          </Typography>
          <Blurhash
            hash={blurImg}
            width={400}
            height={300}
            resolutionX={32}
            resolutionY={32}
            punch={1}
          />
        </>
      )}
      {base64Img && (
        <>
          <Typography variant="body2" color="text.secondary">
            Secret Image:
          </Typography>
          <img src={base64Img} alt="" width={"500px"} />{" "}
        </>
      )}

      <input
        type="file"
        name="image"
        ref={fileInput}
        onChange={(e) => {
          if (e.target.files?.length && e.target.files?.length > 0) {
            setblurImg("");
            setselectedFile(e.target.files[0]);
          }
        }}
        style={{ display: "none" }}
      />

      <Button
        className="upload-btn"
        onClick={() => fileInput?.current?.click()}
      >
        Select Image
      </Button>
      <br />
      <Button
        disabled={
          !(publicKey && blurImg && selectedFile && name && description) ||
          minting
        }
        className="upload-btn"
        onClick={async () => {
          setminting(true);
          let cid = await uploadFile(selectedFile!);
          let link = `https://ipfs.io/ipfs/${cid}/${encodeURIComponent(
            selectedFile!.name
          )}`;
          let encrpytedCid = encrypt(publicKey, link);
          console.log("encrpytedCid", encrpytedCid);

          console.log(
            "createNFT",
            await contract.createNFT(
              name,
              description,
              blurImg,
              encrpytedCid,
              1
            )
          );
          setminting(false);
          //   props.close();
        }}
      >
        {minting ? "Minting" : "Upload"}
      </Button>
    </>
  );
};

const UnlockImage = (props: {
  blurhash: string;
  unlockableURL: string;
  tryUnlock: boolean;
}) => {
  const { data: account, isSuccess: isAccountSuccess } = useAccount();
  const { data: signer, isSuccess: isSignerSuccess } = useSigner();

  const connector = useConnect();

  const [decrypted, setdecrypted] = useState(false);

  const unlock = async () => {
    let a =
      (await connector.activeConnector?.getProvider()) as providers.Web3Provider;

    decrypt(a, account!.address, props.unlockableURL).then((res) => {
      setdecrypted(res);
    });
  };

  //   useEffect(() => {
  //     if (props.tryUnlock) {
  //         unlock();
  //     }
  //     //   setdecrypted(true);
  //   }, []);

  return (
    <>
      {decrypted ? (
        <img src={decrypted} width={400} height={300} />
      ) : (
        <div style={{ position: "relative", height: 300 }}>
          <div style={{ position: "absolute", margin: "auto" }}>
            <Blurhash
              style={{ position: "absolute" }}
              hash={props.blurhash}
              width={400}
              height={300}
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          </div>
          <div
            style={{
              position: "absolute",
              margin: "auto",
              left: 0,
              right: 0,
              bottom: 0,
              top: 0,
              alignItems: "center",
              justifyContent: "center",
              display: "flex",
            }}
            onClick={() => {
              unlock();
            }}
          >
            <Typography variant="h5" color="text.secondary">
              Click to Unlock Image
            </Typography>
          </div>
        </div>
      )}
    </>
  );
};

const GlowText = (props) => {
  return <Typography>{props.children}</Typography>;
};

const Contract: NextPage = () => {
  const router = useRouter();

  const { contractAddress } = router.query;
  if (!contractAddress || Array.isArray(contractAddress)) {
    return <div>no contract address</div>;
  }

  return <ContractPage contractAddress={contractAddress} />;
};

export default Contract;
