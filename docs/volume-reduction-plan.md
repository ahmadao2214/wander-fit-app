# Volume Reduction Plan: Capping Exercise Prescription to 4 Sets × 12 Reps

## Overview

This document outlines the problem of excessive exercise volume in the Wander-Fit workout prescription system and proposes specific, targeted code changes to enforce a hard cap of **4 sets and 12 reps** per exercise across all sport categories.

**The rule:** No sport category — outside of highly experienced bodybuilders — requires more than 4 sets of 12 reps of any single exercise. The current system exceeds this in multiple places, most visibly on barbell compound lifts (back squat, deadlift, bench press) prescribed for advanced athletes.

---

## Background: How Volume Is Prescribed

The app uses two overlapping systems to generate exercise prescriptions:

1. **`convex/generateTemplates.ts`** — A simplified template generator used for auto-generating program templates. Uses `SKILL_CONFIG` (Novice/Moderate/Advanced base sets/reps) multiplied by `PHASE_CONFIG` rep modifiers and weekly volume multipliers.

2. **`convex/intensityScaling.ts`** — A detailed category-phase configuration matrix (`CATEGORY_PHASE_CONFIG`) that prescribes exact set/rep ranges per sport category and training phase, further filtered by an age/experience matrix.

Both systems currently allow volumes that exceed evidence-based recommendations for sport-specific training.

---

## Problem Statement: Where Volume Is Excessive

### Issue 1 — Advanced Skill Level Sets (`generateTemplates.ts`)

**Location:** `convex/generateTemplates.ts`, lines 131–136

```ts
// Current
Advanced: {
  baseSets: 5,   // ← Too high
  baseReps: 8,
  ...
}
```

At Week 3 (peak, `volumeMultiplier = 1.0`), compound lifts get `adjustedSets = 5`. This means back squat, deadlift, and bench press are prescribed at **5 sets** for Advanced athletes.

**Fix:** Lower `Advanced.baseSets` from `5` → `4`.

---

### Issue 2 — GPP Rep Modifier Exceeds 12 Reps (`generateTemplates.ts`)

**Location:** `convex/generateTemplates.ts`, lines 89–93

```ts
// Current
GPP: {
  repsModifier: 1.2,  // ← Novice (12 baseReps × 1.2) = 14–15 reps
  ...
}
```

For a Novice athlete in GPP: `12 × 1.2 = 14.4`, rounded to a "12–14" rep range — exceeding the 12-rep cap.

**Fix:** Lower GPP `repsModifier` from `1.2` → `1.0`. GPP should emphasize movement quality and moderate volume, not high rep counts.

---

### Issue 3 — Category Sets Ranges Allow Up to 6 Sets (`intensityScaling.ts`)

**Location:** `convex/intensityScaling.ts`, `CATEGORY_PHASE_CONFIG`, lines 277–386

Current sets ranges by category and phase:

| Category | Phase | Current `sets` Range | Problem |
|---|---|---|---|
| 1 (Endurance) | GPP | `{ min: 4, max: 6 }` | max 6 sets |
| 1 (Endurance) | SPP | `{ min: 4, max: 6 }` | max 6 sets |
| 1 (Endurance) | SSP | `{ min: 3, max: 5 }` | max 5 sets |
| 2 (Power) | GPP | `{ min: 4, max: 6 }` | max 6 sets |
| 2 (Power) | SPP | `{ min: 4, max: 6 }` | max 6 sets |
| 2 (Power) | SSP | `{ min: 4, max: 6 }` | max 6 sets |
| 3 (Rotational) | SPP | `{ min: 3, max: 5 }` | max 5 sets |
| 3 (Rotational) | SSP | `{ min: 4, max: 6 }` | max 6 sets |
| 4 (Strength) | SSP | `{ min: 4, max: 6 }` | max 6 sets |

**Fix:** Cap all `sets.max` values at `4`. The minimum values can remain as-is (lower minimums are appropriate for lower experience/age athletes).

Proposed values after change:

| Category | Phase | Proposed `sets` Range |
|---|---|---|
| 1 (Endurance) | GPP | `{ min: 3, max: 4 }` |
| 1 (Endurance) | SPP | `{ min: 3, max: 4 }` |
| 1 (Endurance) | SSP | `{ min: 3, max: 4 }` |
| 2 (Power) | GPP | `{ min: 3, max: 4 }` |
| 2 (Power) | SPP | `{ min: 3, max: 4 }` |
| 2 (Power) | SSP | `{ min: 3, max: 4 }` |
| 3 (Rotational) | GPP | `{ min: 2, max: 4 }` *(unchanged, already ≤ 4)* |
| 3 (Rotational) | SPP | `{ min: 3, max: 4 }` |
| 3 (Rotational) | SSP | `{ min: 3, max: 4 }` |
| 4 (Strength) | GPP | `{ min: 3, max: 4 }` *(unchanged, already ≤ 4)* |
| 4 (Strength) | SPP | `{ min: 4, max: 4 }` *(unchanged, already ≤ 5, cap to 4)* |
| 4 (Strength) | SSP | `{ min: 4, max: 4 }` |

---

### Issue 4 — Rep Maxima Exceed 12 Reps (`intensityScaling.ts`)

**Location:** `convex/intensityScaling.ts`, `CATEGORY_PHASE_CONFIG`, GPP sections for categories 1–3

Current rep ranges for strength exercises in GPP:

| Category | GPP `reps.strength` | Problem |
|---|---|---|
| 1 (Endurance) | `{ min: 10, max: 14 }` | max 14 reps |
| 2 (Power) | `{ min: 10, max: 14 }` | max 14 reps |
| 3 (Rotational) | `{ min: 10, max: 14 }` | max 14 reps |

**Fix:** Cap `reps.strength.max` at `12` for all categories in GPP.

---

### Issue 5 — Age Rules Allow Too Many Sets (`intensityScaling.ts`)

**Location:** `convex/intensityScaling.ts`, `AGE_INTENSITY_RULES`, lines 224–237

```ts
// Current
"14-17": {
  maxSetsPerExercise: 5,  // ← Should be 4
  ...
},
"18+": {
  maxSetsPerExercise: 6,  // ← Should be 4
  ...
},
```

**Fix:** Lower both to `4`.

---

### Issue 6 — Age Safety Constraints Have No Cap for Adults (`intensityScaling.ts`)

**Location:** `convex/intensityScaling.ts`, `AGE_SAFETY_CONSTRAINTS`, lines 422–426

```ts
// Current
"14-17": { maxSets: null, ... },  // ← No cap
"18+": { maxSets: null, ... },    // ← No cap
```

**Fix:** Set `maxSets: 4` for both `14-17` and `18+`.

---

### Issue 7 — Hardcoded Seed Templates Exceed Cap (`seed.ts`)

**Location:** `convex/seed.ts`, lines 284, 311–312

```ts
// Current — Advanced Lower Body
{ slug: "back_squat", sets: 5, reps: "5-6", ... },      // ← 5 sets

// Current — Advanced Upper Body
{ slug: "db_bench_press", sets: 5, reps: "5-6", ... },  // ← 5 sets
{ slug: "pull_up", sets: 5, reps: "5-8", ... },         // ← 5 sets
```

**Fix:** Lower all three from `sets: 5` → `sets: 4`.

---

## What Does NOT Need to Change

### SSP Low-Rep Heavy Loading

The SSP (Specific Strength Phase / Peaking) prescribes low reps at high intensity — for example:

```ts
// Category 4 SSP
reps: { strength: { min: 3, max: 5 } }   // 3–5 reps @ 85–90% 1RM
```

A prescription of **4 sets × 3–5 reps at 87% 1RM** is not high volume — it is appropriate peaking-phase loading for strength sport athletes (wrestling, football, weightlifting). The volume cap refers to hypertrophy-style prescription (sets × reps as a total volume metric), not intensity. These do not need to change.

### Category 4 GPP / SPP Sets

Category 4 (Strength sports) in GPP already has `sets: { min: 3, max: 5 }` in GPP and `{ min: 4, max: 5 }` in SPP. The max values only need trimming to 4 (SPP already acceptable).

---

## Summary of All Required Code Changes

| File | Location | Change |
|---|---|---|
| `convex/generateTemplates.ts` | `SKILL_CONFIG.Advanced.baseSets` | `5` → `4` |
| `convex/generateTemplates.ts` | `PHASE_CONFIG.GPP.repsModifier` | `1.2` → `1.0` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[1].GPP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[1].GPP.reps.strength.max` | `14` → `12` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[1].SPP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[1].SSP.sets.max` | `5` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[2].GPP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[2].GPP.reps.strength.max` | `14` → `12` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[2].SPP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[2].SSP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[3].GPP.reps.strength.max` | `14` → `12` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[3].SPP.sets.max` | `5` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[3].SSP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[4].SPP.sets.max` | `5` → `4` |
| `convex/intensityScaling.ts` | `CATEGORY_PHASE_CONFIG[4].SSP.sets.max` | `6` → `4` |
| `convex/intensityScaling.ts` | `AGE_INTENSITY_RULES["14-17"].maxSetsPerExercise` | `5` → `4` |
| `convex/intensityScaling.ts` | `AGE_INTENSITY_RULES["18+"].maxSetsPerExercise` | `6` → `4` |
| `convex/intensityScaling.ts` | `AGE_SAFETY_CONSTRAINTS["14-17"].maxSets` | `null` → `4` |
| `convex/intensityScaling.ts` | `AGE_SAFETY_CONSTRAINTS["18+"].maxSets` | `null` → `4` |
| `convex/seed.ts` | `back_squat` Advanced template | `sets: 5` → `sets: 4` |
| `convex/seed.ts` | `db_bench_press` Advanced template | `sets: 5` → `sets: 4` |
| `convex/seed.ts` | `pull_up` Advanced template | `sets: 5` → `sets: 4` |

**Total: 21 targeted value changes across 3 files. No structural refactoring required.**

---

## Effect on Volume After Changes

| Athlete | Phase | Exercise | Before | After |
|---|---|---|---|---|
| Advanced (any sport) | GPP | Back Squat (Week 3) | 5 × 12–14 | 4 × 10–12 |
| Advanced (any sport) | SSP | Trap Bar Deadlift | 5 × 6–8 | 4 × 6–8 |
| Moderate (any sport) | GPP | Bench Press | 4 × 10–12 | 4 × 10–12 *(unchanged)* |
| Adult 18+, 6+ yrs exp | GPP | Any compound | up to 6 sets | capped at 4 sets |
| Teen 14–17, 2–5 yrs exp | GPP | Any compound | up to 5 sets | capped at 4 sets |

---

## Testing & Verification

After implementing the code changes:

1. **Run existing tests** to confirm nothing breaks:
   ```bash
   npm test
   ```

2. **Manually verify generated templates** — trigger `generateTemplates` for an Advanced athlete in Week 3 / GPP and confirm compound lifts show ≤ 4 sets and ≤ 12 reps.

3. **Check seed data** — re-seed the database and spot-check that the Advanced lower/upper templates match the new values.

4. **Check the category intensity matrix** — for a Category 1 GPP athlete at 18+/6+ experience, verify the resolved sets value ≤ 4.

5. **Review existing test file** `convex/__tests__/categoryIntensity.test.ts` for any assertions that hardcode set counts > 4 and update accordingly.

---

## Open Questions for Review

1. **Category 4 (Strength sports) exception?** Football linemen and weightlifters sometimes legitimately train in 5+ set ranges. Do we want to allow a Category 4 exception, or enforce the same 4-set cap universally for this app's audience (youth/collegiate athletes)?

2. **SSP Phase entirely exempt?** Should SSP (peaking phase) be exempt from the rep cap since 4 × 3–5 reps at 90% 1RM is a fundamentally different type of training (strength, not hypertrophy)? Current proposal treats SSP as exempt from the rep ceiling but still caps sets at 4.

3. **Re-running seed after changes?** The `seed.ts` changes only affect newly seeded data. Existing database records for programs generated before this change will retain old values. Do we need a migration script?
