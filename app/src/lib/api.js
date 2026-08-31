const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export async function getDomainSummary(name, durationYears = 1) {
  const path = `/api/domains/${encodeURIComponent(name)}?durationYears=${durationYears}`;
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: "application/json" } });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.warnings?.[0] || payload?.error || "Unable to load domain information.";
    throw new Error(message);
  }

  return payload;
}
