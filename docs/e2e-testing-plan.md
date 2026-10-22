# E2E Testing Plan — DRAFT (pre-grill)

> Status: draft for `/grill-with-docs`. Decisions marked **[open]** are being resolved in the grilling session. Nothing here is built yet.

## 1. Why, and where it sits

E2E is the first **automated check** "brake" of the software factory (Matt Pocock's `/software-factory` vocabulary: automated checks → automated review → human review). It is also the **control adapter** PStack's `/create-verification-skill` needs: a scripted way for an agent to launch Wander-Fit, drive it like a user, and capture evidence. One harness, two consumers: CI and agents.

## 2. Ranked flows (business importance × risk)

| # | Flow | Why it ranks here | Screens | Convex writes |
|---|------|-------------------|---------|---------------|
| 1 | **Sign-in → correct landing** | Gate to everything; Clerk/Convex auth race (`useAuth` keys off Clerk, not Convex auth) | `(auth)/sign-in`, `index`, `(athlete)/index` | none (`users.getCurrentUser` read) |
| 2 | **Activation: sign-up → intake → onboarding → commitment → Today** | Only path to a paying/retained athlete; most writes; sign-up just had two bug-fix commits | `(auth)/sign-up` (form, verify, COMPLETE SETUP), `(intake)/sport, age-group, experience-years, training-days, season-timeline, maxes, results`, `(onboarding)/why-it-works, commitment` | `users.createUser`, `userMaxes.setMultipleMaxes`, `userPrograms.completeIntake` (intake_responses + user_programs), `onboarding.completeOnboarding` |
| 3 | **Core loop: start → execute → finish workout** | Daily value; most complex screen (`execute/[id]`, ~1.3k lines); program advancement | `(athlete)/index`, `workout/[id]`, `workout/execute/[id]` | `scheduleOverrides.setTodayFocus`, `gppWorkoutSessions.startSession/updateProgress/completeSession`, `userPrograms.advanceToNextDay` |
| 4 | **Reassessment at phase end** | Unlocks SPP/SSP; rare path → regressions go unnoticed | `(reassessment)/celebration, self-assessment, maxes, results` | `userMaxes.setMultipleMaxes`, `userPrograms.completeReassessment` |
| 5 | **Edit 1RM from Profile** | Drives every scaled weight | `(athlete)/profile` + `OneRepMaxSheet` | `userMaxes.setMaxBySlug` |
| 6 | Abandon / resume workout | Data-loss risk | `execute/[id]` exit dialog, Today "Resume" | `abandonSession` |
| 7 | Program calendar → detail; reschedule | Reschedule (drag) is native-only | `(athlete)/program` | `workoutCalendar.moveWorkoutToDate` |
| 8 | Edit set (long-press sheet) | Local state, persisted by debounce | `SetEditSheet` | via `updateProgress` |
| 9 | History | **Currently broken**: reads legacy `workoutSessions`, not `gpp_workout_sessions` | `(athlete)/history` | none |
| 10 | Sign-out | Low risk | Profile, intake sport | none |
| — | Legacy `(trainer)` / `(client)` / `add-client` | Unreachable from normal routing; stubs | — | **[open] exclude** |

## 3. Tools **[open]**

- **Playwright against the static web export** — every PR, in GitHub Actions; also the agents' verification driver (Chromium runs in cloud containers; simulators don't).
- **Maestro on EAS Workflows** — native iOS/Android, nightly + PR label, phase 2.
- Shared selectors: `testID` props (React Native Web renders them as `data-testid`; Maestro matches `id:`).

## 4. Test data **[open]**

Options: fixed shared account / Clerk testing tokens / create-and-delete per run. Draft recommendation: dedicated E2E Convex deployment + dedicated Clerk app; per-run users created through Clerk Backend API; Convex state seeded by internal `e2e:*` functions; one UI sign-up test via testing token; sweeper for leaks.

## 5. First tests (draft)

1. `sign-in.spec` — onboarded persona signs in → Today; sign-out → sign-in.
2. `sign-up.spec` — UI sign-up with `+clerk_test` + `424242` → COMPLETE SETUP not shown → intake sport.
3. `activation.spec` — needs-intake persona → intake → hold-to-commit → Today shows a workout; Convex shows GPP W1D1.
4. `workout-loop.spec` — onboarded persona → start → complete all sets → finish → Today advanced; session completed.
5. `reassessment.spec` — phase-end persona → check-in → SPP unlocked.

## 6. CI **[open]**

## 7. Prerequisites (Phase 0) **[open]**

- Lock down unauthenticated Convex admin/seed/debug mutations (security).
- Unit-test cleanup: runner split, `--watchAll`, jest dependency, 3 failing suites, lockfile platform binaries, TS-error ratchet.
