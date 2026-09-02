import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createPublicClient, getAddress, http, keccak256 } from "viem";
import { contractAddresses, HARMONY_CHAIN_ID, HARMONY_RPC_URL } from "../api/_lib/config.js";
import { nameWrapperValidationAbi, publicResolverValidationAbi } from "../api/_lib/phase-zero/abis.js";
import { resolverImmutableAddresses } from "../api/_lib/phase-zero/index.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

async function ownerProbe(client, address, blockNumber) {
  try {
    const value = await client.call({ to: address, data: "0x8da5cb5b", blockNumber });
    return { status: value.data && value.data !== "0x" ? "RESPONDED" : "EMPTY_RESPONSE", data: value.data || "0x" };
  } catch (error) {
    return { status: "REVERTED_OR_UNSUPPORTED", error: error.shortMessage || error.message || String(error) };
  }
}

const outputPath = argument("--output");
const resolverAddress = getAddress(argument("--resolver") || contractAddresses.publicResolver);
const client = createPublicClient({ transport: http(HARMONY_RPC_URL, { timeout: 15_000 }) });
const chainId = await client.getChainId();
if (chainId !== HARMONY_CHAIN_ID) throw new Error(`Expected Harmony Mainnet chain ID ${HARMONY_CHAIN_ID}; received ${chainId}.`);
const blockNumber = await client.getBlockNumber();
const block = await client.getBlock({ blockNumber });

const runtime = await client.getBytecode({ address: resolverAddress, blockNumber });
if (!runtime || runtime === "0x") throw new Error("PublicResolver runtime bytecode is unavailable.");
const immutableAddresses = resolverImmutableAddresses(runtime);
if (!Object.values(immutableAddresses).every((address) => /^0x[0-9a-f]{40}$/i.test(address || ""))) {
  throw new Error("PublicResolver runtime did not expose the expected four immutable addresses.");
}
const trustedController = getAddress(immutableAddresses.trustedController);
const [owner, trustedControllerEnabled, activeControllerEnabled, dnsRecordProbe, hasDnsRecordsProbe] = await Promise.all([
  ownerProbe(client, resolverAddress, blockNumber),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [trustedController], blockNumber }),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [contractAddresses.registrarController], blockNumber }),
  client.readContract({ address: resolverAddress, abi: publicResolverValidationAbi, functionName: "dnsRecord", args: [`0x${"00".repeat(32)}`, `0x${"00".repeat(32)}`, 1], blockNumber }),
  client.readContract({ address: resolverAddress, abi: publicResolverValidationAbi, functionName: "hasDNSRecords", args: [`0x${"00".repeat(32)}`, `0x${"00".repeat(32)}`], blockNumber }),
]);
const activeRegistrarController = getAddress(contractAddresses.registrarController);
const ownerMediatedModel = trustedController !== activeRegistrarController;
const observation = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  observedAt: new Date().toISOString(),
  network: { chainId, rpc: "server-configured", blockNumber: blockNumber.toString(), blockHash: block.hash },
  resolverAddress,
  runtime: {
    keccak256: keccak256(runtime),
    immutableAddresses,
  },
  authorizationModel: {
    activeRegistrarController,
    trustedController,
    trustedControllerMatchesActiveRegistrar: !ownerMediatedModel,
    nameWrapperTrustedControllerEnabled: trustedController ? trustedControllerEnabled : null,
    nameWrapperActiveRegistrarControllerEnabled: activeControllerEnabled,
    requiredInitialRegistrationDnsDataPolicy: ownerMediatedModel ? "EMPTY_DATA_ONLY" : "TRUSTED_CONTROLLER_DATA_ALLOWED_IF_APPROVED",
    requiredPostTransferDnsAuthorizationPolicy: "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS",
    ownerFunctionRequired: false,
  },
  resolverInterfaceProbes: {
    dnsRecordReturnsBytes: typeof dnsRecordProbe === "string",
    hasDnsRecordsReturnsBoolean: typeof hasDnsRecordsProbe === "boolean",
    ownerProbe: owner,
  },
  conclusion: ownerMediatedModel
    ? "The resolver trusts a controller different from the active RegistrarController. Initial registration DNS data must remain empty unless a compatibility path is approved; DNS writes after transfer must re-query on-chain authorization. owner() is not used as a gate prerequisite."
    : "The resolver trusted controller matches the active RegistrarController. The final authorization record still requires review and mandatory post-transfer on-chain authorization re-query.",
  approvalBoundary: "This confirms read-only runtime/interface observations only. It does not approve the resolver artifact, constructor arguments, authorization model, DNS writes, or production Phase 0 gate.",
};
const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
