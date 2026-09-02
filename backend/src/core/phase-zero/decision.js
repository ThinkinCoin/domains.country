export const PHASE_ZERO_STATUS = Object.freeze({ PASS: "PASS", FAIL: "FAIL", WARN: "WARN", UNKNOWN: "UNKNOWN" });

export function determinePhaseZeroDecision(checks, now = new Date()) {
  const blockers = checks.filter((item) => item.required && item.status !== PHASE_ZERO_STATUS.PASS);
  return {
    decision: blockers.length ? "BLOCKED" : "READY",
    checkedAt: now.toISOString(),
    blockers: blockers.map((item) => ({ id: item.id, summary: item.summary, status: item.status })),
  };
}
