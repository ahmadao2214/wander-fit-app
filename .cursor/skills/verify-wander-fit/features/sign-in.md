# Sign in

A signed-out athlete sees the welcome screen, with an email field, a password field, and a Sign In button.

## Sub-features

- `sign-in-screen`: the welcome heading, the training subtitle, both fields, and Sign In are visible.
- `sign-in-email-focus`: tapping the email field leaves Sign In on screen and does not start a session.
- `sign-in-today`: with a fresh onboarded persona, submitting Sign In shows `Welcome back,`.

## How to get to it (user POV)

- Open the site with no Clerk session. The app shows the sign-in screen.

## Driving it with Maestro

Preconditions: `node scripts/verify/run.mjs doctor` passed, and `node scripts/verify/run.mjs launch` is serving the export. No Clerk session is stored in Maestro's browser.

- Open the served URL: `.maestro/sign-in-screen.yaml` launches `${VERIFY_URL}` with a cleared browser state.
- Expect `WELCOME BACK`, `Sign in to continue your training journey`, `Email address`, `Password`, and `Sign In`.
- Tap `Email address`.
- Expect `Sign In` to still be visible. The screen-only flow does not press it.
- `node scripts/verify/run.mjs all sign-in` requires the e2e URL. It uses `.maestro/web/sign-in.yaml`, types the persona email and password, presses Sign In, and expects `Welcome back,`. The signed-out screen is `node scripts/verify/run.mjs screen`.
- Proof of the submitted path is `03-today` and `startRecording/recording.mp4` under `e2e-artifacts/sign-in/web/`.

## Gotchas

- The submitted path uses a new `e2e.<timestamp>+clerk_test@example.com` user on `wander-fit-e2e`. It does not use the shared manual account.
- A missing Clerk publishable key leaves the page on `Loading...`.
- `testID`s `sign-in-email`, `sign-in-password`, and `sign-in-submit` are on the controls. The inputs also have matching `nativeID`s. Maestro web types into `document.activeElement`, and its xpath collapses to the first shared ancestor. Without a unique id, the password is typed into the email field.
- `startRecording` writes `startRecording/recording.mp4` into the evidence folder. A recording failure fails the flow. Do not weaken the text assertions to make a video succeed.
