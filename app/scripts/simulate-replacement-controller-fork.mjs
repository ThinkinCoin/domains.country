import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createPublicClient, createWalletClient, defineChain, getAddress, http, keccak256, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { baseRegistrarValidationAbi, dcValidationAbi, nameWrapperValidationAbi, ownableAbi, registrarControllerValidationAbi } from "../api/_lib/phase-zero/abis.js";
import { buildReplacementControllerMigrationPlan, REVERSE_REGISTRAR_ADDRESS } from "../api/_lib/phase-zero/replacement-controller-migration-plan.js";

const CONTROLLER_OWNER_ABI = Object.freeze([
  ...ownableAbi,
  { type: "function", name: "transferOwnership", stateMutability: "nonpayable", inputs: [{ name: "newOwner", type: "address" }], outputs: [] },
]);
const CONTROLLERS_ABI = Object.freeze([
  ...ownableAbi,
  { type: "function", name: "controllers", stateMutability: "view", inputs: [{ name: "controller", type: "address" }], outputs: [{ type: "bool" }] },
]);
const MAX_UINT64 = (1n << 64n) - 1n;
const ONE_YEAR = 365n * 24n * 60n * 60n;

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256(JSON.stringify(canonical(value)));
}

function localForkUrl(value) {
  const parsed = new URL(value);
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(parsed.hostname)) {
    throw new Error("Replacement-controller fork simulation accepts only a loopback RPC URL.");
  }
  return parsed.toString();
}

async function receipt(client, hash) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const result = await client.getTransactionReceipt({ hash });
      if (result.status !== "success") throw new Error(`Fork transaction ${hash} reverted.`);
      return result;
    } catch (error) {
      if (attempt === 39) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error(`Unable to obtain receipt for ${hash}.`);
}

async function impersonatedWallet(client, transport, chain, address) {
  await client.request({ method: "anvil_impersonateAccount", params: [address] });
  await client.request({ method: "anvil_setBalance", params: [address, "0x3635C9ADC5DEA00000"] });
  return createWalletClient({ account: getAddress(address), chain, transport });
}

function priceTotal(price) {
  return BigInt(price.base ?? price[0]) + BigInt(price.premium ?? price[1]);
}

const artifactPath = argument("--artifact");
const outputPath = argument("--output");
const sourceRevision = argument("--source-revision");
const candidateSourceRevision = argument("--candidate-source-revision");
const rpcUrl = localForkUrl(argument("--rpc") || process.env.PHASE_ZERO_FORK_RPC_URL || "http://127.0.0.1:18546");
const privateKey = process.env.PHASE_ZERO_LOCAL_PRIVATE_KEY;
if (!artifactPath || !sourceRevision || !candidateSourceRevision || !privateKey) {
  throw new Error("Usage: PHASE_ZERO_LOCAL_PRIVATE_KEY=<ephemeral-anvil-key> npm run phase0:simulate-replacement-controller-fork -- --artifact <RegistrarController.json> --source-revision <40-char-app-git-sha> --candidate-source-revision <40-char-candidate-git-sha> [--rpc http://127.0.0.1:18546] [--output <snapshot.json>]");
}
if (!/^[0-9a-f]{40}$/i.test(sourceRevision) || !/^[0-9a-f]{40}$/i.test(candidateSourceRevision)) throw new Error("--source-revision and --candidate-source-revision must be full 40-character Git revisions.");
if (!/^0x[0-9a-f]{64}$/i.test(privateKey)) throw new Error("PHASE_ZERO_LOCAL_PRIVATE_KEY must be an ephemeral 32-byte local key.");

const artifactBytes = await readFile(artifactPath);
const artifact = JSON.parse(artifactBytes.toString("utf8"));
if (!Array.isArray(artifact.abi) || !/^0x[0-9a-f]+$/i.test(artifact.bytecode || "")) throw new Error("Artifact must contain a Solidity ABI and deployment bytecode.");

const transport = http(rpcUrl, { timeout: 20_000 });
const client = createPublicClient({ transport });
const chainId = await client.getChainId();
if (chainId === HARMONY_CHAIN_ID || chainId !== 31337) throw new Error("Replacement-controller migration simulation requires a local Anvil fork on chain ID 31337.");
const clientVersion = await client.request({ method: "web3_clientVersion" });
if (!/anvil/i.test(clientVersion)) throw new Error(`Replacement-controller migration simulation requires Anvil; received ${clientVersion}.`);
const forkChain = defineChain({
  id: 31337,
  name: "Local Harmony Fork",
  nativeCurrency: { name: "Local ONE", symbol: "ONE", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const forkBlockNumber = await client.getBlockNumber();
const deployedCode = await Promise.all(Object.entries(contractAddresses).map(async ([component, address]) => ({ component, address, bytecode: await client.getBytecode({ address }) })));
if (deployedCode.some((item) => !item.bytecode || item.bytecode === "0x")) throw new Error("The local Anvil endpoint is not a usable fork of the required Harmony deployment.");

const deployer = privateKeyToAccount(privateKey);
const deployerWallet = createWalletClient({ account: deployer, chain: forkChain, transport });
const [baseNode, priceOracle, revenueAccount, oldControllerOwner, nameWrapperOwner, reverseRegistrarOwner, dcOwner, oldControllerEnabled, baseRegistrarWrapperController] = await Promise.all([
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "TLD_NODE" }),
  client.readContract({ address: contractAddresses.registrarController, abi: [{ type: "function", name: "prices", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }], functionName: "prices" }),
  client.readContract({ address: contractAddresses.registrarController, abi: [{ type: "function", name: "revenueAccount", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] }], functionName: "revenueAccount" }),
  client.readContract({ address: contractAddresses.registrarController, abi: ownableAbi, functionName: "owner" }),
  client.readContract({ address: contractAddresses.nameWrapper, abi: ownableAbi, functionName: "owner" }),
  client.readContract({ address: REVERSE_REGISTRAR_ADDRESS, abi: ownableAbi, functionName: "owner" }),
  client.readContract({ address: contractAddresses.dc, abi: ownableAbi, functionName: "owner" }),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [contractAddresses.registrarController] }),
  client.readContract({ address: contractAddresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "controllers", args: [contractAddresses.nameWrapper] }),
]);

const deploymentHash = await deployerWallet.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [
    contractAddresses.baseRegistrar,
    priceOracle,
    60n,
    3600n,
    REVERSE_REGISTRAR_ADDRESS,
    contractAddresses.nameWrapper,
    baseNode,
    "country",
    revenueAccount,
  ],
});
const deploymentReceipt = await receipt(client, deploymentHash);
if (!deploymentReceipt.contractAddress) throw new Error("Fork deployment did not produce a RegistrarController address.");
const replacementController = deploymentReceipt.contractAddress;

const migrationPlan = buildReplacementControllerMigrationPlan({
  proposedController: replacementController,
  currentController: contractAddresses.registrarController,
  nameWrapper: contractAddresses.nameWrapper,
  dc: contractAddresses.dc,
  reverseRegistrar: REVERSE_REGISTRAR_ADDRESS,
  owners: { nameWrapper: nameWrapperOwner, reverseRegistrar: reverseRegistrarOwner, dc: dcOwner },
});
const ownerWallets = new Map();
for (const address of [nameWrapperOwner, reverseRegistrarOwner, dcOwner]) {
  const normalized = getAddress(address);
  if (!ownerWallets.has(normalized)) ownerWallets.set(normalized, await impersonatedWallet(client, transport, forkChain, normalized));
}
const migrationTransactions = [];
for (const call of migrationPlan.requiredCalls) {
  const wallet = ownerWallets.get(getAddress(call.owner));
  const hash = await wallet.sendTransaction({ to: call.target, data: call.data, value: 0n });
  await receipt(client, hash);
  migrationTransactions.push({ id: call.id, owner: call.owner, target: call.target, hash });
}

const ownershipTransferHash = await deployerWallet.writeContract({
  address: replacementController,
  abi: CONTROLLER_OWNER_ABI,
  functionName: "transferOwnership",
  args: [oldControllerOwner],
});
await receipt(client, ownershipTransferHash);

const [baseExtension, minimumCommitmentAgeSeconds, maximumCommitmentAgeSeconds, replacementControllerOwner, nameWrapperReplacementEnabled, reverseRegistrarReplacementEnabled, dcRegistrarController, replacementRuntime] = await Promise.all([
  client.readContract({ address: replacementController, abi: registrarControllerValidationAbi, functionName: "baseExtension" }),
  client.readContract({ address: replacementController, abi: registrarControllerValidationAbi, functionName: "minCommitmentAge" }),
  client.readContract({ address: replacementController, abi: registrarControllerValidationAbi, functionName: "maxCommitmentAge" }),
  client.readContract({ address: replacementController, abi: ownableAbi, functionName: "owner" }),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [replacementController] }),
  client.readContract({ address: REVERSE_REGISTRAR_ADDRESS, abi: CONTROLLERS_ABI, functionName: "controllers", args: [replacementController] }),
  client.readContract({ address: contractAddresses.dc, abi: dcValidationAbi, functionName: "registrarController" }),
  client.getBytecode({ address: replacementController }),
]);
if (baseExtension !== "country" || minimumCommitmentAgeSeconds !== 60n || maximumCommitmentAgeSeconds !== 3600n || !nameWrapperReplacementEnabled || !reverseRegistrarReplacementEnabled || getAddress(dcRegistrarController) !== getAddress(replacementController) || getAddress(replacementControllerOwner) !== getAddress(oldControllerOwner) || !baseRegistrarWrapperController) {
  throw new Error("Fork migration did not establish the required RegistrarController relationships.");
}

const registrationLabel = `phase0fork${forkBlockNumber}`;
const commitment = await client.readContract({
  address: replacementController,
  abi: registrarControllerValidationAbi,
  functionName: "makeCommitment",
  args: [registrationLabel, deployer.address, ONE_YEAR, zeroHash, contractAddresses.publicResolver, [], false, 0, MAX_UINT64],
});
const commitHash = await deployerWallet.writeContract({ address: replacementController, abi: registrarControllerValidationAbi, functionName: "commit", args: [commitment] });
await receipt(client, commitHash);
await client.request({ method: "evm_increaseTime", params: [61] });
await client.request({ method: "evm_mine", params: [] });
const price = await client.readContract({ address: replacementController, abi: registrarControllerValidationAbi, functionName: "rentPrice", args: [registrationLabel, ONE_YEAR] });
const registerHash = await deployerWallet.writeContract({
  address: replacementController,
  abi: registrarControllerValidationAbi,
  functionName: "register",
  args: [registrationLabel, deployer.address, ONE_YEAR, zeroHash, contractAddresses.publicResolver, [], false, 0, MAX_UINT64],
  value: priceTotal(price),
});
await receipt(client, registerHash);
const availableAfterRegistration = await client.readContract({ address: replacementController, abi: registrarControllerValidationAbi, functionName: "available", args: [registrationLabel] });
if (availableAfterRegistration !== false) throw new Error("Fork registration did not consume the selected label.");

const resolverTrustedController = await client.getBytecode({ address: contractAddresses.publicResolver });
const evidence = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: { chainId, clientVersion, rpcUrl: "local-anvil-fork", forkBlockNumber: forkBlockNumber.toString(), upstreamChainId: HARMONY_CHAIN_ID },
  sourceRevision,
  artifact: { pathHint: artifactPath.split(/[\\/]/).slice(-4).join("/"), sha256: sha256(artifactBytes), candidateSourceRevision },
  forkContracts: deployedCode.map(({ component, address, bytecode }) => ({ component, address, runtimeBytecodeKeccak256: bytecode ? keccak256(bytecode) : null })),
  initialState: { oldController: contractAddresses.registrarController, oldControllerEnabled, baseRegistrarWrapperController, owners: { oldControllerOwner, nameWrapperOwner, reverseRegistrarOwner, dcOwner }, priceOracle, revenueAccount },
  replacementController: { address: replacementController, deploymentHash, runtimeBytecodeKeccak256: replacementRuntime ? keccak256(replacementRuntime) : null, owner: replacementControllerOwner, baseExtension, minimumCommitmentAgeSeconds: minimumCommitmentAgeSeconds.toString(), maximumCommitmentAgeSeconds: maximumCommitmentAgeSeconds.toString() },
  migrationTransactions,
  ownershipTransferHash,
  postMigration: { nameWrapperReplacementEnabled, reverseRegistrarReplacementEnabled, baseRegistrarWrapperController, dcRegistrarController },
  forkRegistration: { label: registrationLabel, commitment, commitHash, registerHash, paidWei: priceTotal(price).toString(), availableAfterRegistration },
  resolverPolicyBoundary: { publicResolver: contractAddresses.publicResolver, initialRegistrationDnsData: "EMPTY_DATA_ONLY", runtimeKeccak256: resolverTrustedController ? keccak256(resolverTrustedController) : null },
  approvalBoundary: "This is a local Anvil fork exercise. Every state-changing transaction was sent only to the loopback fork (chain ID 31337), never Harmony Mainnet. It demonstrates candidate migration mechanics but does not authorize a production deployment, parent DNS delegation, PowerDNS publication, or Phase 0 READY.",
};
const output = { ...evidence, evidenceSha256: sha256Json(evidence) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
