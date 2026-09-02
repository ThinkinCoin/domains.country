# Phase 0 Approval Packet

Status: `PENDING_NAMED_APPROVAL_AND_OPERATIONAL_EVIDENCE`
Revision target: evidence manifest schema 16, `2026-09-02.16`

This packet is the handoff for the named technical approver and DNS operator.
It does not approve anything and must not be copied into the manifest without
the referenced evidence.

For a role-by-role, non-sensitive evidence request and final integration order,
see `docs/phase-0-external-evidence-requests.md`.

The repository-level evidence set is indexed by
`docs/phase-0-evidence-index.json`. Before review, regenerate it with
`npm run phase0:generate-evidence-index` and verify it with
`npm run phase0:verify-evidence-index`. Its digest becomes durable only after
the index is committed and referenced by the full Git revision. The index is
an integrity aid, not a substitute for any approval listed below.

## Contract baseline records

| Component | Address | Observed runtime hash | Reproduction state | Still required |
| --- | --- | --- | --- | --- |
| RegistrarController | `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb` | `0x5710e0139c49ee09983f1ba2ccd90afdde88b1177501b1bb53517344be3c97b1` | Immutable-normalized match; archive CREATE trace recovered | Named review of source, trace, constructor tuple and approval |
| DC | `0x547942748Cc8840FEc23daFdD01E6457379B446D` | `0x1487a13fe7b543a393588b944de73b36a3f3e504d6f93292360fefabf740771b` | Metadata-stripped match; archive internal CREATE trace recovered | Named review of source, trace, constructor tuple and approval |
| EWS | `0xf90dab949d3853c418bE361930028644B4EBcDE4` | `0xfcfd980bcd097a217a9aef5bd6996597df8102d3de72d5e81d4d16b221e32211` | Metadata-stripped match; archive CREATE trace recovered | Named review of source/trace plus scope decision |
| BaseRegistrar | `0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD` | `0x1f003201f580de20b6888b85c39369ef15ad107e6f8dfe7bd13d12a51078441c` | Metadata-stripped match; archive internal CREATE trace recovered | Named review of source, trace, constructor tuple and approval |
| TLDNameWrapper | `0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5` | `0x2abe6afb12233a6fa8b27bcd0f85466b17589362a4449d6af8037b45c0283c4a` | Immutable-normalized match; archive internal CREATE trace recovered | Named review of source, trace, constructor tuple and approval |
| PublicResolver | `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D` | `0x4cb1367da73ecc2a124354fd12106bfcccf599777f257622696cd7aeda4156f5` | Immutable-normalized match; archive internal CREATE trace recovered | Named review of source/trace and authorization model |

For each row, the approver must fill the matching `contracts.<component>`
record in `api/_lib/phase-zero/evidence-manifest.js`: source artifact URI,
artifact SHA-256, deployment transaction hash, verified deployment-trace
record, reviewer, timestamp, approved
runtime hash, and approval reference. The review reference must point to an
immutable release, signed record, IPFS CID, Harmony transaction, or full-SHA Git
reference—not a local environment variable or unpinned `docs/` path. Each
approval record must include the canonical SHA-256 of the record it approves,
calculated with that record's own `evidenceSha256` field set to `null`.

The archive trace snapshot `docs/phase-0-creation-traces.json` now identifies
candidate creation transactions for all six configured contracts. The reviewer
must verify each transaction input and internal `CREATE` path against the
compiled artifact before it is used as a deployment reference. The snapshot is
discovery evidence and must be committed and pinned by full Git revision before
review. Run `npm run phase0:verify-creation-traces` immediately before review
to re-check the block, receipt, trace target, and init-code digest.
A transaction hash without a verified deployment-trace record is rejected by
the gate. The trace `evidenceSha256` must equal the canonical SHA-256 of the
trace record with only its own `evidenceSha256` field set to `null`.

Generate `docs/phase-0-contract-trace-review-draft.json` with
`npm run phase0:generate-contract-trace-review`. It ties the historical
`CREATE` output to the current Harmony runtime for every configured contract.
It is a review input, not an approval record.

Generate `docs/phase-0-contract-baseline-manifest-draft.json` with
`npm run phase0:generate-contract-baseline-draft` after producing the trace
review. It is a reviewer worksheet that pre-populates observed hashes and
creation-trace facts while deliberately leaving approval, artifact, reviewer,
and digest fields pending. Do not copy it verbatim into the evidence manifest:
the gate rejects its `DISCOVERY_ONLY`/`PENDING_REVIEW` status and null
digests.

If a transaction trace cannot be independently reproduced, the reviewer may
instead populate
`source.deploymentArtifact` with the approved explorer creation-bytecode hash,
compiled creation artifact SHA-256, metadata-stripped prefix match, inferred
constructor-tail length, decoded-constructor-arguments SHA-256, immutable
decoded-arguments reference, reviewer, timestamp, immutable reference, and
approval evidence digest. That
alternative is valid only after named technical approval. Its
`deploymentArtifact.evidenceSha256` must equal the canonical SHA-256 of the
artifact record with only its own `evidenceSha256` field set to `null`.

The current explorer address payloads expose creation-link fields but return
`null` creation transaction and creator values for all six contracts. The
archive trace recovery removes that explorer limitation, but not the need for a
named review of transaction inputs, artifact provenance, and constructor
arguments.

In addition to the per-contract manifest fields, the final approval must
populate `api/_lib/phase-zero/contract-baseline-evidence-record.js` with a
single verified bundle covering exactly the six contract records. That bundle
must be pinned to the same Git source revision as the Vercel deployment and
must include each manifest contract record digest. The gate rejects contract
baselines when this bundle is missing or stale.

## Prepared approval drafts

The following drafts already contain the candidate records and evidence hashes.
They remain pending until a named technical approver records the final identity,
timestamp, immutable Git reference, and canonical digest:

- RegistrarController ABI:
  `docs/phase-0-registrar-controller-abi-approval-draft.md`
- Six-contract bytecode baselines:
  `docs/phase-0-contract-baseline-approval-draft.md`
- EWS MVP scope:
  `docs/phase-0-ews-scope-approval-draft.md`
- PublicResolver authorization:
  `docs/phase-0-public-resolver-authorization-approval-draft.md`

## Reproducible candidate artifacts

| Component | Compiled artifact SHA-256 | ABI SHA-256 | Creation prefix | Constructor tail |
| --- | --- | --- | --- | ---: |
| RegistrarController | `b6aeab317a0464ae4258e3c86d0418fe1b778495269c4446fb9b80f7c13a84e9` | `7cb408739bc35504893f29655abced6e02c50a51b3f8e376311f55f7af44ee2f` | match without metadata | 352 bytes |
| DC | `1d466487485c8ca466cebd38fd5cb8363837f26cd11937ef7e635066dbc791c2` | `f354f0b1d4c126c8dc0810835bfbbd0b226c4bfb9685118ccaf8780a3854fb0f` | match without metadata | 256 bytes |
| EWS | `5095c9796083cdd92d4d9c774f9bae57acd605060d15312d677e33bb7963270c` | `b65e52c56a249dc57c73d103039c01b67642379a9258aaa018096528e0ce7e16` | match without metadata | 128 bytes |
| BaseRegistrar | `64c72dd33626e7f12db7972302f73fdf5baccf413ade768a24597c52a73c9184` | `113660218ada0f4d2ad2eee6fec0db6c0a92372070802baf25d0ef696f4bf316` | match without metadata | 96 bytes |
| TLDNameWrapper | `64b3db7fe877e444498c19052f85731910b6cc954e0017967bf004d53d9a03eb` | `8afd14d6dcab0d920e06d4eb0aecbeac238944a0b984b76cfa76f260f796670a` | match without metadata | 192 bytes |
| PublicResolver | `39194063711919c1a4841e97e5b9779396139eb47ac34186da9c318e8263f0f7` | `9ca379d337b50cadb4b5ad7a67076d7125199694a472727db564bc37045cd85d` | match without metadata | 128 bytes |

These values are candidate evidence, not approvals. A reviewer must bind each
artifact to a creation transaction or formal versioned deployment record and
approve the exact runtime hash independently.

The decoded constructor values and their candidate SHA-256 digests are
consolidated in `docs/phase-0-constructor-provenance.md`.

## Required decisions

1. **Registrar ABI:** approve `baseExtension()` as the TLD accessor and record
   `country` as the expected value, using
   `docs/phase-0-registrar-controller-abi-approval-draft.md`.
2. **Commitment (recorded):** the live `0–120` second window is immutable in
   the deployed controller. The current manifest records the temporary
   `EXISTING_DEPLOYED_0_TO_120_ACCEPTED` decision with the exact `0` and
   `120` values, `riskAccepted: true`, required controls, an immutable
   decision reference, and a matching canonical record digest. Fresh Phase 0
   reads must continue to match those values. The future `60–3600`
   controller path remains documented in
   `docs/phase-0-registrar-controller-replacement.md`; its local records do
   not authorize a Mainnet change.
3. **Resolver:** approve its actual immutable values. Because the trusted
   controller differs from the active registrar, choose
   `EMPTY_DATA_ONLY` for initial registration DNS and
   `REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS` after every transfer, using
   `docs/phase-0-public-resolver-authorization-approval-draft.md`.
4. **EWS:** record a named `IN_MVP` or `OUT_OF_SCOPE` decision. The current
   recommendation is `OUT_OF_SCOPE`. The legacy production UI review in
   `docs/phase-0-legacy-production-review.md` supports this because the
   historical user-facing registration flow calls DC and contains no EWS ABI,
   address, or call path; it is supporting evidence only, not approval. The
   prepared decision is `docs/phase-0-ews-scope-approval-draft.md`.
5. **DNS:** name the parent-zone controller, authenticated delegation method,
   three nameservers, delegated probe name, and immutable proof of delegation.
   The proof now requires a versioned `dnsDelegation` bundle in
   `api/_lib/phase-zero/operational-evidence.js`, with its digest copied to
   `dns.delegationEvidence.bundleSha256`; the manifest record also keeps its
   own canonical `evidenceSha256`.
6. **PowerDNS:** attach a rollback evidence bundle with operator, timestamp,
   immutable reference, and SHA-256.
7. **Vercel:** retain the linked-project deployment ID/logs proving the frozen
   pnpm install, build, Vite application, and Functions all completed. Its
   `/api/health` response must return `ok: true`, all six configured contracts,
   Harmony Mainnet, and the exact approved source revision.
8. **DC configuration history:** the generated history observation now
   reconciles the decoded initial tuple with the active owner-controlled tuple
   through historical reads and successful internal setter traces at blocks
   `39546159`, `39547618`, `41687221`, and `43922397`. A named reviewer
   must approve that snapshot and digest in an immutable reference. The gate
   rejects an unreviewed configuration transition.

For schema 16, ABI, contract approval, EWS classification, resolver
authorization, DC configuration history, commitment policy, DNS parent control,
delegation evidence, and deployment records are all digest-bound individually.
A syntactically valid but non-matching SHA-256 is treated as missing evidence.
Use `npm run phase0:record-digests` to print the canonical expected values and
`npm run phase0:record-digests -- --require-matches` as the final local
preflight. These commands calculate and compare digests only; they never approve
or modify the manifest.

Run `npm run phase0:validate`, `npm test`, and `npm run build` after the
manifest is updated. The top-level `approval.evidenceSha256` must match the
canonical SHA-256 of the versioned manifest with that field nulled during hash
calculation; `approval.sourceRevision` must equal
`deployment.sourceRevision`. Only a fresh `READY` permits write flows. Local `docs/`
references in pending manifest records are reviewer hints; approved records
must use immutable references accepted by the gate.

`npm test` and `npm run build` both execute `npm run check:security`, which
statically rejects external scripts/analytics, unsafe commitment-secret network
paths, backend access to the browser commitment journal, weak CSP, and
private-looking Vite public variables.
