# Public DNS Delegation and PowerDNS Rollback Runbook

Status: `PENDING_OPERATIONAL_EVIDENCE`

## Parent delegation

An NS record inside a child zone does not delegate that zone. The operator controlling the parent `.country` zone must create the delegation.

Before approval, record in the Phase 0 manifest:

- the entity and account that control `.country` delegation;
- the authorized change mechanism and audit reference;
- three project nameservers: `ns1`, `ns2`, and `ns3` under the project-controlled namespace, with reachable authoritative DNS service;
- a disposable delegated probe name under `.country`.

## Publicly verified parent authority

The IANA root-zone delegation record for `.country`, last updated on June 16,
2026, identifies **Internet Naming Co.** as sponsoring organisation and
**Tucows.com, Co.** as technical contact. It names the four TRS authorities
below. This establishes the public registry and technical-operation chain, but
does not prove that the project controls a registry account, an authenticated
delegation API, or a change-request workflow.

Read-only discovery on September 2, 2026 observed `.country` served by
`ns01.trs-dns.com`, `ns01.trs-dns.net`, `ns10.trs-dns.org`, and
`ns10.trs-dns.info`. Direct SOA queries to all four authorities returned
`ns.trs-dns.com. trs-ops.tucows.com. 1788308154 1800 900 604800 300`.
The IANA record and these live responses identify the current parent authority,
but do **not** prove that the project controls an account or authorized change
workflow. The required proof remains an operator-approved delegation change
reference for the selected probe name.

Authoritative public reference:

- IANA, [Delegation Record for .COUNTRY](https://www.iana.org/domains/root/db/country.html)

The operational request must therefore go through Internet Naming Co.'s
authorized registry process or its designated Tucows technical workflow. Do
not infer authorization from the public IANA record, WHOIS/RDAP data, or a
successful recursive DNS lookup.

Collect a fresh, non-approving public snapshot before the operator review:

```bash
npm run phase0:collect-parent-dns
```

It writes `docs/phase-0-parent-dns-snapshot.json` with SHA-256 digests of the
IANA response, recursive NS response, and direct SOA results for all discovered
parent authorities. The file is discovery-only and intentionally excluded from
the stable evidence index because live DNS and IANA observations can change.

Latest discovery snapshot generated on September 2, 2026:
`a29f59a216f12e2bb2c2d5d7d93ddf5ddd31780e7f0b674c45d0fdfbe607a776`.
It observed the same four TRS parent nameservers and SOA serial `1788308470`.

Discovery commands executed:

```bash
dig @1.1.1.1 +time=10 +tries=1 +noall +answer +authority country. NS
dig @8.8.8.8 +time=10 +tries=1 +noall +answer +authority country. NS
dig @198.41.0.4 +time=10 +tries=1 +norecurse +noall +answer +authority country. NS
dig @ns01.trs-dns.com +time=10 +tries=1 +noall +answer country. SOA
dig @ns01.trs-dns.net +time=10 +tries=1 +noall +answer country. SOA
dig @ns10.trs-dns.org +time=10 +tries=1 +noall +answer country. SOA
dig @ns10.trs-dns.info +time=10 +tries=1 +noall +answer country. SOA
```

A local resolver query was explicitly rejected as evidence because it rewrote
`country.` to `country.Home` and timed out. Phase 0 DNS evidence must use
explicit recursive or authoritative servers.

Verify each condition from an independent resolver and each authoritative server:

```bash
dig NS <probe>.country @<parent-authoritative-server>
dig SOA <probe>.country @ns1.<project-nameserver-domain>
dig SOA <probe>.country @ns2.<project-nameserver-domain>
dig SOA <probe>.country @ns3.<project-nameserver-domain>
```

The parent response must list exactly the three project nameservers. The probe zone must return the expected SOA directly from all three servers.

The Phase 0 gate repeats this at runtime after the manifest is approved. It
first compares a public recursive NS response with the recorded set, then
queries every discovered `.country` parent authority directly for the probe NS
delegation and every recorded project nameserver directly for the probe SOA.
One stale parent server, missing project SOA, unreachable nameserver, or
different NS set keeps `dns.projectDelegation` blocked.

## PowerDNS publication and rollback

Use immutable zone revisions. A publication attempt may stage a candidate revision, but it must not replace the currently served revision until validation succeeds.

1. Capture the active revision, SOA serial, zone export digest, and authoritative query result.
2. Publish a valid candidate revision in a controlled environment and verify the expected DNS answer through every authoritative server.
3. Intentionally submit a malformed or rejected follow-up revision.
4. Confirm that PowerDNS continues serving the previously valid revision and SOA serial.
5. Save command output, API/audit identifiers, timestamp, operator identity, the previous revision identifier, the rejected candidate revision identifier, SHA-256 digests of the last valid zone export and rejection/error output, the prior/served SOA serial, and direct SOA responses from all three nameservers.

Only after that test may `powerDnsRollback.status` become `VERIFIED`. The
manifest must bind the zone name, both distinct revisions, the preserved serial,
and one direct authoritative response per project nameserver. The gate repeats
the authoritative SOA query and blocks if a server no longer serves that serial.
The UI must show a newer on-chain version as unpublished whenever publication
fails or lags behind the active PowerDNS revision.

## Rollback evidence bundle

Record the non-sensitive result as versioned JSON and validate its shape and
digest before attaching its immutable reference to the manifest:

```bash
npm run phase0:verify-powerdns-rollback -- --evidence <path-to-evidence.json>
```

The bundle requires exactly three distinct project nameserver observations,
matching preserved/served SOA serials, distinct valid and rejected revisions,
zone and error SHA-256 digests, operator/timestamps, an immutable reference,
and a canonical `evidenceSha256`. The command validates the bundle itself; the
Phase 0 gate still queries the delegated authorities directly and remains the
source of truth for current service state.

For a final approval, copy the verified non-sensitive bundle into
`api/_lib/phase-zero/operational-evidence.js`, set its status to
`VERIFIED`, and bind its full Git revision to the deployment source revision.
The manifest's `powerDnsRollback` fields, evidence reference, and SHA-256
must exactly match that committed bundle. A manifest filled without the
versioned bundle remains blocked.
