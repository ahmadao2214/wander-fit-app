import { describe, it, expect } from "vitest";
import {
  INTENSITY_CONFIG,
  BODYWEIGHT_INTENSITY_CONFIG,
  applyIntensityToWeighted,
  applyIntensityToBodyweight,
  parseRepsString,
  formatScaledValue,
  scaleRepsOrDuration,
  calculateOneRepMax,
  calculateTargetWeight,
  isBodyweightExercise,
} from "../intensityScaling";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CONFIG TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("INTENSITY_CONFIG", () => {
  it("should have configs for all three intensity levels", () => {
    expect(INTENSITY_CONFIG).toHaveProperty("Low");
    expect(INTENSITY_CONFIG).toHaveProperty("Moderate");
    expect(INTENSITY_CONFIG).toHaveProperty("High");
  });

  it("Low intensity should have lower percentages than Moderate", () => {
    expect(INTENSITY_CONFIG.Low.oneRepMaxPercent.max).toBeLessThan(
      INTENSITY_CONFIG.Moderate.oneRepMaxPercent.min
    );
  });

  it("Moderate intensity should have lower percentages than High", () => {
    expect(INTENSITY_CONFIG.Moderate.oneRepMaxPercent.max).toBeLessThan(
      INTENSITY_CONFIG.High.oneRepMaxPercent.min
    );
  });

  it("Low intensity should have fewer sets (0.75x)", () => {
    expect(INTENSITY_CONFIG.Low.setsMultiplier).toBe(0.75);
  });

  it("High intensity should have more sets (1.25x)", () => {
    expect(INTENSITY_CONFIG.High.setsMultiplier).toBe(1.25);
  });

  it("Low intensity should have longer rest (1.25x)", () => {
    expect(INTENSITY_CONFIG.Low.restMultiplier).toBe(1.25);
  });

  it("High intensity should have shorter rest (0.75x)", () => {
    expect(INTENSITY_CONFIG.High.restMultiplier).toBe(0.75);
  });
});

describe("BODYWEIGHT_INTENSITY_CONFIG", () => {
  it("should have configs for all three intensity levels", () => {
    expect(BODYWEIGHT_INTENSITY_CONFIG).toHaveProperty("Low");
    expect(BODYWEIGHT_INTENSITY_CONFIG).toHaveProperty("Moderate");
    expect(BODYWEIGHT_INTENSITY_CONFIG).toHaveProperty("High");
  });

  it("Low should scale down reps (0.67x)", () => {
    expect(BODYWEIGHT_INTENSITY_CONFIG.Low.repsMultiplier).toBeCloseTo(0.67, 2);
  });

  it("High should scale up reps (1.33x)", () => {
    expect(BODYWEIGHT_INTENSITY_CONFIG.High.repsMultiplier).toBeCloseTo(1.33, 2);
  });

  it("Moderate should not change reps (1x)", () => {
    expect(BODYWEIGHT_INTENSITY_CONFIG.Moderate.repsMultiplier).toBe(1.0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARSE REPS STRING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseRepsString", () => {
  describe("plain numbers", () => {
    it('parses "10" as 10 reps', () => {
      const result = parseRepsString("10");
      expect(result).toEqual({ value: 10, unit: "reps" });
    });

    it('parses "5" as 5 reps', () => {
      const result = parseRepsString("5");
      expect(result).toEqual({ value: 5, unit: "reps" });
    });
  });

  describe("seconds format", () => {
    it('parses "30s" as 30 seconds', () => {
      const result = parseRepsString("30s");
      expect(result).toEqual({ value: 30, unit: "seconds" });
    });

    it('parses "45 sec" as 45 seconds', () => {
      const result = parseRepsString("45 sec");
      expect(result).toEqual({ value: 45, unit: "seconds" });
    });

    it('parses "60 seconds" as 60 seconds', () => {
      const result = parseRepsString("60 seconds");
      expect(result).toEqual({ value: 60, unit: "seconds" });
    });
  });

  describe("minutes format", () => {
    it('parses "2 min" as 120 seconds', () => {
      const result = parseRepsString("2 min");
      expect(result).toEqual({ value: 120, unit: "seconds" });
    });

    it('parses "1.5 minutes" as 90 seconds', () => {
      const result = parseRepsString("1.5 minutes");
      expect(result).toEqual({ value: 90, unit: "seconds" });
    });
  });

  describe("range format", () => {
    it('parses "10-12" as midpoint 11 reps', () => {
      const result = parseRepsString("10-12");
      expect(result).toEqual({ value: 11, unit: "reps" });
    });

    it('parses "8-10" as midpoint 9 reps', () => {
      const result = parseRepsString("8-10");
      expect(result).toEqual({ value: 9, unit: "reps" });
    });
  });

  describe("each side format", () => {
    it('parses "5 each side" correctly', () => {
      const result = parseRepsString("5 each side");
      expect(result).toEqual({ value: 5, unit: "reps", suffix: " each side" });
    });

    it('parses "10 per leg" correctly', () => {
      const result = parseRepsString("10 per leg");
      expect(result).toEqual({ value: 10, unit: "reps", suffix: " per leg" });
    });
  });

  describe("AMRAP", () => {
    it('returns null for "AMRAP" (cannot scale)', () => {
      const result = parseRepsString("AMRAP");
      expect(result).toBeNull();
    });

    it('returns null for "amrap" (case insensitive)', () => {
      const result = parseRepsString("amrap");
      expect(result).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT SCALED VALUE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("formatScaledValue", () => {
  describe("reps formatting", () => {
    it("rounds to nearest whole number", () => {
      expect(formatScaledValue(10.4, "reps")).toBe("10");
      expect(formatScaledValue(10.6, "reps")).toBe("11");
    });

    it("enforces minimum of 1 rep", () => {
      expect(formatScaledValue(0.3, "reps")).toBe("1");
    });

    it("preserves suffix", () => {
      expect(formatScaledValue(5, "reps", " each side")).toBe("5 each side");
    });
  });

  describe("seconds formatting", () => {
    it("rounds to nearest 5 seconds", () => {
      expect(formatScaledValue(32, "seconds")).toBe("30s");
      expect(formatScaledValue(33, "seconds")).toBe("35s");
    });

    it("enforces minimum of 5 seconds", () => {
      expect(formatScaledValue(2, "seconds")).toBe("5s");
    });

    it("converts to minutes when appropriate", () => {
      expect(formatScaledValue(60, "seconds")).toBe("1 min");
      expect(formatScaledValue(120, "seconds")).toBe("2 min");
    });

    it("keeps seconds for non-round minute values", () => {
      expect(formatScaledValue(45, "seconds")).toBe("45s");
      expect(formatScaledValue(90, "seconds")).toBe("90s");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCALE REPS OR DURATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("scaleRepsOrDuration", () => {
  it("scales plain reps correctly", () => {
    expect(scaleRepsOrDuration("10", 1.33)).toBe("13");
    expect(scaleRepsOrDuration("10", 0.67)).toBe("7");
  });

  it("scales seconds correctly", () => {
    expect(scaleRepsOrDuration("30s", 1.33)).toBe("40s");
    expect(scaleRepsOrDuration("30s", 0.67)).toBe("20s");
  });

  it("scales minutes correctly", () => {
    expect(scaleRepsOrDuration("2 min", 0.67)).toBe("80s");
  });

  it("returns AMRAP unchanged", () => {
    expect(scaleRepsOrDuration("AMRAP", 1.33)).toBe("AMRAP");
  });

  it("scales ranges using midpoint", () => {
    // 10-12 midpoint is 11, scaled by 1.33 ≈ 15
    expect(scaleRepsOrDuration("10-12", 1.33)).toBe("15");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY INTENSITY TO WEIGHTED TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("applyIntensityToWeighted", () => {
  const basePrescription = { sets: 4, reps: 8, restSeconds: 60 };

  describe("Low intensity", () => {
    it("reduces sets by 0.75x", () => {
      const result = applyIntensityToWeighted(basePrescription, "Low");
      expect(result.sets).toBe(3); // 4 * 0.75 = 3
    });

    it("keeps reps the same", () => {
      const result = applyIntensityToWeighted(basePrescription, "Low");
      expect(result.reps).toBe(8); // 8 * 1.0 = 8
    });

    it("increases rest by 1.25x", () => {
      const result = applyIntensityToWeighted(basePrescription, "Low");
      expect(result.restSeconds).toBe(75); // 60 * 1.25 = 75
    });

    it("calculates weight at ~65% of 1RM", () => {
      const result = applyIntensityToWeighted(basePrescription, "Low", 200);
      expect(result.weight).toBe(130); // 200 * 0.65 = 130
      expect(result.percentOf1RM).toBe(65);
    });

    it("sets RPE target to 5-6", () => {
      const result = applyIntensityToWeighted(basePrescription, "Low");
      expect(result.rpeTarget).toEqual({ min: 5, max: 6 });
    });
  });

  describe("Moderate intensity", () => {
    it("keeps sets the same", () => {
      const result = applyIntensityToWeighted(basePrescription, "Moderate");
      expect(result.sets).toBe(4);
    });

    it("keeps reps the same", () => {
      const result = applyIntensityToWeighted(basePrescription, "Moderate");
      expect(result.reps).toBe(8);
    });

    it("keeps rest the same", () => {
      const result = applyIntensityToWeighted(basePrescription, "Moderate");
      expect(result.restSeconds).toBe(60);
    });

    it("calculates weight at ~77.5% of 1RM", () => {
      const result = applyIntensityToWeighted(basePrescription, "Moderate", 200);
      expect(result.weight).toBe(155); // 200 * 0.775 = 155
      expect(result.percentOf1RM).toBe(78);
    });
  });

  describe("High intensity", () => {
    it("increases sets by 1.25x", () => {
      const result = applyIntensityToWeighted(basePrescription, "High");
      expect(result.sets).toBe(5); // 4 * 1.25 = 5
    });

    it("reduces reps by 0.85x", () => {
      const result = applyIntensityToWeighted(basePrescription, "High");
      expect(result.reps).toBe(7); // 8 * 0.85 = 6.8 ≈ 7
    });

    it("reduces rest by 0.75x", () => {
      const result = applyIntensityToWeighted(basePrescription, "High");
      expect(result.restSeconds).toBe(45); // 60 * 0.75 = 45
    });

    it("calculates weight at ~87.5% of 1RM", () => {
      const result = applyIntensityToWeighted(basePrescription, "High", 200);
      expect(result.weight).toBe(175); // 200 * 0.875 = 175
      expect(result.percentOf1RM).toBe(88);
    });

    it("sets RPE target to 8-9", () => {
      const result = applyIntensityToWeighted(basePrescription, "High");
      expect(result.rpeTarget).toEqual({ min: 8, max: 9 });
    });
  });

  describe("edge cases", () => {
    it("returns undefined weight if 1RM not provided", () => {
      const result = applyIntensityToWeighted(basePrescription, "High");
      expect(result.weight).toBeUndefined();
    });

    it("enforces minimum of 1 set", () => {
      const lowSets = { sets: 1, reps: 8, restSeconds: 60 };
      const result = applyIntensityToWeighted(lowSets, "Low");
      expect(result.sets).toBeGreaterThanOrEqual(1);
    });

    it("enforces minimum of 15 seconds rest", () => {
      const lowRest = { sets: 4, reps: 8, restSeconds: 10 };
      const result = applyIntensityToWeighted(lowRest, "High");
      expect(result.restSeconds).toBeGreaterThanOrEqual(15);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPLY INTENSITY TO BODYWEIGHT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("applyIntensityToBodyweight", () => {
  const basePrescription = { reps: "10", restSeconds: 30 };

  describe("Low intensity", () => {
    it("scales reps down by ~0.67x", () => {
      const result = applyIntensityToBodyweight(basePrescription, "Low", "push_up");
      expect(result.reps).toBe("7"); // 10 * 0.67 ≈ 7
    });

    it("uses easier variant if available", () => {
      const result = applyIntensityToBodyweight(
        basePrescription,
        "Low",
        "push_up",
        { easier: "incline_push_up", harder: "decline_push_up" }
      );
      expect(result.exerciseSlug).toBe("incline_push_up");
      expect(result.isSubstituted).toBe(true);
    });

    it("uses base exercise if no easier variant", () => {
      const result = applyIntensityToBodyweight(basePrescription, "Low", "push_up");
      expect(result.exerciseSlug).toBe("push_up");
      expect(result.isSubstituted).toBe(false);
    });
  });

  describe("Moderate intensity", () => {
    it("keeps reps the same", () => {
      const result = applyIntensityToBodyweight(basePrescription, "Moderate", "push_up");
      expect(result.reps).toBe("10");
    });

    it("uses base exercise", () => {
      const result = applyIntensityToBodyweight(
        basePrescription,
        "Moderate",
        "push_up",
        { easier: "incline_push_up", harder: "decline_push_up" }
      );
      expect(result.exerciseSlug).toBe("push_up");
      expect(result.isSubstituted).toBe(false);
    });
  });

  describe("High intensity", () => {
    it("scales reps up by ~1.33x", () => {
      const result = applyIntensityToBodyweight(basePrescription, "High", "push_up");
      expect(result.reps).toBe("13"); // 10 * 1.33 ≈ 13
    });

    it("uses harder variant if available", () => {
      const result = applyIntensityToBodyweight(
        basePrescription,
        "High",
        "push_up",
        { easier: "incline_push_up", harder: "decline_push_up" }
      );
      expect(result.exerciseSlug).toBe("decline_push_up");
      expect(result.isSubstituted).toBe(true);
    });
  });

  describe("duration exercises", () => {
    it("scales plank duration correctly at Low intensity", () => {
      const plankPrescription = { reps: "30s", restSeconds: 30 };
      const result = applyIntensityToBodyweight(plankPrescription, "Low", "plank");
      expect(result.reps).toBe("20s"); // 30 * 0.67 ≈ 20
    });

    it("scales plank duration correctly at High intensity", () => {
      const plankPrescription = { reps: "30s", restSeconds: 30 };
      const result = applyIntensityToBodyweight(plankPrescription, "High", "plank");
      expect(result.reps).toBe("40s"); // 30 * 1.33 ≈ 40
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1RM CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("calculateOneRepMax", () => {
  it("calculates 1RM using Epley formula", () => {
    // 1RM = weight × (1 + reps/30)
    // 100 × (1 + 10/30) = 100 × 1.333 = 133
    expect(calculateOneRepMax(100, 10)).toBe(133);
  });

  it("returns weight as-is for 1 rep", () => {
    expect(calculateOneRepMax(200, 1)).toBe(200);
  });

  it("returns 0 for invalid inputs", () => {
    expect(calculateOneRepMax(0, 10)).toBe(0);
    expect(calculateOneRepMax(100, 0)).toBe(0);
    expect(calculateOneRepMax(-100, 10)).toBe(0);
    expect(calculateOneRepMax(100, -5)).toBe(0);
  });

  it("handles various rep ranges correctly", () => {
    // 135 × (1 + 5/30) = 135 × 1.167 = 158
    expect(calculateOneRepMax(135, 5)).toBe(158);
    
    // 225 × (1 + 3/30) = 225 × 1.1 = 248
    expect(calculateOneRepMax(225, 3)).toBe(248);
  });
});

describe("calculateTargetWeight", () => {
  it("calculates target weight from 1RM and percentage", () => {
    expect(calculateTargetWeight(200, 0.85)).toBe(170);
    expect(calculateTargetWeight(200, 0.65)).toBe(130);
  });

  it("rounds to nearest 2.5", () => {
    // 200 * 0.78 = 156, rounded to 155
    expect(calculateTargetWeight(200, 0.78)).toBe(155);
    
    // 200 * 0.76 = 152, rounded to 152.5
    expect(calculateTargetWeight(200, 0.76)).toBe(152.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE TYPE DETECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("isBodyweightExercise", () => {
  it("returns true for undefined equipment", () => {
    expect(isBodyweightExercise(undefined)).toBe(true);
  });

  it("returns true for empty equipment array", () => {
    expect(isBodyweightExercise([])).toBe(true);
  });

  it('returns true for equipment containing only "bodyweight"', () => {
    expect(isBodyweightExercise(["bodyweight"])).toBe(true);
  });

  it("returns false for exercises with other equipment", () => {
    expect(isBodyweightExercise(["dumbbell"])).toBe(false);
    expect(isBodyweightExercise(["barbell", "rack"])).toBe(false);
    expect(isBodyweightExercise(["bodyweight", "bench"])).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS - REAL WORLD SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Real World Scenarios", () => {
  describe("Back Squat with 200 lb 1RM", () => {
    const prescription = { sets: 4, reps: 8, restSeconds: 60 };
    const oneRepMax = 200;

    it("Low intensity: 3 sets × 8 reps @ 130 lbs, 75s rest", () => {
      const result = applyIntensityToWeighted(prescription, "Low", oneRepMax);
      expect(result.sets).toBe(3);
      expect(result.reps).toBe(8);
      expect(result.weight).toBe(130);
      expect(result.restSeconds).toBe(75);
    });

    it("Moderate intensity: 4 sets × 8 reps @ 155 lbs, 60s rest", () => {
      const result = applyIntensityToWeighted(prescription, "Moderate", oneRepMax);
      expect(result.sets).toBe(4);
      expect(result.reps).toBe(8);
      expect(result.weight).toBe(155);
      expect(result.restSeconds).toBe(60);
    });

    it("High intensity: 5 sets × 7 reps @ 175 lbs, 45s rest", () => {
      const result = applyIntensityToWeighted(prescription, "High", oneRepMax);
      expect(result.sets).toBe(5);
      expect(result.reps).toBe(7);
      expect(result.weight).toBe(175);
      expect(result.restSeconds).toBe(45);
    });
  });

  describe("Plank progression", () => {
    const prescription = { reps: "30s", restSeconds: 30 };
    const progressions = { easier: "knee_plank", harder: "plank_shoulder_taps" };

    it("Low intensity: knee plank for 20s", () => {
      const result = applyIntensityToBodyweight(prescription, "Low", "plank", progressions);
      expect(result.exerciseSlug).toBe("knee_plank");
      expect(result.reps).toBe("20s");
    });

    it("Moderate intensity: standard plank for 30s", () => {
      const result = applyIntensityToBodyweight(prescription, "Moderate", "plank", progressions);
      expect(result.exerciseSlug).toBe("plank");
      expect(result.reps).toBe("30s");
    });

    it("High intensity: plank with shoulder taps for 40s", () => {
      const result = applyIntensityToBodyweight(prescription, "High", "plank", progressions);
      expect(result.exerciseSlug).toBe("plank_shoulder_taps");
      expect(result.reps).toBe("40s");
    });
  });

  describe("Push-up progression", () => {
    const prescription = { reps: "10", restSeconds: 30 };
    const progressions = { easier: "incline_push_up", harder: "decline_push_up" };

    it("Low intensity: incline push-ups × 7", () => {
      const result = applyIntensityToBodyweight(prescription, "Low", "push_up", progressions);
      expect(result.exerciseSlug).toBe("incline_push_up");
      expect(result.reps).toBe("7");
    });

    it("High intensity: decline push-ups × 13", () => {
      const result = applyIntensityToBodyweight(prescription, "High", "push_up", progressions);
      expect(result.exerciseSlug).toBe("decline_push_up");
      expect(result.reps).toBe("13");
    });
  });
});
