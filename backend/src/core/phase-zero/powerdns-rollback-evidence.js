import { createHash } from "node:crypto";

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isSha256(value) {
  return /^[0-9a-f]{64}$/i.test(value || "");
}

function isIsoTimestamp(value) {
  const timestamp = Date.parse(value || "");
  return Number.isFinite(timestamp);
}

function isDecimal(value) {
  return /^\d+$/.test(String(value || ""));
}

function isDnsName(value) {
  return /^(?=.{1,253}\.?$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\.?$/i.test(value || "");
}

function isDurableReference(value) {
  return /^0x[0-9a-f]{64}$/i.test(value || "")
    || /^ipfs:\/\/[^/]+(?:\/.*)?$/i.test(value || "")
    || /^git:[0-9a-f]{40}(?::.+)?$/i.test(value || "")
    || /^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[0-9a-f]{40}(?:\/.*)?$/i.test(value || "");
}

export function powerDnsRollbackEvidenceSha256(evidence) {
  if (!evidence || typeof evidence !== "object") return null;
  return sha256(JSON.stringify(canonicalJson({ ...evidence, evidenceSha256: null })));
}

export function validatePowerDnsRollbackEvidence(evidence) {
  const errors = [];
  if (evidence?.schemaVersion !== 1) errors.push("schemaVersion must equal 1.");
  if (!["REVIEW_READY", "VERIFIED"].includes(evidence?.status)) errors.push("status must be REVIEW_READY or VERIFIED.");
  if (!isDnsName(evidence?.zoneName)) errors.push("zoneName must be a fully qualified DNS name.");
  if (!String(evidence?.lastValidRevision || "").trim()) errors.push("lastValidRevision is required.");
  if (!String(evidence?.failedCandidateRevision || "").trim()) errors.push("failedCandidateRevision is required.");
  if (evidence?.lastValidRevision === evidence?.failedCandidateRevision) errors.push("lastValidRevision and failedCandidateRevision must differ.");
  if (!isSha256(evidence?.lastValidZoneSha256)) errors.push("lastValidZoneSha256 must be a SHA-256 digest.");
  if (!isSha256(evidence?.failedPublicationErrorSha256)) errors.push("failedPublicationErrorSha256 must be a SHA-256 digest.");
  if (!isDecimal(evidence?.lastValidSoaSerial)) errors.push("lastValidSoaSerial must be a decimal SOA serial.");
  if (String(evidence?.lastValidSoaSerial) !== String(evidence?.servedSoaSerial)) errors.push("servedSoaSerial must equal lastValidSoaSerial.");
  if (!isIsoTimestamp(evidence?.attemptedAt)) errors.push("attemptedAt must be an ISO-8601 timestamp.");
  if (!isIsoTimestamp(evidence?.verifiedAt)) errors.push("verifiedAt must be an ISO-8601 timestamp.");
  if (!String(evidence?.verifiedBy || "").trim()) errors.push("verifiedBy is required.");
  if (!isDurableReference(evidence?.reference)) errors.push("reference must be an immutable Git, IPFS, GitHub full-SHA, or transaction reference.");
  if (!Array.isArray(evidence?.authoritativeResponses) || evidence.authoritativeResponses.length !== 3) {
    errors.push("authoritativeResponses must contain exactly three project nameserver results.");
  } else {
    const nameservers = new Set();
    for (const response of evidence.authoritativeResponses) {
      if (!isDnsName(response?.nameserver)) errors.push("Each authoritative response requires a DNS nameserver.");
      if (!isDecimal(response?.soaSerial) || String(response.soaSerial) !== String(evidence.servedSoaSerial)) errors.push("Each authoritative response must preserve the served SOA serial.");
      if (!isIsoTimestamp(response?.observedAt)) errors.push("Each authoritative response requires an ISO-8601 observedAt timestamp.");
      nameservers.add(String(response?.nameserver || "").toLowerCase().replace(/\.$/, ""));
    }
    if (nameservers.size !== 3) errors.push("authoritativeResponses must name three distinct nameservers.");
  }
  const expectedDigest = powerDnsRollbackEvidenceSha256(evidence);
  if (!isSha256(evidence?.evidenceSha256) || evidence.evidenceSha256 !== expectedDigest) {
    errors.push(`evidenceSha256 does not match the canonical bundle: expected ${expectedDigest}.`);
  }
  return { valid: errors.length === 0, errors, expectedDigest };
}
