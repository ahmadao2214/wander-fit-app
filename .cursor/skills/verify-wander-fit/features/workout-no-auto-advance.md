# Workout: no auto-advance after the last set

Regression for the self-starting move to the next exercise. Before PR #106, finishing an exercise's last set started a 1.5-second timer and the screen jumped to the next exercise on its own. Now the athlete stays on the finished exercise until they tap Next.

## Preconditions and driving

- Same setup as [workout reorder](./workout-reorder.md): dedicated iOS simulator, local build, the E2E Convex project, an onboarded athlete on Today whose workout is unlocked and not completed.
- Run `.maestro/native/workout-no-auto-advance.yaml` with the project test runner. It does not launch or sign in.
- The flow taps Start Workout, then Start (`workout-start`), and Skip warmup (`warmup-skip`) if a warmup shows. It copies the exercise name (`execute-exercise-name`) and taps each set button (`set-0` to `set-5`). After waiting 3 seconds, it checks that the same name is still on screen, then taps Next (`execute-next`) and checks that the name changed.
- Screenshots: `native-no-auto-advance-held`, `native-no-auto-advance-next`.
- The flow starts a workout session and logs sets. Use the E2E account only, never the durable review account.

## Acceptance status

The flow file is a regression asset. A simulator run is still pending: the Mac is waiting on its external-disk migration, and simulator work is paused until that's done.
