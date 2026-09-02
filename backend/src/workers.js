import { getPhaseZeroGate } from "./runtime.js";

export function createWorkers({ config, db }) {
  function status() {
    return {
      indexerEnabled: config.indexerEnabled,
      powerDnsPublisherEnabled: config.powerDnsPublisherEnabled,
      databaseConfigured: db.configured,
      policy: "Workers are fail-closed: they require a READY Phase 0 decision, PostgreSQL, and explicit service enablement.",
    };
  }

  async function runOnce() {
    const gate = await getPhaseZeroGate();
    if (gate.decision !== "READY") {
      return { ok: false, status: "blocked_phase_0", phaseZero: gate.decision, blockers: gate.blockers };
    }
    if (!db.configured) return { ok: false, status: "blocked_database", error: "DATABASE_URL is not configured." };
    if (!config.indexerEnabled) return { ok: false, status: "disabled_indexer", ...status() };
    if (!config.powerDnsPublisherEnabled) {
      return {
        ok: false,
        status: "disabled_powerdns",
        ...status(),
        message: "Harmony indexing is not started because DNS publication has not been explicitly enabled with verified delegation and rollback evidence.",
      };
    }
    return {
      ok: false,
      status: "not_implemented",
      ...status(),
      message: "Event decoding and PowerDNS writes remain disabled until their operational runbook is executed. No database or DNS mutation was made.",
    };
  }

  return { status, runOnce };
}
