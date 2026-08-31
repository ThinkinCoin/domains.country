import { getPhaseZeroGate } from "./_lib/phase-zero/index.js";
import { json } from "./_lib/http.js";

export async function GET() {
  const result = await getPhaseZeroGate();
  return json(result, result.decision === "READY" ? 200 : 503);
}
