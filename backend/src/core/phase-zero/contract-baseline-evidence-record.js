// This record binds the six approved contract records to one reviewed Git
// revision. It starts empty and fail-closed. Never populate it by copying the
// currently observed RPC hashes without source/deployment review.
export const phaseZeroContractBaselineEvidence = Object.freeze({
  schemaVersion: 1,
  revision: "2026-09-01.1",
  status: "PENDING",
  sourceRevision: null,
  verifiedBy: null,
  verifiedAt: null,
  reference: "docs/phase-0-approval-packet.md",
  contracts: {},
  evidenceSha256: null,
});
