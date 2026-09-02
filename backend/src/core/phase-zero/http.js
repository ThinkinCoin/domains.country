export function phaseZeroHttpStatus(result) {
  return result?.decision === "READY" || result?.writeMode === "enabled_dev" ? 200 : 503;
}
