# Phase 0 Evidence Process

The gate reads `api/_lib/phase-zero/evidence-manifest.js`. Environment variables cannot approve contracts, EWS scope, DNS delegation, commitment risk, or PowerDNS rollback. Even when every individual record is complete, the manifest must have a versioned top-level approval with reviewer, timestamp, immutable evidence reference, and SHA-256 digest. Accepted approval references are Git commit references, IPFS CIDs, Harmony transaction hashes, or GitHub URLs pinned to a full commit SHA; mutable generic URLs and unpinned local `docs/` paths are rejected. Local `docs/` paths in pending records are work pointers only, not approval evidence.

For final approval, `approval.evidenceSha256` must equal the SHA-256 of the canonical manifest payload with only `approval.evidenceSha256` set to `null`. This makes the approval bind the exact versioned manifest content and prevents hidden environment variables or ad hoc frontend state from changing Phase 0 readiness.

Every individual approval/evidence record that exposes `evidenceSha256` is
also checked against its own canonical record digest with only that field set
to `null`. This applies to contract approvals, RegistrarController ABI,
EWS classification, PublicResolver authorization, DC configuration history,
commitment policy, DNS parent-control and delegation evidence, and the Vercel
deployment record. A placeholder SHA-256 no longer satisfies the gate.

Print the canonical value expected for every generic record with:

```bash
npm run phase0:record-digests
npm run phase0:record-digests -- --json
```

After all records have been finalized by their named reviewers, run
`npm run phase0:record-digests -- --require-matches`. It exits non-zero when
any recorded digest is missing or stale. The command only calculates hashes;
it does not populate the manifest, approve evidence, or validate external
references. PowerDNS rollback continues to use its separately versioned
operational-evidence bundle and verifier.

## Versioned evidence index

The repository also maintains `docs/phase-0-evidence-index.json`. It binds the
stable Phase 0 validation code and review documents to their SHA-256 digests.
Generate and verify it with:

```bash
npm run phase0:generate-evidence-index
npm run phase0:verify-evidence-index
```

The generated index deliberately has status `DISCOVERY_ONLY`. A matching
digest proves that the listed local files have not changed since the index was
generated; it does not approve a contract, EWS scope, commitment policy, DNS
delegation, PowerDNS rollback, or deployment. To become durable evidence, the
index must be committed and referenced by a full 40-character Git revision.
For a final `READY`, the manifest requires
`evidenceIndex.reference` to be exactly
`git:<deployment source revision>:app/docs/phase-0-evidence-index.json`,
with the matching index digest and source revision. Individual manifest
records still require their named reviewer, timestamp, decision, and matching
canonical evidence digest.

Fresh RPC snapshots are intentionally excluded from the stable index because
their block number and observation time change. Review documents must record
the relevant snapshot digest before approval.

After the reviewer has completed every required record, calculate the value with:

```bash
npm run phase0:manifest-digest
```

Copy the resulting digest into `approval.evidenceSha256`, commit the manifest,
and rerun validation. Any subsequent manifest edit invalidates that approval
digest by design.

The top-level approval must also set `approval.sourceRevision` to the same
40-character Git commit stored in `deployment.sourceRevision`. The gate rejects
an approval or evidence bundle that is reused for a different deployed source
revision.

## Contract baseline approval

For each of the six contracts, record:

- the configured Harmony Mainnet address and deployment transaction;
- the deployment-trace record: first-code block, block hash, direct/internal
  `CREATE` path, init-code byte length/SHA-256, runtime-output byte
  length/SHA-256, reviewer, timestamp, immutable reference, and evidence
  digest. The digest must be the canonical SHA-256 of the trace record with
  only `evidenceSha256` nulled;
- a compilable source or reproducible compiler artifact;
- compiler version, optimizer settings, linked libraries, and constructor inputs;
- the independently calculated runtime bytecode hash;
- a stable evidence reference and explicit reviewer approval.
- the SHA-256 digest of the approval/evidence bundle.

Set `source.status` to `VERIFIED` and `approval.status` to `APPROVED` only after reproduction. Never copy the current RPC hash into `approvedBytecodeHash` as its own justification. Contract approvals without a matching canonical `evidenceSha256` are rejected.

The six approved contract records must also be bound together in
`api/_lib/phase-zero/contract-baseline-evidence-record.js`. The bundle must
contain exactly the six configured components, match each manifest contract
record digest, include the same source revision as the approved deployment, and
carry its own canonical `evidenceSha256`. A per-contract manifest record is
not enough if this bundle is missing, stale, or points at another commit.

When an explorer does not expose a creation transaction, a reviewer may approve
a formal `EXPLORER_CREATION_BYTECODE` deployment artifact instead. It must
record the explorer creation-bytecode hash, compiled creation-artifact SHA-256,
a metadata-stripped prefix match, inferred constructor-tail length, SHA-256 of
the decoded constructor arguments, immutable reference to that decoding,
reviewer, timestamp, and immutable reference. This is an explicit alternative to a
transaction hash—not an automatic approval of explorer data. The artifact
record's `evidenceSha256` must equal the canonical SHA-256 of that record with
only its own `evidenceSha256` field nulled.

Collect a reproducible discovery snapshot with:

```bash
npm run phase0:collect-provenance
```

The generated `docs/phase-0-provenance-snapshot.json` compares explorer and RPC bytecode and checks Sourcify for full or partial source matches. `docs/phase-0-source-candidates.md` records the available public source candidate. An explorer/RPC runtime match, a public source candidate, or a missing Sourcify record remains discovery-only until verified source and deploy evidence are available.

The provenance snapshot also records explorer address-payload digests and the
presence or absence of creation-transaction/creator fields. A `null` creation
link is evidence that the explorer cannot currently prove deploy provenance; it
must not be treated as an approved deployment reference.

When an archive RPC supports historical `eth_getCode` and `debug_traceTransaction`,
collect `docs/phase-0-creation-traces.json` with:

```bash
npm run phase0:collect-creation-traces
```

The collector records the first block where each configured address has code,
the enclosing transaction, and the direct or internal `CREATE` trace targeting
that address. This can establish a deploy-transaction candidate where the
explorer does not. It is still discovery evidence: review the trace's creation
input, constructor decoding, compiler artifact, and exact runtime match before
recording it in a signed/versioned baseline bundle.

Verify the saved snapshot before technical review:

```bash
npm run phase0:verify-creation-traces
```

The verifier re-queries each block, transaction receipt, and `callTracer`
result, then compares the direct/internal `CREATE` target and the SHA-256 and
byte length of its init code. A successful result proves archive-snapshot
consistency only; it cannot approve a baseline by itself.

Generate a per-contract trace-to-runtime review draft with:

```bash
npm run phase0:generate-contract-trace-review
```

This requires the historical CREATE output to match the current runtime
byte-for-byte before it produces `docs/phase-0-contract-trace-review-draft.json`.
The generated file remains discovery-only and is deliberately excluded from
the stable evidence index because it contains a fresh RPC observation.

Generate a non-approving contract-baseline worksheet from that review:

```bash
npm run phase0:generate-contract-baseline-draft
```

The generated `docs/phase-0-contract-baseline-manifest-draft.json` places
observed runtime hashes, candidate deployment transactions, and trace details
beside the manifest and six-contract bundle fields that still require review.
It intentionally sets every approval status to `PENDING_REVIEW`, leaves
`approvedBytecodeHash` and all evidence digests null, and is excluded from
the stable evidence index. It cannot satisfy the gate and must never become an
approval reference. A reviewer must independently fill the pinned, source-
backed records in the manifest and contract baseline bundle.

## ABI and architecture decisions

RegistrarController evidence must prove `baseExtension()` (`0xc6682862`) and its `string` return type. Record the ABI artifact, ABI SHA-256, reviewer/timestamp, immutable reference, and evidence digest. The current read-only probe returns `country`; `base()` is retained only as a non-blocking legacy probe.

The validator performs no-state `eth_call` simulations for `commit`, `register`,
and `renew` using the same ABI payload shapes as the app. A completed simulation
or an EVM revert on a lifecycle precondition is valid evidence that the call
reached the deployed contract; an RPC, ABI, or payload-encoding error is a
required blocker. This does not replace the commitment-window risk decision and
never broadcasts a transaction.

TLDNameWrapper transfer, resolver, and TTL paths are checked the same way.
The validator simulates `transferFrom`, `setResolver`, and `setTTL` for the
probe name. A completed simulation or an EVM ownership/fuse/authorization
revert is valid no-state evidence. RPC, ABI, and payload-encoding failures are
required blockers.

`docs/phase-0-public-resolver-authorization.md` records the discovered resolver authorization model: trusted controller/reverse registrar, ENS Registry owner, Name Wrapper ownership, and owner-approved operators. The manifest must identify all four deployed addresses, source artifact, reviewer, timestamp, immutable reference, and evidence digest before approval. `owner()` is not a requirement. EWS must be classified as `IN_MVP` or `OUT_OF_SCOPE` with source-backed rationale, `reviewedBy`, `reviewedAt`, immutable reference, and evidence digest.

For DNS writes, the validator generates RFC 1035 wire-format records for A,
CNAME, NS, TXT, SOA, SRV, and DNAME, then simulates PublicResolver
`setDNSRecords` for each type. TTL is simulated through TLDNameWrapper
`setTTL`, not the resolver. A completed simulation or an EVM
authorization/state revert is valid no-state evidence. RPC failures, ABI
divergence, and DNS wire-payload encoding errors are required blockers.

`docs/phase-0-ews-classification.md` records the current technical recommendation. It is discovery evidence only and does not satisfy the approval requirement by itself.

## DC mutable-configuration reconciliation

DC stores its dependencies, resolver, duration, wrapper expiry, fuses, and
reverse-record flag through `onlyOwner` setters. Its bytecode baseline therefore
cannot prove that the initial constructor tuple is the active tuple. Before
approval, `contracts.dc.configurationHistory` must record the SHA-256 of the
decoded constructor arguments, the complete initial and active tuples, the
active owner, a SHA-256 of the owner-governance/change-control evidence, its
method, reviewer, timestamp, immutable reference, and matching canonical record
`evidenceSha256`. The gate compares the recorded active tuple with fresh
read-only calls and blocks if it differs.

The historical setter calls emit no DC configuration events, so this record
must include archived transaction traces or an owner attestation bound to an
immutable review record. See `docs/phase-0-dc-configuration-history.md`.

## Operational evidence

The commitment policy must identify the exact configured controller address,
a durable deployment reference, and the live minimum and maximum ages; it
must require a non-zero minimum. In the reproduced `RegistrarController`
source, both ages are immutable constructor values; the deployed `0–120`
window therefore requires a replacement controller, updated controller
permissions, and fresh deployment/relationship evidence. If the deployed
minimum remains zero, registration stays blocked.

`npm run phase0:verify-safe-controller-local` is a controlled candidate-artifact
smoke test. It accepts only an ephemeral Anvil chain (`31337`), verifies a
non-zero `60–3600` constructor window, and submits a local commitment. Its
snapshot is discovery-only: it proves neither a Harmony deployment nor the
authority to migrate production controller permissions.

DNS evidence must identify control of the `.country` parent, the authorized delegation mechanism, three real project nameservers, a publicly delegated probe domain, immutable references, and SHA-256 digests. PowerDNS evidence must include the zone name, distinct last-valid and rejected revisions, SHA-256 digests for the last valid zone and rejected publication error, preserved SOA serial, direct responses from all three project nameservers, operator, timestamp, immutable reference, and evidence digest. The gate re-queries the authorities and rejects the record when the served serial no longer matches the preserved valid version.

Use `npm run phase0:collect-parent-dns` to capture the IANA record and current
public parent NS/SOA responses. Its snapshot is discovery-only: it establishes
the public registry/technical-operation chain, not project authorization or a
delegated proof domain.

The PowerDNS rollback bundle must also be committed in
`api/_lib/phase-zero/operational-evidence.js` and pinned to the same source
revision as the approved deployment. The gate validates its canonical digest
and equality with the manifest before it performs the direct authoritative SOA
check. An environment variable or a manually repeated manifest value cannot
replace this bundle.

The pending operational runbooks are `docs/phase-0-commitment-decision.md` and `docs/phase-0-dns-operation.md`. They describe the work required to produce evidence; they are not approvals.

`docs/phase-0-approval-packet.md` consolidates the observed hashes, required
manifest fields, and outstanding decisions for the approver. It is a handoff
document, not an approval record.

`docs/phase-0-constructor-provenance.md` consolidates decoded constructor-tail
candidates for reviewer verification; it is discovery evidence, not approval.

After review, rerun:

```bash
npm run check:security
npm run phase0:validate
npm test
npm run build
```

Only a fresh `READY` result may enable writes.

The security preflight is part of both `npm test` and `npm run build`. It
checks the committed source for CSP restrictions, absence of third-party
analytics/script loading, browser-local commitment isolation, no commitment
journal use inside Vercel Functions, and no private-looking `VITE_` variables.

## Build reproducibility

`pnpm-lock.yaml` is the canonical dependency lock for `app/`. Vercel must run
`pnpm install --frozen-lockfile` and `pnpm build`; `package-lock.json` remains
legacy and must not determine the deployment dependency graph. The pinned
package-manager version is recorded in `package.json`. A build must be
verified from a clean installation before it can satisfy the final Phase 0
deployment check.

See `docs/phase-0-build-validation.md` for the current clean local result and
the remaining evidence required from the linked Vercel project.

The final gate performs a live read of the approved deployment's
`/api/health` endpoint. It must report `ok: true`, Harmony chain ID
`1666600000`, all six configured contract addresses with bytecode present, and
the exact `VERCEL_GIT_COMMIT_SHA` (or server-side `SOURCE_REVISION`) recorded
in `deployment.sourceRevision`. A reachable deployment with a different build
revision is not eligible for `READY`.
