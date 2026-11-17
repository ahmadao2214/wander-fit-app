# Workout no auto-advance

When an athlete finishes an exercise's last set, the screen stays on that exercise until they tap Next. Regression for PR #106: finishing the last set used to start a 1.5-second timer and jump to the next exercise on its own. Native flow only.

## Sub-features

- `no-auto-advance-held`: after the last set of an exercise is logged and 3 seconds pass, the same exercise name is on screen.
- `no-auto-advance-next`: tapping Next (`execute-next`) moves to a different exercise.

## How to get to it (user POV)

- Sign in, Start Workout on Today, log every set of the first exercise, and wait.

## Driving it with Maestro

Preconditions:

- Same setup as [workout reorder](./workout-reorder.md): the iPhone 17 simulator, a local build, the E2E Convex project, and an onboarded E2E persona on Today whose workout is unlocked and not completed. The flow neither launches nor signs in.

- **Run.** `.maestro/native/workout-no-auto-advance.yaml` taps Start Workout, then Start (`workout-start`), and Skip warmup (`warmup-skip`) if shown. It copies `execute-exercise-name` and taps each set button (`set-0` to `set-5`).
- **Held.** After 3 seconds the same name is still visible (`native-no-auto-advance-held`).
- **Next.** It taps `execute-next` and the name changes (`native-no-auto-advance-next`).

## Gotchas

- There is no web flow, so a web maintenance pass reports it `verified-unreachable` (prerequisite: iOS simulator and local build). The web flow `workout-exit-resume` exercises the same execution screen but not this timing.
- The flow starts a session and logs sets: use an E2E persona, never the durable review account.
- Acceptance: the flow is a regression asset; a simulator run is still pending.
