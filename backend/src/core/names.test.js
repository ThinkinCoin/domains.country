import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDomainName, parseCountryDomain } from "./names.js";

test("parses .country labels and full names", () => {
  assert.deepEqual(parseCountryDomain("Cafe"), { ok: true, label: "cafe", name: "cafe.country" });
  assert.deepEqual(parseCountryDomain("studio.country."), { ok: true, label: "studio", name: "studio.country" });
  assert.deepEqual(parseCountryDomain("x"), { ok: true, label: "x", name: "x.country" });
  assert.deepEqual(parseCountryDomain("😀.country"), { ok: true, label: "😀", name: "😀.country" });
  assert.equal(canonicalDomainName("Studio.country"), "studio.country");
});

test("rejects only unsafe or unsupported label syntax before querying the contract", () => {
  assert.equal(parseCountryDomain("").ok, false);
  assert.equal(parseCountryDomain("two words").ok, false);
  assert.equal(parseCountryDomain("one.two").ok, false);
  assert.equal(parseCountryDomain("a".repeat(129)).ok, false);
});
