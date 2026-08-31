import { createPublicClient, formatEther, http, keccak256, namehash, stringToBytes } from "viem";
import { harmonyOne } from "viem/chains";
import { contractAddresses, contractManifest, HARMONY_RPC_URL } from "./config.js";
import { parseCountryDomain } from "./names.js";

export const registrarControllerAbi = [
  { type: "function", name: "available", stateMutability: "view", inputs: [{ name: "name", type: "string" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "rentPrice", stateMutability: "view", inputs: [{ name: "name", type: "string" }, { name: "duration", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "base", type: "uint256" }, { name: "premium", type: "uint256" }] }] },
];

export const baseRegistrarAbi = [
  { type: "function", name: "nameExpires", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
];

export const publicResolverAbi = [
  { type: "function", name: "ttl", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }], outputs: [{ type: "uint64" }] },
];

export const publicClient = createPublicClient({
  chain: harmonyOne,
  transport: http(HARMONY_RPC_URL),
});

export function labelToTokenId(label) {
  return BigInt(keccak256(stringToBytes(label)));
}

export function domainNode(name) {
  return namehash(name.endsWith(".country") ? name : `${name}.country`);
}

export async function readContractBytecode(address) {
  return publicClient.getBytecode({ address });
}

export async function getDomainSummary(input, durationYears = 1) {
  const parsed = parseCountryDomain(input);
  if (!parsed.ok) {
    return {
      name: String(input || ""),
      valid: false,
      normalizedLabel: null,
      availability: "unknown",
      writeMode: "disabled_phase_0",
      onChain: null,
      publishedZone: null,
      price: null,
      warnings: [parsed.reason],
      manifest: contractManifest(),
    };
  }

  const years = Math.min(10, Math.max(1, Math.trunc(Number(durationYears) || 1)));
  const durationSeconds = BigInt(years * 365 * 24 * 60 * 60);

  try {
    const [available, price, expiry, ttl] = await Promise.all([
      publicClient.readContract({
        address: contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "available",
        args: [parsed.label],
      }),
      publicClient.readContract({
        address: contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "rentPrice",
        args: [parsed.label, durationSeconds],
      }),
      publicClient.readContract({
        address: contractAddresses.baseRegistrar,
        abi: baseRegistrarAbi,
        functionName: "nameExpires",
        args: [labelToTokenId(parsed.label)],
      }).catch(() => null),
      publicClient.readContract({
        address: contractAddresses.publicResolver,
        abi: publicResolverAbi,
        functionName: "ttl",
        args: [domainNode(parsed.name)],
      }).catch(() => null),
    ]);

    const total = price.base + price.premium;
    return {
      name: parsed.name,
      valid: true,
      normalizedLabel: parsed.label,
      availability: available ? "available" : "registered",
      writeMode: "disabled_phase_0",
      onChain: {
        owner: null,
        expiresAt: expiry && expiry > 0n ? new Date(Number(expiry) * 1000).toISOString() : null,
        resolver: contractAddresses.publicResolver,
        fuses: null,
        ttl: ttl === null ? null : Number(ttl),
        version: null,
        blockNumber: null,
        transactionHash: null,
        confirmations: null,
      },
      publishedZone: null,
      price: {
        years,
        durationSeconds: durationSeconds.toString(),
        baseWei: price.base.toString(),
        premiumWei: price.premium.toString(),
        totalWei: total.toString(),
        totalOne: formatEther(total),
      },
      warnings: [
        "Contract reads use the configured Harmony mainnet contracts, but writes stay disabled until Phase 0 validation is approved.",
        "Public DNS publication remains inactive until parent .country delegation and PowerDNS rollback procedures are verified.",
      ],
      manifest: contractManifest(),
    };
  } catch (error) {
    return {
      name: parsed.name,
      valid: true,
      normalizedLabel: parsed.label,
      availability: "unknown",
      writeMode: "disabled_phase_0",
      onChain: null,
      publishedZone: null,
      price: null,
      warnings: [error instanceof Error ? `RPC query failed: ${error.message}` : "RPC query failed."],
      manifest: contractManifest(),
    };
  }
}
