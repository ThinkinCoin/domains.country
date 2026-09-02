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
  return Number.isFinite(Date.parse(value || ""));
}

function isDnsName(value) {
  return /^(?=.{1,253}\.?$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\.?$/i.test(value || "");
}

function normalizedNameservers(values) {
  return [...new Set((values || []).map((value) => String(value).replace(/\.$/, "").toLowerCase()))].sort();
}

function isDurableReference(value) {
  return /^0x[0-9a-f]{64}$/i.test(value || "")
    || /^ipfs:\/\/[^/]+(?:\/.*)?$/i.test(value || "")
    || /^git:[0-9a-f]{40}(?::.+)?$/i.test(value || "")
    || /^https:\/\/github\.com\/[^/]+\/[^/]+\/(?:blob|tree)\/[0-9a-f]{40}(?:\/.*)?$/i.test(value || "");
}

export function dnsDelegationEvidenceSha256(evidence) {
  if (!evidence || typeof evidence !== "object") return null;
  return sha256(JSON.stringify(canonicalJson({ ...evidence, evidenceSha256: null })));
}

export function validateDnsDelegationEvidence(evidence) {
  const errors = [];
  if (evidence?.schemaVersion !== 1) errors.push("schemaVersion must equal 1.");
  if (!["REVIEW_READY", "VERIFIED"].includes(evidence?.status)) errors.push("status must be REVIEW_READY or VERIFIED.");
  if (String(evidence?.parentZone || "").replace(/\.$/, "").toLowerCase() !== "country") errors.push("parentZone must be country.");
  if (!isDnsName(evidence?.probeDomain) || !String(evidence.probeDomain).replace(/\.$/, "").toLowerCase().endsWith(".country")) errors.push("probeDomain must be a fully qualified child of .country.");
  if (!Array.isArray(evidence?.projectNameservers) || normalizedNameservers(evidence.projectNameservers).length !== 3) errors.push("projectNameservers must name exactly three distinct nameservers.");
  if (!Array.isArray(evidence?.parentResponses) || evidence.parentResponses.length === 0) {
    errors.push("parentResponses must contain one or more direct parent-authority results.");
  } else {
    const parents = new Set();
    for (const response of evidence.parentResponses) {
      if (!isDnsName(response?.nameserver)) errors.push("Each parent response requires a DNS nameserver.");
      if (JSON.stringify(normalizedNameservers(response?.delegatedNameservers)) !== JSON.stringify(normalizedNameservers(evidence.projectNameservers))) errors.push("Each parent response must delegate exactly to projectNameservers.");
      if (!isIsoTimestamp(response?.observedAt)) errors.push("Each parent response requires an ISO-8601 observedAt timestamp.");
      parents.add(String(response?.nameserver || "").replace(/\.$/, "").toLowerCase());
    }
    if (parents.size !== evidence.parentResponses.length) errors.push("parentResponses must name distinct parent nameservers.");
  }
  if (!Array.isArray(evidence?.projectSoaResponses) || evidence.projectSoaResponses.length !== 3) {
    errors.push("projectSoaResponses must contain exactly three project nameserver results.");
  } else {
    const expected = normalizedNameservers(evidence.projectNameservers);
    const observed = normalizedNameservers(evidence.projectSoaResponses.map((response) => response?.nameserver));
    if (JSON.stringify(observed) !== JSON.stringify(expected)) errors.push("projectSoaResponses must cover exactly projectNameservers.");
    for (const response of evidence.projectSoaResponses) {
      if (!isDnsName(response?.soa?.nsname) || !isDnsName(response?.soa?.hostmaster)) errors.push("Each project SOA response must contain nsname and hostmaster.");
      if (!/^\d+$/.test(String(response?.soa?.serial || ""))) errors.push("Each project SOA response must contain a decimal serial.");
      if (!isIsoTimestamp(response?.observedAt)) errors.push("Each project SOA response requires an ISO-8601 observedAt timestamp.");
    }
  }
  if (!String(evidence?.verifiedBy || "").trim()) errors.push("verifiedBy is required.");
  if (!isIsoTimestamp(evidence?.verifiedAt)) errors.push("verifiedAt must be an ISO-8601 timestamp.");
  if (!isDurableReference(evidence?.reference)) errors.push("reference must be an immutable Git, IPFS, GitHub full-SHA, or transaction reference.");
  const expectedDigest = dnsDelegationEvidenceSha256(evidence);
  if (!isSha256(evidence?.evidenceSha256) || evidence.evidenceSha256 !== expectedDigest) errors.push(`evidenceSha256 does not match the canonical bundle: expected ${expectedDigest}.`);
  return { valid: errors.length === 0, errors, expectedDigest };
}
