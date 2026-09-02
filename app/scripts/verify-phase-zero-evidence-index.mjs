import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_ZERO_EVIDENCE_INDEX_SCHEMA_VERSION, phaseZeroEvidenceIndexPaths } from "./phase-zero-evidence-index.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = resolve(appRoot, "docs/phase-0-evidence-index.json");
const quiet = process.argv.includes("--quiet");

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonicalJson(item)]));
  }
  return value;
}

function failure(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

const index = JSON.parse(await readFile(indexPath, "utf8"));
if (index.schemaVersion !== PHASE_ZERO_EVIDENCE_INDEX_SCHEMA_VERSION) {
  failure(`Unsupported schema version: ${index.schemaVersion}`);
}
if (index.status !== "DISCOVERY_ONLY" && index.status !== "REVIEW_READY") {
  failure(`Unsupported evidence index status: ${index.status}`);
}
if (!Array.isArray(index.entries)) failure("entries must be an array.");

const allowedPaths = new Set(phaseZeroEvidenceIndexPaths);
const seenPaths = new Set();
for (const entry of index.entries) {
  if (!entry || typeof entry.path !== "string" || !/^[a-f0-9]{64}$/i.test(entry.sha256 || "")) {
    failure("Each entry requires a repository-relative path and SHA-256.");
    continue;
  }
  const absolutePath = resolve(appRoot, entry.path);
  const escaped = relative(appRoot, absolutePath).startsWith("..");
  if (escaped || !allowedPaths.has(entry.path) || seenPaths.has(entry.path)) {
    failure(`Invalid, duplicate, or unapproved evidence path: ${entry.path}`);
    continue;
  }
  seenPaths.add(entry.path);
  const actualSha256 = sha256(await readFile(absolutePath));
  if (actualSha256 !== entry.sha256) {
    failure(`SHA-256 mismatch: ${entry.path} expected=${entry.sha256} actual=${actualSha256}`);
  } else if (!quiet) {
    console.log(`MATCH ${entry.path} ${actualSha256}`);
  }
}

for (const path of allowedPaths) {
  if (!seenPaths.has(path)) failure(`Required evidence path is missing: ${path}`);
}

const recordedDigest = index.evidenceIndexSha256;
const calculatedDigest = sha256(JSON.stringify(canonicalJson({ ...index, evidenceIndexSha256: null })));
if (!/^[a-f0-9]{64}$/i.test(recordedDigest || "") || recordedDigest !== calculatedDigest) {
  failure(`Evidence index digest mismatch: expected=${recordedDigest || "missing"} actual=${calculatedDigest}`);
} else {
  console.log(`INDEX_MATCH ${calculatedDigest}`);
}

if (!process.exitCode) {
  console.log(`Phase 0 evidence index verified: status=${index.status}`);
  console.log("This validates local-file consistency only; it does not change the Phase 0 decision.");
}
