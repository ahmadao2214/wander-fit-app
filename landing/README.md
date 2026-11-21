# WanderFit landing concept

The hero is a 14-week calendar starting this week (`CALENDAR_WEEKS` in `plan.mjs`), with a date picker for anything later and a "No date yet" option. The visitor taps their test day; the plan fills the days in between (technique, build, peak, an easy final week) and lifting days get a dot. Phase logic is in `plan.mjs` (`dayPhases`, `isLiftDay`).

A standalone rebuild of the landing-page experiment. It deliberately does not change the Expo application's routes or authentication.

Run from the repository root:

```sh
python3 -m http.server 4173 --directory landing
```

Open `http://localhost:4173`. HTTP serving is required for the JavaScript modules; do not open `index.html` directly with `file://`.

## Sign-ups

The form posts JSON to the URL in `<meta name="waitlist-endpoint">` in `index.html`. Left empty, the page runs in preview mode: it validates and shows the confirmation but stores nothing, and says so.

The endpoint is the Convex HTTP route `POST /waitlist` (`convex/http.ts`), which validates with `cleanSignup` (`convex/waitlist.ts`) and saves to the `waitlist_signups` table through the internal `waitlist.record` mutation. To go live:

1. Deploy Convex (`npx convex deploy`).
2. Set the meta tag to `https://<deployment>.convex.site/waitlist`.
3. Host this folder (any static host, e.g. EAS Hosting).

Each row keeps what we need to judge demand: role (athlete or parent), age, sport, test, test date, lifting experience, both emails, whether they asked to have the $34.99 season pass held (`intent: "reserve"`), and where they came from (`?ref=` or `utm_source` on the landing URL). Under-13s are refused (COPPA). A repeat sign-up for the same athlete and parent email updates the row. A hidden honeypot field drops bots.

Not done yet: rate limiting, a privacy policy link, and confirmation emails.

The only font is Archivo (variable, self-hosted in `fonts/`, SIL Open Font License in `fonts/Archivo-OFL.txt`). The Bebas Neue and Plus Jakarta Sans files left over from the previous version are no longer used. No analytics, external fonts or third-party scripts are loaded.

Run the date and planning tests with `node --test landing/plan.test.mjs`.
