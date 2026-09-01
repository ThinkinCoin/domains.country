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
9,401 modules and produced 194 files under `dist/client`, plus
`dist/server/index.js` and `dist/.openai/hosting.json`. The build completed in
1 minute 58 seconds. The generated artifact hashes were:

| Artifact | SHA-256 |
| --- | --- |
| `dist/client/index.html` | `12f54fe9a4db900df054aea787dc4749a95ef14cbc93ab0d4b2ecc796773e3a8` |
| `dist/server/index.js` | `2dd0615a445143933d88d4271f54f5d63ee951421fcd08c5a7617bb09c564389` |
| `dist/.openai/hosting.json` | `d532abb65cf9ae20634b464d954cb4a08a0de9f3cd3cdf7f9c3ec8948826d947` |

This proves the current source, lockfile, Vite configuration, and Sites
preparation script build together outside the mounted workspace filesystem.

Rollup emitted non-fatal `/*#__PURE__*/` annotation warnings from transitive
`ox` packages and a chunk-size warning for the Reown/AppKit dependency graph.
The largest emitted chunk was 2,001.66 kB (562.86 kB gzip). Neither warning
failed the build. The wallet-connect bundle should be addressed as a
performance follow-up, not by weakening Phase 0 controls.

The same clean reproduction was repeated on 2026-09-01 after the evidence
manifest schema 10 and evidence-index gate changes. It again installed 505
packages with the frozen lockfile, transformed 9,401 modules, emitted the same
194 client files and the same three artifact digests above, and completed in
1 minute 58 seconds. This recheck was local only; it does not constitute a
Vercel deployment approval.

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
