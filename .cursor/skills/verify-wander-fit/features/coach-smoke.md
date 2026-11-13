# Native legacy coach smoke

The upgrade preserves the existing deprecated trainer routes; it does not implement a new coach product. Prepare a separate Clerk test user with an E2E `trainer` record and completed intake/onboarding flags. Never change the durable athlete's role or reset it. Authenticate privately, then open `myapp:///(trainer)` with the bound device CLI.

`.maestro/native/coach-smoke.yaml` starts on the authenticated roster and verifies the existing builder opens. It neither launches, signs in, assigns clients nor submits workouts. Direct local Release proof also opens Add Exercise, enters Bodyweight Squat, ends editing with keyboard Return, and adds the local draft (3 sets, 10 reps, 60s rest). The existing Analytics placeholder also renders.

Evidence: `native-coach-roster.png` and `native-coach-exercise-draft.png` in `/Volumes/wander-fit-review/expo58-upgrade/evidence`. Direct device checks passed; the Maestro asset itself is not claimed executed. No coach assignment/submission acceptance is claimed. All data is in `wander-fit-e2e` at `https://modest-kudu-493.convex.cloud`, with credentials/Apple input diagnostics kept private.
