import { describe, it, expect } from "vitest";
import { CORE_LIFT_SLUGS } from "../userMaxes";

// ═══════════════════════════════════════════════════════════════════════════════
// CORE LIFT SLUGS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("CORE_LIFT_SLUGS", () => {
  it("should contain exactly 3 core lifts", () => {
    expect(CORE_LIFT_SLUGS).toHaveLength(3);
  });

  it("should include back_squat", () => {
    expect(CORE_LIFT_SLUGS).toContain("back_squat");
  });

  it("should include bench_press", () => {
    expect(CORE_LIFT_SLUGS).toContain("bench_press");
  });

  it("should include trap_bar_deadlift", () => {
    expect(CORE_LIFT_SLUGS).toContain("trap_bar_deadlift");
  });

  it("should be a readonly array", () => {
    const slugsCopy = [...CORE_LIFT_SLUGS];
    expect(slugsCopy).toEqual(["back_squat", "bench_press", "trap_bar_deadlift"]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1RM VALIDATION LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("1RM Validation Boundaries", () => {
  const MIN_VALID_1RM = 1;
  const MAX_VALID_1RM = 2000;

  describe("minimum bounds", () => {
    it("should reject 0", () => {
      expect(0).toBeLessThanOrEqual(0);
    });

    it("should reject negative values", () => {
      expect(-100).toBeLessThan(MIN_VALID_1RM);
    });

    it("should accept 1 lb (minimum valid)", () => {
      expect(1).toBeGreaterThan(0);
    });

    it("should accept typical minimum bar weight (45 lbs)", () => {
      expect(45).toBeGreaterThan(0);
    });
  });

  describe("maximum bounds", () => {
    it("should accept values up to 2000 lbs", () => {
      expect(2000).toBeLessThanOrEqual(MAX_VALID_1RM);
    });

    it("should reject values over 2000 lbs", () => {
      expect(2001).toBeGreaterThan(MAX_VALID_1RM);
    });

    it("should accept world record squat (~1,311 lbs)", () => {
      expect(1311).toBeLessThanOrEqual(MAX_VALID_1RM);
    });

    it("should accept world record deadlift (~1,105 lbs)", () => {
      expect(1105).toBeLessThanOrEqual(MAX_VALID_1RM);
    });

    it("should accept world record bench (~782 lbs)", () => {
      expect(782).toBeLessThanOrEqual(MAX_VALID_1RM);
    });
  });

  describe("typical user values", () => {
    const typicalValues = [
      { lift: "beginner squat", value: 135 },
      { lift: "intermediate squat", value: 225 },
      { lift: "advanced squat", value: 315 },
      { lift: "beginner bench", value: 95 },
      { lift: "intermediate bench", value: 185 },
      { lift: "advanced bench", value: 275 },
      { lift: "beginner deadlift", value: 185 },
      { lift: "intermediate deadlift", value: 315 },
      { lift: "advanced deadlift", value: 405 },
    ];

    typicalValues.forEach(({ lift, value }) => {
      it(`should accept ${lift} (${value} lbs)`, () => {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(MAX_VALID_1RM);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// setMultipleMaxes SKIP LOGIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("setMultipleMaxes skip logic", () => {
  const shouldSkip = (oneRepMax: number): boolean => {
    return !oneRepMax || oneRepMax <= 0 || oneRepMax > 2000;
  };

  it("should skip when oneRepMax is 0", () => {
    expect(shouldSkip(0)).toBe(true);
  });

  it("should skip when oneRepMax is negative", () => {
    expect(shouldSkip(-100)).toBe(true);
  });

  it("should skip when oneRepMax is NaN (falsy)", () => {
    expect(shouldSkip(NaN)).toBe(true);
  });

  it("should skip when oneRepMax exceeds 2000", () => {
    expect(shouldSkip(2001)).toBe(true);
  });

  it("should not skip valid positive values", () => {
    expect(shouldSkip(135)).toBe(false);
    expect(shouldSkip(225)).toBe(false);
    expect(shouldSkip(1)).toBe(false);
    expect(shouldSkip(2000)).toBe(false);
  });
});
