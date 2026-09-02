import { phaseZeroEvidenceManifest } from "../api/_lib/phase-zero/evidence-manifest.js";
import { recordEvidenceSha256 } from "../api/_lib/phase-zero/index.js";

const jsonOutput = process.argv.includes("--json");
const requireMatches = process.argv.includes("--require-matches");

const records = [
  ...Object.entries(phaseZeroEvidenceManifest.contracts).map(([component, contract]) => ({
    path: `contracts.${component}.approval`,
    record: contract.approval,
    expectedStatus: "APPROVED",
  })),
  { path: "contracts.registrarController.abi", record: phaseZeroEvidenceManifest.contracts.registrarController.abi, expectedStatus: "VERIFIED" },
  { path: "contracts.dc.configurationHistory", record: phaseZeroEvidenceManifest.contracts.dc.configurationHistory, expectedStatus: "VERIFIED" },
  { path: "contracts.ews.classification", record: phaseZeroEvidenceManifest.contracts.ews.classification, expectedStatus: "APPROVED" },
  { path: "contracts.publicResolver.authorization", record: phaseZeroEvidenceManifest.contracts.publicResolver.authorization, expectedStatus: "VERIFIED" },
  { path: "commitmentPolicy", record: phaseZeroEvidenceManifest.commitmentPolicy, expectedStatus: "APPROVED" },
  { path: "dns.parentControl", record: phaseZeroEvidenceManifest.dns.parentControl, expectedStatus: "VERIFIED" },
  { path: "dns.delegationEvidence", record: phaseZeroEvidenceManifest.dns.delegationEvidence, expectedStatus: "VERIFIED" },
  { path: "powerDnsRollback", record: phaseZeroEvidenceManifest.powerDnsRollback, expectedStatus: "VERIFIED" },
  { path: "deployment", record: phaseZeroEvidenceManifest.deployment, expectedStatus: "VERIFIED" },
];

const results = records.map(({ path, record, expectedStatus }) => {
  const expectedEvidenceSha256 = recordEvidenceSha256(record);
  const matches = record?.evidenceSha256 === expectedEvidenceSha256;
  const statusMatches = record?.status === expectedStatus;
  return {
    path,
    status: record?.status || null,
    expectedStatus,
    recordedEvidenceSha256: record?.evidenceSha256 || null,
    expectedEvidenceSha256,
    matches,
    statusMatches,
    ready: matches && statusMatches,
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
    console.log(`${result.ready ? "READY" : "PENDING_OR_MISMATCH"} ${result.path} status=${result.status} expectedStatus=${result.expectedStatus} expected=${result.expectedEvidenceSha256} recorded=${result.recordedEvidenceSha256 || "null"}`);
  }
  console.log("PowerDNS rollback also requires its separately versioned operational-evidence bundle; this digest covers the manifest record that must match that bundle.");
  console.log("Copy an expected digest only after the corresponding record and immutable evidence reference are final and reviewed.");
}

if (requireMatches && results.some((result) => !result.ready)) {
  process.exitCode = 1;
}
