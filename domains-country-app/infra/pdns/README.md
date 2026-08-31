# PowerDNS operation

Use PowerDNS Authoritative as the DNS serving layer for zones delegated from `.country` to project-operated nameservers.

Required MVP behavior:

- never publish a zone before parent delegation is confirmed;
- publish only after the matching on-chain version reaches the configured confirmation depth;
- keep the last valid served zone if publishing a newer version fails;
- record the attempted version, prior version, PowerDNS response, error and rollback result in PostgreSQL;
- show any gap between confirmed on-chain state and published DNS state in the user panel.

The API key must remain server-side only through `POWERDNS_API_KEY`.
