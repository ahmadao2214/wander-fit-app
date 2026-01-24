import { describe, it, expect } from "vitest";
import { EXERCISES } from "../seedData";

/**
 * Progression Chain Completeness Tests
 *
 * TDD Phase 1: These tests verify that progression chains are complete
 * and bidirectional. Tests will fail until all progressions are properly
 * linked in seedData.ts.
 *
 * See: docs/EXERCISE_PROGRESSION_MATRIX.md
 * See: docs/TDD_PLAN_EXERCISE_EXPANSION.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ALL BODYWEIGHT EXERCISES SHOULD HAVE PROGRESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Progression Chain Completeness", () => {
  describe("Bodyweight exercises should have progressions", () => {
    // Get bodyweight exercises that should have progressions
    const bodyweightExercises = EXERCISES.filter(e => {
      // Check if it's a bodyweight exercise
      const isBodyweight = e.equipment?.length === 0 ||
        (e.equipment?.length === 1 && e.equipment[0] === "bodyweight") ||
        e.tags.includes("bodyweight");

      // Skip warmup/mobility exercises which don't need progressions
      const isWarmupOrMobility = e.tags.includes("warmup") || e.tags.includes("mobility") || e.tags.includes("cooldown");

      return isBodyweight && !isWarmupOrMobility;
    });

    // Group tests by whether exercise should have progressions
    const exercisesThatNeedProgressions = [
      "plank",
      "push_up",
      "pull_up",
      "side_plank",
      "dead_bug",
      "bird_dog",
      "glute_bridge",
      "broad_jump",
      "box_jump",
      "depth_jump",
      "skater_jump",
      "bodyweight_squat",
      "jump_squat",
      "inverted_row",
    ];

    for (const slug of exercisesThatNeedProgressions) {
      const exercise = EXERCISES.find(e => e.slug === slug);
      if (exercise) {
        it(`${slug} should have at least one progression (easier or harder)`, () => {
          const hasProgression =
            exercise.progressions?.easier ||
            exercise.progressions?.harder;
          expect(hasProgression).toBeTruthy();
        });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROGRESSION REFERENCES SHOULD BE VALID
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Progression references should be valid", () => {
    const allSlugs = new Set(EXERCISES.map(e => e.slug));

    // Test each exercise's progressions point to valid exercises
    for (const exercise of EXERCISES) {
      if (exercise.progressions?.easier) {
        it(`${exercise.slug}.progressions.easier ("${exercise.progressions.easier}") should reference valid exercise`, () => {
          expect(allSlugs.has(exercise.progressions!.easier!)).toBe(true);
        });
      }

      if (exercise.progressions?.harder) {
        it(`${exercise.slug}.progressions.harder ("${exercise.progressions.harder}") should reference valid exercise`, () => {
          expect(allSlugs.has(exercise.progressions!.harder!)).toBe(true);
        });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROGRESSION CHAINS SHOULD BE BIDIRECTIONAL (for linear chains)
  // Note: Some exercises have multiple valid progressions (e.g., pike_pushup and
  // half_kneeling_press both progress to db_shoulder_press). In these cases,
  // strict bidirectionality isn't required - we only test that the PRIMARY chain
  // is bidirectional.
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Primary progression chains should be bidirectional", () => {
    // Define the primary chains that MUST be bidirectional
    const primaryChains = [
      // Plank chain
      ["knee_plank", "plank", "plank_shoulder_taps"],
      // Push-up chain
      ["incline_push_up", "push_up", "decline_push_up"],
      // Pull-up chain
      ["scapular_pull_up", "negative_pull_up", "assisted_pull_up", "pull_up", "weighted_pull_up"],
      // Squat chain
      ["goblet_squat", "back_squat", "front_squat"],
      // Unilateral squat chain
      ["single_leg_squat_box", "bulgarian_split_squat", "assisted_pistol_squat"],
      // Hinge chain
      ["glute_bridge", "hip_thrust", "single_leg_hip_thrust"],
      // Side plank chain
      ["knee_side_plank", "side_plank", "side_plank_hip_dip"],
      // Anti-rotation chain
      ["dead_bug", "pallof_press", "pallof_press_march"],
      // Broad jump chain
      ["pogo_hops", "broad_jump", "consecutive_broad_jumps"],
      // Box jump chain
      ["jump_squat", "box_jump", "depth_jump", "drop_jump"],
      // Lateral jump chain
      ["ascending_skater_jumps", "deceleration_skater_jump", "lateral_single_leg_bounds"],
      // Farmer's carry chain
      ["goblet_carry", "farmers_carry", "trap_bar_carry"],
      // Lunge chain
      ["reverse_lunge", "walking_lunge", "deficit_reverse_lunge"],
      // Bilateral hinge chain
      ["romanian_deadlift", "trap_bar_deadlift", "conventional_deadlift"],
      // Unilateral hinge chain
      ["kickstand_rdl", "single_leg_rdl", "single_leg_deadlift"],
      // Inverted row chain
      ["elevated_inverted_row", "inverted_row", "feet_elevated_inverted_row"],
      // Hanging leg raise chain
      ["lying_leg_raise", "hanging_leg_raise", "toes_to_bar"],
      // Woodchop chain
      ["band_woodchop", "cable_woodchop", "low_high_woodchop"],
      // Unilateral press chain (Greg's feedback)
      ["sa_db_floor_press", "sa_db_bench_press", "sa_rotational_bench_press"],
    ];

    for (const chain of primaryChains) {
      for (let i = 0; i < chain.length - 1; i++) {
        const easierSlug = chain[i];
        const harderSlug = chain[i + 1];
        const easierExercise = EXERCISES.find(e => e.slug === easierSlug);
        const harderExercise = EXERCISES.find(e => e.slug === harderSlug);

        if (easierExercise && harderExercise) {
          it(`${easierSlug} → ${harderSlug}: forward link should exist`, () => {
            expect(easierExercise.progressions?.harder).toBe(harderSlug);
          });

          it(`${harderSlug} ← ${easierSlug}: reverse link should exist`, () => {
            expect(harderExercise.progressions?.easier).toBe(easierSlug);
          });
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // NO CIRCULAR PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("No circular progressions", () => {
    for (const exercise of EXERCISES) {
      if (exercise.progressions?.easier || exercise.progressions?.harder) {
        it(`${exercise.slug} should not have circular progression`, () => {
          // An exercise shouldn't point to itself
          expect(exercise.progressions?.easier).not.toBe(exercise.slug);
          expect(exercise.progressions?.harder).not.toBe(exercise.slug);

          // Easier and harder should be different
          if (exercise.progressions?.easier && exercise.progressions?.harder) {
            expect(exercise.progressions.easier).not.toBe(exercise.progressions.harder);
          }
        });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PROGRESSION CHAIN LENGTH VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Progression chains should have valid depths", () => {
    // Helper to walk the chain and check for cycles
    const getChainLength = (startSlug: string, direction: "easier" | "harder", visited = new Set<string>()): number => {
      if (visited.has(startSlug)) return -1; // Cycle detected
      visited.add(startSlug);

      const exercise = EXERCISES.find(e => e.slug === startSlug);
      if (!exercise?.progressions?.[direction]) return 1;

      const nextLength = getChainLength(exercise.progressions[direction]!, direction, visited);
      return nextLength === -1 ? -1 : 1 + nextLength;
    };

    // Sample exercises to check chain depths (not all, to keep test suite manageable)
    const exercisesToCheck = [
      "plank",
      "push_up",
      "pull_up",
      "goblet_squat",
      "broad_jump",
    ];

    for (const slug of exercisesToCheck) {
      const exercise = EXERCISES.find(e => e.slug === slug);
      if (exercise) {
        it(`${slug} should have no cycles in easier direction`, () => {
          const length = getChainLength(slug, "easier");
          expect(length).toBeGreaterThan(0); // -1 would indicate cycle
        });

        it(`${slug} should have no cycles in harder direction`, () => {
          const length = getChainLength(slug, "harder");
          expect(length).toBeGreaterThan(0); // -1 would indicate cycle
        });
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // KEY MOVEMENT PATTERNS SHOULD HAVE COMPLETE CHAINS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Key movement patterns should have complete chains", () => {
    // Define expected chain lengths for key patterns
    const expectedChains = [
      { name: "Plank chain", start: "knee_plank", minLength: 3 },
      { name: "Push-up chain", start: "incline_push_up", minLength: 3 },
      { name: "Pull-up chain", start: "assisted_pull_up", minLength: 3 },
      { name: "Squat chain", start: "goblet_squat", minLength: 3 },
      { name: "Broad jump chain", start: "pogo_hops", minLength: 3 },
      { name: "Farmer's carry chain", start: "goblet_carry", minLength: 3 },
    ];

    for (const { name, start, minLength } of expectedChains) {
      it(`${name} should have at least ${minLength} exercises`, () => {
        let count = 1;
        let currentSlug = start;
        const visited = new Set<string>();

        while (currentSlug && !visited.has(currentSlug)) {
          visited.add(currentSlug);
          const exercise = EXERCISES.find(e => e.slug === currentSlug);
          if (exercise?.progressions?.harder) {
            currentSlug = exercise.progressions.harder;
            count++;
          } else {
            break;
          }
        }

        expect(count).toBeGreaterThanOrEqual(minLength);
      });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CORE EXERCISES THAT NEED PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Core exercises should have complete progressions", () => {
    const coreExercises = [
      { slug: "side_plank", expectEasier: true, expectHarder: true },
      { slug: "pallof_press", expectEasier: true, expectHarder: true },
      { slug: "dead_bug", expectEasier: false, expectHarder: true },
      { slug: "bird_dog", expectEasier: false, expectHarder: true },
      { slug: "hanging_leg_raise", expectEasier: true, expectHarder: true },
    ];

    for (const { slug, expectEasier, expectHarder } of coreExercises) {
      const exercise = EXERCISES.find(e => e.slug === slug);
      if (exercise) {
        if (expectEasier) {
          it(`${slug} should have an easier progression`, () => {
            expect(exercise.progressions?.easier).toBeTruthy();
          });
        }
        if (expectHarder) {
          it(`${slug} should have a harder progression`, () => {
            expect(exercise.progressions?.harder).toBeTruthy();
          });
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PLYOMETRIC EXERCISES SHOULD HAVE PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Plyometric exercises should have progressions", () => {
    const plyoExercises = [
      { slug: "box_jump", expectEasier: true, expectHarder: true },
      { slug: "depth_jump", expectEasier: true, expectHarder: true },
      { slug: "broad_jump", expectEasier: true, expectHarder: true },
      { slug: "skater_jump", expectEasier: true, expectHarder: true },
    ];

    for (const { slug, expectEasier, expectHarder } of plyoExercises) {
      const exercise = EXERCISES.find(e => e.slug === slug);
      if (exercise) {
        if (expectEasier) {
          it(`${slug} should have an easier progression`, () => {
            expect(exercise.progressions?.easier).toBeTruthy();
          });
        }
        if (expectHarder) {
          it(`${slug} should have a harder progression`, () => {
            expect(exercise.progressions?.harder).toBeTruthy();
          });
        }
      }
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPOUND LIFTS SHOULD HAVE PROGRESSIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Compound lifts should have progressions", () => {
    const compoundLifts = [
      { slug: "back_squat", expectEasier: true, expectHarder: true },
      { slug: "bench_press", expectEasier: true, expectHarder: true },
      { slug: "romanian_deadlift", expectEasier: false, expectHarder: true },
      { slug: "overhead_press", expectEasier: true, expectHarder: false },
    ];

    for (const { slug, expectEasier, expectHarder } of compoundLifts) {
      const exercise = EXERCISES.find(e => e.slug === slug);
      if (exercise) {
        if (expectEasier) {
          it(`${slug} should have an easier progression`, () => {
            expect(exercise.progressions?.easier).toBeTruthy();
          });
        }
        if (expectHarder) {
          it(`${slug} should have a harder progression`, () => {
            expect(exercise.progressions?.harder).toBeTruthy();
          });
        }
      }
    }
  });
});
