import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { keccak256Hex } from "../api/_lib/keccak.js";

const rpcUrl = process.env.HARMONY_RPC_URL || "https://api.harmony.one";
const archiveRpcUrl = process.env.HARMONY_ARCHIVE_RPC_URL || "https://a.api.s0.t.hmny.io";
const dcAddress = contractAddresses.dc.toLowerCase();
const pageSize = Number.parseInt(process.env.PHASE0_DC_HISTORY_PAGE_SIZE || "1000", 10);
const maxPages = Number.parseInt(process.env.PHASE0_DC_HISTORY_MAX_PAGES || "20", 10);
const transitionStartBlock = Number.parseInt(process.env.PHASE0_DC_HISTORY_START_BLOCK || "39380534", 10);
const encoder = new TextEncoder();

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function textToHex(value) {
  return `0x${[...encoder.encode(value)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function selector(signature) {
  return keccak256Hex(textToHex(signature)).slice(0, 10).toLowerCase();
}

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function decodeAddressWord(word) {
  return `0x${strip0x(word).slice(24, 64)}`.toLowerCase();
}

function decodeUintWord(word) {
  return BigInt(`0x${strip0x(word) || "0"}`).toString();
}

function decodeBoolWord(word) {
  return BigInt(`0x${strip0x(word) || "0"}`) !== 0n;
}

const watchedCalls = [
  { signature: "setRegistrarController(address)", field: "registrarController", decode: decodeAddressWord },
  { signature: "setNameWrapper(address)", field: "nameWrapper", decode: decodeAddressWord },
  { signature: "setBaseRegistrar(address)", field: "baseRegistrar", decode: decodeAddressWord },
  { signature: "setResolver(address)", field: "resolver", decode: decodeAddressWord },
  { signature: "setDuration(uint256)", field: "duration", decode: decodeUintWord },
  { signature: "setReverseRecord(bool)", field: "reverseRecord", decode: decodeBoolWord },
  { signature: "setFuses(uint32)", field: "fuses", decode: decodeUintWord },
  { signature: "setWrapperExpiry(uint64)", field: "wrapperExpiry", decode: decodeUintWord },
  { signature: "transferOwnership(address)", field: "owner", decode: decodeAddressWord },
  { signature: "renounceOwnership()", field: "owner", decode: () => null },
];

const callsBySelector = new Map(watchedCalls.map((call) => [selector(call.signature), call]));
const configurationGetters = [
  { signature: "owner()", field: "owner", decode: decodeAddressWord },
  { signature: "registrarController()", field: "registrarController", decode: decodeAddressWord },
  { signature: "nameWrapper()", field: "nameWrapper", decode: decodeAddressWord },
  { signature: "baseRegistrar()", field: "baseRegistrar", decode: decodeAddressWord },
  { signature: "resolver()", field: "resolver", decode: decodeAddressWord },
  { signature: "duration()", field: "duration", decode: decodeUintWord },
];

async function rpc(url, method, params) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || `${method} failed`);
  return payload.result;
}

async function publicRpc(method, params) {
  return rpc(rpcUrl, method, params);
}

async function archiveRpc(method, params) {
  return rpc(archiveRpcUrl, method, params);
}

async function historyPage(pageIndex) {
  const result = await publicRpc("hmyv2_getTransactionsHistory", [{
    address: contractAddresses.dc,
    pageIndex,
    pageSize,
    fullTx: true,
    txType: "ALL",
    order: "ASC",
  }]);
  return result?.transactions || [];
}

async function receipt(hash) {
  try {
    return await publicRpc("eth_getTransactionReceipt", [hash]);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function blockTag(blockNumber) {
  return `0x${BigInt(blockNumber).toString(16)}`;
}

async function historicCall(data, blockNumber) {
  return archiveRpc("eth_call", [{ to: contractAddresses.dc, data }, blockTag(blockNumber)]);
}

async function latestBlockNumber() {
  return Number(BigInt(await archiveRpc("eth_blockNumber", [])));
}

async function firstBlockWithValue({ data, startBlock, endBlock, expectedValue }) {
  let low = startBlock;
  let high = endBlock;
  while (low < high) {
    const midpoint = Math.floor((low + high) / 2);
    const value = await historicCall(data, midpoint);
    if (String(value).toLowerCase() === String(expectedValue).toLowerCase()) high = midpoint;
    else low = midpoint + 1;
  }
  return low;
}

function flattenCalls(call, path = []) {
  if (!call) return [];
  return [{ ...call, calls: undefined, path }].concat((call.calls || []).flatMap((child, index) => flattenCalls(child, path.concat(index))));
}

async function traceBlockForDcSetters(blockNumber) {
  const block = await archiveRpc("eth_getBlockByNumber", [blockTag(blockNumber), true]);
  const ownerAtBlock = decodeAddressWord(await historicCall(selector("owner()"), blockNumber));
  const hits = [];
  for (const tx of block.transactions || []) {
    const txReceipt = await archiveRpc("eth_getTransactionReceipt", [tx.hash]);
    let trace = null;
    try {
      trace = await archiveRpc("debug_traceTransaction", [tx.hash, { tracer: "callTracer" }]);
    } catch (error) {
      hits.push({
        blockNumber,
        transactionHash: tx.hash,
        traceError: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    for (const call of flattenCalls(trace)) {
      const to = String(call.to || call.action?.to || "").toLowerCase();
      const input = String(call.input || call.action?.input || "").toLowerCase();
      const decoded = callsBySelector.get(input.slice(0, 10));
      if (to !== dcAddress || !decoded) continue;
      hits.push({
        blockNumber,
        transactionHash: tx.hash,
        transactionFrom: tx.from || null,
        transactionTo: tx.to || null,
        transactionReceiptStatus: txReceipt?.status || null,
        callFrom: call.from || call.action?.from || null,
        ownerAtBlock,
        authorizedCallFromMatchesOwner: String(call.from || call.action?.from || "").toLowerCase() === ownerAtBlock,
        path: call.path || null,
        signature: decoded.signature,
        field: decoded.field,
        decodedValue: decoded.decode(input.slice(10, 74)),
        input,
        error: call.error || null,
        revertReason: call.revertReason || null,
        effective: txReceipt?.status === "0x1" && !call.error,
      });
    }
  }
  return {
    blockNumber,
    blockHash: block.hash,
    transactionCount: block.transactions?.length || 0,
    ownerAtBlock,
    hits,
  };
}

function decodeWatchedCall(tx) {
  const input = String(tx.input || "0x").toLowerCase();
  const call = callsBySelector.get(input.slice(0, 10));
  if (!call) return null;
  const firstWord = input.slice(10, 74);
  return {
    signature: call.signature,
    field: call.field,
    decodedValue: call.decode(firstWord),
  };
}

const pages = [];
const matches = [];

for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
  const transactions = await historyPage(pageIndex);
  pages.push({
    pageIndex,
    transactionCount: transactions.length,
    firstBlock: transactions[0]?.blockNumber || null,
    lastBlock: transactions.at(-1)?.blockNumber || null,
  });
  for (const tx of transactions) {
    const decoded = decodeWatchedCall(tx);
    if (!decoded) continue;
    const transactionHash = tx.ethHash || tx.hash || null;
    const txReceipt = transactionHash ? await receipt(transactionHash) : null;
    matches.push({
      ...decoded,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      ethHash: tx.ethHash || null,
      harmonyHash: tx.hash || null,
      from: tx.from || null,
      to: tx.to || null,
      value: String(tx.value ?? "0"),
      receiptStatus: txReceipt?.status || null,
      effective: txReceipt?.status === "0x1",
      input: tx.input,
    });
  }
  if (transactions.length < pageSize) break;
}

const latestBlockObserved = await latestBlockNumber();
const transitions = [];

for (const getter of configurationGetters) {
  const data = selector(getter.signature);
  const initialRaw = await historicCall(data, transitionStartBlock);
  const activeRaw = await historicCall(data, latestBlockObserved);
  const changed = String(initialRaw).toLowerCase() !== String(activeRaw).toLowerCase();
  let firstActiveBlock = null;
  let previousBlockRawValue = null;
  let activeBlockRawValue = null;
  if (changed) {
    firstActiveBlock = await firstBlockWithValue({
      data,
      startBlock: transitionStartBlock,
      endBlock: latestBlockObserved,
      expectedValue: activeRaw,
    });
    previousBlockRawValue = await historicCall(data, firstActiveBlock - 1);
    activeBlockRawValue = await historicCall(data, firstActiveBlock);
  }
  transitions.push({
    field: getter.field,
    getter: getter.signature,
    getterSelector: data,
    initialBlock: transitionStartBlock,
    latestBlockObserved,
    initialRawValue: initialRaw,
    initialDecodedValue: getter.decode(initialRaw),
    activeRawValue: activeRaw,
    activeDecodedValue: getter.decode(activeRaw),
    changed,
    firstActiveBlock,
    previousBlock: firstActiveBlock ? firstActiveBlock - 1 : null,
    previousBlockRawValue,
    previousBlockDecodedValue: previousBlockRawValue ? getter.decode(previousBlockRawValue) : null,
    activeBlockRawValue,
    activeBlockDecodedValue: activeBlockRawValue ? getter.decode(activeBlockRawValue) : null,
  });
}

const transitionBlocks = [...new Set(transitions.map((transition) => transition.firstActiveBlock).filter(Boolean))];
const internalTraceBlocks = [];
for (const blockNumber of transitionBlocks) internalTraceBlocks.push(await traceBlockForDcSetters(blockNumber));

const snapshot = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: {
    name: "Harmony Mainnet",
    chainId: HARMONY_CHAIN_ID,
    rpc: rpcUrl,
    archiveRpc: archiveRpcUrl,
  },
  contract: {
    component: "DC",
    address: contractAddresses.dc,
  },
  method: "hmyv2_getTransactionsHistory",
  pagination: {
    pageSize,
    maxPages,
    pages,
    completeByShortPage: pages.at(-1)?.transactionCount < pageSize,
  },
  watchedSelectors: Object.fromEntries(watchedCalls.map((call) => [call.signature, selector(call.signature)])),
  directHistoryMatches: matches,
  directHistoryEffectiveMatches: matches.filter((match) => match.effective),
  directHistoryRevertedMatches: matches.filter((match) => match.receiptStatus === "0x0"),
  changedFieldsObservedInDirectHistory: [...new Set(matches.filter((match) => match.effective).map((match) => match.field))],
  transitions,
  internalTraceBlocks,
  changedFieldsObservedInTraces: [...new Set(internalTraceBlocks.flatMap((block) => block.hits.filter((hit) => hit.effective && hit.authorizedCallFromMatchesOwner).map((hit) => hit.field)))],
  approvalBoundary: "This read-only history scan combines direct Harmony transaction history, historical eth_call transition search, and debug_traceTransaction inspection for the exact transition blocks. It identifies the on-chain calls that changed the active DC tuple, but remains discovery evidence until a named technical/governance approver pins and approves it in the Phase 0 manifest.",
};

const output = { ...snapshot, snapshotSha256: sha256Json(snapshot) };
await writeFile(new URL("../docs/phase-0-dc-configuration-history-observation.json", import.meta.url), JSON.stringify(output, null, 2) + "\n");

console.log("Collected DC configuration-history observation.");
console.log(`pages=${pages.length}; transactions=${pages.reduce((sum, page) => sum + page.transactionCount, 0)}; matches=${matches.length}`);
console.log(`effectiveDirectHistoryMatches=${output.directHistoryEffectiveMatches.length}; revertedDirectHistoryMatches=${output.directHistoryRevertedMatches.length}`);
console.log(`transitionBlocks=${transitionBlocks.join(", ") || "none"}`);
console.log(`changedFieldsObservedInTraces=${output.changedFieldsObservedInTraces.join(", ") || "none"}`);
console.log(`snapshotSha256=${output.snapshotSha256}`);
