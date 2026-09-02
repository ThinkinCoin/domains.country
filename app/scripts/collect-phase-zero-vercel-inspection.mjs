import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { contractAddresses, HARMONY_CHAIN_ID } from "../api/_lib/config.js";

const execFileAsync = promisify(execFile);

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

function normalizeDeploymentInput(value) {
  const url = new URL(value);
  const allowedHost = url.hostname.endsWith(".vercel.app") || url.hostname === "dev.domains.country";
  if (url.protocol !== "https:" || !allowedHost || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--url must be an HTTPS Vercel deployment URL or the dev.domains.country alias without a path, credentials, query parameters, or fragments.");
  }
  return url.origin;
}

function requireRevision(value) {
  if (!/^[0-9a-f]{40}$/i.test(value || "")) throw new Error("--expected-source-revision must be a full 40-character Git revision.");
  return value.toLowerCase();
}

function parseInspectOutput(stdout) {
  const start = stdout.indexOf("{");
  if (start === -1) throw new Error("vercel inspect did not return JSON output.");
  try {
    return JSON.parse(stdout.slice(start));
  } catch (error) {
    throw new Error(`Could not parse vercel inspect JSON: ${error.message}`);
  }
}

function requireImmutableVercelUrl(value) {
  const url = new URL(`https://${value}`);
  if (!url.hostname.endsWith(".vercel.app")) throw new Error(`Vercel inspect returned a non-immutable deployment hostname: ${value || "missing"}.`);
  return url.origin;
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
if (!rawUrl) throw new Error("Usage: npm run phase0:collect-vercel-inspection -- --url <https://deployment.vercel.app|https://dev.domains.country> --expected-source-revision <40-char-git-sha> [--output <snapshot.json>]");

const inputUrl = normalizeDeploymentInput(rawUrl);
const vercelCliPath = process.env.VERCEL_CLI_PATH || "vercel";
const { stdout } = await execFileAsync(vercelCliPath, ["inspect", inputUrl, "--json"], { maxBuffer: 2 * 1024 * 1024 });
const inspection = parseInspectOutput(stdout);
const immutableDeploymentUrl = requireImmutableVercelUrl(inspection.url);
const build = inspection.builds?.find((candidate) => candidate?.deploymentId === inspection.id) || inspection.builds?.[0];

if (!/^dpl_[A-Za-z0-9]+$/.test(inspection.id || "")) throw new Error("Vercel inspect did not return a valid deployment ID.");
if (inspection.readyState !== "READY") throw new Error(`Deployment ${inspection.id} is not READY: ${inspection.readyState || "missing"}.`);
if (inspection.target !== "preview") throw new Error(`Expected a preview deployment, received target ${inspection.target || "missing"}.`);
if (!build || !/^bld_[A-Za-z0-9]+$/.test(build.id || "")) throw new Error("Vercel inspect did not return a valid build record.");
if (build.readyState !== "READY") throw new Error(`Build ${build.id} is not READY: ${build.readyState || "missing"}.`);
if (build.config?.framework !== "vite") throw new Error(`Expected Vite framework, received ${build.config?.framework || "missing"}.`);
if (build.config?.installCommand !== "pnpm install --frozen-lockfile") throw new Error("Vercel install command differs from the locked Phase 0 build command.");
if (build.config?.buildCommand !== "pnpm build") throw new Error("Vercel build command differs from the Phase 0 build command.");
if (build.config?.outputDirectory !== "dist/client") throw new Error("Vercel output directory differs from dist/client.");

const healthResponse = await fetchWithTimeout(`${immutableDeploymentUrl}/api/health`);
const health = await healthResponse.json();
if (!healthResponse.ok || health?.ok !== true) throw new Error(`Deployment health returned HTTP ${healthResponse.status} or ok != true.`);
if (health.chainId !== HARMONY_CHAIN_ID || health.expectedChainId !== HARMONY_CHAIN_ID) throw new Error("Deployment health does not report Harmony Mainnet as both actual and expected chain.");
if (health.sourceRevision?.toLowerCase() !== expectedSourceRevision) throw new Error(`Deployment source revision ${health.sourceRevision || "missing"} does not match ${expectedSourceRevision}.`);

for (const [component, address] of Object.entries(contractAddresses)) {
  const actual = health.contracts?.find((contract) => contract?.component === component);
  if (!actual || String(actual.address || "").toLowerCase() !== address.toLowerCase() || actual.bytecodePresent !== true) {
    throw new Error(`Deployment health has no matching bytecode-present contract for ${component}.`);
  }
}

const observation = {
  schemaVersion: 1,
  status: "DISCOVERY_ONLY",
  observedAt: new Date().toISOString(),
  inputUrl,
  deployment: {
    id: inspection.id,
    immutableUrl: immutableDeploymentUrl,
    target: inspection.target,
    readyState: inspection.readyState,
    createdAt: inspection.createdAt,
    regions: inspection.regions,
  },
  build: {
    id: build.id,
    readyState: build.readyState,
    framework: build.config.framework,
    installCommand: build.config.installCommand,
    buildCommand: build.config.buildCommand,
    outputDirectory: build.config.outputDirectory,
  },
  health: {
    chainId: health.chainId,
    expectedChainId: health.expectedChainId,
    sourceRevision: health.sourceRevision,
    contracts: health.contracts,
  },
  approvalBoundary: "This is a read-only Vercel deployment observation. It does not provide a named reviewer, a committed immutable approval reference, contract approval, operational DNS evidence, or permission to set deployment.status to VERIFIED.",
};
const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
