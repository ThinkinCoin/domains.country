import assert from "node:assert/strict";
import test from "node:test";
import { canonicalDomainName, parseCountryDomain } from "./names.js";

test("parses .country labels and full names", () => {
  assert.deepEqual(parseCountryDomain("Cafe"), { ok: true, label: "cafe", name: "cafe.country" });
  assert.deepEqual(parseCountryDomain("studio.country."), { ok: true, label: "studio", name: "studio.country" });
  assert.equal(canonicalDomainName("Studio.country"), "studio.country");
});

test("rejects labels that cannot be registered", () => {
  assert.equal(parseCountryDomain("-bad").ok, false);
  assert.equal(parseCountryDomain("ab").ok, false);
  assert.equal(parseCountryDomain("bad_underscore").ok, false);
});
