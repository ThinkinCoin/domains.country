# Phase 0 Evidence Process

The gate reads `api/_lib/phase-zero/evidence-manifest.js`. Environment variables cannot approve contracts, EWS scope, DNS delegation, commitment risk, or PowerDNS rollback. Even when every individual record is complete, the manifest must have a versioned top-level approval with reviewer, timestamp, immutable evidence reference, and SHA-256 digest. Accepted approval references are Git commit references, IPFS CIDs, Harmony transaction hashes, or GitHub URLs pinned to a full commit SHA; mutable generic URLs and unpinned local `docs/` paths are rejected. Local `docs/` paths in pending records are work pointers only, not approval evidence.

## Contract baseline approval

For each of the six contracts, record:

- the configured Harmony Mainnet address and deployment transaction;
- a compilable source or reproducible compiler artifact;
- compiler version, optimizer settings, linked libraries, and constructor inputs;
- the independently calculated runtime bytecode hash;
- a stable evidence reference and explicit reviewer approval.
- the SHA-256 digest of the approval/evidence bundle.

Set `source.status` to `VERIFIED` and `approval.status` to `APPROVED` only after reproduction. Never copy the current RPC hash into `approvedBytecodeHash` as its own justification. Contract approvals without `evidenceSha256` are rejected.

When an explorer does not expose a creation transaction, a reviewer may approve
a formal `EXPLORER_CREATION_BYTECODE` deployment artifact instead. It must
record the explorer creation-bytecode hash, compiled creation-artifact SHA-256,
a metadata-stripped prefix match, inferred constructor-tail length, SHA-256 of
the decoded constructor arguments, immutable reference to that decoding,
reviewer, timestamp, and immutable reference. This is an explicit alternative to a
transaction hash—not an automatic approval of explorer data.

Collect a reproducible discovery snapshot with:

```bash
npm run phase0:collect-provenance
```

The generated `docs/phase-0-provenance-snapshot.json` compares explorer and RPC bytecode and checks Sourcify for full or partial source matches. `docs/phase-0-source-candidates.md` records the available public source candidate. An explorer/RPC runtime match, a public source candidate, or a missing Sourcify record remains discovery-only until verified source and deploy evidence are available.

## ABI and architecture decisions

RegistrarController evidence must prove `baseExtension()` (`0xc6682862`) and its `string` return type. Record the ABI artifact, ABI SHA-256, reviewer/timestamp, immutable reference, and evidence digest. The current read-only probe returns `country`; `base()` is retained only as a non-blocking legacy probe.

`docs/phase-0-public-resolver-authorization.md` records the discovered resolver authorization model: trusted controller/reverse registrar, ENS Registry owner, Name Wrapper ownership, and owner-approved operators. The manifest must identify all four deployed addresses, source artifact, reviewer, timestamp, immutable reference, and evidence digest before approval. `owner()` is not a requirement. EWS must be classified as `IN_MVP` or `OUT_OF_SCOPE` with source-backed rationale, reviewer, timestamp, immutable reference, and evidence digest.

`docs/phase-0-ews-classification.md` records the current technical recommendation. It is discovery evidence only and does not satisfy the approval requirement by itself.

## DC mutable-configuration reconciliation

DC stores its dependencies, resolver, duration, wrapper expiry, fuses, and
reverse-record flag through `onlyOwner` setters. Its bytecode baseline therefore
cannot prove that the initial constructor tuple is the active tuple. Before
approval, `contracts.dc.configurationHistory` must record the SHA-256 of the
decoded constructor arguments, the complete initial and active tuples, the
active owner, a SHA-256 of the owner-governance/change-control evidence, its
method, reviewer, timestamp, and immutable reference. The gate compares the
recorded active tuple with fresh read-only calls and blocks if it differs.

The historical setter calls emit no DC configuration events, so this record
must include archived transaction traces or an owner attestation bound to an
immutable review record. See `docs/phase-0-dc-configuration-history.md`.

## Operational evidence

The commitment policy must match the live minimum and maximum ages and require a non-zero minimum. If the deployed minimum remains zero, registration stays blocked pending contract action.

DNS evidence must identify control of the `.country` parent, the authorized delegation mechanism, three real project nameservers, a publicly delegated probe domain, immutable references, and SHA-256 digests. PowerDNS evidence must include the operator, timestamp, immutable reference, and SHA-256 digest for a test proving that a failed publication leaves the last valid zone served.

The pending operational runbooks are `docs/phase-0-commitment-decision.md` and `docs/phase-0-dns-operation.md`. They describe the work required to produce evidence; they are not approvals.

`docs/phase-0-approval-packet.md` consolidates the observed hashes, required
manifest fields, and outstanding decisions for the approver. It is a handoff
document, not an approval record.

`docs/phase-0-constructor-provenance.md` consolidates decoded constructor-tail
candidates for reviewer verification; it is discovery evidence, not approval.

After review, rerun:

```bash
npm run phase0:validate
npm test
npm run build
```

Only a fresh `READY` result may enable writes.

## Build reproducibility

`pnpm-lock.yaml` is the canonical dependency lock for `app/`. Vercel must run
`pnpm install --frozen-lockfile` and `pnpm build`; `package-lock.json` remains
legacy and must not determine the deployment dependency graph. The pinned
package-manager version is recorded in `package.json`. A build must be
verified from a clean installation before it can satisfy the final Phase 0
deployment check.

See `docs/phase-0-build-validation.md` for the current clean local result and
the remaining evidence required from the linked Vercel project.
