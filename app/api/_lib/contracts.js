import { contractAddresses, contractManifest } from "./config.js";
import { rawRpcClient, textToHex, web3Sha3Hex } from "./evm-rpc.js";
import { parseCountryDomain } from "./names.js";
import { getPhaseZeroGate } from "./phase-zero/index.js";

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

export async function labelToTokenId(label) {
  return BigInt(await web3Sha3Hex(textToHex(label)));
}

export async function domainNode(name) {
  let node = `0x${"0".repeat(64)}`;
  for (const label of (name.endsWith(".country") ? name : `${name}.country`).split(".").reverse()) {
    const labelHash = await web3Sha3Hex(textToHex(label));
    node = await web3Sha3Hex(`0x${node.slice(2)}${labelHash.slice(2)}`);
  }
  return node;
}

export async function readContractBytecode(address) {
  return rawRpcClient.getBytecode({ address });
}

function formatOne(value) {
  const whole = value / 10n ** 18n;
  const fraction = (value % 10n ** 18n).toString().padStart(18, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

function phaseZeroWarnings(phaseZero) {
  return [...new Set(phaseZero.blockers.map((blocker) => blocker.summary))];
}

export async function getDomainSummary(input, durationYears = 1) {
  const phaseZero = await getPhaseZeroGate();
  const writeMode = phaseZero.decision === "READY" ? "enabled" : "disabled_phase_0";
  const parsed = parseCountryDomain(input);
  if (!parsed.ok) {
    return {
      name: String(input || ""),
      valid: false,
      normalizedLabel: null,
      availability: "unknown",
      writeMode,
      onChain: null,
      publishedZone: null,
      price: null,
      warnings: [parsed.reason, ...phaseZeroWarnings(phaseZero)],
      phaseZero,
      manifest: contractManifest(),
    };
  }

  const years = Math.min(10, Math.max(1, Math.trunc(Number(durationYears) || 1)));
  const durationSeconds = BigInt(years * 365 * 24 * 60 * 60);

  try {
    const [available, price, expiry, ttl] = await Promise.all([
      rawRpcClient.readContract({
        address: contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "available",
        args: [parsed.label],
      }),
      rawRpcClient.readContract({
        address: contractAddresses.registrarController,
        abi: registrarControllerAbi,
        functionName: "rentPrice",
        args: [parsed.label, durationSeconds],
      }),
      rawRpcClient.readContract({
        address: contractAddresses.baseRegistrar,
        abi: baseRegistrarAbi,
        functionName: "nameExpires",
        args: [await labelToTokenId(parsed.label)],
      }).catch(() => null),
      rawRpcClient.readContract({
        address: contractAddresses.publicResolver,
        abi: publicResolverAbi,
        functionName: "ttl",
        args: [await domainNode(parsed.name)],
      }).catch(() => null),
    ]);

    const total = price.base + price.premium;
    return {
      name: parsed.name,
      valid: true,
      normalizedLabel: parsed.label,
      availability: available ? "available" : "registered",
      writeMode,
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
        totalOne: formatOne(total),
      },
      warnings: phaseZero.decision === "READY"
        ? ["Phase 0 evidence is current. Transaction execution remains intentionally out of scope for this validation release."]
        : phaseZeroWarnings(phaseZero),
      manifest: contractManifest(),
      phaseZero,
    };
  } catch (error) {
    return {
      name: parsed.name,
      valid: true,
      normalizedLabel: parsed.label,
      availability: "unknown",
      writeMode,
      onChain: null,
      publishedZone: null,
      price: null,
      warnings: [error instanceof Error ? `RPC query failed: ${error.message}` : "RPC query failed.", ...phaseZeroWarnings(phaseZero)],
      manifest: contractManifest(),
      phaseZero,
    };
  }
}
