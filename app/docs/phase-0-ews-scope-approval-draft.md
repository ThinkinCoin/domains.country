# EWS MVP Scope Approval Draft

Status: \`PENDING_USER_APPROVAL\`  
Prepared: 2026-09-02  
Network: Harmony Mainnet, chain ID \`1666600000\`  
Contract: \`EWS\` at \`0xf90dab949d3853c418bE361930028644B4EBcDE4\`

## Requested decision

Approve EWS as \`OUT_OF_SCOPE\` for the domains.country registration and DNS
MVP.

This decision excludes EWS from application calls for registration, renewal,
transfer, resolver updates, DNS record changes, and public DNS publication. It
does not approve EWS bytecode, deployment authority, or a future hosting/site
product.

## Evidence basis

- Matching source:
  \`https://github.com/polymorpher/dot-country-embedder/blob/443365d1e53bf270f2e403b65b41b96273e7bf30/contract/contracts/EWS.sol\`
- Source file SHA-256:
  \`6a9cf01227647db3c604402ab7cbfa1358923bd4907b8df53f51dc184f1b3729\`
- Compiler settings: Solidity \`0.8.17\`, optimizer enabled, 200 runs.
- Reproduced runtime: 13,225 bytes; metadata-stripped body hash
  \`0x25c9bf492058ab0272f0d16a7ef5e255bb3cb87c6e089dda8663dac91978af81\`
  matches the deployed code.
- Archive trace identifies the EWS CREATE transaction
  \`0x1b7296ecb43d959c9cc0af05b5558fe32888a5160f7d4fa601e87a02f007dec4\`
  at Harmony block \`43627876\`.
- The source implements landing pages, subdomains, maintainer access, fees and
  revenue withdrawal through DC. The legacy production UI has no EWS ABI,
  address or call path.

See \`docs/phase-0-ews-classification.md\`,
\`docs/phase-0-bytecode-reproduction.md\`, and
\`docs/phase-0-legacy-production-review.md\`.

## Candidate manifest record

After explicit approval, copy this record into
\`contracts.ews.classification\` in
\`api/_lib/phase-zero/evidence-manifest.js\`:

\`\`\`js
{
  status: "APPROVED",
  decision: "OUT_OF_SCOPE",
  rationale: "EWS is the embedded website and landing-page service. The registrar MVP uses RegistrarController, TLDNameWrapper and PublicResolver only; it must not call EWS for registration, renewal, transfer, resolver changes, DNS changes, or publication.",
  reviewedBy: "<named technical approver>",
  reviewedAt: "<ISO-8601 approval timestamp>",
  reference: "git:<deployment-source-revision>:app/docs/phase-0-ews-scope-approval-draft.md",
  evidenceSha256: "<recompute with npm run phase0:record-digests after final fields>",
}
\`\`\`

The digest must be generated from the final named-approver record. Do not reuse
a sample digest after editing any field.

## Scope boundary

If a future product activates EWS, it requires its own authorization, fee,
maintainer, migration and recovery review. This approval draft does not carry
over to that product.
