import "../styles/globals.css";
import Head from "next/head";
import { AppProps } from "next/app";
import { Provider } from "jotai";
import "react-tooltip/dist/react-tooltip.css";
import { Toaster } from "@/components/ui/toaster";

const MyApp = ({ Component, pageProps }: AppProps) => {
  return (
    <>
      <Head>
        <title>HighResify</title>
      </Head>
      <Provider>
        <Component {...pageProps} data-theme="HighResify" />
        <Toaster />
      </Provider>
    </>
  );
};

export default MyApp;
