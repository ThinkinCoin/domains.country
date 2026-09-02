import {
  createChallenge,
  listAllowlist,
  pilotEligibility,
  requireAdmin,
  setAdminCookie,
  upsertAllowlist,
  verifyChallenge,
} from "./admin.js";
import {
  contractAddresses,
  contractManifest,
  getDomainSummary,
  getPhaseZeroGate,
  HARMONY_CHAIN_ID,
  HARMONY_RPC_URL,
  parseCountryDomain,
} from "./runtime.js";

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

async function rpc(method, params) {
  const response = await fetch(HARMONY_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error?.message || "RPC " + method + " failed");
  return payload.result;
}

export function registerRoutes(app, { config, db, workers }) {
  app.get("/api/health", asyncRoute(async (_request, response) => {
    try {
      const [chainIdHex, contracts, database] = await Promise.all([
        rpc("eth_chainId", []),
        Promise.all(Object.entries(contractAddresses).map(async ([component, address]) => {
          const bytecode = await rpc("eth_getCode", [address, "latest"]);
          return { component, address, bytecodePresent: Boolean(bytecode && bytecode !== "0x") };
        })),
        db.health(),
      ]);
      const chainId = Number.parseInt(chainIdHex, 16);
      const ok = chainId === HARMONY_CHAIN_ID && contracts.every((contract) => contract.bytecodePresent) && database.ok;
      response.status(ok ? 200 : 503).json({
        ok,
        chainId,
        expectedChainId: HARMONY_CHAIN_ID,
        contracts,
        database,
        manifest: contractManifest(),
        sourceRevision: config.sourceRevision,
      });
    } catch (error) {
      response.status(503).json({
        ok: false,
        error: error instanceof Error ? error.message : "Health check failed.",
        manifest: contractManifest(),
        sourceRevision: config.sourceRevision,
      });
    }
  }));

  app.get("/health", (_request, response) => response.redirect(308, "/api/health"));

  app.get("/api/phase-zero", asyncRoute(async (_request, response) => {
    const result = await getPhaseZeroGate();
    response.status(result.decision === "READY" || result.writeMode === "enabled_dev" ? 200 : 503).json(result);
  }));

  app.get("/api/domains/:name", asyncRoute(async (request, response) => {
    const summary = await getDomainSummary(request.params.name, Number(request.query.durationYears || "1"));
    response.status(summary.valid ? 200 : 400).json(summary);
  }));

  app.get("/api/pilot/eligibility", asyncRoute(async (request, response) => {
    const gate = await getPhaseZeroGate();
    response.json(await pilotEligibility(String(request.query.wallet || ""), String(request.query.name || ""), db, gate));
  }));

  app.post("/api/admin/auth/challenge", asyncRoute(async (request, response) => {
    response.json(await createChallenge(request.body || {}, db, config));
  }));

  app.post("/api/admin/auth/verify", asyncRoute(async (request, response) => {
    const { address, session } = await verifyChallenge(request.body || {}, db, config);
    setAdminCookie(response, session, config.production);
    response.json({ ok: true, address });
  }));

  app.get("/api/admin/allowlist", asyncRoute(async (request, response) => {
    requireAdmin(request, config);
    response.json({ entries: await listAllowlist(db) });
  }));

  app.post("/api/admin/allowlist", asyncRoute(async (request, response) => {
    const actor = requireAdmin(request, config);
    response.json({ entry: await upsertAllowlist(request.body, actor, db) });
  }));

  app.get("/api/dns/publication", asyncRoute(async (request, response) => {
    const parsed = parseCountryDomain(request.query.name);
    if (!parsed.ok) {
      response.status(400).json({ error: parsed.reason });
      return;
    }
    const query = "SELECT d.name, " +
      "oc.version AS onchain_version, oc.block_number AS onchain_block, " +
      "oc.transaction_hash AS onchain_transaction_hash, oc.confirmations AS onchain_confirmations, " +
      "p.status AS publication_status, p.published_version AS published_version, " +
      "p.zone_serial AS zone_serial, p.last_error AS last_error, " +
      "p.updated_at AS published_updated_at FROM domains d " +
      "LEFT JOIN LATERAL (SELECT * FROM onchain_domain_states WHERE domain_id = d.id ORDER BY version DESC LIMIT 1) oc ON true " +
      "LEFT JOIN published_zone_states p ON p.domain_id = d.id WHERE d.name = $1";
    const { rows } = await db.query(query, [parsed.name]);
    response.json({
      domain: parsed.name,
      publication: rows[0] || null,
      worker: workers.status(),
      rule: "After transfer, the worker must re-read owner, wrapper data, fuses, resolver, and TTL from Harmony before accepting or publishing DNS changes.",
    });
  }));

  app.get("/api/cron/indexer", (_request, response) => {
    response.status(503).json({
      ok: false,
      status: "moved_to_railway_worker",
      message: "Indexer and PowerDNS publication are coordinated by the Railway worker service, not by Vercel Functions.",
      worker: workers.status(),
    });
  });

  app.post("/internal/workers/indexer/run", asyncRoute(async (request, response) => {
    if (request.get("x-worker-secret") !== config.workerAuthSecret || config.workerAuthSecret.length < 32) {
      response.status(401).json({ error: "Unauthorized worker request." });
      return;
    }
    response.json(await workers.runOnce());
  }));
}
