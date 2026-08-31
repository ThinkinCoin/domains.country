import { getDomainSummary } from "../_lib/contracts.js";
import { json } from "../_lib/http.js";

export async function GET(request) {
  const url = new URL(request.url);
  const parts = url.pathname.split("/");
  const rawName = decodeURIComponent(parts[parts.length - 1] || "");
  const durationYears = Number(url.searchParams.get("durationYears") || "1");

  const summary = await getDomainSummary(rawName, durationYears);
  return json(summary, summary.valid ? 200 : 400);
}
