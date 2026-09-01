import { phaseZeroContractBaselineEvidence } from "../api/_lib/phase-zero/contract-baseline-evidence-record.js";
import { phaseZeroEvidenceManifest } from "../api/_lib/phase-zero/evidence-manifest.js";
import { validateContractBaselineEvidenceBundle } from "../api/_lib/phase-zero/contract-baseline-evidence.js";

const result = validateContractBaselineEvidenceBundle(
  phaseZeroContractBaselineEvidence,
  phaseZeroEvidenceManifest,
);

if (!result.valid) {
  for (const error of result.errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  console.log("VALID six-contract baseline evidence bundle.");
  console.log(`evidenceSha256=${result.expectedDigest}`);
  console.log("This verifies the versioned review bundle only; Phase 0 still verifies live bytecode and permissions.");
}
