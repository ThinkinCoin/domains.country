import assert from "node:assert/strict";
import test from "node:test";
import { determinePhaseZeroDecision, PHASE_ZERO_STATUS } from "./decision.js";
import { dnsValidationFixtures, encodeDnsName } from "./dns-wire.js";
import { PHASE_ZERO_EVIDENCE_SCHEMA_VERSION, phaseZeroEvidenceManifest } from "./evidence-manifest.js";
import { applyPhaseZeroDevBypass, deploymentArtifactEvidenceSha256, deploymentTraceEvidenceSha256, inspectPhaseZero, manifestIntegritySha256, recordEvidenceSha256 } from "./index.js";
import { powerDnsRollbackEvidenceSha256 } from "./powerdns-rollback-evidence.js";
import { contractBaselineEvidenceSha256, manifestContractRecordSha256 } from "./contract-baseline-evidence.js";
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

test("development bypass applies to local and preview environments but never production", () => {
  const gate = {
    decision: "BLOCKED",
    blockers: [{ id: "evidence.manifest.approval", summary: "blocked" }],
    expiresAt: "2026-09-01T12:15:00.000Z",
  };
  const local = applyPhaseZeroDevBypass(gate, { PHASE_ZERO_DEV_BYPASS: "true", NODE_ENV: "development", VERCEL_ENV: "preview" });
  assert.equal(local.decision, "DEV_BYPASS");
  assert.equal(local.writeMode, "enabled_dev");
  assert.equal(local.blockers, gate.blockers);

  const vercelPreview = applyPhaseZeroDevBypass(gate, { PHASE_ZERO_DEV_BYPASS: "true", NODE_ENV: "production", VERCEL_ENV: "preview" });
  assert.equal(vercelPreview.decision, "DEV_BYPASS");

  const nodeProduction = applyPhaseZeroDevBypass(gate, { PHASE_ZERO_DEV_BYPASS: "true", NODE_ENV: "production" });
  assert.equal(nodeProduction.decision, "BLOCKED");

  const vercelProduction = applyPhaseZeroDevBypass(gate, { PHASE_ZERO_DEV_BYPASS: "true", NODE_ENV: "development", VERCEL_ENV: "production" });
  assert.equal(vercelProduction.decision, "BLOCKED");

  const disabled = applyPhaseZeroDevBypass(gate, { PHASE_ZERO_DEV_BYPASS: "false", NODE_ENV: "development", VERCEL_ENV: "preview" });
  assert.equal(disabled.decision, "BLOCKED");
});

test("DNS fixtures encode every MVP record type as RFC 1035 wire data", () => {
  assert.deepEqual(dnsValidationFixtures().map(({ label }) => label), ["A", "CNAME", "NS", "TXT", "SOA", "SRV", "DNAME"]);
  assert.equal(encodeDnsName("example.country").at(-1), 0);
  for (const fixture of dnsValidationFixtures()) assert.ok(fixture.record.length > 12, `${fixture.label} must include a DNS resource record`);
});

test("versioned evidence manifest starts fail-closed", () => {
  assert.equal(phaseZeroEvidenceManifest.status, "PENDING_APPROVAL");
  assert.notEqual(phaseZeroEvidenceManifest.approval.status, "APPROVED");
  assert.notEqual(phaseZeroEvidenceManifest.evidenceIndex.status, "VERIFIED");
  for (const contract of Object.values(phaseZeroEvidenceManifest.contracts)) {
    assert.equal(contract.approvedBytecodeHash, null);
    assert.notEqual(contract.approval.status, "APPROVED");
  }
  assert.notEqual(phaseZeroEvidenceManifest.dns.parentControl.status, "VERIFIED");
  assert.notEqual(phaseZeroEvidenceManifest.powerDnsRollback.status, "VERIFIED");
  assert.notEqual(phaseZeroEvidenceManifest.deployment.status, "VERIFIED");
  assert.equal(phaseZeroEvidenceManifest.commitmentPolicy.decisionReference, "docs/phase-0-commitment-decision.md");
  assert.equal(phaseZeroEvidenceManifest.dns.parentControl.reference, "docs/phase-0-dns-operation.md");
  assert.equal(phaseZeroEvidenceManifest.powerDnsRollback.evidenceReference, "docs/phase-0-dns-operation.md");
  assert.match(manifestIntegritySha256(phaseZeroEvidenceManifest), /^[0-9a-f]{64}$/);
  assert.notEqual(manifestIntegritySha256(phaseZeroEvidenceManifest), manifestIntegritySha256({ ...phaseZeroEvidenceManifest, revision: "tampered" }));
});

test("record evidence digests bind the complete record payload", () => {
  const draft = {
    status: "APPROVED",
    approvedBy: "technical-review",
    approvedAt: "2026-09-01T12:00:00.000Z",
    reference: `git:${"ab".repeat(20)}:phase-zero`,
    evidenceSha256: null,
  };
  const signed = { ...draft, evidenceSha256: recordEvidenceSha256(draft) };
  assert.equal(signed.evidenceSha256, recordEvidenceSha256(signed));
  assert.notEqual(signed.evidenceSha256, recordEvidenceSha256({ ...signed, approvedBy: "another-reviewer" }));
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
  const evidenceReference = `git:${"ab".repeat(20)}:phase-zero`;
  const resolverTrustedController = "0xaca2d31194689fd37962fe17d5a4e63213850ff1";
  const resolverBytecode = `0x73${resolverTrustedController.slice(2)}73${addresses.dc.slice(2)}73${addresses.baseRegistrar.slice(2)}73${addresses.nameWrapper.slice(2)}`;
  const resolverBytecodeHash = await web3Sha3Hex(resolverBytecode);
  const withRecordEvidence = (record) => ({ ...record, evidenceSha256: recordEvidenceSha256(record) });
  const approval = withRecordEvidence({ status: "APPROVED", approvedBy: "technical-review", approvedAt: "2026-09-01T12:00:00.000Z", reference: evidenceReference, sourceRevision: "cd".repeat(20), evidenceSha256: null });
  const manifestApproval = { ...approval, evidenceSha256: null };
  const deploymentTraceDraft = {
    status: "VERIFIED",
    transactionHash: `0x${"12".repeat(32)}`,
    firstCodeBlock: 12345,
    blockHash: `0x${"34".repeat(32)}`,
    directCreation: true,
    createTracePath: [],
    creationInputBytes: 9905,
    creationInputSha256: "c".repeat(64),
    creationOutputBytes: 8324,
    creationOutputSha256: "d".repeat(64),
    verifiedBy: "technical-review",
    verifiedAt: "2026-09-01T11:55:00.000Z",
    reference: evidenceReference,
    evidenceSha256: null,
  };
  const deploymentTrace = { ...deploymentTraceDraft, evidenceSha256: deploymentTraceEvidenceSha256(deploymentTraceDraft) };
  const source = { status: "VERIFIED", artifact: evidenceReference, artifactSha256: "b".repeat(64), deploymentTransaction: `0x${"12".repeat(32)}`, deploymentTrace, verifiedBy: "technical-review", verifiedAt: "2026-09-01T11:55:00.000Z", reference: evidenceReference };
  const contracts = Object.fromEntries(Object.entries(addresses).map(([component, address]) => [component, { address, approvedBytecodeHash: component === "publicResolver" ? resolverBytecodeHash : approvedBytecodeHash, source, approval }]));
  contracts.registrarController.abi = withRecordEvidence({ status: "VERIFIED", baseAccessor: "baseExtension", expectedBaseExtension: "country", artifact: evidenceReference, artifactSha256: "b".repeat(64), verifiedBy: "technical-review", verifiedAt: "2026-09-01T12:00:00.000Z", reference: evidenceReference, evidenceSha256: null });
  contracts.ews.classification = withRecordEvidence({ status: "APPROVED", decision: "OUT_OF_SCOPE", rationale: "Not used by the MVP flow.", reviewedBy: "technical-review", reviewedAt: "2026-09-01T12:00:00.000Z", reference: evidenceReference, evidenceSha256: null });
  contracts.publicResolver.authorization = withRecordEvidence({ status: "VERIFIED", model: "Name Wrapper and resolver authorization", registryAddress: addresses.baseRegistrar, nameWrapperAddress: addresses.nameWrapper, trustedController: resolverTrustedController, trustedReverseRegistrar: addresses.dc, initialRegistrationDnsDataPolicy: "EMPTY_DATA_ONLY", postTransferDnsAuthorizationPolicy: "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS", sourceArtifact: evidenceReference, verifiedBy: "technical-review", verifiedAt: "2026-09-01T12:00:00.000Z", reference: evidenceReference, evidenceSha256: null });
  contracts.dc.configurationHistory = withRecordEvidence({
    status: "VERIFIED",
    initialConstructorArgumentsSha256: "d".repeat(64),
    initialConfiguration: {
      owner: "0x000000000000000000000000000000000000dEaD",
      registrarController: "0x000000000000000000000000000000000000dEaD",
      nameWrapper: "0x000000000000000000000000000000000000dEaD",
      baseRegistrar: "0x000000000000000000000000000000000000dEaD",
      resolver: "0x000000000000000000000000000000000000dEaD",
      reverseRecord: false,
      fuses: "0",
      wrapperExpiry: "100",
      duration: "2",
    },
    activeConfiguration: {
      owner: "0x000000000000000000000000000000000000dEaD",
      registrarController: addresses.registrarController,
      nameWrapper: addresses.nameWrapper,
      baseRegistrar: addresses.baseRegistrar,
      resolver: addresses.publicResolver,
      reverseRecord: true,
      fuses: "0",
      wrapperExpiry: "100",
      duration: "1",
    },
    changeControlMethod: "owner-attestation-and-archived-transaction-trace",
    changeControlEvidenceSha256: "e".repeat(64),
    verifiedBy: "technical-review",
    verifiedAt: "2026-09-01T12:00:00.000Z",
    reference: evidenceReference,
    evidenceSha256: null,
  });
  const evidenceManifest = {
      schemaVersion: PHASE_ZERO_EVIDENCE_SCHEMA_VERSION,
      revision: "test-ready.1",
      status: "APPROVED",
      approval: manifestApproval,
      evidenceIndex: {
        status: "VERIFIED",
        schemaVersion: 1,
        sha256: "c".repeat(64),
        sourceRevision: "cd".repeat(20),
        reference: `git:${"cd".repeat(20)}:app/docs/phase-0-evidence-index.json`,
      },
      contracts,
      commitmentPolicy: withRecordEvidence({ status: "APPROVED", controllerAddress: addresses.registrarController, minimumCommitmentAgeSeconds: 60, maximumCommitmentAgeSeconds: 3600, deploymentReference: evidenceReference, approvedBy: "technical-review", approvedAt: "2026-09-01T12:00:00.000Z", decisionReference: evidenceReference, evidenceSha256: null }),
      dns: {
        parentControl: withRecordEvidence({ status: "VERIFIED", controller: "registry operator", delegationMechanism: "parent NS delegation", verifiedBy: "dns-operator", verifiedAt: "2026-09-01T11:55:00.000Z", reference: evidenceReference, evidenceSha256: null }),
        projectNameservers: ["ns1.example.net", "ns2.example.net", "ns3.example.net"],
        delegationProbeDomain: "phase0.country",
        delegationEvidence: withRecordEvidence({ status: "VERIFIED", verifiedBy: "dns-operator", verifiedAt: "2026-09-01T11:55:00.000Z", reference: evidenceReference, evidenceSha256: null }),
      },
      powerDnsRollback: {
        status: "VERIFIED",
        zoneName: "phase0.country",
        lastValidRevision: "zone-revision-42",
        failedCandidateRevision: "zone-revision-43",
        lastValidZoneSha256: "f".repeat(64),
        failedPublicationErrorSha256: "e".repeat(64),
        lastValidSoaSerial: "2026090101",
        servedSoaSerial: "2026090101",
        authoritativeResponses: ["ns1.example.net", "ns2.example.net", "ns3.example.net"].map((nameserver) => ({ nameserver, soaSerial: "2026090101" })),
        attemptedAt: "2026-09-01T11:59:00.000Z",
        verifiedAt: "2026-09-01T12:00:00.000Z",
        verifiedBy: "dns-operator",
        evidenceReference,
        evidenceSha256: "a".repeat(64),
      },
      deployment: withRecordEvidence({ status: "VERIFIED", provider: "VERCEL", rootDirectory: "app", installCommand: "pnpm install --frozen-lockfile", buildCommand: "pnpm build", outputDirectory: "dist/client", deploymentId: "dpl_phase0ready", deploymentUrl: "https://domains-country-phase0.vercel.app", sourceRevision: "cd".repeat(20), verifiedBy: "release-review", verifiedAt: "2026-09-01T12:00:00.000Z", reference: evidenceReference, evidenceSha256: null }),
  };
  const powerDnsRollbackBundle = {
    schemaVersion: 1,
    status: "VERIFIED",
    zoneName: evidenceManifest.powerDnsRollback.zoneName,
    lastValidRevision: evidenceManifest.powerDnsRollback.lastValidRevision,
    failedCandidateRevision: evidenceManifest.powerDnsRollback.failedCandidateRevision,
    lastValidZoneSha256: evidenceManifest.powerDnsRollback.lastValidZoneSha256,
    failedPublicationErrorSha256: evidenceManifest.powerDnsRollback.failedPublicationErrorSha256,
    lastValidSoaSerial: evidenceManifest.powerDnsRollback.lastValidSoaSerial,
    servedSoaSerial: evidenceManifest.powerDnsRollback.servedSoaSerial,
    attemptedAt: evidenceManifest.powerDnsRollback.attemptedAt,
    verifiedAt: evidenceManifest.powerDnsRollback.verifiedAt,
    verifiedBy: evidenceManifest.powerDnsRollback.verifiedBy,
    reference: evidenceReference,
    authoritativeResponses: evidenceManifest.powerDnsRollback.authoritativeResponses.map((response) => ({
      ...response,
      observedAt: "2026-09-01T12:00:00.000Z",
    })),
    evidenceSha256: null,
  };
  powerDnsRollbackBundle.evidenceSha256 = powerDnsRollbackEvidenceSha256(powerDnsRollbackBundle);
  evidenceManifest.powerDnsRollback = {
    ...evidenceManifest.powerDnsRollback,
    evidenceSha256: powerDnsRollbackBundle.evidenceSha256,
  };
  evidenceManifest.approval = { ...evidenceManifest.approval, evidenceSha256: manifestIntegritySha256(evidenceManifest) };
  const contractBaselineEvidenceFor = (manifest) => {
    const bundle = {
      schemaVersion: 1,
      revision: "test.1",
      status: "VERIFIED",
      sourceRevision: "cd".repeat(20),
      verifiedBy: "technical-review",
      verifiedAt: "2026-09-01T12:00:00.000Z",
      reference: `git:${"cd".repeat(20)}:app/api/_lib/phase-zero/contract-baseline-evidence-record.js`,
      contracts: Object.fromEntries(Object.entries(manifest.contracts).map(([component, record]) => [component, {
        address: record.address,
        approvedBytecodeHash: record.approvedBytecodeHash,
        sourceArtifactSha256: record.source.artifactSha256,
        approvalEvidenceSha256: record.approval.evidenceSha256,
        manifestContractRecordSha256: manifestContractRecordSha256(record),
      }])),
      evidenceSha256: null,
    };
    return { ...bundle, evidenceSha256: contractBaselineEvidenceSha256(bundle) };
  };
  const contractBaselineEvidence = contractBaselineEvidenceFor(evidenceManifest);
  const config = {
    evidenceMaxAgeSeconds: 900,
    evidenceManifest,
    contractBaselineEvidence,
    operationalEvidence: {
      schemaVersion: 1,
      revision: "test.1",
      status: "VERIFIED",
      sourceRevision: "cd".repeat(20),
      reference: `git:${"cd".repeat(20)}:app/api/_lib/phase-zero/operational-evidence.js`,
      powerDnsRollback: powerDnsRollbackBundle,
    },
    verifyDeployment: async (deployment) => ({
      ok: true,
      chainId: 1666600000,
      sourceRevision: deployment.sourceRevision,
      contracts: Object.entries(addresses).map(([component, address]) => ({ component, address, bytecodePresent: true })),
    }),
  };
  const withIntegrity = (manifest) => ({ ...manifest, approval: { ...manifest.approval, evidenceSha256: manifestIntegritySha256(manifest) } });
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
  const verifyDelegation = async (_probe, parentNameservers, projectNameservers) => ({
    expected: projectNameservers,
    parentResults: parentNameservers.map((nameserver) => ({ nameserver, delegated: projectNameservers })),
    projectResults: projectNameservers.map((nameserver) => ({ nameserver, soa: { nsname: nameserver, hostmaster: "hostmaster.example.net", serial: 2026090101 } })),
  });
  const result = await inspectPhaseZero({ client, config, resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."], verifyDelegation, now: new Date("2026-09-01T12:00:00.000Z") });
  assert.equal(result.decision, "READY", JSON.stringify(result.blockers, null, 2));
  assert.deepEqual(result.blockers, []);
  assert.equal(result.checks.some((item) => item.id === "publicResolver.ttl" || item.id === "publicResolver.setTTL.preconditions"), false);

  const missingEvidenceIndexResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: withIntegrity({
        ...config.evidenceManifest,
        evidenceIndex: { ...config.evidenceManifest.evidenceIndex, status: "PENDING" },
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingEvidenceIndexResult.decision, "BLOCKED");
  assert.equal(missingEvidenceIndexResult.blockers.some((item) => item.id === "evidence.index"), true);

  const missingContractBaselineBundleResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      contractBaselineEvidence: { ...config.contractBaselineEvidence, status: "PENDING" },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingContractBaselineBundleResult.decision, "BLOCKED");
  assert.equal(missingContractBaselineBundleResult.blockers.some((item) => item.id === "bytecode.dc.baseline"), true);

  const missingOperationalRollbackEvidenceResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      operationalEvidence: {
        ...config.operationalEvidence,
        status: "PENDING",
        powerDnsRollback: null,
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingOperationalRollbackEvidenceResult.decision, "BLOCKED");
  assert.equal(missingOperationalRollbackEvidenceResult.blockers.some((item) => item.id === "dns.powerDnsRollback"), true);

  const missingEwsEvidenceDigestResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: withIntegrity({
        ...config.evidenceManifest,
        contracts: {
          ...config.evidenceManifest.contracts,
          ews: {
            ...config.evidenceManifest.contracts.ews,
            classification: { ...config.evidenceManifest.contracts.ews.classification, evidenceSha256: null },
          },
        },
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingEwsEvidenceDigestResult.decision, "BLOCKED");
  assert.equal(missingEwsEvidenceDigestResult.blockers.some((item) => item.id === "ews.role"), true);

  const tamperedEwsEvidenceRecordResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: withIntegrity({
        ...config.evidenceManifest,
        contracts: {
          ...config.evidenceManifest.contracts,
          ews: {
            ...config.evidenceManifest.contracts.ews,
            classification: { ...config.evidenceManifest.contracts.ews.classification, rationale: "Tampered decision rationale." },
          },
        },
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(tamperedEwsEvidenceRecordResult.decision, "BLOCKED");
  assert.equal(tamperedEwsEvidenceRecordResult.blockers.some((item) => item.id === "ews.role"), true);

  const assertDigestBoundRecordTamperingBlocks = async (evidenceManifest, blockerId) => {
    const tamperedResult = await inspectPhaseZero({
      client,
      config: { ...config, evidenceManifest: withIntegrity(evidenceManifest) },
      resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
      verifyDelegation,
      now: new Date("2026-09-01T12:00:00.000Z"),
    });
    assert.equal(tamperedResult.decision, "BLOCKED");
    assert.equal(tamperedResult.blockers.some((item) => item.id === blockerId), true);
  };

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    contracts: {
      ...config.evidenceManifest.contracts,
      registrarController: {
        ...config.evidenceManifest.contracts.registrarController,
        abi: { ...config.evidenceManifest.contracts.registrarController.abi, artifactSha256: "f".repeat(64) },
      },
    },
  }, "registrarController.abiProvenance");

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    contracts: {
      ...config.evidenceManifest.contracts,
      dc: {
        ...config.evidenceManifest.contracts.dc,
        configurationHistory: { ...config.evidenceManifest.contracts.dc.configurationHistory, changeControlMethod: "reviewed-owner-attestation-and-archive-trace" },
      },
    },
  }, "dc.configurationHistory");

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    contracts: {
      ...config.evidenceManifest.contracts,
      publicResolver: {
        ...config.evidenceManifest.contracts.publicResolver,
        authorization: { ...config.evidenceManifest.contracts.publicResolver.authorization, model: "Wrapper owner authorization after transfer" },
      },
    },
  }, "publicResolver.authorizationModel");

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    commitmentPolicy: { ...config.evidenceManifest.commitmentPolicy, approvedBy: "another-technical-reviewer" },
  }, "registrarController.commitmentWindow");

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    dns: {
      ...config.evidenceManifest.dns,
      parentControl: { ...config.evidenceManifest.dns.parentControl, controller: "another registry operator" },
    },
  }, "dns.parentControl");

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    dns: {
      ...config.evidenceManifest.dns,
      delegationEvidence: { ...config.evidenceManifest.dns.delegationEvidence, verifiedBy: "another-dns-operator" },
    },
  }, "dns.projectDelegation");

  await assertDigestBoundRecordTamperingBlocks({
    ...config.evidenceManifest,
    deployment: { ...config.evidenceManifest.deployment, verifiedBy: "another-release-reviewer" },
  }, "deployment.vercel");

  const mismatchedCommitmentControllerResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: withIntegrity({
        ...config.evidenceManifest,
        commitmentPolicy: { ...config.evidenceManifest.commitmentPolicy, controllerAddress: addresses.dc },
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(mismatchedCommitmentControllerResult.decision, "BLOCKED");
  assert.ok(mismatchedCommitmentControllerResult.blockers.some((item) => item.id === "registrarController.commitmentWindow"));

  const expectedRegisterRevertResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("register(")) throw new Error("execution reverted: UnexpiredCommitmentExists");
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(expectedRegisterRevertResult.decision, "READY");
  assert.equal(expectedRegisterRevertResult.checks.find((item) => item.id === "registrarController.register.preconditions")?.status, "PASS");

  const failedRegisterRpcResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("register(")) throw new Error("RPC connection refused");
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(failedRegisterRpcResult.decision, "BLOCKED");
  assert.ok(failedRegisterRpcResult.blockers.some((item) => item.id === "registrarController.register.preconditions"));

  const expectedRegistrarLifecycleRevertResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("commit(") || input.signature.startsWith("renew(")) {
          throw new Error("execution reverted: registrar state precondition");
        }
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(expectedRegistrarLifecycleRevertResult.decision, "READY");
  assert.equal(expectedRegistrarLifecycleRevertResult.checks.find((item) => item.id === "registrarController.commit.preconditions")?.status, "PASS");
  assert.equal(expectedRegistrarLifecycleRevertResult.checks.find((item) => item.id === "registrarController.renew.preconditions")?.status, "PASS");

  const failedRenewRpcResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("renew(")) throw new Error("RPC connection refused");
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(failedRenewRpcResult.decision, "BLOCKED");
  assert.ok(failedRenewRpcResult.blockers.some((item) => item.id === "registrarController.renew.preconditions"));

  const expectedResolverRevertResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("setDNSRecords(")) {
          throw new Error("execution reverted: NotAuthorised");
        }
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(expectedResolverRevertResult.decision, "READY");
  assert.equal(expectedResolverRevertResult.checks.find((item) => item.id === "publicResolver.setDNSRecords.A.preconditions")?.status, "PASS");

  const failedResolverRpcResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("setDNSRecords(")) throw new Error("RPC connection refused");
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(failedResolverRpcResult.decision, "BLOCKED");
  assert.ok(failedResolverRpcResult.blockers.some((item) => item.id === "publicResolver.setDNSRecords.A.preconditions"));

  const expectedWrapperRevertResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("transferFrom(") || input.signature.startsWith("setResolver(") || input.signature.startsWith("setTTL(")) {
          throw new Error("execution reverted: OperationProhibited");
        }
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(expectedWrapperRevertResult.decision, "READY");
  assert.equal(expectedWrapperRevertResult.checks.find((item) => item.id === "nameWrapper.transfer.preconditions")?.status, "PASS");
  assert.equal(expectedWrapperRevertResult.checks.find((item) => item.id === "nameWrapper.setResolver.preconditions")?.status, "PASS");
  assert.equal(expectedWrapperRevertResult.checks.find((item) => item.id === "nameWrapper.setTTL.preconditions")?.status, "PASS");

  const failedWrapperRpcResult = await inspectPhaseZero({
    client: {
      ...client,
      async call(input) {
        if (input.signature.startsWith("transferFrom(")) throw new Error("RPC connection refused");
        return "0x";
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(failedWrapperRpcResult.decision, "BLOCKED");
  assert.ok(failedWrapperRpcResult.blockers.some((item) => item.id === "nameWrapper.transfer.preconditions"));

  const inactiveBaseRegistrarControllerResult = await inspectPhaseZero({
    client: {
      ...client,
      async readContract(input) {
        if (input.address.toLowerCase() === addresses.baseRegistrar.toLowerCase() && input.functionName === "controllers") return false;
        return client.readContract(input);
      },
    },
    config,
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(inactiveBaseRegistrarControllerResult.decision, "BLOCKED");
  assert.ok(inactiveBaseRegistrarControllerResult.blockers.some((item) => item.id === "baseRegistrar.controller.nameWrapper"));

  const artifactOnlySource = {
    ...source,
    deploymentTransaction: null,
    deploymentArtifact: (() => {
      const draft = {
        status: "VERIFIED",
        type: "EXPLORER_CREATION_BYTECODE",
        explorerCreationBytecodeHash: `0x${"34".repeat(32)}`,
        compiledCreationArtifactSha256: "c".repeat(64),
        metadataStrippedPrefixMatch: true,
        inferredConstructorArgumentsBytes: 128,
        constructorArgumentsSha256: "f".repeat(64),
        decodedConstructorArgumentsReference: evidenceReference,
        verifiedBy: "technical-review",
        verifiedAt: "2026-09-01T11:55:00.000Z",
        reference: evidenceReference,
        evidenceSha256: null,
      };
      return { ...draft, evidenceSha256: deploymentArtifactEvidenceSha256(draft) };
    })(),
  };
  const artifactOnlyContracts = Object.fromEntries(Object.entries(contracts).map(([component, record]) => [component, { ...record, source: artifactOnlySource }]));
  const artifactOnlyManifest = withIntegrity({ ...config.evidenceManifest, contracts: artifactOnlyContracts });
  const artifactOnlyResult = await inspectPhaseZero({
    client,
    config: { ...config, evidenceManifest: artifactOnlyManifest, contractBaselineEvidence: contractBaselineEvidenceFor(artifactOnlyManifest) },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(artifactOnlyResult.decision, "READY");

  const staleRollbackSerialResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: withIntegrity({
        ...config.evidenceManifest,
        powerDnsRollback: { ...config.evidenceManifest.powerDnsRollback, servedSoaSerial: "2026090100" },
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(staleRollbackSerialResult.decision, "BLOCKED");
  assert.ok(staleRollbackSerialResult.blockers.some((item) => item.id === "dns.powerDnsRollback"));

  const staleDeploymentRevisionResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      verifyDeployment: async (deployment) => ({
        ok: true,
        chainId: 1666600000,
        sourceRevision: "ef".repeat(20),
        contracts: Object.entries(addresses).map(([component, address]) => ({ component, address, bytecodePresent: true })),
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(staleDeploymentRevisionResult.decision, "BLOCKED");
  assert.ok(staleDeploymentRevisionResult.blockers.some((item) => item.id === "deployment.vercelHealth"));

  const missingDcConfigurationHistory = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: { ...contracts, dc: { ...contracts.dc, configurationHistory: { ...contracts.dc.configurationHistory, status: "PENDING" } } },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingDcConfigurationHistory.decision, "BLOCKED");
  assert.ok(missingDcConfigurationHistory.blockers.some((item) => item.id === "dc.configurationHistory"));

  const unsafeResolverPolicy = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...contracts,
          publicResolver: {
            ...contracts.publicResolver,
            authorization: { ...contracts.publicResolver.authorization, initialRegistrationDnsDataPolicy: "TRUSTED_CONTROLLER_DATA" },
          },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(unsafeResolverPolicy.decision, "BLOCKED");
  assert.ok(unsafeResolverPolicy.blockers.some((item) => item.id === "publicResolver.authorizationModel"));

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
    verifyDelegation,
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
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(weakProvenanceResult.decision, "BLOCKED");
  assert.ok(weakProvenanceResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

  const weakTraceResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...contracts,
          dc: { ...contracts.dc, source: { ...source, deploymentTrace: { ...source.deploymentTrace, creationInputSha256: null } } },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(weakTraceResult.decision, "BLOCKED");
  assert.ok(weakTraceResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

  const tamperedTraceDigestResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...contracts,
          dc: { ...contracts.dc, source: { ...source, deploymentTrace: { ...source.deploymentTrace, firstCodeBlock: source.deploymentTrace.firstCodeBlock + 1 } } },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(tamperedTraceDigestResult.decision, "BLOCKED");
  assert.ok(tamperedTraceDigestResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

  const weakArtifactResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...artifactOnlyContracts,
          dc: { ...artifactOnlyContracts.dc, source: { ...artifactOnlySource, deploymentArtifact: { ...artifactOnlySource.deploymentArtifact, metadataStrippedPrefixMatch: false } } },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(weakArtifactResult.decision, "BLOCKED");
  assert.ok(weakArtifactResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

  const tamperedArtifactDigestResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...artifactOnlyContracts,
          dc: { ...artifactOnlyContracts.dc, source: { ...artifactOnlySource, deploymentArtifact: { ...artifactOnlySource.deploymentArtifact, inferredConstructorArgumentsBytes: 129 } } },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(tamperedArtifactDigestResult.decision, "BLOCKED");
  assert.ok(tamperedArtifactDigestResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

  const missingDecodedConstructorResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        contracts: {
          ...artifactOnlyContracts,
          dc: { ...artifactOnlyContracts.dc, source: { ...artifactOnlySource, deploymentArtifact: { ...artifactOnlySource.deploymentArtifact, decodedConstructorArgumentsReference: null } } },
        },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingDecodedConstructorResult.decision, "BLOCKED");
  assert.ok(missingDecodedConstructorResult.blockers.some((item) => item.id === "bytecode.dc.baseline"));

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
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(futureApprovalResult.decision, "BLOCKED");
  assert.ok(futureApprovalResult.blockers.some((item) => item.id === "evidence.manifest.approval"));

  const mutableReferenceResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        approval: { ...approval, reference: "https://example.com/phase-zero/latest" },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(mutableReferenceResult.decision, "BLOCKED");
  assert.ok(mutableReferenceResult.blockers.some((item) => item.id === "evidence.manifest.approval"));

  const unpinnedDocsReferenceResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        approval: { ...approval, reference: "docs/phase-0-approval-packet.md" },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(unpinnedDocsReferenceResult.decision, "BLOCKED");
  assert.ok(unpinnedDocsReferenceResult.blockers.some((item) => item.id === "evidence.manifest.approval"));

  const missingApprovalDigestResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        approval: { ...approval, evidenceSha256: null },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingApprovalDigestResult.decision, "BLOCKED");
  assert.ok(missingApprovalDigestResult.blockers.some((item) => item.id === "evidence.manifest.approval"));

  const mismatchedApprovalSourceResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: withIntegrity({
        ...config.evidenceManifest,
        approval: { ...config.evidenceManifest.approval, sourceRevision: "ef".repeat(20) },
      }),
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    verifyDelegation,
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(mismatchedApprovalSourceResult.decision, "BLOCKED");
  assert.ok(mismatchedApprovalSourceResult.blockers.some((item) => item.id === "evidence.manifest.sourceRevision"));

  const mismatchedManifestDigestResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        approval: { ...config.evidenceManifest.approval, evidenceSha256: "f".repeat(64) },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(mismatchedManifestDigestResult.decision, "BLOCKED");
  assert.ok(mismatchedManifestDigestResult.blockers.some((item) => item.id === "evidence.manifest.integrity"));

  const missingDeploymentResult = await inspectPhaseZero({
    client,
    config: {
      ...config,
      evidenceManifest: {
        ...config.evidenceManifest,
        deployment: { ...config.evidenceManifest.deployment, status: "PENDING", deploymentId: null },
      },
    },
    resolveNs: async () => ["ns1.example.net.", "ns2.example.net.", "ns3.example.net."],
    now: new Date("2026-09-01T12:00:00.000Z"),
  });
  assert.equal(missingDeploymentResult.decision, "BLOCKED");
  assert.ok(missingDeploymentResult.blockers.some((item) => item.id === "deployment.vercel"));
});
