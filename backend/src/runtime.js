/**
 * Transitional server-core boundary. Vite never imports this module.
 *
 * Phase 0 and Harmony read logic remain in one source of truth while the
 * Vercel endpoint wrappers are replaced by Express routes.
 */
export { contractAddresses, contractManifest, HARMONY_CHAIN_ID, HARMONY_RPC_URL } from "../../app/api/_lib/config.js";
export { getDomainSummary } from "../../app/api/_lib/contracts.js";
export { parseCountryDomain } from "../../app/api/_lib/names.js";
export { getPhaseZeroGate } from "../../app/api/_lib/phase-zero/index.js";
