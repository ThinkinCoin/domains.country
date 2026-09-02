import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { validateDnsDelegationEvidence } from "../api/_lib/phase-zero/dns-delegation-evidence.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

const evidencePath = argument("--evidence");
if (!evidencePath) throw new Error("Usage: npm run phase0:verify-dns-delegation -- --evidence <path-to-evidence.json>");

const absolutePath = resolve(process.cwd(), evidencePath);
let evidence;
try {
  evidence = JSON.parse(await readFile(absolutePath, "utf8"));
} catch (error) {
  console.error(`DNS DELEGATION EVIDENCE FAILED: unable to read valid JSON from ${absolutePath}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
const result = validateDnsDelegationEvidence(evidence);
if (!result.valid) {
  for (const error of result.errors) console.error(`DNS DELEGATION EVIDENCE FAILED: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`DNS delegation evidence verified: ${absolutePath}`);
  console.log(`probeDomain=${evidence.probeDomain}`);
  console.log(`projectNameservers=${evidence.projectNameservers.join(",")}`);
  console.log(`evidenceSha256=${result.expectedDigest}`);
  console.log("This verifies the versioned bundle only; the Phase 0 gate still performs live recursive and authoritative DNS checks.");
}
