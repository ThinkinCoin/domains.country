import { contractManifest } from "../_lib/config.js";
import { json } from "../_lib/http.js";

export async function GET() {
  return json({
    ok: false,
    status: "not_configured",
    message: "Indexer and PowerDNS publication are intentionally disabled until PostgreSQL, delegation, and Phase 0 validation are configured.",
    next: [
      "Add PostgreSQL checkpoint storage.",
      "Process Harmony events in short idempotent batches.",
      "Publish only after ownership and permissions are re-read from chain.",
      "Keep the last valid PowerDNS zone active when publication fails.",
    ],
    manifest: contractManifest(),
  }, 503);
}
