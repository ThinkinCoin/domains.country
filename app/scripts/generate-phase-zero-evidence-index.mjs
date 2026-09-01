import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_ZERO_EVIDENCE_INDEX_SCHEMA_VERSION, phaseZeroEvidenceIndexPaths } from "./phase-zero-evidence-index.mjs";

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(appRoot, "docs/phase-0-evidence-index.json");

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

const entries = await Promise.all(phaseZeroEvidenceIndexPaths.map(async (path) => {
  const absolutePath = resolve(appRoot, path);
  if (!absolutePath.startsWith(appRoot + "/")) throw new Error(`Invalid Phase 0 evidence path: ${path}`);
  const contents = await readFile(absolutePath);
  return { path, sha256: sha256(contents) };
}));

const generated = {
  schemaVersion: PHASE_ZERO_EVIDENCE_INDEX_SCHEMA_VERSION,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  approvalBoundary: "This index proves local-file consistency only. It is not a contract, operational, or deployment approval. To use it in an approval record, commit it and reference its full Git revision or another immutable location.",
  entries,
  evidenceIndexSha256: null,
};

const evidenceIndexSha256 = sha256(JSON.stringify(canonicalJson(generated)));
const output = { ...generated, evidenceIndexSha256 };

await writeFile(outputPath, JSON.stringify(output, null, 2) + "\n");
console.log(`Phase 0 evidence index generated: ${outputPath}`);
console.log(`entries=${entries.length}`);
console.log(`evidenceIndexSha256=${evidenceIndexSha256}`);
console.log("status=DISCOVERY_ONLY");
