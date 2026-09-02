import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createPublicClient, createWalletClient, http, keccak256, stringToHex, zeroAddress, zeroHash } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { HARMONY_CHAIN_ID } from "../api/_lib/config.js";

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Json(value) {
  return sha256(JSON.stringify(canonical(value)));
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function localReceipt(client, hash) {
  // Anvil mines immediately. Avoid waitForTransactionReceipt here because its
  // long-lived polling transport can keep this evidence-only CLI alive after
  // the receipt has already been observed.
  let lastError = null;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await client.getTransactionReceipt({ hash });
    } catch (error) {
      lastError = error;
      await sleep(250);
    }
  }
  throw new Error(`Timed out waiting for local receipt ${hash}: ${lastError?.message || String(lastError)}`);
}

const artifactPath = argValue("--artifact");
const outputPath = argValue("--output");
const sourceRevision = argValue("--source-revision");
const candidateSourceRevision = argValue("--candidate-source-revision");
const rpcUrl = argValue("--rpc") || process.env.PHASE_ZERO_LOCAL_RPC_URL || "http://127.0.0.1:18545";
const privateKey = process.env.PHASE_ZERO_LOCAL_PRIVATE_KEY;
if (!artifactPath || !privateKey || !/^0x[0-9a-f]{64}$/i.test(privateKey)) {
  throw new Error("Usage: PHASE_ZERO_LOCAL_PRIVATE_KEY=<ephemeral-local-key> npm run phase0:verify-safe-controller-local -- --artifact <RegistrarController.json> --source-revision <40-char-app-git-sha> --candidate-source-revision <40-char-candidate-git-sha> [--rpc http://127.0.0.1:18545] [--output <snapshot.json>]");
}
if (!/^[0-9a-f]{40}$/i.test(sourceRevision || "")) throw new Error("--source-revision must be a full 40-character Git commit.");
if (!/^[0-9a-f]{40}$/i.test(candidateSourceRevision || "")) throw new Error("--candidate-source-revision must be a full 40-character Git commit.");

const artifactBytes = await readFile(artifactPath);
const artifact = JSON.parse(artifactBytes.toString("utf8"));
if (!Array.isArray(artifact.abi) || !/^0x[0-9a-f]+$/i.test(artifact.bytecode || "")) throw new Error("Artifact must contain a Hardhat ABI and deployment bytecode.");

const publicClient = createPublicClient({ transport: http(rpcUrl) });
const chainId = await publicClient.getChainId();
if (chainId === HARMONY_CHAIN_ID) throw new Error("Refusing to run the local controller smoke test on Harmony Mainnet.");
if (chainId !== 31337) throw new Error("Local controller smoke test requires chain ID 31337.");

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({ account, transport: http(rpcUrl) });
const minimumCommitmentAgeSeconds = 60n;
const maximumCommitmentAgeSeconds = 3600n;
const baseNode = keccak256(stringToHex("country"));
const deploymentHash = await walletClient.deployContract({
  abi: artifact.abi,
  bytecode: artifact.bytecode,
  args: [
    account.address,
    account.address,
    minimumCommitmentAgeSeconds,
    maximumCommitmentAgeSeconds,
    account.address,
    account.address,
    baseNode,
    "country",
    account.address,
  ],
});
const deploymentReceipt = await localReceipt(publicClient, deploymentHash);
if (deploymentReceipt.status !== "success" || !deploymentReceipt.contractAddress) throw new Error("Local RegistrarController deployment failed.");
const controllerAddress = deploymentReceipt.contractAddress;

const [baseExtension, observedMinimum, observedMaximum, runtimeBytecode] = await Promise.all([
  publicClient.readContract({ address: controllerAddress, abi: artifact.abi, functionName: "baseExtension" }),
  publicClient.readContract({ address: controllerAddress, abi: artifact.abi, functionName: "minCommitmentAge" }),
  publicClient.readContract({ address: controllerAddress, abi: artifact.abi, functionName: "maxCommitmentAge" }),
  publicClient.getBytecode({ address: controllerAddress }),
]);
if (baseExtension !== "country" || observedMinimum !== minimumCommitmentAgeSeconds || observedMaximum !== maximumCommitmentAgeSeconds) {
  throw new Error("Local RegistrarController immutable values do not match the requested safe configuration.");
}

const commitment = await publicClient.readContract({
  address: controllerAddress,
  abi: artifact.abi,
  functionName: "makeCommitment",
  args: ["phase0safe", account.address, 365n * 24n * 60n * 60n, zeroHash, zeroAddress, [], false, 0, 0n],
});
const commitHash = await walletClient.writeContract({
  address: controllerAddress,
  abi: artifact.abi,
  functionName: "commit",
  args: [commitment],
});
const commitReceipt = await localReceipt(publicClient, commitHash);
if (commitReceipt.status !== "success") throw new Error("Local commitment transaction failed.");

const evidence = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: { chainId, rpcUrl: "local-ephemeral" },
  sourceRevision,
  artifact: {
    pathHint: artifactPath.split(/[\\/]/).slice(-4).join("/"),
    sha256: sha256(artifactBytes),
    candidateSourceRevision,
  },
  deployment: {
    controllerAddress,
    transactionHash: deploymentHash,
    runtimeBytecodeKeccak256: runtimeBytecode ? keccak256(runtimeBytecode) : null,
  },
  observed: {
    baseExtension,
    minimumCommitmentAgeSeconds: observedMinimum.toString(),
    maximumCommitmentAgeSeconds: observedMaximum.toString(),
    commitment,
    commitmentTransactionHash: commitHash,
  },
  approvalBoundary: "This proves only that the pinned candidate artifact can be deployed on an ephemeral local chain with a non-zero commitment window. It is not a Harmony deployment, permission migration, audit, or production approval.",
};
const output = { ...evidence, evidenceSha256: sha256Json(evidence) };
if (outputPath) await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(JSON.stringify(output, null, 2));
process.exit(0);
