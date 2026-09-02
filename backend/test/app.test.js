import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app.js";

function testConfig() {
  return {
    production: false,
    port: 0,
    sourceRevision: null,
    databaseUrl: "",
    harmonyRpcUrl: "https://api.harmony.one",
    corsAllowedOrigins: ["https://domains.country"],
    adminNonceSecret: "",
    adminOperators: [],
    workerAuthSecret: "",
    indexerEnabled: false,
    powerDnsPublisherEnabled: false,
    minConfirmations: 12,
    powerDns: { apiUrl: "", apiKey: "", serverId: "localhost", nameservers: [] },
  };
}

test("serves the Railway worker contract with exact CORS", async () => {
  const db = {
    configured: false,
    health: async () => ({ ok: false, error: "DATABASE_URL is not configured." }),
    query: async () => ({ rows: [] }),
    close: async () => {},
  };
  const { app } = createApp({ config: testConfig(), db });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
  });

  try {
    const address = server.address();
    const response = await fetch("http://127.0.0.1:" + address.port + "/api/cron/indexer", {
      headers: { Origin: "https://domains.country" },
    });
    const payload = await response.json();
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://domains.country");
    assert.equal(payload.status, "moved_to_railway_worker");

    const rejected = await fetch("http://127.0.0.1:" + address.port + "/api/cron/indexer", {
      headers: { Origin: "https://untrusted.example" },
    });
    assert.equal(rejected.status, 403);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
