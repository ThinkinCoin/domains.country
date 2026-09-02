# PublicResolver Authorization Approval Draft

Status: \`PENDING_USER_APPROVAL\`  
Prepared: 2026-09-02  
Network: Harmony Mainnet, chain ID \`1666600000\`  
Contract: \`PublicResolver\` at \`0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D\`

## Requested decision

Approve the deployed resolver authorization model as owner/wrapper mediated,
with initial registration DNS data disabled.

This approval draft does not approve the six-contract bytecode baseline and
does not enable production writes by itself.

## Evidence basis

- Candidate source package: \`@ensdomains/ens-contracts@0.0.15\`
- npm tarball SHA-1: \`f305e863d360cfdf6ccfba44981635ac211c114a\`
- npm integrity:
  \`sha512-fOmGylPbsHWjhD3iXz1pyi5VuyW25ahbjjUIjaKwC5MBULJYJDFb2sHlK8P4bxVep2pTGfV3XUhdFVMiEE4LLQ==\`
- Runtime hash:
  \`0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5\`
- Runtime immutables:
  - ENS Registry: \`0x6e20e0488a0556f3bc5940d456168902b43efba7\`
  - Name Wrapper: \`0x4cd2563118e57b19179d8dc033f2b0c5b5D69ff5\`
  - Trusted controller: \`0xACa2D31194689fd37962fe17D5A4E63213850fF1\`
  - Trusted reverse registrar: \`0x51e86d4cc8723FCa7014fd97C0aD0c737C86A2af\`
- Active RegistrarController:
  \`0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb\`

The trusted controller embedded in the resolver is not the active
RegistrarController. Therefore the registration flow must submit an empty
\`data[]\` array until a separate compatibility path is approved.

## Simulation result

The refreshed read-only collector used \`eth_estimateGas\` as the mutator
precondition signal and retained \`eth_call\` only as diagnostic output. It
confirmed:

- DC owner-only control: owner accepted, external caller reverted.
- Resolver \`setDNSRecords\`: embedded trusted controller accepted.
- Resolver \`setDNSRecords\`: active RegistrarController reverted.
- Resolver \`setDNSRecords\`: external caller reverted.

This matches the source-derived model. It still requires a named approval in
the manifest before \`publicResolver.authorizationModel\` can pass.

## Candidate manifest record

After explicit approval, copy this record into
\`contracts.publicResolver.authorization\` in
\`api/_lib/phase-zero/evidence-manifest.js\`:

\`\`\`js
{
  status: "VERIFIED",
  model: "ENS Registry owner, Name Wrapper ownerOf fallback, and resolver operator approvals",
  registryAddress: "0x6e20e0488a0556f3bc5940d456168902b43efba7",
  nameWrapperAddress: "0x4cd2563118e57B19179d8DC033f2B0C5B5D69ff5",
  trustedController: "0xACa2D31194689fd37962fe17D5A4E63213850fF1",
  trustedReverseRegistrar: "0x51e86d4cc8723FCa7014fd97C0aD0c737C86A2af",
  initialRegistrationDnsDataPolicy: "EMPTY_DATA_ONLY",
  postTransferDnsAuthorizationPolicy: "REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS",
  sourceArtifact: "git:<deployment-source-revision>:app/docs/phase-0-public-resolver-authorization-approval-draft.md",
  verifiedBy: "<named technical approver>",
  verifiedAt: "<ISO-8601 approval timestamp>",
  reference: "git:<deployment-source-revision>:app/docs/phase-0-public-resolver-authorization-approval-draft.md",
  evidenceSha256: "<recompute with npm run phase0:record-digests after final fields>",
}
\`\`\`

## Approval boundary

This draft only approves the resolver authorization model. The
\`publicResolver.runtimeImmutables\` check will pass only after the final
manifest record is digest-bound and its immutable addresses continue to match
the deployed runtime during a fresh Phase 0 run.
