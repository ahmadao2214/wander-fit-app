# Workout loop

The app's daily value, end to end (issue #81, PR #125). An onboarded athlete starts today's workout, logs every set of every exercise, finishes, and lands back on Today. The session is saved as completed, the program moves to the next day, and History lists the session.

## Sub-features

- `workout-loop-start`: Today "Start Workout" opens the workout detail; `workout-start` starts the session. If the workout has a warm-up, `warmup-skip` skips it, and the warm-up entries are saved completed and skipped.
- `workout-loop-log-sets`: each set tile is `set-<index>`; the next pending set is marked `set-tile-next` (on web, the inner card's id). Tapping it logs the prescribed reps. Finishing an exercise's last set does not move on; `execute-next` reads Next, and Finish on the last exercise.
- `workout-loop-finish`: Finish opens the completion dialog ("Workout complete!"). Its Done button (`workout-complete-done`) completes the session, advances the program one day, and returns to Today.
- `workout-loop-history`: History lists the session with the completed check and "1 workout done".

## How to get to it (user POV)

- Sign in, tap Start Workout on Today, then Start on the workout detail.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- The persona is `--state onboarded`: GPP week 1 day 1, no sessions, and today is a training day. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all workout-loop`. It exits `0` with `- workout-loop: passed`, after the post-run inspect check below, and the persona is deleted.
- **Start.** The journey signs in, taps `Start Workout`, then `id: workout-start`, and taps `id: warmup-skip` if it shows (`01-today`, `02-first-exercise`).
- **Log every set.** For each exercise it swipes the list up once, taps `id: set-tile-next` while it is visible, then taps `id: execute-next`. The loop ends when `Workout complete!` shows (`03-complete`). It never asserts a workout or exercise name, because today's workout depends on the server date.
- **Finish.** It taps `id: workout-complete-done`, waits for `id: today-heading`, and asserts `Resume Workout` is not visible (`04-today-after`).
- **History.** It taps `History`, waits for `id: "history-completed|Completed"`, and asserts `1 workout done.*` and no `Not finished` (`05-history`).
- **Side effect.** After Maestro passes, the runner runs `persona inspect` (`assertWorkoutLoop` in `scripts/verify/run.mjs`). It requires exactly one `completed` session with `mainExercisesNotLogged: 0`, where every main exercise of the template is saved at its position, completed, not skipped, and logs its prescribed sets. The program must be at GPP week 1 day 2.
- **Proof.** `e2e-artifacts/workout-loop/web/<timestamp>/workout-loop/` holds the five screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/workout-loop/web/result.json` with `"status": "passed"`.

## Gotchas

- At the 625px web viewport, the second row of set tiles sits under the fixed Previous/Next bar, and a tap there lands on the bar. The flow swipes each exercise's list up once, starting above the tiles (50%, 30%) and lasting 300 ms. That is under the tiles' 400 ms long press, which would open the set editor instead.
- The flow takes 4–5 minutes on web: Maestro waits for the page to settle after each of about 20 taps. That put the per-PR web job over its 10-minute budget, so it is nightly-only (`nightlyOnlyFlows` in `scripts/verify/flows.mjs`): pull request runs skip it, and main pushes, the nightly run and local `run.mjs all` keep it.
