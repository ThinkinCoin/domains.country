# RegistrarController ABI Approval Draft

Status: \`PENDING_USER_APPROVAL\`  
Prepared: 2026-09-02T09:20:00.000Z  
Network: Harmony Mainnet, chain ID \`1666600000\`  
Contract: \`RegistrarController\` at \`0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb\`

## Purpose

This draft is the exact manifest record needed to clear
\`registrarController.abiProvenance\` after explicit technical approval. It does
not approve bytecode hashes, constructor arguments, deployment authority, or
any write path by itself.

## Evidence basis

- Source candidate:
  \`https://github.com/ThinkinCoin/ens-deployer/blob/5e56258aee80bbe604c3424c9f997db6c74fa5d7/contract/contracts/RegistrarController.sol\`
- Source file SHA-256:
  \`0bf2940773d43960bcb528cd620ad922f27e30f58a0dee3a14aadeb91c3a971d\`
- ABI SHA-256:
  \`7cb408739bc35504893f29655abced6e02c50a51b3f8e376311f55f7af44ee2f\`
- Live accessor: \`baseExtension()\`
- Expected live value: \`country\`
- Confirmed selectors: \`baseExtension()\`, \`available(string)\`,
  \`rentPrice(string,uint256)\`, \`minCommitmentAge()\`,
  \`maxCommitmentAge()\`, \`makeCommitment(...)\`, \`commit(bytes32)\`,
  \`register(...)\`, and \`renew(string,uint256)\`.

Supporting details are recorded in
\`docs/phase-0-registrar-controller-abi.md\` and
\`docs/phase-0-source-candidates.md\`.

## Candidate manifest record

If approved, copy this record into \`contracts.registrarController.abi\` in
\`api/_lib/phase-zero/evidence-manifest.js\` and regenerate the evidence index:

\`\`\`js
{
  status: "VERIFIED",
  baseAccessor: "baseExtension",
  expectedBaseExtension: "country",
  artifact: "https://github.com/ThinkinCoin/ens-deployer/blob/5e56258aee80bbe604c3424c9f997db6c74fa5d7/contract/contracts/RegistrarController.sol",
  artifactSha256: "7cb408739bc35504893f29655abced6e02c50a51b3f8e376311f55f7af44ee2f",
  verifiedBy: "<named technical approver>",
  verifiedAt: "<ISO-8601 approval timestamp>",
  reference: "git:<deployment-source-revision>:app/docs/phase-0-registrar-controller-abi-approval-draft.md",
  evidenceSha256: "<recompute with npm run phase0:record-digests after final fields>",
}
\`\`\`

Do not reuse the digest below if \`verifiedBy\`, \`verifiedAt\`, \`reference\`,
or any other field changes. The Phase 0 gate checks the digest over the final
canonical record.

## Example digest for the prepared draft

For the prepared draft identity
\`verifiedBy: "Codex Phase 0 technical validation"\` and
\`verifiedAt: "2026-09-02T09:20:00.000Z"\`, with the GitHub source URL as both
\`artifact\` and \`reference\`, the canonical record digest is:

\`c026a081097699606068c279449bd4d09c739ae21abe2892cd42450dd5e29f86\`

This value is informational only. Production approval should use the named
approver and immutable deployment-source reference that will be committed.
