import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

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

function normalizePreviewUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".vercel.app") || url.username || url.password || url.search || url.hash) {
    throw new Error("--url must be an HTTPS Vercel deployment URL without credentials, query parameters, or fragments.");
  }
  return url.origin;
}

function requireRevision(value) {
  if (!/^[0-9a-f]{40}$/i.test(value || "")) throw new Error("--expected-source-revision must be a full 40-character Git revision.");
  return value.toLowerCase();
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { redirect: "error", signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

const rawUrl = argument("--url");
const expectedSourceRevision = requireRevision(argument("--expected-source-revision"));
const outputPath = argument("--output");
if (!rawUrl) throw new Error("Usage: npm run phase0:verify-vercel-preview -- --url <https://deployment.vercel.app> --expected-source-revision <40-char-git-sha> [--output <snapshot.json>]");

const previewUrl = normalizePreviewUrl(rawUrl);
const [pageResponse, healthResponse] = await Promise.all([
  fetchWithTimeout(`${previewUrl}/`),
  fetchWithTimeout(`${previewUrl}/api/health`),
]);
const [pageHtml, health] = await Promise.all([
  pageResponse.text(),
  healthResponse.json(),
]);

if (!pageResponse.ok) throw new Error(`Preview root returned HTTP ${pageResponse.status}.`);
if (!healthResponse.ok || health?.ok !== true) throw new Error(`Preview health returned HTTP ${healthResponse.status} or ok != true.`);
if (!pageHtml.includes('<div id="root"></div>')) throw new Error("Preview root did not return the expected Vite application shell.");
if (!String(pageResponse.headers.get("content-security-policy") || "").includes("default-src 'self'")) throw new Error("Preview response is missing the expected restrictive CSP default-src directive.");
if (health.chainId !== HARMONY_CHAIN_ID || health.expectedChainId !== HARMONY_CHAIN_ID) throw new Error("Preview health does not report Harmony Mainnet as both actual and expected chain.");
if (health.sourceRevision?.toLowerCase() !== expectedSourceRevision) throw new Error(`Preview source revision ${health.sourceRevision || "missing"} does not match ${expectedSourceRevision}.`);

const expectedContracts = Object.entries(contractAddresses).map(([component, address]) => ({ component, address: address.toLowerCase() }));
for (const expected of expectedContracts) {
  const actual = health.contracts?.find((contract) => contract?.component === expected.component);
  if (!actual || String(actual.address || "").toLowerCase() !== expected.address || actual.bytecodePresent !== true) {
    throw new Error(`Preview health has no matching bytecode-present contract for ${expected.component}.`);
  }
}

const observation = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  observedAt: new Date().toISOString(),
  previewUrl,
  expectedSourceRevision,
  root: {
    status: pageResponse.status,
    contentType: pageResponse.headers.get("content-type"),
    cacheControl: pageResponse.headers.get("cache-control"),
    robots: pageResponse.headers.get("x-robots-tag"),
    cspSha256: createHash("sha256").update(pageResponse.headers.get("content-security-policy") || "").digest("hex"),
    viteApplicationShell: true,
  },
  health: {
    chainId: health.chainId,
    expectedChainId: health.expectedChainId,
    sourceRevision: health.sourceRevision,
    contracts: health.contracts,
  },
  approvalBoundary: "This proves a live preview response only. It does not provide a Vercel deployment ID, build logs, immutable approval reference, reviewer approval, or permission to set deployment.status to VERIFIED.",
};
const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
