import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { contractAddresses, HARMONY_CHAIN_ID, HARMONY_RPC_URL } from "../api/_lib/config.js";
import { dcValidationAbi } from "../api/_lib/phase-zero/abis.js";
import { rawRpcClient } from "../api/_lib/evm-rpc.js";

const initialConfiguration = Object.freeze({
  owner: null,
  registrarController: "0xaE4A0880cD682CDC138688C056929AD23718a94a",
  nameWrapper: "0x034A4ACe40dACaF40e5392bf55867d0228307bEB",
  baseRegistrar: "0xaC60e74e5906C60D96E2645387952e6a7DE224dc",
  resolver: "0x3Dc80D58903Bff9c0BBE893717cfC2d6a918b10C",
  reverseRecord: true,
  fuses: "0",
  wrapperExpiry: "18446744073709551615",
  duration: "7776000",
});

const initialConstructorArgumentsSha256 = "c80bf7f84d98890c730fb992a98838364c4a9d3b4090588aaf2d3fd37a19e9b4";

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalAddress(value) {
  return /^0x[0-9a-f]{40}$/i.test(value || "") ? value.toLowerCase() : value;
}

function canonicalValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string" && /^0x[0-9a-f]{40}$/i.test(value)) return canonicalAddress(value);
  return value;
}

async function read(functionName) {
  return canonicalValue(await rawRpcClient.readContract({
    address: contractAddresses.dc,
    abi: dcValidationAbi,
    functionName,
  }));
}

const blockNumber = await rawRpcClient.getBlockNumber();
const chainId = await rawRpcClient.getChainId();
if (chainId !== HARMONY_CHAIN_ID) {
  throw new Error("Expected Harmony Mainnet chain ID " + HARMONY_CHAIN_ID + ", received " + chainId + ".");
}

const activeConfiguration = {
  owner: await read("owner"),
  registrarController: await read("registrarController"),
  nameWrapper: await read("nameWrapper"),
  baseRegistrar: await read("baseRegistrar"),
  resolver: await read("resolver"),
  reverseRecord: await read("reverseRecord"),
  fuses: await read("fuses"),
  wrapperExpiry: await read("wrapperExpiry"),
  duration: await read("duration"),
};

const configuredAddresses = {
  registrarController: canonicalAddress(contractAddresses.registrarController),
  nameWrapper: canonicalAddress(contractAddresses.nameWrapper),
  baseRegistrar: canonicalAddress(contractAddresses.baseRegistrar),
  resolver: canonicalAddress(contractAddresses.publicResolver),
};

const fieldComparisons = Object.fromEntries(Object.keys(activeConfiguration).map((field) => [
  field,
  {
    initial: canonicalValue(initialConfiguration[field]),
    active: activeConfiguration[field],
    comparable: initialConfiguration[field] !== null,
    changed: initialConfiguration[field] === null ? null : canonicalValue(initialConfiguration[field]) !== activeConfiguration[field],
    matchesConfiguredAddress: configuredAddresses[field] === undefined ? null : activeConfiguration[field] === configuredAddresses[field],
  },
]));

const snapshot = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: { name: "Harmony Mainnet", chainId, expectedChainId: HARMONY_CHAIN_ID, rpc: HARMONY_RPC_URL },
  blockNumber: blockNumber.toString(),
  contract: { component: "DC", address: contractAddresses.dc },
  initialConstructorArgumentsSha256,
  initialConfiguration,
  activeConfiguration,
  configuredAddresses,
  fieldComparisons,
  approvalBoundary: "This snapshot proves the current read-only tuple only. Because DC setters are onlyOwner and emit no configuration events, approval still requires transaction traces or a signed owner/governance attestation for the changed fields.",
};

const output = { ...snapshot, snapshotSha256: sha256Json(snapshot) };
await writeFile(new URL("../docs/phase-0-dc-configuration-snapshot.json", import.meta.url), JSON.stringify(output, null, 2) + "\\n");

console.log("DC configuration snapshot: BLOCKED_PENDING_GOVERNANCE_EVIDENCE");
console.log("block=" + output.blockNumber);
console.log("snapshotSha256=" + output.snapshotSha256);
for (const [field, comparison] of Object.entries(fieldComparisons)) {
  console.log(field + ": initial=" + (comparison.initial ?? "n/a") + " active=" + comparison.active + " changed=" + comparison.changed);
}
