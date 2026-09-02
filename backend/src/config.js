const DEFAULT_ORIGINS = [
  "http://localhost:5173",
  "https://domains.country",
  "https://dev.domains.country",
];

function list(value, fallback = []) {
  const entries = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length ? [...new Set(entries)] : fallback;
}

function bool(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return value === "true";
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function loadBackendConfig(env = process.env) {
  const production = env.NODE_ENV === "production" || env.RAILWAY_ENVIRONMENT === "production";
  return Object.freeze({
    production,
    port: nonNegativeInteger(env.PORT, 3000),
    sourceRevision: env.RAILWAY_GIT_COMMIT_SHA || env.SOURCE_REVISION || null,
    databaseUrl: env.DATABASE_URL || "",
    harmonyRpcUrl: env.HARMONY_RPC_URL || "https://api.harmony.one",
    corsAllowedOrigins: list(env.CORS_ALLOWED_ORIGINS, DEFAULT_ORIGINS),
    adminNonceSecret: env.ADMIN_NONCE_SECRET || "",
    adminOperators: list(env.ADMIN_OPERATOR_ADDRESSES).map((address) => address.toLowerCase()),
    workerAuthSecret: env.WORKER_AUTH_SECRET || "",
    indexerEnabled: bool(env.INDEXER_ENABLED),
    powerDnsPublisherEnabled: bool(env.POWERDNS_PUBLISHER_ENABLED),
    minConfirmations: nonNegativeInteger(env.MIN_CONFIRMATIONS, 12),
    powerDns: {
      apiUrl: env.POWERDNS_API_URL || "",
      apiKey: env.POWERDNS_API_KEY || "",
      serverId: env.POWERDNS_SERVER_ID || "localhost",
      nameservers: list(env.POWERDNS_NAMESERVERS),
    },
  });
}

export function backendConfigurationProblems(config, env = process.env) {
  const problems = [];
  if (config.production && !config.databaseUrl) problems.push("DATABASE_URL is required in production.");
  if (config.production && !env.HARMONY_RPC_URL) problems.push("HARMONY_RPC_URL is required in production.");
  if (config.production && config.adminNonceSecret.length < 32) problems.push("ADMIN_NONCE_SECRET must contain at least 32 characters in production.");
  if (config.production && config.workerAuthSecret.length < 32) problems.push("WORKER_AUTH_SECRET must contain at least 32 characters in production.");
  if (config.powerDnsPublisherEnabled && (!config.powerDns.apiUrl || !config.powerDns.apiKey)) {
    problems.push("PowerDNS publication requires POWERDNS_API_URL and POWERDNS_API_KEY.");
  }
  return problems;
}
