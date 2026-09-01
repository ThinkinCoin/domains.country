# Phase 0 Evidence Process

The gate reads `api/_lib/phase-zero/evidence-manifest.js`. Environment variables cannot approve contracts, EWS scope, DNS delegation, commitment risk, or PowerDNS rollback. Even when every individual record is complete, the manifest must have a versioned top-level approval with reviewer, timestamp, and evidence reference.

## Contract baseline approval

For each of the six contracts, record:

- the configured Harmony Mainnet address and deployment transaction;
- a compilable source or reproducible compiler artifact;
- compiler version, optimizer settings, linked libraries, and constructor inputs;
- the independently calculated runtime bytecode hash;
- a stable evidence reference and explicit reviewer approval.

Set `source.status` to `VERIFIED` and `approval.status` to `APPROVED` only after reproduction. Never copy the current RPC hash into `approvedBytecodeHash` as its own justification.

Collect a reproducible discovery snapshot with:

```bash
npm run phase0:collect-provenance
```

The generated `docs/phase-0-provenance-snapshot.json` compares explorer and RPC bytecode and checks Sourcify for full or partial source matches. `docs/phase-0-source-candidates.md` records the available public source candidate. An explorer/RPC runtime match, a public source candidate, or a missing Sourcify record remains discovery-only until verified source and deploy evidence are available.

## ABI and architecture decisions

RegistrarController evidence must prove `baseExtension()` (`0xc6682862`) and its `string` return type. Record the ABI artifact and the reviewer/timestamp that verified it. The current read-only probe returns `country`; `base()` is retained only as a non-blocking legacy probe.

`docs/phase-0-public-resolver-authorization.md` records the discovered resolver authorization model: trusted controller/reverse registrar, ENS Registry owner, Name Wrapper ownership, and owner-approved operators. The manifest must identify all four deployed addresses, source artifact, reviewer, and timestamp before approval. `owner()` is not a requirement. EWS must be classified as `IN_MVP` or `OUT_OF_SCOPE` with source-backed rationale, reviewer, timestamp, and approval.

`docs/phase-0-ews-classification.md` records the current technical recommendation. It is discovery evidence only and does not satisfy the approval requirement by itself.

## Operational evidence

The commitment policy must match the live minimum and maximum ages and require a non-zero minimum. If the deployed minimum remains zero, registration stays blocked pending contract action.

DNS evidence must identify control of the `.country` parent, the authorized delegation mechanism, three real project nameservers, and a publicly delegated probe domain. PowerDNS evidence must include the operator, timestamp, immutable reference, and SHA-256 digest for a test proving that a failed publication leaves the last valid zone served.

The pending operational runbooks are `docs/phase-0-commitment-decision.md` and `docs/phase-0-dns-operation.md`. They describe the work required to produce evidence; they are not approvals.

After review, rerun:

```bash
npm run phase0:validate
npm test
npm run build
```

Only a fresh `READY` result may enable writes.
