import assert from "node:assert/strict";
import test from "node:test";
import { generateCommitSecret, readCommitJournal, removeCommitEntry, saveCommitEntry } from "./commit-journal.js";

function localStorageFixture() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

test("keeps commitment secrets in local browser storage", () => {
  globalThis.window = { localStorage: localStorageFixture(), crypto: globalThis.crypto };
  const secret = generateCommitSecret();
  const entry = {
    id: "commit-1",
    name: "cafe.country",
    label: "cafe",
    account: "0x0000000000000000000000000000000000000001",
    secret,
  };

  saveCommitEntry(entry);
  assert.equal(readCommitJournal()[0].secret, secret);

  removeCommitEntry(entry.id);
  assert.deepEqual(readCommitJournal(), []);
  delete globalThis.window;
});
