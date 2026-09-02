# Phase 0 Build Validation

Status: `VERCEL_PREVIEW_OBSERVED; APPROVED_DEPLOYMENT_EVIDENCE_PENDING`  
Collected: 2026-09-02

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

This proved the then-reviewed source, lockfile, Vite configuration, and Sites
preparation script build together outside the mounted workspace filesystem.
It must not be treated as a clean-build attestation for a later Git revision.

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

## Observed Vercel preview — 2026-09-02

The existing linked Vercel project published the following preview for the
current local Git revision:

```text
https://domains-country-dhqk37onm-think-in-coins-projects.vercel.app/
```

A read-only verification at `2026-09-02T01:01:27Z` returned `HTTP 200` for
the SPA with `x-robots-tag: noindex` and the restrictive application CSP. Its
`/api/health` endpoint returned `ok: true`, Harmony chain ID `1666600000`, all
six configured addresses with bytecode present, and
`sourceRevision: 9eb27e510e66afd2a4dbded5629cadc17a4b65bf`. The local
`HEAD` at verification was the same full revision.

This proves that this preview served the Vite application and Functions with
the expected Harmony configuration. It is not yet a final deployment approval:
retain the Vercel deployment ID and build logs, then bind the immutable
reference, reviewer and timestamp to the manifest before setting
`deployment.status` to `VERIFIED`.

Re-check the observed preview without modifying the manifest:

```bash
npm run phase0:verify-vercel-preview -- \
  --url https://domains-country-dhqk37onm-think-in-coins-projects.vercel.app \
  --expected-source-revision 9eb27e510e66afd2a4dbded5629cadc17a4b65bf \
  --output docs/phase-0-vercel-preview-observation.json
```

The resulting JSON is discovery evidence only. It is intentionally excluded
from the stable evidence index because its observation timestamp and HTTP
headers legitimately change between checks.

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

## Mounted workspace observation — 2026-09-02

An `npm run build` attempt in the mounted working tree passed the security
preflight but remained at Vite's `transforming…` stage for two minutes without
a terminal result. It was interrupted rather than being reported as a passing
build. This is neither a Vercel result nor proof of a compile failure; the
previous isolated build shows that the mounted filesystem can be a materially
different execution environment. A fresh isolated reproduction for the current
revision is required before recording a new local build result.
