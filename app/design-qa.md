# Design QA — domains.country

## Comparison target

- Source visual truth: `C:\Users\mzfsh\.codex\skills\artifact-template-domains-country-ui\assets\reference.png` for authenticated product surfaces.
- Home composition reference: `C:\Users\mzfsh\AppData\Local\Temp\codex-clipboard-13da96d8-f254-47ea-be1d-5f3b99c57ec7.png` (1920 × 1976 px).
- Implementation URL: `http://localhost:5173/`.
- Intended comparison viewport: 1440 × 900 CSS px, device scale factor 1.
- State: public home, connected wallet, domain query `cafe`.

## Evidence status

- Source images: opened and inspected successfully.
- Implementation screenshot path: unavailable.
- Browser-rendered dimensions and density normalization: unavailable because the in-app browser's admin-enforced safety policy could not be verified when capture was requested.
- Full-view comparison evidence: blocked for the same reason.
- Focused-region comparison evidence: blocked for the same reason.
- Primary interactions tested in browser: blocked.
- Console errors checked in browser: blocked.

## Findings

- [P0] Browser-rendered evidence is unavailable.
  - Location: all implemented screens.
  - Evidence: the production build and Sites worker tests pass, but browser capture and interaction inspection were rejected by the browser's safety layer.
  - Impact: visual fidelity, responsive behavior, focus states and browser-console cleanliness cannot be certified from the rendered result.
  - Fix: retry the in-app browser verification only after the user explicitly approves a new attempt and the administrative safety check is available.

## Static implementation review

- Fonts and typography: Instrument Serif and Inter are self-hosted through package dependencies; hierarchy follows the editorial source direction.
- Spacing and layout rhythm: shared CSS tokens cover desktop and mobile layouts, including the sidebar-to-drawer transition and dense-table overflow behavior.
- Colors and visual tokens: the implementation uses named brand, surface, success, warning and danger tokens; asynchronous states are not color-only.
- Image quality and asset fidelity: the home uses a purpose-generated 16:9 photographic asset with right-side subject placement and left-side negative space.
- Copy and content: all product-specific copy is in Brazilian Portuguese and distinguishes Harmony confirmation from DNS publication.

## Comparison history

- No visual iteration could begin because the first browser-rendered capture was blocked.

## Implementation checklist

- Retry the 1440 × 900 home capture after explicit approval.
- Exercise search → duration → four-step registration → domain detail.
- Exercise DNS edit → signing feedback and transfer confirmation.
- Check mobile breakpoint at 390 × 844.
- Compare home against the supplied editorial reference and authenticated DNS view against the retained template.
- Fix any P0/P1/P2 differences and repeat until passed.

final result: blocked
