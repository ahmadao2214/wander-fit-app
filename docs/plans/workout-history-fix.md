# Workout History Fix & Enhancement Plan

**Date:** 2026-04-11
**Branch:** `plan/workout-history-fix`
**Author:** Claude (for review by cofounders)

---

## Summary

Workout sessions completed by athletes are not appearing in the History tab. This document identifies the root cause, secondary bugs, and a phased enhancement roadmap to make the history feature a meaningful progress-tracking and coaching tool.

---

## Root Cause Analysis

### Bug #1 (Critical): History page is querying the wrong Convex table

**File:** `app/(athlete)/history.tsx`, line 48

```ts
// CURRENT (broken) — queries old legacy table
const sessions = useQuery(api.workoutSessions.getHistory, user ? {} : "skip")

// CORRECT FIX — queries the active sessions table
const sessions = useQuery(api.gppWorkoutSessions.getHistory, user ? {} : "skip")
```

**Why this breaks everything:**

The app has two separate Convex modules and two separate database tables for workout sessions:

| Module | Table | Purpose |
|--------|-------|---------|
| `convex/workoutSessions.ts` | `workoutSessions` | Legacy — trainer-assigned workouts (old system) |
| `convex/gppWorkoutSessions.ts` | `gpp_workout_sessions` | Active — all athlete self-service GPP/SPP/SSP workouts |

Every workout an athlete starts and completes goes through the execution screen (`app/(athlete)/workout/execute/[id].tsx`), which calls:

```ts
await completeSession({
  sessionId: sessionId as Id<"gpp_workout_sessions">,
  ...
})
// → api.gppWorkoutSessions.completeSession
// → writes to "gpp_workout_sessions" table
```

But the History page reads from the old `workoutSessions` table, which is never written to during normal athlete use. The table is empty for all current athletes — hence the "No Workouts Yet" empty state showing on every session.

---

### Bug #2: Duration field name mismatch

Even after fixing Bug #1, the workout duration will not display in history cards.

**File:** `app/(athlete)/history.tsx`, line 143

```tsx
// CURRENT (broken) — reads undefined field
{session.totalDuration && (
  <Text>{formatDuration(session.totalDuration)}</Text>
)}
```

The `gpp_workout_sessions` schema stores duration as `totalDurationSeconds`, not `totalDuration`:

```ts
// convex/schema.ts, line 359
totalDurationSeconds: v.optional(v.number()),
```

**Fix:** Update the history card render to read `session.totalDurationSeconds`.

---

### Bug #3: `getHistory` query returns in-progress sessions

**File:** `convex/gppWorkoutSessions.ts`, line 399–442

The `getHistory` query does not filter by status — it returns all sessions including `in_progress` ones. An athlete who has an active workout in progress would see it appear at the top of their history list before it is finished.

```ts
// CURRENT — no status filter
const sessions = await ctx.db
  .query("gpp_workout_sessions")
  .withIndex("by_user", (q) => q.eq("userId", user._id))
  .order("desc")
  .take(limit);

// FIX — filter to completed and abandoned only
const sessions = await ctx.db
  .query("gpp_workout_sessions")
  .withIndex("by_user_status", (q) =>
    q.eq("userId", user._id).eq("status", "completed")
  )
  .order("desc")
  .take(limit);
```

> **Note:** Because Convex `withIndex` filters only support equality on the indexed fields in order, filtering for both `completed` and `abandoned` in a single query is not straightforward with the current `by_user_status` index. The simplest approach is to run two queries and merge+sort the results client-side, or add a dedicated `by_user_completed` index. Alternatively, the UI can filter out `in_progress` records after fetching.

---

## Impact Assessment

| Bug | User-Facing Impact | Severity |
|-----|-------------------|----------|
| Bug #1 – Wrong table | History always shows empty; zero workout history ever recorded | **Critical** |
| Bug #2 – Wrong field name | Duration never shows on history cards | Medium |
| Bug #3 – No status filter | In-progress workout bleeds into history list | Low |

---

## Proposed Fix (Phase 1 — Immediate)

Three focused changes to make history work correctly:

### 1. Fix the query in `history.tsx`

```tsx
// app/(athlete)/history.tsx, line 48
// Change:
const sessions = useQuery(api.workoutSessions.getHistory, user ? {} : "skip")
// To:
const sessions = useQuery(api.gppWorkoutSessions.getHistory, user ? {} : "skip")
```

### 2. Fix the duration field name in `history.tsx`

```tsx
// app/(athlete)/history.tsx, line 143–149
// Change:
{session.totalDuration && (
  <Text>{formatDuration(session.totalDuration)}</Text>
)}
// To:
{session.totalDurationSeconds && (
  <Text>{formatDuration(session.totalDurationSeconds)}</Text>
)}
```

### 3. Filter out in-progress sessions in `gppWorkoutSessions.getHistory`

Filter the returned sessions to only include `completed` and `abandoned` statuses, so active sessions never appear in history.

---

## Enhancement Roadmap (Phase 2 — Short Term)

Once history is correctly populated, we should enrich it to be a meaningful training log.

### 2a. Session Detail View

Tapping a history card should navigate to a read-only session detail screen showing:
- Each exercise with sets, reps, weight, and RPE logged
- Comparison to the prescription (what was planned vs. what was done)
- Notes entered during the session
- Session duration and completion percentage

**New screen:** `app/(athlete)/history/[sessionId].tsx`
**Backend query:** `api.gppWorkoutSessions.getById` (already exists, used during execution)

### 2b. Progressive Overload Indicators

On each history card (and on the session detail view), surface whether the athlete improved vs. their last session on the same template:

- Volume up/down (total sets × reps)
- Any new 1RM PRs hit
- RPE trend (same load, lower RPE = fitness adaptation)

**Backend:** `api.gppWorkoutSessions.getLastCompletedSessionForTemplate` already exists and is used on the workout detail screen — reuse this pattern.

### 2c. Summary Statistics

Add a stats strip at the top of the History tab:
- Total workouts completed (all time / last 30 days)
- Current training streak (consecutive days with a completed session)
- Total training minutes
- Phase completion percentage (e.g., "GPP: 8/24 sessions complete")

---

## Enhancement Roadmap (Phase 3 — Coach/Trainer Visibility)

This directly supports the future coach/trainer functionality of the app.

### Current State

The legacy `workoutSessions.ts` module already has a `getClientSessionHistory` query for trainer access, but it reads from the old `workoutSessions` table that is no longer used. Trainers cannot currently see any athlete workout history.

### What Needs to Be Built

**3a. Trainer query for athlete history**

Add a `getAthleteHistory` query to `gppWorkoutSessions.ts` that:
- Requires a trainer role
- Verifies a trainer-client relationship exists before returning data
- Returns the same enriched session data as `getHistory`, but for any athlete the trainer has access to

**3b. Trainer-side history view**

A screen in the trainer/coach section that allows a trainer to:
- Select an athlete from their roster
- View that athlete's complete workout history
- See session details (exercises, sets, reps, weight, RPE)
- Identify trends: consistency, progressive overload, recovery patterns

**3c. Compliance and adherence tracking**

For each athlete, calculate and display:
- Scheduled sessions vs. completed sessions (completion rate)
- Missed workouts and patterns (e.g., consistently skips Fridays)
- RPE trends over time (flag if athlete is consistently reporting very high RPE — potential overtraining)

---

## Files To Be Changed

### Phase 1 (Bug Fixes)

| File | Change |
|------|--------|
| `app/(athlete)/history.tsx` | Line 48: change to `api.gppWorkoutSessions.getHistory` |
| `app/(athlete)/history.tsx` | Line 143: change `totalDuration` → `totalDurationSeconds` |
| `convex/gppWorkoutSessions.ts` | `getHistory` query: add status filter |

### Phase 2 (Enhancements)

| File | Change |
|------|--------|
| `app/(athlete)/history/[sessionId].tsx` | New screen — session detail view |
| `app/(athlete)/history.tsx` | Add navigation to detail view on card press |
| `app/(athlete)/history.tsx` | Add summary stats strip |
| `convex/gppWorkoutSessions.ts` | Add any needed queries for stats/comparison |

### Phase 3 (Trainer Visibility)

| File | Change |
|------|--------|
| `convex/gppWorkoutSessions.ts` | Add `getAthleteHistory` (trainer-auth'd query) |
| `app/(trainer)/athletes/[id]/history.tsx` | New screen — trainer view of athlete history |

---

## Testing Requirements

Per project guidelines, all changes must include unit tests.

### Phase 1 Tests

- `convex/__tests__/gppWorkoutSessions.test.ts` — test that `getHistory` excludes `in_progress` sessions
- `app/__tests__/history.test.tsx` — test that history screen renders session cards, handles empty state, displays duration from `totalDurationSeconds`

### Phase 2 Tests

- `app/__tests__/history-detail.test.tsx` — test session detail screen renders exercise data correctly
- `lib/__tests__/progressComparison.test.ts` — test progressive overload comparison logic

---

## Open Questions for Review

1. **Abandoned sessions in history:** Should abandoned/incomplete sessions appear in history with a distinct visual style (they currently would)? Or should history only show fully completed workouts?

2. **Pagination:** The current `getHistory` query defaults to the most recent 20 sessions. Should we add pagination/infinite scroll on the history screen, or is 20 sufficient for now?

3. **Phase 2 priority:** Should the session detail view (2a) come before the stats strip (2c), or do we want a quick win with summary stats first?

4. **Trainer history access model:** In Phase 3, should trainers see the athlete's full history immediately upon relationship acceptance, or only history from the point the relationship was established?
