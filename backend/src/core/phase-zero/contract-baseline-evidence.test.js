import assert from "node:assert/strict";
import test from "node:test";
import { contractBaselineEvidenceSha256, manifestContractRecordSha256, validateContractBaselineEvidenceBundle } from "./contract-baseline-evidence.js";

const revision = "ab".repeat(20);
const components = ["registrarController", "dc", "ews", "baseRegistrar", "nameWrapper", "publicResolver"];

function fixture() {
  const contracts = Object.fromEntries(components.map((component, index) => [component, {
    address: `0x${String(index + 1).padStart(40, "0")}`,
    approvedBytecodeHash: `0x${String(index + 1).repeat(64).slice(0, 64)}`,
    source: { artifactSha256: String(index + 2).repeat(64).slice(0, 64) },
    approval: { evidenceSha256: String(index + 3).repeat(64).slice(0, 64) },
  }]));
  const manifest = { deployment: { sourceRevision: revision }, contracts };
  const bundle = {
    schemaVersion: 1,
    revision: "test.1",
    status: "VERIFIED",
    sourceRevision: revision,
    verifiedBy: "technical-review",
    verifiedAt: "2026-09-01T12:00:00.000Z",
    reference: `git:${revision}:app/api/_lib/phase-zero/contract-baseline-evidence-record.js`,
    contracts: Object.fromEntries(components.map((component) => [component, {
      address: contracts[component].address,
      approvedBytecodeHash: contracts[component].approvedBytecodeHash,
      sourceArtifactSha256: contracts[component].source.artifactSha256,
      approvalEvidenceSha256: contracts[component].approval.evidenceSha256,
      manifestContractRecordSha256: manifestContractRecordSha256(contracts[component]),
    }])),
    evidenceSha256: null,
  };
  bundle.evidenceSha256 = contractBaselineEvidenceSha256(bundle);
  return { manifest, bundle };
}

test("validates a complete six-contract baseline bundle", () => {
  const { manifest, bundle } = fixture();
  const result = validateContractBaselineEvidenceBundle(bundle, manifest, new Date("2026-09-01T12:05:00.000Z"));
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects a missing component or a manifest record changed after review", () => {
  const missing = fixture();
  delete missing.bundle.contracts.ews;
  missing.bundle.evidenceSha256 = contractBaselineEvidenceSha256(missing.bundle);
  assert.equal(validateContractBaselineEvidenceBundle(missing.bundle, missing.manifest, new Date("2026-09-01T12:05:00.000Z")).valid, false);

  const changed = fixture();
  changed.manifest.contracts.dc.address = "0x00000000000000000000000000000000000000ff";
  assert.equal(validateContractBaselineEvidenceBundle(changed.bundle, changed.manifest, new Date("2026-09-01T12:05:00.000Z")).valid, false);
});
