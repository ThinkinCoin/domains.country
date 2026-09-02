import assert from "node:assert/strict";
import test from "node:test";
import { buildDnsDelegationEvidence } from "./dns-delegation-capture.js";
import { validateDnsDelegationEvidence } from "./dns-delegation-evidence.js";

const projectNameservers = ["ns1.example.net", "ns2.example.net", "ns3.example.net"];
const baseInput = {
  probeDomain: "phase0.country",
  projectNameservers,
  parentResponses: ["ns01.parent.test", "ns02.parent.test"].map((nameserver) => ({
    nameserver,
    delegatedNameservers: projectNameservers,
    observedAt: "2026-09-02T12:00:00.000Z",
  })),
  projectSoaResponses: projectNameservers.map((nameserver) => ({
    nameserver,
    endpoint: "192.0.2.1",
    soa: { nsname: nameserver, hostmaster: "hostmaster.example.net", serial: "2026090201" },
    observedAt: "2026-09-02T12:00:00.000Z",
  })),
  verifiedBy: "dns-operator",
  verifiedAt: "2026-09-02T12:01:00.000Z",
  reference: `ipfs://bafy${"a".repeat(48)}`,
};

test("captures a canonical review-ready delegation bundle", () => {
  const evidence = buildDnsDelegationEvidence(baseInput);
  const validation = validateDnsDelegationEvidence(evidence);
  assert.equal(validation.valid, true, validation.errors.join("\n"));
  assert.equal(evidence.status, "REVIEW_READY");
});

test("refuses a bundle when one parent delegates a different nameserver set", () => {
  const parentResponses = baseInput.parentResponses.map((response, index) => index === 1
    ? { ...response, delegatedNameservers: ["ns1.example.net", "ns2.example.net", "ns4.example.net"] }
    : response);
  assert.throws(() => buildDnsDelegationEvidence({ ...baseInput, parentResponses }), /delegate exactly/);
});
