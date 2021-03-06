import type { AppProps } from "next/app";

import "@rainbow-me/rainbowkit/styles.css";
import {
  getDefaultWallets,
  RainbowKitProvider,
  ConnectButton,
  darkTheme,
  connectorsForWallets,
  wallet,
} from "@rainbow-me/rainbowkit";
import {
  allChains,
  chain,
  createClient,
  WagmiConfig,
  configureChains,
} from "wagmi";
import {
  Box,
  Container,
  createTheme,
  CssBaseline,
  ThemeProvider,
  Typography,
} from "@mui/material";
import Head from "next/head";
import dynamic from "next/dynamic";
import React from "react";
import { publicProvider } from "wagmi/providers/public";

const { chains, provider } = configureChains(allChains, [publicProvider()]);

const connectors = connectorsForWallets([
  {
    groupName: "Recommended",
    wallets: [wallet.metaMask({ chains })],
  },
]);
const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});

const NoSSRWrapper = dynamic(() => Promise.resolve(React.Fragment), {
  ssr: false,
});

// https://trishalim.hashnode.dev/css-tricks-to-create-that-dark-futuristic-web3-look?utm_source=tldrnewsletter
// https://mui.com/material-ui/customization/theme-components/
const theme = createTheme({
  // palette: {
  //   mode: "dark",
  // },
  components: {
    MuiButton: {
      defaultProps: {
        variant: "contained",
      },
      styleOverrides: {
        root: {
          backgroundImage:
            "linear-gradient(to right, rgb(1 134 218), rgb(182 49 167))",
          border: 0,
          ":hover": {
            boxShadow: "rgba(var(--primary-color), 0.5) 0px 0px 20px 0px",
          },
        },
      },
    },

    MuiTypography: {
      styleOverrides: {
        root: {
          textShadow:
            "0 0 80px rgb(192 219 255 / 75%), 0 0 32px rgb(65 120 255 / 24%)",
          background: "linear-gradient(to right, #30CFD0, #c43ad6)",
          "-webkit-background-clip": "text",
          "-webkit-text-fill-color": "transparent",
        },
      },
    },
  },
});

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <NoSSRWrapper>
        <WagmiConfig client={wagmiClient}>
          <RainbowKitProvider
            coolMode
            showRecentTransactions={false}
            chains={chains}
            // theme={darkTheme()}
          >
            <ThemeProvider theme={theme}>
              <CssBaseline />
              <Container maxWidth="xl">
                <Typography variant="h4" align="center">
                  Decentralized Unlockable NFT Marketplace
                </Typography>
                <Box
                  sx={{
                    margin: "2rem",
                    alignItems: "center",
                    justifyContent: "center",
                    display: "flex",
                    flexWrap: "wrap",
                  }}
                >
                  <ConnectButton />
                </Box>
                <Box
                  sx={{
                    margin: "2rem",
                    alignItems: "center",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "center",
                  }}
                >
                  <Component {...pageProps} />
                </Box>
              </Container>
            </ThemeProvider>
          </RainbowKitProvider>
        </WagmiConfig>
      </NoSSRWrapper>
    </>
  );
}

export default MyApp;
