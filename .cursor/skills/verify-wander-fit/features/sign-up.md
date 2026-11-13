# Sign up

A signed-out visitor opens Sign up from the welcome screen, creates an athlete account with email and password, enters the emailed code, and lands on the first intake screen.

## Sub-features

- `sign-up-form`: Full name, email, and password are filled, and Continue with Email is pressed. Role stays on the default, Athlete.
- `sign-up-verify`: `VERIFY EMAIL` appears, and Clerk's fixed test code `424242` is entered. The screen submits on its own at six digits.
- `sign-up-intake`: the app lands on the intake sport screen (`Search sports...`), and `COMPLETE SETUP` is not visible.
- `sign-up-convex-user`: after Maestro passes, `persona inspect` finds a Convex user for that email (`found: true`).

## How to get to it (user POV)

- Open the site with no Clerk session. The app shows the sign-in screen (`WELCOME BACK`). Tap `Sign up`.

## Driving it with Maestro

Preconditions: `node scripts/verify/run.mjs doctor` passed. The e2e URL is set. No Clerk session is stored in Maestro's browser.

- `node scripts/verify/run.mjs all sign-up` runs it. `node scripts/verify/run.mjs all` runs it after sign-in.
- The runner does not create an account first. It writes a new `e2e-<run>-signup+clerk_test@example.com` address and a random password to `e2e-artifacts/persona-latest.json` (mode 0600) and passes them as `PERSONA_EMAIL` and `PERSONA_PASSWORD`. `<run>` is `Date.now()`.
- The web entry `.maestro/web/sign-up.yaml` sets `url: ${VERIFY_URL}`, launches with a cleared state, and runs `.maestro/journeys/sign-up.yaml`. That journey starts evidence, expects `WELCOME BACK`, taps `Sign up`, swipes the form up, fills `sign-up-name` (`Verify Athlete`), `sign-up-email`, and `sign-up-password`, taps `sign-up-submit`, expects `VERIFY EMAIL`, taps `sign-up-code` and types `424242`, waits for `Search sports...`, asserts `COMPLETE SETUP` is not visible, and stops evidence.
- After Maestro passes, the runner runs `persona inspect <email>` and fails the flow unless `found` is `true`. Then it redacts the password and deletes the Clerk user and its Convex rows. The delete runs whether Maestro or inspect failed.
- Proof is `01-sign-in`, `02-filled`, `03-verify-email`, `04-sport`, and `startRecording/recording.mp4` under `e2e-artifacts/sign-up/web/`.

## Gotchas

- The inputs carry `testID` and `nativeID` (`sign-up-name`, `sign-up-email`, `sign-up-password`). Maestro web types into `document.activeElement`, and without a unique DOM id the text lands in the wrong field. The button has `testID="sign-up-submit"`.
- The sign-up form scrolls inside the page, and the password field and button start below the 625px viewport. Maestro web's `scroll` moves only `window` and omits off-screen elements, so the journey swipes up once. See `.maestro/flow-layout.md`.
- The code is six boxes. Only the first has an id (`sign-up-code`). Maestro web sends each key of `424242` to that box, which shows one digit after every key, so each key after the first arrives as two characters. On web, that key goes into the next empty box. A paste, including two digits dropped onto a filled box, still fills from the start.
- `COMPLETE SETUP` is the screen for a Clerk user with no Convex user. If `createUser` fails after verification, the app can land there. The flow must fail in that case. Do not weaken this assertion or the sport assertion.
- If Clerk bot protection shows a captcha or a bot error instead of `VERIFY EMAIL`, stop and report the screen. Do not add a test-only screen or skip the code.
- Delete works for an account that was only partly made (Clerk user, no Convex row) and for an address that was never created.
- `delete` and `sweep` accept this address shape only with a numeric run id and `-signup`. `e2e-signup+clerk_test@example.com` and `e2e-<run>-other+clerk_test@example.com` are refused.
