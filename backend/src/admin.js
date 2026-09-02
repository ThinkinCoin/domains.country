import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "domains-country-admin";
const SESSION_SECONDS = 60 * 60 * 8;
const CHALLENGE_SECONDS = 5 * 60;
export const ALLOWLIST_DISCLOSURE = "The allowlist controls access through domains.country during the controlled pilot. It does not prevent direct calls to Harmony contracts.";
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

function isAddress(value) {
  return ADDRESS_PATTERN.test(String(value || ""));
}

function getAddress(value) {
  if (!isAddress(value)) throw new Error("Invalid EVM wallet address.");
  return String(value).toLowerCase();
}

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function isOperator(address, config) {
  try {
    return config.adminOperators.includes(getAddress(address).toLowerCase());
  } catch {
    return false;
  }
}

function requireAdminConfiguration(config) {
  if (config.adminNonceSecret.length < 32) throw new Error("Admin authentication is not configured.");
  if (!config.adminOperators.length) throw new Error("No admin operator wallet is configured.");
}

export async function createChallenge({ address }, db, config) {
  requireAdminConfiguration(config);
  if (!address || !isAddress(address) || !isOperator(address, config)) {
    const error = new Error("This wallet is not configured as an admin operator.");
    error.statusCode = 403;
    throw error;
  }

  const wallet = getAddress(address);
  const nonce = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + CHALLENGE_SECONDS * 1000);
  const message = [
    "domains.country admin authentication",
    "Wallet: " + wallet,
    "Nonce: " + nonce,
    "Expires: " + expiresAt.toISOString(),
  ].join("\\n");
  await db.query(
    "INSERT INTO admin_challenges (wallet, message, nonce_hash, expires_at) VALUES ($1, $2, $3, $4)",
    [wallet, message, hash(nonce), expiresAt],
  );
  return { message, expiresAt: expiresAt.toISOString() };
}

export async function verifyChallenge({ address, message, signature }, db, config) {
  requireAdminConfiguration(config);
  if (!address || !message || !signature || !isAddress(address) || !isOperator(address, config)) {
    const error = new Error("Invalid operator authentication request.");
    error.statusCode = 400;
    throw error;
  }

  const wallet = getAddress(address);
  const { rows } = await db.query(
    "SELECT id FROM admin_challenges WHERE wallet = $1 AND message = $2 AND used_at IS NULL AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
    [wallet, message],
  );
  if (!rows[0]) {
    const error = new Error("Authentication challenge expired or was already used.");
    error.statusCode = 401;
    throw error;
  }

  const { verifyMessage } = await import("viem");
  const verified = await verifyMessage({ address: wallet, message, signature });
  if (!verified) {
    const error = new Error("Wallet signature could not be verified.");
    error.statusCode = 401;
    throw error;
  }

  const payload = Buffer.from(JSON.stringify({
    address: wallet,
    exp: Date.now() + SESSION_SECONDS * 1000,
  })).toString("base64url");
  const session = payload + "." + sign(payload, config.adminNonceSecret);

  await db.query("UPDATE admin_challenges SET used_at = NOW() WHERE id = $1", [rows[0].id]);
  await audit(db, wallet, "admin_login", "admin_session", rows[0].id, null);
  return { address: wallet, session };
}

export function readAdminSession(request, config) {
  if (config.adminNonceSecret.length < 32) return null;
  const value = request.cookies?.[COOKIE_NAME];
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !constantTimeEqual(signature, sign(payload, config.adminNonceSecret))) return null;

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return decoded.exp > Date.now() && isOperator(decoded.address, config) ? getAddress(decoded.address) : null;
  } catch {
    return null;
  }
}

export function setAdminCookie(response, session, production) {
  response.cookie(COOKIE_NAME, session, {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS * 1000,
  });
}

export function requireAdmin(request, config) {
  const address = readAdminSession(request, config);
  if (address) return address;
  const error = new Error("Unauthorized admin session.");
  error.statusCode = 401;
  throw error;
}

export async function listAllowlist(db) {
  const { rows } = await db.query(
    "SELECT id, wallet, domain_name, enabled, note, created_by, created_at, updated_at FROM allowlist_entries ORDER BY updated_at DESC",
  );
  return rows;
}

export async function upsertAllowlist(input, actor, db) {
  if (!input?.wallet || typeof input.enabled !== "boolean" || !isAddress(input.wallet)) {
    const error = new Error("A valid wallet and enabled boolean are required.");
    error.statusCode = 400;
    throw error;
  }

  const wallet = getAddress(input.wallet);
  const domainName = String(input.domainName || "*").trim().toLowerCase() || "*";
  const { rows } = await db.query(
    "INSERT INTO allowlist_entries (wallet, domain_name, enabled, note, created_by) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (wallet, domain_name) DO UPDATE SET enabled = EXCLUDED.enabled, note = EXCLUDED.note, created_by = EXCLUDED.created_by, updated_at = NOW() RETURNING id, wallet, domain_name, enabled, note, created_by, created_at, updated_at",
    [wallet, domainName, input.enabled, input.note || null, actor],
  );
  await audit(db, actor, "allowlist_upsert", "allowlist", rows[0].id, {
    wallet,
    domainName,
    enabled: input.enabled,
    disclosure: ALLOWLIST_DISCLOSURE,
  });
  return rows[0];
}

export async function pilotEligibility(wallet, name, db, gate) {
  if (!isAddress(wallet)) {
    return { eligible: false, reason: "Invalid wallet address.", disclosure: ALLOWLIST_DISCLOSURE };
  }
  if (gate.decision !== "READY") {
    return { eligible: false, reason: "Contract writes are disabled pending Phase 0 approval.", disclosure: ALLOWLIST_DISCLOSURE };
  }
  const normalized = getAddress(wallet);
  const { rows } = await db.query(
    "SELECT 1 FROM allowlist_entries WHERE wallet = $1 AND enabled = true AND domain_name IN ('*', $2) LIMIT 1",
    [normalized, String(name || "").trim().toLowerCase()],
  );
  return {
    eligible: Boolean(rows[0]),
    reason: rows[0] ? "Wallet is eligible through the official app allowlist." : "Wallet/domain pair is not allowlisted for the controlled pilot.",
    disclosure: ALLOWLIST_DISCLOSURE,
  };
}

async function audit(db, actor, action, targetType, targetId, detail) {
  await db.query(
    "INSERT INTO audit_log (actor, action, target_type, target_id, detail) VALUES ($1, $2, $3, $4, $5)",
    [actor, action, targetType, targetId, detail],
  );
}
