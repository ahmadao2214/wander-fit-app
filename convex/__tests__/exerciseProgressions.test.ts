import { describe, it, expect } from "vitest";
import { EXERCISES } from "../seedData";

/**
 * Exercise Progression Chain Tests
 *
 * TDD Phase 1: These tests define the expected progression chains
 * for all movement patterns. Tests will fail until exercises are added
 * to seedData.ts with proper progression links.
 *
 * See: docs/EXERCISE_PROGRESSION_MATRIX.md
 * See: docs/TDD_PLAN_EXERCISE_EXPANSION.md
 */

// ═══════════════════════════════════════════════════════════════════════════════
// UPPER BODY PUSH - VERTICAL
// ═══════════════════════════════════════════════════════════════════════════════

describe("Exercise Progression Chains", () => {
  describe("Upper Body Push - Vertical", () => {
    it("pike_pushup should progress to db_shoulder_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "pike_pushup");
      expect(exercise?.progressions?.harder).toBe("db_shoulder_press");
    });

    it("db_shoulder_press should have pike_pushup as easier and overhead_press as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "db_shoulder_press");
      expect(exercise?.progressions?.easier).toBe("pike_pushup");
      expect(exercise?.progressions?.harder).toBe("overhead_press");
    });

    it("overhead_press should have db_shoulder_press as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "overhead_press");
      expect(exercise?.progressions?.easier).toBe("db_shoulder_press");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPPER BODY PUSH - HORIZONTAL (UNILATERAL) - Greg's Feedback
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Upper Body Push - Horizontal (Unilateral)", () => {
    it("sa_db_floor_press should progress to sa_db_bench_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "sa_db_floor_press");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("sa_db_bench_press");
    });

    it("sa_db_bench_press should have sa_db_floor_press as easier and sa_rotational_bench_press as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "sa_db_bench_press");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("sa_db_floor_press");
      expect(exercise?.progressions?.harder).toBe("sa_rotational_bench_press");
    });

    it("sa_rotational_bench_press should have sa_db_bench_press as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "sa_rotational_bench_press");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("sa_db_bench_press");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPPER BODY PUSH - HORIZONTAL (BILATERAL)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Upper Body Push - Horizontal (Bilateral)", () => {
    it("incline_push_up → push_up → decline_push_up chain should exist", () => {
      const inclinePushUp = EXERCISES.find(e => e.slug === "incline_push_up");
      const pushUp = EXERCISES.find(e => e.slug === "push_up");
      const declinePushUp = EXERCISES.find(e => e.slug === "decline_push_up");

      expect(inclinePushUp?.progressions?.harder).toBe("push_up");
      expect(pushUp?.progressions?.easier).toBe("incline_push_up");
      expect(pushUp?.progressions?.harder).toBe("decline_push_up");
      expect(declinePushUp?.progressions?.easier).toBe("push_up");
    });

    it("db_bench_press → bench_press → incline_bench_press chain should exist", () => {
      const dbBenchPress = EXERCISES.find(e => e.slug === "db_bench_press");
      const benchPress = EXERCISES.find(e => e.slug === "bench_press");

      expect(dbBenchPress?.progressions?.harder).toBe("bench_press");
      expect(benchPress?.progressions?.easier).toBe("db_bench_press");
      expect(benchPress?.progressions?.harder).toBe("incline_bench_press");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPPER BODY PULL - VERTICAL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Upper Body Pull - Vertical", () => {
    it("assisted_pull_up → pull_up → weighted_pull_up chain should exist", () => {
      const assistedPullUp = EXERCISES.find(e => e.slug === "assisted_pull_up");
      const pullUp = EXERCISES.find(e => e.slug === "pull_up");
      const weightedPullUp = EXERCISES.find(e => e.slug === "weighted_pull_up");

      expect(assistedPullUp?.progressions?.harder).toBe("pull_up");
      expect(pullUp?.progressions?.easier).toBe("assisted_pull_up");
      expect(pullUp?.progressions?.harder).toBe("weighted_pull_up");
      expect(weightedPullUp?.progressions?.easier).toBe("pull_up");
    });

    it("scapular_pull_up should progress to negative_pull_up", () => {
      const exercise = EXERCISES.find(e => e.slug === "scapular_pull_up");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("negative_pull_up");
    });

    it("negative_pull_up should have scapular_pull_up as easier and assisted_pull_up as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "negative_pull_up");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("scapular_pull_up");
      expect(exercise?.progressions?.harder).toBe("assisted_pull_up");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UPPER BODY PULL - HORIZONTAL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Upper Body Pull - Horizontal", () => {
    it("elevated_inverted_row should progress to inverted_row", () => {
      const exercise = EXERCISES.find(e => e.slug === "elevated_inverted_row");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("inverted_row");
    });

    it("inverted_row should have elevated_inverted_row as easier and feet_elevated_inverted_row as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "inverted_row");
      expect(exercise?.progressions?.easier).toBe("elevated_inverted_row");
      expect(exercise?.progressions?.harder).toBe("feet_elevated_inverted_row");
    });

    it("feet_elevated_inverted_row should have inverted_row as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "feet_elevated_inverted_row");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("inverted_row");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOWER BODY PUSH - BILATERAL SQUAT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Lower Body Push - Bilateral Squat", () => {
    it("goblet_squat should have back_squat as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "goblet_squat");
      expect(exercise?.progressions?.harder).toBe("back_squat");
    });

    it("back_squat should have goblet_squat as easier and front_squat as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "back_squat");
      expect(exercise?.progressions?.easier).toBe("goblet_squat");
      expect(exercise?.progressions?.harder).toBe("front_squat");
    });

    it("front_squat should have back_squat as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "front_squat");
      expect(exercise?.progressions?.easier).toBe("back_squat");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOWER BODY PUSH - UNILATERAL SQUAT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Lower Body Push - Unilateral Squat", () => {
    it("single_leg_squat_box should progress to bulgarian_split_squat", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_leg_squat_box");
      expect(exercise?.progressions?.harder).toBe("bulgarian_split_squat");
    });

    it("bulgarian_split_squat should have single_leg_squat_box as easier and assisted_pistol_squat as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "bulgarian_split_squat");
      expect(exercise?.progressions?.easier).toBe("single_leg_squat_box");
      expect(exercise?.progressions?.harder).toBe("assisted_pistol_squat");
    });

    it("assisted_pistol_squat should have bulgarian_split_squat as easier (Greg's Feedback)", () => {
      const exercise = EXERCISES.find(e => e.slug === "assisted_pistol_squat");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("bulgarian_split_squat");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LOWER BODY PULL/HINGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Lower Body Pull/Hinge", () => {
    it("glute_bridge should progress to hip_thrust", () => {
      const exercise = EXERCISES.find(e => e.slug === "glute_bridge");
      expect(exercise?.progressions?.harder).toBe("hip_thrust");
    });

    it("hip_thrust should have glute_bridge as easier and single_leg_hip_thrust as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "hip_thrust");
      expect(exercise?.progressions?.easier).toBe("glute_bridge");
      expect(exercise?.progressions?.harder).toBe("single_leg_hip_thrust");
    });

    it("single_leg_hip_thrust should have hip_thrust as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_leg_hip_thrust");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("hip_thrust");
    });

    it("single_leg_glute_bridge should have glute_bridge as easier and hip_thrust as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_leg_glute_bridge");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("glute_bridge");
      expect(exercise?.progressions?.harder).toBe("hip_thrust");
    });

    it("kickstand_rdl should have romanian_deadlift as easier and single_leg_rdl as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "kickstand_rdl");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("romanian_deadlift");
      expect(exercise?.progressions?.harder).toBe("single_leg_rdl");
    });

    it("single_leg_rdl should have kickstand_rdl as easier and single_leg_deadlift as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_leg_rdl");
      expect(exercise?.progressions?.easier).toBe("kickstand_rdl");
      expect(exercise?.progressions?.harder).toBe("single_leg_deadlift");
    });

    it("single_leg_deadlift should have single_leg_rdl as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_leg_deadlift");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("single_leg_rdl");
    });

    it("romanian_deadlift should have kickstand_rdl as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "romanian_deadlift");
      expect(exercise?.progressions?.harder).toBe("kickstand_rdl");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CORE - ANTI-EXTENSION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Core - Anti-Extension", () => {
    it("knee_plank → plank → plank_shoulder_taps chain should exist", () => {
      const kneePlank = EXERCISES.find(e => e.slug === "knee_plank");
      const plank = EXERCISES.find(e => e.slug === "plank");
      const plankShoulderTaps = EXERCISES.find(e => e.slug === "plank_shoulder_taps");

      expect(kneePlank?.progressions?.harder).toBe("plank");
      expect(plank?.progressions?.easier).toBe("knee_plank");
      expect(plank?.progressions?.harder).toBe("plank_shoulder_taps");
      expect(plankShoulderTaps?.progressions?.easier).toBe("plank");
    });

    it("lying_leg_raise should progress to hanging_leg_raise", () => {
      const exercise = EXERCISES.find(e => e.slug === "lying_leg_raise");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("hanging_leg_raise");
    });

    it("hanging_leg_raise should have lying_leg_raise as easier and toes_to_bar as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "hanging_leg_raise");
      expect(exercise?.progressions?.easier).toBe("lying_leg_raise");
      expect(exercise?.progressions?.harder).toBe("toes_to_bar");
    });

    it("toes_to_bar should have hanging_leg_raise as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "toes_to_bar");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("hanging_leg_raise");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CORE - ANTI-LATERAL FLEXION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Core - Anti-Lateral Flexion", () => {
    it("knee_side_plank should progress to side_plank", () => {
      const exercise = EXERCISES.find(e => e.slug === "knee_side_plank");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("side_plank");
    });

    it("side_plank should have knee_side_plank as easier and side_plank_hip_dip as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "side_plank");
      expect(exercise?.progressions?.easier).toBe("knee_side_plank");
      expect(exercise?.progressions?.harder).toBe("side_plank_hip_dip");
    });

    it("side_plank_hip_dip should have side_plank as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "side_plank_hip_dip");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("side_plank");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CORE - ANTI-ROTATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Core - Anti-Rotation", () => {
    it("dead_bug should progress to pallof_press", () => {
      const exercise = EXERCISES.find(e => e.slug === "dead_bug");
      expect(exercise?.progressions?.harder).toBe("pallof_press");
    });

    it("pallof_press should have dead_bug as easier and pallof_press_march as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "pallof_press");
      expect(exercise?.progressions?.easier).toBe("dead_bug");
      expect(exercise?.progressions?.harder).toBe("pallof_press_march");
    });

    it("pallof_press_march should have pallof_press as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "pallof_press_march");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("pallof_press");
    });

    it("bird_dog should progress to bird_dog_band", () => {
      const exercise = EXERCISES.find(e => e.slug === "bird_dog");
      expect(exercise?.progressions?.harder).toBe("bird_dog_band");
    });

    it("bird_dog_band should have bird_dog as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "bird_dog_band");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("bird_dog");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ROTATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Rotation", () => {
    it("band_woodchop should progress to cable_woodchop", () => {
      const bandWoodchop = EXERCISES.find(e => e.slug === "band_woodchop");
      expect(bandWoodchop?.progressions?.harder).toBe("cable_woodchop");
    });

    it("cable_woodchop should have band_woodchop as easier and low_high_woodchop as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "cable_woodchop");
      expect(exercise?.progressions?.easier).toBe("band_woodchop");
      expect(exercise?.progressions?.harder).toBe("low_high_woodchop");
    });

    it("low_high_woodchop should have cable_woodchop as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "low_high_woodchop");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("cable_woodchop");
    });

    it("kneeling_med_ball_rotation should progress to med_ball_rotational_throw", () => {
      const exercise = EXERCISES.find(e => e.slug === "kneeling_med_ball_rotation");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("med_ball_rotational_throw");
    });

    it("med_ball_rotational_throw should have kneeling_med_ball_rotation as easier and rotational_med_ball_slam as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "med_ball_rotational_throw");
      expect(exercise?.progressions?.easier).toBe("kneeling_med_ball_rotation");
      expect(exercise?.progressions?.harder).toBe("rotational_med_ball_slam");
    });

    it("rotational_med_ball_slam should have med_ball_rotational_throw as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "rotational_med_ball_slam");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("med_ball_rotational_throw");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // LUNGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Lunge", () => {
    it("reverse_lunge should progress to walking_lunge", () => {
      const exercise = EXERCISES.find(e => e.slug === "reverse_lunge");
      expect(exercise?.progressions?.harder).toBe("walking_lunge");
    });

    it("walking_lunge should have reverse_lunge as easier and deficit_reverse_lunge as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "walking_lunge");
      expect(exercise?.progressions?.easier).toBe("reverse_lunge");
      expect(exercise?.progressions?.harder).toBe("deficit_reverse_lunge");
    });

    it("deficit_reverse_lunge should have walking_lunge as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "deficit_reverse_lunge");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("walking_lunge");
    });

    it("lateral_lunge should have lateral_step_up as easier and cossack_squat as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "lateral_lunge");
      expect(exercise?.progressions?.easier).toBe("lateral_step_up");
      expect(exercise?.progressions?.harder).toBe("cossack_squat");
    });

    it("lateral_step_up should have lateral_lunge as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "lateral_step_up");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("lateral_lunge");
    });

    it("cossack_squat should have lateral_lunge as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "cossack_squat");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("lateral_lunge");
    });

    it("low_box_step_up should progress to step_up", () => {
      const exercise = EXERCISES.find(e => e.slug === "low_box_step_up");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("step_up");
    });

    it("step_up should have low_box_step_up as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "step_up");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("low_box_step_up");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // JUMP - VERTICAL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Jump - Vertical", () => {
    it("jump_squat should progress to box_jump", () => {
      const exercise = EXERCISES.find(e => e.slug === "jump_squat");
      expect(exercise?.progressions?.harder).toBe("box_jump");
    });

    it("box_jump should have jump_squat as easier and depth_jump as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "box_jump");
      expect(exercise?.progressions?.easier).toBe("jump_squat");
      expect(exercise?.progressions?.harder).toBe("depth_jump");
    });

    it("depth_jump should have box_jump as easier and drop_jump as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "depth_jump");
      expect(exercise?.progressions?.easier).toBe("box_jump");
      expect(exercise?.progressions?.harder).toBe("drop_jump");
    });

    it("drop_jump should have depth_jump as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "drop_jump");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("depth_jump");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // JUMP - HORIZONTAL (Greg's Feedback: pogo_hops as easier)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Jump - Horizontal", () => {
    it("pogo_hops should progress to broad_jump (Greg's Feedback)", () => {
      const exercise = EXERCISES.find(e => e.slug === "pogo_hops");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("broad_jump");
    });

    it("broad_jump should have pogo_hops as easier and consecutive_broad_jumps as harder (Greg's Feedback)", () => {
      const exercise = EXERCISES.find(e => e.slug === "broad_jump");
      expect(exercise?.progressions?.easier).toBe("pogo_hops");
      expect(exercise?.progressions?.harder).toBe("consecutive_broad_jumps");
    });

    it("consecutive_broad_jumps should have broad_jump as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "consecutive_broad_jumps");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("broad_jump");
    });

    it("standing_long_jump should exist as horizontal jump variant", () => {
      const exercise = EXERCISES.find(e => e.slug === "standing_long_jump");
      expect(exercise).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // JUMP - LATERAL (Greg's Feedback)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Jump - Lateral (Greg's Feedback)", () => {
    it("ascending_skater_jumps should progress to deceleration_skater_jump", () => {
      const exercise = EXERCISES.find(e => e.slug === "ascending_skater_jumps");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("deceleration_skater_jump");
    });

    it("deceleration_skater_jump should have ascending_skater_jumps as easier and lateral_single_leg_bounds as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "deceleration_skater_jump");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("ascending_skater_jumps");
      expect(exercise?.progressions?.harder).toBe("lateral_single_leg_bounds");
    });

    it("lateral_single_leg_bounds should have deceleration_skater_jump as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "lateral_single_leg_bounds");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("deceleration_skater_jump");
    });

    it("skater_jump should have lateral_lunge as easier and skater_hops as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "skater_jump");
      expect(exercise?.progressions?.easier).toBe("lateral_lunge");
      expect(exercise?.progressions?.harder).toBe("skater_hops");
    });

    it("skater_hops should have skater_jump as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "skater_hops");
      expect(exercise?.progressions?.easier).toBe("skater_jump");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CARRY EXERCISES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Carry Exercises", () => {
    it("goblet_carry should progress to farmers_carry", () => {
      const exercise = EXERCISES.find(e => e.slug === "goblet_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("farmers_carry");
    });

    it("farmers_carry should have goblet_carry as easier and trap_bar_carry as harder", () => {
      const exercise = EXERCISES.find(e => e.slug === "farmers_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("goblet_carry");
      expect(exercise?.progressions?.harder).toBe("trap_bar_carry");
    });

    it("trap_bar_carry should have farmers_carry as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "trap_bar_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("farmers_carry");
    });

    it("suitcase_carry should progress to single_arm_overhead_carry", () => {
      const exercise = EXERCISES.find(e => e.slug === "suitcase_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("single_arm_overhead_carry");
    });

    it("single_arm_overhead_carry should have suitcase_carry as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "single_arm_overhead_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("suitcase_carry");
    });

    it("waiter_carry should progress to double_overhead_carry", () => {
      const exercise = EXERCISES.find(e => e.slug === "waiter_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("double_overhead_carry");
    });

    it("double_overhead_carry should have waiter_carry as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "double_overhead_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("waiter_carry");
    });

    it("front_rack_carry should progress to zercher_carry", () => {
      const exercise = EXERCISES.find(e => e.slug === "front_rack_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("zercher_carry");
    });

    it("zercher_carry should have front_rack_carry as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "zercher_carry");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("front_rack_carry");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EXPLOSIVE LUNGE
  // ═══════════════════════════════════════════════════════════════════════════════

  describe("Explosive Lunge", () => {
    it("split_squat_jump should progress to alternating_lunge_jump", () => {
      const exercise = EXERCISES.find(e => e.slug === "split_squat_jump");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.harder).toBe("alternating_lunge_jump");
    });

    it("alternating_lunge_jump should have split_squat_jump as easier", () => {
      const exercise = EXERCISES.find(e => e.slug === "alternating_lunge_jump");
      expect(exercise).toBeDefined();
      expect(exercise?.progressions?.easier).toBe("split_squat_jump");
    });
  });
});
