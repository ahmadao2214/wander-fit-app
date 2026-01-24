import { describe, it, expect } from "vitest";
import { getBodyweightVariant, BODYWEIGHT_VARIANT_MATRIX } from "../intensityScaling";
import { EXERCISES } from "../seedData";

/**
 * Bodyweight Variant Integration Tests
 *
 * TDD Phase 1: These tests verify that getBodyweightVariant() correctly
 * selects variants based on phase and experience when new progressions
 * are available.
 *
 * See: docs/CATEGORY_EXERCISE_EXPANSION_PLAN.md
 * See: docs/TDD_PLAN_EXERCISE_EXPANSION.md
 */

type Phase = "GPP" | "SPP" | "SSP";
type ExperienceBucket = "0-1" | "2-5" | "6+";

// Helper to get progressions for an exercise
const getProgressions = (slug: string) => {
  const exercise = EXERCISES.find(e => e.slug === slug);
  return exercise?.progressions;
};

// ═══════════════════════════════════════════════════════════════════════════════
// BODYWEIGHT VARIANT MATRIX VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("Bodyweight Variant Integration", () => {
  describe("BODYWEIGHT_VARIANT_MATRIX structure", () => {
    it("should have all three phases", () => {
      expect(BODYWEIGHT_VARIANT_MATRIX).toHaveProperty("GPP");
      expect(BODYWEIGHT_VARIANT_MATRIX).toHaveProperty("SPP");
      expect(BODYWEIGHT_VARIANT_MATRIX).toHaveProperty("SSP");
    });

    it("should have all experience buckets for each phase", () => {
      for (const phase of ["GPP", "SPP", "SSP"] as Phase[]) {
        expect(BODYWEIGHT_VARIANT_MATRIX[phase]).toHaveProperty("0-1");
        expect(BODYWEIGHT_VARIANT_MATRIX[phase]).toHaveProperty("2-5");
        expect(BODYWEIGHT_VARIANT_MATRIX[phase]).toHaveProperty("6+");
      }
    });

    it("GPP novice should use easier variant", () => {
      expect(BODYWEIGHT_VARIANT_MATRIX.GPP["0-1"]).toBe("easier");
    });

    it("GPP intermediate should use base variant", () => {
      expect(BODYWEIGHT_VARIANT_MATRIX.GPP["2-5"]).toBe("base");
    });

    it("SSP experienced should use harder variant", () => {
      expect(BODYWEIGHT_VARIANT_MATRIX.SSP["6+"]).toBe("harder");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // getBodyweightVariant WITH NEW EXERCISES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("getBodyweightVariant with new exercises", () => {
    describe("Side Plank progressions (knee_side_plank → side_plank → side_plank_hip_dip)", () => {
      it("should select knee_side_plank for GPP novice on side_plank", () => {
        const progressions = getProgressions("side_plank");
        if (!progressions?.easier) {
          // Test will fail if progressions not yet added - that's expected in TDD
          expect(progressions?.easier).toBe("knee_side_plank");
          return;
        }

        const result = getBodyweightVariant("side_plank", "GPP", "0-1", progressions);
        expect(result.slug).toBe("knee_side_plank");
        expect(result.isSubstituted).toBe(true);
      });

      it("should select side_plank for GPP intermediate on side_plank", () => {
        const progressions = getProgressions("side_plank");
        const result = getBodyweightVariant("side_plank", "GPP", "2-5", progressions);
        expect(result.slug).toBe("side_plank");
        expect(result.isSubstituted).toBe(false);
      });

      it("should select side_plank_hip_dip for SSP experienced on side_plank", () => {
        const progressions = getProgressions("side_plank");
        if (!progressions?.harder) {
          expect(progressions?.harder).toBe("side_plank_hip_dip");
          return;
        }

        const result = getBodyweightVariant("side_plank", "SSP", "6+", progressions);
        expect(result.slug).toBe("side_plank_hip_dip");
        expect(result.isSubstituted).toBe(true);
      });
    });

    describe("Broad Jump progressions (pogo_hops → broad_jump → consecutive_broad_jumps)", () => {
      it("should select pogo_hops for GPP novice on broad_jump (Greg's Feedback)", () => {
        const progressions = getProgressions("broad_jump");
        if (!progressions?.easier) {
          expect(progressions?.easier).toBe("pogo_hops");
          return;
        }

        const result = getBodyweightVariant("broad_jump", "GPP", "0-1", progressions);
        expect(result.slug).toBe("pogo_hops");
        expect(result.isSubstituted).toBe(true);
      });

      it("should select consecutive_broad_jumps for SSP experienced on broad_jump", () => {
        const progressions = getProgressions("broad_jump");
        if (!progressions?.harder) {
          expect(progressions?.harder).toBe("consecutive_broad_jumps");
          return;
        }

        const result = getBodyweightVariant("broad_jump", "SSP", "6+", progressions);
        expect(result.slug).toBe("consecutive_broad_jumps");
        expect(result.isSubstituted).toBe(true);
      });
    });

    describe("Hanging Leg Raise progressions (lying_leg_raise → hanging_leg_raise → toes_to_bar)", () => {
      it("should select lying_leg_raise for GPP novice on hanging_leg_raise", () => {
        const progressions = getProgressions("hanging_leg_raise");
        if (!progressions?.easier) {
          expect(progressions?.easier).toBe("lying_leg_raise");
          return;
        }

        const result = getBodyweightVariant("hanging_leg_raise", "GPP", "0-1", progressions);
        expect(result.slug).toBe("lying_leg_raise");
        expect(result.isSubstituted).toBe(true);
      });

      it("should select toes_to_bar for SSP experienced on hanging_leg_raise", () => {
        const progressions = getProgressions("hanging_leg_raise");
        if (!progressions?.harder) {
          expect(progressions?.harder).toBe("toes_to_bar");
          return;
        }

        const result = getBodyweightVariant("hanging_leg_raise", "SSP", "6+", progressions);
        expect(result.slug).toBe("toes_to_bar");
        expect(result.isSubstituted).toBe(true);
      });
    });

    describe("Pallof Press progressions (dead_bug → pallof_press → pallof_press_march)", () => {
      it("should select dead_bug for GPP novice on pallof_press", () => {
        const progressions = getProgressions("pallof_press");
        if (!progressions?.easier) {
          expect(progressions?.easier).toBe("dead_bug");
          return;
        }

        const result = getBodyweightVariant("pallof_press", "GPP", "0-1", progressions);
        expect(result.slug).toBe("dead_bug");
        expect(result.isSubstituted).toBe(true);
      });

      it("should select pallof_press_march for SSP experienced on pallof_press", () => {
        const progressions = getProgressions("pallof_press");
        if (!progressions?.harder) {
          expect(progressions?.harder).toBe("pallof_press_march");
          return;
        }

        const result = getBodyweightVariant("pallof_press", "SSP", "6+", progressions);
        expect(result.slug).toBe("pallof_press_march");
        expect(result.isSubstituted).toBe(true);
      });
    });

    describe("Plank progressions (already exist)", () => {
      it("should select knee_plank for GPP novice on plank", () => {
        const progressions = getProgressions("plank");
        const result = getBodyweightVariant("plank", "GPP", "0-1", progressions);
        expect(result.slug).toBe("knee_plank");
        expect(result.isSubstituted).toBe(true);
      });

      it("should select plank_shoulder_taps for SSP experienced on plank", () => {
        const progressions = getProgressions("plank");
        const result = getBodyweightVariant("plank", "SSP", "6+", progressions);
        expect(result.slug).toBe("plank_shoulder_taps");
        expect(result.isSubstituted).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REAL WORKOUT SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Real workout scenarios with new progressions", () => {
    it("12-year-old soccer player in GPP should get easier variants", () => {
      // Simulating: novice (0-1 years) in GPP phase
      const sideProgressions = getProgressions("side_plank");
      const jumpProgressions = getProgressions("broad_jump");

      if (sideProgressions?.easier) {
        const sideResult = getBodyweightVariant("side_plank", "GPP", "0-1", sideProgressions);
        expect(sideResult.slug).toBe("knee_side_plank");
      }

      if (jumpProgressions?.easier) {
        const jumpResult = getBodyweightVariant("broad_jump", "GPP", "0-1", jumpProgressions);
        expect(jumpResult.slug).toBe("pogo_hops");
      }
    });

    it("16-year-old basketball player in SPP should get base variants", () => {
      // Simulating: intermediate (2-5 years) in SPP phase
      const progressions = getProgressions("side_plank");
      const result = getBodyweightVariant("side_plank", "SPP", "2-5", progressions);
      expect(result.slug).toBe("side_plank"); // Base variant
      expect(result.isSubstituted).toBe(false);
    });

    it("18+ experienced football player in SSP should get harder variants", () => {
      // Simulating: experienced (6+ years) in SSP phase
      const sideProgressions = getProgressions("side_plank");
      const plankProgressions = getProgressions("plank");

      if (sideProgressions?.harder) {
        const sideResult = getBodyweightVariant("side_plank", "SSP", "6+", sideProgressions);
        expect(sideResult.slug).toBe("side_plank_hip_dip");
      }

      const plankResult = getBodyweightVariant("plank", "SSP", "6+", plankProgressions);
      expect(plankResult.slug).toBe("plank_shoulder_taps");
    });

    it("Beginner in SPP should still get base variant (not harder)", () => {
      // Even in SPP, a beginner doesn't jump to harder variants
      const progressions = getProgressions("plank");
      const result = getBodyweightVariant("plank", "SPP", "0-1", progressions);
      // SPP + novice = base according to BODYWEIGHT_VARIANT_MATRIX
      expect(result.slug).toBe("plank");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Edge cases", () => {
    it("should return base when progressions is undefined", () => {
      const result = getBodyweightVariant("some_exercise", "GPP", "0-1", undefined);
      expect(result.slug).toBe("some_exercise");
      expect(result.isSubstituted).toBe(false);
    });

    it("should return base when requested variant doesn't exist", () => {
      // GPP novice wants easier, but no easier exists
      const progressions = { harder: "some_harder_exercise" };
      const result = getBodyweightVariant("test_exercise", "GPP", "0-1", progressions);
      expect(result.slug).toBe("test_exercise");
      expect(result.isSubstituted).toBe(false);
    });

    it("should handle exercises at the end of a chain (no harder variant)", () => {
      // SSP experienced wants harder, but no harder exists
      const progressions = { easier: "some_easier_exercise" };
      const result = getBodyweightVariant("test_exercise", "SSP", "6+", progressions);
      expect(result.slug).toBe("test_exercise");
      expect(result.isSubstituted).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARRY EXERCISE VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Carry exercise variant selection", () => {
    it("should select goblet_carry for GPP novice on farmers_carry", () => {
      const progressions = getProgressions("farmers_carry");
      if (!progressions?.easier) {
        expect(progressions?.easier).toBe("goblet_carry");
        return;
      }

      const result = getBodyweightVariant("farmers_carry", "GPP", "0-1", progressions);
      expect(result.slug).toBe("goblet_carry");
      expect(result.isSubstituted).toBe(true);
    });

    it("should select trap_bar_carry for SSP experienced on farmers_carry", () => {
      const progressions = getProgressions("farmers_carry");
      if (!progressions?.harder) {
        expect(progressions?.harder).toBe("trap_bar_carry");
        return;
      }

      const result = getBodyweightVariant("farmers_carry", "SSP", "6+", progressions);
      expect(result.slug).toBe("trap_bar_carry");
      expect(result.isSubstituted).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LATERAL JUMP VARIANTS (Greg's Feedback)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Lateral jump variant selection (Greg's Feedback)", () => {
    it("should handle ascending_skater_jumps → deceleration_skater_jump → lateral_single_leg_bounds chain", () => {
      // Test the deceleration_skater_jump as the middle of the chain
      const progressions = getProgressions("deceleration_skater_jump");

      if (!progressions) {
        // Exercise doesn't exist yet - TDD will fail
        expect(progressions).toBeDefined();
        return;
      }

      // For GPP novice, should go to easier (ascending_skater_jumps)
      if (progressions.easier) {
        const noviceResult = getBodyweightVariant("deceleration_skater_jump", "GPP", "0-1", progressions);
        expect(noviceResult.slug).toBe("ascending_skater_jumps");
      }

      // For SSP experienced, should go to harder (lateral_single_leg_bounds)
      if (progressions.harder) {
        const expResult = getBodyweightVariant("deceleration_skater_jump", "SSP", "6+", progressions);
        expect(expResult.slug).toBe("lateral_single_leg_bounds");
      }
    });
  });
});
