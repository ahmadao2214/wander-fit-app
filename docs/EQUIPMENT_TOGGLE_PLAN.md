# Equipment Toggle Feature — Gym / Home

## Problem

Workout templates currently skew exercises toward either requiring gym equipment OR being heavily plyometric/bodyweight with no middle ground. Specifically:

- **Power day has too many jumping/plyometrics** — should offer more conditioning equipment alternatives like battle ropes, sled/tank, ski erg, stair climber, assault bike, and farmers carry
- Users who train at home can't swap gym exercises for bodyweight alternatives
- Users at a gym see plyometric exercises when they'd prefer equipment-based conditioning
- No way to express "I train at a gym" vs "I train at home" as a preference

## Solution

A **Gym / Home** toggle that swaps exercises between equipment tiers, powered by tag-based matching.

- **Gym** (🏋️ Dumbbell icon) = full gym equipment — barbells, cable machines, racks, sleds, ergs
- **Home** (🏠 Home icon) = bodyweight + minimal gear — resistance bands, pull-up bar

The toggle appears on:
1. **Workout detail screen** — swap exercises per workout
2. **Settings screen** — set your default preference
3. **Intake questionnaire** — capture preference during onboarding

When toggled, the system automatically finds the best alternative exercise using existing movement pattern tags — no manual 1:1 mappings needed for most exercises.

---

## How Tag-Based Matching Works

Our exercises already have movement pattern tags: `push`, `pull`, `squat`, `hinge`, `lunge`, `carry`, `rotation`, plus direction (`horizontal`, `vertical`) and laterality (`bilateral`, `unilateral`).

These tags form a **movement signature**. Exercises with the same signature are natural alternatives for each other:

| Exercise | Movement Signature | Equipment |
|---|---|---|
| Bench Press | push + horizontal + bilateral | barbell, bench |
| Push-Up | push + horizontal + bilateral | bodyweight |
| DB Bench Press | push + horizontal + bilateral | dumbbell, bench |

When you toggle to **Home**, the system finds the bodyweight exercise with the best movement signature overlap. When you toggle to **Gym**, it finds the equipment-based match.

For edge cases where auto-matching picks the wrong exercise, we add a `preferredAlternativeSlug` override field — checked first before falling back to tag matching.

### What happens when there's no match?

Exercises without a good alternative in the other tier **stay unchanged** — no badge, no disruption. The audit report (see below) flags these gaps so we can add alternatives over time.

---

## Missing Exercises to Add

These exercises from our planning notes don't exist in the seed data yet:

| Exercise | Equipment | Tags |
|---|---|---|
| Battle Rope Slams | battle_rope | upper_body, pull, power, conditioning |
| Battle Rope Waves | battle_rope | upper_body, push, conditioning |
| Ski Erg Sprint | ski_erg | full_body, pull, vertical, conditioning, power |
| Assault Bike Sprint | assault_bike | full_body, conditioning, power |
| Stair Climber Sprint | stair_climber | lower_body, conditioning |
| Curve/Woodway Sprint | treadmill | lower_body, conditioning, power |

**Already exist:** Sled Push, Sled Pull, Tank Push, Tank Pull, Farmer's Walk

---

## Power Day — Proposed Swaps

The specific concern: power day has too many plyometrics. Here's how the toggle would address it:

| Current (Home/Plyo) | Gym Alternative (via tag match) |
|---|---|
| Box Jump | Sled Push |
| Broad Jump | Assault Bike Sprint |
| Jump Squat | Trap Bar Jump Squat |
| Lateral Bound | Ski Erg Sprint |
| Med Ball Slam | Battle Rope Slams |

These swaps happen automatically when the user toggles to **Gym** mode (assuming the plyometric exercises are the template defaults).

---

## Stacked PR Plan (4 PRs)

We're building this as 4 stacked PRs, each independently reviewable and testable. TDD approach throughout — tests written before implementation in each PR.

### PR 1: Foundation — Schema + Audit Script + Missing Exercises

**What it delivers:** The data model changes, new conditioning exercises, and an audit report for us to review together.

**Schema changes** (4 tables):
- `exercises` — add `preferredAlternativeSlug` (optional override for auto-matching)
- `user_programs` — add `equipmentMode` ("gym" | "home")
- `intake_responses` — add `equipmentMode`
- `gpp_workout_sessions` — add `equipmentMode` (snapshot of mode when workout was performed)

**New exercises:** 6 conditioning exercises (battle ropes, ski erg, assault bike, stair climber, curve/woodway)

**Audit script** (`scripts/exercise-audit.ts`):
- Groups all 200+ exercises by movement signature
- Shows equipment tier (gym/home) for each
- Auto-matches alternatives using the tag-based algorithm
- Flags exercises with no match → **these are our gaps**
- Outputs to `docs/exercise-equipment-audit.md`

**This is the deliverable we review together** — the audit report shows every exercise, its auto-matched alternative, and gaps we need to fill.

**Tests:**
- `extractMovementSignature()` extracts correct tags
- Movement signature overlap scoring
- Known pairs match (bench_press ↔ push_up)
- Exercises with no match return null
- All exercises have at least one movement tag

```bash
bun test convex/__tests__/exerciseMatching.test.ts
bun test convex/__tests__/equipmentAudit.test.ts
bun run scripts/exercise-audit.ts
```

---

### PR 2: Backend Logic — Matching Engine + Mutations

**What it delivers:** The core matching engine and API endpoints for equipment mode.

**New file** `convex/exerciseMatching.ts`:
- `extractMovementSignature(tags)` — pulls movement-defining tags
- `calculateSignatureOverlap(sig1, sig2)` — scores how similar two exercises are
- `findAlternativeExercise(exercise, allExercises, targetMode)` — finds best match

**Modified queries/mutations:**
- `programTemplates.getWorkoutWithScaling` — returns BOTH variants per exercise (gym + home) so the frontend can toggle instantly without a network round-trip
- `userPrograms.getEquipmentMode` / `setEquipmentMode` — read/write preference
- `gppWorkoutSessions.startSession` — accepts `equipmentMode` parameter
- `onboarding` — accepts `equipmentMode` in intake completion

**Tests:**
- `findAlternativeExercise()` correct match for gym→home and home→gym
- `preferredAlternativeSlug` override takes priority over auto-match
- `getWorkoutWithScaling` includes alternative exercise data with correct scaling
- `setEquipmentMode` persists preference
- Default mode is "gym" when unset

```bash
bun test convex/__tests__/exerciseMatching.test.ts
bun test convex/__tests__/userPrograms.test.ts
bun test convex/__tests__/programTemplates.test.ts
```

---

### PR 3: Intake + Settings UI

**What it delivers:** The intake screen, settings screen, and shared toggle component.

**New shared component** `components/EquipmentModeToggle.tsx`:
- Pill toggle with Gym/Home buttons (reuses existing Review/Preview toggle pattern)
- Used in workout detail, settings, and intake

**New intake screen** `app/(intake)/equipment.tsx`:
- Position: after Training Days (screen 5 of 8)
- Two large selectable cards: Gym ("I have access to a full gym") / Home ("I train at home with minimal equipment")
- Subtitle: "You can switch anytime from a workout or settings"

**New settings screen** `app/(athlete)/settings.tsx`:
- Training Environment section with the toggle
- Wired up from the profile page's "App Settings" card (currently a placeholder)

**Tests:**
- Intake screen renders cards, selection state updates, navigation works
- Settings screen renders toggle with current preference, calls mutation on toggle
- Shared toggle component renders correctly, fires callbacks

```bash
bun test app/__tests__/equipment-intake.test.tsx
bun test app/__tests__/settings.test.tsx
bun test components/__tests__/EquipmentModeToggle.test.tsx
```

---

### PR 4: Workout Detail Toggle + Execution

**What it delivers:** The toggle on the workout detail screen and execution integration.

**Workout detail screen** `app/(athlete)/workout/[id].tsx`:
- Gym/Home toggle below phase/intensity badges
- Reads initial state from user preference
- Exercises with alternatives swap inline when toggled
- Toggling calls `setEquipmentMode` (persists across workouts)
- Exercises without alternatives stay unchanged

**Exercise accordion** `components/ExerciseAccordionItem.tsx`:
- Shows swap indicator (↔ icon) when exercise was swapped
- Displays active variant's name, instructions, sets, reps

**Execution screen** `app/(athlete)/workout/execute/[id].tsx`:
- Small "Gym" or "Home" badge in header (informational, can't change mid-workout)
- Equipment mode locked at session start via `templateSnapshot`

**Tests:**
- Toggle renders with correct initial state
- Exercises swap when toggled
- Exercises without alternatives unchanged
- Swap indicator shows on swapped exercises
- `setEquipmentMode` called on toggle

```bash
bun test app/__tests__/workout-equipment-toggle.test.tsx
bun test components/__tests__/ExerciseAccordionItem.test.tsx
bun test  # full suite regression check
```

---

## Exercise Audit — How to Coordinate

### Process

1. **PR 1 generates the audit report** → `docs/exercise-equipment-audit.md`
2. **Review together** — the report groups exercises by movement pattern with auto-matched alternatives and gaps flagged
3. **Annotate:**
   - "This auto-match is wrong" → add `preferredAlternativeSlug` override in seed data
   - "This exercise needs an alternative we don't have" → add new exercise
   - "These power day exercises should swap to X" → validate the plyometric concern
4. **Re-run audit** after changes to verify gaps are closing
5. **Merge PR 1** once we're satisfied, then stack PR 2

### What the audit report looks like

```
## Horizontal Push (push + horizontal)
| Exercise         | Equipment       | Tier | Auto-Match      | Override | Gap? |
|------------------|-----------------|------|-----------------|----------|------|
| Bench Press      | barbell, bench  | Gym  | Push-Up ✓       | —        | —    |
| Push-Up          | bodyweight      | Home | Bench Press ✓   | —        | —    |
| DB Bench Press   | dumbbell, bench | Gym  | Push-Up ✓       | —        | —    |

## Carry
| Exercise         | Equipment  | Tier | Auto-Match | Override | Gap?              |
|------------------|------------|------|------------|----------|-------------------|
| Farmer's Walk    | dumbbell   | Gym  | —          | —        | ⚠️ NO HOME MATCH |
```

---

## Key Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Matching approach | Tag-based (not 1:1 slugs) | Exercises already have movement pattern tags; scales automatically as we add exercises |
| Override mechanism | `preferredAlternativeSlug` field | Escape hatch for when auto-matching is wrong |
| Data loading | Both variants returned in single query | Frontend toggle is instant, no loading state |
| Preference scope | Global (persists across workouts) | Toggle on one workout applies to all; can override per workout |
| Default mode | "gym" when unset | Preserves current behavior for existing users |
| Mid-workout switching | Not allowed | Mode locked at session start for consistency |

## Edge Cases

| Scenario | Behavior |
|---|---|
| Exercise has no alternative | Stays unchanged, no indicator |
| Superset with one swappable exercise | Superset stays intact, one exercise swaps |
| Warmup exercises | Mostly bodyweight already, unlikely to swap |
| 1RM-based exercise swapped to bodyweight | Automatically uses rep/duration scaling instead of %1RM |
| Existing users (no preference set) | Default to "gym" mode |

## Files Changed (All PRs)

| File | PR | Action |
|---|---|---|
| `convex/schema.ts` | 1 | Modify — add fields to 4 tables |
| `convex/seedData.ts` | 1 | Modify — add 6 new exercises |
| `convex/seed.ts` | 1 | Modify — seed new exercises |
| `scripts/exercise-audit.ts` | 1 | **NEW** — audit script |
| `docs/exercise-equipment-audit.md` | 1 | **NEW** — generated audit |
| `convex/__tests__/exerciseMatching.test.ts` | 1+2 | **NEW** — tests |
| `convex/__tests__/equipmentAudit.test.ts` | 1 | **NEW** — tests |
| `convex/exerciseMatching.ts` | 2 | **NEW** — matching engine |
| `convex/programTemplates.ts` | 2 | Modify — include alternatives |
| `convex/userPrograms.ts` | 2 | Modify — get/set equipment mode |
| `convex/gppWorkoutSessions.ts` | 2 | Modify — accept equipmentMode |
| `convex/onboarding.ts` | 2 | Modify — accept equipmentMode |
| `components/EquipmentModeToggle.tsx` | 3 | **NEW** — shared component |
| `app/(intake)/equipment.tsx` | 3 | **NEW** — intake screen |
| `app/(intake)/_layout.tsx` | 3 | Modify — add route |
| `components/IntakeProgressDots.tsx` | 3 | Modify — update count |
| `app/(athlete)/settings.tsx` | 3 | **NEW** — settings screen |
| `app/(athlete)/profile.tsx` | 3 | Modify — wire settings nav |
| `app/(athlete)/workout/[id].tsx` | 4 | Modify — toggle + swap logic |
| `components/ExerciseAccordionItem.tsx` | 4 | Modify — alt display |
| `app/(athlete)/workout/execute/[id].tsx` | 4 | Modify — mode badge |
