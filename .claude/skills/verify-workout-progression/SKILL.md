---
name: verify-workout-progression
description: Replay the two-device Redo race and GPP reassessment boundaries against production mutations on a disposable Convex database.
---

Run `bun install --frozen-lockfile`, then `bash scripts/progression/run.sh` with Node 22 and the pinned Convex backend from the progression job in `.github/workflows/checks.yml`. Set `CONVEX_LOCAL_BACKEND` to its executable if not in the default macOS cache. The harness seeds separate athlete programs in temporary loopback SQLite storage, not a hosted deployment.

At W2D2, completing a Redo must leave the program at W2D2. Device A starts a Redo of W2D1, completes it, then asks to advance. Insert B's attempt to start W2D2 at each of the four boundaries, both with and without A supplying its session ID on advance. The model tracks who owns the open workout: a competing start must be rejected, and a rejected start on A skips A's remaining calls. Each transition reads the persisted cursor. Start, complete and advance map respectively to `gppWorkoutSessions.startSession`, `gppWorkoutSessions.completeSession` and `userPrograms.advanceToNextDay`.

Historical replay: `git diff 703ddcc 9012fd7 -- convex/userPrograms.ts`. Temporarily restore the pre-fix newest-created-session lookup in the no-ID path and run the harness. With B starting between A's complete and advance, it reports W3D1 instead of W2D2. Restore the completed-session lookup and rerun.

Bounds: Convex mutations are atomic; this enumerates their serial orderings within this scenario, not network retries, multiple completions, or every phase. Seven additional GPP example states check ordinary day/week transitions and that a final day stays put with reassessment pending.
