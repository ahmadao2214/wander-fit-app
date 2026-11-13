# Native workout reorder

Regression for RN 0.88 removing InteractionManager while draggable-flatlist 4.0.3 still calls it on changed ordered keys. Bun applies the committed dependency patch to defer reset with a zero-delay timer instead. The Jest dependency regression executes the actual installed source's changed-key branch; it does not prove native gestures.

## Preconditions and driving

- Dedicated iOS 27.2 simulator, local Release build, only `wander-fit-e2e` at `https://modest-kudu-493.convex.cloud`.
- Authenticate through an approved secret-safe path. Open an unlocked, uncompleted workout with two main exercises. Scroll until both exercise rows and their grip handles are visible. This flow intentionally neither launches nor signs in; it preserves that prepared screen.
- Set `MOVED_EXERCISE` to the first row's exact exercise name and `TARGET_EXERCISE` to the second row's exact name. Set `DRAG_START` to the first grip's percentage coordinates and `DRAG_END` to a point below the second row. Use fresh screenshots to choose coordinates, not a different simulator's layout.
- Run `.maestro/native/workout-reorder.yaml` through the authorized project test runner. The flow holds the drag for two seconds and asserts the moved exercise appears below the target, then captures `native-workout-reordered`.
- Confirm the app remains open and the changed order persists when returning to the workout. Also exercise the upcoming-exercise queue's reorder control during execution before claiming full athlete acceptance.

## Acceptance status

Not run: authenticated native proof is blocked on the device CLI's unsupported remote redacted recording path. Do not substitute sign-in launch, a unit test, or bundle export for native reorder proof. E2E workout order mutations are allowed only in the E2E project; never reset or delete the durable review account.
