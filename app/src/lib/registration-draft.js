import { keccak256Hex } from "../../api/_lib/keccak.js";
import { generateCommitSecret, readCommitJournal, saveCommitEntry } from "./commit-journal.js";

export const REGISTRATION_FUSES = 0;
export const REGISTRATION_WRAPPER_EXPIRY = 18446744073709551615n;
const ONE_YEAR_SECONDS = 365n * 24n * 60n * 60n;

function strip0x(value) {
  return String(value || "").replace(/^0x/i, "");
}

function encodeUint(value) {
  return BigInt(value).toString(16).padStart(64, "0");
}

function encodeAddress(value) {
  const clean = strip0x(value);
  if (!/^[0-9a-f]{40}$/i.test(clean)) throw new Error("A valid EVM wallet address is required.");
  return clean.toLowerCase().padStart(64, "0");
}

function encodeBytes32(value) {
  const clean = strip0x(value);
  if (!/^[0-9a-f]{64}$/i.test(clean)) throw new Error("The commitment secret must be exactly 32 bytes.");
  return clean;
}

function encodeString(value) {
  const clean = Array.from(new TextEncoder().encode(value), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${encodeUint(clean.length / 2)}${clean.padEnd(Math.ceil(clean.length / 64) * 64, "0")}`;
}

/** Builds the configured RegistrarController ABI payload without an RPC request. */
export function encodeMakeCommitmentPayload([name, owner, duration, secret, resolver, data, reverseRecord, fuses, wrapperExpiry]) {
  if (!Array.isArray(data) || data.length !== 0) throw new Error("Registration drafts currently support an empty resolver data array only.");
  const encodedName = encodeString(name);
  const headSize = 9n * 32n;
  const bytesArrayOffset = headSize + BigInt(encodedName.length / 2);
  return `0x${[
    encodeUint(headSize), encodeAddress(owner), encodeUint(duration), encodeBytes32(secret), encodeAddress(resolver),
    encodeUint(bytesArrayOffset), encodeUint(reverseRecord ? 1n : 0n), encodeUint(fuses), encodeUint(wrapperExpiry), encodedName, encodeUint(0),
  ].join("")}`;
}

export function makeCommitmentLocally(args) {
  return keccak256Hex(encodeMakeCommitmentPayload(args));
}

function validSummary(summary) {
  return Boolean(summary?.valid && summary?.availability === "available" && typeof summary.normalizedLabel === "string" && /^[a-z0-9-]+$/.test(summary.normalizedLabel) && summary.manifest?.addresses?.publicResolver);
}

function currentDraft(label, account) {
  return readCommitJournal()
    .filter((entry) => entry.label === label && entry.account.toLowerCase() === account.toLowerCase() && entry.commitment)
    .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0] || null;
}

export function commitmentArgsFromEntry(entry) {
  return [entry.label, entry.account, BigInt(entry.durationSeconds), entry.secret, entry.resolver, [], Boolean(entry.reverseRecord), Number(entry.fuses), BigInt(entry.wrapperExpiry)];
}

export function commitArgsFromEntry(entry) {
  if (!/^0x[0-9a-f]{64}$/i.test(entry?.commitment || "")) throw new Error("The local registration draft has no valid commitment.");
  return [entry.commitment];
}

export function registerArgsFromEntry(entry) {
  return commitmentArgsFromEntry(entry);
}

export function prepareRegistrationDraft({ summary, account, years }) {
  if (!validSummary(summary)) throw new Error("An available, validated .country domain is required before preparing registration.");
  if (!/^0x[0-9a-f]{40}$/i.test(account || "")) throw new Error("Connect a Harmony-compatible wallet before preparing registration.");

  const existing = currentDraft(summary.normalizedLabel, account);
  if (existing) return { entry: existing, resumed: true };

  const durationSeconds = summary.price?.durationSeconds
    ? BigInt(summary.price.durationSeconds)
    : BigInt(Math.min(10, Math.max(1, Number(years) || 1))) * ONE_YEAR_SECONDS;
  const entry = {
    id: `${summary.normalizedLabel}:${account.toLowerCase()}:${Date.now()}`,
    name: summary.name,
    label: summary.normalizedLabel,
    account,
    secret: generateCommitSecret(),
    durationSeconds: durationSeconds.toString(),
    resolver: summary.manifest.addresses.publicResolver,
    reverseRecord: false,
    fuses: String(REGISTRATION_FUSES),
    wrapperExpiry: REGISTRATION_WRAPPER_EXPIRY.toString(),
    createdAt: new Date().toISOString(),
    status: "prepared",
  };
  entry.commitment = makeCommitmentLocally(commitmentArgsFromEntry(entry));
  saveCommitEntry(entry);
  return { entry, resumed: false };
}
