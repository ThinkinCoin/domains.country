import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { contractAddresses } from "../api/_lib/config.js";
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

const entries = new Set(await readdir(directory));
let failed = false;
for (const [exportName, component] of Object.entries(components)) {
  const filename = `${exportName}.txt`;
  if (!entries.has(filename)) {
    console.error(`MISSING ${filename}`);
    failed = true;
    continue;
  }
  const text = await readFile(resolve(directory, filename), "utf8");
  const exportedAddress = text.match(/0x[0-9a-f]{40}/i)?.[0];
  const expectedAddress = contractAddresses[component];
  const bytecode = bytecodeFromExport(text, filename);
  const exportedHash = await web3Sha3Hex(bytecode);
  const rpcBytecode = await rawRpcClient.getBytecode({ address: expectedAddress });
  const rpcHash = await web3Sha3Hex(rpcBytecode);
  const matches = canonicalAddress(exportedAddress) === canonicalAddress(expectedAddress)
    && exportedHash.toLowerCase() === rpcHash.toLowerCase();
  console.log(`${matches ? "MATCH" : "MISMATCH"} ${exportName} address=${exportedAddress || "missing"} hash=${exportedHash} rpcHash=${rpcHash}`);
  if (!matches) failed = true;
}

if (failed) process.exitCode = 1;
