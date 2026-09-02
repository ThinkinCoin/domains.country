import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";

const rpcUrl = process.env.HARMONY_ARCHIVE_RPC_URL || "https://a.api.s0.t.hmny.io";
const targetAddresses = Object.fromEntries(Object.entries(contractAddresses).map(([component, address]) => [component, address.toLowerCase()]));
let rpcId = 0;

async function rpc(method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  const body = await response.json();
  if (body.error) throw new Error(`${method}: ${JSON.stringify(body.error)}`);
  return body.result;
}

function hexBlock(number) {
  return `0x${number.toString(16)}`;
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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

async function hasCode(address, block) {
  const code = await rpc("eth_getCode", [address, hexBlock(block)]);
  return code && code !== "0x";
}

async function firstCodeBlock(component, address, latest) {
  let low = 0;
  let high = latest;
  if (!(await hasCode(address, high))) throw new Error(`${component} has no code at latest block ${latest}.`);
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    if (await hasCode(address, midpoint)) high = midpoint;
    else low = midpoint + 1;
  }
  return low;
}

function flattenCalls(call, path = []) {
  if (!call) return [];
  const here = [{ ...call, calls: undefined, path }];
  return here.concat((call.calls || []).flatMap((child, index) => flattenCalls(child, path.concat(index))));
}

function creationCall(trace, address) {
  return flattenCalls(trace).find((call) => call.type?.toUpperCase() === "CREATE" && String(call.to || call.result?.address || "").toLowerCase() === address) || null;
}

function creationInputFor(tx, directCreation, internalCreation) {
  return directCreation ? tx.input : internalCreation?.input || null;
}

async function blockSummary(blockNumber, wantedAddress) {
  const block = await rpc("eth_getBlockByNumber", [hexBlock(blockNumber), true]);
  const transactions = [];
  for (const tx of block.transactions || []) {
    const receipt = await rpc("eth_getTransactionReceipt", [tx.hash]);
    const directCreation = String(receipt.contractAddress || "").toLowerCase() === wantedAddress;
    const touchesWantedAddress = directCreation || (receipt.logs || []).some((log) => String(log.address || "").toLowerCase() === wantedAddress);
    if (!touchesWantedAddress) continue;
    let internalCreation = null;
    try {
      internalCreation = creationCall(await rpc("debug_traceTransaction", [tx.hash, { tracer: "callTracer" }]), wantedAddress);
    } catch (error) {
      internalCreation = { error: error instanceof Error ? error.message : String(error) };
    }
    const creationInput = creationInputFor(tx, directCreation, internalCreation);
    const creationOutput = internalCreation?.output || null;
    transactions.push({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      inputSelector: tx.input?.slice(0, 10) || "0x",
      transactionInputBytes: byteLength(tx.input),
      transactionInputSha256: sha256Hex(tx.input),
      status: receipt.status,
      directContractAddress: receipt.contractAddress || null,
      directCreation,
      creationInputBytes: byteLength(creationInput),
      creationInputSha256: sha256Hex(creationInput),
      creationOutputBytes: byteLength(creationOutput),
      creationOutputSha256: sha256Hex(creationOutput),
      logCount: receipt.logs?.length || 0,
      logAddresses: [...new Set((receipt.logs || []).map((log) => String(log.address || "").toLowerCase()))],
      internalCreation: internalCreation ? {
        type: internalCreation.type || null,
        from: internalCreation.from || internalCreation.action?.from || null,
        to: internalCreation.to || internalCreation.result?.address || null,
        inputBytes: byteLength(internalCreation.input),
        inputSha256: sha256Hex(internalCreation.input),
        outputBytes: byteLength(internalCreation.output),
        outputSha256: sha256Hex(internalCreation.output),
        gasUsed: internalCreation.gasUsed || internalCreation.result?.gasUsed || null,
        path: internalCreation.path || internalCreation.traceAddress || null,
        error: internalCreation.error || null,
      } : null,
    });
  }
  return {
    blockNumber,
    blockHash: block.hash,
    timestamp: Number.parseInt(block.timestamp, 16),
    transactionCount: block.transactions?.length || 0,
    transactions,
  };
}

const latest = Number(BigInt(await rpc("eth_blockNumber", [])));
const records = [];
for (const [component, address] of Object.entries(targetAddresses)) {
  const blockNumber = await firstCodeBlock(component, address, latest);
  records.push({
    component,
    address,
    firstCodeBlock: blockNumber,
    creationBlock: await blockSummary(blockNumber, address),
  });
}

const snapshot = {
  schemaVersion: 2,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: { name: "Harmony Mainnet", chainId: HARMONY_CHAIN_ID },
  archiveRpc: rpcUrl,
  latestBlockObserved: latest,
  warning: "This archive trace snapshot identifies first-code blocks and candidate creation transactions. It is not a named approval and does not enable writes.",
  records,
};
const output = { ...snapshot, snapshotSha256: sha256Json(snapshot) };

await writeFile(new URL("../docs/phase-0-creation-traces.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");
console.log("Collected Phase 0 creation trace snapshot.");
console.log(`snapshotSha256=${output.snapshotSha256}`);
for (const record of records) {
  const candidates = record.creationBlock.transactions.map((tx) => tx.hash).join(", ") || "none";
  console.log(`${record.component}: firstCodeBlock=${record.firstCodeBlock}; candidates=${candidates}`);
}
