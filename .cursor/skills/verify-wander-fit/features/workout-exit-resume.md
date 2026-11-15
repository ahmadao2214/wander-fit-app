# Workout: exit pauses, Today resumes

Regression for X → Exit losing the session. Before this fix, Exit marked the session abandoned, so Today offered a fresh Start and the logged sets were gone, although the dialog said "You can resume this workout later." Exit now pauses the session: it stays in progress with its sets saved, Today shows Resume Workout, and the time spent paused is left out of the timer and the workout's duration.

## Behavior

- **Exit** (`execute-exit`, then `exit-pause`, "Pause and exit") saves the logged sets and the exercise order and sets `pausedAt`. The session stays `in_progress`.
- **Today** shows any paused session first, whichever day it is from. For today's workout the card keeps its normal title. For a workout from another day the label reads "Paused workout" and the card shows that workout's name. A line under the title (`today-paused`) says when it was paused ("Paused yesterday · your sets are saved"). The buttons are Resume Workout and Discard (`today-discard`).
- **Discard** asks first (`today-discard-confirm`). It marks the session abandoned; the record and its sets stay in the database, but it can't be resumed.
- **Starting another workout** while one is paused is refused with "You have a paused workout. Resume it or discard it from Today before starting another." The same workout's Start button reads Resume.
- **Opening** a paused session calls `resumeSession`, which adds the pause to `pausedSeconds` and clears `pausedAt`.

## Preconditions and driving

- Same setup as [workout reorder](./workout-reorder.md): the iPhone 17 simulator, a local build, the E2E Convex project, and an onboarded athlete on Today whose workout is unlocked, not completed, and not paused.
- Run `.maestro/native/workout-exit-resume.yaml` with the project test runner. It does not launch or sign in. It starts the workout, logs set 1, exits through the X, checks Today shows the paused session with no Start, resumes, and checks set 1 is still logged on the same exercise.
- Screenshots: `native-exit-paused-today`, `native-exit-resumed`.
- The flow leaves a paused session behind. Discard it on Today, or complete it, before running flows that expect Start Workout. Use an E2E persona only, never the durable review account.

## Web flow

`node scripts/verify/run.mjs all workout-exit-resume` runs `.maestro/web/workout-exit-resume.yaml` with an onboarded persona: it starts today's workout, logs set 1, exits through the X, checks Today shows the paused session with Resume and no Start, resumes, and checks the logged set is still there (`sets-logged` reads `1/…`). If Resume opens the next exercise because a one-set exercise was finished, it steps back with Previous. Web differences: the set tile's id is the inner card's `set-tile-next`, the X reports its label `Exit workout` as its id, and `AlertDialog.Action` drops the Pause button's testID, so the flow taps "Pause and exit". Screenshots: `01-set-logged`, `02-exit-dialog`, `03-today-paused`, `04-resumed`.

## Acceptance status

The web flow passed locally on 2026-11-14 against wander-fit-e2e (230 s). The native flow is a regression asset; a simulator run is pending because the iPhone 17 was held by another session.

## Unit coverage

- `convex/__tests__/pauseSession.test.ts`: exit → resume keeps the logged sets (the regression), paused time is left out of the duration, a different workout can't start over a paused one, and Discard keeps the record.
- `app/__tests__/workout-exit-pause.test.tsx`: Exit calls `pauseSession` with the logged sets, never `abandonSession`.
- `app/__tests__/today-card.test.tsx`: Resume for today's and an earlier day's paused workout, and Discard only after confirming.
- `lib/__tests__/sessionTiming.test.ts`: the clock and the "Paused …" label.
