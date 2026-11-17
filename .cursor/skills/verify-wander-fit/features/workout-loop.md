# Workout loop: start, log every set, finish

The app's daily value, end to end (issue #81). An onboarded athlete starts today's workout, logs every set of every exercise, finishes, and lands back on Today. The session is saved as completed, the program moves to the next day, and History lists the session.

## Behavior

- **Today** "Start Workout" opens the workout detail; `workout-start` starts the session. If the workout has a warm-up, `warmup-skip` skips it, and the warm-up entries are saved completed and skipped.
- **Execution screen**: each set tile is `set-<index>`. The next pending set is the one marked `set-tile-next` (on web the id is the inner card's). Tapping it logs the prescribed reps. Finishing an exercise's last set does not move on; `execute-next` reads Next, and Finish on the last exercise.
- **Finish** opens the completion dialog ("Workout complete!"). Its Done button (`workout-complete-done`) completes the session, advances the program one day, and returns to Today.
- **History** lists the session with the completed check and "1 workout done".

## Web flow

`node scripts/verify/run.mjs all workout-loop` runs `.maestro/web/workout-loop.yaml` with an onboarded persona at GPP week 1 day 1 and no sessions. The journey (`.maestro/journeys/workout-loop.yaml`):

1. Signs in, starts today's workout, and skips the warm-up if there is one.
2. Repeats, for each exercise: tap `set-tile-next` while it is visible, then tap `execute-next`. The loop ends when the completion dialog shows. It never asserts a workout or exercise name, because today's workout depends on the server date.
3. Taps Done, checks Today shows no Resume, then opens History and checks the completed row and "1 workout done".

After Maestro passes, the runner runs `persona inspect` and requires exactly one session, `completed`, with no exercise left not done, and the program at GPP week 1 day 2 (`assertWorkoutLoop` in `scripts/verify/run.mjs`).

Screenshots: `01-today`, `02-first-exercise`, `03-complete`, `04-today-after`, `05-history`.

## Unit coverage

- `scripts/verify/run.test.mjs`: the workout-loop inspect check, and that only the flows that change the account are inspected.
- `convex/__tests__/e2e.test.ts`: `inspect` lists each session's status, exercise IDs, and done counts.
