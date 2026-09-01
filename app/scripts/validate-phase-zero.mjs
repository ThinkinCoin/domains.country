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
  if (id === "evidence.manifest.approval") return "Record a named, dated top-level technical approval after every required evidence entry passes.";
  if (/^bytecode\..+\.baseline$/.test(id)) return "Reproduce the deployed runtime from a verified source/artifact and deployment record, then approve its exact hash in the versioned manifest.";
  if (id === "registrarController.abiProvenance") return "Approve the deployed RegistrarController ABI artifact with `baseExtension()` as the accessor and `country` as its expected value.";
  if (id === "registrarController.commitmentWindow") return "Deploy or configure an approved controller with a non-zero minimum commitment age and a maximum greater than the minimum; then update the configured address and evidence.";
  if (id === "publicResolver.runtimeImmutables") return "Use a resolver whose trusted controller and Name Wrapper match the configured deployment, or complete a reviewed migration that proves an equivalent safe authorization path.";
  if (id === "publicResolver.authorizationModel") return "Approve the deployed resolver artifact and record Registry, Name Wrapper, trusted controller, trusted reverse registrar, reviewer, timestamp, and immutable reference.";
  if (id === "ews.role") return "Approve `IN_MVP` or `OUT_OF_SCOPE` with source-backed rationale, named reviewer, timestamp, and immutable decision reference.";
  if (id === "dns.parentControl") return "Identify the authorized `.country` parent-zone operator and document the authenticated mechanism used to create or update child NS delegation.";
  if (id === "dns.projectDelegation") return "Provision three project nameservers, delegate a proof domain at the parent, and record an immutable delegation test reference.";
  if (id === "dns.powerDnsRollback") return "Run and document a PowerDNS failure test proving that the last valid published zone remains authoritative; record operator, timestamp, evidence reference, and SHA-256.";
  if (id.startsWith("network.")) return "Restore the expected Harmony Mainnet RPC response and rerun the complete validation.";
  return "Resolve the failed invariant, attach durable evidence, and rerun the complete validation.";
}

function renderReport(result, provenance) {
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
    "`docs/phase-0-bytecode-reproduction.md` records local candidate builds. RegistrarController, DC, BaseRegistrar, TLDNameWrapper, and PublicResolver have metadata-stripped or immutable-normalized runtime matches. EWS does not match its currently known public candidate source. These results strengthen technical provenance but do not replace deployment transaction evidence or explicit approval.",
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
    "The validator resolves public `.country` parent nameservers, but project nameservers, parent-control evidence, the delegated probe domain, and rollback evidence must be approved in `api/_lib/phase-zero/evidence-manifest.js`. A DNS record stored on-chain or inside a PowerDNS zone does not alter parent delegation. PowerDNS rollback evidence must prove that a failed publication leaves the last valid zone served.",
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

let provenance = null;
try {
  provenance = JSON.parse(await readFile(new URL("../docs/phase-0-provenance-snapshot.json", import.meta.url), "utf8"));
} catch {
  // Missing or invalid discovery evidence is reported in the generated document.
}
const result = await inspectPhaseZero();
await writeFile(new URL("../docs/phase-0-discovery.md", import.meta.url), renderReport(result, provenance));
console.log(`Phase 0 decision: ${result.decision}`);
for (const blocker of result.blockers) console.log(`BLOCKED ${blocker.id}: ${blocker.summary}`);
