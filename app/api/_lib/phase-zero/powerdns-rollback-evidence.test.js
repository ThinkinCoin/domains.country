import assert from "node:assert/strict";
import test from "node:test";
import { powerDnsRollbackEvidenceSha256, validatePowerDnsRollbackEvidence } from "./powerdns-rollback-evidence.js";

function validEvidence() {
  const evidence = {
    schemaVersion: 1,
    status: "REVIEW_READY",
    zoneName: "phase0.country",
    lastValidRevision: "zone-revision-42",
    failedCandidateRevision: "zone-revision-43",
    lastValidZoneSha256: "a".repeat(64),
    failedPublicationErrorSha256: "b".repeat(64),
    lastValidSoaSerial: "2026090101",
    servedSoaSerial: "2026090101",
    attemptedAt: "2026-09-01T12:00:00.000Z",
    verifiedAt: "2026-09-01T12:05:00.000Z",
    verifiedBy: "dns-operator",
    reference: `git:${"cd".repeat(20)}:app/docs/operations/phase-0-powerdns-rollback.json`,
    authoritativeResponses: ["ns1.example.net", "ns2.example.net", "ns3.example.net"].map((nameserver) => ({
      nameserver,
      soaSerial: "2026090101",
      observedAt: "2026-09-01T12:05:00.000Z",
    })),
    evidenceSha256: null,
  };
  return { ...evidence, evidenceSha256: powerDnsRollbackEvidenceSha256(evidence) };
}

test("validates a complete PowerDNS rollback evidence bundle", () => {
  const result = validatePowerDnsRollbackEvidence(validEvidence());
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects stale serials and tampered evidence bundles", () => {
  const staleSerial = { ...validEvidence(), servedSoaSerial: "2026090100" };
  assert.equal(validatePowerDnsRollbackEvidence(staleSerial).valid, false);

  const tampered = { ...validEvidence(), lastValidRevision: "zone-revision-44" };
  assert.equal(validatePowerDnsRollbackEvidence(tampered).valid, false);
});
