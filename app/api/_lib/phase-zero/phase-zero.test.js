import assert from "node:assert/strict";
import test from "node:test";
import { determinePhaseZeroDecision, PHASE_ZERO_STATUS } from "./decision.js";
import { dnsValidationFixtures, encodeDnsName } from "./dns-wire.js";

test("Phase 0 is READY only when every required check passes", () => {
  const ready = determinePhaseZeroDecision([
    { id: "network.chainId", required: true, status: PHASE_ZERO_STATUS.PASS, summary: "ok" },
    { id: "dns.delegation", required: true, status: PHASE_ZERO_STATUS.PASS, summary: "ok" },
    { id: "optional", required: false, status: PHASE_ZERO_STATUS.FAIL, summary: "not required" },
  ], new Date("2026-08-31T12:00:00.000Z"));
  assert.equal(ready.decision, "READY");
  assert.deepEqual(ready.blockers, []);
});

test("Phase 0 fails closed for RPC, ABI, DNS, or stale-evidence checks", () => {
  for (const id of ["network.chainId", "abi.registrarController", "dns.projectDelegation", "evidence.expired"]) {
    const result = determinePhaseZeroDecision([{ id, required: true, status: PHASE_ZERO_STATUS.FAIL, summary: "blocked" }]);
    assert.equal(result.decision, "BLOCKED");
    assert.equal(result.blockers[0].id, id);
  }
});

test("DNS fixtures encode every MVP record type as RFC 1035 wire data", () => {
  assert.deepEqual(dnsValidationFixtures().map(({ label }) => label), ["A", "CNAME", "NS", "TXT", "SOA", "SRV", "DNAME"]);
  assert.equal(encodeDnsName("example.country").at(-1), 0);
  for (const fixture of dnsValidationFixtures()) assert.ok(fixture.record.length > 12, `${fixture.label} must include a DNS resource record`);
});
