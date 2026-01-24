# Category-Specific Exercise Expansion Plan

## The Vision

**Every athlete, regardless of sport, gets a personalized, high-quality training experience.**

When a soccer player, basketball player, or golfer signs up, they should receive workouts that are:
- Automatically tailored to their sport's demands
- Scaled appropriately for their age and experience
- Progressive from easier to harder variants as they advance
- Complete with no missing exercises or broken progressions

---

## The Architecture

### How Sports Map to Training

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         27 SPORTS                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Soccer, Field Hockey, Lacrosse, Rugby, Ultimate Frisbee,               │
│  Cross Country, Track (Distance), Basketball, Volleyball,               │
│  Track (Sprints/Jumps), Gymnastics, Cheerleading, Diving,               │
│  Baseball, Softball, Tennis, Golf, Badminton, Racquetball,              │
│  Cricket, Football, Wrestling, Ice Hockey, Swimming,                     │
│  Martial Arts, Weightlifting, General Fitness                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       4 GPP CATEGORIES                                  │
├─────────────┬─────────────┬─────────────┬─────────────────────────────────┤
│ Category 1  │ Category 2  │ Category 3  │ Category 4                    │
│ ENDURANCE   │ POWER       │ ROTATIONAL  │ STRENGTH                      │
├─────────────┼─────────────┼─────────────┼─────────────────────────────────┤
│ Soccer      │ Basketball  │ Baseball    │ Football                      │
│ Field Hockey│ Volleyball  │ Softball    │ Wrestling                     │
│ Lacrosse    │ Track(Sprint)│ Tennis     │ Ice Hockey                    │
│ Rugby       │ Gymnastics  │ Golf        │ Swimming                      │
│ Ultimate    │ Cheerleading│ Badminton   │ Martial Arts                  │
│ Cross Country│ Diving     │ Racquetball │ Weightlifting                 │
│ Track(Dist) │             │ Cricket     │ General Fitness               │
├─────────────┼─────────────┼─────────────┼─────────────────────────────────┤
│ 7 sports    │ 6 sports    │ 7 sports    │ 7 sports                      │
└─────────────┴─────────────┴─────────────┴─────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    CATEGORY-SPECIFIC PARAMETERS                         │
├─────────────────────────────────────────────────────────────────────────┤
│  Each category has unique:                                              │
│  • 1RM percentages (strength vs power exercises)                        │
│  • Rep ranges and set counts                                            │
│  • Rest periods                                                         │
│  • Tempo prescriptions                                                  │
│  • RPE targets                                                          │
│  • Exercise selection emphasis                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    PERSONALIZATION FACTORS                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Further customized by:                                                 │
│  • Training Phase: GPP → SPP → SSP                                      │
│  • Age Group: 10-13, 14-17, 18+                                         │
│  • Years of Experience: 0-1, 2-5, 6+                                    │
│  • Exercise Progressions: Easier → Base → Harder                        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## What's Already Built

### Category-Specific Intensity System (Complete)

The automatic intensity calculation system is **fully implemented and active**:

| Component | Status | Location |
|-----------|--------|----------|
| CATEGORY_PHASE_CONFIG | ✅ Complete | `convex/intensityScaling.ts` |
| AGE_EXPERIENCE_MATRIX | ✅ Complete | `convex/intensityScaling.ts` |
| AGE_SAFETY_CONSTRAINTS | ✅ Complete | `convex/intensityScaling.ts` |
| BODYWEIGHT_VARIANT_MATRIX | ✅ Complete | `convex/intensityScaling.ts` |
| `getWorkoutWithScaling()` | ✅ Active | `convex/programTemplates.ts` |
| Manual intensity selector | ✅ Removed | `app/(athlete)/workout/[id].tsx` |

### How It Works Now

```typescript
// When an athlete views a workout, this happens automatically:

1. Fetch athlete's sport → Get category (1-4)
2. Fetch current phase → GPP, SPP, or SSP
3. Fetch age group → 10-13, 14-17, or 18+
4. Fetch years of experience → 0-1, 2-5, or 6+

5. For each exercise:
   - Detect type: strength, power, or bodyweight
   - Look up category-phase parameters
   - Apply age-experience modifiers
   - Apply safety constraints
   - For bodyweight: select variant (easier/base/harder)

6. Return personalized workout with:
   - Calculated sets, reps, rest
   - Target weight (if 1RM known)
   - RPE guidance
   - Tempo prescription
   - Substituted exercises (if applicable)
```

---

## What's Missing: The Exercise Library

### The Problem

The system can calculate parameters and select variants, but **many exercises don't have progression chains defined**:

```typescript
// Current state - many exercises look like this:
{
  name: "Side Plank",
  slug: "side_plank",
  tags: ["core", "anti_lateral_flexion", "stability", "isometric"],
  equipment: ["bodyweight"],
  difficulty: "beginner",
  progressions: undefined  // ❌ No easier or harder variant!
}

// When the system tries to select a variant:
getBodyweightVariant("side_plank", "GPP", "0-1", undefined)
// → Returns "side_plank" (no substitution possible)
// → Novice athlete gets the same exercise as advanced
```

### The Solution

Add complete progression chains for all movement patterns:

```typescript
// After our changes:
{
  name: "Side Plank",
  slug: "side_plank",
  progressions: {
    easier: "knee_side_plank",    // ✅ For GPP novices
    harder: "side_plank_hip_dip"  // ✅ For SSP experienced
  }
}

// Now the system can properly substitute:
getBodyweightVariant("side_plank", "GPP", "0-1", progressions)
// → Returns "knee_side_plank" ✅
```

---

## The Exercise Expansion

### Current State vs Target State

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Total Exercises | 67 | 128 | +61 |
| With Progressions | ~20 | 100+ | +80 |
| Movement Patterns | 10 | 11 | +1 (Carry) |
| Carry Exercises | 0 | 10 | +10 |

### New Exercises by Movement Pattern

#### 1. Upper Body Push - Vertical (+5)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Wall Push-Up | `wall_push_up` | Easiest vertical push |
| Handstand Push-Up (Wall) | `wall_handstand_push_up` | Advanced bodyweight |
| Half-Kneeling Press | `half_kneeling_press` | Unilateral stability |
| Landmine Press | `landmine_press` | Angled pressing |
| Push Press | `push_press` | Power vertical push |

#### 2. Upper Body Push - Horizontal (+5)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Close-Grip Bench Press | `close_grip_bench_press` | Triceps emphasis |
| Incline Barbell Press | `incline_bench_press` | Weighted incline |
| **Single Arm DB Floor Press** | `sa_db_floor_press` | Unilateral (Greg's feedback) |
| **Single Arm DB Bench Press** | `sa_db_bench_press` | Unilateral (Greg's feedback) |
| **Single Arm Rotational Press** | `sa_rotational_bench_press` | Rotational power (Greg's feedback) |

#### 3. Upper Body Pull - Vertical (+4)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Straight Arm Pulldown | `straight_arm_pulldown` | Lat isolation |
| Close-Grip Lat Pulldown | `close_grip_lat_pulldown` | Grip variation |
| Scapular Pull-Up | `scapular_pull_up` | Foundation movement |
| Negative Pull-Up | `negative_pull_up` | Eccentric strength |

#### 4. Upper Body Pull - Horizontal (+7)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Chest-Supported Row | `chest_supported_row` | Stable rowing |
| Kroc Row | `kroc_row` | High-rep power |
| Elevated Inverted Row | `elevated_inverted_row` | Easier bodyweight |
| Feet-Elevated Inverted Row | `feet_elevated_inverted_row` | Harder bodyweight |
| Seated Cable Row | `cable_row` | Cable pulling |
| Single Arm Cable Row | `single_arm_cable_row` | Unilateral + anti-rotation |
| Band Row | `band_row` | Equipment-free option |

#### 5. Lower Body Push - Squat (+1)
| Exercise | Slug | Purpose |
|----------|------|---------|
| **Assisted Pistol Squat** | `assisted_pistol_squat` | Advanced unilateral (Greg's feedback) |

#### 6. Lower Body Pull/Hinge (+5)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Conventional Deadlift | `conventional_deadlift` | Bilateral hinge |
| Kickstand RDL | `kickstand_rdl` | Unilateral intro |
| Single Leg Deadlift | `single_leg_deadlift` | Advanced unilateral |
| Single Leg Glute Bridge | `single_leg_glute_bridge` | Bodyweight progression |
| Single Leg Hip Thrust | `single_leg_hip_thrust` | Advanced glute |
| Nordic Curl | `nordic_curl` | Hamstring eccentric |

#### 7. Rotation (+4)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Kneeling Med Ball Rotation | `kneeling_med_ball_rotation` | Easier rotation |
| Rotational Med Ball Slam | `rotational_med_ball_slam` | Power rotation |
| Low-to-High Woodchop | `low_high_woodchop` | Cable variation |
| Standing Rotation Reach | `standing_rotation_reach` | Bodyweight mobility |

#### 8. Core/Anti-Rotation (+6)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Knee Side Plank | `knee_side_plank` | Easier anti-lateral |
| Side Plank Hip Dip | `side_plank_hip_dip` | Dynamic anti-lateral |
| Pallof Press March | `pallof_press_march` | Dynamic anti-rotation |
| Bird Dog with Band | `bird_dog_band` | Resisted stability |
| Lying Leg Raise | `lying_leg_raise` | Bodyweight core |
| Toes to Bar | `toes_to_bar` | Advanced core |

#### 9. Lunge (+7)
| Exercise | Slug | Purpose |
|----------|------|---------|
| Deficit Reverse Lunge | `deficit_reverse_lunge` | Increased ROM |
| Lateral Step-Up | `lateral_step_up` | Frontal plane intro |
| Cossack Squat | `cossack_squat` | Deep frontal mobility |
| Split Squat Jump | `split_squat_jump` | Explosive lunge |
| Alternating Lunge Jump | `alternating_lunge_jump` | Reactive power |
| Low Box Step-Up | `low_box_step_up` | Foundation step |
| Step-Up | `step_up` | Standard step pattern |

#### 10. Jump/Plyometrics (+7)
| Exercise | Slug | Purpose |
|----------|------|---------|
| **Pogo Hops** | `pogo_hops` | Reactive foundation (Greg's feedback) |
| Consecutive Broad Jumps | `consecutive_broad_jumps` | Reactive horizontal |
| **Ascending Skater Jumps** | `ascending_skater_jumps` | Lateral intro (Greg's feedback) |
| **Deceleration Skater Jump** | `deceleration_skater_jump` | Landing mechanics (Greg's feedback) |
| **Lateral Single Leg Bounds** | `lateral_single_leg_bounds` | Power lateral (Greg's feedback) |
| Drop Jump | `drop_jump` | Reactive training |
| Standing Long Jump | `standing_long_jump` | Basic horizontal |

#### 11. Carry (+10) - NEW MOVEMENT PATTERN
| Exercise | Slug | Purpose |
|----------|------|---------|
| Goblet Carry | `goblet_carry` | Foundation carry |
| Farmer's Carry | `farmers_carry` | Bilateral loaded walk |
| Trap Bar Carry | `trap_bar_carry` | Heavy bilateral |
| Suitcase Carry | `suitcase_carry` | Unilateral anti-lateral |
| Single Arm Overhead Carry | `single_arm_overhead_carry` | Shoulder stability |
| Waiter Carry | `waiter_carry` | Balance + stability |
| Double Overhead Carry | `double_overhead_carry` | Bilateral overhead |
| Overhead Plate Carry | `overhead_plate_carry` | Core + shoulder |
| Front Rack Carry | `front_rack_carry` | Anti-extension |
| Zercher Carry | `zercher_carry` | Full-body challenge |

---

## Progression Chains to Fix

### Existing Exercises Needing Links

| Exercise | Needs Easier | Needs Harder |
|----------|--------------|--------------|
| `side_plank` | `knee_side_plank` | `side_plank_hip_dip` |
| `dead_bug` | - | `pallof_press` |
| `pallof_press` | `dead_bug` | `pallof_press_march` |
| `bird_dog` | - | `bird_dog_band` |
| `glute_bridge` | - | `hip_thrust` |
| `hip_thrust` | `glute_bridge` | `single_leg_hip_thrust` |
| `broad_jump` | `pogo_hops` | `consecutive_broad_jumps` |
| `hanging_leg_raise` | `lying_leg_raise` | `toes_to_bar` |
| `box_jump` | `jump_squat` | `depth_jump` |
| `depth_jump` | `box_jump` | - |
| `goblet_squat` | - | `back_squat` |
| `back_squat` | `goblet_squat` | `front_squat` |
| `pike_pushup` | - | `db_shoulder_press` |
| `db_shoulder_press` | `pike_pushup` | `overhead_press` |
| `romanian_deadlift` | - | `trap_bar_deadlift` |
| `single_leg_rdl` | `kickstand_rdl` | `single_leg_deadlift` |
| `single_leg_squat_box` | - | `bulgarian_split_squat` |
| `bulgarian_split_squat` | `single_leg_squat_box` | `assisted_pistol_squat` |
| `cable_woodchop` | `band_woodchop` | `low_high_woodchop` |
| `lateral_lunge` | `lateral_step_up` | `cossack_squat` |

---

## New Tags Required

Add to `TAGS_GLOSSARY`:

```typescript
// Movement Pattern
movementPattern: [
  ...existing,
  "carry",  // NEW: Loaded locomotion
]

// Training Quality
trainingQuality: [
  ...existing,
  "deceleration_mechanics",  // NEW: Landing/braking emphasis
  "eccentric",               // NEW: Lowering phase focus
  "grip_endurance",          // NEW: Grip strength emphasis
]
```

---

## TDD Implementation Approach

### Phase 1: Write Failing Tests (Red)

Create test files that define expected behavior **before** adding exercises:

```
convex/__tests__/
├── exerciseProgressions.test.ts    # ~40 tests
├── newExercises.test.ts            # ~35 tests
├── progressionCompleteness.test.ts # ~150 tests
├── bodyweightVariantIntegration.test.ts # ~20 tests
└── categoryPoolCoverage.test.ts    # ~30 tests
```

**Total new tests: ~275**

### Phase 2: Implement (Green)

Add exercises and progressions to make tests pass:

1. **Add new tags** to `TAGS_GLOSSARY`
2. **Add high-priority exercises** (core, jump, hinge progressions)
3. **Add carry exercises** (all 10)
4. **Add unilateral press** (Greg's feedback)
5. **Update existing progressions** (link existing exercises)
6. **Add remaining exercises** by movement pattern

### Phase 3: Verify Integration (Refactor)

1. Run full test suite (~525 tests total)
2. Test `getBodyweightVariant()` with all new progressions
3. Verify template generation works
4. Test workout flow end-to-end

---

## Success Criteria

### Data Completeness
- [ ] All 128 exercises exist in `seedData.ts`
- [ ] All 61 new exercises have required fields (name, slug, tags, equipment, difficulty)
- [ ] All bodyweight exercises have progression chains
- [ ] All progression references point to valid exercises
- [ ] All progressions are bidirectional (A→B means B←A)

### System Integration
- [ ] `getBodyweightVariant()` correctly substitutes for all exercises
- [ ] `getWorkoutWithScaling()` returns valid workouts for all categories
- [ ] No broken exercise references in templates
- [ ] All 27 sports produce valid workouts

### Test Coverage
- [ ] All 250+ existing tests pass
- [ ] All 275+ new tests pass
- [ ] No regressions in category-specific intensity

---

## Category-Specific Exercise Emphasis

### Category 1: Endurance (Soccer, Lacrosse, etc.)
**Focus:** Single-leg stability, conditioning, rotational core

| Movement | Emphasis |
|----------|----------|
| Lower | Unilateral squats, single-leg RDL |
| Upper | Moderate volume, shoulder health |
| Power | Directional jumps, lateral movement |
| Core | Rotational, anti-rotation |
| Conditioning | High rep, short rest |

### Category 2: Power (Basketball, Volleyball, etc.)
**Focus:** Vertical power, landing mechanics, reactive strength

| Movement | Emphasis |
|----------|----------|
| Lower | Hip thrust, front squat for landing |
| Upper | Explosive push, pull power |
| Power | **Box jumps, depth jumps, plyometrics** |
| Core | Dynamic, hip flexor strength |
| Conditioning | Reactive, explosive |

### Category 3: Rotational (Baseball, Tennis, Golf, etc.)
**Focus:** Anti-rotation, thoracic mobility, unilateral strength

| Movement | Emphasis |
|----------|----------|
| Lower | Lateral lunges, unilateral focus |
| Upper | Unilateral rows and presses |
| Power | **Rotational throws, woodchops** |
| Core | **Pallof press, anti-rotation heavy** |
| Conditioning | Rotational power |

### Category 4: Strength (Football, Wrestling, etc.)
**Focus:** Bilateral strength, work capacity, grip endurance

| Movement | Emphasis |
|----------|----------|
| Lower | Back squat, trap bar deadlift |
| Upper | Bench press, weighted pull-ups |
| Power | Sled work, kettlebell swings |
| Core | Heavy carries, stability |
| Conditioning | **Farmer's carries, work capacity** |

---

## Files to Modify

### Primary Changes
| File | Changes |
|------|---------|
| `convex/seedData.ts` | Add 61 exercises, update progressions, add tags |
| `convex/__tests__/*.ts` | Add 5 new test files |

### Secondary Changes (If Needed)
| File | Changes |
|------|---------|
| `convex/generateTemplates.ts` | Update exercise pools per category |

---

## Timeline Estimate

| Phase | Work | Tests |
|-------|------|-------|
| 1. Write tests | Create 5 test files | 275 failing |
| 2. Add tags | Update TAGS_GLOSSARY | Some passing |
| 3. Add exercises | 61 new exercises | Most passing |
| 4. Fix progressions | Update existing exercises | All passing |
| 5. Verify | End-to-end testing | 525 passing |

---

## Greg's Feedback (Incorporated)

| Feedback | Implementation |
|----------|----------------|
| Add unilateral press category | Added 3 exercises: `sa_db_floor_press` → `sa_db_bench_press` → `sa_rotational_bench_press` |
| Pistol squat too hard | Changed to `assisted_pistol_squat` (TRX/stick) |
| Horizontal jump easier = pogo hops | Changed from standing long jump to `pogo_hops` |
| Lateral jump progression | New: `ascending_skater_jumps` → `deceleration_skater_jump` → `lateral_single_leg_bounds` |

---

## References

- Exercise Progression Matrix: `docs/EXERCISE_PROGRESSION_MATRIX.md`
- TDD Plan: `docs/TDD_PLAN_EXERCISE_EXPANSION.md`
- Category Intensity Plan: `docs/CATEGORY_INTENSITY_PLAN.md`
- Seed Data: `convex/seedData.ts`
- Intensity Scaling: `convex/intensityScaling.ts`
