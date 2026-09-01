import { readFile, readdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const components = ["RegistrarController", "DC", "EWS", "BaseRegistrar", "TLDNameWrapper", "PublicResolver"];
const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let index = 0; index < digits.length; index += 1) {
      carry += digits[index] << 8;
      digits[index] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let encoded = "";
  for (const byte of bytes) {
    if (byte === 0) encoded += alphabet[0];
    else break;
  }
  for (let index = digits.length - 1; index >= 0; index -= 1) encoded += alphabet[digits[index]];
  return encoded;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function bytecodeFromExport(text, filename) {
  const bytecodes = text.match(/0x[0-9a-f]+/gi) || [];
  const bytecode = bytecodes.sort((left, right) => right.length - left.length)[0];
  if (!bytecode) throw new Error(`${filename} does not contain a hexadecimal bytecode value.`);
  return bytecode.toLowerCase();
}

function metadataFromBytecode(bytecode) {
  const hex = bytecode.replace(/^0x/i, "");
  const marker = "697066735822";
  const markerIndex = hex.lastIndexOf(marker);
  if (markerIndex === -1) return null;
  const multihashHex = hex.slice(markerIndex + marker.length, markerIndex + marker.length + 68);
  const solcTail = hex.slice(markerIndex + marker.length + 68);
  if (multihashHex.length !== 68) return null;
  return { cid: base58Encode(Buffer.from(multihashHex, "hex")), multihashHex, solcTail };
}

function solcVersionFromTail(solcTail) {
  const match = /^64736f6c6343([0-9a-f]{6})/i.exec(solcTail || "");
  if (!match) return null;
  const [major, minor, patch] = match[1].match(/../g).map((part) => Number.parseInt(part, 16));
  return `${major}.${minor}.${patch}`;
}

async function fetchMetadata(cid) {
  const gateways = [
    "https://ipfs.io/ipfs/",
    "https://cloudflare-ipfs.com/ipfs/",
    "https://gateway.pinata.cloud/ipfs/",
    "https://nftstorage.link/ipfs/",
    "https://w3s.link/ipfs/",
    "https://dweb.link/ipfs/",
  ];
  const errors = [];
  for (const gateway of gateways) {
    try {
      const response = await fetch(`${gateway}${cid}`, { signal: AbortSignal.timeout(8_000) });
      const text = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const metadata = JSON.parse(text);
      return { status: "FETCHED", gateway, rawSha256: sha256(text), metadata };
    } catch (error) {
      errors.push(`${gateway}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { status: "UNAVAILABLE", errors };
}

const directoryFlag = process.argv.indexOf("--directory");
const directory = resolve(directoryFlag >= 0 ? process.argv[directoryFlag + 1] : "../tmp");
if (directoryFlag >= 0 && !process.argv[directoryFlag + 1]) throw new Error("--directory requires a path.");

const entries = new Set(await readdir(directory));
const records = await Promise.all(components.map(async (component) => {
  const filename = `${component}.txt`;
  const filePath = resolve(directory, filename);
  if (!entries.has(filename)) {
    return { component, file: filePath, status: "MISSING" };
  }
  const text = await readFile(filePath, "utf8");
  const bytecode = bytecodeFromExport(text, filename);
  const metadataPointer = metadataFromBytecode(bytecode);
  const fetched = metadataPointer ? await fetchMetadata(metadataPointer.cid) : null;
  const metadata = fetched?.metadata || null;
  return {
    component,
    file: filePath,
    status: metadataPointer ? "METADATA_POINTER_FOUND" : "NO_METADATA_POINTER",
    fileSha256: sha256(text),
    bytecodeSha256: sha256(bytecode),
    runtimeBytes: (bytecode.length - 2) / 2,
    cid: metadataPointer?.cid || null,
    multihashHex: metadataPointer?.multihashHex || null,
    solcTail: metadataPointer?.solcTail || null,
    solcVersionFromBytecode: solcVersionFromTail(metadataPointer?.solcTail),
    metadataFetch: fetched ? {
      status: fetched.status,
      gateway: fetched.gateway || null,
      rawSha256: fetched.rawSha256 || null,
      compilerVersion: metadata?.compiler?.version || null,
      language: metadata?.language || null,
      optimizer: metadata?.settings?.optimizer || null,
      sourceCount: metadata?.sources ? Object.keys(metadata.sources).length : null,
      sourceKeys: metadata?.sources ? Object.keys(metadata.sources).slice(0, 12) : [],
      errors: fetched.errors || [],
    } : null,
  };
}));

const snapshot = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  status: "DISCOVERY_ONLY",
  approvalWarning: "Metadata CIDs extracted from runtime bytecode corroborate compiler/source discovery only. They are not deployment provenance or approval.",
  records,
};

await writeFile(new URL("../docs/phase-0-bytecode-metadata-cids.json", import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
for (const record of records) {
  console.log(`${record.component}: ${record.cid || record.status}; solc=${record.solcVersionFromBytecode || "unknown"}; metadata=${record.metadataFetch?.status || "not fetched"}`);
}
