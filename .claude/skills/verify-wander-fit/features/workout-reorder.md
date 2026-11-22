# Workout reorder

An athlete can drag exercises into a new order on the workout detail screen and in the execution queue, and the order survives logging, exiting and a relaunch. Regression for RN 0.88 removing InteractionManager while draggable-flatlist 4.0.3 still calls it on changed ordered keys; Bun applies the committed dependency patch, which defers the reset with a zero-delay timer. Native only.

## Sub-features

- `reorder-detail`: on workout detail, dragging the first exercise's grip below the second moves it there without a crash.
- `reorder-queue`: during execution, the upcoming-exercise queue reorders too, and the order survives a relaunch and Resume.
- `reorder-logged-set`: after a reorder, logging set 1 lands on the first row's exercise; the second has nothing logged, also after Pause and exit, relaunch and Resume.
- `hidden-tab-navigation`: Start Workout reaches the exercise list, and Profile reaches Training Science (Router 58 hidden-tab fix).

## How to get to it (user POV)

- Sign in, open today's workout from Today, and hold then drag an exercise's grip handle.
- During a workout, open the exercise list from the progress dots and drag in the queue.

## Driving it with Maestro

Preconditions:

- The iPhone 17 simulator (iOS 27.2), a local Release build, only `wander-fit-e2e` at `https://modest-kudu-493.convex.cloud`.
- Signed in through an approved secret-safe path (`scripts/sim/sign-in-to-today.sh`) as an onboarded E2E persona, on an unlocked, uncompleted workout with two main exercises and the generated program templates present. These flows neither launch nor sign in.

- **Navigation.** `.maestro/native/workout-navigation.yaml` checks Start Workout reaches the exercise list.
- **Drag.** Maestro can't make the drag (the grip needs a 150 ms hold, and Maestro's swipe moves at once). Drag with agent-device, slowly, e.g. `gesture pan 44 372 0 160 6000` on iPhone 17 to move row 1 down. Choose coordinates from a fresh screenshot.
- **Check order and logging.** Run `.maestro/native/workout-reorder.yaml` with `FIRST_EXERCISE` and `SECOND_EXERCISE` set to the first two rows' names as regexes (`"Goblet Squat.*"`). It checks the order, starts, logs set 1, checks the second exercise is clean, exits (Pause and exit), restarts the app, taps Resume Workout, and checks set 1 is still under the first exercise.
- **Training Science.** From Profile, scroll until Training Science shows, then run `.maestro/native/training-science-navigation.yaml`.
- **Proof.** Screenshots `native-workout-reordered`, `native-reorder-second-clean`, `native-reorder-resumed`, and `native-training-science`.

## Gotchas

- Not reachable on web: a web maintenance pass reports it `verified-unreachable` (prerequisite: iOS simulator, local build, agent-device drag).
- Grip handles have no individual accessibility refs; pans use screenshot coordinates.
- A known detail-to-execution index mismatch remains: detail passes main-list-relative indices while execution expects full-template indices, exposed when warm-up rows precede main rows. A detail reorder does not prove the transfer into execution; queue reorder and persistence were checked separately.
- Earlier direct device proof (detail and queue reorders, queue order surviving relaunch) is under `/Volumes/wander-fit-review/expo58-upgrade/evidence`. The Maestro files are regression assets, not claimed executed.
- These flows start sessions: use an E2E persona only, never reset or delete the durable review account.
