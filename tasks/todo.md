# First Run tasks

Plan: `tasks/plan.md`. Verification commands: `bun run test -- <pattern>`, `bun run test:ci`, `bun run typecheck`.

## Phase 1: Foundation (PR 1)

- [x] **Task 1: First Run rules as pure functions** (S)
  - `lib/firstRun.ts`: answer types; years choice → 0/1/3 years; "No set season" → `weeksUntilSeason` undefined; default days Mon/Wed/Fri; phase weeks and session count using `convex/weekMapping.ts` and `lib/calculations.ts`.
  - Acceptance: every season length from 1 to 52 weeks and "no season" gives the same phase weeks as `completeIntake` would store; each years choice maps to Novice, Moderate, Advanced.
  - Verify: `bun run test -- firstRun` (new `lib/__tests__/firstRun.test.ts`).
  - Depends on: none. Files: `lib/firstRun.ts`, its test.

- [x] **Task 2: Device draft** (S)
  - `lib/firstRunDraft.ts`: save, load and clear answers, last step reached and `firstLaunchAt` (set once, on first load). SecureStore on native, localStorage on web, both wrapped so a failure falls back to an empty draft.
  - Acceptance: round-trips a draft; `firstLaunchAt` never changes after it's set; clear removes everything; corrupt data loads as empty.
  - Verify: `bun run test -- firstRunDraft`.
  - Depends on: 1. Files: `lib/firstRunDraft.ts`, its test.

- [x] **Task 3: `completeIntake` takes `firstLaunchAt` and keeps an existing program** (S)
  - Add optional `firstLaunchAt` to the args and store it (optional field on `users`). Confirm that an account with a program keeps it, and return a flag the client can use for the notice.
  - Acceptance: a new account stores `firstLaunchAt` and gets GPP week 1 day 1; a second call on an account with a program leaves the program unchanged and reports it.
  - Verify: `bun run test -- userPrograms` (convex-test).
  - Depends on: none. Files: `convex/schema.ts`, `convex/userPrograms.ts`, `convex/__tests__/userPrograms.test.ts`.

- [x] **Task 4: Workout templates in the e2e database** (M)
  - The verify runner's seed step also runs the generated-template mutation on `wander-fit-e2e`, so `getWorkout` returns real Day 1s. Update the "Today card stays Loading" gotcha in the feature map.
  - Acceptance: after `node scripts/verify/run.mjs deploy`, `programTemplates.getWorkout` for category 2, GPP, Novice, week 1, day 1 returns "Lower Body A - Foundation".
  - Verify: run the deploy step, then the query with the Convex CLI.
  - Depends on: none. Files: `scripts/verify/run.mjs`, `.cursor/skills/verify-wander-fit/features/activation.md`.

### Checkpoint A
- [x] `bun run test:ci` and `bun run typecheck` pass. No user-visible change. PR 1 opened.

## Phase 2: The journey (PR 2)

- [ ] **Task 5: Routing and the `(first-run)` group** (M)
  - Signed out → `/(first-run)` (resumes at the draft's last step). "I have an account" → sign-in. Signed in → athlete tabs. Remove the intake and onboarding branches from `app/index.tsx` and `useAuth`.
  - Acceptance: a fresh install opens on the promise screen; a draft at step 4 reopens on step 4; a signed-in athlete never sees the First Run.
  - Verify: screen test `app/__tests__/first-run-routing.test.tsx`.
  - Depends on: 2. Files: `app/index.tsx`, `app/(first-run)/_layout.tsx`, `hooks/useAuth.ts`, `components/AuthGuard.tsx`, test.

- [ ] **Task 6: Promise and Sport** (M)
  - Promise copy as in the plan. Sport: all 27 from `sports.list`, alphabetical, search, still `SportIcon`, selected state, light haptic on iOS (Task 15). Writes the draft.
  - Acceptance: search narrows the grid; selecting stores the sport and shows "Basketball · Power" in the "Your program" bar without animation; Continue needs a selection.
  - SportIcon (merged in #109/#111): `<SportIcon name={sport.name} mode="still" />`. The icon is hidden from accessibility, so each tile's label must say the sport name and its selected state.
  - Verify: `app/__tests__/first-run-sport.test.tsx`.
  - Depends on: 5, SportIcon. Files: `app/(first-run)/index.tsx`, `app/(first-run)/sport.tsx`, `components/first-run/ProgramBar.tsx`, test.

- [ ] **Task 7: Season and Days** (M)
  - Season: drag along a 12-month track with live "N weeks away", plus "No set season". Days: Mon/Wed/Fri preselected, live count.
  - Acceptance: the weeks shown match `lib/firstRun.ts`; "No set season" stores no date; days can't drop to zero.
  - Verify: `app/__tests__/first-run-season-days.test.tsx`.
  - Depends on: 5. Files: `app/(first-run)/season.tsx`, `app/(first-run)/days.tsx`, test.

- [ ] **Task 8: About you** (S)
  - Three age groups and three years choices on one screen. **See my plan**.
  - Acceptance: both must be chosen; values match `completeIntake`'s validators.
  - Verify: `app/__tests__/first-run-about.test.tsx`.
  - Depends on: 5. Files: `app/(first-run)/about.tsx`, test.

- [ ] **Task 9: Reveal** (M)
  - Day 1 card from `programTemplates.getWorkout`, GPP/SPP/SSP bar (placeholder tints, names as text, tap shows the full name), session count, one category line. One animated moment: `SportIcon` plays once, content resolves with it. Reduced motion and web: resting frame, no movement. Loading state while the template loads; no rings, no scores.
  - Acceptance: numbers match Task 1 for the draft; reduced motion renders with no animation; "Save my plan" opens the account sheet.
  - SportIcon: `mode="once"` with `onFinish` resolving the rest of the reveal. With Reduce Motion on or unknown, or a sport with no animation, `onFinish` fires at once, so content appears together. One play is about 5 s, so content must not wait for it to finish; start it alongside the play and use `onFinish` only to settle. Check on web that lottie-react-native plays (or falls back to still) and that `useReducedMotion` reads the media query.
  - Phase names and colors come from `lib/phase.ts` and the `$phaseGPP`/`$phaseGPPText`/`$phaseGPPTint`/`$phaseGPPOnFill` tokens (and SPP/SSP) from PR #110, not placeholder tints. Buttons use `$primary`. Build on #110 once it merges.
  - Show `programWeeks` from `revealProgram`, not the season distance: phases are 2–8 weeks, so a season 52 weeks away runs a 24-week program and one 1 week away runs 6 weeks. Copy must not claim the program ends at the first game when they differ.
  - Verify: `app/__tests__/first-run-reveal.test.tsx`, plus a manual reduced-motion check in the simulator.
  - Depends on: 1, 5, SportIcon. Files: `app/(first-run)/reveal.tsx`, `components/first-run/PhaseBar.tsx`, `components/first-run/DayOneCard.tsx`, test.

- [ ] **Task 10: Save your plan** (M)
  - Sheet over the reveal: Continue with Apple (shown once Clerk has it), Continue with email (reuses the email-code steps from `sign-up.tsx`). On success: create the user, call `completeIntake` with the draft and `firstLaunchAt`, clear the draft. Existing program → one-line notice and keep it. Closing the sheet keeps the draft.
  - Acceptance: email sign-up ends with a saved program and an empty draft; an existing account keeps its program; there is no role question and no skip.
  - Verify: `app/__tests__/first-run-save.test.tsx` with Clerk and Convex mocked.
  - Depends on: 3, 9. Files: `components/first-run/SavePlanSheet.tsx`, `app/(auth)/sign-up.tsx` (extract the email-code steps), test.

- [ ] **Task 11: After saving, and Today's first visit** (S)
  - "You're set." · **Start Day 1** calls `gppWorkoutSessions.startSession` and opens the execute screen on the warm-up · Not now → Today. Today with no finished workouts: no "Welcome back", no zero-stat row.
  - Acceptance: Start Day 1 lands on the first warm-up exercise; Today's first visit shows Day 1 and its date only.
  - Verify: `app/__tests__/first-run-start.test.tsx`, update the Today screen test.
  - Depends on: 10. Files: `app/(first-run)/ready.tsx`, `app/(athlete)/index.tsx`, tests.

### Checkpoint B
- [ ] `bun run test:ci` and `bun run typecheck` pass.
- [ ] On the local iPhone 17 simulator (one simulator only; use `device_open`): fresh install → Start Day 1 in under 2 minutes, warm-up showing. Same on web.
- [ ] Show Azhar before Phase 3.

## Phase 3: Replace and prove (PR 2)

- [ ] **Task 12: Delete the old screens** (M)
  - Delete `app/(intake)/`, `app/(onboarding)/`, `components/IntakeProgressDots.tsx` and their tests, plus the onboarding state fields and queries once nothing reads them. Keep everything reassessment uses.
  - Acceptance: no imports of deleted files; reassessment still works.
  - Verify: `bun run typecheck`, `bun run test:ci`, a reassessment screen test.
  - Depends on: 11. Files: the deleted folders, `convex/onboarding.ts`, `convex/schema.ts`.

- [ ] **Task 13: First Run journey replaces activation** (M)
  - `.maestro/journeys/first-run.yaml` with web and native entries. Starts signed out, answers the intake, asserts the Day 1 name on the reveal, signs up with a `+clerk_test` email, lands on the warm-up. `persona inspect` checks the program (GPP, week 1, day 1) and `firstLaunchAt`. Feature map `first-run.md` replaces `activation.md`; remove the `needs-intake` persona state.
  - Acceptance: `node scripts/verify/run.mjs all first-run` passes on web and native.
  - Verify: that command, with the evidence under `e2e-artifacts/first-run/`.
  - Depends on: 4, 12. Files: `.maestro/journeys/first-run.yaml`, `.maestro/web/first-run.yaml`, `.maestro/native/first-run.yaml`, `scripts/verify/run.mjs`, `convex/e2e.ts`, feature map.

- [ ] **Task 14: Remove accounts with no intake** (S, needs Azhar's go)
  - List users with no intake in dev and production, show the list, delete them (Clerk user plus Convex rows) only after Azhar confirms each deployment.
  - Acceptance: list shown; deletion run only on confirmed deployments; a second list comes back empty.
  - Verify: the list query before and after.
  - Depends on: 13 merged. Files: none in the app; a one-off script in the scratchpad.

- [ ] **Task 15: Haptics** (S)
  - Add `expo-haptics` (pinned version, `bun.lock` patched in place); light impact on sport selection on iOS only.
  - Acceptance: one haptic per selection; nothing on web.
  - Verify: `bun run typecheck`; feel it on the simulator build.
  - Depends on: 6. Files: `package.json`, `bun.lock`, `app/(first-run)/sport.tsx`.

- [ ] **Task 16: Simulator self-check and recording** (S)
  - Local loop on the iPhone 17, then one EAS cloud run of at most 5 minutes for the recording, linked in the PR; `eas simulator:stop` after.
  - Acceptance: recording shows launch → Start Day 1.
  - Depends on: 13.

### Checkpoint C
- [ ] All acceptance criteria met, `bun run test:ci` and `bun run typecheck` green, First Run journey green on web and native.
- [ ] PR 2 ready for review with the recording.
