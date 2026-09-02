import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

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

function vercelInspectCommands() {
  if (process.env.VERCEL_CLI_PATH) {
    return [{ command: process.env.VERCEL_CLI_PATH, prefixArgs: [], label: process.env.VERCEL_CLI_PATH }];
  }
  return [
    { command: "vercel", prefixArgs: [], label: "vercel" },
    { command: "pnpm", prefixArgs: ["dlx", "vercel@59.3.0"], label: "pnpm dlx vercel@59.3.0" },
  ];
}

async function inspectDeployment(inputUrl) {
  const failures = [];
  for (const candidate of vercelInspectCommands()) {
    try {
      const args = [...candidate.prefixArgs, "inspect", inputUrl, "--json"];
      const { stdout } = await execFileAsync(candidate.command, args, { maxBuffer: 2 * 1024 * 1024 });
      return { inspection: parseInspectOutput(stdout), commandLabel: candidate.label };
    } catch (error) {
      failures.push({
        command: candidate.label,
        message: error.message,
        stderr: error.stderr || null,
      });
    }
  }
  const details = failures.map((failure) => `${failure.command}: ${failure.message}`).join(" | ");
  const error = new Error(`Could not inspect Vercel deployment with any configured command. ${details}`);
  error.failures = failures;
  throw error;
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
const { inspection, commandLabel } = await inspectDeployment(inputUrl);
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

const pageResponse = await fetchWithTimeout(`${immutableDeploymentUrl}/`);
const pageHtml = await pageResponse.text();
if (!pageResponse.ok) throw new Error(`Deployment root returned HTTP ${pageResponse.status}.`);
if (!pageHtml.includes('<div id="root"></div>')) throw new Error("Deployment root did not return the expected Vite application shell.");
if (!String(pageResponse.headers.get("content-security-policy") || "").includes("default-src 'self'")) throw new Error("Deployment response is missing the expected restrictive CSP default-src directive.");
const validationErrors = [];

const observation = {
  schemaVersion: 1,
  status: validationErrors.length === 0 ? "DISCOVERY_ONLY" : "BLOCKED_OBSERVATION",
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
  inspection: {
    command: commandLabel,
  },
  frontend: {
    status: pageResponse.status,
    contentType: pageResponse.headers.get("content-type"),
    cacheControl: pageResponse.headers.get("cache-control"),
    cspSha256: createHash("sha256").update(pageResponse.headers.get("content-security-policy") || "").digest("hex"),
    viteApplicationShell: true,
  },
  validationErrors,
  backendBoundary: "Contract health, Phase 0 gate status, indexing, allowlist, and DNS publication are verified by the Railway API, not the Vercel frontend.",
  approvalBoundary: "This is a read-only Vercel frontend deployment observation. It does not provide a named reviewer, a committed immutable approval reference, backend health, contract approval, operational DNS evidence, or permission to set deployment.status to VERIFIED.",
};
const output = { ...observation, evidenceSha256: sha256Json(observation) };
if (outputPath) await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output, null, 2));
if (validationErrors.length > 0) process.exitCode = 1;
