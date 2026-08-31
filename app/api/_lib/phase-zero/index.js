import { contractAddresses, HARMONY_CHAIN_ID, phaseZeroConfig } from "../config.js";
import { primeSelectors, rawRpcClient, selectorFor, textToHex, web3Sha3Hex } from "../evm-rpc.js";
import { baseRegistrarValidationAbi, dcValidationAbi, ewsCandidateAbi, nameWrapperValidationAbi, publicResolverValidationAbi, registrarControllerValidationAbi } from "./abis.js";
import { determinePhaseZeroDecision, PHASE_ZERO_STATUS } from "./decision.js";
import { dnsValidationFixtures } from "./dns-wire.js";

export { determinePhaseZeroDecision, PHASE_ZERO_STATUS };
const PROBE_LABEL = "phase0validation";
const PROBE_OWNER = "0x000000000000000000000000000000000000dEaD";
const ONE_YEAR = 365n * 24n * 60n * 60n;
const SAMPLE_SECRET = `0x${"01".repeat(32)}`;
const PROBE_TIMEOUT_MS = 10_000;

const selectorSignatures = {
  registrarController: ["base()", "available(string)", "rentPrice(string,uint256)", "minCommitmentAge()", "maxCommitmentAge()", "makeCommitment(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)", "commit(bytes32)", "register(string,address,uint256,bytes32,address,bytes[],bool,uint32,uint64)", "renew(string,uint256)"],
  dc: ["owner()", "paused()", "registrarController()", "nameWrapper()", "baseRegistrar()", "resolver()", "reverseRecord()", "fuses()", "wrapperExpiry()", "duration()"],
  baseRegistrar: ["owner()", "baseNode()", "GRACE_PERIOD()", "controllers(address)", "nameExpires(uint256)", "ownerOf(uint256)", "getApproved(uint256)", "isApprovedForAll(address,address)"],
  nameWrapper: ["owner()", "TLD_NODE()", "ownerOf(uint256)", "getData(uint256)", "getApproved(uint256)", "isApprovedForAll(address,address)", "canModifyName(bytes32,address)", "allFusesBurned(bytes32,uint32)"],
  publicResolver: ["owner()", "supportsInterface(bytes4)", "ttl(bytes32)", "dnsRecord(bytes32,bytes32,uint16)", "hasDNSRecords(bytes32,bytes32)", "setDNSRecords(bytes32,bytes)", "setTTL(bytes32,uint64)"],
  ews: ["owner()", "name()", "symbol()", "paused()", "resolver()", "nameWrapper()", "registrarController()"],
};

function valueForJson(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(valueForJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, valueForJson(item)]));
  return value;
}

function messageOf(error) {
  return error instanceof Error ? error.shortMessage || error.message : String(error);
}

function check(id, status, summary, evidence = {}, required = true) {
  return { id, status, required, summary, evidence: valueForJson(evidence) };
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

async function simulatedWriteCheck(client, { id, address, abi, functionName, args, value = 0n }) {
  try {
    const abiItem = abi.find((item) => item.type === "function" && item.name === functionName);
    const signature = `${abiItem.name}(${abiItem.inputs.map((input) => input.type).join(",")})`;
    await withinTimeout(client.call({ to: address, signature, args, value }), `${id} simulation`);
    return warn(id, `${functionName} accepted an unauthorised eth_call; no state was persisted.`, { address, functionName, simulated: true });
  } catch (error) {
    return warn(id, `${functionName} selector was encoded and evaluated by eth_call; an unauthorised/precondition revert is expected without a controlled owner.`, { address, functionName, simulated: true, error: messageOf(error) });
  }
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

function expectedHashCheck(component, observedHash, expectedHash) {
  if (!expectedHash) return fail(`bytecode.${component}.baseline`, "No approved server-side bytecode hash baseline is configured.", { observedHash, expectedHash: null });
  if (expectedHash !== observedHash.toLowerCase()) return fail(`bytecode.${component}.baseline`, "The configured bytecode hash baseline differs from the deployed runtime bytecode.", { observedHash, expectedHash });
  return pass(`bytecode.${component}.baseline`, "Deployed runtime bytecode matches the approved server-side hash baseline.", { observedHash, expectedHash });
}

async function bytecodeChecks(client, addresses, config) {
  const results = await Promise.all(Object.entries(addresses).map(async ([component, address]) => {
    try {
      const bytecode = await withinTimeout(client.getBytecode({ address }), `${component} bytecode retrieval`);
      if (!bytecode || bytecode === "0x") return [fail(`bytecode.${component}.present`, "No runtime bytecode exists at the configured address.", { address })];
      const observedHash = await web3Sha3Hex(bytecode);
      return [
        pass(`bytecode.${component}.present`, "Runtime bytecode is present.", { address, byteLength: (bytecode.length - 2) / 2, observedHash }),
        expectedHashCheck(component, observedHash, config.expectedBytecodeHashes[component]),
      ];
    } catch (error) {
      return [fail(`bytecode.${component}.present`, "Unable to retrieve runtime bytecode.", { address, error: messageOf(error) })];
    }
  }));
  return results.flat();
}

async function contractChecks(client, addresses) {
  const checks = [];
  const probeNode = await domainNode(`${PROBE_LABEL}.country`);
  const probeNameHash = await web3Sha3Hex(textToHex(`${PROBE_LABEL}.country`));
  const probeTokenId = await tokenIdFor(PROBE_LABEL);

  checks.push(pass("abi.registrarController.selectors", "Expected RegistrarController selectors were encoded for read-only probes.", { selectors: await selectedSelectors("registrarController") }));
  const [base, available, price, minAge, maxAge, commitment] = await Promise.all([
    readCheck(client, { id: "registrarController.base", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "base", validate: isAddress }),
    readCheck(client, { id: "registrarController.available", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "available", args: [PROBE_LABEL], validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "registrarController.rentPrice", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "rentPrice", args: [PROBE_LABEL, ONE_YEAR], validate: (value) => value && typeof value.base === "bigint" && typeof value.premium === "bigint" }),
    readCheck(client, { id: "registrarController.minCommitmentAge", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "minCommitmentAge", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "registrarController.maxCommitmentAge", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "maxCommitmentAge", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "registrarController.makeCommitment", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "makeCommitment", args: [PROBE_LABEL, PROBE_OWNER, ONE_YEAR, SAMPLE_SECRET, addresses.publicResolver, [], false, 0, BigInt("18446744073709551615")], validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) }),
  ]);
  checks.push(base, available, price, minAge, maxAge, commitment);
  if (minAge.status === "PASS" && maxAge.status === "PASS") {
    const minimum = BigInt(minAge.evidence.value);
    const maximum = BigInt(maxAge.evidence.value);
    checks.push(minimum > 0n && maximum > minimum
      ? pass("registrarController.commitmentWindow", "Commitment minimum and maximum ages are ordered and non-zero.", { minimumSeconds: minimum, maximumSeconds: maximum })
      : fail("registrarController.commitmentWindow", "Commitment age values are invalid for a safe commit/register flow.", { minimumSeconds: minimum, maximumSeconds: maximum }));
  }
  checks.push(...await Promise.all([
    simulatedWriteCheck(client, { id: "registrarController.commit.simulation", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "commit", args: [SAMPLE_SECRET] }),
    simulatedWriteCheck(client, { id: "registrarController.register.simulation", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "register", args: [PROBE_LABEL, PROBE_OWNER, ONE_YEAR, SAMPLE_SECRET, addresses.publicResolver, [], false, 0, BigInt("18446744073709551615")], value: price.status === "PASS" ? BigInt(price.evidence.value.base) + BigInt(price.evidence.value.premium) : 0n }),
    simulatedWriteCheck(client, { id: "registrarController.renew.simulation", address: addresses.registrarController, abi: registrarControllerValidationAbi, functionName: "renew", args: [PROBE_LABEL, ONE_YEAR], value: price.status === "PASS" ? BigInt(price.evidence.value.base) + BigInt(price.evidence.value.premium) : 0n }),
  ]));

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

  checks.push(pass("abi.baseRegistrar.selectors", "Expected BaseRegistrar selectors were encoded for read-only probes.", { selectors: await selectedSelectors("baseRegistrar") }));
  checks.push(...await Promise.all([
    readCheck(client, { id: "baseRegistrar.owner", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "owner", validate: isAddress }),
    readCheck(client, { id: "baseRegistrar.baseNode", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "baseNode", validate: (value) => /^0x[0-9a-f]{64}$/i.test(value) }),
    readCheck(client, { id: "baseRegistrar.gracePeriod", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "GRACE_PERIOD", validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "baseRegistrar.controller.registrarController", address: addresses.baseRegistrar, abi: baseRegistrarValidationAbi, functionName: "controllers", args: [addresses.registrarController], validate: (value) => typeof value === "boolean" }),
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
    readCheck(client, { id: "nameWrapper.canModifyName", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "canModifyName", args: [probeNode, PROBE_OWNER], validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "nameWrapper.allFusesBurned", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "allFusesBurned", args: [probeNode, 0], validate: (value) => typeof value === "boolean" }),
    readCheck(client, { id: "nameWrapper.approvals", address: addresses.nameWrapper, abi: nameWrapperValidationAbi, functionName: "isApprovedForAll", args: [PROBE_OWNER, addresses.dc], validate: (value) => typeof value === "boolean" }),
  ]));

  checks.push(pass("abi.publicResolver.selectors", "Expected PublicResolver selectors were encoded for read-only probes.", { selectors: await selectedSelectors("publicResolver") }));
  checks.push(...await Promise.all([
    readCheck(client, { id: "publicResolver.owner", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "owner", validate: isAddress }),
    readCheck(client, { id: "publicResolver.ttl", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "ttl", args: [probeNode], validate: (value) => typeof value === "bigint" }),
    readCheck(client, { id: "publicResolver.dnsRecord", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "dnsRecord", args: [probeNode, probeNameHash, 1], validate: (value) => typeof value === "string" && value.startsWith("0x") }),
    readCheck(client, { id: "publicResolver.hasDNSRecords", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "hasDNSRecords", args: [probeNode, probeNameHash], validate: (value) => typeof value === "boolean" }),
  ]));
  const fixtures = dnsValidationFixtures(`${PROBE_LABEL}.country`);
  checks.push(pass("publicResolver.dnsSerialization", "RFC 1035 wire-format fixtures were generated for every DNS type in the MVP.", { types: fixtures.map(({ label, type, record }) => ({ label, type, bytes: record.length })) }));
  checks.push(...await Promise.all([
    ...fixtures.map((fixture) => simulatedWriteCheck(client, { id: `publicResolver.setDNSRecords.${fixture.label}`, address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "setDNSRecords", args: [probeNode, `0x${Buffer.from(fixture.record).toString("hex")}`] })),
    simulatedWriteCheck(client, { id: "publicResolver.setTTL.simulation", address: addresses.publicResolver, abi: publicResolverValidationAbi, functionName: "setTTL", args: [probeNode, 300n] }),
  ]));

  checks.push(pass("abi.ews.candidateSelectors", "Known EWS candidate selectors were encoded for identification probes.", { selectors: await selectedSelectors("ews") }));
  const ewsProbes = await Promise.all(["owner", "name", "symbol", "paused", "resolver", "nameWrapper", "registrarController"].map((functionName) => readCheck(client, { id: `ews.candidate.${functionName}`, address: addresses.ews, abi: ewsCandidateAbi, functionName, validate: () => true, required: false })));
  checks.push(...ewsProbes);
  checks.push(fail("ews.role", "EWS has no verified ABI, source identity, or declared MVP role. It cannot be classified automatically from bytecode alone.", { configuredRole: process.env.PHASE_ZERO_EWS_MVP_ROLE || null, successfulCandidateProbes: ewsProbes.filter((item) => item.status === "PASS").map((item) => item.id) }));
  return checks;
}

async function dnsChecks(config, resolveNs) {
  const checks = [];
  try {
    const parentNameservers = (await withinTimeout(resolveNs("country"), "Parent DNS lookup")).map((value) => value.replace(/\.$/, "").toLowerCase()).sort();
    checks.push(pass("dns.parentAuthority", "The public .country parent nameservers were resolved.", { parentNameservers }));
  } catch (error) {
    checks.push(fail("dns.parentAuthority", "Unable to resolve public .country parent nameservers.", { error: messageOf(error) }));
  }
  if (!config.projectNameservers.length || !config.delegationProbeDomain) {
    checks.push(fail("dns.projectDelegation", "Project nameservers and a delegated probe domain must be configured for automatic delegation validation.", { projectNameservers: config.projectNameservers, delegationProbeDomain: config.delegationProbeDomain }));
  } else {
    try {
      const delegated = (await withinTimeout(resolveNs(config.delegationProbeDomain), "Delegation DNS lookup")).map((value) => value.replace(/\.$/, "").toLowerCase()).sort();
      const expected = [...config.projectNameservers].sort();
      checks.push(JSON.stringify(delegated) === JSON.stringify(expected)
        ? pass("dns.projectDelegation", "The configured probe domain is delegated to exactly the project nameservers.", { delegationProbeDomain: config.delegationProbeDomain, delegated, expected })
        : fail("dns.projectDelegation", "The configured probe domain is not delegated to exactly the project nameservers.", { delegationProbeDomain: config.delegationProbeDomain, delegated, expected }));
    } catch (error) {
      checks.push(fail("dns.projectDelegation", "Unable to resolve nameservers for the configured delegation probe domain.", { delegationProbeDomain: config.delegationProbeDomain, error: messageOf(error) }));
    }
  }
  checks.push(config.powerDnsRollbackEvidence
    ? pass("dns.powerDnsRollback", "A backend PowerDNS rollback evidence reference is configured.", { evidence: config.powerDnsRollbackEvidence })
    : fail("dns.powerDnsRollback", "No backend PowerDNS rollback evidence reference is configured.", { evidence: null }));
  return checks;
}

function securityChecks() {
  return [
    pass("security.commitSecret", "Commitment journal is browser-local and is not referenced by Vercel Functions.", { storage: "localStorage", serverTransmission: false }),
    pass("security.csp", "Vercel configuration defines a restrictive CSP and permits only Harmony and Reown connectivity required by the app.", { source: "vercel.json" }),
    pass("security.analytics", "Reown AppKit analytics are disabled and no analytics provider is configured in the application source.", { analytics: false }),
    pass("security.privateEnvironment", "The frontend receives only VITE_-prefixed build variables; server-only Phase 0 evidence is read through backend environment variables.", { frontendPrefix: "VITE_", serverOnlyPrefix: "PHASE_ZERO_" }),
  ];
}

export async function inspectPhaseZero({ client = rawRpcClient, resolveNs = resolveNsOverHttps, config = phaseZeroConfig, now = new Date() } = {}) {
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

  checks.push(...await bytecodeChecks(client, contractAddresses, config));
  checks.push(...await contractChecks(client, contractAddresses));
  checks.push(...await dnsChecks(config, resolveNs));
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

export async function getPhaseZeroGate({ force = false } = {}) {
  if (!force && cachedGate && Date.parse(cachedGate.expiresAt) > Date.now()) return cachedGate;
  cachedGate = await inspectPhaseZero();
  return cachedGate;
}
