# Prescription Formula Table

This document summarizes the current implemented prescription logic for review.

It is intended to make the system easy to reason about without reading the code in `convex/intensityScaling.ts`.

## Scope

The formula now distinguishes between several weighted-exercise paths:

| Path | Applies To | Logic Source |
|------|------------|--------------|
| Primary loaded lifts | High-load barbell or trap-bar lifts that match the semantic profile for squat, hinge, push, compound, or bilateral patterns | Dedicated guardrail formula |
| Unilateral accessory lifts | Single-leg or unilateral lower-body work like Bulgarian split squats and single-leg deadlifts | Dedicated accessory formula |
| Anti-rotation drills | Dynamic anti-rotation core movements like Pallof Press March | Dedicated anti-rotation formula |
| Upper-body accessories | Dumbbell and non-primary upper-body push/pull work like dumbbell bench press, incline dumbbell press, inverted rows, weighted pull-ups | Dedicated upper-body accessory formula |
| Core accessories | Non-marching core strength work like hanging leg raises and similar anti-extension patterns | Dedicated core accessory formula |
| Mobility and recovery | Cooldown and mobility drills like hip flexor stretch | Dedicated recovery formula |
| General strength lifts | Remaining weighted strength exercises not matched by the semantic profiles above | Existing category matrix |

Bodyweight and power exercises continue to follow their existing scaling logic.

## Primary Loaded Lift Detection

An exercise is treated as a `primary_loaded_lift` when:

| Requirement | Rule |
|-------------|------|
| Exercise focus | Must resolve to `strength` |
| Equipment | Must include `barbell` or `trap_bar` |
| Tags | Must include at least one of: `compound`, `squat`, `hinge`, `push`, `bilateral` |

Examples that should typically land in this path:

| Exercise Family | Typical Examples |
|-----------------|------------------|
| Squat pattern | Back Squat, Front Squat |
| Hinge pattern | Trap Bar Deadlift |
| Press pattern | Bench Press, Overhead Press |

## Formula Summary

For `primary_loaded_lift` exercises:

1. Determine the athlete's experience bucket:
   - `0-1`
   - `2-5`
   - `6+`
2. Determine whether the sport category is:
   - general sport context: Categories `1-3`
   - max-strength sport context: Category `4`
3. Use phase to determine reps and baseline intensity.
4. Use experience to increase sets before increasing intensity.
5. Clamp intensity to the age group's safety ceiling if needed.

For `unilateral_accessory` exercises:

1. Use a fixed displayed set count of `3`.
2. Keep unilateral work in a practical rep range:
   - `GPP = 8`
   - `SPP = 8`
   - `SSP = 6`
3. Treat the displayed sets as the working sets for each side rather than doubling the count.

For `anti_rotation` exercises:

1. Use `3` sets for `0-1` years and `4` sets for `2-5` / `6+`.
2. Use a step-based prescription of `6 steps`.
3. Keep the tracker box count aligned to the prescribed scaled set count.

For `upper_body_accessory` exercises:

1. Use `3` sets for `0-1` years and `4` sets for `2-5` / `6+`.
2. Use practical hypertrophy-strength rep ranges:
   - `GPP = 8`
   - `SPP = 8`
   - `SSP = 6`
3. Apply this to non-primary upper-body push and pull work so these exercises do not inherit `6 x 13`.

For `core_accessory` exercises:

1. Use a fixed displayed set count of `3`.
2. Use practical core strength reps:
   - `GPP = 8`
   - `SPP = 8`
   - `SSP = 6`

For `mobility_recovery` exercises:

1. Keep recovery work out of the heavy scaling matrix.
2. Use a recovery-style default of `1 x 30s each side`.
3. This prevents cooldown work from ever showing prescriptions like `6 x 13`.

## Reps By Phase

| Phase | Reps |
|-------|------|
| `GPP` | `10` |
| `SPP` | `8` |
| `SSP` | `6` |

## Sets By Experience

| Experience Bucket | Sets |
|-------------------|------|
| `0-1` | `3` |
| `2-5` | `4` |
| `6+` | `4` |

## Intensity By Phase And Sport Context

### General Sport Context

Used for categories `1-3`.

| Phase | % of 1RM |
|-------|----------|
| `GPP` | `65%` |
| `SPP` | `70%` |
| `SSP` | `75%` |

### Max-Strength Sport Context

Used for category `4`.

| Phase | % of 1RM |
|-------|----------|
| `GPP` | `65%` |
| `SPP` | `75%` |
| `SSP` | `80%` |

## Experience Progression Table

### General Sport Context

| Experience | GPP | SPP | SSP |
|------------|-----|-----|-----|
| `0-1` | `3 x 10 @ 65%` | `3 x 8 @ 65%` | `3 x 6 @ 65%` |
| `2-5` | `4 x 10 @ 65%` | `4 x 8 @ 70%` | `4 x 6 @ 75%` |
| `6+` | `4 x 10 @ 65%` | `4 x 8 @ 70%` | `4 x 6 @ 75%` |

### Max-Strength Sport Context

| Experience | GPP | SPP | SSP |
|------------|-----|-----|-----|
| `0-1` | `3 x 10 @ 65%` | `3 x 8 @ 65%` | `3 x 6 @ 65%` |
| `2-5` | `4 x 10 @ 65%` | `4 x 8 @ 75%` | `4 x 6 @ 80%` |
| `6+` | `4 x 10 @ 65%` | `4 x 8 @ 75%` | `4 x 6 @ 80%` |

## Key Guardrails

| Rule | Outcome |
|------|---------|
| Barbell/trap-bar primary lifts should not exceed `4` working sets | Prevents volume inflation like `6` working sets |
| Primary loaded lifts should not exceed `10` reps | Prevents prescriptions like `13` reps on heavy lifts |
| Unilateral lower-body accessories display working sets, not doubled per-side set counts | Keeps `3` boxes aligned with `3` prescribed sets |
| Dynamic anti-rotation work can use step-based reps | Supports prescriptions like `4 x 6 steps` |
| Upper-body accessories now use explicit set/rep rules | Prevents dumbbell press, row, and pull accessory work from rendering `6 x 13` |
| Core accessories now use explicit set/rep rules | Prevents hanging leg raises and similar drills from rendering `6 x 13` |
| Mobility and cooldown work bypass the strength matrix | Prevents stretches from rendering `6 x 13` |
| Experience increases sets before intensity | Early progression favors capacity before heavier loading |
| Max-strength sports get the highest loading | Peak endpoint is `4 x 6 @ 80%` |

## What Still Uses The Existing Matrix

The older category matrix still applies to:

| Exercise Type | Example |
|---------------|---------|
| Dumbbell accessory strength work | Rows, presses, many non-special-cased accessories |
| Weighted non-dynamic accessory work outside the named families | Remaining special cases not yet given their own profile |
| Bodyweight work | Push-ups, planks, pull-up progressions |
| Power/explosive work | Jumps, throws, plyometric variations |

That means the system is now:

| Layer | Purpose |
|-------|---------|
| Guardrail formula | Keep primary loaded lifts practical and explainable |
| Existing matrix | Preserve category nuance for accessory, bodyweight, and power work |

## Review Questions

Use this document to review the formula with the team:

| Question | Why It Matters |
|----------|----------------|
| Should `2-5` and `6+` stay identical for primary loaded lifts? | Right now experience beyond `2-5` does not add more volume |
| Should novice athletes stay at `65%` in all phases, or only until `SPP`? | This is currently the most conservative choice |
| Should any non-barbell implement also qualify as a primary loaded lift? | For example, machines or specialty bars |
| Should `SPP` for max-strength sports stay at `75%`, or be lower for some categories? | This affects fatigue and readiness heading into `SSP` |
| Should all unilateral lower-body accessories stay at `3` sets, or should some advanced variants move to `4`? | This controls per-side workload and screen clarity |
| Should more anti-rotation drills use step-based prescriptions, or only marching variations? | This affects whether the anti-rotation profile remains narrow or becomes a larger family |

## Current Implementation References

- `convex/intensityScaling.ts`
- `convex/programTemplates.ts`
- `convex/gppWorkoutSessions.ts`
- `convex/__tests__/categoryIntensity.test.ts`
