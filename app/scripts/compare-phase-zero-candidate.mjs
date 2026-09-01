import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { contractAddresses } from "../api/_lib/config.js";
import { rawRpcClient, web3Sha3Hex } from "../api/_lib/evm-rpc.js";

const componentContracts = {
  registrarController: "RegistrarController",
  baseRegistrar: "TLDBaseRegistrarImplementation",
  nameWrapper: "TLDNameWrapper",
  publicResolver: "PublicResolver",
  dc: "DC",
  ews: "EWS",
};

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stripSolidityMetadata(bytecode) {
  const clean = strip0x(bytecode);
  if (clean.length < 4) return clean;
  const length = Number.parseInt(clean.slice(-4), 16) * 2;
  return Number.isFinite(length) && length + 4 <= clean.length ? clean.slice(0, clean.length - length - 4) : clean;
}

function maskImmutableReferences(bytecode, references = {}) {
  const bytes = strip0x(bytecode);
  const masked = bytes.split("");
  for (const locations of Object.values(references)) {
    for (const { start, length } of locations) {
      const offset = Number(start) * 2;
      const end = offset + Number(length) * 2;
      if (end > masked.length) return null;
      masked.fill("0", offset, end);
    }
  }
  return masked.join("");
}

async function fileExists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.name === ".git" || entry.name === "artifacts" || entry.name === "cache" || entry.name === "typechain-types") continue;
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && entry.name.endsWith(".sol")) files.push(full);
  }
  return files;
}

function readImport(root, importPath) {
  const nodePathRoots = (process.env.NODE_PATH || "").split(path.delimiter).filter(Boolean);
  const candidates = [
    path.join(root, importPath),
    path.join(root, "contracts", importPath),
    path.join(root, "node_modules", importPath),
    ...nodePathRoots.map((nodePathRoot) => path.join(nodePathRoot, importPath)),
  ];
  for (const candidate of candidates) if (existsSync(candidate)) return { contents: readFileSync(candidate, "utf8") };
  return { error: `Import not found: ${importPath}` };
}

async function compileCandidate({ sourceRoot, solcRoot, entries }) {
  const requireFromSolc = createRequire(path.join(solcRoot, "index.js"));
  const solc = requireFromSolc(path.join(solcRoot, "index.js"));
  const files = entries?.length ? entries.map((entry) => path.resolve(sourceRoot, entry)) : await walk(path.join(sourceRoot, "contracts"));
  const sources = Object.fromEntries(await Promise.all(files.map(async (file) => [path.relative(sourceRoot, file).replaceAll(path.sep, "/"), { content: await readFile(file, "utf8") }])));
  console.error(`Compiling ${Object.keys(sources).length} source entry file(s) with ${solc.version()}...`);
  const input = {
    language: "Solidity",
    sources,
    settings: {
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object", "evm.deployedBytecode.immutableReferences", "metadata"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input), { import: (importPath) => readImport(sourceRoot, importPath) }));
  const errors = (output.errors || []).filter((item) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  return { solcVersion: solc.version(), output };
}

function findCompiledContract(output, contractName) {
  for (const [sourceName, contracts] of Object.entries(output.contracts || {})) {
    if (contracts[contractName]) return { sourceName, contract: contracts[contractName] };
  }
  return null;
}

async function compareComponent(component, contractName, compiled, { offline = false } = {}) {
  const found = findCompiledContract(compiled.output, contractName);
  const address = contractAddresses[component];
  if (offline) {
    if (!found) return { component, contractName, address, status: "NOT_IN_CANDIDATE" };
    const compiledRuntime = found.contract.evm?.deployedBytecode?.object || "";
    const artifact = { contractName, sourceName: found.sourceName, abi: found.contract.abi, metadata: found.contract.metadata, evm: found.contract.evm };
    const compiledRuntimeHash = compiledRuntime ? await web3Sha3Hex(`0x${compiledRuntime}`) : null;
    const immutableReferences = found.contract.evm?.deployedBytecode?.immutableReferences || {};
    const compiledRuntimeBodyHash = compiledRuntime ? await web3Sha3Hex(`0x${stripSolidityMetadata(compiledRuntime)}`) : null;
    const compiledImmutableNormalizedHash = compiledRuntime ? await web3Sha3Hex(`0x${stripSolidityMetadata(maskImmutableReferences(compiledRuntime, immutableReferences) || "")}`) : null;
    return {
      component,
      contractName,
      sourceName: found.sourceName,
      address,
      status: "COMPILED_OFFLINE",
      compiledRuntimeBytes: compiledRuntime.length / 2,
      compiledRuntimeHash,
      compiledArtifactSha256: sha256Json(artifact),
      compiledAbiSha256: sha256Json(found.contract.abi || []),
      compiledMetadataSha256: sha256Json(JSON.parse(found.contract.metadata || "{}")),
      compiledRuntimeBodyHash,
      compiledImmutableNormalizedHash,
      immutableReferenceCount: Object.keys(immutableReferences).length,
    };
  }
  const chainRuntime = await rawRpcClient.getBytecode({ address });
  const chainRuntimeHash = chainRuntime && chainRuntime !== "0x" ? await web3Sha3Hex(chainRuntime) : null;
  const immutableReferences = found.contract.evm?.deployedBytecode?.immutableReferences || {};
  const chainRuntimeBodyHash = chainRuntimeHash ? await web3Sha3Hex(`0x${stripSolidityMetadata(chainRuntime)}`) : null;
  if (!found) return { component, contractName, address, status: "NOT_IN_CANDIDATE", chainRuntimeHash, chainRuntimeBodyHash };
  const compiledRuntime = found.contract.evm?.deployedBytecode?.object || "";
  const artifact = { contractName, sourceName: found.sourceName, abi: found.contract.abi, metadata: found.contract.metadata, evm: found.contract.evm };
  const compiledRuntimeHash = compiledRuntime ? await web3Sha3Hex(`0x${compiledRuntime}`) : null;
  const compiledRuntimeBodyHash = compiledRuntime ? await web3Sha3Hex(`0x${stripSolidityMetadata(compiledRuntime)}`) : null;
  const chainImmutableNormalized = maskImmutableReferences(chainRuntime, immutableReferences);
  const compiledImmutableNormalized = maskImmutableReferences(compiledRuntime, immutableReferences);
  const chainImmutableNormalizedHash = chainImmutableNormalized ? await web3Sha3Hex(`0x${stripSolidityMetadata(chainImmutableNormalized)}`) : null;
  const compiledImmutableNormalizedHash = compiledImmutableNormalized ? await web3Sha3Hex(`0x${stripSolidityMetadata(compiledImmutableNormalized)}`) : null;
  return {
    component,
    contractName,
    sourceName: found.sourceName,
    address,
    status: compiledRuntimeHash === chainRuntimeHash
      ? "EXACT_RUNTIME_MATCH"
      : compiledRuntimeBodyHash === chainRuntimeBodyHash
        ? "METADATA_STRIPPED_MATCH"
        : compiledImmutableNormalizedHash === chainImmutableNormalizedHash
          ? "IMMUTABLE_NORMALIZED_MATCH"
          : "NO_RUNTIME_MATCH",
    chainRuntimeBytes: (strip0x(chainRuntime).length / 2) || 0,
    compiledRuntimeBytes: compiledRuntime.length / 2,
    chainRuntimeHash,
    compiledRuntimeHash,
    compiledArtifactSha256: sha256Json(artifact),
    compiledAbiSha256: sha256Json(found.contract.abi || []),
    compiledMetadataSha256: sha256Json(JSON.parse(found.contract.metadata || "{}")),
    chainRuntimeBodyHash,
    compiledRuntimeBodyHash,
    chainImmutableNormalizedHash,
    compiledImmutableNormalizedHash,
    immutableReferenceCount: Object.keys(immutableReferences).length,
  };
}

const sourceRoot = argValue("--source-root");
const solcRoot = argValue("--solc-root");
const components = (argValue("--components") || Object.keys(componentContracts).join(",")).split(",").map((item) => item.trim()).filter(Boolean);
const entries = (argValue("--entries") || "").split(",").map((item) => item.trim()).filter(Boolean);
const offline = process.argv.includes("--offline");
if (!sourceRoot || !solcRoot) throw new Error("Usage: node scripts/compare-phase-zero-candidate.mjs --source-root <contract-root> --solc-root <unpacked-solc-package> [--components registrarController,baseRegistrar]");

const compiled = await compileCandidate({ sourceRoot, solcRoot, entries });
console.log(`Compiled ${sourceRoot} with solc ${compiled.solcVersion}.`);
for (const component of components) {
  const contractName = componentContracts[component];
  if (!contractName) throw new Error(`Unknown component: ${component}`);
  const result = await compareComponent(component, contractName, compiled, { offline });
  console.log(JSON.stringify(result));
}
