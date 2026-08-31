import {getAddress, isAddress} from "viem";

type ContractAddresses = {
    registrarController: `0x${string}`;
    dc: `0x${string}`;
    ews: `0x${string}`;
    baseRegistrar: `0x${string}`;
    nameWrapper: `0x${string}`;
    publicResolver: `0x${string}`;
};

const defaultAddresses: Record<string, string> = {
    NEXT_PUBLIC_REGISTRAR_CONTROLLER: "0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb",
    NEXT_PUBLIC_DC: "0x547942748Cc8840FEc23daFdD01E6457379B446D",
    NEXT_PUBLIC_EWS: "0xf90dab949d3853c418bE361930028644B4EBcDE4",
    NEXT_PUBLIC_BASE_REGISTRAR: "0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD",
    NEXT_PUBLIC_NAME_WRAPPER: "0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5",
    NEXT_PUBLIC_PUBLIC_RESOLVER: "0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D"
};

function requiredAddress(key: string): `0x${string}` {
    const value = process.env[key] ?? defaultAddresses[key];
    if (!value || !isAddress(value)) {
        throw new Error(`Invalid or missing address: ${key}`);
    }
    return getAddress(value) as `0x${string}`;
}

function numericEnv(key: string, fallback: number): number {
    const raw = process.env[key];
    if (!raw) return fallback;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new Error(`Invalid numeric value for ${key}`);
    }
    return parsed;
}

function boolEnv(key: string, fallback = false): boolean {
    const raw = process.env[key];
    if (!raw) return fallback;
    return raw === "true" || raw === "1";
}

export const appConfig = {
    tld: ".country",
    chainId: numericEnv("NEXT_PUBLIC_CHAIN_ID", 1666600000),
    rpcUrl: process.env.NEXT_PUBLIC_HARMONY_RPC_URL ?? "https://api.harmony.one",
    explorerTxUrl: process.env.NEXT_PUBLIC_EXPLORER_TX_URL ?? "https://explorer.harmony.one/tx/{hash}",
    writesEnabled: boolEnv("NEXT_PUBLIC_CONTRACT_WRITES_ENABLED", false),
    defaultDurationSeconds: BigInt(process.env.NEXT_PUBLIC_DEFAULT_DURATION_SECONDS ?? "31536000"),
    wrapperExpiry: Number(process.env.NEXT_PUBLIC_WRAPPER_EXPIRY ?? "0"),
    ownerControlledFuses: Number(process.env.NEXT_PUBLIC_OWNER_CONTROLLED_FUSES ?? "0"),
    contractAddresses: {
        registrarController: requiredAddress("NEXT_PUBLIC_REGISTRAR_CONTROLLER"),
        dc: requiredAddress("NEXT_PUBLIC_DC"),
        ews: requiredAddress("NEXT_PUBLIC_EWS"),
        baseRegistrar: requiredAddress("NEXT_PUBLIC_BASE_REGISTRAR"),
        nameWrapper: requiredAddress("NEXT_PUBLIC_NAME_WRAPPER"),
        publicResolver: requiredAddress("NEXT_PUBLIC_PUBLIC_RESOLVER")
    } satisfies ContractAddresses
};

export function txExplorerUrl(hash: string): string {
    return appConfig.explorerTxUrl.replace("{hash}", hash);
}
