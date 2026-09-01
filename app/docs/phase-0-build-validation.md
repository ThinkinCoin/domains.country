# Phase 0 Build Validation

Status: `LOCAL_REPRODUCED; VERCEL_DEPLOYMENT_PENDING`  
Collected: 2026-09-01

## Clean local reproduction

An isolated copy of `app/` was installed using the canonical lockfile and then
built with the exact commands configured for Vercel:

```bash
pnpm install --frozen-lockfile
pnpm build
```

Result: exit code `0` after a clean install of 505 packages. Vite transformed
9,398 modules and produced `dist/client`, `dist/server/index.js`, and
`dist/.openai/hosting.json`. This proves the current source, lockfile, Vite
configuration, and Sites preparation script build together outside the mounted
workspace filesystem.

Rollup emitted non-fatal `/*#__PURE__*/` annotation warnings from transitive
`ox` packages and a chunk-size warning for the Reown/AppKit dependency graph.
Neither warning failed the build. The large wallet-connect chunk should be
addressed as a performance follow-up, not by weakening Phase 0 controls.

## Vercel configuration check

`vercel.json` now specifies:

- `pnpm install --frozen-lockfile`;
- `pnpm build`;
- `dist/client` as the output directory.

The local Vercel CLI parsed those overrides successfully. It was not allowed to
run a remote-project build from an unlinked temporary directory, because doing
so could create or link an external Vercel project. No deployment was created.

## Remaining deployment evidence

After this revision is committed and deployed through the existing
`domains.country` Vercel project with `app/` as Root Directory, retain the
deployment URL/ID and logs proving all three configured commands completed.
Record that immutable deployment reference in the final Phase 0 approval
record under `deployment`. The gate requires `deployment.status: "VERIFIED"`,
the Vercel deployment ID/URL, the full source commit SHA, the frozen commands,
reviewer, timestamp, and immutable evidence reference. A remote deployment must
still serve the Vite application and Vercel Functions before the final Phase 0
release decision can be `READY`.
