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

---

## Configuration Matrices

### Category-Phase Parameters

Each sport category has specific parameters for each training phase:

| Cat | Phase | 1RM% (Strength) | 1RM% (Power) | Reps (Strength) | Reps (Power) | Sets | Rest (Strength) | Rest (Power) | Tempo | RPE |
|-----|-------|-----------------|--------------|-----------------|--------------|------|-----------------|--------------|-------|-----|
| **1 (Endurance)** | GPP | 50-65% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/1/2 | 6-7 |
| **1** | SPP | 65-75% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/0/2 | 7-8 |
| **1** | SSP | 75-80% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | x/x/x | 8-9 |
| **2 (Power)** | GPP | 55-65% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 1/1/1 | 6-7 |
| **2** | SPP | 65-80% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/0/2 | 7-8 |
| **2** | SSP | 80-90% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | x/x/x | 9 |
| **3 (Rotational)** | GPP | 50-60% | 50-60% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/0/2 | 6-7 |
| **3** | SPP | 60-70% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/0/2 | 7-8 |
| **3** | SSP | 70-85% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | x/x/x | 8-9 |
| **4 (Strength)** | GPP | 60-70% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/1/2 | 7 |
| **4** | SPP | 70-85% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | 2/0/2 | 7-9 |
| **4** | SSP | 85-90% | 50-65% | 2-5 | 3-6 | 3-5 | 90s | 60s | x/x/x | 8-9 |

### Key Constants

- **Strength exercises**: 2-5 reps, 90s rest, 3-5 sets
- **Power exercises**: 3-6 reps, 60s rest, sub-maximal 50-65% 1RM for explosiveness

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
| **10-13** | 0-1 yrs | lowest (3) | lowest (2) |
| **10-13** | 2-5 yrs | lowest + 1 (4) | lowest + 2 (4) |
| **10-13** | 6+ yrs | second lowest (4) | max - 1 (4) |
| **14-17** | 0-1 yrs | middle (4) | middle (3-4) |
| **14-17** | 2-5 yrs | max (5) | max - 1 (4) |
| **14-17** | 6+ yrs | max (5) | max (5) |
| **18+** | 0-1 yrs | max (5) | max - 2 (3) |
| **18+** | 2-5 yrs | max (5) | max - 1 (4) |
| **18+** | 6+ yrs | max (5) | max (5) |

### How It Works

For a given parameter range (e.g., sets 3-5):
- "lowest" = 3
- "middle" = 4
- "max" = 5
- "max - 1" = 4
- "max - 2" = 3

**Example**: An 18+ year old with 0-1 years experience would get:
- Sets: max (5)
- Reps: max - 2 (3 reps for strength exercises)

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

## Open Questions (Need Input)

### 1. Bodyweight Progression Variants

Currently bodyweight exercises use progression variants (easier/harder versions). With auto-calculated intensity, should we use:

- **A) Phase-based**: GPP uses easier/base, SPP uses base, SSP uses harder (follows stability→strength→power progression)
- **B) Experience-based**: 0-1 years uses easier, 2-5 uses base, 6+ uses harder
- **C) Always use base exercise** and let rep scaling handle difficulty

### 2. Age Group 1RM Ceilings

The current system caps 1RM% based on age:
- 10-13: Max 65% 1RM
- 14-17: Max 85% 1RM
- 18+: Max 90% 1RM

Some category-specific ranges exceed these (e.g., Category 2 SSP: 80-90% 1RM).

**Question**: Should age ceiling still apply as a safety cap?

**Example**: A 12-year-old Category 2 athlete in SSP:
- With age cap: Would use 50-65% 1RM (capped at 65%)
- Without age cap: Would use 80-90% 1RM

### 3. Age Group Max Sets Cap

Current system caps sets for younger athletes:
- 10-13: Max 3 sets per exercise
- 14-17: Max 5 sets per exercise
- 18+: Max 6 sets per exercise

**Question**: Should this cap still apply with the new 3-5 sets range?

---

## Implementation Summary

### Files to Modify

| File | Changes |
|------|---------|
| `convex/intensityScaling.ts` | Add category-phase config matrix, age-experience matrix, helper functions |
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

## Feedback

Please review the above configuration matrices and open questions. Leave comments or suggestions directly on this PR.
