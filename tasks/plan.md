# Implementation Plan: First Run

## Overview

Replace sign-in-first intake and onboarding (14 steps before Start) with the First Run that Azhar settled in the grill on 2026-11-14. Five intake steps with no account, a reveal of the athlete's real Day 1, "Save your plan" (account plus program in one step), then straight into Day 1's warm-up. Terms are in `GLOSSARY.md`; the account decision is `docs/adr/0002-account-after-the-program-reveal.md`; the storyboard is https://claude.ai/artifact/N3oMtrWi3mtJ45qDAMbANN (concept A, with C's zoom as the reveal moment).

## What the athlete gets

1. **Promise:** "Let's build your plan for this season." · Five questions, then your first workout. · **Choose your sport** · I have an account
2. **Sport:** "What do you play?" All 27 sports, alphabetical grid of still `SportIcon`s, search on top. Tapping highlights the tile and gives a light haptic on iOS. Nothing animates.
3. **Season:** "When's your first game?" Drag to a date (up to 12 months), live "N weeks away", or **No set season**, which uses the existing 12-week default.
4. **Days:** "Which days can you train?" Mon/Wed/Fri preselected, live "3 days a week", no warning.
5. **About you:** age group (Youth 14–17 · Performance 18–35 · Vitality 36+) and years training for your sport (New to training · 1–2 years · 3+ years). **See my plan**
6. **Reveal**, the single animated moment: the sport icon plays once, then the Day 1 card (name, exercises, about how long), the GPP/SPP/SSP bar with names as text, the session count, and one line "Basketball trains for Power." Reduced motion and web: resting frame, everything appears at once. **Save my plan**
7. **Account sheet:** "Save your plan" · So it's here tomorrow. · Continue with Apple · Continue with email. No skip and no role question.
8. **After saving:** "You're set." · **Start Day 1** (starts the session and opens the warm-up) · Not now (Today, first visit: no "Welcome back", no zero stats).

Removed from the First Run: maxes (Profile already edits them; workouts run on RPE without one), Why it works, Commitment, Results, notifications, any paywall.

## Architecture decisions

- **New public route group `app/(first-run)/`.** Signed-out athletes land here instead of sign-in. "I have an account" links to sign-in. A signed-in athlete always has a program, because account and program are saved in the same step.
- **Answers live in a device draft until sign-up** (`lib/firstRunDraft.ts`): expo-secure-store on native (already installed), localStorage on web. It holds the answers, the last step reached and `firstLaunchAt`, and is cleared after the program saves. Reopening the app resumes at the last step.
- **The reveal reads public data only:** `sports.list` and `programTemplates.getWorkout` for GPP week 1 day 1 at the athlete's category and skill level. Phase lengths and the session count come from the same functions `completeIntake` uses (`convex/weekMapping.ts`, `lib/calculations.ts`), so the reveal can't promise a different program than the one that gets saved.
- **`completeIntake` takes `firstLaunchAt`** (new optional field). If the account already has a program, the existing program stays and the client shows a one-line notice. Verify the current `existingProgram` branch does exactly this before relying on it.
- **Years become three choices,** mapped to 0, 1 and 3 years so `getSkillLevel` keeps working unchanged.
- **Phase tints are placeholders behind one token set:** one hue in three tints deepening GPP → SPP → SSP, always with the name as text. The design-system pass replaces the values.
- **Motion:** Reanimated for the reveal only. `SportIcon` (built in the sport animation chat) does still and play-once rendering and reduced motion. Web gets a fade. No timed redirects anywhere.
- **Replace outright.** No flag. The old screens are deleted in the same release.

## Dependencies outside this plan

| Needed | Owner | Blocks |
|---|---|---|
| PRs #105, #106, #107 merged (#105 makes sign-up athlete-only and deletes orphaned onboarding screens) | visual-legacy chat | Done: merged 2026-11-14 |
| `components/sport-icon/SportIcon.tsx`, props for still or play-once, reduced-motion aware, static fallback | sport animation chat | Done: merged in #109 and #111 (2026-11-15) |
| Sign in with Apple enabled in the Clerk dashboard and the Apple Developer account (Services ID, key) | Azhar | Apple button in Task 10 (email works without it) |

## Task list

Tasks with acceptance criteria are in `tasks/todo.md`. Order:

- Phase 1, foundation: Tasks 1–4
- Checkpoint A
- Phase 2, the journey: Tasks 5–11
- Checkpoint B
- Phase 3, replace and prove: Tasks 12–16
- Checkpoint C

Suggested PRs: **PR 1** = Tasks 1–4 (no visible change, safe to merge alone). **PR 2** = Tasks 5–15 (the swap; must ship together because the old flow is deleted). Task 16 is the per-PR simulator check and recording.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| `SportIcon` isn't ready when Tasks 6 and 9 start | Med | Agree the props now; Tasks 7, 8, 10 and 11 don't need it, so do those first |
| Apple sign-in config isn't done | Med | Ship email first; Apple button appears once Clerk has the strategy. App Store review expects a privacy-focused login option next to Google, so it has to land before the next store build |
| Reveal numbers drift from the saved program | High | Reveal calls the same pure functions as `completeIntake`; a unit test compares them for every season length |
| Deleting old screens breaks imports or tests (reassessment shares pieces) | Med | Task 12 greps every import first; reassessment screens stay; `bun run typecheck` and `bun run test:ci` gate it |
| e2e database still has no templates | High for Task 13 | Task 4 seeds generated templates before the journey is written |
| expo-haptics is a native dependency | Low | Pin it and patch `bun.lock` in place (no full regeneration); rebuild the dev client once |
| Removing accounts with no intake is irreversible | Med | Task 14 lists them and waits for Azhar's go per deployment |

## Open questions

- None for product. Everything above was settled in the grill. The visual identity (tokens, type) comes from the design-system pass.
