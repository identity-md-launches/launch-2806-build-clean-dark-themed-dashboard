# Squeekchain design system

## Overview

A community dashboard for people following Squeekchain's physical work and onchain settlements. The visual idea is a quiet graphite workspace with a lime wheel identity and clearly grouped, readable data. The layout puts live metrics and Refresh data before charts or explanatory text. It is a data tool with a compact navigation rail, not a landing page.

The source of truth is `src/styles.css`, followed by the components in `src/components/` and `src/App.tsx`. The dark theme is deliberate; there is no light theme or wallet flow.

## Colors

Primitives and semantic aliases are defined in `src/styles.css:1`. Components consume the semantic tokens, including separate chart and success roles.

| Token | Implemented value | Use |
| --- | --- | --- |
| `--color-bg` | `#101211` | Page canvas |
| `--color-bg-sidebar` | `#131614` | Navigation, table headings and expanded details |
| `--color-surface` | `#191c1a` | Metrics and panels |
| `--color-surface-hover` | `#202521` | Neutral hover and selected segment |
| `--color-border` | `#2b322d` | Decorative panel boundaries and table rules |
| `--color-control-border` | `#67766b` | Search, select and secondary control outlines |
| `--color-text` | `#edf2ee` | Primary text and values |
| `--color-text-secondary` | `#afb8b1` | Labels and secondary controls |
| `--color-text-muted` | `#939e96` | Supporting text, chart axes and timestamps |
| `--color-accent`, `--color-chart` | `#b8ee83` | Primary action, brand, active navigation; chart series has its own semantic alias |
| `--color-accent-hover`, `--color-focus` | `#caf4a1` | Primary hover and keyboard outline |
| `--color-accent-subtle` | `#202b19` | Active navigation background |
| `--color-on-accent` | `#1a2413` | Text on the primary filled button |
| `--color-success` | `#7dd7ad` | Connected telemetry and confirmed settlement cues |
| `--color-success-bg` | `#192b23` | Success badges |
| `--color-warning` | `#e6bc7b` | Failed/delayed source cues |
| `--color-warning-bg` | `#2a251b` | Inline warning background |

Status always includes text, not only color. Only Refresh data uses a filled primary action treatment. The line chart's area uses the chart token at 18% to 1% opacity; text is never placed over the gradient.

Measured solid-background text pairs are recorded in VALIDATION.md. The control-border token was corrected after measuring its original contrast. These measurements do not certify every possible external browser/color-management configuration.

## Typography

Manrope Variable is bundled locally through `@fontsource-variable/manrope` in `src/main.tsx`; its available weight range is 200–800. The interface uses only 400, 500 and 600. The fallback is `sans-serif`. The full hash uses `ui-monospace, monospace`; prose remains sans serif.

| Token | Size at the default root | Role |
| --- | --- | --- |
| `--text-caption` | 12px / 0.75rem | Metadata, chart axes, secondary labels |
| `--text-small` | 14px / 0.875rem | Desktop controls, table rows, metric labels |
| `--text-body` | 16px / 1rem | Panel headings and mobile form inputs |
| `--text-brand` | 20px / 1.25rem | Brand, mobile page heading, daily supply |
| `--text-heading` | 28px / 1.75rem | Desktop page heading, chart total, narrower metrics |
| `--text-value` | 32px / 2rem | Large metric and supply values |

Body line height is 1.5, headings 1.25–1.4 and values 1.3. Headings and large values use tight tracking down to -0.04em. Small copy has natural spacing and sentence case; the token symbol retains SQK. Numbers use tabular digits. Long-form explanations have a measure limit; full hashes and token values wrap without dropping digits. Short hashes in the table always have an expandable full value.

Manrope's Latin WOFF2 was observed loading from the local export, and its FontFace reported loaded. Font and package licenses accompany the export.

## Layout

The spacing scale is 4, 8, 12, 16, 20, 24 and 32px, defined as `--space-*`. CSS uses those values consistently, with compact 5–7px gaps for dots and icons. Desktop main content has a 1600px maximum width and 32px inset. Shared panel content edges are 24px on wide layouts and 20px on narrower ones.

At wide widths, the fixed sidebar is 220px. Four equal metric columns sit above an approximately 1.85:1 chart/supply split. The settlements table spans the main content width. Content remains in normal document flow; the header is not sticky.

| Breakpoint | Implemented adaptation |
| --- | --- |
| `78rem` / 1248px and below | Sidebar 200px, main inset 24px, panel edges 20px, reduced chart ratio |
| `64rem` / 1024px and below | Sidebar becomes a 76px icon rail; its links retain explicit accessible names; work column is hidden in the desktop table |
| `50rem` / 800px and below | Sidebar is replaced by a brand header and horizontal section navigation |
| `42rem` / 672px and below | 16px main inset; metrics use auto-fit with an 8rem minimum; chart and supply stack; table rows become labelled two-column summaries with full-width transaction details; work is shown again |
| `23rem` / 368px and below | Nonessential metric/section icons are removed; chart segments align to the leading edge |

At default text size, the narrow metric grid has two columns. Its minimum in rem allows one column when text is enlarged. The header, segmented control, supply labels, source summary and footer can wrap. Narrow form inputs use 16px text. Mobile primary, pagination, detail and select controls are at least 44px tall.

Rendered reflow was checked at 320, 390, 640, 800, 1024 and 1440 CSS pixels. The product, Refresh data and all four network metrics were observed on the 390×844 first screen. Font enlargement to 200% and a CSS RTL mirror were checked separately; neither is a physical-device or browser-native zoom test.

## Elevation & Depth

The interface is flat. Tonal backgrounds group content and 1px borders communicate structure. There are no shadows, backdrop filters, floating overlays or nested cards. The fixed sidebar is at stacking level 10; the keyboard skip link is at 100. Expanded settlement details stay inside their table's flow and use the sidebar tone.

## Shapes

`--radius-panel: 12px` and `--radius-control: 7px` define the main language. Compact icon controls use 6px, table icons 7px and status badges 5px or a pill. The nested segmented control has a 7px outer radius, 3px inset and 4px inner buttons. Progress tracks have a 3px radius. Data is wrapped rather than clipped to fit a rounded container.

## Components

- **Brand** (`src/components/Brand.tsx`): custom inline wheel mark and wordmark; `small` provides the footer variant. SVG decoration is hidden from assistive technology and the surrounding home link has a name.
- **Metric** (`src/App.tsx:9`): label, icon, primary value and explanatory note. Loading reserves its place with dots; an unavailable source has an explicit label. Status combines a dot with a word and wheel state.
- **Refresh controls** (`src/App.tsx`, `src/useDashboard.ts`): one filled primary button, disabled while fetching, plus a labelled native button with switch semantics for auto-refresh. A stable polite status region announces completed updates. A countdown is separate from the button label.
- **ActivityChart** (`src/components/ActivityChart.tsx`): three native pressed-state buttons select work, blocks or settlements. SVG title/description explain the chart; a native details element exposes the exact hourly data. Empty and unavailable data have explicit copy. No generated history is used.
- **Supply panel** (`src/App.tsx`): exact base-unit formatting via `src/api.ts:181`; two-decimal overview, true percentage-of-cap meter only when values exist, daily minted amount and expandable full precision. The text remains available independently of the progress graphic.
- **SettlementTable** (`src/components/SettlementTable.tsx`): labelled search, native sort select, five-row pagination, textual confirmation badges, UTC times and a per-row expansion button. Details expose the entire hash, Copy hash, chain-aware explorer link and full-precision minted amount. Copy failure gives a manual-selection path. Search/empty/error states give an explicit next step.
- **Data sources** (`src/App.tsx`): native details summary, individual endpoint links, individual errors and source timestamps. It explains the difference between telemetry, confirmed blocks and archived counts.

Lucide icons use one stroke-based icon set with `currentColor`. Keyboard focus uses a 2px outline with 4px offset, with a system-color override for forced colors. Hover rules are gated by `hover: hover`. Transitions name only changed properties and last 120ms. Press scale is 0.96. Rotation is confined to the refresh icon during requests. Motion is enabled only under `prefers-reduced-motion: no-preference`; reduced motion retains the Refreshing label and disabled state.

## Do's and Don'ts

- Start a related view inside the existing workspace and reuse panel edges, heading roles and semantic tokens.
- Keep one filled primary action; use neutral controls for chart modes and table utilities.
- Keep API errors beside the affected content and retain successful data with an explicit previous-data notice.
- Use exact integer arithmetic for token amounts and disclose precision. Never add a synthetic sparkline, fallback balance or implied confirmation.
- Wrap critical data and keep full hashes reachable; preserve table labels and native keyboard behavior when adding a field.
- For another section, add an anchor and native navigation link, reuse the panel and heading patterns, then check 320px reflow and enlarged text. Do not add a route that requires a server rewrite.

## Guidance attribution

Applied the pinned Better Interface guide, adapted from [Jakub Krehel's Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface), MIT. The documentation method is adapted from [Paul Bakaus's Impeccable](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md), Apache-2.0. Original notices and both licenses are retained in `docs/design-guidance-LICENSE.txt`. Domain coverage, corrected findings and limitations are in VALIDATION.md.
