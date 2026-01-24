import { describe, it, expect } from "vitest";
import { EXERCISES, ALL_VALID_TAGS, TAGS_GLOSSARY } from "../seedData";

/**
 * New Exercise Existence Tests
 *
 * TDD Phase 1: These tests verify that all new exercises exist
 * with proper fields. Tests will fail until exercises are added
 * to seedData.ts.
 *
 * See: docs/CATEGORY_EXERCISE_EXPANSION_PLAN.md
 * See: docs/TDD_PLAN_EXERCISE_EXPANSION.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// HIGH PRIORITY EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - High Priority", () => {
  const highPriorityExercises = [
    { slug: "single_leg_glute_bridge", pattern: "Hinge", tags: ["glute", "unilateral"] },
    { slug: "lying_leg_raise", pattern: "Core", tags: ["core"] },
    { slug: "knee_side_plank", pattern: "Core", tags: ["core", "anti_lateral_flexion"] },
    { slug: "side_plank_hip_dip", pattern: "Core", tags: ["core", "anti_lateral_flexion"] },
    { slug: "pallof_press_march", pattern: "Core", tags: ["core", "anti_rotation"] },
    { slug: "step_up", pattern: "Lunge", tags: ["lunge", "single_leg"] },
    { slug: "pogo_hops", pattern: "Jump", tags: ["plyometric", "reactive"] },
    { slug: "ascending_skater_jumps", pattern: "Jump", tags: ["plyometric", "frontal"] },
    { slug: "deceleration_skater_jump", pattern: "Jump", tags: ["plyometric"] },
    { slug: "lateral_single_leg_bounds", pattern: "Jump", tags: ["plyometric", "power"] },
  ];

  for (const { slug, pattern, tags } of highPriorityExercises) {
    describe(`${slug} (${pattern})`, () => {
      it(`should exist`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise).toBeDefined();
      });

      it(`should have a name`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.name).toBeTruthy();
      });

      it(`should have at least one tag`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.tags.length).toBeGreaterThan(0);
      });

      for (const tag of tags) {
        it(`should have "${tag}" tag`, () => {
          const exercise = EXERCISES.find(e => e.slug === slug);
          expect(exercise?.tags).toContain(tag);
        });
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UNILATERAL PRESS EXERCISES (Greg's Feedback)
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Unilateral Press (Greg's Feedback)", () => {
  const unilateralPressExercises = [
    { slug: "sa_db_floor_press", name: "Single Arm DB Floor Press" },
    { slug: "sa_db_bench_press", name: "Single Arm DB Bench Press" },
    { slug: "sa_rotational_bench_press", name: "Single Arm Rotational Bench Press" },
  ];

  for (const { slug, name } of unilateralPressExercises) {
    describe(`${slug}`, () => {
      it(`should exist with name "${name}"`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise).toBeDefined();
        expect(exercise?.name).toBe(name);
      });

      it(`should have unilateral tag`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.tags).toContain("unilateral");
      });

      it(`should have push tag`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.tags).toContain("push");
      });

      it(`should have single_arm tag`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.tags).toContain("single_arm");
      });

      it(`should require dumbbell`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.equipment).toContain("dumbbell");
      });
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CARRY PATTERN EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Carry Pattern", () => {
  const carryExercises = [
    { slug: "goblet_carry", name: "Goblet Carry", equipment: ["dumbbell", "kettlebell"] },
    { slug: "farmers_carry", name: "Farmer's Carry", equipment: ["dumbbell", "kettlebell"] },
    { slug: "trap_bar_carry", name: "Trap Bar Carry", equipment: ["trap_bar"] },
    { slug: "suitcase_carry", name: "Suitcase Carry", equipment: ["dumbbell", "kettlebell"] },
    { slug: "single_arm_overhead_carry", name: "Single Arm Overhead Carry", equipment: ["dumbbell", "kettlebell"] },
    { slug: "waiter_carry", name: "Waiter Carry", equipment: ["dumbbell", "kettlebell"] },
    { slug: "double_overhead_carry", name: "Double Overhead Carry", equipment: ["dumbbell", "kettlebell"] },
    { slug: "overhead_plate_carry", name: "Overhead Plate Carry", equipment: ["dumbbell"] },
    { slug: "front_rack_carry", name: "Front Rack Carry", equipment: ["kettlebell", "barbell"] },
    { slug: "zercher_carry", name: "Zercher Carry", equipment: ["barbell"] },
  ];

  for (const { slug, name, equipment } of carryExercises) {
    describe(`${slug}`, () => {
      it(`should exist with name "${name}"`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise).toBeDefined();
        expect(exercise?.name).toBe(name);
      });

      it(`should have carry tag`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        expect(exercise?.tags).toContain("carry");
      });

      it(`should have appropriate equipment`, () => {
        const exercise = EXERCISES.find(e => e.slug === slug);
        const hasRequiredEquipment = equipment.some(eq => exercise?.equipment.includes(eq));
        expect(hasRequiredEquipment).toBe(true);
      });
    });
  }

  it("should have carry tag in TAGS_GLOSSARY.movementPattern", () => {
    expect(TAGS_GLOSSARY.movementPattern).toContain("carry");
  });

  it("should have carry tag in ALL_VALID_TAGS", () => {
    expect(ALL_VALID_TAGS).toContain("carry");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY PUSH - VERTICAL EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Upper Body Push Vertical", () => {
  const exercises = [
    { slug: "wall_push_up", tags: ["push", "bodyweight"] },
    { slug: "wall_handstand_push_up", tags: ["push", "bodyweight", "vertical"] },
    { slug: "half_kneeling_press", tags: ["push", "unilateral", "vertical"] },
    { slug: "landmine_press", tags: ["push", "vertical"] },
    { slug: "push_press", tags: ["push", "power", "vertical"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY PUSH - HORIZONTAL EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Upper Body Push Horizontal", () => {
  const exercises = [
    { slug: "close_grip_bench_press", tags: ["push", "horizontal", "compound"] },
    { slug: "incline_bench_press", tags: ["push", "incline", "compound"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY PULL - VERTICAL EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Upper Body Pull Vertical", () => {
  const exercises = [
    { slug: "straight_arm_pulldown", tags: ["pull", "back"] },
    { slug: "close_grip_lat_pulldown", tags: ["pull", "back"] },
    { slug: "scapular_pull_up", tags: ["pull", "back", "bodyweight"] },
    { slug: "negative_pull_up", tags: ["pull", "back", "bodyweight"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY PULL - HORIZONTAL EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Upper Body Pull Horizontal", () => {
  const exercises = [
    { slug: "chest_supported_row", tags: ["pull", "back", "horizontal"] },
    { slug: "kroc_row", tags: ["pull", "back", "unilateral"] },
    { slug: "elevated_inverted_row", tags: ["pull", "back", "bodyweight"] },
    { slug: "feet_elevated_inverted_row", tags: ["pull", "back", "bodyweight"] },
    { slug: "cable_row", tags: ["pull", "back", "horizontal"] },
    { slug: "single_arm_cable_row", tags: ["pull", "back", "unilateral"] },
    { slug: "band_row", tags: ["pull", "back"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOWER BODY PUSH - SQUAT EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Lower Body Push", () => {
  it("should have assisted_pistol_squat (Greg's Feedback)", () => {
    const exercise = EXERCISES.find(e => e.slug === "assisted_pistol_squat");
    expect(exercise).toBeDefined();
    expect(exercise?.tags).toContain("squat");
    expect(exercise?.tags).toContain("single_leg");
    expect(exercise?.tags).toContain("unilateral");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOWER BODY PULL/HINGE EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Lower Body Hinge", () => {
  const exercises = [
    { slug: "conventional_deadlift", tags: ["hinge", "bilateral", "compound"] },
    { slug: "kickstand_rdl", tags: ["hinge", "unilateral"] },
    { slug: "single_leg_deadlift", tags: ["hinge", "unilateral", "single_leg"] },
    { slug: "single_leg_hip_thrust", tags: ["hinge", "glute", "unilateral"] },
    { slug: "nordic_curl", tags: ["hamstring"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROTATION EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Rotation", () => {
  const exercises = [
    { slug: "kneeling_med_ball_rotation", tags: ["rotation", "core"] },
    { slug: "rotational_med_ball_slam", tags: ["rotation", "power"] },
    { slug: "low_high_woodchop", tags: ["rotation", "core"] },
    { slug: "standing_rotation_reach", tags: ["rotation", "mobility"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CORE EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Core", () => {
  const exercises = [
    { slug: "bird_dog_band", tags: ["core", "anti_rotation"] },
    { slug: "toes_to_bar", tags: ["core", "hip_flexor"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LUNGE EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Lunge", () => {
  const exercises = [
    { slug: "deficit_reverse_lunge", tags: ["lunge", "unilateral"] },
    { slug: "lateral_step_up", tags: ["lunge", "frontal"] },
    { slug: "cossack_squat", tags: ["lunge", "frontal", "mobility"] },
    { slug: "split_squat_jump", tags: ["lunge", "plyometric", "power"] },
    { slug: "alternating_lunge_jump", tags: ["lunge", "plyometric", "power"] },
    { slug: "low_box_step_up", tags: ["lunge", "single_leg"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// JUMP/PLYOMETRIC EXERCISES
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Exercises - Jump/Plyometric", () => {
  const exercises = [
    { slug: "consecutive_broad_jumps", tags: ["plyometric", "reactive", "horizontal"] },
    { slug: "drop_jump", tags: ["plyometric", "reactive", "power"] },
    { slug: "standing_long_jump", tags: ["plyometric", "horizontal"] },
  ];

  for (const { slug, tags } of exercises) {
    it(`should have ${slug}`, () => {
      const exercise = EXERCISES.find(e => e.slug === slug);
      expect(exercise).toBeDefined();
      for (const tag of tags) {
        expect(exercise?.tags).toContain(tag);
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NEW TAGS
// ═══════════════════════════════════════════════════════════════════════════════

describe("New Tags", () => {
  describe("deceleration_mechanics", () => {
    it("should be in TAGS_GLOSSARY.trainingQuality", () => {
      expect(TAGS_GLOSSARY.trainingQuality).toContain("deceleration_mechanics");
    });

    it("should be in ALL_VALID_TAGS", () => {
      expect(ALL_VALID_TAGS).toContain("deceleration_mechanics");
    });
  });

  describe("eccentric", () => {
    it("should be in TAGS_GLOSSARY.trainingQuality", () => {
      expect(TAGS_GLOSSARY.trainingQuality).toContain("eccentric");
    });

    it("should be in ALL_VALID_TAGS", () => {
      expect(ALL_VALID_TAGS).toContain("eccentric");
    });
  });

  describe("grip_endurance", () => {
    it("should be in TAGS_GLOSSARY.trainingQuality", () => {
      expect(TAGS_GLOSSARY.trainingQuality).toContain("grip_endurance");
    });

    it("should be in ALL_VALID_TAGS", () => {
      expect(ALL_VALID_TAGS).toContain("grip_endurance");
    });
  });
});
