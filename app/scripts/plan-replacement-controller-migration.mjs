import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { createPublicClient, getAddress, http } from "viem";
import { contractAddresses, HARMONY_CHAIN_ID, HARMONY_RPC_URL } from "../api/_lib/config.js";
import { baseRegistrarValidationAbi, dcValidationAbi, nameWrapperValidationAbi, registrarControllerValidationAbi } from "../api/_lib/phase-zero/abis.js";
import { buildReplacementControllerMigrationPlan, REVERSE_REGISTRAR_ADDRESS } from "../api/_lib/phase-zero/replacement-controller-migration-plan.js";

const ownableAbi = Object.freeze([
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "controllers", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
]);

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

async function optionalRead(read) {
  try {
    return { status: "PASS", value: await read() };
  } catch (error) {
    return { status: "UNAVAILABLE", error: error instanceof Error ? error.message : String(error) };
  }
}

const proposedController = getAddress(argument("--controller") || "");
const outputPath = argument("--output");
const reverseRegistrar = getAddress(argument("--reverse-registrar") || REVERSE_REGISTRAR_ADDRESS);

const client = createPublicClient({ transport: http(HARMONY_RPC_URL, { timeout: 15_000 }) });
const chainId = await client.getChainId();
if (chainId !== HARMONY_CHAIN_ID) throw new Error(`Expected Harmony Mainnet chain ID ${HARMONY_CHAIN_ID}; received ${chainId}.`);

const [controllerBytecode, baseExtension, minimumCommitmentAgeSeconds, maximumCommitmentAgeSeconds, nameWrapperOwner, reverseRegistrarOwner, dcOwner, baseRegistrarWrapperControllerEnabled] = await Promise.all([
  optionalRead(() => client.getBytecode({ address: proposedController })),
  optionalRead(() => client.readContract({ address: proposedController, abi: registrarControllerValidationAbi, functionName: "baseExtension" })),
  optionalRead(() => client.readContract({ address: proposedController, abi: registrarControllerValidationAbi, functionName: "minCommitmentAge" })),
  optionalRead(() => client.readContract({ address: proposedController, abi: registrarControllerValidationAbi, functionName: "maxCommitmentAge" })),
  optionalRead(() => client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "owner" })),
  optionalRead(() => client.readContract({ address: reverseRegistrar, abi: ownableAbi, functionName: "owner" })),
  optionalRead(() => client.readContract({ address: contractAddresses.dc, abi: dcValidationAbi, functionName: "owner" })),
  optionalRead(() => client.readContract({ address: contractAddresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "controllers", args: [contractAddresses.nameWrapper] })),
]);

const plan = buildReplacementControllerMigrationPlan({
  proposedController,
  currentController: contractAddresses.registrarController,
  nameWrapper: contractAddresses.nameWrapper,
  dc: contractAddresses.dc,
  reverseRegistrar,
  owners: {
    nameWrapper: nameWrapperOwner.status === "PASS" ? nameWrapperOwner.value : null,
    reverseRegistrar: reverseRegistrarOwner.status === "PASS" ? reverseRegistrarOwner.value : null,
    dc: dcOwner.status === "PASS" ? dcOwner.value : null,
  },
});

const observation = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: { name: "Harmony Mainnet", chainId, rpc: "server-configured" },
  plan,
  preflightHints: {
    controllerBytecodePresent: controllerBytecode.status === "PASS" && Boolean(controllerBytecode.value && controllerBytecode.value !== "0x"),
    baseExtension,
    minimumCommitmentAgeSeconds: minimumCommitmentAgeSeconds.status === "PASS" ? minimumCommitmentAgeSeconds.value.toString() : minimumCommitmentAgeSeconds,
    maximumCommitmentAgeSeconds: maximumCommitmentAgeSeconds.status === "PASS" ? maximumCommitmentAgeSeconds.value.toString() : maximumCommitmentAgeSeconds,
    baseRegistrarWrapperControllerEnabled,
  },
  approvalBoundary: "This is an unsigned calldata plan and read-only Harmony observation. It does not deploy a controller, sign, send, approve, or enable writes.",
};

const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
