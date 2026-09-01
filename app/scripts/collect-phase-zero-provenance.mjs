import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { rawRpcClient, web3Sha3Hex } from "../api/_lib/evm-rpc.js";

const explorerApi = process.env.HARMONY_EXPLORER_API_URL || "https://explorer.harmony.one/api/v2";
const sourcifyRepository = process.env.SOURCIFY_REPOSITORY_URL || "https://repo.sourcify.dev/contracts";

async function getJson(path) {
  const response = await fetch(`${explorerApi}/${path}`, { signal: AbortSignal.timeout(15_000) });
  const payload = await response.json();
  if (!response.ok) throw new Error(`Explorer ${path} returned HTTP ${response.status}.`);
  return payload;
}

async function sourcifyMatch(address) {
  for (const matchType of ["full_match", "partial_match"]) {
    try {
      const response = await fetch(`${sourcifyRepository}/${matchType}/${HARMONY_CHAIN_ID}/${address}/metadata.json`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (response.ok) return { status: matchType.toUpperCase(), metadataUrl: response.url };
      if (response.status !== 404) return { status: "UNAVAILABLE", httpStatus: response.status, metadataUrl: response.url };
    } catch (error) {
      return { status: "UNAVAILABLE", error: error instanceof Error ? error.message : String(error) };
    }
  }
  return { status: "NOT_FOUND" };
}

function byteLength(bytecode) {
  return bytecode?.startsWith("0x") ? (bytecode.length - 2) / 2 : null;
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function collectContract(component, address) {
  const [account, contract, rpcRuntimeBytecode, sourcify] = await Promise.all([
    getJson(`addresses/${address}`),
    getJson(`smart-contracts/${address}`),
    rawRpcClient.getBytecode({ address }),
    sourcifyMatch(address),
  ]);
  const explorerRuntimeBytecode = contract.deployed_bytecode || null;
  const rpcRuntimeHash = rpcRuntimeBytecode && rpcRuntimeBytecode !== "0x" ? await web3Sha3Hex(rpcRuntimeBytecode) : null;
  const explorerRuntimeHash = explorerRuntimeBytecode && explorerRuntimeBytecode !== "0x" ? await web3Sha3Hex(explorerRuntimeBytecode) : null;
  const creationTransactionHash = account.creation_transaction_hash || account.creation_tx_hash || null;
  const creatorAddress = account.creator_address_hash || account.creator_address?.hash || null;
  const creationTransactionFieldPresent = Object.hasOwn(account, "creation_transaction_hash") || Object.hasOwn(account, "creation_tx_hash");
  const creatorAddressFieldPresent = Object.hasOwn(account, "creator_address_hash") || Object.hasOwn(account, "creator_address");
  return {
    component,
    address,
    explorerAddressRecordSha256: sha256Json(account),
    explorerSmartContractRecordSha256: sha256Json(contract),
    explorerIsContract: account.is_contract === true,
    sourceVerified: account.is_verified === true,
    contractName: account.name || contract.name || null,
    compilerVersion: contract.compiler_version || null,
    optimizationEnabled: contract.optimization_enabled ?? null,
    creationTransactionFieldPresent,
    creationTransactionHash,
    creatorAddressFieldPresent,
    creatorAddress,
    creationProvenanceStatus: creationTransactionHash && creatorAddress
      ? "EXPLORER_CREATION_LINK_AVAILABLE"
      : "EXPLORER_CREATION_LINK_MISSING",
    creationBytecodeBytes: byteLength(contract.creation_bytecode),
    creationBytecodeHash: contract.creation_bytecode ? await web3Sha3Hex(contract.creation_bytecode) : null,
    runtimeBytecodeBytes: byteLength(rpcRuntimeBytecode),
    rpcRuntimeHash,
    explorerRuntimeHash,
    explorerRuntimeMatchesRpc: Boolean(rpcRuntimeHash && explorerRuntimeHash && rpcRuntimeHash === explorerRuntimeHash),
    sourcify,
    evidenceStatus: account.is_verified === true && creationTransactionHash && rpcRuntimeHash === explorerRuntimeHash ? "CANDIDATE_FOR_REPRODUCTION" : "DISCOVERY_ONLY",
  };
}

const blockNumber = await rawRpcClient.getBlockNumber();
const contracts = [];
for (const [component, address] of Object.entries(contractAddresses)) contracts.push(await collectContract(component, address));

const snapshot = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  chainId: HARMONY_CHAIN_ID,
  blockNumber: blockNumber.toString(),
  explorerApi,
  sourcifyRepository,
  approvalWarning: "This snapshot is discovery evidence only. It must never approve a bytecode baseline without reproducible source artifacts and explicit technical review.",
  contracts,
};

await writeFile(new URL("../docs/phase-0-provenance-snapshot.json", import.meta.url), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Collected provenance for ${contracts.length} contracts at Harmony block ${blockNumber}.`);
for (const contract of contracts) console.log(`${contract.component}: ${contract.evidenceStatus}; verified=${contract.sourceVerified}; creationTx=${contract.creationTransactionHash || "unavailable"}`);
