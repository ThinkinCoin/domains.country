# Phase 0 External Evidence Requests

Status: `REQUEST_TEMPLATE_ONLY`  
Prepared: 2026-09-02  
Purpose: collect the non-sensitive, immutable evidence required to move the
production Phase 0 gate from `BLOCKED` to `READY`. Completing this document is
not an approval and does not enable writes.

## 1. Technical contract reviewer

Provide one reviewed baseline package for all six deployed contracts. For each
address, attach the source/artifact immutable reference, source and ABI
SHA-256, compiler/version/optimizer settings, reproduced runtime hash,
creation transaction or reviewed creation-artifact record, decoded constructor
arguments, reviewer identity and timestamp.

| Component | Active address |
| --- | --- |
| RegistrarController | `0x76c6fE3aEe636f88d01De64931514e8CD64D94Fb` |
| DC | `0x547942748Cc8840FEc23daFdD01E6457379B446D` |
| EWS | `0xf90dab949d3853c418bE361930028644B4EBcDE4` |
| BaseRegistrar | `0x4D64B78eAf6129FaC30aB51E6D2D679993Ea9dDD` |
| TLDNameWrapper | `0x4Cd2563118e57B19179d8DC033f2B0C5B5D69ff5` |
| PublicResolver | `0x46E37034Ffc87a969d1a581748Acf6a94Bc7415D` |

Use the creation traces and candidate artifacts named in
`phase-0-approval-packet.md`; they are review inputs, not approved baselines.
For RegistrarController, explicitly approve `baseExtension()` with expected
value `country`; do not approve the legacy `base()` probe. For PublicResolver,
approve the wrapper/registry authorization model and the mandatory
`REQUERY_ON_CHAIN_OWNER_AND_PERMISSIONS` post-transfer policy. For EWS, issue
a named `OUT_OF_SCOPE` decision for the registrar/DNS MVP, or provide the full
MVP permission and UI scope required for `IN_MVP`.

## 2. Contract owner / deployer

The current RegistrarController has an immutable `0–120` second commitment
window. Public registration cannot be approved with this configuration. If
registration is in scope, deploy a replacement controller with a non-zero
minimum age and a larger maximum age, then provide:

- deployment transaction and contract address;
- constructor arguments and compiled artifact reference;
- updated TLDNameWrapper/BaseRegistrar/other dependent permission evidence;
- fresh read-only `baseExtension`, commitment-age, availability, price, commit,
  register-precondition and renewal probes;
- migration/rollback decision and named owner approval.

Do not provide a private key, seed phrase, RPC credential or unsigned wallet
session. The prepared sequence is in `phase-0-registrar-controller-replacement.md`.

## 3. Parent `.country` delegation operator

Provide the authenticated change record proving authority to delegate a child
zone beneath `.country`, the named organization/account responsible, and the
approved mechanism. Provision three project-controlled authoritative servers
(`ns1`, `ns2`, `ns3`) and one disposable probe such as
`phase0-<change-id>.country`.

Supply a non-sensitive JSON delegation bundle accepted by:

```bash
cd app
npm run phase0:verify-dns-delegation -- --evidence <delegation-evidence.json>
```

It must bind the probe name, exactly three project nameservers, direct parent
NS answers, direct project SOA answers, operator, timestamp and immutable
change reference. NS records inside the probe zone alone are not delegation
evidence.

After validation, the final integration commit must copy this bundle to
`api/_lib/phase-zero/operational-evidence.js` as `dnsDelegation`, set the
operational evidence status/source revision, and copy the bundle digest into
`dns.delegationEvidence.bundleSha256` in `evidence-manifest.js`. The manifest
record still needs its own canonical `evidenceSha256`.

## 4. PowerDNS operator

Run the controlled rollback exercise from `phase-0-dns-operation.md`: preserve
a valid zone revision, deliberately reject a later candidate, and prove that
all three authoritative servers still serve the prior SOA serial. Provide the
non-sensitive evidence bundle accepted by:

```bash
cd app
npm run phase0:verify-powerdns-rollback -- --evidence <rollback-evidence.json>
```

The operator can generate the bundle from captured artifacts and live direct
SOA responses without sharing PowerDNS credentials:

```bash
npm run phase0:collect-powerdns-rollback -- --zone <probe>.country ...
```

Include revision identifiers, zone/error digests, preserved serial, direct SOA
responses, timestamps, operator and immutable audit reference. Do not provide
PowerDNS credentials or API tokens.

## 5. Release reviewer

After the reviewed evidence is committed, deploy that exact commit through the
linked Vercel project with `app/` as Root Directory. Capture the immutable
deployment ID/URL, frozen install command, build command, output directory,
reviewer and timestamp. Verify it with:

```bash
cd app
VERCEL_CLI_PATH="$(command -v vercel)" npm run phase0:collect-vercel-inspection -- \
  --url https://dev.domains.country \
  --expected-source-revision <full-40-character-commit> \
  --output docs/phase-0-vercel-inspection-observation.json
```

`dev.domains.country` is a moving latest-dev alias; the approval record must
use the immutable `*.vercel.app` deployment URL returned by the collector.

## Final integration order

1. Commit the approved source/evidence records.
2. Populate digest-bound manifest and operational-evidence records only from
   those approved packages.
3. Commit the final evidence revision.
4. Deploy that exact revision to Vercel.
5. Re-run `npm run phase0:validate` against Harmony and public DNS.
6. Enable production writes only if the fresh result is `READY`.
