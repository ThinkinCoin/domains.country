import { getPhaseZeroGate } from "./_lib/phase-zero/index.js";
import { json } from "./_lib/http.js";

export function phaseZeroHttpStatus(result) {
  return result?.decision === "READY" || result?.writeMode === "enabled_dev" ? 200 : 503;
}

export async function GET() {
  const result = await getPhaseZeroGate();
  // A development bypass is explicit, non-production-only and still includes
  // the original blockers. Treat it as a usable development response so the
  // Vite client can surface those blockers instead of handling a false outage.
  return json(result, phaseZeroHttpStatus(result));
}
