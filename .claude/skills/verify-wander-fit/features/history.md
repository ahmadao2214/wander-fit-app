# History

An athlete who has finished workouts sees them on the History tab, with a one-line progress summary under the title. Regression for PR #105: History used to read the trainer-era `workoutSessions` table, so it was empty for every GPP athlete; it now reads `gppWorkoutSessions.getHistory`.

## Sub-features

- `history-lists-gpp-session`: the session row (`GPP W1D1`) shows the completed check (`history-completed`, spoken "Completed") and no `Not finished` chip. The empty state (`No workouts yet`) does not show.
- `history-progress-line`: the title has `15 workouts done · 2 weeks on plan` under it (3 weeks near midnight on Sunday, when the local and UTC weeks differ). Progress lives on History, not on Profile or Today (design audit F06).
- `history-weeks-on-plan`: weeks on plan (`lib/weeksOnPlan.ts`) counts Monday-to-Sunday weeks in a row with at least the scheduled number of workouts, on any days. It shows only from 2 up and never reads "0 weeks" or "streak lost". Today's caption shows only "N workouts done".

## How to get to it (user POV)

- Sign in and tap the History tab.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state with-history`: onboarded, plus completed GPP W1D1 sessions, one now and one at noon UTC on every day of the two Monday-to-Sunday weeks before this one. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all history`. It exits `0` with `- history: passed`, and the persona and its sessions are deleted.
- **Sign in.** The journey runs `.maestro/subflows/_open-sign-in.yaml` and `.maestro/subflows/_sign-in.yaml` and waits for `id: today-workout-card` (`01-today`).
- **Open History.** It taps `History` and waits for `Workout history` and `GPP W1D1`.
- **Completed row.** It asserts `id: "history-completed|Completed"` and that `Not finished` and `No workouts yet` are not visible.
- **Progress line.** It asserts `15 workouts done · [23] weeks on plan` (`02-history`).
- **Side effect.** The rows come from the backend: History reads `gppWorkoutSessions.getHistory` for the seeded sessions, so the listed row is itself the stored state. `persona inspect` reports only the account and program position, not sessions.
- **Proof.** `e2e-artifacts/history/web/<timestamp>/history/` holds `01-today.png`, `02-history.png` under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/history/web/result.json` with `"status": "passed"`.

## Gotchas

- Web reports the aria-label as the id, native reports the testID, so the completed check matches `history-completed|Completed`.
- The weeks count depends on the clock: the seed is in UTC weeks and the app counts local weeks. The flow accepts 2 or 3; don't pin it to one.
- A History screen showing `No workouts yet` for this persona is a product regression (the #105 bug), not drift.
