import assert from "node:assert/strict";
import test from "node:test";
import { backendConfigurationProblems, loadBackendConfig } from "../src/config.js";

test("production backend fails closed without private Railway configuration", () => {
  const env = { NODE_ENV: "production" };
  const config = loadBackendConfig(env);
  const problems = backendConfigurationProblems(config, env);
  assert.ok(problems.some((message) => message.startsWith("DATABASE_URL")));
  assert.ok(problems.some((message) => message.startsWith("HARMONY_RPC_URL")));
  assert.ok(problems.some((message) => message.startsWith("ADMIN_NONCE_SECRET")));
  assert.ok(problems.some((message) => message.startsWith("WORKER_AUTH_SECRET")));
});

test("preview defaults only permit explicit application origins", () => {
  const config = loadBackendConfig({});
  assert.deepEqual(config.corsAllowedOrigins, ["http://localhost:5173", "https://domains.country", "https://dev.domains.country"]);
});
