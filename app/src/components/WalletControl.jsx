import { CaretDown, Wallet, WarningCircle } from "@phosphor-icons/react";
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

  const openWallet = () => {
    open({ view: isConnected ? "Account" : "Connect" });
  };

  const label = !isConnected ? "Connect wallet" : address ? shortAddress(address) : "Connected";

  return <button className={`wallet-control ${inverse ? "wallet-control--inverse" : ""}`} onClick={openWallet}>
    <Wallet size={19} />
    <span>{label}</span>
    {isConnected && <span className="online-dot" aria-label="Wallet connected" />}
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
