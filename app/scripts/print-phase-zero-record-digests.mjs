import { phaseZeroEvidenceManifest } from "../api/_lib/phase-zero/evidence-manifest.js";
import { recordEvidenceSha256 } from "../api/_lib/phase-zero/index.js";

const jsonOutput = process.argv.includes("--json");
const requireMatches = process.argv.includes("--require-matches");

const records = [
  ...Object.entries(phaseZeroEvidenceManifest.contracts).map(([component, contract]) => ({
    path: `contracts.${component}.approval`,
    record: contract.approval,
  })),
  { path: "contracts.registrarController.abi", record: phaseZeroEvidenceManifest.contracts.registrarController.abi },
  { path: "contracts.dc.configurationHistory", record: phaseZeroEvidenceManifest.contracts.dc.configurationHistory },
  { path: "contracts.ews.classification", record: phaseZeroEvidenceManifest.contracts.ews.classification },
  { path: "contracts.publicResolver.authorization", record: phaseZeroEvidenceManifest.contracts.publicResolver.authorization },
  { path: "commitmentPolicy", record: phaseZeroEvidenceManifest.commitmentPolicy },
  { path: "dns.parentControl", record: phaseZeroEvidenceManifest.dns.parentControl },
  { path: "dns.delegationEvidence", record: phaseZeroEvidenceManifest.dns.delegationEvidence },
  { path: "deployment", record: phaseZeroEvidenceManifest.deployment },
];

const results = records.map(({ path, record }) => {
  const expectedEvidenceSha256 = recordEvidenceSha256(record);
  return {
    path,
    status: record?.status || null,
    recordedEvidenceSha256: record?.evidenceSha256 || null,
    expectedEvidenceSha256,
    matches: record?.evidenceSha256 === expectedEvidenceSha256,
  };
});

if (jsonOutput) {
  console.log(JSON.stringify({
    schemaVersion: phaseZeroEvidenceManifest.schemaVersion,
    revision: phaseZeroEvidenceManifest.revision,
    records: results,
  }, null, 2));
} else {
  console.log(`Phase 0 manifest revision: ${phaseZeroEvidenceManifest.revision}`);
  console.log("Canonical per-record evidence digests:");
  for (const result of results) {
    console.log(`${result.matches ? "MATCH" : "PENDING_OR_MISMATCH"} ${result.path} status=${result.status} expected=${result.expectedEvidenceSha256} recorded=${result.recordedEvidenceSha256 || "null"}`);
  }
  console.log("PowerDNS rollback uses its separately versioned operational-evidence bundle and is not included in this generic record list.");
  console.log("Copy an expected digest only after the corresponding record and immutable evidence reference are final and reviewed.");
}

if (requireMatches && results.some((result) => !result.matches)) {
  process.exitCode = 1;
}
