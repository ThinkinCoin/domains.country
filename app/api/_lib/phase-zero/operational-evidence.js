// This is a versioned operational-evidence record, not a substitute for the
// live authoritative DNS checks in the Phase 0 gate. Populate it only with
// non-sensitive, committed evidence after the PowerDNS rollback exercise.
export const PHASE_ZERO_OPERATIONAL_EVIDENCE_SCHEMA_VERSION = 1;

export const phaseZeroOperationalEvidence = Object.freeze({
  schemaVersion: PHASE_ZERO_OPERATIONAL_EVIDENCE_SCHEMA_VERSION,
  revision: "2026-09-01.1",
  status: "PENDING",
  sourceRevision: null,
  reference: "docs/phase-0-dns-operation.md",
  dnsDelegation: null,
  powerDnsRollback: null,
});
