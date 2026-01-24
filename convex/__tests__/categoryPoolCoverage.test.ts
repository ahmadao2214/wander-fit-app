import { describe, it, expect } from "vitest";
import { EXERCISES, GPP_CATEGORIES, ALL_VALID_TAGS } from "../seedData";

/**
 * Category Exercise Pool Coverage Tests
 *
 * TDD Phase 1: These tests verify that each GPP category has adequate
 * exercise coverage for all required movement patterns.
 *
 * See: docs/CATEGORY_EXERCISE_EXPANSION_PLAN.md
 * See: docs/TDD_PLAN_EXERCISE_EXPANSION.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// MOVEMENT PATTERN COVERAGE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Category Exercise Pool Coverage", () => {
  describe("Movement pattern coverage across all exercises", () => {
    const requiredPatterns = [
      { tag: "squat", minCount: 5 },
      { tag: "hinge", minCount: 5 },
      { tag: "push", minCount: 10 },
      { tag: "pull", minCount: 8 },
      { tag: "core", minCount: 10 },
      { tag: "plyometric", minCount: 6 },
      { tag: "lunge", minCount: 5 },
      { tag: "rotation", minCount: 4 },
      { tag: "anti_rotation", minCount: 3 },
      { tag: "carry", minCount: 5 },
    ];

    for (const { tag, minCount } of requiredPatterns) {
      it(`should have at least ${minCount} exercises with "${tag}" tag`, () => {
        const exercisesWithTag = EXERCISES.filter(e => e.tags.includes(tag));
        expect(exercisesWithTag.length).toBeGreaterThanOrEqual(minCount);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARRY EXERCISES COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Carry exercises coverage", () => {
    it("should have at least 5 carry exercises for Category 4 (Strength)", () => {
      const carryExercises = EXERCISES.filter(e => e.tags.includes("carry"));
      expect(carryExercises.length).toBeGreaterThanOrEqual(5);
    });

    it("should have unilateral carry options", () => {
      const unilateralCarries = EXERCISES.filter(e =>
        e.tags.includes("carry") &&
        (e.tags.includes("unilateral") || e.tags.includes("single_arm"))
      );
      expect(unilateralCarries.length).toBeGreaterThanOrEqual(2);
    });

    it("should have bilateral carry options", () => {
      const bilateralCarries = EXERCISES.filter(e =>
        e.tags.includes("carry") &&
        (e.tags.includes("bilateral") || !e.tags.includes("unilateral"))
      );
      expect(bilateralCarries.length).toBeGreaterThanOrEqual(3);
    });

    it("should have overhead carry options", () => {
      const overheadCarries = EXERCISES.filter(e =>
        e.tags.includes("carry") &&
        e.slug.includes("overhead")
      );
      expect(overheadCarries.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UNILATERAL EXERCISE COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Unilateral exercise coverage", () => {
    it("should have unilateral squat options", () => {
      const unilateralSquats = EXERCISES.filter(e =>
        e.tags.includes("squat") &&
        (e.tags.includes("unilateral") || e.tags.includes("single_leg"))
      );
      expect(unilateralSquats.length).toBeGreaterThanOrEqual(3);
    });

    it("should have unilateral hinge options", () => {
      const unilateralHinges = EXERCISES.filter(e =>
        e.tags.includes("hinge") &&
        (e.tags.includes("unilateral") || e.tags.includes("single_leg"))
      );
      expect(unilateralHinges.length).toBeGreaterThanOrEqual(2);
    });

    it("should have unilateral push options", () => {
      const unilateralPushes = EXERCISES.filter(e =>
        e.tags.includes("push") &&
        (e.tags.includes("unilateral") || e.tags.includes("single_arm"))
      );
      expect(unilateralPushes.length).toBeGreaterThanOrEqual(3);
    });

    it("should have unilateral pull options", () => {
      const unilateralPulls = EXERCISES.filter(e =>
        e.tags.includes("pull") &&
        (e.tags.includes("unilateral") || e.tags.includes("single_arm"))
      );
      expect(unilateralPulls.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CATEGORY-SPECIFIC EXERCISE NEEDS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Category 1 (Endurance) specific exercises", () => {
    it("should have single-leg stability exercises", () => {
      const singleLegExercises = EXERCISES.filter(e => e.tags.includes("single_leg"));
      expect(singleLegExercises.length).toBeGreaterThanOrEqual(8);
    });

    it("should have rotational core exercises", () => {
      const rotationalCore = EXERCISES.filter(e =>
        e.tags.includes("core") && e.tags.includes("rotation")
      );
      expect(rotationalCore.length).toBeGreaterThanOrEqual(2);
    });

    it("should have conditioning exercises", () => {
      const conditioning = EXERCISES.filter(e => e.tags.includes("conditioning"));
      expect(conditioning.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Category 2 (Power) specific exercises", () => {
    it("should have vertical jump exercises", () => {
      const verticalJumps = EXERCISES.filter(e =>
        e.tags.includes("plyometric") &&
        (e.tags.includes("vertical") || e.slug.includes("box") || e.slug.includes("jump_squat"))
      );
      expect(verticalJumps.length).toBeGreaterThanOrEqual(3);
    });

    it("should have reactive exercises", () => {
      const reactive = EXERCISES.filter(e => e.tags.includes("reactive"));
      expect(reactive.length).toBeGreaterThanOrEqual(2);
    });

    it("should have power exercises", () => {
      const power = EXERCISES.filter(e => e.tags.includes("power"));
      expect(power.length).toBeGreaterThanOrEqual(8);
    });

    it("should have deceleration/landing exercises", () => {
      const deceleration = EXERCISES.filter(e =>
        e.tags.includes("deceleration_mechanics") ||
        e.slug.includes("depth") ||
        e.slug.includes("drop")
      );
      // Some should exist for landing mechanics training
      expect(deceleration.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Category 3 (Rotation) specific exercises", () => {
    it("should have anti-rotation exercises", () => {
      const antiRotation = EXERCISES.filter(e => e.tags.includes("anti_rotation"));
      expect(antiRotation.length).toBeGreaterThanOrEqual(5);
    });

    it("should have rotation exercises", () => {
      const rotation = EXERCISES.filter(e => e.tags.includes("rotation"));
      expect(rotation.length).toBeGreaterThanOrEqual(5);
    });

    it("should have thoracic mobility exercises", () => {
      const thoracic = EXERCISES.filter(e => e.tags.includes("thoracic"));
      expect(thoracic.length).toBeGreaterThanOrEqual(2);
    });

    it("should have unilateral strength exercises", () => {
      const unilateral = EXERCISES.filter(e =>
        e.tags.includes("unilateral") && e.tags.includes("strength")
      );
      expect(unilateral.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Category 4 (Strength) specific exercises", () => {
    it("should have compound strength exercises", () => {
      const compound = EXERCISES.filter(e => e.tags.includes("compound"));
      expect(compound.length).toBeGreaterThanOrEqual(5);
    });

    it("should have bilateral lower body exercises", () => {
      const bilateralLower = EXERCISES.filter(e =>
        e.tags.includes("lower_body") && e.tags.includes("bilateral")
      );
      expect(bilateralLower.length).toBeGreaterThanOrEqual(5);
    });

    it("should have grip endurance exercises (carries)", () => {
      const carryExercises = EXERCISES.filter(e => e.tags.includes("carry"));
      expect(carryExercises.length).toBeGreaterThanOrEqual(5);
    });

    it("should have work capacity exercises", () => {
      const workCapacity = EXERCISES.filter(e =>
        e.tags.includes("conditioning") || e.tags.includes("carry")
      );
      expect(workCapacity.length).toBeGreaterThanOrEqual(10);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DIFFICULTY DISTRIBUTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Difficulty distribution", () => {
    it("should have beginner exercises for each major pattern", () => {
      const beginnerSquat = EXERCISES.filter(e => e.tags.includes("squat") && e.difficulty === "beginner");
      const beginnerHinge = EXERCISES.filter(e => e.tags.includes("hinge") && e.difficulty === "beginner");
      const beginnerPush = EXERCISES.filter(e => e.tags.includes("push") && e.difficulty === "beginner");
      const beginnerPull = EXERCISES.filter(e => e.tags.includes("pull") && e.difficulty === "beginner");

      expect(beginnerSquat.length).toBeGreaterThanOrEqual(1);
      expect(beginnerHinge.length).toBeGreaterThanOrEqual(1);
      expect(beginnerPush.length).toBeGreaterThanOrEqual(1);
      expect(beginnerPull.length).toBeGreaterThanOrEqual(1);
    });

    it("should have advanced exercises for progression", () => {
      const advanced = EXERCISES.filter(e => e.difficulty === "advanced");
      expect(advanced.length).toBeGreaterThanOrEqual(3);
    });

    it("should have a good distribution across difficulty levels", () => {
      const beginner = EXERCISES.filter(e => e.difficulty === "beginner").length;
      const intermediate = EXERCISES.filter(e => e.difficulty === "intermediate").length;
      const advanced = EXERCISES.filter(e => e.difficulty === "advanced").length;

      // Should have a pyramid: more beginner than advanced
      expect(beginner).toBeGreaterThan(advanced);
      expect(intermediate).toBeGreaterThan(advanced);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // BODYWEIGHT ALTERNATIVE COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Bodyweight alternative coverage", () => {
    it("should have bodyweight options for major patterns", () => {
      const bodyweightExercises = EXERCISES.filter(e =>
        e.equipment.includes("bodyweight") || e.equipment.length === 0
      );

      const hasSquat = bodyweightExercises.some(e => e.tags.includes("squat"));
      const hasPush = bodyweightExercises.some(e => e.tags.includes("push"));
      const hasPull = bodyweightExercises.some(e => e.tags.includes("pull"));
      const hasCore = bodyweightExercises.some(e => e.tags.includes("core"));
      const hasPlyometric = bodyweightExercises.some(e => e.tags.includes("plyometric"));

      expect(hasSquat).toBe(true);
      expect(hasPush).toBe(true);
      expect(hasPull).toBe(true);
      expect(hasCore).toBe(true);
      expect(hasPlyometric).toBe(true);
    });

    it("should have at least 15 bodyweight exercises", () => {
      const bodyweight = EXERCISES.filter(e =>
        e.equipment.includes("bodyweight") ||
        e.equipment.length === 0 ||
        e.tags.includes("bodyweight")
      );
      expect(bodyweight.length).toBeGreaterThanOrEqual(15);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LATERAL/FRONTAL PLANE COVERAGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Lateral/Frontal plane coverage", () => {
    it("should have frontal plane exercises", () => {
      const frontal = EXERCISES.filter(e => e.tags.includes("frontal"));
      expect(frontal.length).toBeGreaterThanOrEqual(5);
    });

    it("should have lateral movement exercises", () => {
      const lateral = EXERCISES.filter(e =>
        e.slug.includes("lateral") || e.tags.includes("frontal")
      );
      expect(lateral.length).toBeGreaterThanOrEqual(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // TOTAL EXERCISE COUNT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Total exercise count", () => {
    it("should have at least 100 exercises after expansion", () => {
      expect(EXERCISES.length).toBeGreaterThanOrEqual(100);
    });

    it("should have unique slugs for all exercises", () => {
      const slugs = EXERCISES.map(e => e.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GPP CATEGORIES EXERCISE EMPHASIS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("GPP Categories should have appropriate exercise emphasis", () => {
    it("All 4 GPP categories should exist", () => {
      expect(GPP_CATEGORIES.length).toBe(4);
    });

    it("Category 1 should emphasize single-leg and conditioning", () => {
      const cat1 = GPP_CATEGORIES.find(c => c.categoryId === 1);
      expect(cat1?.tags).toContain("single_leg_stability");
    });

    it("Category 2 should emphasize vertical power and landing", () => {
      const cat2 = GPP_CATEGORIES.find(c => c.categoryId === 2);
      expect(cat2?.tags).toContain("vertical_power");
      expect(cat2?.tags).toContain("landing_tolerance");
    });

    it("Category 3 should emphasize anti-rotation and hip power", () => {
      const cat3 = GPP_CATEGORIES.find(c => c.categoryId === 3);
      expect(cat3?.tags).toContain("anti_rotation");
      expect(cat3?.tags).toContain("hip_power");
    });

    it("Category 4 should emphasize absolute strength and grip", () => {
      const cat4 = GPP_CATEGORIES.find(c => c.categoryId === 4);
      expect(cat4?.tags).toContain("absolute_strength");
      expect(cat4?.tags).toContain("grip_endurance");
    });
  });
});
