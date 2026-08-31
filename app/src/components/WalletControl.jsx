import { CaretDown, GlobeHemisphereWest, Wallet, WarningCircle } from "@phosphor-icons/react";
import { useAppKit, useAppKitAccount, useAppKitNetwork } from "@reown/appkit/react";
import { HARMONY_CHAIN_ID, appKitConfigured } from "../lib/appkit.js";

function shortAddress(address) {
  return `${address.slice(0, 7)}...${address.slice(-4)}`;
}

export function WalletControl({ inverse = false }) {
  if (!appKitConfigured) {
    return <button className={`wallet-control ${inverse ? "wallet-control--inverse" : ""}`} disabled title="Set VITE_REOWN_PROJECT_ID to enable wallet connection."><WarningCircle size={19} /><span>Wallet unavailable</span></button>;
  }

  return <ConfiguredWalletControl inverse={inverse} />;
}

function ConfiguredWalletControl({ inverse }) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  const onHarmony = Number(chainId) === HARMONY_CHAIN_ID;

  const openWallet = () => {
    if (isConnected && !onHarmony) {
      open({ view: "Networks" });
      return;
    }
    open({ view: isConnected ? "Account" : "Connect" });
  };

  const label = !isConnected ? "Connect wallet" : !onHarmony ? "Switch to Harmony" : address ? shortAddress(address) : "Connected";

  return <button className={`wallet-control ${inverse ? "wallet-control--inverse" : ""}`} onClick={openWallet}>
    {onHarmony || !isConnected ? <Wallet size={19} /> : <GlobeHemisphereWest size={19} />}
    <span>{label}</span>
    {isConnected && onHarmony && <span className="online-dot" aria-label="Connected to Harmony Mainnet" />}
    <CaretDown size={14} />
  </button>;
}

export function useHarmonyWallet() {
  if (!appKitConfigured) {
    return { address: undefined, isConnected: false, isHarmony: false };
  }

  return useConfiguredHarmonyWallet();
}

function useConfiguredHarmonyWallet() {
  const { address, isConnected } = useAppKitAccount();
  const { chainId } = useAppKitNetwork();
  return { address, isConnected, isHarmony: Number(chainId) === HARMONY_CHAIN_ID };
}
