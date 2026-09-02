# domains.country Railway API

This package owns server-side concerns only: indexed state, admin authentication,
allowlist, Phase 0 production gating, and DNS-publication coordination. It never
receives wallet private keys, commitment secrets, or signed user transactions.

## Services

- API service: root directory backend, command npm start.
- Worker service: same source and variables, override command to npm run worker.
- PostgreSQL: attach a Railway PostgreSQL service and set DATABASE_URL.

Run the migration with:

    psql "$DATABASE_URL" -f migrations/001_initial.sql

Set CORS_ALLOWED_ORIGINS to exact public application origins. Add Vercel preview
URLs one-by-one; wildcard preview origins are intentionally unsupported.

INDEXER_ENABLED and POWERDNS_PUBLISHER_ENABLED are false by default. Enabling
either still requires a READY Phase 0 decision; the worker refuses to act while
the gate is blocked.
