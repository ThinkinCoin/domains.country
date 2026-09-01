// This file is a versioned approval record, not a discovery cache. Never copy a
// currently deployed hash into `approvedBytecodeHash` without independently
// verifying the source artifact and obtaining the recorded approval.
export const PHASE_ZERO_EVIDENCE_SCHEMA_VERSION = 1;

export const phaseZeroEvidenceManifest = Object.freeze({
  schemaVersion: PHASE_ZERO_EVIDENCE_SCHEMA_VERSION,
  revision: "2026-09-01.1",
  status: "PENDING_APPROVAL",
  approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
  contracts: {
    registrarController: {
      address: "0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb",
      approvedBytecodeHash: null,
      source: { status: "PENDING", artifact: null, artifactSha256: null, deploymentTransaction: null, verifiedBy: null, verifiedAt: null, reference: null },
      approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
      abi: {
        status: "PENDING",
        baseAccessor: null,
        expectedBaseExtension: null,
        artifact: null,
        verifiedBy: null,
        verifiedAt: null,
        reference: "docs/phase-0-source-candidates.md",
      },
    },
    dc: {
      address: "0x547942748Cc8840FEc23daFdD01E6457379B446D",
      approvedBytecodeHash: null,
      source: { status: "PENDING", artifact: null, artifactSha256: null, deploymentTransaction: null, verifiedBy: null, verifiedAt: null, reference: null },
      approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
    },
    ews: {
      address: "0xf90dab949d3853c418bE361930028644B4EBcDE4",
      approvedBytecodeHash: null,
      source: { status: "PENDING", artifact: null, artifactSha256: null, deploymentTransaction: null, verifiedBy: null, verifiedAt: null, reference: null },
      approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
      classification: { status: "PENDING", decision: null, rationale: null, reference: "docs/phase-0-ews-classification.md" },
    },
    baseRegistrar: {
      address: "0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD",
      approvedBytecodeHash: null,
      source: { status: "PENDING", artifact: null, artifactSha256: null, deploymentTransaction: null, verifiedBy: null, verifiedAt: null, reference: null },
      approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
    },
    nameWrapper: {
      address: "0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5",
      approvedBytecodeHash: null,
      source: { status: "PENDING", artifact: null, artifactSha256: null, deploymentTransaction: null, verifiedBy: null, verifiedAt: null, reference: null },
      approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
    },
    publicResolver: {
      address: "0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D",
      approvedBytecodeHash: null,
      source: { status: "PENDING", artifact: null, artifactSha256: null, deploymentTransaction: null, verifiedBy: null, verifiedAt: null, reference: null },
      approval: { status: "PENDING", approvedBy: null, approvedAt: null, reference: null },
      authorization: {
        status: "PENDING",
        model: null,
        registryAddress: null,
        nameWrapperAddress: null,
        trustedController: null,
        trustedReverseRegistrar: null,
        sourceArtifact: null,
        verifiedBy: null,
        verifiedAt: null,
        reference: "docs/phase-0-public-resolver-authorization.md",
      },
    },
  },
  commitmentPolicy: {
    status: "PENDING",
    minimumCommitmentAgeSeconds: null,
    maximumCommitmentAgeSeconds: null,
    approvedBy: null,
    approvedAt: null,
    decisionReference: "docs/phase-0-commitment-decision.md",
  },
  dns: {
    parentControl: { status: "PENDING", controller: null, delegationMechanism: null, verifiedBy: null, verifiedAt: null, reference: "docs/phase-0-dns-operation.md" },
    projectNameservers: [],
    delegationProbeDomain: null,
    delegationEvidence: { status: "PENDING", verifiedBy: null, verifiedAt: null, reference: "docs/phase-0-dns-operation.md" },
  },
  powerDnsRollback: {
    status: "PENDING",
    verifiedAt: null,
    verifiedBy: null,
    evidenceReference: "docs/phase-0-dns-operation.md",
    evidenceSha256: null,
  },
});
