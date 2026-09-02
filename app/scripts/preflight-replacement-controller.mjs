import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createPublicClient, getAddress, http, keccak256 } from "viem";
import { contractAddresses, HARMONY_CHAIN_ID, HARMONY_RPC_URL, phaseZeroConfig } from "../api/_lib/config.js";
import { baseRegistrarValidationAbi, dcValidationAbi, nameWrapperValidationAbi, registrarControllerValidationAbi } from "../api/_lib/phase-zero/abis.js";
import { evaluateReplacementControllerPreflight } from "../api/_lib/phase-zero/replacement-controller-preflight.js";

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

const controllerAddress = getAddress(argument("--controller") || contractAddresses.registrarController);
const outputPath = argument("--output");
const client = createPublicClient({ transport: http(HARMONY_RPC_URL, { timeout: 15_000 }) });
const chainId = await client.getChainId();
if (chainId !== HARMONY_CHAIN_ID) throw new Error(`Expected Harmony Mainnet chain ID ${HARMONY_CHAIN_ID}; received ${chainId}.`);

const [bytecode, baseExtension, minimumCommitmentAgeSeconds, maximumCommitmentAgeSeconds, nameWrapperControllerEnabled, baseRegistrarWrapperControllerEnabled, dcRegistrarController] = await Promise.all([
  client.getBytecode({ address: controllerAddress }),
  client.readContract({ address: controllerAddress, abi: registrarControllerValidationAbi, functionName: "baseExtension" }),
  client.readContract({ address: controllerAddress, abi: registrarControllerValidationAbi, functionName: "minCommitmentAge" }),
  client.readContract({ address: controllerAddress, abi: registrarControllerValidationAbi, functionName: "maxCommitmentAge" }),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [controllerAddress] }),
  client.readContract({ address: contractAddresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "controllers", args: [contractAddresses.nameWrapper] }),
  client.readContract({ address: contractAddresses.dc, abi: dcValidationAbi, functionName: "registrarController" }),
]);

const evaluation = evaluateReplacementControllerPreflight({
  chainId,
  controllerAddress,
  bytecodePresent: Boolean(bytecode && bytecode !== "0x"),
  baseExtension,
  minimumCommitmentAgeSeconds,
  maximumCommitmentAgeSeconds,
  nameWrapperControllerEnabled,
  baseRegistrarWrapperControllerEnabled,
  dcRegistrarController,
  registrarManifest: phaseZeroConfig.evidenceManifest.contracts.registrarController,
  commitmentPolicy: phaseZeroConfig.evidenceManifest.commitmentPolicy,
  resolverAuthorization: phaseZeroConfig.evidenceManifest.contracts.publicResolver.authorization,
});
const observation = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  observedAt: new Date().toISOString(),
  network: { chainId, rpc: "server-configured" },
  controllerAddress,
  observed: {
    runtimeBytecodeKeccak256: bytecode ? keccak256(bytecode) : null,
    baseExtension,
    minimumCommitmentAgeSeconds: minimumCommitmentAgeSeconds.toString(),
    maximumCommitmentAgeSeconds: maximumCommitmentAgeSeconds.toString(),
    nameWrapperControllerEnabled,
    baseRegistrarWrapperControllerEnabled,
    dcRegistrarController,
  },
  ...evaluation,
  approvalBoundary: "This is a read-only post-deployment relationship preflight. It sends no transaction and cannot replace the complete Phase 0 gate, baseline approval, owner approval, or Vercel/DNS evidence.",
};
const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
