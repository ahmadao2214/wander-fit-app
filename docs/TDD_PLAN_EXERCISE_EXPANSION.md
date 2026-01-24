# TDD Plan: Category-Specific Intensity & Exercise Expansion

This document outlines the test-driven development approach for the exercise library expansion and category-specific intensity system.

---

## Current Test Coverage

### Existing Test Files

| File | Tests | Coverage Area |
|------|-------|---------------|
| `categoryIntensity.test.ts` | 73 tests | Category-phase config, age-experience matrix, safety constraints, bodyweight variants |
| `intensityScaling.test.ts` | 100+ tests | Generic intensity scaling, 1RM calculations, rep parsing, weighted/bodyweight application |
| `seedData.test.ts` | 60+ tests | GPP categories, sports mapping, exercise validation, tag/equipment glossary |

### What's Already Tested

**Category-Specific Intensity System (COMPLETE)**
- CATEGORY_PHASE_CONFIG matrix (all 4 categories × 3 phases)
- AGE_EXPERIENCE_MATRIX (all 3 age groups × 3 experience buckets)
- AGE_SAFETY_CONSTRAINTS (1RM ceilings, max sets caps)
- BODYWEIGHT_VARIANT_MATRIX (phase + experience → variant selection)
- Helper functions: `getExperienceBucket`, `getValueFromPosition`, `getExerciseFocus`
- `getCategoryExerciseParameters()` integration
- `applyAgeSafetyConstraints()` function
- `getBodyweightVariant()` function

**Generic Intensity System (COMPLETE)**
- INTENSITY_CONFIG (Low/Moderate/High multipliers)
- `applyIntensityToWeighted()` and `applyIntensityToBodyweight()`
- Rep string parsing and formatting
- 1RM calculations (Epley formula)
- Target weight calculations

**Seed Data Validation (COMPLETE)**
- All 4 GPP categories exist and have correct properties
- All 27 sports mapped to categories
- All exercises have required fields
- All tags and equipment are valid
- Exercise progressions are tested for existing exercises

---

## New Tests Needed

### 1. Exercise Progression Chain Tests

**File:** `convex/__tests__/exerciseProgressions.test.ts`

```typescript
describe("Exercise Progression Chains", () => {
  describe("Upper Body Push - Vertical", () => {
    it("pike_pushup should progress to db_shoulder_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "pike_pushup");
      expect(exercise?.progressions?.harder).toBe("db_shoulder_press");
    });

    it("db_shoulder_press should progress to overhead_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "db_shoulder_press");
      expect(exercise?.progressions?.easier).toBe("pike_pushup");
      expect(exercise?.progressions?.harder).toBe("overhead_press");
    });
  });

  describe("Upper Body Push - Horizontal (Unilateral)", () => {
    it("sa_db_floor_press should progress to sa_db_bench_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "sa_db_floor_press");
      expect(exercise?.progressions?.harder).toBe("sa_db_bench_press");
    });

    it("sa_db_bench_press should progress to sa_rotational_bench_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "sa_db_bench_press");
      expect(exercise?.progressions?.easier).toBe("sa_db_floor_press");
      expect(exercise?.progressions?.harder).toBe("sa_rotational_bench_press");
    });
  });

  describe("Lower Body Push - Unilateral Squat", () => {
    it("single_leg_squat_box should progress to bulgarian_split_squat", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_leg_squat_box");
      expect(exercise?.progressions?.harder).toBe("bulgarian_split_squat");
    });

    it("bulgarian_split_squat should progress to assisted_pistol_squat", () => {
      const exercise = EXERCISES.find(e => e.slug === "bulgarian_split_squat");
      expect(exercise?.progressions?.harder).toBe("assisted_pistol_squat");
    });
  });

  describe("Lower Body Pull/Hinge", () => {
    it("glute_bridge should progress to hip_thrust", () => {
      const exercise = EXERCISES.find(e => e.slug === "glute_bridge");
      expect(exercise?.progressions?.harder).toBe("hip_thrust");
    });

    it("hip_thrust should progress to single_leg_hip_thrust", () => {
      const exercise = EXERCISES.find(e => e.slug === "hip_thrust");
      expect(exercise?.progressions?.harder).toBe("single_leg_hip_thrust");
    });
  });

  describe("Core - Anti-Lateral Flexion", () => {
    it("side_plank should have easier and harder progressions", () => {
      const exercise = EXERCISES.find(e => e.slug === "side_plank");
      expect(exercise?.progressions?.easier).toBe("knee_side_plank");
      expect(exercise?.progressions?.harder).toBe("side_plank_hip_dip");
    });
  });

  describe("Jump - Horizontal/Forward", () => {
    it("pogo_hops should progress to broad_jump", () => {
      const exercise = EXERCISES.find(e => e.slug === "pogo_hops");
      expect(exercise?.progressions?.harder).toBe("broad_jump");
    });

    it("broad_jump should progress to consecutive_broad_jumps", () => {
      const exercise = EXERCISES.find(e => e.slug === "broad_jump");
      expect(exercise?.progressions?.easier).toBe("pogo_hops");
      expect(exercise?.progressions?.harder).toBe("consecutive_broad_jumps");
    });
  });

  describe("Jump - Lateral (Greg's Feedback)", () => {
    it("ascending_skater_jumps should progress to deceleration_skater_jump", () => {
      const exercise = EXERCISES.find(e => e.slug === "ascending_skater_jumps");
      expect(exercise?.progressions?.harder).toBe("deceleration_skater_jump");
    });

    it("deceleration_skater_jump should progress to lateral_single_leg_bounds", () => {
      const exercise = EXERCISES.find(e => e.slug === "deceleration_skater_jump");
      expect(exercise?.progressions?.easier).toBe("ascending_skater_jumps");
      expect(exercise?.progressions?.harder).toBe("lateral_single_leg_bounds");
    });
  });

  describe("Carry Exercises", () => {
    it("goblet_carry should progress to farmers_carry", () => {
      const exercise = EXERCISES.find(e => e.slug === "goblet_carry");
      expect(exercise?.progressions?.harder).toBe("farmers_carry");
    });

    it("suitcase_carry should progress to single_arm_overhead_carry", () => {
      const exercise = EXERCISES.find(e => e.slug === "suitcase_carry");
      expect(exercise?.progressions?.harder).toBe("single_arm_overhead_carry");
    });
  });
});
```

### 2. New Exercise Existence Tests

**File:** `convex/__tests__/newExercises.test.ts`

```typescript
describe("New Exercises - High Priority", () => {
  const highPriorityExercises = [
    { slug: "single_leg_glute_bridge", pattern: "Hinge" },
    { slug: "lying_leg_raise", pattern: "Core" },
    { slug: "knee_side_plank", pattern: "Core" },
    { slug: "side_plank_hip_dip", pattern: "Core" },
    { slug: "pallof_press_march", pattern: "Core" },
    { slug: "step_up", pattern: "Lunge" },
    { slug: "farmers_carry", pattern: "Carry" },
    { slug: "suitcase_carry", pattern: "Carry" },
    { slug: "pogo_hops", pattern: "Jump" },
    { slug: "ascending_skater_jumps", pattern: "Jump" },
    { slug: "deceleration_skater_jump", pattern: "Jump" },
  ];

  for (const { slug, pattern } of highPriorityExercises) {
    it(`should have ${slug} (${pattern})`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      expect(exercise?.name).toBeTruthy();
      expect(exercise?.tags.length).toBeGreaterThan(0);
    });
  }
});

describe("New Exercises - Unilateral Press (Greg's Feedback)", () => {
  const unilateralPressExercises = [
    "sa_db_floor_press",
    "sa_db_bench_press",
    "sa_rotational_bench_press",
  ];

  for (const slug of unilateralPressExercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("unilateral");
      expect(exercise?.tags).toContain("push");
    });
  }
});

describe("New Exercises - Carry Pattern", () => {
  const carryExercises = [
    "goblet_carry",
    "farmers_carry",
    "trap_bar_carry",
    "suitcase_carry",
    "single_arm_overhead_carry",
    "waiter_carry",
    "double_overhead_carry",
    "overhead_plate_carry",
    "front_rack_carry",
    "zercher_carry",
  ];

  for (const slug of carryExercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("carry");
    });
  }

  it("should have carry tag in glossary", () => {
    expect(ALL_VALID_TAGS).toContain("carry");
  });
});
```

### 3. Progression Chain Completeness Tests

**File:** `convex/__tests__/progressionCompleteness.test.ts`

```typescript
describe("Progression Chain Completeness", () => {
  describe("All bodyweight exercises should have progressions", () => {
    const bodyweightExercises = EXERCISES.filter(e =>
      e.equipment?.length === 0 ||
      (e.equipment?.length === 1 && e.equipment[0] === "bodyweight")
    );

    for (const exercise of bodyweightExercises) {
      // Skip warmup/mobility exercises which don't need progressions
      if (exercise.tags.includes("warmup") || exercise.tags.includes("mobility")) {
        continue;
      }

      it(`${exercise.slug} should have at least one progression`, () => {
        const hasProgression =
          exercise.progressions?.easier ||
          exercise.progressions?.harder;
        expect(hasProgression).toBeTruthy();
      });
    }
  });

  describe("Progression references should be valid", () => {
    const allSlugs = new Set(EXERCISES.map(e => e.slug));

    for (const exercise of EXERCISES) {
      if (exercise.progressions?.easier) {
        it(`${exercise.slug}.progressions.easier should reference valid exercise`, () => {
          expect(allSlugs.has(exercise.progressions!.easier!)).toBe(true);
        });
      }

      if (exercise.progressions?.harder) {
        it(`${exercise.slug}.progressions.harder should reference valid exercise`, () => {
          expect(allSlugs.has(exercise.progressions!.harder!)).toBe(true);
        });
      }
    }
  });

  describe("Progression chains should be bidirectional", () => {
    for (const exercise of EXERCISES) {
      if (exercise.progressions?.harder) {
        const harderSlug = exercise.progressions.harder;
        const harderExercise = EXERCISES.find(e => e.slug === harderSlug);

        it(`${exercise.slug} → ${harderSlug} should have reverse link`, () => {
          expect(harderExercise?.progressions?.easier).toBe(exercise.slug);
        });
      }
    }
  });
});
```

### 4. Bodyweight Variant Integration Tests

**File:** `convex/__tests__/bodyweightVariantIntegration.test.ts`

```typescript
describe("Bodyweight Variant Integration", () => {
  describe("getBodyweightVariant with new exercises", () => {
    it("should select knee_side_plank for GPP novice on side_plank", () => {
      const progressions = { easier: "knee_side_plank", harder: "side_plank_hip_dip" };
      const result = getBodyweightVariant("side_plank", "GPP", "0-1", progressions);
      expect(result.slug).toBe("knee_side_plank");
      expect(result.isSubstituted).toBe(true);
    });

    it("should select side_plank_hip_dip for SSP experienced on side_plank", () => {
      const progressions = { easier: "knee_side_plank", harder: "side_plank_hip_dip" };
      const result = getBodyweightVariant("side_plank", "SSP", "6+", progressions);
      expect(result.slug).toBe("side_plank_hip_dip");
      expect(result.isSubstituted).toBe(true);
    });

    it("should select pogo_hops for GPP novice on broad_jump", () => {
      const progressions = { easier: "pogo_hops", harder: "consecutive_broad_jumps" };
      const result = getBodyweightVariant("broad_jump", "GPP", "0-1", progressions);
      expect(result.slug).toBe("pogo_hops");
      expect(result.isSubstituted).toBe(true);
    });

    it("should select deceleration_skater_jump for SPP on ascending_skater_jumps", () => {
      const progressions = { easier: undefined, harder: "deceleration_skater_jump" };
      // Base exercise in SPP - no substitution
      const result = getBodyweightVariant("ascending_skater_jumps", "SPP", "2-5", progressions);
      expect(result.slug).toBe("ascending_skater_jumps");
      expect(result.isSubstituted).toBe(false);
    });
  });

  describe("Real workout scenarios with new progressions", () => {
    it("12-year-old soccer player in GPP should get easier variants", () => {
      // Simulating the full flow
      const progressions = { easier: "lying_leg_raise", harder: "toes_to_bar" };
      const result = getBodyweightVariant("hanging_leg_raise", "GPP", "0-1", progressions);
      expect(result.slug).toBe("lying_leg_raise");
    });

    it("18+ experienced athlete in SSP should get harder variants", () => {
      const progressions = { easier: "goblet_carry", harder: "trap_bar_carry" };
      const result = getBodyweightVariant("farmers_carry", "SSP", "6+", progressions);
      expect(result.slug).toBe("trap_bar_carry");
    });
  });
});
```

### 5. Category Pool Coverage Tests

**File:** `convex/__tests__/categoryPoolCoverage.test.ts`

```typescript
describe("Category Exercise Pool Coverage", () => {
  // Import exercise pools from generateTemplates.ts

  describe("Each category should have exercises for all movement patterns", () => {
    const requiredPatterns = [
      "squat",
      "hinge",
      "push",
      "pull",
      "core",
      "plyometric",
    ];

    for (const categoryId of [1, 2, 3, 4]) {
      describe(`Category ${categoryId}`, () => {
        for (const pattern of requiredPatterns) {
          it(`should have ${pattern} exercises`, () => {
            // This will need to reference the actual pool
            // For now, verify exercises with this tag exist
            const exercisesWithPattern = EXERCISES.filter(e =>
              e.tags.includes(pattern)
            );
            expect(exercisesWithPattern.length).toBeGreaterThan(0);
          });
        }
      });
    }
  });

  describe("Carry exercises should be available for Category 4", () => {
    it("should have carry exercises for strength-focused category", () => {
      const carryExercises = EXERCISES.filter(e => e.tags.includes("carry"));
      expect(carryExercises.length).toBeGreaterThanOrEqual(5);
    });
  });
});
```

### 6. Tag Validation Tests for New Exercises

**File:** Update `convex/__tests__/seedData.test.ts`

```typescript
describe("New Tag: carry", () => {
  it("should be in TAGS_GLOSSARY.movementPattern", () => {
    expect(TAGS_GLOSSARY.movementPattern).toContain("carry");
  });

  it("should be in ALL_VALID_TAGS", () => {
    expect(ALL_VALID_TAGS).toContain("carry");
  });
});

describe("New Tag: deceleration_mechanics", () => {
  it("should be in TAGS_GLOSSARY.trainingQuality", () => {
    expect(TAGS_GLOSSARY.trainingQuality).toContain("deceleration_mechanics");
  });
});

describe("New Tag: eccentric", () => {
  it("should be in TAGS_GLOSSARY.trainingQuality", () => {
    expect(TAGS_GLOSSARY.trainingQuality).toContain("eccentric");
  });
});

describe("New Tag: grip_endurance", () => {
  it("should be in TAGS_GLOSSARY.trainingQuality", () => {
    expect(TAGS_GLOSSARY.trainingQuality).toContain("grip_endurance");
  });
});
```

---

## Test Execution Strategy

### Phase 1: Write Failing Tests First (TDD Red Phase)

1. Create `convex/__tests__/exerciseProgressions.test.ts`
2. Create `convex/__tests__/newExercises.test.ts`
3. Create `convex/__tests__/progressionCompleteness.test.ts`
4. Update `convex/__tests__/seedData.test.ts` with new tag tests

**Run tests - they should all fail:**
```bash
npm run test
```

### Phase 2: Implement Exercises (TDD Green Phase)

Add exercises to `seedData.ts` in this order:

1. **Add new tags to TAGS_GLOSSARY**
   - `carry` (movementPattern)
   - `deceleration_mechanics` (trainingQuality)
   - `eccentric` (trainingQuality)
   - `grip_endurance` (trainingQuality)

2. **Add High Priority exercises** (run tests after each batch)
   - Core progressions: `knee_side_plank`, `side_plank_hip_dip`, `lying_leg_raise`, `pallof_press_march`
   - Hinge: `single_leg_glute_bridge`
   - Lunge: `step_up`
   - Jump: `pogo_hops`, `ascending_skater_jumps`, `deceleration_skater_jump`, `lateral_single_leg_bounds`

3. **Add Carry exercises**
   - All 10 carry exercises

4. **Add Unilateral Press exercises** (Greg's feedback)
   - `sa_db_floor_press`, `sa_db_bench_press`, `sa_rotational_bench_press`

5. **Update existing exercise progressions**
   - Link existing exercises to new ones

### Phase 3: Verify Integration (TDD Refactor Phase)

1. Run full test suite
2. Verify `getBodyweightVariant()` works with new progressions
3. Test template generation with new exercises
4. Verify no broken references

---

## Test Commands

```bash
# Run all tests
npm run test

# Run specific test file
npm run test -- convex/__tests__/exerciseProgressions.test.ts

# Run tests in watch mode during development
npm run test -- --watch

# Run tests with coverage
npm run test -- --coverage

# Run only new exercise tests
npm run test -- --grep "New Exercises"

# Run only progression tests
npm run test -- --grep "Progression"
```

---

## Success Criteria

### All Tests Must Pass

- [ ] All 73 existing `categoryIntensity.test.ts` tests pass
- [ ] All 100+ existing `intensityScaling.test.ts` tests pass
- [ ] All 60+ existing `seedData.test.ts` tests pass
- [ ] All new `exerciseProgressions.test.ts` tests pass
- [ ] All new `newExercises.test.ts` tests pass
- [ ] All new `progressionCompleteness.test.ts` tests pass

### Data Integrity

- [ ] All 128 exercises exist in seedData.ts
- [ ] All progression chains are bidirectional
- [ ] All progression references point to valid exercises
- [ ] All new tags are in TAGS_GLOSSARY
- [ ] All exercise equipment is in EQUIPMENT_GLOSSARY

### Integration

- [ ] `getBodyweightVariant()` correctly selects variants for all new exercises
- [ ] Template generation works with new exercises
- [ ] No runtime errors in workout flow

---

## Files to Create/Modify

### New Files
- `convex/__tests__/exerciseProgressions.test.ts`
- `convex/__tests__/newExercises.test.ts`
- `convex/__tests__/progressionCompleteness.test.ts`
- `convex/__tests__/bodyweightVariantIntegration.test.ts`
- `convex/__tests__/categoryPoolCoverage.test.ts`

### Modified Files
- `convex/seedData.ts` - Add new exercises and progressions
- `convex/__tests__/seedData.test.ts` - Add new tag tests
- `convex/generateTemplates.ts` - Update exercise pools (if needed)

---

## Estimated Test Count

| Test File | Estimated Tests |
|-----------|-----------------|
| exerciseProgressions.test.ts | ~40 tests |
| newExercises.test.ts | ~35 tests |
| progressionCompleteness.test.ts | ~150 tests (dynamic) |
| bodyweightVariantIntegration.test.ts | ~20 tests |
| categoryPoolCoverage.test.ts | ~30 tests |
| **New Total** | **~275 tests** |
| **Existing Total** | **~250 tests** |
| **Grand Total** | **~525 tests** |
