// This core is copied into the Railway deployment context. It must not import
// the Vite package, which Railway does not include when backend/ is its root.
export { contractAddresses, contractManifest, HARMONY_CHAIN_ID, HARMONY_RPC_URL } from "./core/config.js";
export { getDomainSummary } from "./core/contracts.js";
export { parseCountryDomain } from "./core/names.js";
export { getPhaseZeroGate } from "./core/phase-zero/index.js";
