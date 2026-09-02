import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { rawRpcClient, web3Sha3Hex } from "../api/_lib/evm-rpc.js";
import { dcValidationAbi, nameWrapperValidationAbi, publicResolverValidationAbi } from "../api/_lib/phase-zero/abis.js";
import { dnsValidationFixtures } from "../api/_lib/phase-zero/dns-wire.js";
import { resolverImmutableAddresses } from "../api/_lib/phase-zero/index.js";
import { textToHex } from "../api/_lib/evm-rpc.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  return value;
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

async function ownerProbe(client, address, blockNumber) {
  try {
    const data = await client.call({ to: address, signature: "owner()", blockNumber });
    return { status: data && data !== "0x" ? "RESPONDED" : "EMPTY_RESPONSE", data: data || "0x" };
  } catch (error) {
    return { status: "REVERTED_OR_UNSUPPORTED", error: error.shortMessage || error.message || String(error) };
  }
}

async function namehash(name) {
  let node = `0x${"00".repeat(32)}`;
  const labels = String(name).replace(/\.$/, "").split(".").filter(Boolean);
  for (const label of labels.reverse()) {
    const labelHash = await web3Sha3Hex(textToHex(label));
    node = await web3Sha3Hex(`0x${node.slice(2)}${labelHash.slice(2)}`);
  }
  return node;
}

async function simulationProbe(client, { id, from, to, node, record, blockNumber }) {
  try {
    const result = await client.call({
      to,
      from,
      signature: "setDNSRecords(bytes32,bytes)",
      args: [node, record],
      blockNumber,
    });
    return { id, from, status: "ACCEPTED", result: result || "0x" };
  } catch (error) {
    return { id, from, status: "REVERTED", error: error.shortMessage || error.message || String(error) };
  }
}

async function senderControlProbe(client, blockNumber) {
  const owner = await client.readContract({ address: contractAddresses.dc, abi: dcValidationAbi, functionName: "owner", blockNumber });
  const attempts = await Promise.all([
    client.call({ to: contractAddresses.dc, from: owner, signature: "setDuration(uint256)", args: [2592000n], blockNumber })
      .then((result) => ({ id: "dc.owner.setDuration", from: owner, status: "ACCEPTED", result: result || "0x" }))
      .catch((error) => ({ id: "dc.owner.setDuration", from: owner, status: "REVERTED", error: error.shortMessage || error.message || String(error) })),
    client.call({ to: contractAddresses.dc, from: "0x000000000000000000000000000000000000dEaD", signature: "setDuration(uint256)", args: [2592000n], blockNumber })
      .then((result) => ({ id: "dc.external.setDuration", from: "0x000000000000000000000000000000000000dEaD", status: "ACCEPTED", result: result || "0x" }))
      .catch((error) => ({ id: "dc.external.setDuration", from: "0x000000000000000000000000000000000000dEaD", status: "REVERTED", error: error.shortMessage || error.message || String(error) })),
  ]);
  return {
    purpose: "Control probe proving that this RPC honors eth_call.from for a known owner-only mutator before interpreting resolver simulations.",
    dcOwner: owner,
    attempts,
    rpcHonorsFromForOwnerOnlyControl: attempts.some((item) => item.id === "dc.owner.setDuration" && item.status === "ACCEPTED") && attempts.some((item) => item.id === "dc.external.setDuration" && item.status === "REVERTED"),
  };
}

const outputPath = argument("--output");
const resolverAddress = String(argument("--resolver") || contractAddresses.publicResolver);
const client = rawRpcClient;
const chainId = await client.getChainId();
if (chainId !== HARMONY_CHAIN_ID) throw new Error(`Expected Harmony Mainnet chain ID ${HARMONY_CHAIN_ID}; received ${chainId}.`);
const blockNumber = await client.getBlockNumber();
const block = await client.getBlock({ blockNumber });

const runtime = await client.getBytecode({ address: resolverAddress, blockNumber });
if (!runtime || runtime === "0x") throw new Error("PublicResolver runtime bytecode is unavailable.");
const immutableAddresses = resolverImmutableAddresses(runtime);
if (!Object.values(immutableAddresses).every((address) => /^0x[0-9a-f]{40}$/i.test(address || ""))) {
  throw new Error("PublicResolver runtime did not expose the expected four immutable addresses.");
}
const trustedController = String(immutableAddresses.trustedController).toLowerCase();
const [owner, trustedControllerEnabled, activeControllerEnabled, dnsRecordProbe, hasDnsRecordsProbe] = await Promise.all([
  ownerProbe(client, resolverAddress, blockNumber),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [trustedController], blockNumber }),
  client.readContract({ address: contractAddresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [contractAddresses.registrarController], blockNumber }),
  client.readContract({ address: resolverAddress, abi: publicResolverValidationAbi, functionName: "dnsRecord", args: [`0x${"00".repeat(32)}`, `0x${"00".repeat(32)}`, 1], blockNumber }),
  client.readContract({ address: resolverAddress, abi: publicResolverValidationAbi, functionName: "hasDNSRecords", args: [`0x${"00".repeat(32)}`, `0x${"00".repeat(32)}`], blockNumber }),
]);
const activeRegistrarController = String(contractAddresses.registrarController).toLowerCase();
const ownerMediatedModel = trustedController !== activeRegistrarController;
const probeDomain = "phase0-probe.country";
const probeNode = await namehash(probeDomain);
const dnsFixture = dnsValidationFixtures(probeDomain).find((fixture) => fixture.label === "A");
const dnsFixtureHex = `0x${Buffer.from(dnsFixture.record).toString("hex")}`;
const authorizationCallProbes = await Promise.all([
  simulationProbe(client, { id: "trustedController.setDNSRecords", from: immutableAddresses.trustedController, to: resolverAddress, node: probeNode, record: dnsFixtureHex, blockNumber }),
  simulationProbe(client, { id: "activeRegistrarController.setDNSRecords", from: contractAddresses.registrarController, to: resolverAddress, node: probeNode, record: dnsFixtureHex, blockNumber }),
  simulationProbe(client, { id: "unauthorizedExternal.setDNSRecords", from: "0x000000000000000000000000000000000000dEaD", to: resolverAddress, node: probeNode, record: dnsFixtureHex, blockNumber }),
]);
const senderControl = await senderControlProbe(client, blockNumber);
const unsafeResolverSimulation = authorizationCallProbes.some((item) => item.id === "unauthorizedExternal.setDNSRecords" && item.status === "ACCEPTED");
const observation = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  observedAt: new Date().toISOString(),
  network: { chainId, rpc: "server-configured", blockNumber: blockNumber.toString(), blockHash: block.hash },
  resolverAddress,
  runtime: {
    keccak256: await web3Sha3Hex(runtime),
    immutableAddresses,
  },
  authorizationModel: {
    activeRegistrarController,
    trustedController,
    trustedControllerMatchesActiveRegistrar: !ownerMediatedModel,
    nameWrapperTrustedControllerEnabled: trustedController ? trustedControllerEnabled : null,
    nameWrapperActiveRegistrarControllerEnabled: activeControllerEnabled,
    requiredInitialRegistrationDnsDataPolicy: ownerMediatedModel ? "EMPTY_DATA_ONLY" : "TRUSTED_CONTROLLER_DATA_ALLOWED_IF_APPROVED",
    requiredPostTransferDnsAuthorizationPolicy: "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS",
    ownerFunctionRequired: false,
  },
  resolverInterfaceProbes: {
    dnsRecordReturnsBytes: typeof dnsRecordProbe === "string",
    hasDnsRecordsReturnsBoolean: typeof hasDnsRecordsProbe === "boolean",
    ownerProbe: owner,
  },
  authorizationCallProbes: {
    probeDomain,
    probeNode,
    recordType: dnsFixture.label,
    recordBytes: dnsFixture.record.length,
    ethCallOnly: true,
    senderControl,
    results: authorizationCallProbes,
    sourceDerivedPolicy: {
      trustedControllerCanSetDns: true,
      activeRegistrarControllerInitialRegistrationDataAllowed: !ownerMediatedModel,
      unauthorizedExternalCanSetDns: false,
    },
    interpretation: {
      status: unsafeResolverSimulation ? "INCONCLUSIVE_OR_UNSAFE" : "CONSISTENT_WITH_SOURCE_MODEL",
      note: unsafeResolverSimulation
        ? "The resolver mutation eth_call accepted an external sender even though the DC owner-only control proves this RPC honors from. Treat resolver mutation authorization as unapproved until the deployed artifact and authorization path are reproduced or explained."
        : "The resolver mutation eth_call outcomes are consistent with the source-derived authorization policy. Final approval still requires artifact provenance.",
    },
  },
  conclusion: ownerMediatedModel
    ? "The resolver trusts a controller different from the active RegistrarController. Initial registration DNS data must remain empty unless a compatibility path is approved; DNS writes after transfer must re-query on-chain authorization. owner() is not used as a gate prerequisite. Mutation authorization remains unapproved if external-sender simulations are accepted."
    : "The resolver trusted controller matches the active RegistrarController. The final authorization record still requires review and mandatory post-transfer on-chain authorization re-query.",
  approvalBoundary: "This confirms read-only runtime/interface observations only. It does not approve the resolver artifact, constructor arguments, authorization model, DNS writes, or production Phase 0 gate.",
};
const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
