const STORAGE_KEY = "domains.country.commit-journal.v1";

export const commitJournalSecurityNotice = "The commitment secret is stored only in this browser until registration. It is never sent to the backend; if local storage is cleared or another device is used, that commitment cannot be completed.";

function storage() {
  return typeof window === "undefined" ? null : window.localStorage;
}

function isCommitEntry(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.label === "string" &&
    typeof value.account === "string" &&
    typeof value.secret === "string" &&
    /^0x[0-9a-fA-F]{64}$/.test(value.secret),
  );
}

export function readCommitJournal() {
  const currentStorage = storage();
  if (!currentStorage) return [];

  try {
    const parsed = JSON.parse(currentStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isCommitEntry) : [];
  } catch {
    return [];
  }
}

export function writeCommitJournal(entries) {
  const currentStorage = storage();
  if (!currentStorage) throw new Error("Local browser storage is unavailable.");
  currentStorage.setItem(STORAGE_KEY, JSON.stringify(entries.filter(isCommitEntry)));
}

export function saveCommitEntry(entry) {
  const existing = readCommitJournal().filter((item) => item.id !== entry.id);
  writeCommitJournal([...existing, entry]);
}

export function removeCommitEntry(id) {
  writeCommitJournal(readCommitJournal().filter((entry) => entry.id !== id));
}

export function generateCommitSecret() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
