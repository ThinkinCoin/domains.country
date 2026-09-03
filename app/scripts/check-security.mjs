import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function requireInvariant(condition, message) {
  if (!condition) failures.push(message);
}

async function text(relativePath) {
  return readFile(path.join(root, relativePath), "utf8");
}

async function sourceFiles(relativePath) {
  const directory = path.join(root, relativePath);
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return sourceFiles(child);
    return /\.(?:js|jsx|mjs|html)$/i.test(entry.name) ? [child] : [];
  }));
  return nested.flat();
}

const [vercelConfig, appkit, journal, draft, envExample, packageJson, clientFiles, apiFiles] = await Promise.all([
  text("vercel.json"),
  text("src/lib/appkit.js"),
  text("src/lib/commit-journal.js"),
  text("src/lib/registration-draft.js"),
  text(".env.example"),
  text("package.json"),
  sourceFiles("src"),
  sourceFiles("api"),
]);

const csp = JSON.parse(vercelConfig).headers
  ?.flatMap((rule) => rule.headers || [])
  .find((header) => header.key === "Content-Security-Policy")?.value || "";
requireInvariant(csp.includes("default-src 'self'"), "CSP must default to self.");
requireInvariant(csp.includes("script-src 'self' 'wasm-unsafe-eval'"), "CSP must restrict scripts to self and the WebAssembly exception.");
requireInvariant(!csp.includes("'unsafe-eval'"), "CSP must not allow unsafe-eval.");
requireInvariant(csp.includes("font-src 'self' data: https://fonts.reown.com"), "CSP must restrict fonts to local assets, data URLs, and Reown AppKit fonts.");
requireInvariant(!/script-src[^;]*(?:https:|http:|\*)/i.test(csp), "CSP must not allow external script origins.");
requireInvariant(/analytics\s*:\s*false/.test(appkit), "Reown AppKit analytics must remain disabled.");
requireInvariant(!/(posthog|mixpanel|amplitude|google-analytics|googletagmanager)/i.test(packageJson), "No third-party analytics package may be configured.");
requireInvariant(!/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\b/.test(journal), "The commitment journal must not send data over a network API.");
requireInvariant(!/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket)\b/.test(draft), "Registration draft preparation must not send the commitment secret over a network API.");

const apiSource = (await Promise.all(apiFiles.map(async (file) => `${file}\n${await text(file)}`))).join("\n");
requireInvariant(!/from\s+["'][^"']*commit-journal|import\([^)]*commit-journal|window\.localStorage|\blocalStorage\.(?:getItem|setItem|removeItem)|domains\.country\.commit-journal/i.test(apiSource), "Vercel Functions must not use browser commitment-journal storage.");

const clientSource = (await Promise.all([...clientFiles, "index.html"].map(async (file) => `${file}\n${await text(file)}`))).join("\n");
requireInvariant(!/import\.meta\.env\.PHASE_ZERO_/i.test(clientSource), "Phase 0 server controls must not enter the Vite client bundle.");
requireInvariant(!/process\.env\b/.test(clientSource), "The Vite client source must not read server process.env values.");
requireInvariant(!/<script[^>]+src=["']https?:\/\//i.test(clientSource), "The client must not load third-party scripts.");
requireInvariant(clientSource.includes("Current commitment window: 0–120 seconds"), "The registration UI must disclose the deployed 0–120 second commitment window.");
requireInvariant(clientSource.includes("does not enforce a delay after commitment"), "The registration UI must disclose that the deployed controller has no enforced commitment delay.");

const publicEnvironmentKeys = [...envExample.matchAll(/^([A-Z0-9_]+)=/gm)].map((match) => match[1]).filter((key) => key.startsWith("VITE_"));
requireInvariant(publicEnvironmentKeys.every((key) => !/(SECRET|PRIVATE|MNEMONIC|PASSWORD|TOKEN)/i.test(key)), "VITE_ variables must not contain private material.");

if (failures.length) {
  for (const failure of failures) console.error(`SECURITY CHECK FAILED: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Security preflight passed: CSP, client environment, commitment isolation, and analytics checks across ${clientFiles.length + apiFiles.length} source files.`);
}
