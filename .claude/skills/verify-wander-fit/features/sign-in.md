# Sign in

A signed-out athlete taps `I have an account` on the First Run, sees the welcome screen with an email field, a password field and a Sign In button, signs in to Today with a workout ready, and signs out again from Profile.

## Sub-features

- `sign-in-screen`: the welcome heading, the training subtitle, both fields, and Sign In are visible.
- `web-document-hydration`: the static export hydrates past `Loading...` (Router 58's custom HTML forwards document-context attributes, head assets and body scripts); the screen flow asserts the three sign-in control ids. A successful export alone does not prove hydration.
- `sign-in-email-focus`: tapping the email field leaves Sign In on screen and does not start a session.
- `sign-in-today`: with a fresh onboarded persona, submitting Sign In shows the `today-heading` date heading and the Today workout card.
- `sign-in-sign-out`: that same persona opens Profile, taps Sign Out, and lands on the First Run with `I have an account`.

## How to get to it (user POV)

- Open the site with no Clerk session. The First Run opens; tap `I have an account`.
- Signed in: open the Profile tab and tap Sign Out at the bottom.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed (backend reachable, seeded, Clerk key valid).
- The e2e URL is set (`.env.e2e` or `EXPO_PUBLIC_CONVEX_URL_E2E`). No Clerk session is stored in Maestro's browser; every entry launches with a cleared state.

- **Whole journey.** Run `node scripts/verify/run.mjs all sign-in`. It creates an onboarded persona, runs `.maestro/web/sign-in.yaml`, deletes the persona, and exits `0` with `- sign-in: passed` in its summary.
- **Open sign-in.** `.maestro/subflows/_open-sign-in.yaml` waits for the First Run and taps `I have an account`. `WELCOME BACK` and `Sign in to continue your training journey` appear.
- **Submit.** `.maestro/subflows/_sign-in.yaml` types `PERSONA_EMAIL` into `id: sign-in-email`, `PERSONA_PASSWORD` into `id: sign-in-password`, and taps `id: sign-in-submit`. `id: today-heading`, `Today`, `id: today-workout-card` and `Start Workout` appear (`03-today`).
- **Sign out.** The journey opens Profile (`04-profile`), follows `/profile#sign-out`, waits for the words `Sign Out`, and taps them. The First Run with `I have an account` appears (`05-signed-out`).
- **Signed-out screen only.** Run `node scripts/verify/run.mjs screen`. `.maestro/sign-in-screen.yaml` checks `WELCOME BACK`, `Email address`, `Password` and `Sign In`, taps `Email address`, and checks `Sign In` is still visible. It never submits or creates a persona.
- **Proof.** `e2e-artifacts/sign-in/web/<timestamp>/sign-in/` holds `02-filled.png` (password field masked), `03-today.png`, `04-profile.png`, `05-signed-out.png` under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/sign-in/web/result.json` with `"status": "passed"`.

## Gotchas

- The submitted path uses a new `e2e.<timestamp>+clerk_test@example.com` user on `wander-fit-e2e`, never the shared manual account.
- A missing or invalid Clerk publishable key leaves the page on `Loading...`. Doctor catches both; a screen stuck on `Loading...` is a failed doctor, not a product bug.
- `testID`s `sign-in-email`, `sign-in-password` and `sign-in-submit` are on the controls, and the inputs also have matching `nativeID`s. Maestro web types into `document.activeElement`, and its xpath collapses to the first shared ancestor. Without a unique id the password lands in the email field.
- Maestro web matches a React Native Web `testID` with `id:`. The submit button and the Today card (`id: today-workout-card`) have a `testID` and no `nativeID`; `nativeID` is only for typing into an input.
- The card renders with the program. `deploy` generates the program templates, so its title is the workout name; the flow asserts only the card, not the name.
- Profile keeps Sign Out below the fold in its own scroll view. Maestro web scrolls `window`, so `scrollUntilVisible` does not move that list, and it omits text outside the viewport (`id: sign-out` can match while the words `Sign Out` do not). The flow follows `/profile#sign-out`; on web the button centers itself while that hash is set, and a wheel, touch or scroll key from the person cancels it.
- A recording failure fails the flow. Do not weaken the `today-heading` or Today assertions to make a video succeed.
