import { describe, it, expect } from "vitest";
import {
  AGE_INTENSITY_RULES,
  PHASE_INTENSITY_RANGES,
  getEffectiveOneRepMaxCeiling,
  getOneRepMaxRange,
  getMaxIntensityForAge,
  capIntensityForAge,
  getMaxSetsForAge,
  applyAgeModifiers,
  scaleRepsOrDuration,
} from "../intensityScaling";

// ═══════════════════════════════════════════════════════════════════════════════
// AGE INTENSITY RULES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("AGE_INTENSITY_RULES", () => {
  it("should have rules for all three age groups", () => {
    expect(AGE_INTENSITY_RULES).toHaveProperty("14-17");
    expect(AGE_INTENSITY_RULES).toHaveProperty("18-35");
    expect(AGE_INTENSITY_RULES).toHaveProperty("36+");
  });

  describe("Age Group 14-17 (Youth)", () => {
    const rules = AGE_INTENSITY_RULES["14-17"];

    it("should allow High intensity", () => {
      expect(rules.maxIntensity).toBe("High");
    });

    it("should cap 1RM at 85%", () => {
      expect(rules.oneRepMaxCeiling).toBe(0.85);
    });

    it("should allow plyometrics", () => {
      expect(rules.plyometricAllowed).toBe(true);
    });

    it("should limit sets to 5 per exercise", () => {
      expect(rules.maxSetsPerExercise).toBe(5);
    });

    it("should not modify rep ranges", () => {
      expect(rules.maxRepsMultiplier).toBe(1.0);
    });
  });

  describe("Age Group 18-35 (Performance)", () => {
    const rules = AGE_INTENSITY_RULES["18-35"];

    it("should allow High intensity", () => {
      expect(rules.maxIntensity).toBe("High");
    });

    it("should cap 1RM at 90%", () => {
      expect(rules.oneRepMaxCeiling).toBe(0.90);
    });

    it("should allow plyometrics", () => {
      expect(rules.plyometricAllowed).toBe(true);
    });

    it("should limit sets to 6 per exercise", () => {
      expect(rules.maxSetsPerExercise).toBe(6);
    });

    it("should not modify rep ranges", () => {
      expect(rules.maxRepsMultiplier).toBe(1.0);
    });
  });

  describe("Age Group 36+ (Vitality)", () => {
    const rules = AGE_INTENSITY_RULES["36+"];

    it("should allow High intensity", () => {
      expect(rules.maxIntensity).toBe("High");
    });

    it("should cap 1RM at 90%", () => {
      expect(rules.oneRepMaxCeiling).toBe(0.90);
    });

    it("should allow plyometrics", () => {
      expect(rules.plyometricAllowed).toBe(true);
    });

    it("should limit sets to 6 per exercise", () => {
      expect(rules.maxSetsPerExercise).toBe(6);
    });

    it("should not modify rep ranges", () => {
      expect(rules.maxRepsMultiplier).toBe(1.0);
    });
  });

  describe("Progressive restrictions by age", () => {
    it("1RM ceiling should increase from youth to performance", () => {
      expect(AGE_INTENSITY_RULES["14-17"].oneRepMaxCeiling).toBeLessThan(
        AGE_INTENSITY_RULES["18-35"].oneRepMaxCeiling
      );
    });

    it("18-35 and 36+ should have the same 1RM ceiling", () => {
      expect(AGE_INTENSITY_RULES["18-35"].oneRepMaxCeiling).toBe(
        AGE_INTENSITY_RULES["36+"].oneRepMaxCeiling
      );
    });

    it("max sets should increase from youth to performance", () => {
      expect(AGE_INTENSITY_RULES["14-17"].maxSetsPerExercise).toBeLessThan(
        AGE_INTENSITY_RULES["18-35"].maxSetsPerExercise
      );
    });

    it("18-35 and 36+ should have the same max sets", () => {
      expect(AGE_INTENSITY_RULES["18-35"].maxSetsPerExercise).toBe(
        AGE_INTENSITY_RULES["36+"].maxSetsPerExercise
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE INTENSITY RANGES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("PHASE_INTENSITY_RANGES", () => {
  it("should have ranges for all three phases", () => {
    expect(PHASE_INTENSITY_RANGES).toHaveProperty("GPP");
    expect(PHASE_INTENSITY_RANGES).toHaveProperty("SPP");
    expect(PHASE_INTENSITY_RANGES).toHaveProperty("SSP");
  });

  describe("GPP (General Physical Preparedness)", () => {
    const range = PHASE_INTENSITY_RANGES.GPP;

    it("should have min of 60%", () => {
      expect(range.min).toBe(0.60);
    });

    it("should have max of 75%", () => {
      expect(range.max).toBe(0.75);
    });
  });

  describe("SPP (Specific Physical Preparedness)", () => {
    const range = PHASE_INTENSITY_RANGES.SPP;

    it("should have min of 75%", () => {
      expect(range.min).toBe(0.75);
    });

    it("should have max of 85%", () => {
      expect(range.max).toBe(0.85);
    });
  });

  describe("SSP (Sport-Specific Preparedness)", () => {
    const range = PHASE_INTENSITY_RANGES.SSP;

    it("should have min of 85%", () => {
      expect(range.min).toBe(0.85);
    });

    it("should have max of 90%", () => {
      expect(range.max).toBe(0.90);
    });
  });

  describe("Progressive intensity by phase", () => {
    it("intensity should increase from GPP to SPP to SSP", () => {
      expect(PHASE_INTENSITY_RANGES.GPP.max).toBeLessThanOrEqual(
        PHASE_INTENSITY_RANGES.SPP.min
      );
      expect(PHASE_INTENSITY_RANGES.SPP.max).toBeLessThanOrEqual(
        PHASE_INTENSITY_RANGES.SSP.min
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getEffectiveOneRepMaxCeiling", () => {
  it("should return phase max when age ceiling is higher (14-17 in GPP)", () => {
    // 14-17 ceiling (85%) > GPP max (75%), so return 75%
    expect(getEffectiveOneRepMaxCeiling("14-17", "GPP")).toBe(0.75);
  });

  it("should return phase max when age ceiling is higher (18-35 in GPP)", () => {
    // 18-35 ceiling (90%) > GPP max (75%), so return 75%
    expect(getEffectiveOneRepMaxCeiling("18-35", "GPP")).toBe(0.75);
  });

  it("should return 14-17 ceiling for SPP", () => {
    // 14-17 ceiling (85%) = SPP max (85%)
    expect(getEffectiveOneRepMaxCeiling("14-17", "SPP")).toBe(0.85);
  });

  it("should return SPP max for 18-35", () => {
    // 18-35 ceiling (90%) > SPP max (85%), so return 85%
    expect(getEffectiveOneRepMaxCeiling("18-35", "SPP")).toBe(0.85);
  });

  it("should return 18-35 ceiling for SSP", () => {
    // 18-35 ceiling (90%) = SSP max (90%)
    expect(getEffectiveOneRepMaxCeiling("18-35", "SSP")).toBe(0.90);
  });

  it("should return 36+ ceiling for SSP", () => {
    // 36+ ceiling (90%) = SSP max (90%)
    expect(getEffectiveOneRepMaxCeiling("36+", "SSP")).toBe(0.90);
  });
});

describe("getOneRepMaxRange", () => {
  it("should return full GPP range for 14-17", () => {
    const range = getOneRepMaxRange("14-17", "GPP");
    expect(range.min).toBe(0.60);
    expect(range.max).toBe(0.75);
  });

  it("should return full GPP range for 18-35", () => {
    const range = getOneRepMaxRange("18-35", "GPP");
    expect(range.min).toBe(0.60);
    expect(range.max).toBe(0.75);
  });

  it("should return SPP range for 14-17", () => {
    const range = getOneRepMaxRange("14-17", "SPP");
    expect(range.min).toBe(0.75);
    expect(range.max).toBe(0.85);
  });

  it("should return SSP range for 18-35", () => {
    const range = getOneRepMaxRange("18-35", "SSP");
    expect(range.min).toBe(0.85);
    expect(range.max).toBe(0.90);
  });

  it("should return SSP range for 36+", () => {
    const range = getOneRepMaxRange("36+", "SSP");
    expect(range.min).toBe(0.85);
    expect(range.max).toBe(0.90);
  });
});

describe("getMaxIntensityForAge", () => {
  it("should return High for 14-17", () => {
    expect(getMaxIntensityForAge("14-17")).toBe("High");
  });

  it("should return High for 18-35", () => {
    expect(getMaxIntensityForAge("18-35")).toBe("High");
  });

  it("should return High for 36+", () => {
    expect(getMaxIntensityForAge("36+")).toBe("High");
  });
});

describe("capIntensityForAge", () => {
  describe("Age Group 14-17 (max: High)", () => {
    it("should allow Low intensity", () => {
      expect(capIntensityForAge("Low", "14-17")).toBe("Low");
    });

    it("should allow Moderate intensity", () => {
      expect(capIntensityForAge("Moderate", "14-17")).toBe("Moderate");
    });

    it("should allow High intensity", () => {
      expect(capIntensityForAge("High", "14-17")).toBe("High");
    });
  });

  describe("Age Group 18-35 (max: High)", () => {
    it("should allow all intensity levels", () => {
      expect(capIntensityForAge("Low", "18-35")).toBe("Low");
      expect(capIntensityForAge("Moderate", "18-35")).toBe("Moderate");
      expect(capIntensityForAge("High", "18-35")).toBe("High");
    });
  });

  describe("Age Group 36+ (max: High)", () => {
    it("should allow all intensity levels", () => {
      expect(capIntensityForAge("Low", "36+")).toBe("Low");
      expect(capIntensityForAge("Moderate", "36+")).toBe("Moderate");
      expect(capIntensityForAge("High", "36+")).toBe("High");
    });
  });
});

describe("getMaxSetsForAge", () => {
  it("should return 5 for 14-17", () => {
    expect(getMaxSetsForAge("14-17")).toBe(5);
  });

  it("should return 6 for 18-35", () => {
    expect(getMaxSetsForAge("18-35")).toBe(6);
  });

  it("should return 6 for 36+", () => {
    expect(getMaxSetsForAge("36+")).toBe(6);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY AGE MODIFIERS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("applyAgeModifiers", () => {
  const basePrescription = {
    sets: 4,
    reps: "10",
    intensity: "High" as const,
  };

  describe("Age Group 14-17 (Youth)", () => {
    it("should cap sets to 5", () => {
      const highSetPrescription = { sets: 6, reps: "10", intensity: "High" as const };
      const result = applyAgeModifiers(highSetPrescription, "14-17", "GPP");
      expect(result.sets).toBe(5);
    });

    it("should not scale reps", () => {
      const result = applyAgeModifiers(basePrescription, "14-17", "GPP");
      expect(result.reps).toBe("10");
    });

    it("should allow High intensity", () => {
      const result = applyAgeModifiers(basePrescription, "14-17", "GPP");
      expect(result.intensity).toBe("High");
    });

    it("should respect phase max for SPP", () => {
      const result = applyAgeModifiers(basePrescription, "14-17", "SPP");
      expect(result.oneRepMaxRange.max).toBe(0.85);
    });
  });

  describe("Age Group 18-35 (Performance)", () => {
    it("should allow 6 sets", () => {
      const highSetPrescription = { sets: 6, reps: "10", intensity: "High" as const };
      const result = applyAgeModifiers(highSetPrescription, "18-35", "GPP");
      expect(result.sets).toBe(6);
    });

    it("should cap sets above 6", () => {
      const tooManySets = { sets: 8, reps: "10", intensity: "High" as const };
      const result = applyAgeModifiers(tooManySets, "18-35", "GPP");
      expect(result.sets).toBe(6);
    });

    it("should not scale reps", () => {
      const result = applyAgeModifiers(basePrescription, "18-35", "GPP");
      expect(result.reps).toBe("10");
    });

    it("should allow full SSP intensity range", () => {
      const result = applyAgeModifiers(basePrescription, "18-35", "SSP");
      expect(result.oneRepMaxRange.max).toBe(0.90);
    });
  });

  describe("Age Group 36+ (Vitality)", () => {
    it("should allow 6 sets", () => {
      const highSetPrescription = { sets: 6, reps: "10", intensity: "High" as const };
      const result = applyAgeModifiers(highSetPrescription, "36+", "GPP");
      expect(result.sets).toBe(6);
    });

    it("should cap sets above 6", () => {
      const tooManySets = { sets: 8, reps: "10", intensity: "High" as const };
      const result = applyAgeModifiers(tooManySets, "36+", "GPP");
      expect(result.sets).toBe(6);
    });

    it("should not scale reps", () => {
      const result = applyAgeModifiers(basePrescription, "36+", "GPP");
      expect(result.reps).toBe("10");
    });

    it("should allow full SSP intensity range", () => {
      const result = applyAgeModifiers(basePrescription, "36+", "SSP");
      expect(result.oneRepMaxRange.max).toBe(0.90);
    });
  });

  describe("Default intensity", () => {
    it("should default to Moderate when no intensity provided", () => {
      const noIntensity = { sets: 4, reps: "10" };
      const result = applyAgeModifiers(noIntensity, "18-35", "GPP");
      expect(result.intensity).toBe("Moderate");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL WORLD SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Real World Scenarios", () => {
  describe("16-year-old football player (Youth)", () => {
    const ageGroup = "14-17" as const;
    const prescription = { sets: 5, reps: "6", intensity: "High" as const };

    it("GPP phase should allow moderate progression", () => {
      const result = applyAgeModifiers(prescription, ageGroup, "GPP");

      expect(result.sets).toBe(5);
      expect(result.reps).toBe("6");
      expect(result.intensity).toBe("High");
      expect(result.oneRepMaxRange.max).toBe(0.75); // Phase max
    });

    it("SSP phase should cap at 85%", () => {
      const result = applyAgeModifiers(prescription, ageGroup, "SSP");

      expect(result.oneRepMaxRange.max).toBe(0.85); // Age ceiling
    });
  });

  describe("25-year-old athlete (Performance)", () => {
    const ageGroup = "18-35" as const;
    const prescription = { sets: 5, reps: "5", intensity: "High" as const };

    it("SSP phase should allow full progression", () => {
      const result = applyAgeModifiers(prescription, ageGroup, "SSP");

      expect(result.sets).toBe(5);
      expect(result.reps).toBe("5");
      expect(result.intensity).toBe("High");
      expect(result.oneRepMaxRange.min).toBe(0.85);
      expect(result.oneRepMaxRange.max).toBe(0.90);
    });
  });

  describe("42-year-old athlete (Vitality)", () => {
    const ageGroup = "36+" as const;
    const prescription = { sets: 5, reps: "5", intensity: "High" as const };

    it("SSP phase should allow full progression", () => {
      const result = applyAgeModifiers(prescription, ageGroup, "SSP");

      expect(result.sets).toBe(5);
      expect(result.reps).toBe("5");
      expect(result.intensity).toBe("High");
      expect(result.oneRepMaxRange.min).toBe(0.85);
      expect(result.oneRepMaxRange.max).toBe(0.90);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("should handle minimum sets (1)", () => {
    const minSets = { sets: 1, reps: "10", intensity: "High" as const };
    const result = applyAgeModifiers(minSets, "14-17", "GPP");
    expect(result.sets).toBe(1); // Should not go below 1
  });

  it("should handle AMRAP reps (no scaling)", () => {
    const amrap = { sets: 3, reps: "AMRAP", intensity: "Moderate" as const };
    const result = applyAgeModifiers(amrap, "14-17", "GPP");
    expect(result.reps).toBe("AMRAP"); // AMRAP should not be scaled
  });

  it("should handle rep ranges", () => {
    const range = { sets: 3, reps: "10-12", intensity: "Moderate" as const };
    const result = applyAgeModifiers(range, "18-35", "GPP");
    // No scaling for 18-35, so midpoint 11 returned as-is
    expect(result.reps).toBe("10-12");
  });

  it("should handle per-side notation", () => {
    const perSide = { sets: 3, reps: "8 each side", intensity: "Moderate" as const };
    const result = applyAgeModifiers(perSide, "36+", "GPP");
    // No scaling for 36+
    expect(result.reps).toBe("8 each side");
  });
});
