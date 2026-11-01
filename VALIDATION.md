# Validation and design review

Final validation: 1 November 2026 (UTC). The included `dist/` is the production export checked below. Source, manifest and lockfile were mirrored into an isolated temporary build directory for dependency installation and checking; dependency directories and browser binaries are excluded from the submission.

## Requirement coverage

| Requirement | Result and evidence |
| --- | --- |
| Clean dark Squeekchain dashboard | Implemented; [desktop capture](docs/screenshots/desktop.png) |
| Three specified live API endpoints | All returned HTTP 200 with CORS `*` in the real-browser check; local resources loaded successfully |
| Block height, cumulative work, distance, status and live SQK supply | Checked against actual response fields; base units use exact integer conversion |
| Recent settlements table | Search, sort, pagination, full hash, clipboard, exact amounts and chain-aware explorer links passed |
| Responsive layouts and primary action on first 390px screen | Checked at 320, 390, 640, 800, 1024 and 1440; [390×844 capture](docs/screenshots/mobile.png) shows brand, refresh and all four network metrics |
| Auto-refresh every 60 seconds | Clock-driven test verifies no second request before 60s, all three requests after 60s, pause and manual refresh while paused |
| Production export, source and lockfile | `dist/index.html`, local assets, `src/`, Vite/TypeScript configuration and `package-lock.json` included |
| Relative static URLs | Vite base `./`; tested from `/dashboard/` and manually from `/preview/`, without a route-rewrite server |
| Metadata | Title, SVG favicon, description, og:title, og:image and a 1200×630 PNG are present; the referenced share image returned HTTP 200 |
| Documentation | README has install/preview/rebuild instructions and the Squeekchain Buildooooor community-project note; DESIGN.md documents final source |

The dashboard is a graphite data workspace carried by a lime wheel mark, a single primary refresh action and a real hourly work chart.

## Executed checks

Commands below ran against the final source/export. The build and typecheck were run through npm's `--prefix` option in the isolated build copy; the source and export were subsequently compared to the delivered files.

| Command/check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed, exit 0 (`tsc --noEmit`) |
| `npm run build` | Passed, exit 0; Vite produced the HTML, CSS, JS, local WOFF2 fonts, favicon and share card |
| `npm run test:interactions` | Passed, exit 0; 15 Chromium groups passed, 0 failed; 1 WebKit group not verified |
| `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste` | Passed, exit 0; 16/16 checks. An explicit temporary Playwright module and browser location avoided dependency discovery outside the task |
| Manual production-browser inspection | Desktop and mobile screenshots; live Refresh data, Blocks chart selection and expanded transaction details; no console errors or failed local requests observed |
| Browser-computed contrast | Solid foreground/background pairs measured below; final control border remeasured at 3.58:1 |

[Machine-readable results](docs/validation-results.json) contain the actual interaction group names, timestamps, limitations and probe outputs. The local test servers were bounded to validation and are not part of the static site.

The 15 Chromium groups cover:

1. Actual live API access, CORS, metric accuracy, locally loaded Manrope, share image and static assets at a subpath.
2. Search by full transaction hash, empty results, clear search, pagination and oldest-first ordering.
3. Expanded transaction details, full hash, exact token amount, clipboard and correct Sepolia explorer URL.
4. Work/blocks/settlements chart selection, hourly rows and exact supply disclosure.
5. 60-second auto-refresh, pause and manual refresh while paused.
6. Loading state and duplicate refresh prevention.
7. Partial failure, retained successful data and retry recovery.
8. Total initial API failure with unavailable values and an automated accessibility check.
9. Malformed data isolated to its source without labelling it live.
10. 12-second request timeout with retry instructions and detailed source error.
11. Delayed responses and stale telemetry distinctly labelled.
12. Honest empty-settlement and empty-hourly-data states.
13. Reflow and axe checks at all six widths, plus expanded details and long values at 320px.
14. Keyboard navigation, compact-link accessible names, visible focus styles and keyboard chart activation.
15. Reduced motion, forced-color focus, RTL mirror and 200% CSS text enlargement without horizontal overflow.

The successful fixtures in controlled tests are freshly fetched real API payloads. Timestamps are adjusted only inside intercepted test requests; deliberately empty, malformed and failed responses exercise edge cases. Production has no fixture import, fabricated data or fallback balance.

## Better Interface: six-domain coverage

Applied the pinned workflow and core principles for all six domains while implementing, then reviewed the export and fixed the findings below. The design-critic reference supplied the probe thresholds; its review-only instruction to change nothing was data, not a change to the implementation task.

| Domain | Source checks | Rendered/interaction checks | Limits |
| --- | --- | --- | --- |
| Accessibility | Native buttons, links, select, details, table headings/caption, control labels, skip link, stable status region, reduced-motion guard | Keyboard path, pressed/switch/expanded states, visible refresh ring, computed names, forced colors; axe found zero violations at six widths and the total-failure state | No screen-reader or physical-device session; no claim of full WCAG compliance |
| Layout | Shared alignment, grouped spacing, logical properties, min-width safeguards, content-based breakpoints, reading order | All six widths; no document overflow; 390 first screen; long hash disclosure; 200% text growth; RTL mirror | Native browser zoom not tested; not every possible width or translated language |
| Writing | Labels checked against handlers; UTC explicit; settled/telemetry/archived differences explained; error and empty copy offers a next action | Loading, success, paused, delayed, empty, malformed, timeout, partial and total failure reviewed | API values and availability may change after this check |
| Typography | Six sizes; three weights; tabular numbers; full values reachable; prose measure and line heights | Local Manrope FontFace reported loaded, WOFF2 returned 200; mobile wrapping and exact-value expansion inspected | No exhaustive font fallback or operating-system rendering comparison |
| Colors | Primitive/semantic roles; distinct success/warning text; one filled primary action | Actual solid-background contrast measured; probe text contrast passed; control boundary corrected and remeasured | Gradient chart artwork and forced-color palettes are not covered by the solid-pair ratios |
| UI | Flat tonal panels; consistent icons/radii; explicit hover/focus/active/loading/empty states; named 120ms transitions | Refresh and chart controls, native disclosures, copy success, disabled pagination, responsive row expansion; reduced-motion check passed | No Animations-panel replay at 10% speed; WebKit runtime unavailable |

## Findings and corrections

All applicable findings below were fixed before the final build. No high or medium implementation finding remains open.

### 1. Accessibility: compact navigation lost its names (medium)

Source: `src/App.tsx:46`, the sidebar navigation links; `src/styles.css` compact sidebar rule.

Before: hiding the visible link text in the icon rail also removed the accessible text at intermediate widths. Change: added `aria-label={item.text}` to the native links. Why: navigation needs a descriptive name at every supported width. Reproduction: 900px viewport, inspect navigation names or use the accessibility tree. Final evidence: the keyboard/name validation group and six-width axe checks passed.

### 2. Accessibility: unavailable supply retained meter attributes (medium)

Source: `src/App.tsx:76`, `.supply-progress`.

Before: removing the meter role in the no-data state left value/name attributes on a generic element; axe reported `aria-allowed-attr` and `aria-prohibited-attr`. Change: meter role, name and values are all conditional on a valid economy response. Why: unavailable data must not announce a meaningful numeric meter. Reproduction: make all three requests return HTTP 503. Final evidence: unavailable values stay explicit and the failure-state axe scan reports zero violations.

### 3. Layout and typography: enlarged text overflowed the header (high)

Source: `src/styles.css:109` (`.topbar`) and `src/styles.css:371` (narrow metric grid); related wrapping rules for segmented controls, supply labels, source summary and footer.

Before: the 390px layout grew to 415px during the automated 200% text check; the header's network label escaped its row and metric digits split across narrow cards. Change: allow structural rows to wrap and use `repeat(auto-fit, minmax(min(100%, 8rem), 1fr))` for the narrow metrics. Why: enlarged text must reflow without clipping critical values. Final evidence: the 200% text check has scroll width 390px, the grid becomes a single 358px column and the corrected render was visually inspected. This is text enlargement, not a claim about browser-native zoom.

### 4. Colors: control boundaries were too subtle (medium)

Source: `src/styles.css:8`, `--neutral-700` feeding `--color-control-border`.

Before: the search boundary `#48554b` against surface `#191c1a` measured 2.19:1. Change: use `#67766b` for search/select/secondary control boundaries. Why: identifiable control boundaries should reach 3:1. Final evidence: the rendered search boundary measures 3.58:1; decorative panel borders remain intentionally subtle.

### 5. Data display: chart line and labelled scale differed (medium)

Source: `src/components/ActivityChart.tsx:18`, `coordinates`, and its endpoint circle.

Before: a 10px inner pad in the numeric mapping disagreed with ticks spanning the entire plot. Change: map each value to `height - value / ceiling * height`, and place the endpoint at the true x coordinate. Why: chart geometry should correspond to the displayed scale. Final evidence: source mapping review, rendered chart inspection and all chart mode/hourly-table interaction checks passed.

### 6. Writing: complete failure was labelled partial (low)

Source: `src/App.tsx:33`, `connectionLabel`.

Before: an initial failure of all endpoints could say Partial data. Change: show Data unavailable when there are no successful sources; use Partial data only when some sources loaded, and Refresh issue for retained complete data. Why: the status should say exactly what the page knows. Final evidence: total-failure, malformed-source and partial-recovery groups passed.

An intermediate build also rejected an unsupported font entrypoint; restoring the package's supported main CSS import resolved it. The final typecheck and production build pass. An interrupted temporary export-copy/check attempt was discarded; the final export was rebuilt, copied and rechecked successfully.

## Rendered color evidence

Measured in the production Chromium page, using computed RGB foregrounds and resolved solid backgrounds, with the WCAG relative-luminance formula. Values rounded to two decimals.

| Rendered pair | Ratio |
| --- | --- |
| Metric value `#edf2ee` on `#191c1a` | 15.16:1 |
| Metric supporting text `#939e96` on `#191c1a` | 6.19:1 |
| Subtitle `#939e96` on `#101211` | 6.78:1 |
| Primary button text `#1a2413` on `#b8ee83` | 11.94:1 |
| Active navigation `#b8ee83` on `#202b19` | 10.98:1 |
| Corrected search boundary `#67766b` on `#191c1a` | 3.58:1 |

The refresh focus ring was visibly inspected at 390px: a 2px `#caf4a1` outline with 4px offset. See [keyboard screenshot](docs/screenshots/keyboard-mobile.png). The probe found all measured text above 4.5:1, or 3:1 for large text. Seven compact controls were below the probe's comfortable 44px size but passed its 24px/spacing criterion; primary mobile controls use 44px targets.

## Limitations and handoff

- WebKit was installed and launch was attempted, but its runtime could not start because required browser libraries were unavailable. Its interaction group is **not verified**, not passed.
- No real iPhone/Android, native screen reader or browser-native 200% zoom session was performed. The checked CSS text enlargement, emulated viewports and accessibility tree are distinct evidence.
- The automated scan and visual review are bounded checks, not an accessibility certification. Motion was checked by preference and source, not by a 10% Animations-panel replay.
- All three live APIs worked during validation. Network availability, data freshness, future schema changes and API CORS are external dependencies. Errors and source timestamps remain visible in the site. The tested deployment identified itself as Sepolia testnet.
- No requester-only input is missing. No data or successful result was fabricated. No hosting or wallet transaction was attempted; the deliverable is the complete static export, source and documentation.

Guidance licenses and attribution are retained in `docs/design-guidance-LICENSE.txt` and DESIGN.md. Runtime/font licenses are included in `public/third-party-notices.txt` and `dist/third-party-notices.txt`. No dependency trees, package caches, raw API fixtures or browser binaries are included in the submission.

## Final artifact integrity

All required outputs are present and nonempty. HTML metadata and relative asset references, CSS font references, PNG signatures/chunk checksums, WOFF2 signatures, JSON files and local documentation links passed validation. Delivered source, configuration, public assets and every export file match the successfully checked build byte for byte. The production export is 439,211 bytes; the complete deliverable is approximately 0.98 MiB, below the 8 MiB limit. No ignore file was added or modified. Task previews were closed after inspection.
