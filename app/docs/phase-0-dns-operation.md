# Public DNS Delegation and PowerDNS Rollback Runbook

Status: `PENDING_OPERATIONAL_EVIDENCE`

## Parent delegation

An NS record inside a child zone does not delegate that zone. The operator controlling the parent `.country` zone must create the delegation.

Before approval, record in the Phase 0 manifest:

- the entity and account that control `.country` delegation;
- the authorized change mechanism and audit reference;
- three project nameservers: `ns1`, `ns2`, and `ns3` under the project-controlled namespace, with reachable authoritative DNS service;
- a disposable delegated probe name under `.country`.

Read-only discovery on September 1, 2026 observed `.country` served by `ns01.trs-dns.com`, `ns01.trs-dns.net`, `ns10.trs-dns.org`, and `ns10.trs-dns.info`; its SOA contact is `trs-ops.tucows.com`. This identifies the current authoritative DNS operation, but does **not** prove that the project controls an account or authorized change workflow there. The required proof is an operator-approved delegation change reference for the selected probe name.

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
