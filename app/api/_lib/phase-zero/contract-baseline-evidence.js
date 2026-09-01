import { createHash } from "node:crypto";

export const CONTRACT_BASELINE_COMPONENTS = Object.freeze([
  "registrarController",
  "dc",
  "ews",
  "baseRegistrar",
  "nameWrapper",
  "publicResolver",
]);

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

function isAddress(value) {
  return /^0x[0-9a-f]{40}$/i.test(value || "");
}

function isRuntimeHash(value) {
  return /^0x[0-9a-f]{64}$/i.test(value || "");
}

function normalizedAddress(value) {
  return String(value || "").toLowerCase();
}

export function manifestContractRecordSha256(record) {
  if (!record || typeof record !== "object") return null;
  return sha256(JSON.stringify(canonicalJson(record)));
}

export function contractBaselineEvidenceSha256(bundle) {
  if (!bundle || typeof bundle !== "object") return null;
  return sha256(JSON.stringify(canonicalJson({ ...bundle, evidenceSha256: null })));
}

export function validateContractBaselineEvidenceBundle(bundle, manifest, now = new Date()) {
  const errors = [];
  const sourceRevision = manifest?.deployment?.sourceRevision?.toLowerCase() || null;
  const expectedReference = sourceRevision
    ? `git:${sourceRevision}:app/api/_lib/phase-zero/contract-baseline-evidence-record.js`
    : null;
  if (bundle?.schemaVersion !== 1) errors.push("schemaVersion must equal 1.");
  if (bundle?.status !== "VERIFIED") errors.push("status must equal VERIFIED.");
  if (!/^[0-9a-f]{40}$/i.test(bundle?.sourceRevision || "")) errors.push("sourceRevision must be a full Git revision.");
  if (bundle?.sourceRevision?.toLowerCase() !== sourceRevision) errors.push("sourceRevision must equal the deployment source revision.");
  if (bundle?.reference !== expectedReference) errors.push("reference must pin the contract baseline record at the deployment source revision.");
  if (!String(bundle?.verifiedBy || "").trim()) errors.push("verifiedBy is required.");
  const verifiedAt = Date.parse(bundle?.verifiedAt || "");
  if (!Number.isFinite(verifiedAt) || verifiedAt > now.getTime()) errors.push("verifiedAt must be a valid non-future timestamp.");

  const entries = bundle?.contracts;
  if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
    errors.push("contracts must contain all six baseline entries.");
  } else {
    const keys = Object.keys(entries).sort();
    const expectedKeys = [...CONTRACT_BASELINE_COMPONENTS].sort();
    if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) errors.push("contracts must contain exactly the six configured components.");
    for (const component of CONTRACT_BASELINE_COMPONENTS) {
      const entry = entries[component];
      const record = manifest?.contracts?.[component];
      if (!entry || !record) {
        errors.push(`${component}: bundle or manifest record is missing.`);
        continue;
      }
      if (!isAddress(entry.address) || normalizedAddress(entry.address) !== normalizedAddress(record.address)) errors.push(`${component}: address does not match the manifest.`);
      if (!isRuntimeHash(entry.approvedBytecodeHash) || entry.approvedBytecodeHash.toLowerCase() !== String(record.approvedBytecodeHash || "").toLowerCase()) errors.push(`${component}: approved runtime hash does not match the manifest.`);
      if (!isSha256(entry.sourceArtifactSha256) || entry.sourceArtifactSha256 !== record.source?.artifactSha256) errors.push(`${component}: source artifact digest does not match the manifest.`);
      if (!isSha256(entry.approvalEvidenceSha256) || entry.approvalEvidenceSha256 !== record.approval?.evidenceSha256) errors.push(`${component}: approval evidence digest does not match the manifest.`);
      const expectedRecordSha256 = manifestContractRecordSha256(record);
      if (!isSha256(entry.manifestContractRecordSha256) || entry.manifestContractRecordSha256 !== expectedRecordSha256) errors.push(`${component}: manifest contract record digest mismatch.`);
    }
  }

  const expectedDigest = contractBaselineEvidenceSha256(bundle);
  if (!isSha256(bundle?.evidenceSha256) || bundle.evidenceSha256 !== expectedDigest) {
    errors.push(`evidenceSha256 does not match the canonical bundle: expected ${expectedDigest}.`);
  }
  return { valid: errors.length === 0, errors, expectedDigest };
}
