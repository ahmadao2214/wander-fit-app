# WanderFit Landing Page (Beta On-Ramp)

A zero-dependency static HTML/CSS/ESM **Beta On-Ramp** deployed separately from the Expo application (`docs/adr/0003-decoupled-static-landing-and-beta-on-ramp.md`).

Run locally from the repository root:

```sh
python3 -m http.server 4173 --directory landing
```

Open `http://localhost:4173`. HTTP serving is required for ESM modules; do not open `index.html` directly via `file://`.

## Modules Ready for UI Build

- `plan.mjs` — Pure 3-phase `GPP -> SPP -> SSP` schedule preview math mirroring `convex/programShape.ts`, `convex/weekMapping.ts`, and `lib/firstRun.ts` 1:1 (12-week default, 2–8 weeks per phase, up to 52 weeks out).
- `config.mjs` — Single `ACCESS_CONFIG` object controlling iOS TestFlight, Mobile Web, and Android Beta channels (graceful "Coming soon" fallback whenever a channel `url` is blank).
- `qr.mjs` — Zero-dependency ISO/IEC 18004 QR code encoder (Byte mode, EC Level M, Versions 1–10) and single-`<path>` SVG renderer (`renderQrSvg`) for desktop Beta Access QR codes.
- `scripts/generate-flyer-qr.mjs` — Regenerates the printable gym-flyer QR asset (`assets/flyer-qr.svg`) for any production domain:
  ```sh
  node landing/scripts/generate-flyer-qr.mjs https://wanderfit.app gym-flyer
  ```

## Backend (`POST /waitlist`)

The Beta On-Ramp form posts JSON to `<meta name="waitlist-endpoint">` in `index.html`:

- Route: `POST /waitlist` (`convex/http.ts`) with CORS (`LANDING_ORIGIN` env var or `*` fallback), 4KB body cap (`413`), IP + per-email fixed-window rate limiting (`429` + `Retry-After`), and honeypot spam drop (`200`).
- Validation & persistence: `cleanSignup`, `checkRateLimit`, and `record` (`convex/waitlist.ts`) storing into `waitlist_signups` (upserted by normalized `email`) and `waitlist_rate_limits`.
- Payload shape:
  - `role`: `"athlete_14_17" | "athlete_18_plus" | "parent"`
  - `email`: string (required)
  - `parentEmail`: optional string (accepted only for `athlete_14_17`)
  - `intent`: `"season_pass" | "monthly" | "free_beta_only"`
  - `seasonDate`: optional `YYYY-MM-DD` (future date within 52 weeks)
  - `source`: optional `?ref=` or `?utm_source=` (max 80 chars, e.g. `gym-flyer`)

## Tests

```sh
node --test landing/plan.test.mjs landing/qr.test.mjs
bun run test -- convex/__tests__/waitlist.test.ts
```
