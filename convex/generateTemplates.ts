/**
 * Template Generator
 *
 * Generates all 1,008 program templates for full flexibility:
 * 4 Categories × 3 Phases × 3 Skill Levels × 4 Weeks × 7 Days = 1,008 templates
 *
 * Run via Convex dashboard: generateTemplates.generateAllTemplates({})
 *
 * Template Structure:
 * - Day 1: Lower Body A (Squat dominant)
 * - Day 2: Upper Body A (Push emphasis)
 * - Day 3: Power/Conditioning
 * - Day 4: Lower Body B (Hinge dominant)
 * - Day 5: Upper Body B (Pull emphasis)
 * - Day 6: Full Body / Athletic
 * - Day 7: Active Recovery / Mobility
 *
 * Phase Characteristics:
 * - GPP: Foundation (60-75% 1RM), tempo 3010, higher reps
 * - SPP: Sport-specific (75-85% 1RM), tempo 2010, moderate reps
 * - SSP: Peaking (85-90% 1RM), tempo X010, lower reps
 *
 * Week Progression:
 * - Week 1: Introduction (70% volume)
 * - Week 2: Build (85% volume)
 * - Week 3: Peak (100% volume)
 * - Week 4: Deload (60% volume)
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { generateWarmupPrescriptions } from "./warmupSequences";
import type { WarmupPhase, ExerciseSection } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Phase = "GPP" | "SPP" | "SSP";
type SkillLevel = "Novice" | "Moderate" | "Advanced";
type GppCategoryId = 1 | 2 | 3 | 4;

interface ExercisePrescription {
  exerciseSlug: string;
  sets: number;
  reps: string;
  tempo?: string;
  restSeconds: number;
  notes?: string;
  orderIndex: number;
  superset?: string;
  section?: ExerciseSection;
  warmupPhase?: WarmupPhase;
}

interface TemplateDefinition {
  gppCategoryId: GppCategoryId;
  phase: Phase;
  skillLevel: SkillLevel;
  week: number;
  day: number;
  name: string;
  description: string;
  estimatedDurationMinutes: number;
  exercises: ExercisePrescription[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const PHASES: Phase[] = ["GPP", "SPP", "SSP"];
const SKILL_LEVELS: SkillLevel[] = ["Novice", "Moderate", "Advanced"];
const CATEGORIES: GppCategoryId[] = [1, 2, 3, 4];
const WEEKS = [1, 2, 3, 4];
const DAYS = [1, 2, 3, 4, 5, 6, 7]; // Support up to 7 workout days per week

// Day type definitions for each workout day
type DayType = "lower_a" | "upper_a" | "power" | "lower_b" | "upper_b" | "full_body" | "recovery";
const DAY_TYPES: Record<number, DayType> = {
  1: "lower_a",    // Lower Body A - Squat dominant
  2: "upper_a",    // Upper Body A - Push emphasis
  3: "power",      // Power/Conditioning
  4: "lower_b",    // Lower Body B - Hinge dominant
  5: "upper_b",    // Upper Body B - Pull emphasis
  6: "full_body",  // Full Body / Athletic
  7: "recovery",   // Active Recovery / Mobility
};

const DAY_NAMES: Record<number, string> = {
  1: "Lower Body A",
  2: "Upper Body A",
  3: "Power & Conditioning",
  4: "Lower Body B",
  5: "Upper Body B",
  6: "Full Body Athletic",
  7: "Active Recovery",
};

// Week volume multipliers (relative to Week 3 = 100%)
const WEEK_VOLUME_MULTIPLIERS: Record<number, number> = {
  1: 0.7, // Introduction
  2: 0.85, // Build
  3: 1.0, // Peak
  4: 0.6, // Deload
};

// Phase characteristics
const PHASE_CONFIG: Record<
  Phase,
  {
    tempo: string;
    repsModifier: number; // Multiplier for base reps
    restModifier: number; // Multiplier for base rest
    focus: string;
  }
> = {
  GPP: {
    tempo: "3010",
    repsModifier: 1.2, // Higher reps
    restModifier: 1.0,
    focus: "Foundation, movement quality, work capacity",
  },
  SPP: {
    tempo: "2010",
    repsModifier: 1.0, // Moderate reps
    restModifier: 0.9,
    focus: "Sport-specific strength, power development",
  },
  SSP: {
    tempo: "X010",
    repsModifier: 0.8, // Lower reps, higher intensity
    restModifier: 1.1, // More rest for heavier loads
    focus: "Peaking, maintain gains, competition prep",
  },
};

// Skill level base parameters
const SKILL_CONFIG: Record<
  SkillLevel,
  {
    baseSets: number;
    baseReps: number;
    baseRest: number;
    complexity: "basic" | "moderate" | "advanced";
  }
> = {
  Novice: {
    baseSets: 3,
    baseReps: 12,
    baseRest: 60,
    complexity: "basic",
  },
  Moderate: {
    baseSets: 4,
    baseReps: 10,
    baseRest: 60,
    complexity: "moderate",
  },
  Advanced: {
    baseSets: 5,
    baseReps: 8,
    baseRest: 45,
    complexity: "advanced",
  },
};

// Category names for template naming
const CATEGORY_NAMES: Record<GppCategoryId, string> = {
  1: "Endurance",
  2: "Power",
  3: "Rotation",
  4: "Strength",
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE POOLS BY CATEGORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Exercise pools organized by:
 * - Category (1-4)
 * - Day (1=Lower, 2=Upper, 3=Power)
 * - Complexity (basic, moderate, advanced)
 */

// Warmup exercises by day type
// Cooldown exercises
const COOLDOWN_EXERCISES = ["90_90_hip_stretch", "hip_flexor_stretch"];

// Exercise pool type for each day type
type ExerciseComplexityPool = { basic: string[]; moderate: string[]; advanced: string[] };

// Type for category exercise pools
type CategoryExercisePools = Record<
  GppCategoryId,
  {
    lower_a: ExerciseComplexityPool;
    lower_b: ExerciseComplexityPool;
    upper_a: ExerciseComplexityPool;
    upper_b: ExerciseComplexityPool;
    power: ExerciseComplexityPool;
    full_body: ExerciseComplexityPool;
    recovery: ExerciseComplexityPool;
    core: ExerciseComplexityPool;
  }
>;

// ═══════════════════════════════════════════════════════════════════════════════
// GPP EXERCISE POOLS (General Physical Preparation)
// Focus: Foundation movements, movement quality, work capacity
// ═══════════════════════════════════════════════════════════════════════════════

const GPP_EXERCISE_POOLS: CategoryExercisePools = {
  // Category 1: Continuous/Directional (Soccer, etc.)
  // Emphasis: Single-leg stability, rotational core, conditioning
  1: {
    lower_a: {
      basic: ["goblet_squat", "romanian_deadlift", "reverse_lunge", "glute_bridge"],
      moderate: ["back_squat", "romanian_deadlift", "bulgarian_split_squat", "single_leg_rdl"],
      advanced: ["back_squat", "trap_bar_deadlift", "bulgarian_split_squat", "single_leg_deadlift"],
    },
    lower_b: {
      basic: ["romanian_deadlift", "goblet_squat", "lateral_lunge", "hip_thrust"],
      moderate: ["trap_bar_deadlift", "back_squat", "single_leg_rdl", "hip_thrust"],
      advanced: ["trap_bar_deadlift", "front_squat", "single_leg_rdl", "hip_thrust", "lateral_lunge"],
    },
    upper_a: {
      basic: ["push_up", "elevated_inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "inverted_row", "overhead_press", "pull_up", "face_pull"],
      advanced: ["db_bench_press", "feet_elevated_inverted_row", "overhead_press", "weighted_pull_up", "incline_db_press"],
    },
    upper_b: {
      basic: ["inverted_row", "push_up", "face_pull", "db_shoulder_press"],
      moderate: ["pull_up", "db_bench_press", "face_pull", "db_row", "overhead_press"],
      advanced: ["weighted_pull_up", "incline_db_press", "db_row", "overhead_press", "face_pull"],
    },
    power: {
      basic: ["pogo_hops", "med_ball_slam", "kettlebell_swing", "ascending_skater_jumps", "goblet_carry"],
      moderate: ["broad_jump", "med_ball_rotational_throw", "deceleration_skater_jump", "farmers_carry"],
      advanced: ["consecutive_broad_jumps", "box_jump", "lateral_single_leg_bounds", "suitcase_carry"],
    },
    full_body: {
      basic: ["goblet_squat", "push_up", "romanian_deadlift", "inverted_row", "kettlebell_swing"],
      moderate: ["back_squat", "db_bench_press", "romanian_deadlift", "db_row", "box_jump"],
      advanced: ["back_squat", "db_bench_press", "trap_bar_deadlift", "pull_up", "broad_jump"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["plank", "dead_bug", "bird_dog", "knee_side_plank"],
      moderate: ["pallof_press", "plank_shoulder_taps", "side_plank", "band_woodchop"],
      advanced: ["pallof_press_march", "hanging_leg_raise", "side_plank_hip_dip", "cable_woodchop"],
    },
  },

  // Category 2: Explosive/Vertical (Basketball, etc.)
  // Emphasis: Vertical power, landing mechanics, reactive strength
  2: {
    lower_a: {
      basic: ["goblet_squat", "hip_thrust", "reverse_lunge", "glute_bridge"],
      moderate: ["back_squat", "hip_thrust", "bulgarian_split_squat", "single_leg_rdl"],
      advanced: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "single_leg_hip_thrust"],
    },
    lower_b: {
      basic: ["hip_thrust", "goblet_squat", "walking_lunge", "glute_bridge"],
      moderate: ["romanian_deadlift", "back_squat", "hip_thrust", "reverse_lunge"],
      advanced: ["trap_bar_deadlift", "front_squat", "hip_thrust", "single_leg_rdl", "reverse_lunge"],
    },
    upper_a: {
      basic: ["push_up", "elevated_inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "lat_pulldown", "overhead_press", "inverted_row"],
      advanced: ["db_bench_press", "pull_up", "push_press", "weighted_pull_up", "incline_db_press"],
    },
    upper_b: {
      basic: ["inverted_row", "push_up", "face_pull", "db_row"],
      moderate: ["lat_pulldown", "db_bench_press", "db_row", "overhead_press", "face_pull"],
      advanced: ["pull_up", "incline_db_press", "db_row", "overhead_press", "weighted_pull_up"],
    },
    power: {
      basic: ["jump_squat", "pogo_hops", "med_ball_slam", "ascending_skater_jumps"],
      moderate: ["box_jump", "broad_jump", "med_ball_slam", "deceleration_skater_jump"],
      advanced: ["depth_jump", "drop_jump", "consecutive_broad_jumps", "lateral_single_leg_bounds"],
    },
    full_body: {
      basic: ["goblet_squat", "push_up", "hip_thrust", "inverted_row", "box_jump"],
      moderate: ["back_squat", "db_bench_press", "romanian_deadlift", "pull_up", "med_ball_slam"],
      advanced: ["front_squat", "db_bench_press", "trap_bar_deadlift", "weighted_pull_up", "depth_jump"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["plank", "dead_bug", "glute_bridge", "knee_side_plank"],
      moderate: ["pallof_press", "plank_shoulder_taps", "hanging_leg_raise", "side_plank"],
      advanced: ["toes_to_bar", "pallof_press_march", "side_plank_hip_dip", "cable_woodchop"],
    },
  },

  // Category 3: Rotational/Unilateral (Baseball, Tennis, Golf, etc.)
  // Emphasis: Anti-rotation, thoracic mobility, hip power
  3: {
    lower_a: {
      basic: ["goblet_squat", "kickstand_rdl", "lateral_lunge", "glute_bridge"],
      moderate: ["back_squat", "single_leg_rdl", "cossack_squat", "bulgarian_split_squat"],
      advanced: ["back_squat", "single_leg_deadlift", "assisted_pistol_squat", "deficit_reverse_lunge"],
    },
    lower_b: {
      basic: ["romanian_deadlift", "goblet_squat", "reverse_lunge", "hip_thrust"],
      moderate: ["single_leg_rdl", "back_squat", "lateral_lunge", "hip_thrust"],
      advanced: ["trap_bar_deadlift", "back_squat", "lateral_lunge", "single_leg_rdl", "hip_thrust"],
    },
    upper_a: {
      basic: ["push_up", "db_row", "sa_db_floor_press", "face_pull"],
      moderate: ["sa_db_bench_press", "db_row", "overhead_press", "inverted_row"],
      advanced: ["sa_rotational_bench_press", "kroc_row", "push_press", "pull_up"],
    },
    upper_b: {
      basic: ["db_row", "push_up", "face_pull", "inverted_row"],
      moderate: ["db_row", "db_bench_press", "inverted_row", "overhead_press", "face_pull"],
      advanced: ["db_row", "incline_db_press", "pull_up", "overhead_press", "face_pull"],
    },
    power: {
      basic: ["kneeling_med_ball_rotation", "med_ball_slam", "kettlebell_swing", "pogo_hops"],
      moderate: ["med_ball_rotational_throw", "cable_woodchop", "broad_jump", "deceleration_skater_jump"],
      advanced: ["rotational_med_ball_slam", "low_high_woodchop", "box_jump", "lateral_single_leg_bounds"],
    },
    full_body: {
      basic: ["goblet_squat", "push_up", "romanian_deadlift", "db_row", "med_ball_slam"],
      moderate: ["back_squat", "db_bench_press", "single_leg_rdl", "db_row", "med_ball_rotational_throw"],
      advanced: ["back_squat", "incline_db_press", "trap_bar_deadlift", "pull_up", "cable_woodchop"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["dead_bug", "bird_dog", "knee_side_plank", "lying_leg_raise"],
      moderate: ["pallof_press", "band_woodchop", "side_plank", "plank_shoulder_taps"],
      advanced: ["pallof_press_march", "cable_woodchop", "side_plank_hip_dip", "toes_to_bar"],
    },
  },

  // Category 4: General Strength (Football, Wrestling, etc.)
  // Emphasis: Bilateral strength, work capacity, grip endurance
  4: {
    lower_a: {
      basic: ["goblet_squat", "romanian_deadlift", "walking_lunge", "hip_thrust"],
      moderate: ["back_squat", "trap_bar_deadlift", "walking_lunge", "single_leg_rdl"],
      advanced: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
    },
    lower_b: {
      basic: ["romanian_deadlift", "goblet_squat", "hip_thrust", "reverse_lunge"],
      moderate: ["trap_bar_deadlift", "back_squat", "hip_thrust", "walking_lunge"],
      advanced: ["trap_bar_deadlift", "front_squat", "hip_thrust", "bulgarian_split_squat", "single_leg_rdl"],
    },
    upper_a: {
      basic: ["push_up", "elevated_inverted_row", "db_shoulder_press", "db_bench_press"],
      moderate: ["db_bench_press", "inverted_row", "overhead_press", "pull_up"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    upper_b: {
      basic: ["inverted_row", "push_up", "db_row", "face_pull"],
      moderate: ["db_row", "db_bench_press", "pull_up", "overhead_press", "face_pull"],
      advanced: ["weighted_pull_up", "incline_db_press", "db_row", "overhead_press", "face_pull"],
    },
    power: {
      basic: ["kettlebell_swing", "med_ball_slam", "goblet_carry", "farmers_carry"],
      moderate: ["kettlebell_swing", "sled_push", "farmers_carry", "suitcase_carry"],
      advanced: ["sled_push", "sled_pull", "trap_bar_carry", "zercher_carry"],
    },
    full_body: {
      basic: ["goblet_squat", "push_up", "romanian_deadlift", "inverted_row", "kettlebell_swing"],
      moderate: ["back_squat", "db_bench_press", "trap_bar_deadlift", "db_row", "sled_push"],
      advanced: ["back_squat", "db_bench_press", "trap_bar_deadlift", "weighted_pull_up", "sled_push"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["plank", "dead_bug", "glute_bridge", "knee_side_plank"],
      moderate: ["pallof_press", "plank_shoulder_taps", "side_plank", "hanging_leg_raise"],
      advanced: ["toes_to_bar", "pallof_press_march", "side_plank_hip_dip", "front_rack_carry"],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SPP EXERCISE POOLS (Sport-Specific Preparation)
// Focus: Sport-specific power, skill transfer, moderate intensity
// ═══════════════════════════════════════════════════════════════════════════════

const SPP_EXERCISE_POOLS: CategoryExercisePools = {
  // Category 1: Continuous/Directional (Soccer, etc.)
  // SPP Focus: Directional speed, reactive agility, endurance under fatigue
  1: {
    lower_a: {
      basic: ["goblet_squat", "single_leg_rdl", "lateral_lunge", "single_leg_glute_bridge"],
      moderate: ["back_squat", "single_leg_rdl", "lateral_step_up", "bulgarian_split_squat"],
      advanced: ["back_squat", "single_leg_deadlift", "cossack_squat", "deficit_reverse_lunge"],
    },
    lower_b: {
      basic: ["single_leg_rdl", "goblet_squat", "hip_thrust", "lateral_lunge"],
      moderate: ["single_leg_rdl", "back_squat", "hip_thrust", "lateral_step_up"],
      advanced: ["single_leg_deadlift", "back_squat", "hip_thrust", "cossack_squat"],
    },
    upper_a: {
      basic: ["push_up", "inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "pull_up", "push_press", "db_row"],
      advanced: ["db_bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    upper_b: {
      basic: ["inverted_row", "push_up", "face_pull", "db_row"],
      moderate: ["pull_up", "db_bench_press", "db_row", "push_press", "face_pull"],
      advanced: ["weighted_pull_up", "db_bench_press", "kroc_row", "push_press", "face_pull"],
    },
    power: {
      basic: ["broad_jump", "deceleration_skater_jump", "kettlebell_swing", "farmers_carry"],
      moderate: ["box_jump", "lateral_single_leg_bounds", "med_ball_rotational_throw", "suitcase_carry"],
      advanced: ["depth_jump", "consecutive_broad_jumps", "shuttle_sprint", "trap_bar_carry"],
    },
    full_body: {
      basic: ["goblet_squat", "push_up", "single_leg_rdl", "inverted_row", "broad_jump"],
      moderate: ["back_squat", "db_bench_press", "single_leg_rdl", "pull_up", "box_jump"],
      advanced: ["back_squat", "db_bench_press", "single_leg_deadlift", "weighted_pull_up", "depth_jump"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["pallof_press", "side_plank", "plank_shoulder_taps", "dead_bug"],
      moderate: ["pallof_press_march", "side_plank_hip_dip", "cable_woodchop", "hanging_leg_raise"],
      advanced: ["cable_woodchop", "toes_to_bar", "side_plank_hip_dip", "pallof_press_march"],
    },
  },

  // Category 2: Explosive/Vertical (Basketball, etc.)
  // SPP Focus: Vertical power, reactive jumping, landing mechanics
  2: {
    lower_a: {
      basic: ["back_squat", "hip_thrust", "step_up", "single_leg_glute_bridge"],
      moderate: ["front_squat", "single_leg_hip_thrust", "bulgarian_split_squat", "lateral_step_up"],
      advanced: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "nordic_curl"],
    },
    lower_b: {
      basic: ["hip_thrust", "back_squat", "reverse_lunge", "glute_bridge"],
      moderate: ["single_leg_hip_thrust", "front_squat", "step_up", "bulgarian_split_squat"],
      advanced: ["trap_bar_deadlift", "front_squat", "assisted_pistol_squat", "single_leg_hip_thrust"],
    },
    upper_a: {
      basic: ["push_up", "pull_up", "db_shoulder_press", "inverted_row"],
      moderate: ["db_bench_press", "weighted_pull_up", "push_press", "lat_pulldown"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "pull_up"],
    },
    upper_b: {
      basic: ["pull_up", "push_up", "inverted_row", "db_row"],
      moderate: ["weighted_pull_up", "db_bench_press", "lat_pulldown", "push_press", "face_pull"],
      advanced: ["weighted_pull_up", "bench_press", "pull_up", "push_press", "db_row"],
    },
    power: {
      basic: ["box_jump", "broad_jump", "med_ball_slam", "jump_squat"],
      moderate: ["depth_jump", "consecutive_broad_jumps", "med_ball_chest_pass", "split_squat_jump"],
      advanced: ["drop_jump", "depth_jump", "alternating_lunge_jump", "lateral_single_leg_bounds"],
    },
    full_body: {
      basic: ["back_squat", "push_up", "hip_thrust", "pull_up", "box_jump"],
      moderate: ["front_squat", "db_bench_press", "single_leg_hip_thrust", "weighted_pull_up", "depth_jump"],
      advanced: ["front_squat", "bench_press", "trap_bar_deadlift", "weighted_pull_up", "drop_jump"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["pallof_press", "hanging_leg_raise", "plank_shoulder_taps", "side_plank"],
      moderate: ["toes_to_bar", "pallof_press_march", "cable_woodchop", "side_plank_hip_dip"],
      advanced: ["toes_to_bar", "pallof_press_march", "cable_woodchop", "hanging_leg_raise"],
    },
  },

  // Category 3: Rotational/Unilateral (Baseball, Tennis, Golf, etc.)
  // SPP Focus: Rotational power transfer, hip-shoulder separation, anti-rotation
  3: {
    lower_a: {
      basic: ["back_squat", "single_leg_rdl", "cossack_squat", "lateral_lunge"],
      moderate: ["back_squat", "single_leg_deadlift", "lateral_step_up", "deficit_reverse_lunge"],
      advanced: ["front_squat", "single_leg_deadlift", "assisted_pistol_squat", "cossack_squat"],
    },
    lower_b: {
      basic: ["single_leg_rdl", "back_squat", "hip_thrust", "lateral_lunge"],
      moderate: ["single_leg_deadlift", "back_squat", "cossack_squat", "hip_thrust"],
      advanced: ["single_leg_deadlift", "front_squat", "cossack_squat", "hip_thrust", "lateral_step_up"],
    },
    upper_a: {
      basic: ["sa_db_bench_press", "db_row", "landmine_press", "face_pull"],
      moderate: ["sa_rotational_bench_press", "kroc_row", "push_press", "pull_up"],
      advanced: ["sa_rotational_bench_press", "kroc_row", "push_press", "weighted_pull_up"],
    },
    upper_b: {
      basic: ["db_row", "sa_db_bench_press", "face_pull", "inverted_row"],
      moderate: ["kroc_row", "sa_rotational_bench_press", "pull_up", "push_press", "face_pull"],
      advanced: ["kroc_row", "sa_rotational_bench_press", "weighted_pull_up", "push_press", "face_pull"],
    },
    power: {
      basic: ["med_ball_rotational_throw", "kneeling_med_ball_rotation", "broad_jump", "kettlebell_swing"],
      moderate: ["rotational_med_ball_slam", "med_ball_rotational_throw", "box_jump", "lateral_single_leg_bounds"],
      advanced: ["rotational_med_ball_slam", "low_high_woodchop", "depth_jump", "deceleration_skater_jump"],
    },
    full_body: {
      basic: ["back_squat", "sa_db_bench_press", "single_leg_rdl", "db_row", "med_ball_rotational_throw"],
      moderate: ["back_squat", "sa_rotational_bench_press", "single_leg_deadlift", "kroc_row", "rotational_med_ball_slam"],
      advanced: ["front_squat", "sa_rotational_bench_press", "single_leg_deadlift", "weighted_pull_up", "low_high_woodchop"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["pallof_press", "cable_woodchop", "side_plank", "band_woodchop"],
      moderate: ["pallof_press_march", "low_high_woodchop", "side_plank_hip_dip", "cable_woodchop"],
      advanced: ["pallof_press_march", "low_high_woodchop", "toes_to_bar", "side_plank_hip_dip"],
    },
  },

  // Category 4: General Strength (Football, Wrestling, etc.)
  // SPP Focus: Maximal strength, power under load, grip strength
  4: {
    lower_a: {
      basic: ["back_squat", "romanian_deadlift", "walking_lunge", "hip_thrust"],
      moderate: ["back_squat", "trap_bar_deadlift", "front_squat", "bulgarian_split_squat"],
      advanced: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
    },
    lower_b: {
      basic: ["romanian_deadlift", "back_squat", "hip_thrust", "walking_lunge"],
      moderate: ["trap_bar_deadlift", "back_squat", "hip_thrust", "front_squat"],
      advanced: ["conventional_deadlift", "back_squat", "hip_thrust", "nordic_curl", "front_squat"],
    },
    upper_a: {
      basic: ["db_bench_press", "pull_up", "overhead_press", "inverted_row"],
      moderate: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "chest_supported_row"],
    },
    upper_b: {
      basic: ["pull_up", "db_bench_press", "inverted_row", "overhead_press", "face_pull"],
      moderate: ["weighted_pull_up", "bench_press", "kroc_row", "push_press", "face_pull"],
      advanced: ["weighted_pull_up", "bench_press", "chest_supported_row", "push_press", "face_pull"],
    },
    power: {
      basic: ["kettlebell_swing", "sled_push", "farmers_carry", "med_ball_slam"],
      moderate: ["sled_push", "sled_pull", "trap_bar_carry", "med_ball_chest_pass"],
      advanced: ["sled_push", "sled_pull", "zercher_carry", "front_rack_carry"],
    },
    full_body: {
      basic: ["back_squat", "db_bench_press", "romanian_deadlift", "pull_up", "kettlebell_swing"],
      moderate: ["back_squat", "bench_press", "trap_bar_deadlift", "weighted_pull_up", "sled_push"],
      advanced: ["back_squat", "bench_press", "conventional_deadlift", "weighted_pull_up", "sled_push"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["pallof_press", "plank_shoulder_taps", "side_plank", "hanging_leg_raise"],
      moderate: ["toes_to_bar", "pallof_press_march", "side_plank_hip_dip", "cable_woodchop"],
      advanced: ["toes_to_bar", "front_rack_carry", "pallof_press_march", "cable_woodchop"],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SSP EXERCISE POOLS (Sport-Specific Peaking)
// Focus: Peak power expression, competition prep, maintain strength
// ═══════════════════════════════════════════════════════════════════════════════

const SSP_EXERCISE_POOLS: CategoryExercisePools = {
  // Category 1: Continuous/Directional (Soccer, etc.)
  // SSP Focus: Game-speed movements, reactive power, minimal fatigue
  1: {
    lower_a: {
      basic: ["back_squat", "single_leg_rdl", "bulgarian_split_squat", "hip_thrust"],
      moderate: ["back_squat", "single_leg_deadlift", "lateral_step_up", "single_leg_hip_thrust"],
      advanced: ["back_squat", "trap_bar_deadlift", "deficit_reverse_lunge", "single_leg_deadlift"],
    },
    lower_b: {
      basic: ["single_leg_rdl", "back_squat", "hip_thrust", "bulgarian_split_squat"],
      moderate: ["single_leg_deadlift", "back_squat", "single_leg_hip_thrust", "lateral_step_up"],
      advanced: ["trap_bar_deadlift", "back_squat", "single_leg_deadlift", "deficit_reverse_lunge"],
    },
    upper_a: {
      basic: ["db_bench_press", "pull_up", "push_press", "db_row"],
      moderate: ["db_bench_press", "weighted_pull_up", "push_press", "kroc_row"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    upper_b: {
      basic: ["pull_up", "db_bench_press", "db_row", "push_press", "face_pull"],
      moderate: ["weighted_pull_up", "db_bench_press", "kroc_row", "push_press", "face_pull"],
      advanced: ["weighted_pull_up", "bench_press", "kroc_row", "push_press", "face_pull"],
    },
    power: {
      basic: ["box_jump", "lateral_single_leg_bounds", "shuttle_sprint", "suitcase_carry"],
      moderate: ["depth_jump", "consecutive_broad_jumps", "sprint", "trap_bar_carry"],
      advanced: ["drop_jump", "lateral_single_leg_bounds", "sprint", "trap_bar_carry"],
    },
    full_body: {
      basic: ["back_squat", "db_bench_press", "single_leg_rdl", "pull_up", "box_jump"],
      moderate: ["back_squat", "db_bench_press", "single_leg_deadlift", "weighted_pull_up", "depth_jump"],
      advanced: ["back_squat", "bench_press", "trap_bar_deadlift", "weighted_pull_up", "drop_jump"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["pallof_press_march", "side_plank_hip_dip", "hanging_leg_raise", "cable_woodchop"],
      moderate: ["pallof_press_march", "toes_to_bar", "cable_woodchop", "side_plank_hip_dip"],
      advanced: ["toes_to_bar", "pallof_press_march", "cable_woodchop", "side_plank_hip_dip"],
    },
  },

  // Category 2: Explosive/Vertical (Basketball, etc.)
  // SSP Focus: Maximal vertical power, reactive strength, game-ready explosiveness
  2: {
    lower_a: {
      basic: ["front_squat", "hip_thrust", "bulgarian_split_squat", "single_leg_hip_thrust"],
      moderate: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "nordic_curl"],
      advanced: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "single_leg_hip_thrust"],
    },
    lower_b: {
      basic: ["hip_thrust", "front_squat", "single_leg_hip_thrust", "bulgarian_split_squat"],
      moderate: ["trap_bar_deadlift", "front_squat", "nordic_curl", "assisted_pistol_squat"],
      advanced: ["trap_bar_deadlift", "front_squat", "single_leg_hip_thrust", "assisted_pistol_squat"],
    },
    upper_a: {
      basic: ["db_bench_press", "weighted_pull_up", "push_press", "pull_up"],
      moderate: ["bench_press", "weighted_pull_up", "push_press", "explosive_pushup"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "plyo_push_up"],
    },
    upper_b: {
      basic: ["weighted_pull_up", "db_bench_press", "pull_up", "push_press", "face_pull"],
      moderate: ["weighted_pull_up", "bench_press", "explosive_pushup", "push_press", "db_row"],
      advanced: ["weighted_pull_up", "bench_press", "plyo_push_up", "push_press", "db_row"],
    },
    power: {
      basic: ["depth_jump", "box_jump", "med_ball_chest_pass", "split_squat_jump"],
      moderate: ["drop_jump", "depth_jump", "alternating_lunge_jump", "consecutive_broad_jumps"],
      advanced: ["drop_jump", "depth_jump", "lateral_single_leg_bounds", "standing_long_jump"],
    },
    full_body: {
      basic: ["front_squat", "db_bench_press", "hip_thrust", "weighted_pull_up", "depth_jump"],
      moderate: ["front_squat", "bench_press", "trap_bar_deadlift", "weighted_pull_up", "drop_jump"],
      advanced: ["front_squat", "bench_press", "trap_bar_deadlift", "weighted_pull_up", "drop_jump"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["toes_to_bar", "pallof_press_march", "hanging_leg_raise", "side_plank_hip_dip"],
      moderate: ["toes_to_bar", "pallof_press_march", "cable_woodchop", "side_plank_hip_dip"],
      advanced: ["toes_to_bar", "pallof_press_march", "cable_woodchop", "hanging_leg_raise"],
    },
  },

  // Category 3: Rotational/Unilateral (Baseball, Tennis, Golf, etc.)
  // SSP Focus: Peak rotational power, explosive hip rotation, competition-ready
  3: {
    lower_a: {
      basic: ["back_squat", "single_leg_deadlift", "cossack_squat", "lateral_step_up"],
      moderate: ["front_squat", "single_leg_deadlift", "assisted_pistol_squat", "deficit_reverse_lunge"],
      advanced: ["front_squat", "single_leg_deadlift", "assisted_pistol_squat", "cossack_squat"],
    },
    lower_b: {
      basic: ["single_leg_deadlift", "back_squat", "lateral_step_up", "cossack_squat"],
      moderate: ["single_leg_deadlift", "front_squat", "deficit_reverse_lunge", "assisted_pistol_squat"],
      advanced: ["single_leg_deadlift", "front_squat", "cossack_squat", "assisted_pistol_squat"],
    },
    upper_a: {
      basic: ["sa_rotational_bench_press", "kroc_row", "push_press", "pull_up"],
      moderate: ["sa_rotational_bench_press", "kroc_row", "push_press", "weighted_pull_up"],
      advanced: ["sa_rotational_bench_press", "kroc_row", "push_press", "weighted_pull_up"],
    },
    upper_b: {
      basic: ["kroc_row", "sa_rotational_bench_press", "pull_up", "push_press", "face_pull"],
      moderate: ["kroc_row", "sa_rotational_bench_press", "weighted_pull_up", "push_press", "face_pull"],
      advanced: ["kroc_row", "sa_rotational_bench_press", "weighted_pull_up", "push_press", "face_pull"],
    },
    power: {
      basic: ["rotational_med_ball_slam", "med_ball_rotational_throw", "box_jump", "deceleration_skater_jump"],
      moderate: ["rotational_med_ball_slam", "low_high_woodchop", "depth_jump", "lateral_single_leg_bounds"],
      advanced: ["rotational_med_ball_slam", "low_high_woodchop", "drop_jump", "lateral_single_leg_bounds"],
    },
    full_body: {
      basic: ["back_squat", "sa_rotational_bench_press", "single_leg_deadlift", "kroc_row", "rotational_med_ball_slam"],
      moderate: ["front_squat", "sa_rotational_bench_press", "single_leg_deadlift", "weighted_pull_up", "low_high_woodchop"],
      advanced: ["front_squat", "sa_rotational_bench_press", "single_leg_deadlift", "weighted_pull_up", "low_high_woodchop"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["pallof_press_march", "low_high_woodchop", "side_plank_hip_dip", "toes_to_bar"],
      moderate: ["pallof_press_march", "low_high_woodchop", "toes_to_bar", "cable_woodchop"],
      advanced: ["pallof_press_march", "low_high_woodchop", "toes_to_bar", "cable_woodchop"],
    },
  },

  // Category 4: General Strength (Football, Wrestling, etc.)
  // SSP Focus: Peak strength expression, power maintenance, competition prep
  4: {
    lower_a: {
      basic: ["back_squat", "trap_bar_deadlift", "front_squat", "hip_thrust"],
      moderate: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
      advanced: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
    },
    lower_b: {
      basic: ["trap_bar_deadlift", "back_squat", "hip_thrust", "front_squat"],
      moderate: ["conventional_deadlift", "back_squat", "nordic_curl", "front_squat"],
      advanced: ["conventional_deadlift", "back_squat", "nordic_curl", "front_squat"],
    },
    upper_a: {
      basic: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
      moderate: ["bench_press", "weighted_pull_up", "push_press", "chest_supported_row"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    upper_b: {
      basic: ["weighted_pull_up", "bench_press", "kroc_row", "push_press", "face_pull"],
      moderate: ["weighted_pull_up", "bench_press", "chest_supported_row", "push_press", "face_pull"],
      advanced: ["weighted_pull_up", "bench_press", "kroc_row", "push_press", "face_pull"],
    },
    power: {
      basic: ["sled_push", "sled_pull", "trap_bar_carry", "med_ball_chest_pass"],
      moderate: ["sled_push", "sled_pull", "zercher_carry", "front_rack_carry"],
      advanced: ["sled_push", "sled_pull", "zercher_carry", "front_rack_carry"],
    },
    full_body: {
      basic: ["back_squat", "bench_press", "trap_bar_deadlift", "weighted_pull_up", "sled_push"],
      moderate: ["back_squat", "bench_press", "conventional_deadlift", "weighted_pull_up", "sled_push"],
      advanced: ["back_squat", "bench_press", "conventional_deadlift", "weighted_pull_up", "sled_push"],
    },
    recovery: {
      basic: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "hip_flexor_stretch"],
      moderate: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "dead_bug"],
      advanced: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch", "thoracic_rotation", "bird_dog"],
    },
    core: {
      basic: ["toes_to_bar", "pallof_press_march", "front_rack_carry", "side_plank_hip_dip"],
      moderate: ["toes_to_bar", "front_rack_carry", "pallof_press_march", "cable_woodchop"],
      advanced: ["toes_to_bar", "front_rack_carry", "pallof_press_march", "cable_woodchop"],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE-TO-POOL MAPPING
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_EXERCISE_POOLS: Record<Phase, CategoryExercisePools> = {
  GPP: GPP_EXERCISE_POOLS,
  SPP: SPP_EXERCISE_POOLS,
  SSP: SSP_EXERCISE_POOLS,
};

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE GENERATION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function generateExercisePrescriptions(
  categoryId: GppCategoryId,
  phase: Phase,
  skillLevel: SkillLevel,
  week: number,
  day: number
): ExercisePrescription[] {
  const phaseConfig = PHASE_CONFIG[phase];
  const skillConfig = SKILL_CONFIG[skillLevel];
  const volumeMultiplier = WEEK_VOLUME_MULTIPLIERS[week];
  const pools = PHASE_EXERCISE_POOLS[phase][categoryId];
  const complexity = skillConfig.complexity;

  const exercises: ExercisePrescription[] = [];
  let orderIndex = 0;

  // Calculate adjusted parameters
  const adjustedSets = Math.max(2, Math.round(skillConfig.baseSets * volumeMultiplier));
  const adjustedReps = Math.round(skillConfig.baseReps * phaseConfig.repsModifier);
  const adjustedRest = Math.round(skillConfig.baseRest * phaseConfig.restModifier);

  // Get day type from DAY_TYPES mapping
  const dayType = DAY_TYPES[day] || "lower_a";

  // 1. Warmup (structured multi-phase protocol)
  const warmupPrescriptions = generateWarmupPrescriptions(dayType, false, 0);
  for (const wp of warmupPrescriptions) {
    exercises.push({
      exerciseSlug: wp.exerciseSlug,
      sets: wp.sets,
      reps: wp.reps,
      restSeconds: wp.restSeconds,
      orderIndex: orderIndex++,
      section: wp.section,
      warmupPhase: wp.warmupPhase,
    });
  }

  // Recovery day: all mobility/stretching exercises
  if (dayType === "recovery") {
    const recoveryPool = pools.recovery[complexity];
    for (const slug of recoveryPool.slice(0, 5)) {
      exercises.push({
        exerciseSlug: slug,
        sets: 2,
        reps: "30s each side",
        restSeconds: 30,
        notes: "Mobility",
        orderIndex: orderIndex++,
        section: "main",
      });
    }
    return exercises;
  }

  // 2. Main exercises (3-5 based on skill level)
  const mainPool = pools[dayType][complexity];
  const corePool = pools.core[complexity];

  // Full body day: fewer exercises per muscle group
  const mainExerciseCount = dayType === "full_body"
    ? (skillLevel === "Novice" ? 4 : skillLevel === "Moderate" ? 5 : 5)
    : (skillLevel === "Novice" ? 3 : skillLevel === "Moderate" ? 4 : 5);
  const selectedMain = mainPool.slice(0, mainExerciseCount);

  for (const slug of selectedMain) {
    const isCompound = ["back_squat", "trap_bar_deadlift", "front_squat", "db_bench_press", "overhead_press"].includes(slug);

    exercises.push({
      exerciseSlug: slug,
      sets: isCompound ? adjustedSets : Math.max(2, adjustedSets - 1),
      reps: `${adjustedReps - 2}-${adjustedReps}`,
      tempo: phaseConfig.tempo,
      restSeconds: isCompound ? adjustedRest + 15 : adjustedRest,
      orderIndex: orderIndex++,
      section: "main",
    });
  }

  // 3. Core exercise (1-2) - skip for full body to keep workout manageable
  if (dayType !== "full_body") {
    const coreCount = skillLevel === "Novice" ? 1 : 2;
    const selectedCore = corePool.slice(0, coreCount);

    for (const slug of selectedCore) {
      const isPlank = slug.includes("plank");
      exercises.push({
        exerciseSlug: slug,
        sets: Math.max(2, adjustedSets - 1),
        reps: isPlank ? "30s" : `${adjustedReps}`,
        restSeconds: 30,
        orderIndex: orderIndex++,
        section: "main",
      });
    }
  }

  // 4. Cooldown (1 exercise)
  const cooldownIndex = dayType.includes("lower") ? 0 : 1;
  const cooldownSlug = COOLDOWN_EXERCISES[cooldownIndex];
  exercises.push({
    exerciseSlug: cooldownSlug,
    sets: 1,
    reps: "30s each side",
    restSeconds: 0,
    notes: "Cooldown",
    orderIndex: orderIndex++,
    section: "main",
  });

  return exercises;
}

function generateTemplateName(
  categoryId: GppCategoryId,
  phase: Phase,
  skillLevel: SkillLevel,
  week: number,
  day: number
): string {
  const weekDescriptors = {
    1: "Foundation",
    2: "Build",
    3: "Peak",
    4: "Deload",
  };

  const dayName = DAY_NAMES[day] || `Day ${day}`;
  return `${dayName} - ${weekDescriptors[week as 1 | 2 | 3 | 4]}`;
}

function generateTemplateDescription(
  categoryId: GppCategoryId,
  phase: Phase,
  skillLevel: SkillLevel,
  week: number,
  day: number
): string {
  const phaseConfig = PHASE_CONFIG[phase];
  const weekDescriptions = {
    1: "Introduction week focusing on movement quality and establishing baseline.",
    2: "Building week with increased volume to drive adaptations.",
    3: "Peak week with highest training load of the phase.",
    4: "Deload week to recover and prepare for the next phase.",
  };

  return `${weekDescriptions[week as 1 | 2 | 3 | 4]} ${phaseConfig.focus}`;
}

function calculateDuration(exercises: ExercisePrescription[]): number {
  let totalSeconds = 0;

  for (const ex of exercises) {
    // Time per set (including execution + rest)
    const repsMatch = ex.reps.match(/(\d+)/);
    const reps = repsMatch ? parseInt(repsMatch[1]) : 10;
    const isTimeBased = ex.reps.includes("s") || ex.reps.includes("min");

    if (isTimeBased) {
      const seconds = ex.reps.includes("min") ? parseInt(ex.reps) * 60 : parseInt(ex.reps);
      totalSeconds += (seconds + ex.restSeconds) * ex.sets;
    } else {
      // Assume ~3 seconds per rep
      totalSeconds += (reps * 3 + ex.restSeconds) * ex.sets;
    }
  }

  // Add 5 minutes for transitions
  return Math.round(totalSeconds / 60) + 5;
}

function generateTemplate(
  categoryId: GppCategoryId,
  phase: Phase,
  skillLevel: SkillLevel,
  week: number,
  day: number
): TemplateDefinition {
  const exercises = generateExercisePrescriptions(categoryId, phase, skillLevel, week, day);

  return {
    gppCategoryId: categoryId,
    phase,
    skillLevel,
    week,
    day,
    name: generateTemplateName(categoryId, phase, skillLevel, week, day),
    description: generateTemplateDescription(categoryId, phase, skillLevel, week, day),
    estimatedDurationMinutes: calculateDuration(exercises),
    exercises,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVEX MUTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate and seed all 1,008 templates
 * 4 Categories × 3 Phases × 3 Skill Levels × 4 Weeks × 7 Days = 1,008
 */
export const generateAllTemplates = mutation({
  args: {
    dryRun: v.optional(v.boolean()), // If true, just return count without inserting
  },
  handler: async (ctx, args) => {
    const results = {
      total: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Build exercise slug -> ID map
    const allExercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map(allExercises.map((e) => [e.slug, e._id]));

    // Generate all combinations
    for (const categoryId of CATEGORIES) {
      for (const phase of PHASES) {
        for (const skillLevel of SKILL_LEVELS) {
          for (const week of WEEKS) {
            for (const day of DAYS) {
              results.total++;

              try {
                // Check if template already exists
                const existing = await ctx.db
                  .query("program_templates")
                  .withIndex("by_assignment", (q) =>
                    q
                      .eq("gppCategoryId", categoryId)
                      .eq("phase", phase)
                      .eq("skillLevel", skillLevel)
                      .eq("week", week)
                      .eq("day", day)
                  )
                  .first();

                if (existing) {
                  results.skipped++;
                  continue;
                }

                if (args.dryRun) {
                  results.created++;
                  continue;
                }

                // Generate template
                const template = generateTemplate(categoryId, phase, skillLevel, week, day);

                // Resolve exercise slugs to IDs
                const exercisesWithIds = template.exercises.map((ex) => {
                  const exerciseId = exerciseMap.get(ex.exerciseSlug);
                  if (!exerciseId) {
                    throw new Error(`Exercise not found: ${ex.exerciseSlug}`);
                  }
                  return {
                    exerciseId,
                    sets: ex.sets,
                    reps: ex.reps,
                    tempo: ex.tempo,
                    restSeconds: ex.restSeconds,
                    notes: ex.notes,
                    orderIndex: ex.orderIndex,
                    superset: ex.superset,
                    section: ex.section,
                    warmupPhase: ex.warmupPhase,
                  };
                });

                // Insert template
                await ctx.db.insert("program_templates", {
                  gppCategoryId: template.gppCategoryId,
                  phase: template.phase,
                  skillLevel: template.skillLevel,
                  week: template.week,
                  day: template.day,
                  name: template.name,
                  description: template.description,
                  estimatedDurationMinutes: template.estimatedDurationMinutes,
                  exercises: exercisesWithIds,
                });

                results.created++;
              } catch (error) {
                results.errors.push(
                  `Category ${categoryId}, ${phase}, ${skillLevel}, Week ${week}, Day ${day}: ${error}`
                );
              }
            }
          }
        }
      }
    }

    return {
      message: args.dryRun ? "Dry run complete" : "Template generation complete",
      ...results,
      breakdown: {
        categories: CATEGORIES.length,
        phases: PHASES.length,
        skillLevels: SKILL_LEVELS.length,
        weeks: WEEKS.length,
        days: DAYS.length,
        formula: `${CATEGORIES.length} × ${PHASES.length} × ${SKILL_LEVELS.length} × ${WEEKS.length} × ${DAYS.length} = ${CATEGORIES.length * PHASES.length * SKILL_LEVELS.length * WEEKS.length * DAYS.length}`,
      },
    };
  },
});

/**
 * Generate templates for a specific category only
 */
export const generateCategoryTemplates = mutation({
  args: {
    categoryId: v.number(),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const categoryId = args.categoryId as GppCategoryId;
    if (![1, 2, 3, 4].includes(categoryId)) {
      throw new Error("Invalid category ID. Must be 1, 2, 3, or 4.");
    }

    const results = {
      total: 0,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Build exercise slug -> ID map
    const allExercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map(allExercises.map((e) => [e.slug, e._id]));

    for (const phase of PHASES) {
      for (const skillLevel of SKILL_LEVELS) {
        for (const week of WEEKS) {
          for (const day of DAYS) {
            results.total++;

            try {
              const existing = await ctx.db
                .query("program_templates")
                .withIndex("by_assignment", (q) =>
                  q
                    .eq("gppCategoryId", categoryId)
                    .eq("phase", phase)
                    .eq("skillLevel", skillLevel)
                    .eq("week", week)
                    .eq("day", day)
                )
                .first();

              if (existing) {
                results.skipped++;
                continue;
              }

              if (args.dryRun) {
                results.created++;
                continue;
              }

              const template = generateTemplate(categoryId, phase, skillLevel, week, day);

              const exercisesWithIds = template.exercises.map((ex) => {
                const exerciseId = exerciseMap.get(ex.exerciseSlug);
                if (!exerciseId) {
                  throw new Error(`Exercise not found: ${ex.exerciseSlug}`);
                }
                return {
                  exerciseId,
                  sets: ex.sets,
                  reps: ex.reps,
                  tempo: ex.tempo,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes,
                  orderIndex: ex.orderIndex,
                  superset: ex.superset,
                  section: ex.section,
                  warmupPhase: ex.warmupPhase,
                };
              });

              await ctx.db.insert("program_templates", {
                gppCategoryId: template.gppCategoryId,
                phase: template.phase,
                skillLevel: template.skillLevel,
                week: template.week,
                day: template.day,
                name: template.name,
                description: template.description,
                estimatedDurationMinutes: template.estimatedDurationMinutes,
                exercises: exercisesWithIds,
              });

              results.created++;
            } catch (error) {
              results.errors.push(`${phase}, ${skillLevel}, Week ${week}, Day ${day}: ${error}`);
            }
          }
        }
      }
    }

    return {
      message: args.dryRun ? "Dry run complete" : `Category ${categoryId} templates generated`,
      categoryId,
      categoryName: CATEGORY_NAMES[categoryId],
      ...results,
    };
  },
});

/**
 * Preview a single template (for review before bulk generation)
 */
export const previewTemplate = query({
  args: {
    categoryId: v.number(),
    phase: v.union(v.literal("GPP"), v.literal("SPP"), v.literal("SSP")),
    skillLevel: v.union(v.literal("Novice"), v.literal("Moderate"), v.literal("Advanced")),
    week: v.number(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const template = generateTemplate(
      args.categoryId as GppCategoryId,
      args.phase,
      args.skillLevel,
      args.week,
      args.day
    );

    // Try to resolve exercise names for better preview
    const allExercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map(allExercises.map((e) => [e.slug, e.name]));

    return {
      ...template,
      exercises: template.exercises.map((ex) => ({
        ...ex,
        exerciseName: exerciseMap.get(ex.exerciseSlug) || ex.exerciseSlug,
      })),
    };
  },
});

/**
 * Get generation status - how many templates exist vs expected
 */
export const getGenerationStatus = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("program_templates").collect();

    const expected = CATEGORIES.length * PHASES.length * SKILL_LEVELS.length * WEEKS.length * DAYS.length;
    const existing = templates.length;

    // Count by category
    const byCategory: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const byPhase: Record<string, number> = { GPP: 0, SPP: 0, SSP: 0 };

    for (const t of templates) {
      byCategory[t.gppCategoryId]++;
      byPhase[t.phase]++;
    }

    return {
      expected,
      existing,
      remaining: expected - existing,
      percentComplete: Math.round((existing / expected) * 100),
      byCategory,
      byPhase,
      breakdown: {
        categories: CATEGORIES.length,
        phases: PHASES.length,
        skillLevels: SKILL_LEVELS.length,
        weeks: WEEKS.length,
        days: DAYS.length,
      },
    };
  },
});

/**
 * Clear all generated templates (for development - use with caution!)
 */
export const clearAllTemplates = mutation({
  args: {
    confirmClear: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.confirmClear) {
      throw new Error("Must confirm clear by passing confirmClear: true");
    }

    const templates = await ctx.db.query("program_templates").collect();
    let deleted = 0;

    for (const template of templates) {
      await ctx.db.delete(template._id);
      deleted++;
    }

    return {
      message: "All templates cleared",
      deleted,
    };
  },
});
