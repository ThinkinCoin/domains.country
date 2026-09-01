import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validatePowerDnsRollbackEvidence } from "../api/_lib/phase-zero/powerdns-rollback-evidence.js";

const argument = process.argv.indexOf("--evidence");
if (argument < 0 || !process.argv[argument + 1]) {
  throw new Error("Usage: node scripts/verify-powerdns-rollback-evidence.mjs --evidence <path>");
}

const path = resolve(process.cwd(), process.argv[argument + 1]);
const evidence = JSON.parse(await readFile(path, "utf8"));
const result = validatePowerDnsRollbackEvidence(evidence);
if (!result.valid) {
  for (const error of result.errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  console.log(`VALID PowerDNS rollback evidence: ${path}`);
  console.log(`evidenceSha256=${result.expectedDigest}`);
  console.log(`status=${evidence.status}`);
  console.log("This validates bundle structure and integrity only; direct authoritative DNS verification remains part of the Phase 0 gate.");
}
