# Native workout reorder

Regression for RN 0.88 removing InteractionManager while draggable-flatlist 4.0.3 still calls it on changed ordered keys. Bun applies the committed dependency patch to defer reset with a zero-delay timer instead. The Jest dependency regression executes the actual installed source's changed-key branch; it does not prove native gestures.

## Preconditions and driving

- Dedicated iOS 27.2 simulator, local Release build, only `wander-fit-e2e` at `https://modest-kudu-493.convex.cloud`.
- Authenticate through an approved secret-safe path. Open an unlocked, uncompleted workout with two main exercises. Scroll until both exercise rows and their grip handles are visible. This flow intentionally neither launches nor signs in; it preserves that prepared screen.
- With the onboarded Basketball Novice account on Today and `seed:seedAllSkillLevelTemplates` reference data present, `.maestro/native/workout-navigation.yaml` first verifies Start Workout reaches the exercise list. Router 58 redirects `href: null` tabs to Today; the layout instead hides only the workout and training-science tab buttons, preserving their routes.
- Set `MOVED_EXERCISE` to the first row's exact exercise name and `TARGET_EXERCISE` to the second row's exact name. Set `DRAG_START` to the first grip's percentage coordinates and `DRAG_END` to a point below the second row. Use fresh screenshots to choose coordinates, not a different simulator's layout.
- Run `.maestro/native/workout-reorder.yaml` through the authorized project test runner. The flow holds the drag for two seconds and asserts the moved exercise appears below the target, then captures `native-workout-reordered`.
- Confirm the app remains open and the changed order persists when returning to the workout. Also exercise the upcoming-exercise queue's reorder control during execution before claiming full athlete acceptance.

## Acceptance status

Direct device proof passed on the locally signed Release binary: workout-detail Goblet Squat moved below Romanian Deadlift without a crash; execution queue Romanian Deadlift moved below Reverse Lunge, and that queue order survived an app relaunch/resume. Screenshots: `native-workout-reordered.png`, `native-queue-before.png`, `native-queue-reordered.png`, `native-queue-relaunch-persisted.png` under `/Volumes/wander-fit-review/expo58-upgrade/evidence`. Grip handles have no individual accessibility refs; coordinate pans used their observed screenshot positions. The Maestro files are regression assets, not claimed executed.

The same Router 58 hidden-tab fix covers training science: from the authenticated Profile screen, scroll until Training Science is visible, then `.maestro/native/training-science-navigation.yaml` verifies the learning destination. Direct device proof is `native-training-science.png`.

An existing detail-to-execution index mismatch remains outside this upgrade: detail passes main-list-relative indices while execution expects full-template indices. The legacy seed exposes this when warmup rows precede main rows. Do not claim that visual detail reordering proves correct transfer into execution; queue reordering and persistence were verified independently. E2E mutations target only the E2E project; the durable review account is never reset/deleted.
