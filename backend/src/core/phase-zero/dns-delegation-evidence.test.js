import assert from "node:assert/strict";
import test from "node:test";
import { dnsDelegationEvidenceSha256, validateDnsDelegationEvidence } from "./dns-delegation-evidence.js";

function validEvidence() {
  const evidence = {
    schemaVersion: 1,
    status: "VERIFIED",
    parentZone: "country",
    probeDomain: "phase0.country",
    projectNameservers: ["ns1.example.net", "ns2.example.net", "ns3.example.net"],
    parentResponses: ["ns01.parent.test", "ns02.parent.test"].map((nameserver) => ({ nameserver, delegatedNameservers: ["ns1.example.net", "ns2.example.net", "ns3.example.net"], observedAt: "2026-09-02T12:00:00.000Z" })),
    projectSoaResponses: ["ns1.example.net", "ns2.example.net", "ns3.example.net"].map((nameserver) => ({ nameserver, soa: { nsname: nameserver, hostmaster: "hostmaster.example.net", serial: "2026090201" }, observedAt: "2026-09-02T12:00:00.000Z" })),
    verifiedBy: "dns-operator",
    verifiedAt: "2026-09-02T12:01:00.000Z",
    reference: `git:${"ab".repeat(20)}:dns-delegation-evidence`,
    evidenceSha256: null,
  };
  return { ...evidence, evidenceSha256: dnsDelegationEvidenceSha256(evidence) };
}

test("validates a canonical three-nameserver delegation evidence bundle", () => {
  const result = validateDnsDelegationEvidence(validEvidence());
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects missing project authority coverage and tampered evidence", () => {
  const evidence = validEvidence();
  assert.equal(validateDnsDelegationEvidence({ ...evidence, projectSoaResponses: evidence.projectSoaResponses.slice(0, 2) }).valid, false);
  assert.equal(validateDnsDelegationEvidence({ ...evidence, verifiedBy: "another-operator" }).valid, false);
});
