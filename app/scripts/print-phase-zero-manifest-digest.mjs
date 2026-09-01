import { manifestIntegritySha256 } from "../api/_lib/phase-zero/index.js";
import { phaseZeroEvidenceManifest } from "../api/_lib/phase-zero/evidence-manifest.js";

const digest = manifestIntegritySha256(phaseZeroEvidenceManifest);

console.log(`Phase 0 manifest revision: ${phaseZeroEvidenceManifest.revision}`);
console.log(`Canonical approval digest: ${digest}`);
console.log("Set approval.evidenceSha256 to this value only after every required record is final and reviewed.");
console.log("Set approval.sourceRevision to the exact same 40-character Git revision recorded in deployment.sourceRevision.");
console.log("Any manifest edit changes the digest and requires the approval to be renewed.");
