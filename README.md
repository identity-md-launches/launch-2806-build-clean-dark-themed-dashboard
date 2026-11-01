# Squeekchain dashboard

An independent community project for the **Squeekchain Buildooooor badge**, built with React, TypeScript and Vite.

A responsive dark dashboard showing block height, cumulative work, distance in kilometres, telemetry status, live SQK supply and recent settlements. It includes 60-second auto-refresh with pause/manual controls, hourly activity views, settlement search, sorting, pagination and expandable transaction details.

## Install and run

Use Node.js 22 or later and npm.

```sh
npm ci
npm run dev
```

## Check, rebuild and preview

```sh
npm run typecheck
npm run build
npm run preview
```

The finished `dist/index.html` and assets are included alongside the source and lockfile. Serve the contents of `dist/` on a static host. Vite uses `base: './'`, local assets and hash navigation, so subpath hosting works without route rewrites. Use HTTP(S) rather than opening the file directly.

## Data

The browser reads three public endpoints without credentials:

- [Network status](https://api.squeekchain.com/v1/status)
- [Economy and supply](https://api.squeekchain.com/v1/economy/state)
- [24-hour settlements](https://api.squeekchain.com/v1/settlements?range=24h)

Confirmed height comes from the settlement anchor; work, distance and status come from wheel telemetry. SQK uses exact `BigInt` conversion with the API's decimals and expandable full precision. Times are UTC. Recent settlements are the subset returned by the API, including its archive limitation. The live response currently identifies a **Sepolia testnet** deployment; the site labels its returned network explicitly.

Sources load independently with a 12-second timeout. Failures show Unavailable or preserve explicitly flagged previous data. Delayed responses and stale telemetry are labelled. Data sources exposes endpoint errors and timestamps. No production samples, wallet infrastructure or private backend are included.

## Validation

```sh
npx playwright install chromium webkit
npm run build
npm run test:interactions
```

The test script serves the production export at a subpath, checks real APIs, then intercepts test-only responses to exercise failure, loading and empty states. It writes disposable evidence to `test/scratch/validation/` and closes its server/browser.

Actual final results: production build and typecheck passed; **15 Chromium groups passed**, including interactions, refresh timing, six-width reflow and accessibility checks; the pinned design probe passed **16/16**. WebKit could not launch because runtime libraries were unavailable. Physical-device, screen-reader and native zoom checks remain unperformed.

See [VALIDATION.md](VALIDATION.md) for results, six-domain Better Interface coverage, fixes and limitations, and [DESIGN.md](DESIGN.md) for implemented design tokens and components. [Screenshots](docs/screenshots) show the finished export.

All live APIs returned HTTP 200 with browser CORS support during validation. No requester inputs are missing and nothing was fabricated. Future API availability remains an external dependency.

## Attribution

Local wheel mark, favicon and share card; regenerate the PNG with `node scripts/generate-share.mjs` after installing Chromium. Runtime/font licenses: [third-party notices](public/third-party-notices.txt).

Applied Jakub Krehel's Better Interface (MIT) and Paul Bakaus's Impeccable documentation method (Apache-2.0); [guidance licenses](docs/design-guidance-LICENSE.txt) and source attribution are retained in DESIGN.md.
