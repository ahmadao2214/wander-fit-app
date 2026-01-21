# Category-Specific Intensity Plan

## Overview

This document outlines the plan to replace the current user-selectable intensity system (Low/Moderate/High) with an **automatic category-specific parameter system** that calculates workout intensity based on:

- **Sport Category** (1-4: Endurance, Power, Rotational, Strength)
- **Training Phase** (GPP, SPP, SSP)
- **Age Group** (10-13, 14-17, 18+)
- **Years of Experience** (0-1, 2-5, 6+)
- **Exercise Type** (strength, power, bodyweight)

---

## Key Changes

### What's Being Removed
- User-selectable intensity buttons (Low/Moderate/High) on workout detail screen
- `targetIntensity` parameter when starting workouts

### What's Being Added
- Automatic intensity calculation based on athlete profile
- Category-specific parameter matrices
- Age + Experience scaling matrix
- Age group safety constraints

---

## Configuration Matrices

### Category-Phase Parameters

Each sport category has specific parameters for each training phase:

| Cat | Phase | 1RM% (Strength) | 1RM% (Power) | Reps (Strength) | Reps (Power) | Sets | Rest (Strength) | Rest (Power) | Tempo | RPE |
|-----|-------|-----------------|--------------|-----------------|--------------|------|-----------------|--------------|-------|-----|
| **1 (Endurance)** | GPP | 50-65% | 30% | 10-14 | 6-8 | 4-6 | 30s | 60s | 2.1.2 | 6-7 |
| **1** | SPP | 65-75% | 40% | 6-8 | 4-6 | 4-6 | 60s | 60s | 2.0.2 | 7-8 |
| **1** | SSP | 75-80% | 55% | 4-6 | 4-6 | 3-5 | 60s | 60s | x.x.x | 8-9 |
| **2 (Power)** | GPP | 55-65% | 35% | 10-14 | 6-8 | 4-6 | 30s | 60s | 1.1.1 | 6-7 |
| **2** | SPP | 65-80% | 45% | 8-12 | 4-6 | 4-6 | 60s | 60s | 2.0.2 | 7-8 |
| **2** | SSP | 80-90% | 50-60% | 4-6 | 3-6 | 4-6 | 120s | 120s | x.x.x | 9 |
| **3 (Rotational)** | GPP | 50-60% | 30% | 10-14 | 8-10 | 2-4 | 40s | 60s | 2.0.2 | 6-7 |
| **3** | SPP | 60-70% | 35-40% | 8-12 | 6-8 | 3-5 | 90s | 60s | 2.0.2 | 7-8 |
| **3** | SSP | 70-85% | 50% | 4-6 | 3-6 | 4-6 | 120s | 120s | x.x.x | 8-9 |
| **4 (Strength)** | GPP | 60-70% | 35-40% | 10-12 | 6-8 | 3-5 | 30s | 60s | 2.1.2 | 7 |
| **4** | SPP | 70-85% | 45-50% | 8-12 | 4-6 | 4-5 | 90s | 60s | 2.0.2 | 7-9 |
| **4** | SSP | 85-90% | 55% | 3-5 | 3-6 | 4-6 | 120s | 120s | x.x.x | 8-9 |

### Key Observations

- **Power exercises** use sub-maximal loads (30-60% 1RM) for explosiveness
- **Rest periods** vary by category and phase
- **Tempo** format: eccentric.isometric.concentric (x = explosive/as fast as possible)
- **SSP** generally has longer rest (60-120s) to allow for quality explosive reps

### Sport Categories Reference

| Category | Focus | Sports |
|----------|-------|--------|
| 1 | Endurance/Continuous | Soccer, Hockey, Lacrosse |
| 2 | Explosive/Vertical Power | Basketball, Volleyball |
| 3 | Rotational/Unilateral | Baseball, Tennis, Golf |
| 4 | General Strength | Wrestling, Football |

---

## Age + Experience Matrix

This matrix determines where within the parameter ranges an athlete falls based on their age group and years of training experience.

| Age Group | Experience | Sets Position | Reps Position |
|-----------|------------|---------------|---------------|
| **10-13** | 0-1 yrs | lowest | lowest |
| **10-13** | 2-5 yrs | lowest + 1 | lowest + 2 |
| **10-13** | 6+ yrs | second lowest | max - 1 |
| **14-17** | 0-1 yrs | middle | middle |
| **14-17** | 2-5 yrs | max | max - 1 |
| **14-17** | 6+ yrs | max | max |
| **18+** | 0-1 yrs | max | max - 2 |
| **18+** | 2-5 yrs | max | max - 1 |
| **18+** | 6+ yrs | max | max |

### How It Works

For a given parameter range (e.g., sets 4-6):
- "lowest" = 4
- "middle" = 5
- "max" = 6
- "max - 1" = 5
- "max - 2" = 4

**Example**: A Category 2 (Power) athlete, 18+ years old, 0-1 years experience, in GPP:
- Sets range: 4-6 → Position "max" = **6 sets**
- Strength reps range: 10-14 → Position "max - 2" = **12 reps**
- Power reps range: 6-8 → Position "max - 2" = **6 reps**

---

## Age Group Safety Constraints

### 1RM Percentage Ceilings

Safety caps applied as: `effectiveMax = min(categoryPhaseMax, ageGroupCeiling)`

| Age Group | Max 1RM% |
|-----------|----------|
| 10-13 | 65% |
| 14-17 | 85% |
| 18+ | 90% |

**Example**: A 12-year-old Category 2 athlete in SSP:
- Category prescription: 80-90% 1RM
- Age ceiling: 65%
- **Effective range: 50-65%** (capped for safety)

### Max Sets Cap

| Age Group | Max Sets |
|-----------|----------|
| 10-13 | 3 sets (hard cap) |
| 14-17 | Use category range |
| 18+ | Use category range |

---

## Exercise Type Detection

Exercises are automatically classified into three types:

### Strength Exercises
- Default for weighted exercises
- Has equipment but no power/explosive tags
- Examples: back_squat, bench_press, deadlift

### Power/Explosive Exercises
- Detected by tags: `"power"`, `"explosive"`, `"plyometric"`, `"reactive"`
- Examples: box_jump, med_ball_slam, jump_squat, kettlebell_swing

### Bodyweight Exercises
- No equipment OR only `"bodyweight"` in equipment array
- Examples: push_up, plank, pull_up (without added weight)

---

## Bodyweight Exercise Handling

### Decision: Hybrid Phase + Experience Approach

Bodyweight exercises use progression variants based on BOTH phase AND experience level:

| Phase | 0-1 yrs | 2-5 yrs | 6+ yrs |
|-------|---------|---------|--------|
| GPP | Easier | Base | Base |
| SPP | Base | Base | Base |
| SSP | Base | Base | Harder |

**Rationale:**
- Novices (0-1 yrs) never get thrown into explosive variants
- Only experienced athletes (6+ yrs) in SSP get explosive/harder variants
- GPP always prioritizes movement quality and foundation
- This follows the stability → strength → power progression philosophy

**Example - Push-up progression chain:**
- Easier: Incline push-up
- Base: Standard push-up
- Harder: Plyo push-up

**Scenario**: 16-year-old soccer player doing push-ups:
- GPP, 1 year exp → Incline push-up (easier)
- GPP, 3 years exp → Standard push-up (base)
- SSP, 6+ years exp → Plyo push-up (harder)

---

## Decisions Made

### 1. Bodyweight Progression Variants
**Decision**: Hybrid Phase + Experience approach

Only 6+ years experience athletes in SSP get harder/explosive variants. Novices in GPP get easier variants. All other combinations use the base exercise.

### 2. Age Group 1RM Ceilings
**Decision**: Keep as safety cap

Take the LOWER of category-specific 1RM% and age group ceiling:
- 10-13: Max 65%
- 14-17: Max 85%
- 18+: Max 90%

### 3. Age Group Max Sets Cap
**Decision**: Hybrid - Keep for 10-13 only

- 10-13: Hard cap at 3 sets per exercise
- 14-17 and 18+: Trust the category ranges and age-experience matrix

---

## Implementation Summary

### Files to Modify

| File | Changes |
|------|---------|
| `convex/intensityScaling.ts` | Add category-phase config matrix, age-experience matrix, safety constraints, helper functions |
| `convex/programTemplates.ts` | Add new `getWorkoutWithScaling` query |
| `convex/schema.ts` | Add `scalingSnapshot` to workout sessions |
| `convex/gppWorkoutSessions.ts` | Update session mutations |
| `app/(athlete)/workout/[id].tsx` | Remove intensity selector UI |

### Migration Strategy

1. Add new code alongside existing (non-breaking)
2. Update schema with new fields
3. Update mutations to use new system
4. Update UI to remove intensity selector
5. Cleanup deprecated code

---

## Status

✅ **Plan Approved** - All open questions resolved, ready for implementation.
