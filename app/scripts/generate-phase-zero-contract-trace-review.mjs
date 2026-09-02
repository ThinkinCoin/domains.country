import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { rawRpcClient, web3Sha3Hex } from "../api/_lib/evm-rpc.js";

const traceSnapshotPath = new URL("../docs/phase-0-creation-traces.json", import.meta.url);
const outputPath = new URL("../docs/phase-0-contract-trace-review-draft.json", import.meta.url);

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function byteLength(value) {
  const clean = strip0x(value);
  return clean ? clean.length / 2 : 0;
}

function sha256Hex(value) {
  const clean = strip0x(value);
  return clean ? createHash("sha256").update(Buffer.from(clean, "hex")).digest("hex") : null;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

const traceSnapshot = JSON.parse(await readFile(traceSnapshotPath, "utf8"));
if (traceSnapshot.schemaVersion !== 2) throw new Error(`Creation trace snapshot schema must be 2; got ${traceSnapshot.schemaVersion}.`);
if (traceSnapshot.network?.chainId !== HARMONY_CHAIN_ID) throw new Error(`Creation trace snapshot chain ID does not match ${HARMONY_CHAIN_ID}.`);

const expectedComponents = Object.keys(contractAddresses).sort();
const traceRecords = Object.fromEntries((traceSnapshot.records || []).map((record) => [record.component, record]));
if (JSON.stringify(Object.keys(traceRecords).sort()) !== JSON.stringify(expectedComponents)) throw new Error("Creation trace snapshot does not contain exactly the configured six components.");

const contracts = {};
for (const component of expectedComponents) {
  const traceRecord = traceRecords[component];
  const expectedAddress = contractAddresses[component].toLowerCase();
  if (traceRecord.address !== expectedAddress) throw new Error(`${component}: trace address does not match configured address.`);
  const trace = traceRecord.creationBlock?.transactions?.[0];
  if (!trace || traceRecord.creationBlock.transactions.length !== 1) throw new Error(`${component}: expected exactly one creation trace entry.`);
  const runtime = await rawRpcClient.getBytecode({ address: contractAddresses[component] });
  const runtimeBytes = byteLength(runtime);
  const runtimeSha256 = sha256Hex(runtime);
  const runtimeKeccak256 = runtimeBytes ? await web3Sha3Hex(runtime) : null;
  const traceOutputMatchesCurrentRuntime = runtimeBytes === trace.creationOutputBytes && runtimeSha256 === trace.creationOutputSha256;
  if (!traceOutputMatchesCurrentRuntime) throw new Error(`${component}: CREATE output does not match current runtime bytecode.`);
  contracts[component] = {
    address: contractAddresses[component],
    currentRuntime: {
      byteLength: runtimeBytes,
      sha256: runtimeSha256,
      keccak256: runtimeKeccak256,
    },
    creationTrace: {
      firstCodeBlock: traceRecord.firstCodeBlock,
      blockHash: traceRecord.creationBlock.blockHash,
      transactionHash: trace.hash,
      directCreation: trace.directCreation,
      createTracePath: trace.internalCreation?.path || [],
      creationInputBytes: trace.creationInputBytes,
      creationInputSha256: trace.creationInputSha256,
      creationOutputBytes: trace.creationOutputBytes,
      creationOutputSha256: trace.creationOutputSha256,
    },
    traceOutputMatchesCurrentRuntime,
  };
}

const draft = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: { name: "Harmony Mainnet", chainId: HARMONY_CHAIN_ID },
  traceSnapshot: {
    schemaVersion: traceSnapshot.schemaVersion,
    generatedAt: traceSnapshot.generatedAt,
    snapshotSha256: traceSnapshot.snapshotSha256,
  },
  approvalBoundary: "This draft proves trace-to-runtime consistency only. A named reviewer must still verify each compiled source/artifact, constructor decoding, and immutable evidence reference before a manifest baseline can be approved.",
  manifestInstructions: "For a baseline using deploymentTransaction, copy the matching creationTrace fields into source.deploymentTrace only after named review. The gate rejects unreviewed, incomplete, or transaction-mismatched trace records.",
  contracts,
};
const output = { ...draft, reviewDraftSha256: sha256Json(draft) };
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated contract trace review draft: ${outputPath.pathname}`);
console.log(`reviewDraftSha256=${output.reviewDraftSha256}`);
for (const [component, record] of Object.entries(output.contracts)) console.log(`MATCH ${component} ${record.creationTrace.transactionHash} runtime=${record.currentRuntime.keccak256}`);

