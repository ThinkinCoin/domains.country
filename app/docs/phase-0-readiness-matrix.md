# Phase 0 Readiness Matrix

Status: `BLOCKED`  
Reviewed: 2026-09-02

This matrix maps the nine required conditions for production `READY`. It is a
review aid, not an approval record. The production gate remains fail-closed
until the versioned manifest, external evidence, and fresh runtime checks all
pass together.

| # | Required condition | Current state | Evidence already available | Exact remaining condition |
| --- | --- | --- | --- | --- |
| 1 | Six approved contract baselines | `DISCOVERY_EVIDENCE_GATHERED; APPROVAL_PENDING` | Reproduced artifacts, runtime comparisons, constructor tails, and archived CREATE traces for all six contracts. | Named reviewer must approve each source/deployment record, then create the six-contract bundle at the deployed Git revision. |
| 2 | RegistrarController ABI and origin | `DISCOVERY_EVIDENCE_GATHERED; APPROVAL_PENDING` | `baseExtension()` returns `country`; ABI, selectors, artifact and immutable-normalized runtime match are recorded. | Approve the pinned artifact/deployment provenance and digest in the manifest. `base()` remains non-blocking legacy discovery only. |
| 3 | PublicResolver authorization model | `DISCOVERY_EVIDENCE_GATHERED; APPROVAL_PENDING` | Resolver immutables and wrapper controller flags were collected. The model intentionally does not require `owner()`. | Approve Registry/Wrapper/trusted-controller values with `EMPTY_DATA_ONLY` initial DNS and mandatory post-transfer on-chain permission re-query. |
| 4 | EWS MVP classification | `RECOMMENDATION_COMPLETE; APPROVAL_PENDING` | Matching source, deployed trace and product-role analysis support `OUT_OF_SCOPE`. | Named owner/technical approver must record `OUT_OF_SCOPE`, rationale, immutable reference and digest. |
| 5 | Commitment window policy | `APPROVED_FOR_EXISTING_DEPLOYMENT` | Live controller is proven immutable at `0–120` seconds. The project elected to keep this established legacy-compatible window temporarily. The manifest now records a digest-bound `EXISTING_DEPLOYED_0_TO_120_ACCEPTED` policy with risk acceptance and the required browser-local/user-copy/future-hardening controls. | Keep the exact `0–120` values passing in each fresh Phase 0 run. Replacement controller remains future hardening unless the policy changes before release. |
| 6 | Real parent delegation | `BLOCKED_BY_DNS_OPERATOR` | Public parent authority is identified as Internet Naming Co./Tucows TRS; all four parent NS currently agree on SOA. | Provide actual `ns1`/`ns2`/`ns3`, a delegated disposable `.country` probe, authorized parent-change evidence, and a verified delegation bundle. |
| 7 | PowerDNS rollback proof | `BLOCKED_BY_DNS_OPERATOR` | Versioned bundle schema, collector and direct authoritative SOA verifier are implemented and tested. | Run a real rejected-publication exercise that proves the last valid zone/serial stays served by all three nameservers; attach immutable evidence. |
| 8 | Versioned evidence gate | `IMPLEMENTED_AND_TESTED` | Manifest requires per-record digests, full Git revision, immutable references, operational bundles and top-level approval; preflight rejects pending statuses. | Populate it only with reviewed, immutable evidence. No environment variable or frontend value can satisfy this condition. |
| 9 | Fresh Phase 0 and Vercel evidence | `LATEST_DEV_OBSERVED; APPROVAL_PENDING` | Isolated frozen-lockfile build and full tests pass. The latest-dev alias resolves to a READY Vite deployment at source revision `072b06aa0fbb022a430b153d66a9b2a339f37c00`, with healthy Harmony configuration and the corrected `DEV_BYPASS/enabled_dev` HTTP 200 response. | Commit and deploy the final reviewed source revision, then pin immutable Vercel deployment/build/health evidence to that exact revision with reviewer, timestamp and manifest digest before rerunning Phase 0. |

## Evidence map

- Contract review: `phase-0-approval-packet.md`,
  `phase-0-constructor-provenance.md`, and
  `phase-0-contract-trace-review-draft.json`.
- Registrar ABI and commitment: `phase-0-registrar-controller-abi.md` and
  `phase-0-registrar-controller-replacement.md`.
- Resolver and EWS: `phase-0-public-resolver-authorization.md` and
  `phase-0-ews-classification.md`.
- DC governance history: `phase-0-dc-configuration-history.md` and the
  generated `phase-0-dc-configuration-history-observation.json`. Historical
  reads and internal call traces now reconcile all five changed fields; named
  approval remains pending.
- DNS operations: `phase-0-dns-operation.md` and
  `phase-0-parent-dns-snapshot.json`.
- Evidence enforcement: `phase-0-evidence-process.md` and
  `api/_lib/phase-zero/evidence-manifest.js`.
- Build/deployment: `phase-0-build-validation.md`.

## Required closure order

1. Record technical approvals for items 1–4.
2. Keep the approved temporary `0–120` commitment-window policy in force and
   replacement-controller work as a future hardening path unless the
   policy decision changes before release.
3. Complete items 6–7 through the parent-zone and PowerDNS operators.
4. Commit the resulting records, deploy that exact revision, collect immutable
   Vercel evidence, and run the final read-only validation. Only `READY` may
   enable production writes.
