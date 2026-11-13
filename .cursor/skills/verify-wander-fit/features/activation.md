# Activation

An athlete who has an account but no intake signs in. They go through intake and onboarding, tap I Commit, and land on Today with their first workout card.

## Sub-features

- `activation-sport`: a `needs-intake` persona signs in and lands on the sport screen. `COMPLETE SETUP` is not visible. The athlete taps `sport-tile-basketball`, then Continue.
- `activation-overview`: Training Overview (`Training in 3 Phases`), then Continue.
- `activation-intake`: age group Performance (18-35), then experience at the default 0 years (Novice). On training days, the athlete taps today and the days 2 and 4 after it. The season date is 84 days from today, which the intake shows as 12 weeks. On maxes, the athlete taps `I'll set these later`. On results (`Your Program is Ready!`), Continue.
- `activation-commit`: on Make Your Commitment, one tap on `commitment-button` (I Commit). There is no hold. `You're Committed!` shows while the program is saved, and then the app goes to Today.
- `activation-today`: `Welcome back,` shows, `today-workout-card` shows, and `Start Workout` shows.
- `activation-program`: after Maestro passes, `persona inspect` must show `found`, `intakeCompleted`, `onboardingCompleted`, and `hasProgram` all true, with `phase: "GPP"`, `week: 1`, and `day: 1`. Otherwise the flow fails.

## How to get to it (user POV)

- Sign in as an athlete whose account has no intake. The app opens on `WHAT'S YOUR SPORT?`.

## Driving it with Maestro

Preconditions: `node scripts/verify/run.mjs doctor` passed. The e2e URL is set. `wander-fit-e2e` has this branch's functions (`node scripts/verify/run.mjs deploy`), because `persona create --state needs-intake` needs `e2e:provision`.

- `node scripts/verify/run.mjs all activation` runs it. `node scripts/verify/run.mjs all` runs it before sign-in and sign-up.
- The runner creates a `needs-intake` persona (`e2e.<run>+clerk_test@example.com`): a Clerk user and a Convex user row, with no intake, no program, and no onboarding. It passes `PERSONA_EMAIL` and `PERSONA_PASSWORD`.
- The web entry `.maestro/web/activation.yaml` sets `url: ${VERIFY_URL}`, launches with a cleared state, and runs `.maestro/journeys/activation.yaml`. That journey starts evidence and runs `.maestro/subflows/_sign-in.yaml`. Then it goes through the steps above, takes a screenshot on each screen, and stops evidence.
- After Maestro passes, the runner runs `persona inspect` (the `activation-program` check). Then it redacts the password and deletes the Clerk user and its Convex rows (user, program, intake). The delete runs whether Maestro or inspect failed.
- Proof is `01-sign-in` through `12-today` and `startRecording/recording.mp4`, under `e2e-artifacts/activation/web/`. CI uploads them as `e2e-web-activation`.

## Gotchas

- The sport → training overview transition guards the Router 58 navigation-context regression: wait for `Training in 3 Phases` and assert that `Something went wrong` is absent. Route hooks and theme providers must use Expo Router's public exports, not a separate React Navigation context.

- The commitment hold is gone. Maestro web's `longPressOn` did trigger the old 2-second hold, but Maestro's post-tap settle wait ignores `waitToSettleTimeoutMs` on web. With the spinner animating, that wait outlasts the `You're Committed!` state, so the flow cannot assert it. The video and the commitment screen test (`app/__tests__/commitment.test.tsx`) cover it. See `.maestro/flow-layout.md`.
- Training days and the season date come from `.maestro/scripts/activation-dates.js`, which uses the clock of the machine running the browser. A run that crosses midnight can pick yesterday.
- The season calendar shows one month at a time. The journey taps `season-next-month` until `season-day-<date>` is visible, up to 4 times.
- The Today card title stays `Loading...`, because `seed:seedAll` has no `program_templates`. Do not assert a workout name, and do not add a template seed here (same gap as sign-in).
- Activation is the only flow that needs `needs-intake`. Re-provisioning an existing user as `needs-intake` deletes their program and intake rows, so it is a user row only.
- The Gym/Home equipment step is not in this flow yet. When the equipment-intake PR (after #56) adds it, that PR updates this journey to tap Home and has inspect check `equipmentMode: "home"`.
