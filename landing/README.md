# WanderFit Landing Page (Beta On-Ramp)

A zero-dependency static HTML/CSS/ESM **Beta On-Ramp** deployed separately from the Expo application (Paper editorial direction with Archivo variable typography).

Run locally from the repository root:

```sh
python3 -m http.server 4173 --directory landing
```

Open `http://localhost:4173/?preview=1` to test the form locally without posting to Convex (HTTP serving is required for ESM modules; do not open `index.html` directly via `file://`).

## Structure

- `index.html`, `styles.css`, `app.mjs` — Paper editorial landing page, interactive 3-phase `GPP -> SPP -> SSP` calendar hero, minimal 3-field Beta On-Ramp form, config-driven Beta Access Panel with desktop SVG QR codes and mobile QR toggles, two-band dark/light product walkthrough, pricing, and 6-question FAQ.
- `plan.mjs` + `plan.test.mjs` — Pure 3-phase schedule preview math mirroring `convex/programShape.ts`, `convex/weekMapping.ts`, and `lib/firstRun.ts` 1:1 (12-week default, 2–8 weeks per phase, up to 52 weeks out).
- `config.mjs` — Single `ACCESS_CONFIG` object controlling iOS TestFlight, Mobile Web, and Android Beta channels (graceful "Coming soon" fallback whenever a channel `url` is blank).
- `qr.mjs` + `qr.test.mjs` — Zero-dependency ISO/IEC 18004 QR code encoder (Byte mode, EC Level M, Versions 1–10) and single-`<path>` SVG renderer (`renderQrSvg`).
- `fonts/` — Preloaded `Archivo-latin-var.woff2` + `Archivo-OFL.txt`.
- `assets/` — `favicon.svg`, `apple-touch-icon.png` (180×180), `og.png` (1200×630), `flyer-qr.{svg,png}`, and clean unedited Football (Strength) `main` screenshots in `assets/shots/`.
- `robots.txt` & `sitemap.xml` — Search crawler metadata.
- `scripts/generate-flyer-qr.mjs` — Regenerates the printable gym-flyer QR asset (`assets/flyer-qr.svg`) for any production domain:
  ```sh
  node landing/scripts/generate-flyer-qr.mjs https://wanderfit.app gym-flyer
  ```

## Backend (`POST /waitlist`)

The Beta On-Ramp form posts JSON to `<meta name="waitlist-endpoint">` in `index.html` (`https://fleet-mallard-22.convex.site/waitlist`):

- Route: `POST /waitlist` (`convex/http.ts`) with CORS (`LANDING_ORIGIN` env var or `*` fallback), 4KB body cap (`413`), IP + per-email fixed-window rate limiting (`429` + `Retry-After`), and honeypot spam drop (`200`).
- Validation & persistence: `cleanSignup`, `checkRateLimit`, and `record` (`convex/waitlist.ts`) storing into `waitlist_signups` (upserted by normalized `email`) and `waitlist_rate_limits`.
- Deploying Convex backend updates: run `bun run typecheck && bun run test:ci` first, then `npx convex deploy --typecheck=disable` (Convex's own typecheck chokes on Jest test files).

## Tests

```sh
bun run test -- landing/
bun run test -- convex/__tests__/waitlist.test.ts
```
