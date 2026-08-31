import { writeFile } from "node:fs/promises";
import { inspectPhaseZero } from "../api/_lib/phase-zero/index.js";

function markdownEscape(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderEvidence(evidence) {
  const entries = Object.entries(evidence || {});
  return entries.length ? entries.map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : value}`).join("; ") : "—";
}

function renderReport(result) {
  const bytecode = result.checks.filter((item) => item.id.startsWith("bytecode.") && item.id.endsWith(".present"));
  const selectors = result.checks.filter((item) => item.id.startsWith("abi."));
  const blockerLines = result.blockers.length ? result.blockers.map((item) => `- **${item.id}** (${item.status}): ${item.summary}`) : ["None."];
  const bytecodeRows = bytecode.map((item) => `| ${item.id.split(".")[1]} | ${item.evidence.address} | ${item.evidence.observedHash || "unavailable"} |`);
  const selectorRows = selectors.map((item) => `| ${item.id} | ${item.status} | ${markdownEscape(renderEvidence(item.evidence))} |`);
  const resultRows = result.checks.map((item) => `| ${item.id} | ${item.required ? "yes" : "no"} | ${item.status} | ${markdownEscape(item.summary)} | ${markdownEscape(renderEvidence(item.evidence))} |`);
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
    "## Required blockers",
    "",
    ...blockerLines,
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
    "The validator resolves public `.country` parent nameservers, but it cannot establish project delegation without server-side `PHASE_ZERO_PROJECT_NAMESERVERS` and `PHASE_ZERO_DELEGATION_PROBE_DOMAIN`. A DNS record stored on-chain or inside a PowerDNS zone does not alter parent delegation. `PHASE_ZERO_POWERDNS_ROLLBACK_EVIDENCE` must identify the approved procedure that preserves the last valid zone when publication fails.",
    "",
    "## Security boundary",
    "",
    "The commitment secret is browser-local only. This validator uses RPC reads and `eth_call` simulations; it sends no transaction and has no wallet/private-key access. Reown analytics remain disabled, CSP is defined in `vercel.json`, and Phase 0 evidence variables are server-only.",
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

const result = await inspectPhaseZero();
await writeFile(new URL("../docs/phase-0-discovery.md", import.meta.url), renderReport(result));
console.log(`Phase 0 decision: ${result.decision}`);
for (const blocker of result.blockers) console.log(`BLOCKED ${blocker.id}: ${blocker.summary}`);
