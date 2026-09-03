import { contractAddresses, HARMONY_CHAIN_ID, phaseZeroConfig } from "../config.js";
import { createHash } from "node:crypto";
import { Resolver, resolve4, resolve6 } from "node:dns/promises";
import { primeSelectors, rawRpcClient, selectorFor, textToHex, web3Sha3Hex } from "../evm-rpc.js";
import { baseRegistrarValidationAbi, dcValidationAbi, ewsCandidateAbi, nameWrapperValidationAbi, publicResolverValidationAbi, registrarControllerValidationAbi } from "./abis.js";
import { determinePhaseZeroDecision, PHASE_ZERO_STATUS } from "./decision.js";
import { dnsValidationFixtures } from "./dns-wire.js";
import { PHASE_ZERO_EVIDENCE_SCHEMA_VERSION } from "./evidence-manifest.js";
import { validateDnsDelegationEvidence } from "./dns-delegation-evidence.js";
import { validatePowerDnsRollbackEvidence } from "./powerdns-rollback-evidence.js";
import { validateContractBaselineEvidenceBundle } from "./contract-baseline-evidence.js";

export { determinePhaseZeroDecision, PHASE_ZERO_STATUS };
const PROBE_LABEL = "phase0validation";
const PROBE_OWNER = "0x000000000000000000000000000000000000dEaD";
const PROBE_RECIPIENT = "0x000000000000000000000000000000000000bEEF";
const ONE_YEAR = 365n * 24n * 60n * 60n;
const SAMPLE_SECRET = `0x${"01".repeat(32)}`;
const PROBE_TIMEOUT_MS = 10_000;

const selectorSignatures = {
  registrarController: ["base()", "baseExtension()", "available(string)", "rentPrice(string,uint256)", "minCommitmentAge()", "maxCommitmentAge()", "makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)", "commit(bytes32)", "register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)", "renew(string,uint256)"],
  dc: ["owner()", "paused()", "registrarController()", "nameWrapper()", "baseRegistrar()", "resolver()", "reverseRecord()", "fuses()", "wrapperExpiry()", "duration()"],
  baseRegistrar: ["owner()", "baseNode()", "GRACE_PERIOD()", "controllers(address)", "nameExpires(uint256)", "ownerOf(uint256)", "getApproved(uint256)", "isApprovedForAll(address,address)"],
  nameWrapper: ["owner()", "TLD_NODE()", "ownerOf(uint256)", "getData(uint256)", "getApproved(uint256)", "isApprovedForAll(address,address)", "controllers(address)", "canModifyName(bytes32,address)", "allFusesBurned(bytes32,uint32)", "transferFrom(address,address,uint256)", "setResolver(bytes32,address)", "setTTL(bytes32,uint64)"],
  publicResolver: ["supportsInterface(bytes4)", "dnsRecord(bytes32,bytes32,uint16)", "hasDNSRecords(bytes32,bytes32)", "setDNSRecords(bytes32,bytes)"],
  ews: ["dc()", "revenueAccount()", "landingPageFee()", "perAdditionalPageFee()", "perSubdomainFee()", "MAINTAINER_ROLE()", "DEFAULT_ADMIN_ROLE()", "hasRole(bytes32,address)", "getLandingPage(bytes32,bytes32)", "getSubdomains(bytes32)", "update(string,string,uint8,string,string[],bool)", "remove(string,string)", "restore(string,string,uint8)"],
};

const resolverImmutableOrder = ["trustedController", "trustedReverseRegistrar", "registryAddress", "nameWrapperAddress"];

function valueForJson(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(valueForJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, valueForJson(item)]));
  return value;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}

export function manifestIntegritySha256(manifest) {
  if (!manifest || typeof manifest !== "object") return null;
  const approval = manifest.approval ? { ...manifest.approval, evidenceSha256: null } : null;
  const normalized = canonicalJson({ ...manifest, approval });
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function deploymentTraceEvidenceSha256(trace) {
  if (!trace || typeof trace !== "object") return null;
  return createHash("sha256").update(JSON.stringify(canonicalJson({ ...trace, evidenceSha256: null }))).digest("hex");
}

export function deploymentArtifactEvidenceSha256(artifact) {
  if (!artifact || typeof artifact !== "object") return null;
  return createHash("sha256").update(JSON.stringify(canonicalJson({ ...artifact, evidenceSha256: null }))).digest("hex");
}

export function recordEvidenceSha256(record) {
  if (!record || typeof record !== "object") return null;
  return createHash("sha256").update(JSON.stringify(canonicalJson({ ...record, evidenceSha256: null }))).digest("hex");
}

function messageOf(error) {
  return error instanceof Error ? error.shortMessage || error.message : String(error);
}

function check(id, status, summary, evidence = {}, required = true) {
  return { id, status, required, summary, evidence: valueForJson(evidence) };
}

function clientPinnedToBlock(client, blockNumber) {
  return {
    getChainId: (...args) => client.getChainId(...args),
    getBlockNumber: (...args) => client.getBlockNumber(...args),
    getBytecode: (input) => client.getBytecode({ ...input, blockNumber }),
    call: (input) => client.call({ ...input, blockNumber }),
    readContract: (input) => client.readContract({ ...input, blockNumber }),
  };
}

async function withinTimeout(operation, label) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${PROBE_TIMEOUT_MS / 1000} seconds.`)), PROBE_TIMEOUT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function resolveNsOverHttps(name) {
  const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=NS`, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  const payload = await response.json();
  if (!response.ok || payload.Status !== 0) throw new Error(`DNS-over-HTTPS returned status ${payload.Status ?? response.status}.`);
  return (payload.Answer || []).filter((answer) => answer.type === 2).map((answer) => answer.data);
}

function normalizedNameservers(values) {
  return [...new Set((values || []).map((value) => String(value).replace(/\.$/, "").toLowerCase()))].sort();
}

async function nameserverAddresses(hostname) {
  const [ipv4, ipv6] = await Promise.all([
    resolve4(hostname).catch(() => []),
    resolve6(hostname).catch(() => []),
  ]);
  const addresses = [...ipv4, ...ipv6];
  if (!addresses.length) throw new Error(`No A or AAAA address was found for ${hostname}.`);
  return addresses;
}

async function resolverForNameserver(hostname) {
  const resolver = new Resolver();
  resolver.setServers(await nameserverAddresses(hostname));
  return resolver;
}

/**
 * Queries the parent and project authoritative servers directly. A public
 * recursive NS response is useful, but it cannot prove every authoritative
 * server has the same delegation/zone state.
 */
export async function verifyAuthoritativeDelegation(probeDomain, parentNameservers, projectNameservers) {
  const expected = normalizedNameservers(projectNameservers);
  const parentResults = await Promise.all(normalizedNameservers(parentNameservers).map(async (nameserver) => {
    const resolver = await resolverForNameserver(nameserver);
    return { nameserver, delegated: normalizedNameservers(await resolver.resolveNs(probeDomain)) };
  }));
  const projectResults = await Promise.all(expected.map(async (nameserver) => {
    const resolver = await resolverForNameserver(nameserver);
    return { nameserver, soa: await resolver.resolveSoa(probeDomain) };
  }));
  return { expected, parentResults, projectResults };
}

function pass(id, summary, evidence, required = true) {
  return check(id, PHASE_ZERO_STATUS.PASS, summary, evidence, required);
}

function fail(id, summary, evidence, required = true) {
  return check(id, PHASE_ZERO_STATUS.FAIL, summary, evidence, required);
}

function warn(id, summary, evidence, required = false) {
  return check(id, PHASE_ZERO_STATUS.WARN, summary, evidence, required);
}

async function readCheck(client, { id, address, abi, functionName, args = [], validate = () => true, required = true }) {
  try {
    const value = await withinTimeout(client.readContract({ address, abi, functionName, args }), `${id} RPC probe`);
    return validate(value)
      ? pass(id, `${functionName} returned a value matching the expected ABI.`, { address, value }, required)
      : fail(id, `${functionName} returned a value that violates the expected invariant.`, { address, value }, required);
  } catch (error) {
    return fail(id, `${functionName} could not be decoded through the expected ABI.`, { address, error: messageOf(error) }, required);
  }
}

function isEvmPreconditionRevert(error) {
  return /(?:execution reverted|reverted|revert|commitment|unexpired|not available)/i.test(messageOf(error));
}

async function requiredNoStateSimulation(client, { id, address, abi, functionName, args, value = 0n, acceptedSummary, revertedSummary, failedSummary, timeoutLabel }) {
  try {
    const abiItem = abi.find((item) => item.type === "function" && item.name === functionName);
    const signature = `${abiItem.name}(${abiItem.inputs.map((input) => input.type).join(",")})`;
    await withinTimeout(client.call({ to: address, signature, args, value }), timeoutLabel || `${id} simulation`);
    return pass(id, acceptedSummary, { address, functionName, simulated: true, outcome: "accepted" });
  } catch (error) {
    const message = messageOf(error);
    if (isEvmPreconditionRevert(error)) {
      return pass(id, revertedSummary, { address, functionName, simulated: true, outcome: "expected_revert", error: message });
    }
    return fail(id, failedSummary, { address, functionName, simulated: true, error: message });
  }
}

/**
 * `register` cannot have a positive stateful preflight on Mainnet: doing so
 * would require a real commitment. We nevertheless require a successful
 * payload simulation or an EVM-level precondition revert. Transport, ABI, and
 * encoding failures are not evidence that the deployed register path works.
 */
async function registerPreconditionSimulation(client, { address, abi, args, value = 0n }) {
  return requiredNoStateSimulation(client, {
    id: "registrarController.register.preconditions",
    address,
    abi,
    functionName: "register",
    args,
    value,
    timeoutLabel: "registrarController.register.preconditions simulation",
    acceptedSummary: "register payload completed an eth_call without persisting state; no transaction was sent.",
    revertedSummary: "register payload reached the deployed contract and reverted on a state precondition; no transaction was sent.",
    failedSummary: "register could not be simulated due to an RPC, ABI, or payload-encoding failure.",
  });
}

async function registrarWritePreconditionSimulation(client, { id, address, abi, functionName, args, value = 0n }) {
  return requiredNoStateSimulation(client, {
    id,
    address,
    abi,
    functionName,
    args,
    value,
    acceptedSummary: `${functionName} payload completed an eth_call without persisting registrar state; no transaction was sent.`,
    revertedSummary: `${functionName} payload reached the deployed RegistrarController and reverted on a state precondition; no transaction was sent.`,
    failedSummary: `${functionName} could not be simulated due to an RPC, ABI, or payload-encoding failure.`,
  });
}

/**
 * Resolver writes need the same no-state proof as registration: a completed
 * eth_call or an EVM authorization/state revert proves that the exact payload
 * reached the deployed resolver. Network and encoding faults must not be
 * downgraded to an informational warning.
 */
async function resolverWritePreconditionSimulation(client, { id, address, abi, functionName, args, value = 0n }) {
  return requiredNoStateSimulation(client, {
    id,
    address,
    abi,
    functionName,
    args,
    value,
    acceptedSummary: `${functionName} payload completed an eth_call without persisting DNS state; no transaction was sent.`,
    revertedSummary: `${functionName} payload reached the deployed resolver and reverted on authorization or state; no transaction was sent.`,
    failedSummary: `${functionName} could not be simulated due to an RPC, ABI, or DNS-payload encoding failure.`,
  });
}

async function nameWrapperWritePreconditionSimulation(client, { id, address, abi, functionName, args }) {
  return requiredNoStateSimulation(client, {
    id,
    address,
    abi,
    functionName,
    args,
    acceptedSummary: `${functionName} payload completed an eth_call without transferring ownership or changing wrapper state; no transaction was sent.`,
    revertedSummary: `${functionName} payload reached the deployed wrapper and reverted on ownership, fuse, or authorization state; no transaction was sent.`,
    failedSummary: `${functionName} could not be simulated due to an RPC, ABI, or ownership-payload encoding failure.`,
  });
}

async function selectedSelectors(component) {
  return Object.fromEntries(await Promise.all(selectorSignatures[component].map(async (signature) => [signature, `0x${await selectorFor(signature)}`])));
}

function canonicalAddress(value) {
  return /^0x[0-9a-f]{40}$/i.test(value || "") ? value.toLowerCase() : null;
}

function isAddress(value) {
  return canonicalAddress(value) !== null;
}

function getAddress(value) {
  return canonicalAddress(value);
}

function embeddedAddressCandidates(bytecode) {
  const hex = (bytecode || "").replace(/^0x/i, "").toLowerCase();
  const candidates = [];
  for (let index = 0; index < hex.length / 2;) {
    const opcode = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    if (opcode >= 0x60 && opcode <= 0x7f) {
      const length = opcode - 0x5f;
      const data = hex.slice((index + 1) * 2, (index + 1 + length) * 2);
      if (length === 20) candidates.push(`0x${data}`);
      if (length === 32 && /^0{24}[0-9a-f]{40}$/.test(data)) candidates.push(`0x${data.slice(24)}`);
      index += length + 1;
    } else {
      index += 1;
    }
  }
  return candidates;
}

export function resolverImmutableAddresses(bytecode) {
  const seen = [];
  for (const address of embeddedAddressCandidates(bytecode)) {
    if (!seen.includes(address)) seen.push(address);
  }
  return Object.fromEntries(resolverImmutableOrder.map((field, index) => [field, seen[index] || null]));
}

function isValidEvidenceTimestamp(value, now) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp) && timestamp <= now.getTime();
}

function isDurableReference(value) {
  if (typeof value !== "string" || value.length < 8 || /[<>]/.test(value)) return false;
  if (/^0x[0-9a-f]{64}$/i.test(value)) return true;
  if (/^ipfs:\/\/[^/]+(?:\/.*)?$/i.test(value)) return true;
  if (/^git:[0-9a-f]{40}(?::.+)?$/i.test(value)) return true;
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[0-9a-f]{40}(?:\/.*)?$/i.test(value);
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(value || "");
}

function isDecimal(value) {
  return /^\d+$/.test(String(value || ""));
}

function isDnsName(value) {
  return /^(?=.{1,253}\.?$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\.?$/i.test(value || "");
}

function isTransactionHash(value) {
  return /^0x[0-9a-f]{64}$/i.test(value || "");
}

function hasVerifiedDeploymentTrace(trace, deploymentTransaction, now) {
  return trace?.status === "VERIFIED"
    && isTransactionHash(trace.transactionHash)
    && trace.transactionHash.toLowerCase() === String(deploymentTransaction || "").toLowerCase()
    && Number.isSafeInteger(trace.firstCodeBlock)
    && trace.firstCodeBlock > 0
    && isTransactionHash(trace.blockHash)
    && typeof trace.directCreation === "boolean"
    && Array.isArray(trace.createTracePath)
    && trace.createTracePath.every((item) => Number.isSafeInteger(item) && item >= 0)
    && Number.isSafeInteger(trace.creationInputBytes)
    && trace.creationInputBytes > 0
    && isSha256(trace.creationInputSha256)
    && Number.isSafeInteger(trace.creationOutputBytes)
    && trace.creationOutputBytes > 0
    && isSha256(trace.creationOutputSha256)
    && Boolean(trace.verifiedBy)
    && isValidEvidenceTimestamp(trace.verifiedAt, now)
    && isDurableReference(trace.reference)
    && isSha256(trace.evidenceSha256)
    && trace.evidenceSha256 === deploymentTraceEvidenceSha256(trace);
}

function hasVerifiedDeploymentArtifact(artifact, now) {
  return artifact?.status === "VERIFIED"
    && artifact.type === "EXPLORER_CREATION_BYTECODE"
    && isTransactionHash(artifact.explorerCreationBytecodeHash)
    && isSha256(artifact.compiledCreationArtifactSha256)
    && artifact.metadataStrippedPrefixMatch === true
    && Number.isSafeInteger(artifact.inferredConstructorArgumentsBytes)
    && artifact.inferredConstructorArgumentsBytes >= 0
    && isSha256(artifact.constructorArgumentsSha256)
    && isDurableReference(artifact.decodedConstructorArgumentsReference)
    && Boolean(artifact.verifiedBy)
    && isValidEvidenceTimestamp(artifact.verifiedAt, now)
    && isDurableReference(artifact.reference)
    && isSha256(artifact.evidenceSha256)
    && artifact.evidenceSha256 === deploymentArtifactEvidenceSha256(artifact);
}

function hasApprovalFields(record, now) {
  return record?.status === "APPROVED"
    && Boolean(record.approvedBy)
    && isValidEvidenceTimestamp(record.approvedAt, now)
    && isDurableReference(record.reference)
    && isSha256(record.evidenceSha256);
}

function hasRecordedApproval(record, now) {
  return hasApprovalFields(record, now)
    && record.evidenceSha256 === recordEvidenceSha256(record);
}

function hasCanonicalRecordEvidence(record) {
  return isSha256(record?.evidenceSha256)
    && record.evidenceSha256 === recordEvidenceSha256(record);
}

function hasVerifiedSource(source, now) {
  const hasTraceBackedTransaction = isTransactionHash(source?.deploymentTransaction)
    && hasVerifiedDeploymentTrace(source.deploymentTrace, source.deploymentTransaction, now);
  return source?.status === "VERIFIED"
    && isDurableReference(source.artifact)
    && isSha256(source.artifactSha256)
    && (hasTraceBackedTransaction || hasVerifiedDeploymentArtifact(source.deploymentArtifact, now))
    && Boolean(source.verifiedBy)
    && isValidEvidenceTimestamp(source.verifiedAt, now)
    && isDurableReference(source.reference);
}

function manifestCheck(manifest) {
  if (!manifest || manifest.schemaVersion !== PHASE_ZERO_EVIDENCE_SCHEMA_VERSION) {
    return fail("evidence.manifest.schema", "The Phase 0 evidence manifest is missing or has an unsupported schema version.", {
      expectedSchemaVersion: PHASE_ZERO_EVIDENCE_SCHEMA_VERSION,
      actualSchemaVersion: manifest?.schemaVersion ?? null,
    });
  }
  if (!manifest.revision) return fail("evidence.manifest.schema", "The Phase 0 evidence manifest has no versioned revision.", { revision: null });
  return pass("evidence.manifest.schema", "The Phase 0 evidence manifest has a supported schema and versioned revision.", { revision: manifest.revision, status: manifest.status });
}

function manifestApprovalCheck(manifest, now) {
  return manifest?.status === "APPROVED" && hasApprovalFields(manifest.approval, now) && /^[0-9a-f]{40}$/i.test(manifest.approval.sourceRevision || "")
    ? pass("evidence.manifest.approval", "The versioned Phase 0 evidence manifest has an explicit top-level approval.", { revision: manifest.revision, approval: manifest.approval })
    : fail("evidence.manifest.approval", "The versioned Phase 0 evidence manifest has no explicit top-level approval.", { revision: manifest?.revision || null, status: manifest?.status || null, approval: manifest?.approval || null });
}

function evidenceIndexCheck(manifest) {
  const record = manifest?.evidenceIndex;
  const deploymentRevision = manifest?.deployment?.sourceRevision?.toLowerCase() || null;
  const expectedReference = deploymentRevision ? `git:${deploymentRevision}:app/docs/phase-0-evidence-index.json` : null;
  const valid = manifest?.status === "APPROVED"
    && record?.status === "VERIFIED"
    && record?.schemaVersion === 1
    && isSha256(record.sha256)
    && /^[0-9a-f]{40}$/i.test(record.sourceRevision || "")
    && record.sourceRevision.toLowerCase() === deploymentRevision
    && record.reference === expectedReference;
  return valid
    ? pass("evidence.index", "The Phase 0 evidence index is versioned, digest-bound, and pinned to the deployed source revision.", {
      schemaVersion: record.schemaVersion,
      sha256: record.sha256,
      sourceRevision: record.sourceRevision,
      reference: record.reference,
    })
    : fail("evidence.index", "The approved manifest must pin a verified Phase 0 evidence index to the exact deployed Git revision.", {
      record: record || null,
      deploymentRevision,
      expectedReference,
    });
}

function manifestSourceRevisionCheck(manifest) {
  const approvalRevision = manifest?.approval?.sourceRevision?.toLowerCase() || null;
  const deploymentRevision = manifest?.deployment?.sourceRevision?.toLowerCase() || null;
  return approvalRevision && deploymentRevision && approvalRevision === deploymentRevision
    ? pass("evidence.manifest.sourceRevision", "The top-level approval is bound to the exact source revision recorded for Vercel deployment.", { sourceRevision: approvalRevision })
    : fail("evidence.manifest.sourceRevision", "The top-level approval must name the same full Git source revision recorded for Vercel deployment.", { approvalSourceRevision: approvalRevision, deploymentSourceRevision: deploymentRevision });
}

function manifestIntegrityCheck(manifest) {
  const calculatedSha256 = manifestIntegritySha256(manifest);
  const recordedSha256 = manifest?.approval?.evidenceSha256 || null;
  return manifest?.status === "APPROVED" && manifest?.approval?.status === "APPROVED" && isSha256(recordedSha256) && recordedSha256 === calculatedSha256
    ? pass("evidence.manifest.integrity", "The top-level approval digest matches the canonical versioned manifest payload.", { revision: manifest.revision, calculatedSha256, recordedSha256 })
    : fail("evidence.manifest.integrity", "The top-level approval digest is missing or does not match the canonical versioned manifest payload.", { revision: manifest?.revision || null, calculatedSha256, recordedSha256 });
}

function commitmentPolicyAccepted(policy, addresses, minimum, maximum, now) {
  const common = policy?.status === "APPROVED"
    && getAddress(policy.controllerAddress) === getAddress(addresses.registrarController)
    && BigInt(policy.minimumCommitmentAgeSeconds ?? -1) === minimum
    && BigInt(policy.maximumCommitmentAgeSeconds ?? -1) === maximum
    && maximum > minimum
    && Boolean(policy.approvedBy)
    && isValidEvidenceTimestamp(policy.approvedAt, now)
    && isDurableReference(policy.decisionReference)
    && hasCanonicalRecordEvidence(policy);

  if (!common) return false;
  if (policy.mode === "NON_ZERO_MINIMUM") {
    return minimum > 0n && isDurableReference(policy.deploymentReference);
  }
  if (policy.mode === "EXISTING_DEPLOYED_0_TO_120_ACCEPTED") {
    return minimum === 0n
      && maximum === 120n
      && policy.riskAccepted === true
      && policy.deploymentReference === "existing-deployed-controller"
      && Array.isArray(policy.controls)
      && policy.controls.includes("browser-local-commitment-secret")
      && policy.controls.includes("explicit-user-risk-copy")
      && policy.controls.includes("future-controller-replacement-tracked");
  }
  return false;
}

function approvedManifestDecision(record, validDecisions = [], now) {
  return record?.status === "APPROVED"
    && validDecisions.includes(record.decision)
    && isDurableReference(record.reference)
    && isValidEvidenceTimestamp(record.reviewedAt, now)
    && Boolean(record.reviewedBy)
    && hasCanonicalRecordEvidence(record);
}

function hasExpectedDcConfiguration(configuration) {
  return configuration
    && [configuration.registrarController, configuration.nameWrapper, configuration.baseRegistrar, configuration.resolver, configuration.owner].every(isAddress)
    && typeof configuration.reverseRecord === "boolean"
    && [configuration.fuses, configuration.wrapperExpiry, configuration.duration].every((value) => /^\d+$/.test(String(value)));
}

function canonicalDcConfiguration(values) {
  return {
    owner: canonicalAddress(values.owner),
    registrarController: canonicalAddress(values.registrarController),
    nameWrapper: canonicalAddress(values.nameWrapper),
    baseRegistrar: canonicalAddress(values.baseRegistrar),
    resolver: canonicalAddress(values.resolver),
    reverseRecord: values.reverseRecord,
    fuses: String(values.fuses),
    wrapperExpiry: String(values.wrapperExpiry),
    duration: String(values.duration),
  };
}

function sameDcConfiguration(left, right) {
  return left && right && Object.keys(left).every((field) => left[field] === right[field]);
}

function hasVerifiedDcConfigurationHistory(record, liveConfiguration, now) {
  if (!(record?.status === "VERIFIED"
    && isSha256(record.initialConstructorArgumentsSha256)
    && hasExpectedDcConfiguration(record.initialConfiguration)
    && hasExpectedDcConfiguration(record.activeConfiguration)
    && typeof record.changeControlMethod === "string" && record.changeControlMethod.length >= 8
    && isSha256(record.changeControlEvidenceSha256)
    && Boolean(record.verifiedBy)
    && isValidEvidenceTimestamp(record.verifiedAt, now)
    && isDurableReference(record.reference)
    && hasCanonicalRecordEvidence(record))) return false;
  const initial = canonicalDcConfiguration(record.initialConfiguration);
  const approvedActive = canonicalDcConfiguration(record.activeConfiguration);
  return !sameDcConfiguration(initial, approvedActive) && sameDcConfiguration(approvedActive, liveConfiguration);
}

async function tokenIdFor(label) {
  return BigInt(await web3Sha3Hex(textToHex(label)));
}

async function wrappedNodeFor(label, tldNode) {
  const labelHash = await web3Sha3Hex(textToHex(label));
  return BigInt(await web3Sha3Hex(`0x${tldNode.slice(2)}${labelHash.slice(2)}`));
}

async function domainNode(name) {
  let node = `0x${"0".repeat(64)}`;
  for (const label of name.replace(/\.$/, "").split(".").filter(Boolean).reverse()) {
    const labelHash = await web3Sha3Hex(textToHex(label));
    node = await web3Sha3Hex(`0x${node.slice(2)}${labelHash.slice(2)}`);
  }
  return node;
}

function expectedHashCheck(component, address, observedHash, manifest, contractBaselineEvidence, now) {
  const evidence = manifest?.contracts?.[component];
  const bundleValidation = validateContractBaselineEvidenceBundle(contractBaselineEvidence, manifest, now);
  const expectedHash = evidence?.approvedBytecodeHash?.toLowerCase() || null;
  const bundleEntry = contractBaselineEvidence?.contracts?.[component] || null;
  const baseEvidence = { manifestRevision: manifest?.revision || null, address, observedHash, expectedHash, contractBaselineEvidence: { status: contractBaselineEvidence?.status || null, valid: bundleValidation.valid, entry: bundleEntry } };
  if (!evidence) return fail(`bytecode.${component}.baseline`, "The versioned evidence manifest has no entry for this contract.", baseEvidence);
  if (getAddress(evidence.address) !== getAddress(address)) return fail(`bytecode.${component}.baseline`, "The manifest contract address differs from the configured deployment address.", { ...baseEvidence, manifestAddress: evidence.address });
  if (!bundleValidation.valid) return fail(`bytecode.${component}.baseline`, "The six-contract baseline bundle is missing, invalid, or not pinned to the deployed source revision.", { ...baseEvidence, bundleErrors: bundleValidation.errors });
  if (!hasVerifiedSource(evidence.source, now)) return fail(`bytecode.${component}.baseline`, "The contract source artifact and deployment provenance are not verified in the versioned manifest.", { ...baseEvidence, source: evidence.source });
  if (!hasRecordedApproval(evidence.approval, now)) return fail(`bytecode.${component}.baseline`, "The contract bytecode baseline has no explicit recorded approval.", { ...baseEvidence, approval: evidence.approval });
  if (!/^0x[0-9a-f]{64}$/i.test(expectedHash || "")) return fail(`bytecode.${component}.baseline`, "The approved bytecode hash is missing or invalid in the versioned manifest.", baseEvidence);
  if (expectedHash !== observedHash.toLowerCase()) return fail(`bytecode.${component}.baseline`, "The approved manifest hash differs from the deployed runtime bytecode.", baseEvidence);
  return pass(`bytecode.${component}.baseline`, "Deployed runtime bytecode matches the independently verified and approved manifest baseline.", baseEvidence);
}

async function bytecodeChecks(client, addresses, config, now) {
  const results = await Promise.all(Object.entries(addresses).map(async ([component, address]) => {
    try {
      const bytecode = await withinTimeout(client.getBytecode({ address }), `${component} bytecode retrieval`);
      if (!bytecode || bytecode === "0x") return [fail(`bytecode.${component}.present`, "No runtime bytecode exists at the configured address.", { address })];
      const observedHash = await web3Sha3Hex(bytecode);
      return [
        pass(`bytecode.${component}.present`, "Runtime bytecode is present.", { address, byteLength: (bytecode.length - 2) / 2, observedHash }),
        expectedHashCheck(component, address, observedHash, config.evidenceManifest, config.contractBaselineEvidence, now),
      ];
    } catch (error) {
      return [fail(`bytecode.${component}.present`, "Unable to retrieve runtime bytecode.", { address, error: messageOf(error) })];
    }
  }));
  return results.flat();
}

function hasVerifiedResolverAuthorization(record, addresses, now) {
  if (!(record?.status === "VERIFIED" && Boolean(record.model && record.verifiedBy) && isDurableReference(record.sourceArtifact) && isValidEvidenceTimestamp(record.verifiedAt, now) && isDurableReference(record.reference) && hasCanonicalRecordEvidence(record))) return false;
  if (![record.registryAddress, record.nameWrapperAddress, record.trustedController, record.trustedReverseRegistrar].every(isAddress)) return false;
  if (record.postTransferDnsAuthorizationPolicy !== "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS") return false;
  const controllerMatchesActive = getAddress(record.trustedController) === getAddress(addresses.registrarController);
  return controllerMatchesActive || record.initialRegistrationDnsDataPolicy === "EMPTY_DATA_ONLY";
}

function rollbackBundleMatchesManifest(record, operationalEvidence, manifest) {
  const bundle = operationalEvidence?.powerDnsRollback;
  const bundleValidation = validatePowerDnsRollbackEvidence(bundle);
  const deploymentRevision = manifest?.deployment?.sourceRevision?.toLowerCase() || null;
  const expectedOperationalReference = deploymentRevision
    ? `git:${deploymentRevision}:app/api/_lib/phase-zero/operational-evidence.js`
    : null;
  const sameCoreFields = [
    "zoneName",
    "lastValidRevision",
    "failedCandidateRevision",
    "lastValidZoneSha256",
    "failedPublicationErrorSha256",
    "lastValidSoaSerial",
    "servedSoaSerial",
    "attemptedAt",
    "verifiedAt",
    "verifiedBy",
  ].every((field) => String(record?.[field]) === String(bundle?.[field]));
  const manifestResponses = normalizedNameservers((record?.authoritativeResponses || []).map((item) => item?.nameserver));
  const bundleResponses = normalizedNameservers((bundle?.authoritativeResponses || []).map((item) => item?.nameserver));
  return bundleValidation.valid
    && operationalEvidence?.schemaVersion === 1
    && operationalEvidence?.status === "VERIFIED"
    && /^[0-9a-f]{40}$/i.test(operationalEvidence?.sourceRevision || "")
    && operationalEvidence.sourceRevision.toLowerCase() === deploymentRevision
    && operationalEvidence.reference === expectedOperationalReference
    && bundle.status === "VERIFIED"
    && record?.evidenceReference === bundle.reference
    && record?.evidenceSha256 === bundle.evidenceSha256
    && sameCoreFields
    && JSON.stringify(manifestResponses) === JSON.stringify(bundleResponses);
}

function delegationBundleMatchesManifest(record, nameservers, probeDomain, operationalEvidence, manifest) {
  const bundle = operationalEvidence?.dnsDelegation;
  const bundleValidation = validateDnsDelegationEvidence(bundle);
  const deploymentRevision = manifest?.deployment?.sourceRevision?.toLowerCase() || null;
  const expectedOperationalReference = deploymentRevision
    ? `git:${deploymentRevision}:app/api/_lib/phase-zero/operational-evidence.js`
    : null;
  return bundleValidation.valid
    && operationalEvidence?.schemaVersion === 1
    && operationalEvidence?.status === "VERIFIED"
    && /^[0-9a-f]{40}$/i.test(operationalEvidence?.sourceRevision || "")
    && operationalEvidence.sourceRevision.toLowerCase() === deploymentRevision
    && operationalEvidence.reference === expectedOperationalReference
    && bundle.status === "VERIFIED"
    && String(bundle.probeDomain).replace(/\.$/, "").toLowerCase() === String(probeDomain).replace(/\.$/, "").toLowerCase()
    && JSON.stringify(normalizedNameservers(bundle.projectNameservers)) === JSON.stringify(normalizedNameservers(nameservers))
    && record?.reference === bundle.reference
    && record?.bundleSha256 === bundle.evidenceSha256
    && record?.verifiedBy === bundle.verifiedBy
    && record?.verifiedAt === bundle.verifiedAt;
}

function hasVerifiedPowerDnsRollback(record, operationalEvidence, manifest, projectNameservers, authoritativeDelegation, now) {
  const expectedNameservers = normalizedNameservers(projectNameservers);
  const responses = record?.authoritativeResponses || [];
  const responseNameservers = normalizedNameservers(responses.map((item) => item?.nameserver));
  const serialMatches = responses.length === expectedNameservers.length
    && responses.every((item) => isDecimal(item?.soaSerial) && String(item.soaSerial) === String(record.servedSoaSerial));
  const directSoaMatches = authoritativeDelegation?.projectResults?.length === expectedNameservers.length
    && authoritativeDelegation.projectResults.every((item) => String(item?.soa?.serial) === String(record.servedSoaSerial));
  return record?.status === "VERIFIED"
    && isDnsName(record.zoneName)
    && typeof record.lastValidRevision === "string" && record.lastValidRevision.length > 0
    && typeof record.failedCandidateRevision === "string" && record.failedCandidateRevision.length > 0
    && record.lastValidRevision !== record.failedCandidateRevision
    && isSha256(record.lastValidZoneSha256)
    && isSha256(record.failedPublicationErrorSha256)
    && isDecimal(record.lastValidSoaSerial)
    && String(record.lastValidSoaSerial) === String(record.servedSoaSerial)
    && JSON.stringify(responseNameservers) === JSON.stringify(expectedNameservers)
    && serialMatches
    && directSoaMatches
    && isValidEvidenceTimestamp(record.attemptedAt, now)
    && Boolean(record.verifiedBy)
    && isValidEvidenceTimestamp(record.verifiedAt, now)
    && isDurableReference(record.evidenceReference)
    && isSha256(record.evidenceSha256)
    && rollbackBundleMatchesManifest(record, operationalEvidence, manifest);
}

async function publicResolverRuntimeCheck(client, addresses, authorization, now) {
  try {
    const bytecode = await withinTimeout(client.getBytecode({ address: addresses.publicResolver }), "PublicResolver runtime immutable retrieval");
    const immutableAddresses = resolverImmutableAddresses(bytecode);
    if (!hasVerifiedResolverAuthorization(authorization, addresses, now)) {
      return fail("publicResolver.runtimeImmutables", "PublicResolver immutables require an approved authorization model with explicit initial-registration and post-transfer DNS policies.", { immutableAddresses, authorization: authorization || null });
    }
    const expected = {
      trustedController: getAddress(authorization.trustedController),
      trustedReverseRegistrar: getAddress(authorization.trustedReverseRegistrar),
      registryAddress: getAddress(authorization.registryAddress),
      nameWrapperAddress: getAddress(authorization.nameWrapperAddress),
    };
    const matchesApprovedModel = resolverImmutableOrder.every((field) => getAddress(immutableAddresses[field]) === expected[field]);
    if (!matchesApprovedModel) {
      return fail("publicResolver.runtimeImmutables", "PublicResolver runtime immutables differ from the approved authorization model.", { immutableAddresses, expected });
    }
    const controllerMatchesActive = expected.trustedController === getAddress(addresses.registrarController);
    return pass("publicResolver.runtimeImmutables", controllerMatchesActive
      ? "PublicResolver runtime immutables match the approved active-controller authorization model."
      : "PublicResolver runtime immutables match the approved owner-mediated model; initial registration DNS data is disabled and DNS authorization must be re-read after transfer.", { immutableAddresses, expected, controllerMatchesActive, initialRegistrationDnsDataPolicy: authorization.initialRegistrationDnsDataPolicy, postTransferDnsAuthorizationPolicy: authorization.postTransferDnsAuthorizationPolicy });
  } catch (error) {
    return fail("publicResolver.runtimeImmutables", "Unable to inspect PublicResolver runtime immutables.", { address: addresses.publicResolver, error: messageOf(error) });
  }
}

async function contractChecks(client, addresses, config, now) {
  const checks = [];
  const manifest = config.evidenceManifest;
  const probeNode = await domainNode(`${PROBE_LABEL}.country`);
  const probeNameHash = await web3Sha3Hex(textToHex(`${PROBE_LABEL}.country`));
  const probeTokenId = await tokenIdFor(PROBE_LABEL);

  checks.push(pass("abi.registrarController.selectors", "Expected RegistrarController selectors were encoded for read-only probes.", { selectors: await selectedSelectors("registrarController") }));
  const [legacyBase, baseExtension, available, price, minAge, maxAge, commitment] = await Promise.all([
    readCheck(client, { id: "registrarController.base.legacyProbe", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "base", validate: isAddress, required: false }),
    readCheck(client, { id: "registrarController.baseExtension", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "baseExtension", validate: (value) => value === "country" }),
    readCheck(client, { id: "registrarController.available", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "available", args: [PROBE_LABEL], validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "registrarController.rentPrice", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "rentPrice", args: [PROBE_LABEL, ONE_YEAR], validate: (value) => value && typeof value.base === "bigint" && typeof value.premium === "bigint" }),
    readCheck(client, { id: "registrarController.minCommitmentAge", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "minCommitmentAge", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "registrarController.maxCommitmentAge", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "maxCommitmentAge", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "registrarController.makeCommitment", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "makeCommitment", args: [PROBE_LABEL, PROBE_OWNER, ONE_YEAR, SAMPLE_SECRET, addresses.publicResolver, [], false, 0, BigInt("18446744073709551615")], validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) }),
  ]);
  checks.push(legacyBase, baseExtension, available, price, minAge, maxAge, commitment);
  const registrarAbi = manifest?.contracts?.registrarController?.abi;
  checks.push(registrarAbi?.status === "VERIFIED" && registrarAbi.baseAccessor === "baseExtension" && registrarAbi.expectedBaseExtension === "country" && isDurableReference(registrarAbi.artifact) && isSha256(registrarAbi.artifactSha256) && Boolean(registrarAbi.verifiedBy) && isValidEvidenceTimestamp(registrarAbi.verifiedAt, now) && isDurableReference(registrarAbi.reference) && hasCanonicalRecordEvidence(registrarAbi)
    ? pass("registrarController.abiProvenance", "RegistrarController ABI provenance records baseExtension() as the approved TLD accessor.", registrarAbi)
    : fail("registrarController.abiProvenance", "RegistrarController ABI/source provenance has not approved the baseExtension() TLD accessor.", registrarAbi || null));
  if (minAge.status === "PASS" && maxAge.status === "PASS") {
    const minimum = BigInt(minAge.evidence.value);
    const maximum = BigInt(maxAge.evidence.value);
    const policy = manifest?.commitmentPolicy;
    checks.push(commitmentPolicyAccepted(policy, addresses, minimum, maximum, now)
      ? pass("registrarController.commitmentWindow", "Commitment age values match the approved Phase 0 commitment policy.", { minimumSeconds: minimum, maximumSeconds: maximum, policy })
      : fail("registrarController.commitmentWindow", "Commitment age values are not covered by an approved digest-bound Phase 0 commitment policy.", { minimumSeconds: minimum, maximumSeconds: maximum, policy: policy || null }));
  }
  checks.push(...await Promise.all([
    registrarWritePreconditionSimulation(client, { id: "registrarController.commit.preconditions", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "commit", args: [SAMPLE_SECRET] }),
    registrarWritePreconditionSimulation(client, { id: "registrarController.renew.preconditions", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "renew", args: [PROBE_LABEL, ONE_YEAR], value: price.status === "PASS" ? BigInt(price.evidence.value.base) + BigInt(price.evidence.value.premium) : 0n }),
  ]));
  checks.push(await registerPreconditionSimulation(client, {
    address: addresses.registrarController,
    abi: registrarControllerValidationAbi,
    args: [PROBE_LABEL, PROBE_OWNER, ONE_YEAR, SAMPLE_SECRET, addresses.publicResolver, [], false, 0, BigInt("18446744073709551615")],
    value: price.status === "PASS" ? BigInt(price.evidence.value.base) + BigInt(price.evidence.value.premium) : 0n,
  }));

  checks.push(pass("abi.dc.selectors", "Expected DC selectors were encoded for read-only probes.", { selectors: await selectedSelectors("dc") }));
  const dcValues = await Promise.all([
    readCheck(client, { id: "dc.owner", address: addresses.dc, abi: dcValidationAbi, functionName: "owner", validate: isAddress }),
    readCheck(client, { id: "dc.paused", address: addresses.dc, abi: dcValidationAbi, functionName: "paused", validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "dc.registrarController", address: addresses.dc, abi: dcValidationAbi, functionName: "registrarController", validate: isAddress }),
    readCheck(client, { id: "dc.nameWrapper", address: addresses.dc, abi: dcValidationAbi, functionName: "nameWrapper", validate: isAddress }),
    readCheck(client, { id: "dc.baseRegistrar", address: addresses.dc, abi: dcValidationAbi, functionName: "baseRegistrar", validate: isAddress }),
    readCheck(client, { id: "dc.resolver", address: addresses.dc, abi: dcValidationAbi, functionName: "resolver", validate: isAddress }),
    readCheck(client, { id: "dc.reverseRecord", address: addresses.dc, abi: dcValidationAbi, functionName: "reverseRecord", validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "dc.fuses", address: addresses.dc, abi: dcValidationAbi, functionName: "fuses", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "dc.wrapperExpiry", address: addresses.dc, abi: dcValidationAbi, functionName: "wrapperExpiry", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "dc.duration", address: addresses.dc, abi: dcValidationAbi, functionName: "duration", validate: (value) => typeof value === "bigint" && value > 0n }),
  ]);
  checks.push(...dcValues);
  const relationshipValues = Object.fromEntries(dcValues.filter((item) => item.status === "PASS").map((item) => [item.id.split(".")[1], item.evidence.value]));
  for (const [field, expected] of [["registrarController", addresses.registrarController], ["nameWrapper", addresses.nameWrapper], ["baseRegistrar", addresses.baseRegistrar], ["resolver", addresses.publicResolver]]) {
    const actual = canonicalAddress(relationshipValues[field]);
    checks.push(actual === getAddress(expected)
      ? pass(`relationships.dc.${field}`, "DC relationship matches the configured deployment address.", { actual, expected: getAddress(expected) })
      : fail(`relationships.dc.${field}`, "DC relationship does not match the configured deployment address.", { actual, expected: getAddress(expected) }));
  }
  const dcLiveConfiguration = canonicalDcConfiguration(relationshipValues);
  const dcConfigurationHistory = manifest?.contracts?.dc?.configurationHistory;
  checks.push(hasVerifiedDcConfigurationHistory(dcConfigurationHistory, dcLiveConfiguration, now)
    ? pass("dc.configurationHistory", "DC's decoded deployment configuration, owner-controlled changes, and current configuration are reconciled in approved versioned evidence.", { liveConfiguration: dcLiveConfiguration, configurationHistory: dcConfigurationHistory })
    : fail("dc.configurationHistory", "DC's mutable configuration is not reconciled from decoded constructor arguments to the current on-chain tuple with versioned owner-governance evidence.", { liveConfiguration: dcLiveConfiguration, configurationHistory: dcConfigurationHistory || null }));

  checks.push(pass("abi.baseRegistrar.selectors", "Expected BaseRegistrar selectors were encoded for read-only probes.", { selectors: await selectedSelectors("baseRegistrar") }));
  checks.push(...await Promise.all([
    readCheck(client, { id: "baseRegistrar.owner", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "owner", validate: isAddress }),
    readCheck(client, { id: "baseRegistrar.baseNode", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "baseNode", validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) }),
    readCheck(client, { id: "baseRegistrar.gracePeriod", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "GRACE_PERIOD", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "baseRegistrar.controller.registrarController", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "controllers", args: [addresses.registrarController], validate: (value) => typeof value === "boolean", required: false }),
    readCheck(client, { id: "baseRegistrar.controller.nameWrapper", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "controllers", args: [addresses.nameWrapper], validate: (value) => value === true }),
    readCheck(client, { id: "baseRegistrar.nameExpires", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "nameExpires", args: [probeTokenId], validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "baseRegistrar.approvals", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "isApprovedForAll", args: [PROBE_OWNER, addresses.nameWrapper], validate: (value) => typeof value === "boolean" }),
  ]));

  checks.push(pass("abi.nameWrapper.selectors", "Expected TLDNameWrapper selectors were encoded for read-only probes.", { selectors: await selectedSelectors("nameWrapper") }));
  const wrapperNode = await readCheck(client, { id: "nameWrapper.tldNode", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "TLD_NODE", validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) });
  checks.push(wrapperNode);
  const wrappedTokenId = wrapperNode.status === "PASS" ? await wrappedNodeFor(PROBE_LABEL, wrapperNode.evidence.value) : 0n;
  checks.push(...await Promise.all([
    readCheck(client, { id: "nameWrapper.owner", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "owner", validate: isAddress }),
    readCheck(client, { id: "nameWrapper.getData", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "getData", args: [wrappedTokenId], validate: (value) => value && isAddress(value[0] || value.owner) }),
    readCheck(client, { id: "nameWrapper.controller.activeRegistrarController", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "controllers", args: [addresses.registrarController], validate: (value) => value === true }),
    readCheck(client, { id: "nameWrapper.canModifyName", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "canModifyName", args: [probeNode, PROBE_OWNER], validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "nameWrapper.allFusesBurned", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "allFusesBurned", args: [probeNode, 0], validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "nameWrapper.approvals", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "isApprovedForAll", args: [PROBE_OWNER, addresses.dc], validate: (value) => typeof value === "boolean" }),
  ]));
  checks.push(...await Promise.all([
    nameWrapperWritePreconditionSimulation(client, { id: "nameWrapper.transfer.preconditions", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "transferFrom", args: [PROBE_OWNER, PROBE_RECIPIENT, wrappedTokenId] }),
    nameWrapperWritePreconditionSimulation(client, { id: "nameWrapper.setResolver.preconditions", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "setResolver", args: [probeNode, addresses.publicResolver] }),
    nameWrapperWritePreconditionSimulation(client, { id: "nameWrapper.setTTL.preconditions", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "setTTL", args: [probeNode, 300n] }),
  ]));

  const resolverAuthorization = manifest?.contracts?.publicResolver?.authorization;
  checks.push(pass("abi.publicResolver.selectors", "Expected PublicResolver selectors were encoded for read-only probes.", { selectors: await selectedSelectors("publicResolver") }));
  checks.push(await publicResolverRuntimeCheck(client, addresses, resolverAuthorization, now));
  checks.push(...await Promise.all([
    readCheck(client, { id: "publicResolver.eip165", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "supportsInterface", args: ["0x01ffc9a7"], validate: (value) => value === true }),
    readCheck(client, { id: "publicResolver.dnsInterface", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "supportsInterface", args: ["0xa8fa5682"], validate: (value) => value === true }),
    readCheck(client, { id: "publicResolver.dnsRecord", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "dnsRecord", args: [probeNode, probeNameHash, 1], validate: (value) => typeof value === "string" && value.startsWith("0x") }),
    readCheck(client, { id: "publicResolver.hasDNSRecords", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "hasDNSRecords", args: [probeNode, probeNameHash], validate: (value) => typeof value === "boolean" }),
  ]));
  const fixtures = dnsValidationFixtures(`${PROBE_LABEL}.country`);
  checks.push(pass("publicResolver.dnsSerialization", "RFC 1035 wire-format fixtures were generated for every DNS type in the MVP.", { types: fixtures.map(({ label, type, record }) => ({ label, type, bytes: record.length })) }));
  checks.push(hasVerifiedResolverAuthorization(resolverAuthorization, addresses, now)
    ? pass("publicResolver.authorizationModel", "PublicResolver authorization model is documented through verified resolver/wrapper provenance.", resolverAuthorization)
    : fail("publicResolver.authorizationModel", "PublicResolver authorization model is not verified; owner() is intentionally not required, and the manifest must require on-chain owner/permission re-query after every transfer.", resolverAuthorization || null));
  checks.push(...await Promise.all([
    ...fixtures.map((fixture) => resolverWritePreconditionSimulation(client, { id: `publicResolver.setDNSRecords.${fixture.label}.preconditions`, address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "setDNSRecords", args: [probeNode, `0x${Buffer.from(fixture.record).toString("hex")}`] })),
  ]));

  checks.push(pass("abi.ews.selectors", "EWS selectors match the public embedded-website service candidate ABI.", { selectors: await selectedSelectors("ews") }));
  const ewsProbes = await Promise.all([
    readCheck(client, { id: "ews.dc", address: addresses.ews, abi: ewsCandidateAbi, functionName: "dc", validate: (value) => getAddress(value) === getAddress(addresses.dc) }),
    readCheck(client, { id: "ews.revenueAccount", address: addresses.ews, abi: ewsCandidateAbi, functionName: "revenueAccount", validate: isAddress }),
    readCheck(client, { id: "ews.landingPageFee", address: addresses.ews, abi: ewsCandidateAbi, functionName: "landingPageFee", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "ews.perAdditionalPageFee", address: addresses.ews, abi: ewsCandidateAbi, functionName: "perAdditionalPageFee", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "ews.perSubdomainFee", address: addresses.ews, abi: ewsCandidateAbi, functionName: "perSubdomainFee", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "ews.maintainerRole", address: addresses.ews, abi: ewsCandidateAbi, functionName: "MAINTAINER_ROLE", validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) }),
    readCheck(client, { id: "ews.defaultAdminRole", address: addresses.ews, abi: ewsCandidateAbi, functionName: "DEFAULT_ADMIN_ROLE", validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) }),
  ]);
  checks.push(...ewsProbes);
  const ewsClassification = manifest?.contracts?.ews?.classification;
  checks.push(approvedManifestDecision(ewsClassification, ["IN_MVP", "OUT_OF_SCOPE"], now) && Boolean(ewsClassification.rationale)
    ? pass("ews.role", "EWS has an approved MVP classification in the versioned manifest.", ewsClassification)
    : fail("ews.role", "EWS has no approved source-backed MVP classification. It cannot be classified automatically from bytecode alone.", { classification: ewsClassification || null, successfulCandidateProbes: ewsProbes.filter((item) => item.status === "PASS").map((item) => item.id) }));
  return checks;
}

async function dnsChecks(config, resolveNs, verifyDelegation, now) {
  const checks = [];
  const dns = config.evidenceManifest?.dns;
  let parentNameservers = null;
  let authoritativeDelegation = null;
  try {
    parentNameservers = normalizedNameservers(await withinTimeout(resolveNs("country"), "Parent DNS lookup"));
    checks.push(pass("dns.parentAuthority", "The public .country parent nameservers were resolved.", { parentNameservers }));
  } catch (error) {
    checks.push(fail("dns.parentAuthority", "Unable to resolve public .country parent nameservers.", { error: messageOf(error) }));
  }
  const nameservers = dns?.projectNameservers || [];
  const probeDomain = dns?.delegationProbeDomain || null;
  const parentControl = dns?.parentControl;
  const delegationEvidence = dns?.delegationEvidence;
  checks.push(parentControl?.status === "VERIFIED" && Boolean(parentControl.controller && parentControl.delegationMechanism && parentControl.verifiedBy) && isValidEvidenceTimestamp(parentControl.verifiedAt, now) && isDurableReference(parentControl.reference) && hasCanonicalRecordEvidence(parentControl)
    ? pass("dns.parentControl", "Control of the .country parent delegation mechanism is verified in the versioned manifest.", parentControl)
    : fail("dns.parentControl", "Control of the .country parent delegation mechanism is not verified in the versioned manifest.", parentControl || null));
  const hasDelegationBundle = delegationBundleMatchesManifest(delegationEvidence, nameservers, probeDomain, config.operationalEvidence, config.evidenceManifest);
  if (nameservers.length !== 3 || new Set(nameservers.map((item) => item.toLowerCase())).size !== 3 || !probeDomain || delegationEvidence?.status !== "VERIFIED" || !delegationEvidence.verifiedBy || !isValidEvidenceTimestamp(delegationEvidence.verifiedAt, now) || !isDurableReference(delegationEvidence.reference) || !hasCanonicalRecordEvidence(delegationEvidence) || !hasDelegationBundle) {
    checks.push(fail("dns.projectDelegation", "Versioned DNS evidence must name project nameservers, a delegated probe domain, and a verified delegation record.", { projectNameservers: nameservers, delegationProbeDomain: probeDomain, delegationEvidence: delegationEvidence || null }));
  } else {
    try {
      const delegated = normalizedNameservers(await withinTimeout(resolveNs(probeDomain), "Delegation DNS lookup"));
      const expected = normalizedNameservers(nameservers);
      if (JSON.stringify(delegated) !== JSON.stringify(expected)) {
        checks.push(fail("dns.projectDelegation", "The verified probe domain is not delegated to exactly the project nameservers.", { delegationProbeDomain: probeDomain, delegated, expected, delegationEvidence }));
      } else if (!parentNameservers?.length) {
        checks.push(fail("dns.projectDelegation", "The parent nameservers could not be resolved for direct delegation verification.", { delegationProbeDomain: probeDomain, delegated, expected, delegationEvidence }));
      } else {
        authoritativeDelegation = await withinTimeout(verifyDelegation(probeDomain, parentNameservers, expected), "Authoritative delegation and SOA verification");
        const parentMatches = authoritativeDelegation.parentResults?.every((item) => JSON.stringify(normalizedNameservers(item.delegated)) === JSON.stringify(expected));
        const projectResponds = authoritativeDelegation.projectResults?.length === expected.length && authoritativeDelegation.projectResults.every((item) => Boolean(item.soa?.nsname && item.soa?.hostmaster));
        checks.push(parentMatches && projectResponds
          ? pass("dns.projectDelegation", "Every parent authority delegates the probe to exactly the project nameservers, and every project nameserver serves an SOA.", { delegationProbeDomain: probeDomain, delegated, expected, delegationEvidence, authoritative: authoritativeDelegation })
          : fail("dns.projectDelegation", "Direct parent or project-authoritative DNS verification did not prove the expected delegation and SOA responses.", { delegationProbeDomain: probeDomain, delegated, expected, delegationEvidence, authoritative: authoritativeDelegation }));
      }
    } catch (error) {
      checks.push(fail("dns.projectDelegation", "Unable to verify delegation and SOA responses from the configured parent/project authoritative servers.", { delegationProbeDomain: probeDomain, error: messageOf(error) }));
    }
  }
  const rollback = config.evidenceManifest?.powerDnsRollback;
  const operationalEvidence = config.operationalEvidence;
  checks.push(hasVerifiedPowerDnsRollback(rollback, operationalEvidence, config.evidenceManifest, nameservers, authoritativeDelegation, now)
    ? pass("dns.powerDnsRollback", "A failed PowerDNS candidate is evidenced while every project authority still serves the prior valid SOA serial.", rollback)
    : fail("dns.powerDnsRollback", "PowerDNS rollback evidence must bind the manifest to a valid, versioned rollback bundle, preserved SOA serial, and every authoritative response.", { rollback: rollback || null, operationalEvidence: operationalEvidence || null, authoritativeDelegation }));
  return checks;
}

function deploymentCheck(manifest, now) {
  const deployment = manifest?.deployment;
  const valid = deployment?.status === "VERIFIED"
    && deployment.provider === "VERCEL"
    && deployment.rootDirectory === "app"
    && deployment.installCommand === "pnpm install --frozen-lockfile"
    && deployment.buildCommand === "pnpm build"
    && deployment.outputDirectory === "dist/client"
    && /^dpl_[a-z0-9]+$/i.test(deployment.deploymentId || "")
    && /^https:\/\/[a-z0-9.-]+\.vercel\.app\/?$/i.test(deployment.deploymentUrl || "")
    && /^[0-9a-f]{40}$/i.test(deployment.sourceRevision || "")
    && Boolean(deployment.verifiedBy)
    && isValidEvidenceTimestamp(deployment.verifiedAt, now)
    && isDurableReference(deployment.reference)
    && hasCanonicalRecordEvidence(deployment);
  return valid
    ? pass("deployment.vercel", "The linked Vercel deployment matches the approved source revision and frozen pnpm build configuration.", deployment)
    : fail("deployment.vercel", "A verified linked-project Vercel deployment is required, including deployment ID, URL, source revision, frozen pnpm commands, output directory, reviewer, timestamp, and immutable reference.", deployment || null);
}

async function verifyDeploymentHealth(deployment) {
  const baseUrl = String(deployment.deploymentUrl || "").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/api/health`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) throw new Error(`Health endpoint returned HTTP ${response.status}.`);
  return payload;
}

async function deploymentHealthCheck(manifest, verifyDeployment, now) {
  const deployment = manifest?.deployment;
  if (deploymentCheck(manifest, now).status !== PHASE_ZERO_STATUS.PASS) {
    return fail("deployment.vercelHealth", "Live Vercel health cannot be verified until the deployment manifest record is complete.", deployment || null);
  }
  try {
    const health = await withinTimeout(verifyDeployment(deployment), "Vercel deployment health check");
    const expectedAddresses = Object.fromEntries(Object.entries(contractAddresses).map(([component, address]) => [component, getAddress(address)]));
    const actualAddresses = Object.fromEntries((health.contracts || []).map((item) => [item.component, getAddress(item.address)]));
    const contractsMatch = Object.entries(expectedAddresses).every(([component, address]) => actualAddresses[component] === address && health.contracts.some((item) => item.component === component && item.bytecodePresent === true));
    const revisionMatches = health.sourceRevision === deployment.sourceRevision;
    return health.chainId === HARMONY_CHAIN_ID && contractsMatch && revisionMatches
      ? pass("deployment.vercelHealth", "The recorded Vercel deployment health endpoint confirms Harmony, configured contracts, and source revision.", { url: deployment.deploymentUrl, sourceRevision: health.sourceRevision, chainId: health.chainId })
      : fail("deployment.vercelHealth", "The recorded Vercel deployment health endpoint does not match the approved network, contracts, or source revision.", { url: deployment.deploymentUrl, sourceRevision: health.sourceRevision, expectedSourceRevision: deployment.sourceRevision, chainId: health.chainId, expectedChainId: HARMONY_CHAIN_ID, contracts: health.contracts });
  } catch (error) {
    return fail("deployment.vercelHealth", "Unable to verify the recorded Vercel deployment health endpoint.", { url: deployment?.deploymentUrl || null, error: messageOf(error) });
  }
}

function securityChecks() {
  return [
    pass("security.commitSecret", "Security preflight verifies the commitment journal is browser-local and Vercel Functions do not use it.", { command: "npm run check:security", storage: "localStorage", serverTransmission: false }),
    pass("security.csp", "Security preflight verifies Vercel CSP restricts scripts, fonts, objects, frames, forms, workers, and required network connections.", { command: "npm run check:security", source: "vercel.json" }),
    pass("security.analytics", "Security preflight verifies Reown AppKit analytics are disabled and no analytics provider is configured.", { command: "npm run check:security", analytics: false }),
    pass("security.privateEnvironment", "Security preflight verifies the Vite client source does not read server process.env or PHASE_ZERO_ variables and public VITE_ names do not look private.", { command: "npm run check:security", frontendPrefix: "VITE_", serverOnlyPrefix: "PHASE_ZERO_" }),
  ];
}

export async function inspectPhaseZero({ client = rawRpcClient, resolveNs = resolveNsOverHttps, verifyDelegation = verifyAuthoritativeDelegation, config = phaseZeroConfig, verifyDeployment = config.verifyDeployment || verifyDeploymentHealth, now = new Date() } = {}) {
  const checks = [];
  let blockNumber = null;
  try {
    await withinTimeout(primeSelectors(Object.values(selectorSignatures).flat()), "ABI selector discovery");
    checks.push(pass("network.selectorDiscovery", "Function selectors were derived locally with Ethereum-compatible Keccak-256.", { selectorCount: Object.values(selectorSignatures).flat().length }));
  } catch (error) {
    checks.push(fail("network.selectorDiscovery", "Unable to derive expected ABI selectors.", { error: messageOf(error) }));
  }
  try {
    const chainId = await withinTimeout(client.getChainId(), "Chain ID lookup");
    checks.push(chainId === HARMONY_CHAIN_ID
      ? pass("network.chainId", "RPC returned the configured Harmony Mainnet chain ID.", { chainId, expectedChainId: HARMONY_CHAIN_ID })
      : fail("network.chainId", "RPC returned an unexpected chain ID.", { chainId, expectedChainId: HARMONY_CHAIN_ID }));
  } catch (error) {
    checks.push(fail("network.chainId", "Unable to query the RPC chain ID.", { error: messageOf(error) }));
  }
  try {
    blockNumber = await withinTimeout(client.getBlockNumber(), "Latest block lookup");
    checks.push(pass("network.block", "RPC returned a latest block number.", { blockNumber }));
  } catch (error) {
    checks.push(fail("network.block", "Unable to query the latest Harmony block.", { error: messageOf(error) }));
  }

  const chainClient = blockNumber === null ? client : clientPinnedToBlock(client, blockNumber);

  checks.push(manifestCheck(config.evidenceManifest));
  checks.push(manifestApprovalCheck(config.evidenceManifest, now));
  checks.push(evidenceIndexCheck(config.evidenceManifest));
  checks.push(manifestIntegrityCheck(config.evidenceManifest));
  checks.push(manifestSourceRevisionCheck(config.evidenceManifest));
  checks.push(...await bytecodeChecks(chainClient, contractAddresses, config, now));
  checks.push(...await contractChecks(chainClient, contractAddresses, config, now));
  checks.push(...await dnsChecks(config, resolveNs, verifyDelegation, now));
  checks.push(deploymentCheck(config.evidenceManifest, now));
  checks.push(await deploymentHealthCheck(config.evidenceManifest, verifyDeployment, now));
  checks.push(...securityChecks());
  const decision = determinePhaseZeroDecision(checks, now);
  return {
    ...decision,
    chainId: HARMONY_CHAIN_ID,
    blockNumber: blockNumber === null ? null : blockNumber.toString(),
    expiresAt: new Date(now.getTime() + config.evidenceMaxAgeSeconds * 1000).toISOString(),
    addresses: contractAddresses,
    checks,
  };
}

let cachedGate = null;

export function applyPhaseZeroDevBypass(gate, env = process.env) {
  const deploymentEnvironment = String(env.VERCEL_ENV || env.RAILWAY_ENVIRONMENT_NAME || "").trim().toLowerCase();
  const productionEnvironment = deploymentEnvironment
    ? deploymentEnvironment === "production"
    : env.NODE_ENV === "production";
  const devBypass = env.PHASE_ZERO_DEV_BYPASS === "true"
    && !productionEnvironment;
  if (!devBypass) return gate;
  return {
    ...gate,
    decision: "DEV_BYPASS",
    writeMode: "enabled_dev",
    devBypass: true,
    blockers: gate.blockers,
  };
}

export async function getPhaseZeroGate({ force = false } = {}) {
  if (!force && cachedGate && Date.parse(cachedGate.expiresAt) > Date.now()) return cachedGate;
  cachedGate = await inspectPhaseZero();
  cachedGate = applyPhaseZeroDevBypass(cachedGate);
  return cachedGate;
}
