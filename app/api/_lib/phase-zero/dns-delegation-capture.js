import { dnsDelegationEvidenceSha256, validateDnsDelegationEvidence } from "./dns-delegation-evidence.js";

export function buildDnsDelegationEvidence(input) {
  const evidence = {
    schemaVersion: 1,
    status: "REVIEW_READY",
    parentZone: "country",
    probeDomain: input.probeDomain,
    projectNameservers: input.projectNameservers,
    parentResponses: input.parentResponses,
    projectSoaResponses: input.projectSoaResponses,
    verifiedBy: input.verifiedBy,
    verifiedAt: input.verifiedAt,
    reference: input.reference,
    evidenceSha256: null,
  };
  const finalized = { ...evidence, evidenceSha256: dnsDelegationEvidenceSha256(evidence) };
  const validation = validateDnsDelegationEvidence(finalized);
  if (!validation.valid) throw new Error(`Delegation evidence is incomplete: ${validation.errors.join(" ")}`);
  return finalized;
}
