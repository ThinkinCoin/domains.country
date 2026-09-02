import assert from "node:assert/strict";
import test from "node:test";
import { buildPowerDnsRollbackEvidence, sha256Bytes } from "./powerdns-rollback-capture.js";
import { validatePowerDnsRollbackEvidence } from "./powerdns-rollback-evidence.js";

const baseInput = {
  zoneName: "phase0.country",
  lastValidRevision: "pdns-zone-20260902-01",
  failedCandidateRevision: "pdns-zone-20260902-02",
  lastValidZoneSha256: sha256Bytes("valid zone export"),
  failedPublicationErrorSha256: sha256Bytes("rejected publication output"),
  lastValidSoaSerial: "2026090201",
  servedSoaSerial: "2026090201",
  attemptedAt: "2026-09-02T12:00:00.000Z",
  verifiedAt: "2026-09-02T12:01:00.000Z",
  verifiedBy: "dns-operator",
  reference: `ipfs://bafy${"a".repeat(48)}`,
  authoritativeResponses: ["ns1.example.net", "ns2.example.net", "ns3.example.net"].map((nameserver) => ({
    nameserver,
    endpoint: "192.0.2.1",
    soaSerial: "2026090201",
    observedAt: "2026-09-02T12:01:00.000Z",
  })),
};

test("captures a review-ready rollback bundle with a canonical digest", () => {
  const evidence = buildPowerDnsRollbackEvidence(baseInput);
  const validation = validatePowerDnsRollbackEvidence(evidence);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(evidence.status, "REVIEW_READY");
  assert.equal(evidence.authoritativeResponses.length, 3);
});

test("refuses a captured rollback bundle when an authority serves a different serial", () => {
  const input = {
    ...baseInput,
    authoritativeResponses: baseInput.authoritativeResponses.map((response, index) => index === 2 ? { ...response, soaSerial: "2026090202" } : response),
  };
  assert.throws(() => buildPowerDnsRollbackEvidence(input), /preserve the served SOA serial/);
});
