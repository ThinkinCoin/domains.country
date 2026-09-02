import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";
import { CONTRACT_BASELINE_COMPONENTS } from "../api/_lib/phase-zero/contract-baseline-evidence.js";

const traceReviewPath = new URL("../docs/phase-0-contract-trace-review-draft.json", import.meta.url);
const outputPath = new URL("../docs/phase-0-contract-baseline-manifest-draft.json", import.meta.url);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function sha256Json(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function assertSameAddress(component, actual, expected) {
  if (String(actual || "").toLowerCase() !== String(expected || "").toLowerCase()) {
    throw new Error(`${component}: trace review address ${actual} does not match configured address ${expected}.`);
  }
}

function pendingTraceApproval(trace) {
  return {
    status: "PENDING_REVIEW",
    firstCodeBlock: trace.firstCodeBlock,
    blockHash: trace.blockHash,
    transactionHash: trace.transactionHash,
    directCreation: trace.directCreation,
    createTracePath: trace.createTracePath,
    creationInputBytes: trace.creationInputBytes,
    creationInputSha256: trace.creationInputSha256,
    creationOutputBytes: trace.creationOutputBytes,
    creationOutputSha256: trace.creationOutputSha256,
    reviewedBy: null,
    reviewedAt: null,
    reference: null,
    evidenceSha256: null,
  };
}

function pendingSource(component, review) {
  return {
    status: "PENDING_REVIEW",
    sourceUri: null,
    artifactSha256: null,
    abiSha256: null,
    compiler: null,
    optimizer: null,
    deploymentTransaction: review.creationTrace.transactionHash,
    deploymentTrace: pendingTraceApproval(review.creationTrace),
    deploymentArtifact: {
      status: "PENDING",
      explorerCreationBytecodeSha256: null,
      compiledCreationArtifactSha256: null,
      metadataStrippedPrefixMatch: null,
      constructorTailBytes: null,
      decodedConstructorArgumentsSha256: null,
      decodedConstructorArgumentsReference: null,
      reviewedBy: null,
      reviewedAt: null,
      reference: null,
      evidenceSha256: null,
    },
    sourceCandidateHints: [
      "docs/phase-0-source-candidates.md",
      "docs/phase-0-bytecode-reproduction.md",
      "docs/phase-0-constructor-provenance.md",
    ],
    requiredReview: [
      `${component}: verify the exact compilable source or compiler artifact.`,
      `${component}: decode and approve constructor arguments and immutable values.`,
      `${component}: bind deploymentTransaction and deploymentTrace to an immutable reference.`,
      `${component}: compute canonical deploymentTrace.evidenceSha256 only after named review.`,
    ],
  };
}

const traceReview = JSON.parse(await readFile(traceReviewPath, "utf8"));
if (traceReview.schemaVersion !== 1) throw new Error(`Trace review schema must equal 1; got ${traceReview.schemaVersion}.`);
if (traceReview.status !== "DISCOVERY_ONLY") throw new Error(`Trace review status must remain DISCOVERY_ONLY; got ${traceReview.status}.`);
if (traceReview.network?.chainId !== HARMONY_CHAIN_ID) throw new Error(`Trace review chain ID does not match ${HARMONY_CHAIN_ID}.`);

const reviewComponents = Object.keys(traceReview.contracts || {}).sort();
const expectedComponents = [...CONTRACT_BASELINE_COMPONENTS].sort();
if (JSON.stringify(reviewComponents) !== JSON.stringify(expectedComponents)) {
  throw new Error("Trace review must contain exactly the six configured baseline components.");
}

const manifestContractDrafts = {};
const baselineBundleDraft = {
  schemaVersion: 1,
  revision: "DRAFT_DO_NOT_APPROVE",
  status: "PENDING_REVIEW",
  sourceRevision: null,
  verifiedBy: null,
  verifiedAt: null,
  reference: "docs/phase-0-approval-packet.md",
  contracts: {},
  evidenceSha256: null,
};

for (const component of CONTRACT_BASELINE_COMPONENTS) {
  const review = traceReview.contracts[component];
  assertSameAddress(component, review.address, contractAddresses[component]);
  if (review.traceOutputMatchesCurrentRuntime !== true) throw new Error(`${component}: trace output does not match current runtime.`);

  manifestContractDrafts[component] = {
    address: review.address,
    approvedBytecodeHash: null,
    observedRuntimeHash: review.currentRuntime.keccak256,
    observedRuntimeSha256: review.currentRuntime.sha256,
    source: pendingSource(component, review),
    approval: {
      status: "PENDING_REVIEW",
      approvedBy: null,
      approvedAt: null,
      reference: null,
      evidenceSha256: null,
    },
    notes: [
      "Copy observedRuntimeHash into approvedBytecodeHash only after source/deployment review.",
      "Do not use this generated draft as an approval reference.",
      "The production gate rejects PENDING_REVIEW records and null evidence digests.",
    ],
  };

  baselineBundleDraft.contracts[component] = {
    address: review.address,
    approvedBytecodeHash: null,
    sourceArtifactSha256: null,
    approvalEvidenceSha256: null,
    manifestContractRecordSha256: null,
  };
}

const draft = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  generatedAt: new Date().toISOString(),
  network: traceReview.network,
  source: {
    traceReviewDraft: "docs/phase-0-contract-trace-review-draft.json",
    traceReviewDraftSha256: traceReview.reviewDraftSha256,
    traceSnapshotSha256: traceReview.traceSnapshot?.snapshotSha256 || null,
  },
  purpose: "Reviewer worksheet for filling api/_lib/phase-zero/evidence-manifest.js and contract-baseline-evidence-record.js. It never approves contract baselines and must not enable writes.",
  approvalBoundary: [
    "Keep all generated records pending until a named reviewer verifies source, ABI, constructor arguments, deployment trace, and immutable references.",
    "approvedBytecodeHash is intentionally null even though observedRuntimeHash is provided.",
    "evidenceSha256 values are intentionally null because the reviewer must calculate them from final reviewed records.",
    "The generated baseline bundle is a shape guide only; it is not a VERIFIED bundle.",
  ],
  manifestContractDrafts,
  baselineBundleDraft,
};

const output = { ...draft, baselineDraftSha256: sha256Json(draft) };
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Generated contract baseline manifest draft: ${outputPath.pathname}`);
console.log(`baselineDraftSha256=${output.baselineDraftSha256}`);
for (const [component, record] of Object.entries(output.manifestContractDrafts)) {
  console.log(`DRAFT ${component} observedRuntimeHash=${record.observedRuntimeHash} status=${record.source.status}`);
}
