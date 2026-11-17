# Workout exit and resume

An athlete who leaves a workout through X → Exit can come back to it from Today with the logged sets intact. Exit pauses the session: it stays in progress with its sets saved, Today shows Resume Workout, and the paused time is left out of the timer and the workout's duration. Regression for Exit marking the session abandoned while the dialog said "You can resume this workout later."

## Sub-features

- `exit-pause`: `execute-exit`, then `Pause and exit` (`exit-pause`) saves the logged sets and the exercise order and sets `pausedAt`. The session stays `in_progress`.
- `today-paused-card`: Today shows any paused session first. For today's workout the card keeps its title; for another day's the label reads `Paused workout` with that workout's name. `today-paused` says when it was paused (`Paused yesterday · your sets are saved`). The buttons are Resume Workout and Discard (`today-discard`).
- `today-discard`: Discard asks first (`today-discard-confirm`) and marks the session abandoned; the record and sets stay but can't be resumed.
- `start-while-paused`: starting another workout while one is paused is refused with `You have a paused workout. Resume it or discard it from Today before starting another.` The same workout's Start reads Resume.
- `resume`: opening a paused session calls `resumeSession`, which adds the pause to `pausedSeconds` and clears `pausedAt`.
- `exercise-list`: the progress dots in the execution header (`exercise-progress`, "Exercise N of M, K done") open the exercise list; its close button is `exercise-queue-close`.

## How to get to it (user POV)

- Sign in, tap Start Workout on Today, log a set, tap the X at the top, and choose Pause and exit.
- Back on Today, tap Resume Workout, or Discard to drop the session.

## Driving it with Maestro

Preconditions:

- `node scripts/verify/run.mjs doctor` passed; the e2e URL is set.
- An onboarded persona whose today workout is unlocked, not completed and not paused. `run.mjs all` creates it.

- **Whole journey.** Run `node scripts/verify/run.mjs all workout-exit-resume`. It exits `0` with `- workout-exit-resume: passed`.
- **Start.** After sign-in, the journey taps Start Workout, starts, and skips the warm-up if shown.
- **Exercise list.** It taps the progress dots (matched by label), sees the list (`01a-exercise-list`) and closes it.
- **Log a set.** It taps `id: set-tile-next` and sees the set logged (`01-set-logged`).
- **Exit.** It taps `Exit workout` and sees the dialog (`02-exit-dialog`), then taps `Pause and exit`.
- **Today.** It sees the paused card with Resume Workout and no Start Workout (`03-today-paused`).
- **Resume.** It taps Resume Workout; if Resume opened the next exercise because a one-set exercise was finished, it taps Previous. `sets-logged` reads `1/…` (`04-resumed`).
- **Side effect.** Today's paused card and the resumed `sets-logged` count are read back from the backend session, not local state. `persona inspect` does not report sessions.
- **Proof.** `e2e-artifacts/workout-exit-resume/web/<timestamp>/workout-exit-resume/` holds the five screenshots under `takeScreenshot/` and `startRecording/recording.mp4`; `all` adds `e2e-artifacts/workout-exit-resume/web/result.json` with `"status": "passed"`.

## Gotchas

- Web ids differ from native: the set tile is the inner card's `set-tile-next`; the X reports its label `Exit workout` as its id, and so do the progress dots and the list's close button. `AlertDialog.Action` drops the Pause button's testID, so the flow taps the words `Pause and exit`.
- The flow leaves a paused session behind on its persona. That's fine on web (the persona is deleted). On a durable account, discard it before running flows that expect Start Workout.
- Discard is not driven by the web flow; `app/__tests__/today-card.test.tsx` covers it. Live proof of Discard is a manual drive.
- Native: `.maestro/native/workout-exit-resume.yaml` does the same on the iPhone 17 simulator with a local build (setup as in [workout reorder](./workout-reorder.md)). It neither launches nor signs in. Screenshots: `native-exit-paused-today`, `native-exit-resumed`. The web flow passed on 2026-11-14 (230 s); a native run is still pending.
- Unit coverage: `convex/__tests__/pauseSession.test.ts`, `app/__tests__/workout-exit-pause.test.tsx`, `app/__tests__/today-card.test.tsx`, `lib/__tests__/sessionTiming.test.ts`.
