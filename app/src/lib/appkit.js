import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { defineChain } from "@reown/appkit/networks";

export const HARMONY_CHAIN_ID = 1666600000;
export const harmonyMainnet = defineChain({
  id: HARMONY_CHAIN_ID,
  caipNetworkId: `eip155:${HARMONY_CHAIN_ID}`,
  chainNamespace: "eip155",
  name: "Harmony Mainnet",
  nativeCurrency: { name: "ONE", symbol: "ONE", decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_HARMONY_RPC_URL || "https://api.harmony.one"] },
  },
  blockExplorers: {
    default: { name: "Harmony Explorer", url: "https://explorer.harmony.one" },
  },
});

const defaultReownProjectId = "9c662fcd4b40e29dff6a4e0fbedb936a";

export const reownProjectId = import.meta.env.VITE_REOWN_PROJECT_ID || defaultReownProjectId;
export const appKitConfigured = Boolean(reownProjectId);
export const appKitNetworks = [harmonyMainnet];
export const wagmiAdapter = new WagmiAdapter({
  networks: appKitNetworks,
  projectId: reownProjectId,
});

const appOrigin = typeof window === "undefined"
  ? (import.meta.env.VITE_APP_URL || "https://domains.country")
  : window.location.origin;

if (appKitConfigured) {
  createAppKit({
    adapters: [wagmiAdapter],
    networks: appKitNetworks,
    projectId: reownProjectId,
    metadata: {
      name: "domains.country",
      description: "Official .country domain management on Harmony.",
      url: appOrigin,
      icons: [`${appOrigin}/favicon.svg`],
    },
    features: {
      analytics: false,
    },
  });
}
