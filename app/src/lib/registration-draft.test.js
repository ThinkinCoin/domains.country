import assert from "node:assert/strict";
import test from "node:test";
import { commitArgsFromEntry, makeCommitmentLocally, prepareRegistrationDraft, registerArgsFromEntry } from "./registration-draft.js";
import { readCommitJournal } from "./commit-journal.js";

function localStorageFixture() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

const account = "0x0000000000000000000000000000000000000001";
const resolver = "0x0000000000000000000000000000000000000002";
const summary = { valid: true, name: "cafe.country", normalizedLabel: "cafe", availability: "available", price: { durationSeconds: "31536000" }, manifest: { addresses: { publicResolver: resolver } } };

test("prepares and recovers a commitment entirely from browser-local data", () => {
  globalThis.window = { localStorage: localStorageFixture(), crypto: globalThis.crypto };
  const first = prepareRegistrationDraft({ summary, account, years: 1 });
  assert.equal(first.resumed, false);
  assert.match(first.entry.secret, /^0x[0-9a-f]{64}$/i);
  assert.match(first.entry.commitment, /^0x[0-9a-f]{64}$/i);
  assert.equal(readCommitJournal()[0].commitment, first.entry.commitment);
  assert.deepEqual(commitArgsFromEntry(first.entry), [first.entry.commitment]);
  assert.deepEqual(registerArgsFromEntry(first.entry), ["cafe", account, 31536000n, first.entry.secret, resolver, [], false, 0, 18446744073709551615n]);
  const second = prepareRegistrationDraft({ summary, account, years: 1 });
  assert.equal(second.resumed, true);
  assert.equal(second.entry.secret, first.entry.secret);
  delete globalThis.window;
});

test("commitment payload hash is deterministic and rejects unavailable names", () => {
  const args = ["cafe", account, 31536000n, `0x${"11".repeat(32)}`, resolver, [], false, 0, 18446744073709551615n];
  assert.equal(makeCommitmentLocally(args), makeCommitmentLocally(args));
  globalThis.window = { localStorage: localStorageFixture(), crypto: globalThis.crypto };
  assert.throws(() => prepareRegistrationDraft({ summary: { ...summary, availability: "registered" }, account, years: 1 }), /available, validated/);
  delete globalThis.window;
});
