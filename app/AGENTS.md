# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Durable design decisions

- Public home: full-bleed editorial image, dark navy atmosphere and one primary domain-search form, inspired by the supplied Squarespace composition without copying its brand assets.
- Authenticated product: white operational UI based on the retained domains.country reference, with Instrument Serif for domain names and Inter for controls/data.
- Product language stays in English and avoids speculative crypto language.
- Confirmation on Harmony and DNS publication are separate semantic states, always expressed with text plus icon and never color alone.
- Irreversible transfers require full destination review, a plain-language warning and explicit confirmation before wallet signing.
