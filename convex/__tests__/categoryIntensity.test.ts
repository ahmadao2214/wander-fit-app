import { describe, it, expect } from "vitest";
import {
  // Types
  CategoryId,
  ExperienceBucket,
  ExerciseFocus,
  PositionType,
  ParameterRange,
  // Constants
  CATEGORY_PHASE_CONFIG,
  AGE_EXPERIENCE_MATRIX,
  AGE_SAFETY_CONSTRAINTS,
  BODYWEIGHT_VARIANT_MATRIX,
  // Functions
  getExperienceBucket,
  getValueFromPosition,
  getExerciseFocus,
  getCategoryExerciseParameters,
  applyAgeSafetyConstraints,
  getBodyweightVariant,
  formatTempo,
  getCategoryName,
  getCategorySports,
} from "../intensityScaling";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION MATRIX TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CATEGORY_PHASE_CONFIG", () => {
  it("should have configs for all 4 categories", () => {
    expect(CATEGORY_PHASE_CONFIG).toHaveProperty("1");
    expect(CATEGORY_PHASE_CONFIG).toHaveProperty("2");
    expect(CATEGORY_PHASE_CONFIG).toHaveProperty("3");
    expect(CATEGORY_PHASE_CONFIG).toHaveProperty("4");
  });

  it("should have configs for all 3 phases per category", () => {
    const categories: CategoryId[] = [1, 2, 3, 4];
    for (const cat of categories) {
      expect(CATEGORY_PHASE_CONFIG[cat]).toHaveProperty("GPP");
      expect(CATEGORY_PHASE_CONFIG[cat]).toHaveProperty("SPP");
      expect(CATEGORY_PHASE_CONFIG[cat]).toHaveProperty("SSP");
    }
  });

  it("Category 1 GPP should have correct strength 1RM% range (50-65%)", () => {
    const config = CATEGORY_PHASE_CONFIG[1].GPP;
    expect(config.oneRepMaxPercent.strength.min).toBe(0.50);
    expect(config.oneRepMaxPercent.strength.max).toBe(0.65);
  });

  it("Category 2 SSP should have highest strength 1RM% (80-90%)", () => {
    const config = CATEGORY_PHASE_CONFIG[2].SSP;
    expect(config.oneRepMaxPercent.strength.min).toBe(0.80);
    expect(config.oneRepMaxPercent.strength.max).toBe(0.90);
  });

  it("Power exercises should have sub-maximal 1RM% (30-60%)", () => {
    // Check various category/phase combos
    expect(CATEGORY_PHASE_CONFIG[1].GPP.oneRepMaxPercent.power.max).toBeLessThanOrEqual(0.60);
    expect(CATEGORY_PHASE_CONFIG[2].SSP.oneRepMaxPercent.power.max).toBeLessThanOrEqual(0.60);
    expect(CATEGORY_PHASE_CONFIG[4].SSP.oneRepMaxPercent.power.max).toBeLessThanOrEqual(0.60);
  });

  it("SSP phases should have explosive tempo (x.x.x)", () => {
    const categories: CategoryId[] = [1, 2, 3, 4];
    for (const cat of categories) {
      const tempo = CATEGORY_PHASE_CONFIG[cat].SSP.tempo;
      expect(tempo.eccentric).toBe("x");
      expect(tempo.isometric).toBe("x");
      expect(tempo.concentric).toBe("x");
    }
  });

  it("Category 2 SSP should have longest rest for strength (120s)", () => {
    expect(CATEGORY_PHASE_CONFIG[2].SSP.restSeconds.strength).toBe(120);
  });
});

describe("AGE_EXPERIENCE_MATRIX", () => {
  it("should have entries for all 3 age groups", () => {
    expect(AGE_EXPERIENCE_MATRIX).toHaveProperty("14-17");
    expect(AGE_EXPERIENCE_MATRIX).toHaveProperty("18-35");
    expect(AGE_EXPERIENCE_MATRIX).toHaveProperty("36+");
  });

  it("should have entries for all 3 experience buckets per age group", () => {
    const ageGroups = ["14-17", "18-35", "36+"] as const;
    for (const age of ageGroups) {
      expect(AGE_EXPERIENCE_MATRIX[age]).toHaveProperty("0-1");
      expect(AGE_EXPERIENCE_MATRIX[age]).toHaveProperty("2-5");
      expect(AGE_EXPERIENCE_MATRIX[age]).toHaveProperty("6+");
    }
  });

  it("14-17 with 0-1 years should have middle positions", () => {
    const modifier = AGE_EXPERIENCE_MATRIX["14-17"]["0-1"];
    expect(modifier.setsPosition).toBe("middle");
    expect(modifier.repsPosition).toBe("middle");
  });

  it("18-35 with 6+ years should have max positions", () => {
    const modifier = AGE_EXPERIENCE_MATRIX["18-35"]["6+"];
    expect(modifier.setsPosition).toBe("max");
    expect(modifier.repsPosition).toBe("max");
  });

  it("18-35 with 0-1 years should have max sets but reduced reps", () => {
    const modifier = AGE_EXPERIENCE_MATRIX["18-35"]["0-1"];
    expect(modifier.setsPosition).toBe("max");
    expect(modifier.repsPosition).toBe("max_minus_2");
  });
});

describe("AGE_SAFETY_CONSTRAINTS", () => {
  it("14-17 should not have sets cap (null)", () => {
    expect(AGE_SAFETY_CONSTRAINTS["14-17"].maxSets).toBeNull();
  });

  it("18-35 should not have sets cap (null)", () => {
    expect(AGE_SAFETY_CONSTRAINTS["18-35"].maxSets).toBeNull();
  });

  it("36+ should not have sets cap (null)", () => {
    expect(AGE_SAFETY_CONSTRAINTS["36+"].maxSets).toBeNull();
  });

  it("14-17 should have 85% 1RM ceiling", () => {
    expect(AGE_SAFETY_CONSTRAINTS["14-17"].oneRepMaxCeiling).toBe(0.85);
  });

  it("18-35 should have 90% 1RM ceiling", () => {
    expect(AGE_SAFETY_CONSTRAINTS["18-35"].oneRepMaxCeiling).toBe(0.90);
  });

  it("36+ should have 90% 1RM ceiling", () => {
    expect(AGE_SAFETY_CONSTRAINTS["36+"].oneRepMaxCeiling).toBe(0.90);
  });
});

describe("BODYWEIGHT_VARIANT_MATRIX", () => {
  it("GPP with 0-1 years should use easier variant", () => {
    expect(BODYWEIGHT_VARIANT_MATRIX.GPP["0-1"]).toBe("easier");
  });

  it("SSP with 6+ years should use harder variant", () => {
    expect(BODYWEIGHT_VARIANT_MATRIX.SSP["6+"]).toBe("harder");
  });

  it("SPP should always use base variant", () => {
    expect(BODYWEIGHT_VARIANT_MATRIX.SPP["0-1"]).toBe("base");
    expect(BODYWEIGHT_VARIANT_MATRIX.SPP["2-5"]).toBe("base");
    expect(BODYWEIGHT_VARIANT_MATRIX.SPP["6+"]).toBe("base");
  });

  it("Most combinations should use base variant", () => {
    // Count base variants
    let baseCount = 0;
    const phases = ["GPP", "SPP", "SSP"] as const;
    const buckets = ["0-1", "2-5", "6+"] as const;
    for (const phase of phases) {
      for (const bucket of buckets) {
        if (BODYWEIGHT_VARIANT_MATRIX[phase][bucket] === "base") {
          baseCount++;
        }
      }
    }
    // Should be 7 out of 9 (GPP 0-1 is easier, SSP 6+ is harder)
    expect(baseCount).toBe(7);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getExperienceBucket", () => {
  it("0 years should return 0-1", () => {
    expect(getExperienceBucket(0)).toBe("0-1");
  });

  it("1 year should return 0-1", () => {
    expect(getExperienceBucket(1)).toBe("0-1");
  });

  it("2 years should return 2-5", () => {
    expect(getExperienceBucket(2)).toBe("2-5");
  });

  it("5 years should return 2-5", () => {
    expect(getExperienceBucket(5)).toBe("2-5");
  });

  it("6 years should return 6+", () => {
    expect(getExperienceBucket(6)).toBe("6+");
  });

  it("10 years should return 6+", () => {
    expect(getExperienceBucket(10)).toBe("6+");
  });

  it("0.5 years should return 0-1", () => {
    expect(getExperienceBucket(0.5)).toBe("0-1");
  });

  it("1.5 years should return 2-5", () => {
    expect(getExperienceBucket(1.5)).toBe("2-5");
  });
});

describe("getValueFromPosition", () => {
  const range: ParameterRange = { min: 4, max: 6 };

  it("lowest should return min", () => {
    expect(getValueFromPosition(range, "lowest")).toBe(4);
  });

  it("lowest_plus_1 should return min + 1", () => {
    expect(getValueFromPosition(range, "lowest_plus_1")).toBe(5);
  });

  it("lowest_plus_2 should return min + 2", () => {
    expect(getValueFromPosition(range, "lowest_plus_2")).toBe(6);
  });

  it("second_lowest should return min + 1", () => {
    expect(getValueFromPosition(range, "second_lowest")).toBe(5);
  });

  it("middle should return rounded average", () => {
    expect(getValueFromPosition(range, "middle")).toBe(5);
  });

  it("max_minus_2 should return max - 2", () => {
    expect(getValueFromPosition(range, "max_minus_2")).toBe(4);
  });

  it("max_minus_1 should return max - 1", () => {
    expect(getValueFromPosition(range, "max_minus_1")).toBe(5);
  });

  it("max should return max", () => {
    expect(getValueFromPosition(range, "max")).toBe(6);
  });

  it("max_minus_2 should not go below min", () => {
    const smallRange: ParameterRange = { min: 3, max: 4 };
    expect(getValueFromPosition(smallRange, "max_minus_2")).toBe(3);
  });

  it("should work with larger ranges", () => {
    const largeRange: ParameterRange = { min: 10, max: 14 };
    expect(getValueFromPosition(largeRange, "lowest")).toBe(10);
    expect(getValueFromPosition(largeRange, "middle")).toBe(12);
    expect(getValueFromPosition(largeRange, "max")).toBe(14);
    expect(getValueFromPosition(largeRange, "max_minus_2")).toBe(12);
  });
});

describe("getExerciseFocus", () => {
  it("should return bodyweight for no equipment", () => {
    expect(getExerciseFocus([], undefined)).toBe("bodyweight");
    expect(getExerciseFocus([], [])).toBe("bodyweight");
  });

  it("should return bodyweight for only bodyweight equipment", () => {
    expect(getExerciseFocus([], ["bodyweight"])).toBe("bodyweight");
  });

  it("should return power for power-tagged exercises", () => {
    expect(getExerciseFocus(["power"], ["barbell"])).toBe("power");
    expect(getExerciseFocus(["explosive"], ["dumbbell"])).toBe("power");
    expect(getExerciseFocus(["plyometric"], ["plyo_box"])).toBe("power");
    expect(getExerciseFocus(["reactive"], ["medicine_ball"])).toBe("power");
  });

  it("should return strength for weighted exercises without power tags", () => {
    expect(getExerciseFocus(["strength", "compound"], ["barbell"])).toBe("strength");
    expect(getExerciseFocus(["lower_body", "bilateral"], ["dumbbell"])).toBe("strength");
  });

  it("should be case insensitive for tags", () => {
    expect(getExerciseFocus(["POWER"], ["barbell"])).toBe("power");
    expect(getExerciseFocus(["Explosive"], ["dumbbell"])).toBe("power");
  });

  it("should return strength as default for weighted exercises", () => {
    expect(getExerciseFocus(undefined, ["barbell"])).toBe("strength");
  });
});

describe("getCategoryExerciseParameters", () => {
  it("should return correct parameters for Category 2 GPP 18-35 6+ years strength", () => {
    const params = getCategoryExerciseParameters(2, "GPP", "18-35", 7, "strength");

    // 18-35 with 6+ years gets max sets and max reps
    // Category 2 GPP sets: 4-6, so max = 6
    expect(params.sets).toBe(6);

    // Category 2 GPP strength reps: 10-14, so max = 14
    expect(params.reps).toBe(14);

    // Rest for strength: 30s
    expect(params.restSeconds).toBe(30);

    // 1RM should be 55-65% (no cap for 18-35)
    expect(params.oneRepMaxPercent.min).toBe(0.55);
    expect(params.oneRepMaxPercent.max).toBe(0.65);

    // RPE: 6-7
    expect(params.rpe.min).toBe(6);
    expect(params.rpe.max).toBe(7);
  });

  it("should apply 14-17 age safety constraints", () => {
    const params = getCategoryExerciseParameters(2, "SSP", "14-17", 7, "strength");

    // 14-17 with 6+ years gets max sets and max reps
    // Category 2 SSP sets: 4-6, max = 6
    expect(params.sets).toBe(6);

    // 1RM should be capped at 85% (age ceiling)
    // Category 2 SSP strength: 80-90%, capped at 85%
    expect(params.oneRepMaxPercent.min).toBe(0.80);
    expect(params.oneRepMaxPercent.max).toBe(0.85);
  });

  it("should use power parameters for power exercises", () => {
    const params = getCategoryExerciseParameters(2, "SSP", "18-35", 7, "power");

    // Power 1RM for Category 2 SSP: 50-60%
    expect(params.oneRepMaxPercent.min).toBe(0.50);
    expect(params.oneRepMaxPercent.max).toBe(0.60);

    // Power rest: 120s
    expect(params.restSeconds).toBe(120);
  });

  it("should return explosive tempo for SSP", () => {
    const params = getCategoryExerciseParameters(1, "SSP", "18-35", 5, "strength");
    expect(params.tempo.eccentric).toBe("x");
    expect(params.tempo.isometric).toBe("x");
    expect(params.tempo.concentric).toBe("x");
  });

  it("should return controlled tempo for GPP", () => {
    const params = getCategoryExerciseParameters(1, "GPP", "18-35", 5, "strength");
    expect(params.tempo.eccentric).toBe(2);
    expect(params.tempo.isometric).toBe(1);
    expect(params.tempo.concentric).toBe(2);
  });
});

describe("applyAgeSafetyConstraints", () => {
  it("should not modify sets for 14-17", () => {
    const params = {
      oneRepMaxPercent: { min: 0.80, max: 0.90 },
      sets: 5,
      reps: 6,
      restSeconds: 120,
      tempo: { eccentric: "x" as const, isometric: "x" as const, concentric: "x" as const },
      rpe: { min: 8, max: 9 },
    };

    const constrained = applyAgeSafetyConstraints(params, "14-17");
    expect(constrained.sets).toBe(5);
  });

  it("should cap 1RM to 85% for 14-17", () => {
    const params = {
      oneRepMaxPercent: { min: 0.80, max: 0.90 },
      sets: 5,
      reps: 6,
      restSeconds: 120,
      tempo: { eccentric: "x" as const, isometric: "x" as const, concentric: "x" as const },
      rpe: { min: 8, max: 9 },
    };

    const constrained = applyAgeSafetyConstraints(params, "14-17");
    expect(constrained.oneRepMaxPercent.min).toBe(0.80);
    expect(constrained.oneRepMaxPercent.max).toBe(0.85);
  });

  it("should not modify sets for 18-35", () => {
    const params = {
      oneRepMaxPercent: { min: 0.80, max: 0.90 },
      sets: 5,
      reps: 6,
      restSeconds: 120,
      tempo: { eccentric: "x" as const, isometric: "x" as const, concentric: "x" as const },
      rpe: { min: 8, max: 9 },
    };

    const constrained = applyAgeSafetyConstraints(params, "18-35");
    expect(constrained.sets).toBe(5);
  });

  it("should allow full 1RM range for 18-35", () => {
    const params = {
      oneRepMaxPercent: { min: 0.80, max: 0.90 },
      sets: 5,
      reps: 6,
      restSeconds: 120,
      tempo: { eccentric: "x" as const, isometric: "x" as const, concentric: "x" as const },
      rpe: { min: 8, max: 9 },
    };

    const constrained = applyAgeSafetyConstraints(params, "18-35");
    expect(constrained.oneRepMaxPercent.min).toBe(0.80);
    expect(constrained.oneRepMaxPercent.max).toBe(0.90);
  });

  it("should not modify sets for 36+", () => {
    const params = {
      oneRepMaxPercent: { min: 0.80, max: 0.90 },
      sets: 5,
      reps: 6,
      restSeconds: 120,
      tempo: { eccentric: "x" as const, isometric: "x" as const, concentric: "x" as const },
      rpe: { min: 8, max: 9 },
    };

    const constrained = applyAgeSafetyConstraints(params, "36+");
    expect(constrained.sets).toBe(5);
  });

  it("should allow full 1RM range for 36+", () => {
    const params = {
      oneRepMaxPercent: { min: 0.80, max: 0.90 },
      sets: 5,
      reps: 6,
      restSeconds: 120,
      tempo: { eccentric: "x" as const, isometric: "x" as const, concentric: "x" as const },
      rpe: { min: 8, max: 9 },
    };

    const constrained = applyAgeSafetyConstraints(params, "36+");
    expect(constrained.oneRepMaxPercent.min).toBe(0.80);
    expect(constrained.oneRepMaxPercent.max).toBe(0.90);
  });
});

describe("getBodyweightVariant", () => {
  const progressions = {
    easier: "incline_push_up",
    harder: "plyo_push_up",
  };

  it("should return easier variant for GPP with 0-1 years", () => {
    const result = getBodyweightVariant("push_up", "GPP", "0-1", progressions);
    expect(result.slug).toBe("incline_push_up");
    expect(result.isSubstituted).toBe(true);
  });

  it("should return base for GPP with 2-5 years", () => {
    const result = getBodyweightVariant("push_up", "GPP", "2-5", progressions);
    expect(result.slug).toBe("push_up");
    expect(result.isSubstituted).toBe(false);
  });

  it("should return harder variant for SSP with 6+ years", () => {
    const result = getBodyweightVariant("push_up", "SSP", "6+", progressions);
    expect(result.slug).toBe("plyo_push_up");
    expect(result.isSubstituted).toBe(true);
  });

  it("should return base for SPP regardless of experience", () => {
    expect(getBodyweightVariant("push_up", "SPP", "0-1", progressions).slug).toBe("push_up");
    expect(getBodyweightVariant("push_up", "SPP", "2-5", progressions).slug).toBe("push_up");
    expect(getBodyweightVariant("push_up", "SPP", "6+", progressions).slug).toBe("push_up");
  });

  it("should return base if no progressions available", () => {
    const result = getBodyweightVariant("plank", "GPP", "0-1", undefined);
    expect(result.slug).toBe("plank");
    expect(result.isSubstituted).toBe(false);
  });

  it("should return base if requested progression not available", () => {
    const partialProgressions = { harder: "weighted_pull_up" };
    const result = getBodyweightVariant("pull_up", "GPP", "0-1", partialProgressions);
    expect(result.slug).toBe("pull_up");
    expect(result.isSubstituted).toBe(false);
  });
});

describe("formatTempo", () => {
  it("should format numeric tempo", () => {
    expect(formatTempo({ eccentric: 2, isometric: 1, concentric: 2 })).toBe("2.1.2");
  });

  it("should format explosive tempo", () => {
    expect(formatTempo({ eccentric: "x", isometric: "x", concentric: "x" })).toBe("x.x.x");
  });

  it("should format mixed tempo", () => {
    expect(formatTempo({ eccentric: 2, isometric: 0, concentric: "x" })).toBe("2.0.x");
  });
});

describe("getCategoryName", () => {
  it("should return correct names", () => {
    expect(getCategoryName(1)).toBe("Endurance");
    expect(getCategoryName(2)).toBe("Power");
    expect(getCategoryName(3)).toBe("Rotational");
    expect(getCategoryName(4)).toBe("Strength");
  });
});

describe("getCategorySports", () => {
  it("should return correct sports for Category 1", () => {
    const sports = getCategorySports(1);
    expect(sports).toContain("Soccer");
    expect(sports).toContain("Hockey");
    expect(sports).toContain("Lacrosse");
  });

  it("should return correct sports for Category 2", () => {
    const sports = getCategorySports(2);
    expect(sports).toContain("Basketball");
    expect(sports).toContain("Volleyball");
  });

  it("should return correct sports for Category 3", () => {
    const sports = getCategorySports(3);
    expect(sports).toContain("Baseball");
    expect(sports).toContain("Tennis");
    expect(sports).toContain("Golf");
  });

  it("should return correct sports for Category 4", () => {
    const sports = getCategorySports(4);
    expect(sports).toContain("Wrestling");
    expect(sports).toContain("Football");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Category-Specific Intensity Integration", () => {
  it("16-year-old Category 2 athlete in SSP should have 85% ceiling", () => {
    const params = getCategoryExerciseParameters(2, "SSP", "14-17", 3, "strength");

    // Category 2 SSP prescribes 80-90% but age cap is 85%
    expect(params.oneRepMaxPercent.max).toBe(0.85);
  });

  it("18-35 beginner should get max sets but reduced reps", () => {
    const params = getCategoryExerciseParameters(1, "GPP", "18-35", 0.5, "strength");

    // Category 1 GPP sets: 4-6, 18-35 0-1 yrs gets max position = 6
    expect(params.sets).toBe(6);

    // Category 1 GPP strength reps: 10-14, 18-35 0-1 yrs gets max-2 = 12
    expect(params.reps).toBe(12);
  });

  it("experienced teen should get full prescription", () => {
    const params = getCategoryExerciseParameters(4, "SPP", "14-17", 6, "strength");

    // Category 4 SPP sets: 4-5, 14-17 6+ yrs gets max = 5
    expect(params.sets).toBe(5);

    // Category 4 SPP strength reps: 8-12, 14-17 6+ yrs gets max = 12
    expect(params.reps).toBe(12);

    // 1RM should be within category range (70-85%) and age ceiling (85%)
    expect(params.oneRepMaxPercent.max).toBe(0.85);
  });

  it("power exercise should use sub-maximal loading for all age groups", () => {
    const params18_35 = getCategoryExerciseParameters(2, "SSP", "18-35", 7, "power");
    const params14 = getCategoryExerciseParameters(2, "SSP", "14-17", 7, "power");
    const params36 = getCategoryExerciseParameters(2, "SSP", "36+", 7, "power");

    // Power exercises use 50-60% for Category 2 SSP
    expect(params18_35.oneRepMaxPercent.max).toBeLessThanOrEqual(0.60);
    expect(params14.oneRepMaxPercent.max).toBeLessThanOrEqual(0.60);
    expect(params36.oneRepMaxPercent.max).toBeLessThanOrEqual(0.60);
  });

  it("36+ should have same constraints as 18-35", () => {
    const params18_35 = getCategoryExerciseParameters(2, "GPP", "18-35", 7, "strength");
    const params36 = getCategoryExerciseParameters(2, "GPP", "36+", 7, "strength");

    expect(params18_35.sets).toBe(params36.sets);
    expect(params18_35.reps).toBe(params36.reps);
    expect(params18_35.oneRepMaxPercent.max).toBe(params36.oneRepMaxPercent.max);
  });
});
