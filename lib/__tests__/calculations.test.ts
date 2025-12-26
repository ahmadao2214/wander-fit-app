import { describe, it, expect } from "vitest";
import { getSkillLevel, getTrainingPhase } from "../calculations";

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL LEVEL CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getSkillLevel", () => {
  describe("Novice level (< 1 year)", () => {
    it("returns 'Novice' for 0 years of experience", () => {
      expect(getSkillLevel(0)).toBe("Novice");
    });

    it("returns 'Novice' for 0.5 years of experience", () => {
      expect(getSkillLevel(0.5)).toBe("Novice");
    });

    it("returns 'Novice' for 0.99 years of experience", () => {
      expect(getSkillLevel(0.99)).toBe("Novice");
    });
  });

  describe("Moderate level (1-3 years)", () => {
    it("returns 'Moderate' for exactly 1 year (boundary)", () => {
      expect(getSkillLevel(1)).toBe("Moderate");
    });

    it("returns 'Moderate' for 2 years of experience", () => {
      expect(getSkillLevel(2)).toBe("Moderate");
    });

    it("returns 'Moderate' for 2.99 years of experience", () => {
      expect(getSkillLevel(2.99)).toBe("Moderate");
    });
  });

  describe("Advanced level (3+ years)", () => {
    it("returns 'Advanced' for exactly 3 years (boundary)", () => {
      expect(getSkillLevel(3)).toBe("Advanced");
    });

    it("returns 'Advanced' for 5 years of experience", () => {
      expect(getSkillLevel(5)).toBe("Advanced");
    });

    it("returns 'Advanced' for 10 years of experience", () => {
      expect(getSkillLevel(10)).toBe("Advanced");
    });

    it("returns 'Advanced' for 20+ years of experience", () => {
      expect(getSkillLevel(25)).toBe("Advanced");
    });
  });

  describe("Edge cases - Invalid inputs", () => {
    it("returns 'Novice' for negative years of experience (-1)", () => {
      expect(getSkillLevel(-1)).toBe("Novice");
    });

    it("returns 'Novice' for negative years of experience (-5)", () => {
      expect(getSkillLevel(-5)).toBe("Novice");
    });

    it("returns 'Novice' for negative decimal years (-0.5)", () => {
      expect(getSkillLevel(-0.5)).toBe("Novice");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRAINING PHASE CALCULATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getTrainingPhase", () => {
  describe("In-Season Prep (<= 4 weeks)", () => {
    it("returns 'In-Season Prep' for 1 week until season", () => {
      expect(getTrainingPhase(1)).toBe("In-Season Prep");
    });

    it("returns 'In-Season Prep' for 2 weeks until season", () => {
      expect(getTrainingPhase(2)).toBe("In-Season Prep");
    });

    it("returns 'In-Season Prep' for exactly 4 weeks (boundary)", () => {
      expect(getTrainingPhase(4)).toBe("In-Season Prep");
    });
  });

  describe("Pre-Season (5-8 weeks)", () => {
    it("returns 'Pre-Season' for 5 weeks until season", () => {
      expect(getTrainingPhase(5)).toBe("Pre-Season");
    });

    it("returns 'Pre-Season' for 6 weeks until season", () => {
      expect(getTrainingPhase(6)).toBe("Pre-Season");
    });

    it("returns 'Pre-Season' for exactly 8 weeks (boundary)", () => {
      expect(getTrainingPhase(8)).toBe("Pre-Season");
    });
  });

  describe("Off-Season (> 8 weeks)", () => {
    it("returns 'Off-Season' for 9 weeks until season", () => {
      expect(getTrainingPhase(9)).toBe("Off-Season");
    });

    it("returns 'Off-Season' for 12 weeks until season", () => {
      expect(getTrainingPhase(12)).toBe("Off-Season");
    });

    it("returns 'Off-Season' for 16 weeks until season", () => {
      expect(getTrainingPhase(16)).toBe("Off-Season");
    });

    it("returns 'Off-Season' for 20+ weeks until season", () => {
      expect(getTrainingPhase(24)).toBe("Off-Season");
    });
  });
});

