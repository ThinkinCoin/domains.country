import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";

const rpcUrl = process.env.HARMONY_ARCHIVE_RPC_URL || "https://a.api.s0.t.hmny.io";
const snapshotPath = new URL("../docs/phase-0-creation-traces.json", import.meta.url);
let rpcId = 0;

async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(`${method}: ${JSON.stringify(body.error || { status: response.status })}`);
  return body.result;
}

function hexBlock(number) {
  return `0x${Number(number).toString(16)}`;
}

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function byteLength(hex) {
  const clean = strip0x(hex);
  return clean ? clean.length / 2 : 0;
}

function sha256Hex(hex) {
  const clean = strip0x(hex);
  return clean ? createHash("sha256").update(Buffer.from(clean, "hex")).digest("hex") : null;
}

function flattenCalls(call, path = []) {
  if (!call) return [];
  const here = [{ ...call, calls: undefined, path }];
  return here.concat((call.calls || []).flatMap((child, index) => flattenCalls(child, path.concat(index))));
}

function creationCall(trace, address) {
  return flattenCalls(trace).find((call) => call.type?.toUpperCase() === "CREATE" && String(call.to || call.result?.address || "").toLowerCase() === address) || null;
}

function fail(message) {
  throw new Error(message);
}

const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
if (snapshot.network?.chainId !== HARMONY_CHAIN_ID) fail(`Snapshot chain ID ${snapshot.network?.chainId} does not match configured ${HARMONY_CHAIN_ID}.`);
if (snapshot.schemaVersion !== 2) fail(`Snapshot schemaVersion must be 2; got ${snapshot.schemaVersion}.`);

const expectedComponents = Object.keys(contractAddresses).sort();
const observedComponents = (snapshot.records || []).map((record) => record.component).sort();
if (JSON.stringify(expectedComponents) !== JSON.stringify(observedComponents)) fail("Snapshot records do not match the configured six contracts.");

for (const record of snapshot.records) {
  const configuredAddress = contractAddresses[record.component]?.toLowerCase();
  if (!configuredAddress) fail(`${record.component}: unknown component.`);
  if (record.address !== configuredAddress) fail(`${record.component}: address mismatch.`);
  const block = await rpc("eth_getBlockByNumber", [hexBlock(record.firstCodeBlock), true]);
  if (block.hash !== record.creationBlock?.blockHash) fail(`${record.component}: block hash mismatch at ${record.firstCodeBlock}.`);
  const txRecords = record.creationBlock?.transactions || [];
  if (txRecords.length !== 1) fail(`${record.component}: expected exactly one creation transaction candidate, got ${txRecords.length}.`);
  const txRecord = txRecords[0];
  const tx = (block.transactions || []).find((candidate) => candidate.hash === txRecord.hash);
  if (!tx) fail(`${record.component}: transaction ${txRecord.hash} not found in creation block.`);
  const receipt = await rpc("eth_getTransactionReceipt", [txRecord.hash]);
  if (receipt.status !== txRecord.status) fail(`${record.component}: receipt status mismatch.`);
  if ((txRecord.directContractAddress || null) !== (receipt.contractAddress || null)) fail(`${record.component}: direct contract address mismatch.`);
  const directCreation = String(receipt.contractAddress || "").toLowerCase() === configuredAddress;
  if (directCreation !== txRecord.directCreation) fail(`${record.component}: directCreation mismatch.`);
  const trace = await rpc("debug_traceTransaction", [txRecord.hash, { tracer: "callTracer" }]);
  const internalCreation = creationCall(trace, configuredAddress);
  const creationInput = directCreation ? tx.input : internalCreation?.input || null;
  const creationOutput = internalCreation?.output || null;
  const internalTo = internalCreation ? String(internalCreation.to || internalCreation.result?.address || "").toLowerCase() : null;
  if (internalTo !== configuredAddress) fail(`${record.component}: CREATE trace does not target configured address.`);
  if (txRecord.transactionInputSha256 !== sha256Hex(tx.input)) fail(`${record.component}: transaction input SHA-256 mismatch.`);
  if (txRecord.transactionInputBytes !== byteLength(tx.input)) fail(`${record.component}: transaction input byte length mismatch.`);
  if (txRecord.creationInputSha256 !== sha256Hex(creationInput)) fail(`${record.component}: creation input SHA-256 mismatch.`);
  if (txRecord.creationInputBytes !== byteLength(creationInput)) fail(`${record.component}: creation input byte length mismatch.`);
  if (txRecord.creationOutputSha256 !== sha256Hex(creationOutput)) fail(`${record.component}: creation output SHA-256 mismatch.`);
  if (txRecord.creationOutputBytes !== byteLength(creationOutput)) fail(`${record.component}: creation output byte length mismatch.`);
  console.log(`MATCH ${record.component} block=${record.firstCodeBlock} tx=${txRecord.hash} creationInputSha256=${txRecord.creationInputSha256}`);
}

console.log("Phase 0 creation trace snapshot verified against archive RPC.");
console.log("This verifies discovery evidence only; it does not approve contract baselines or enable writes.");
