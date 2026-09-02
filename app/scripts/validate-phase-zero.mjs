import { readFile, writeFile } from "node:fs/promises";
import { inspectPhaseZero } from "../api/_lib/phase-zero/index.js";

function markdownEscape(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderEvidence(evidence) {
  const entries = Object.entries(evidence || {});
  return entries.length ? entries.map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join("; ") : "—";
}

function remediationForBlocker(id) {
  if (id === "evidence.manifest.approval") return "Record a named, dated top-level technical approval with an immutable commit/IPFS/transaction reference and SHA-256 evidence digest after every required entry passes.";
  if (id === "evidence.manifest.integrity") return "Set the top-level approval digest to the SHA-256 of the canonical versioned manifest payload, with approval.evidenceSha256 nulled during digest calculation; rerun validation after any manifest edit.";
  if (id === "evidence.manifest.sourceRevision") return "Set approval.sourceRevision and deployment.sourceRevision to the same full 40-character Git commit that contains the reviewed manifest and deployed application.";
  if (/^bytecode\..+\.baseline$/.test(id)) return "Reproduce the deployed runtime from a verified source/artifact and deployment record, approve its exact hash with an immutable reference and SHA-256 digest, then regenerate the six-contract record in contract-baseline-evidence-record.js at the same deployment source revision.";
  if (id === "registrarController.abiProvenance") return "Approve the deployed RegistrarController ABI artifact and ABI SHA-256 with `baseExtension()` as the accessor, `country` as its expected value, and an immutable evidence reference.";
  if (/^registrarController\.(commit|renew|register)\.preconditions$/.test(id)) return "Restore an `eth_call`-compatible RegistrarController lifecycle path. The probe accepts only a completed simulation or an EVM state revert; RPC, ABI, and payload-encoding errors remain blockers.";
  if (id === "registrarController.commitmentWindow") return "Approve a digest-bound policy for the deployed 0-120 second window: exact controller and age values, mode EXISTING_DEPLOYED_0_TO_120_ACCEPTED, riskAccepted=true, the three required controls, reviewer, timestamp and durable decision reference. A replacement controller remains future hardening.";
  if (id === "publicResolver.runtimeImmutables") return "Approve the resolver's actual immutable constructor addresses. If its trusted controller differs from the active registrar, require empty registration DNS data and on-chain owner/permission re-query before every DNS write after transfer.";
  if (id === "dc.configurationHistory") return "Bind the decoded initial tuple, active owner-controlled tuple, and archived change-control evidence to an immutable reference and SHA-256 digest; then rerun fresh on-chain reads.";
  if (/^nameWrapper\.(transfer|setResolver|setTTL)\.preconditions$/.test(id)) return "Restore an `eth_call`-compatible TLDNameWrapper path. The probe accepts only a completed simulation or an EVM ownership/fuse/authorization revert; RPC, ABI, and payload-encoding errors remain blockers.";
  if (id === "publicResolver.authorizationModel") return "Approve the deployed resolver artifact and record Registry, Name Wrapper, trusted controller, trusted reverse registrar, initial-registration DNS policy, mandatory post-transfer on-chain authorization re-query, reviewer, timestamp, immutable reference, and evidence SHA-256.";
  if (/^publicResolver\.setDNSRecords\..+\.preconditions$/.test(id)) return "Restore an `eth_call`-compatible PublicResolver DNS path. The probe accepts only a completed simulation or an EVM authorization/state revert; RPC, ABI, and DNS wire-payload errors remain blockers.";
  if (id === "ews.role") return "Approve `IN_MVP` or `OUT_OF_SCOPE` with source-backed rationale, named reviewer, timestamp, immutable decision reference, and evidence SHA-256.";
  if (id === "dns.parentControl") return "Identify the authorized `.country` parent-zone operator and bind the authenticated child-NS delegation mechanism to an immutable reference and SHA-256 digest.";
  if (id === "dns.projectDelegation") return "Provision three project nameservers, delegate a proof domain at the parent, validate a versioned dnsDelegation bundle, copy it into operational-evidence.js at the deployed source revision, record its bundleSha256 in the manifest, and rerun live recursive plus authoritative DNS checks.";
  if (id === "dns.powerDnsRollback") return "Run and document a PowerDNS failure test proving that the last valid zone remains authoritative; record the zone, distinct prior/failed revisions, zone/error digests, prior/served SOA serial, direct response from each project nameserver, operator, timestamp, immutable reference, and SHA-256.";
  if (id === "deployment.vercel") return "Deploy the approved source revision through the linked Vercel project using the frozen pnpm commands, verify the Vite app and Functions, then record deployment ID, URL, reviewer, timestamp, immutable reference, and evidence SHA-256.";
  if (id === "deployment.vercelHealth") return "Ensure the recorded Vercel deployment is reachable at /api/health and returns ok=true, Harmony Mainnet, all six configured contracts with bytecode, and the exact approved source revision.";
  if (id.startsWith("network.")) return "Restore the expected Harmony Mainnet RPC response and rerun the complete validation.";
  return "Resolve the failed invariant, attach durable evidence, and rerun the complete validation.";
}

function renderSupportingObservations(observations) {
  const lines = [];
  const vercel = observations?.vercel;
  const fork = observations?.replacementControllerFork;

  if (vercel?.deployment && vercel?.health && vercel?.phaseZero) {
    lines.push(`- Vercel latest-dev observation: \`${vercel.status || "unknown"}\` at ${vercel.observedAt || "unknown time"}; deployment \`${vercel.deployment.id || "unknown"}\`; immutable URL \`${vercel.deployment.immutableUrl || "unknown"}\`; health source revision \`${vercel.health.sourceRevision || "unknown"}\`; Phase 0 HTTP \`${vercel.phaseZero.httpStatus ?? "unknown"}\` (expected \`${vercel.phaseZero.expectedHttpStatus ?? "unknown"}\`) for \`${vercel.phaseZero.decision || "unknown"}/${vercel.phaseZero.writeMode || "unknown"}\`.`);
  }

  if (fork?.network && fork?.replacementController && fork?.forkRegistration) {
    lines.push(`- Replacement-controller fork exercise: \`${fork.status || "unknown"}\` at ${fork.generatedAt || "unknown time"}; local Anvil chain \`${fork.network.chainId || "unknown"}\` forked from Harmony block \`${fork.network.forkBlockNumber || "unknown"}\`; candidate \`${fork.replacementController.address || "unknown"}\` used commitment ages \`${fork.replacementController.minimumCommitmentAgeSeconds || "unknown"}–${fork.replacementController.maximumCommitmentAgeSeconds || "unknown"}\` seconds and completed a fork-only registration.`);
  }

  return lines.length ? lines : ["No supporting Vercel or replacement-controller-fork observation was available."];
}

function renderReport(result, provenance, observations) {
  const bytecode = result.checks.filter((item) => item.id.startsWith("bytecode.") && item.id.endsWith(".present"));
  const selectors = result.checks.filter((item) => item.id.startsWith("abi."));
  const blockerLines = result.blockers.length ? result.blockers.map((item) => `- **${item.id}** (${item.status}): ${item.summary}`) : ["None."];
  const exitConditionRows = result.blockers.map((item) => `| ${item.id} | ${markdownEscape(remediationForBlocker(item.id))} |`);
  const bytecodeRows = bytecode.map((item) => `| ${item.id.split(".")[1]} | ${item.evidence.address} | ${item.evidence.observedHash || "unavailable"} |`);
  const selectorRows = selectors.map((item) => `| ${item.id} | ${item.status} | ${markdownEscape(renderEvidence(item.evidence))} |`);
  const resultRows = result.checks.map((item) => `| ${item.id} | ${item.required ? "yes" : "no"} | ${item.status} | ${markdownEscape(item.summary)} | ${markdownEscape(renderEvidence(item.evidence))} |`);
  const provenanceRows = (provenance?.contracts || []).map((item) => `| ${item.component} | ${item.sourceVerified ? "yes" : "no"} | ${item.creationTransactionHash || "unavailable"} | ${item.sourcify?.status || "not checked"} | ${item.explorerRuntimeMatchesRpc ? "yes" : "no"} |`);
  return [
    "# Phase 0 Technical Discovery",
    "",
    "## Decision",
    "",
    `**${result.decision}** — generated ${result.checkedAt}; evidence expires ${result.expiresAt}.`,
    "",
    result.decision === "READY" ? "All required checks passed. Transaction execution remains out of scope for this validation release." : "Writes remain disabled. The blockers below must be resolved and the validation rerun before any transaction flow is enabled.",
    "",
    "## Network and deployed addresses",
    "",
    `- Network: Harmony Mainnet (chain ID ${result.chainId})`,
    `- Block queried: ${result.blockNumber || "unavailable"}`,
    "- RPC: configured server-side as `HARMONY_RPC_URL`",
    "- Contract bytecode reads, ABI reads, and no-state `eth_call` simulations are pinned to the block above for this run.",
    "",
    "| Component | Address | Runtime bytecode hash |",
    "| --- | --- | --- |",
    ...bytecodeRows,
    "",
    "## Contract provenance discovery",
    "",
    provenance
      ? `Snapshot generated ${provenance.generatedAt} at block ${provenance.blockNumber}. Explorer: \`${provenance.explorerApi}\`; Sourcify: \`${provenance.sourcifyRepository || "not checked"}\`.`
      : "No provenance snapshot was available. Run `npm run phase0:collect-provenance` before technical review.",
    "",
    "| Component | Explorer source verified | Creation transaction | Sourcify | Explorer runtime matches RPC |",
    "| --- | --- | --- | --- | --- |",
    ...provenanceRows,
    "",
    "An explorer/RPC bytecode match proves observation consistency only. It does not approve a baseline without reproducible source, deployment provenance, and explicit review.",
    "",
    "## Local bytecode reproduction",
    "",
    "`docs/phase-0-bytecode-reproduction.md` records local candidate builds. All six configured contracts have metadata-stripped or immutable-normalized runtime matches. EWS matches a historical 2023 source candidate; the newer 2026 source candidate does not. `docs/phase-0-creation-traces.json` adds first-code blocks, creation transactions, CREATE paths, and init-code digests verified through the archive RPC. `docs/phase-0-contract-trace-review-draft.json` ties each archived CREATE output to the current Harmony runtime. These results strengthen technical provenance but do not replace an approved artifact/constructor review and explicit approval.",
    "",
    "## Supporting observations (not manifest evidence)",
    "",
    ...renderSupportingObservations(observations),
    "",
    "These observations are diagnostic only. A local fork does not authorize a Mainnet deployment, and a mutable latest-dev alias does not satisfy the immutable deployment/reviewer requirements of the production gate.",
    "",
    "## Required blockers",
    "",
    ...blockerLines,
    "",
    "## Exact conditions to change the decision",
    "",
    "| Blocker | Required evidence or action |",
    "| --- | --- |",
    ...exitConditionRows,
    ...(exitConditionRows.length ? [] : ["| None | All required checks already pass. |"]),
    "",
    "## ABI and selector probes",
    "",
    "| Check | Status | Evidence |",
    "| --- | --- | --- |",
    ...selectorRows,
    "",
    "## Full validation results",
    "",
    "| Check | Required | Status | Result | Evidence |",
    "| --- | --- | --- | --- | --- |",
    ...resultRows,
    "",
    "## Legacy configuration divergence",
    "",
    "`contracts/.env.example` contains legacy RegistrarController, NameWrapper, BaseRegistrar and Resolver addresses. This validation uses only the six deployed addresses configured in `app/api/_lib/config.js`; the legacy file is not an authority for the active application.",
    "",
    "## DNS public-operation boundary",
    "",
    "The validator resolves public `.country` parent nameservers and, once DNS evidence is approved, queries every parent authority for the probe NS delegation and every project nameserver for the probe SOA. Project nameservers, parent-control evidence, the delegated probe domain, and rollback evidence must still be approved in `api/_lib/phase-zero/evidence-manifest.js`. A DNS record stored on-chain or inside a PowerDNS zone does not alter parent delegation. PowerDNS rollback evidence must prove that a failed publication leaves the last valid zone served.",
    "",
    "## Security boundary",
    "",
    "The commitment secret is browser-local only. This validator uses RPC reads and `eth_call` simulations; it sends no transaction and has no wallet/private-key access. Reown analytics remain disabled, CSP is defined in `vercel.json`, and approval evidence is versioned server-side rather than exposed through `VITE_` variables.",
    "",
    "## How to rerun",
    "",
    "```bash",
    "cd app",
    "npm run phase0:validate",
    "```",
    "",
    "The report is only evidence for the current configured endpoints. A changed RPC, bytecode hash, missing DNS evidence, unavailable RPC, failed ABI probe, or expired gate evidence must result in **BLOCKED**.",
    "",
  ].join("\n");
}

async function optionalJson(relativePath) {
  try {
    return JSON.parse(await readFile(new URL(relativePath, import.meta.url), "utf8"));
  } catch {
    return null;
  }
}

const [provenance, vercel, replacementControllerFork] = await Promise.all([
  optionalJson("../docs/phase-0-provenance-snapshot.json"),
  optionalJson("../docs/phase-0-vercel-inspection-observation.json"),
  optionalJson("../docs/phase-0-replacement-controller-fork-simulation.json"),
]);
const result = await inspectPhaseZero();
await writeFile(new URL("../docs/phase-0-discovery.md", import.meta.url), renderReport(result, provenance, { vercel, replacementControllerFork }));
console.log(`Phase 0 decision: ${result.decision}`);
for (const blocker of result.blockers) console.log(`BLOCKED ${blocker.id}: ${blocker.summary}`);
