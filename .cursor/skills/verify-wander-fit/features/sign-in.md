# Sign in

A signed-out athlete sees the welcome screen, with an email field, a password field, and a Sign In button.

## Sub-features

- `sign-in-screen`: the welcome heading, the training subtitle, both fields, and Sign In are visible.
- `sign-in-email-focus`: tapping the email field leaves Sign In on screen and does not start a session.
- `sign-in-today`: with a fresh onboarded persona, submitting Sign In shows `Welcome back,` and the Today workout card.
- `sign-in-sign-out`: that same persona opens Profile, taps Sign Out, and sees `WELCOME BACK` again.

## How to get to it (user POV)

- Open the site with no Clerk session. The app shows the sign-in screen.

## Driving it with Maestro

Preconditions: `node scripts/verify/run.mjs doctor` passed, and `node scripts/verify/run.mjs launch` is serving the export. No Clerk session is stored in Maestro's browser.

- Open the served URL: `.maestro/sign-in-screen.yaml` launches `${VERIFY_URL}` with a cleared browser state.
- Expect `WELCOME BACK`, `Sign in to continue your training journey`, `Email address`, `Password`, and `Sign In`.
- Tap `Email address`.
- Expect `Sign In` to still be visible. The screen-only flow does not press it.
- `node scripts/verify/run.mjs all sign-in` requires the e2e URL. It uses `.maestro/web/sign-in.yaml`, types the persona email and password, presses Sign In, and expects `Welcome back,` and `Today`. It then waits for `today-workout-card` and `Start Workout`, opens Profile, taps Sign Out, and expects `WELCOME BACK`. The signed-out screen check, which never submits, is `node scripts/verify/run.mjs screen`.
- Proof of the submitted path is `03-today`, `04-profile`, `05-signed-out`, and `startRecording/recording.mp4` under `e2e-artifacts/sign-in/web/`.

## Gotchas

- The submitted path uses a new `e2e.<timestamp>+clerk_test@example.com` user on `wander-fit-e2e`. It does not use the shared manual account.
- A missing Clerk publishable key leaves the page on `Loading...`.
- `testID`s `sign-in-email`, `sign-in-password`, and `sign-in-submit` are on the controls. The inputs also have matching `nativeID`s. Maestro web types into `document.activeElement`, and its xpath collapses to the first shared ancestor. Without a unique id, the password is typed into the email field.
- Maestro web matches a React Native Web `testID` with `id:`. The sign-in submit button has a `testID` and no `nativeID`, and the driver reports it as `resource-id`. The Today card uses the same selector: `id: today-workout-card`. `nativeID` is only for typing into an input.
- The card renders with the program, including while its title is still `Loading...`. `seed:seedAll` does not insert `program_templates`, so `getTodayWorkout` stays null and the title does not become a workout name. Do not assert a workout name, and do not add a template seed to this flow.
- Profile keeps Sign Out below the fold in its own scroll view. Maestro web scrolls `window`, so `scrollUntilVisible` does not move that list. It also omits text outside the viewport, so `id: sign-out` can match while the words `Sign Out` do not. The flow opens Profile, then follows `/profile#sign-out`. On web the button sets `scrollTop` on the overflowing ancestor while that hash is set, including after a hash-only navigation that does not remount the screen. The flow waits for the words `Sign Out` before it taps.
- `startRecording` writes `startRecording/recording.mp4` into the evidence folder. A recording failure fails the flow. Do not weaken the Welcome back or Today assertions to make a video succeed.
