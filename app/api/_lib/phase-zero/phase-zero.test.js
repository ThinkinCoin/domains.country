import assert from "node:assert/strict";
import test from "node:test";
import { determinePhaseZeroDecision, PHASE_ZERO_STATUS } from "./decision.js";
import { dnsValidationFixtures, encodeDnsName } from "./dns-wire.js";
import { phaseZeroEvidenceManifest } from "./evidence-manifest.js";
import { inspectPhaseZero } from "./index.js";
import { web3Sha3Hex } from "../evm-rpc.js";

test("Phase 0 is READY only when every required check passes", () => {
  const ready = determinePhaseZeroDecision([
    { id: "network.chainId", required: true, status: PHASE_ZERO_STATUS.PASS, summary: "ok" },
    { id: "dns.delegation", required: true, status: PHASE_ZERO_STATUS.PASS, summary: "ok" },
    { id: "optional", required: false, status: PHASE_ZERO_STATUS.FAIL, summary: "not required" },
  ], new Date("2026-08-31T12:00:00.000Z"));
  assert.equal(ready.decision, "READY");
  assert.deepEqual(ready.blockers, []);
});

test("Phase 0 fails closed for RPC, ABI, DNS, or stale-evidence checks", () => {
  for (const id of ["network.chainId", "abi.registrarController", "dns.projectDelegation", "evidence.expired"]) {
    const result = determinePhaseZeroDecision([{ id, required: true, status: PHASE_ZERO_STATUS.FAIL, summary: "blocked" }]);
    assert.equal(result.decision, "BLOCKED");
    assert.equal(result.blockers[0].id, id);
  }
});

test("DNS fixtures encode every MVP record type as RFC 1035 wire data", () => {
  assert.deepEqual(dnsValidationFixtures().map(({ label }) => label), ["A", "CNAME", "NS", "TXT", "SOA", "SRV", "DNAME"]);
  assert.equal(encodeDnsName("example.country").at(-1), 0);
  for (const fixture of dnsValidationFixtures()) assert.ok(fixture.record.length > 12, `${fixture.label} must include a DNS resource record`);
});

test("versioned evidence manifest starts fail-closed", () => {
  assert.equal(phaseZeroEvidenceManifest.status, "PENDING_APPROVAL");
  assert.notEqual(phaseZeroEvidenceManifest.approval.status, "APPROVED");
  for (const contract of Object.values(phaseZeroEvidenceManifest.contracts)) {
    assert.equal(contract.approvedBytecodeHash, null);
    assert.notEqual(contract.approval.status, "APPROVED");
  }
  assert.notEqual(phaseZeroEvidenceManifest.dns.parentControl.status, "VERIFIED");
  assert.notEqual(phaseZeroEvidenceManifest.powerDnsRollback.status, "VERIFIED");
  assert.equal(phaseZeroEvidenceManifest.commitmentPolicy.decisionReference, "docs/phase-0-commitment-decision.md");
  assert.equal(phaseZeroEvidenceManifest.dns.parentControl.reference, "docs/phase-0-dns-operation.md");
  assert.equal(phaseZeroEvidenceManifest.powerDnsRollback.evidenceReference, "docs/phase-0-dns-operation.md");
});

test("only a complete versioned manifest can make the full gate READY", async () => {
  const addresses = {
    registrarController: "0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb",
    dc: "0x547942748Cc8840FEc23daFdD01E6457379B446D",
    ews: "0xf90dab949d3853c418bE361930028644B4EBcDE4",
    baseRegistrar: "0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD",
    nameWrapper: "0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5",
    publicResolver: "0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D",
  };
  const approvedBytecodeHash = await web3Sha3Hex("0x6000");
  const resolverBytecode = `0x73${addresses.registrarController.slice(2)}73${addresses.dc.slice(2)}73${addresses.baseRegistrar.slice(2)}73${addresses.nameWrapper.slice(2)}`;
  const resolverBytecodeHash = await web3Sha3Hex(resolverBytecode);
  const approval = { status: "APPROVED", approvedBy: "technical-review", approvedAt: "2026-09-01T12:00:00.000Z", reference: "evidence://approval" };
  const source = { status: "VERIFIED", artifact: "artifact://reproducible", artifactSha256: "b".repeat(64), deploymentTransaction: `0x${"12".repeat(32)}`, verifiedBy: "technical-review", verifiedAt: "2026-09-01T11:55:00.000Z", reference: "evidence://source" };
  const contracts = Object.fromEntries(Object.entries(addresses).map(([component, address]) => [component, { address, approvedBytecodeHash: component === "publicResolver" ? resolverBytecodeHash : approvedBytecodeHash, source, approval }]));
  contracts.registrarController.abi = { status: "VERIFIED", baseAccessor: "baseExtension", expectedBaseExtension: "country", artifact: "artifact://registrar-abi", verifiedBy: "technical-review", verifiedAt: "2026-09-01T12:00:00.000Z", reference: "evidence://registrar-abi" };
  contracts.ews.classification = { status: "APPROVED", decision: "OUT_OF_SCOPE", rationale: "Not used by the MVP flow.", reviewedBy: "technical-review", reviewedAt: "2026-09-01T12:00:00.000Z", reference: "evidence://ews-decision" };
  contracts.publicResolver.authorization = { status: "VERIFIED", model: "Name Wrapper and resolver authorization", registryAddress: addresses.baseRegistrar, nameWrapperAddress: addresses.nameWrapper, trustedController: addresses.registrarController, trustedReverseRegistrar: addresses.dc, sourceArtifact: "artifact://resolver", verifiedBy: "technical-review", verifiedAt: "2026-09-01T12:00:00.000Z", reference: "evidence://resolver-auth" };
  const config = {
    evidenceMaxAgeSeconds: 900,
    evidenceManifest: {
      schemaVersion: 1,
      revision: "test-ready.1",
      status: "APPROVED",
      approval,
      contracts,
      commitmentPolicy: { status: "APPROVED", minimumCommitmentAgeSeconds: 60, maximumCommitmentAgeSeconds: 3600, approvedBy: "technical-review", approvedAt: "2026-09-01T12:00:00.000Z", decisionReference: "evidence://commitment" },
      dns: {
        parentControl: { status: "VERIFIED", controller: "registry operator", delegationMechanism: "parent NS delegation", verifiedBy: "dns-operator", verifiedAt: "2026-09-01T11:55:00.000Z", reference: "evidence://parent-control" },
        projectNameservers: ["ns1.example.net", "ns2.example.net", "ns3.example.net"],
        delegationProbeDomain: "phase0.country",
        delegationEvidence: { status: "VERIFIED", verifiedBy: "dns-operator", verifiedAt: "2026-09-01T11:55:00.000Z", reference: "evidence://delegation" },
      },
      powerDnsRollback: { status: "VERIFIED", verifiedAt: "2026-09-01T12:00:00.000Z", verifiedBy: "dns-operator", evidenceReference: "evidence://rollback", evidenceSha256: "a".repeat(64) },
    },
  };
  const client = {
    async getChainId() { return 1666600000; },
    async getBlockNumber() { return 1n; },
    async getBytecode({ address }) {
      if (address.toLowerCase() === addresses.publicResolver.toLowerCase()) {
        return resolverBytecode;
      }
      return "0x6000";
    },
    async call() { return "0x"; },
    async readContract({ address, functionName }) {
      const values = {
        owner: "0x000000000000000000000000000000000000dEaD",
        base: "0x000000000000000000000000000000000000dEaD",
        baseExtension: "country",
        available: true,
        rentPrice: { base: 1n, premium: 0n },
        minCommitmentAge: 60n,
        maxCommitmentAge: 3600n,
        makeCommitment: `0x${"11".repeat(32)}`,
        paused: false,
        registrarController: addresses.registrarController,
        nameWrapper: addresses.nameWrapper,
        baseRegistrar: addresses.baseRegistrar,
        resolver: addresses.publicResolver,
        reverseRecord: true,
        fuses: 0n,
        wrapperExpiry: 100n,
        duration: 1n,
        baseNode: `0x${"22".repeat(32)}`,
        GRACE_PERIOD: 1n,
        controllers: true,
        nameExpires: 0n,
        isApprovedForAll: false,
        TLD_NODE: `0x${"22".repeat(32)}`,
        getData: ["0x000000000000000000000000000000000000dEaD", 0n, 0n],
        canModifyName: false,
        allFusesBurned: false,
        supportsInterface: true,
        ttl: 0n,
        dnsRecord: "0x",
        hasDNSRecords: false,
        dc: addresses.dc,
        revenueAccount: "0x000000000000000000000000000000000000dEaD",
        landingPageFee: 0n,
        perAdditionalPageFee: 0n,
        perSubdomainFee: 0n,
        MAINTAINER_ROLE: `0x${"33".repeat(32)}`,
        DEFAULT_ADMIN_ROLE: `0x${"00".repeat(32)}`,
        name: "",
        symbol: "",
      };
      assert.ok(addresses[Object.keys(addresses).find((key) => addresses[key].toLowerCase() === address.toLowerCase())]);
      return values[functionName];
    },
  };
  const result = await inspectPhaseZero({ client, config, resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."], now: new Date("2026-09-01T12:00:00.000Z") });
  assert.equal(result.decision, "READY");
  assert.deepEqual(result.blockers, []);

  const unapprovedResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        status: "PENDING_APPROVAL",
        approval: { ...approval, status: "PENDING" },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(unapprovedResult.decision, "BLOCKED");
  assert.ok(unapprovedResult.blockers.some((item) => item.id === "evidence.manifest.approval"));

  const weakProvenanceResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...contracts,
          dc: { ...contracts.dc, source: { ...source, deploymentTransaction: "0x1234" } },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(weakProvenanceResult.decision, "BLOCKED");
  assert.ok(weakProvenanceResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

  const futureApprovalResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        approval: { ...approval, approvedAt: "2026-09-02T12:00:00.000Z" },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(futureApprovalResult.decision, "BLOCKED");
  assert.ok(futureApprovalResult.blockers.some((item) => item.id === "evidence.manifest.approval"));
});
