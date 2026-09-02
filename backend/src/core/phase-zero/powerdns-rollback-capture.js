import { createHash } from "node:crypto";
import { powerDnsRollbackEvidenceSha256, validatePowerDnsRollbackEvidence } from "./powerdns-rollback-evidence.js";

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Bytes(value) {
  return sha256(value);
}

export function buildPowerDnsRollbackEvidence(input) {
  const evidence = {
    schemaVersion: 1,
    status: "REVIEW_READY",
    zoneName: input.zoneName,
    lastValidRevision: input.lastValidRevision,
    failedCandidateRevision: input.failedCandidateRevision,
    lastValidZoneSha256: input.lastValidZoneSha256,
    failedPublicationErrorSha256: input.failedPublicationErrorSha256,
    lastValidSoaSerial: String(input.lastValidSoaSerial),
    servedSoaSerial: String(input.servedSoaSerial),
    attemptedAt: input.attemptedAt,
    verifiedAt: input.verifiedAt,
    verifiedBy: input.verifiedBy,
    reference: input.reference,
    authoritativeResponses: input.authoritativeResponses,
    evidenceSha256: null,
  };
  const finalized = { ...evidence, evidenceSha256: powerDnsRollbackEvidenceSha256(evidence) };
  const validation = validatePowerDnsRollbackEvidence(finalized);
  if (!validation.valid) throw new Error(`Rollback evidence is incomplete: ${validation.errors.join(" ")}`);
  return finalized;
}
