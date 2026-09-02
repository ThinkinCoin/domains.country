import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { rawRpcClient, web3Sha3Hex } from "../api/_lib/evm-rpc.js";

const components = {
  RegistrarController: "registrarController",
  DC: "dc",
  EWS: "ews",
  BaseRegistrar: "baseRegistrar",
  TLDNameWrapper: "nameWrapper",
  PublicResolver: "publicResolver",
};

function canonicalAddress(value) {
  return String(value || "").toLowerCase();
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

function bytecodeFromExport(text, filename) {
  const bytecodes = text.match(/0x[0-9a-f]+/gi) || [];
  const bytecode = bytecodes.sort((left, right) => right.length - left.length)[0];
  if (!bytecode || bytecode.length < 4 || (bytecode.length - 2) % 2 !== 0) {
    throw new Error(`${filename} does not contain a complete hexadecimal bytecode value.`);
  }
  return bytecode;
}

const directoryFlag = process.argv.indexOf("--directory");
const directory = resolve(directoryFlag >= 0 ? process.argv[directoryFlag + 1] : "../tmp");
if (directoryFlag >= 0 && !process.argv[directoryFlag + 1]) throw new Error("--directory requires a path.");
const outputFlag = process.argv.indexOf("--output");
const outputPath = outputFlag >= 0 ? resolve(process.argv[outputFlag + 1] || "") : null;
if (outputFlag >= 0 && !process.argv[outputFlag + 1]) throw new Error("--output requires a path.");

const entries = new Set(await readdir(directory));
let failed = false;
const chainId = await rawRpcClient.getChainId();
const blockNumber = await rawRpcClient.getBlockNumber();
if (chainId !== HARMONY_CHAIN_ID) throw new Error(`Expected Harmony Mainnet chain ID ${HARMONY_CHAIN_ID}; received ${chainId}.`);
const contracts = [];
for (const [exportName, component] of Object.entries(components)) {
  const filename = `${exportName}.txt`;
  if (!entries.has(filename)) {
    console.error(`MISSING ${filename}`);
    failed = true;
    continue;
  }
  const fileBytes = await readFile(resolve(directory, filename));
  const text = fileBytes.toString("utf8");
  const exportedAddress = text.match(/0x[0-9a-f]{40}/i)?.[0];
  const expectedAddress = contractAddresses[component];
  const bytecode = bytecodeFromExport(text, filename);
  const exportedHash = await web3Sha3Hex(bytecode);
  const rpcBytecode = await rawRpcClient.getBytecode({ address: expectedAddress, blockNumber });
  const rpcHash = await web3Sha3Hex(rpcBytecode);
  const matches = canonicalAddress(exportedAddress) === canonicalAddress(expectedAddress)
    && exportedHash.toLowerCase() === rpcHash.toLowerCase();
  console.log(`${matches ? "MATCH" : "MISMATCH"} ${exportName} address=${exportedAddress || "missing"} hash=${exportedHash} rpcHash=${rpcHash}`);
  contracts.push({
    component,
    exportName,
    filename,
    exportedAddress: exportedAddress || null,
    expectedAddress,
    fileSha256: sha256(fileBytes),
    bytecodeSha256: sha256(bytecode),
    runtimeBytes: (bytecode.length - 2) / 2,
    exportedRuntimeKeccak256: exportedHash,
    rpcRuntimeKeccak256: rpcHash,
    match: matches,
  });
  if (!matches) failed = true;
}

const observation = {
  schemaVersion: 1,
  status: failed ? "MISMATCH" : "DISCOVERY_ONLY",
  observedAt: new Date().toISOString(),
  network: { name: "Harmony Mainnet", chainId, blockNumber: blockNumber.toString() },
  sourceDirectoryHint: directory.split(/[\\/]/).slice(-2).join("/"),
  contracts,
  approvalBoundary: "This proves that supplied local exports matched current RPC runtime bytecode at the observed block. It does not prove who exported the files, a compiler artifact, deployment authority, or technical approval.",
};
const snapshot = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) {
  await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`WROTE ${outputPath}`);
  console.log(`evidenceSha256=${snapshot.evidenceSha256}`);
}

if (failed) process.exitCode = 1;
