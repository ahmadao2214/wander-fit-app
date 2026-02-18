/**
 * Template Generator
 *
 * Generates all 432 program templates for the MVP:
 * 4 Categories × 3 Phases × 3 Skill Levels × 4 Weeks × 3 Days = 432 templates
 *
 * Run via Convex dashboard: generateTemplates.generateAllTemplates({})
 *
 * Template Structure:
 * - Day 1: Lower Body (Squat, Hinge, Lunge, Core)
 * - Day 2: Upper Body (Push H+V, Pull H+V, Core)
 * - Day 3: Power/Conditioning (Plyometrics, Carries, Conditioning)
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

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Phase = "GPP" | "SPP" | "SSP";
type SkillLevel = "Novice" | "Moderate" | "Advanced";
type GppCategoryId = 1 | 2 | 3 | 4;

type ExerciseSection = "warmup" | "main" | "circuit" | "finisher";
type WarmupPhaseType = "foam_rolling" | "mobility" | "core_isometric" | "core_dynamic" | "walking_drills" | "movement_prep" | "power_primer";

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
  warmupPhase?: WarmupPhaseType;
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
const DAYS = [1, 2, 3]; // 3 workout days per week

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

// Warmup exercises (same for all categories)
const WARMUP_EXERCISES = {
  lower: ["cat_cow", "worlds_greatest_stretch", "90_90_hip_stretch"],
  upper: ["cat_cow", "thoracic_rotation", "dead_bug"],
  power: ["cat_cow", "bird_dog", "worlds_greatest_stretch"],
};

// Cooldown exercises
const COOLDOWN_EXERCISES = ["90_90_hip_stretch", "hip_flexor_stretch"];

// Type for category exercise pools
type CategoryExercisePools = Record<
  GppCategoryId,
  {
    lower: { basic: string[]; moderate: string[]; advanced: string[] };
    upper: { basic: string[]; moderate: string[]; advanced: string[] };
    power: { basic: string[]; moderate: string[]; advanced: string[] };
    core: { basic: string[]; moderate: string[]; advanced: string[] };
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
    lower: {
      basic: ["goblet_squat", "romanian_deadlift", "reverse_lunge", "glute_bridge"],
      moderate: ["back_squat", "romanian_deadlift", "bulgarian_split_squat", "single_leg_rdl"],
      advanced: ["back_squat", "trap_bar_deadlift", "bulgarian_split_squat", "single_leg_deadlift"],
    },
    upper: {
      basic: ["push_up", "elevated_inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "inverted_row", "overhead_press", "pull_up"],
      advanced: ["db_bench_press", "feet_elevated_inverted_row", "overhead_press", "weighted_pull_up"],
    },
    power: {
      basic: ["pogo_hops", "med_ball_slam", "kettlebell_swing", "ascending_skater_jumps", "goblet_carry"],
      moderate: ["broad_jump", "med_ball_rotational_throw", "deceleration_skater_jump", "farmers_carry"],
      advanced: ["consecutive_broad_jumps", "box_jump", "lateral_single_leg_bounds", "suitcase_carry"],
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
    lower: {
      basic: ["goblet_squat", "hip_thrust", "reverse_lunge", "glute_bridge"],
      moderate: ["back_squat", "hip_thrust", "bulgarian_split_squat", "single_leg_rdl"],
      advanced: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "single_leg_hip_thrust"],
    },
    upper: {
      basic: ["push_up", "elevated_inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "lat_pulldown", "overhead_press", "inverted_row"],
      advanced: ["db_bench_press", "pull_up", "push_press", "weighted_pull_up"],
    },
    power: {
      basic: ["jump_squat", "pogo_hops", "med_ball_slam", "ascending_skater_jumps"],
      moderate: ["box_jump", "broad_jump", "med_ball_slam", "deceleration_skater_jump"],
      advanced: ["depth_jump", "drop_jump", "consecutive_broad_jumps", "lateral_single_leg_bounds"],
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
    lower: {
      basic: ["goblet_squat", "kickstand_rdl", "lateral_lunge", "glute_bridge"],
      moderate: ["back_squat", "single_leg_rdl", "cossack_squat", "bulgarian_split_squat"],
      advanced: ["back_squat", "single_leg_deadlift", "assisted_pistol_squat", "deficit_reverse_lunge"],
    },
    upper: {
      basic: ["push_up", "db_row", "sa_db_floor_press", "face_pull"],
      moderate: ["sa_db_bench_press", "db_row", "overhead_press", "inverted_row"],
      advanced: ["sa_rotational_bench_press", "kroc_row", "push_press", "pull_up"],
    },
    power: {
      basic: ["kneeling_med_ball_rotation", "med_ball_slam", "kettlebell_swing", "pogo_hops"],
      moderate: ["med_ball_rotational_throw", "cable_woodchop", "broad_jump", "deceleration_skater_jump"],
      advanced: ["rotational_med_ball_slam", "low_high_woodchop", "box_jump", "lateral_single_leg_bounds"],
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
    lower: {
      basic: ["goblet_squat", "romanian_deadlift", "walking_lunge", "hip_thrust"],
      moderate: ["back_squat", "trap_bar_deadlift", "walking_lunge", "single_leg_rdl"],
      advanced: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
    },
    upper: {
      basic: ["push_up", "elevated_inverted_row", "db_shoulder_press", "db_bench_press"],
      moderate: ["db_bench_press", "inverted_row", "overhead_press", "pull_up"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    power: {
      basic: ["kettlebell_swing", "med_ball_slam", "goblet_carry", "farmers_carry"],
      moderate: ["kettlebell_swing", "sled_push", "farmers_carry", "suitcase_carry"],
      advanced: ["sled_push", "sled_pull", "trap_bar_carry", "zercher_carry"],
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
    lower: {
      basic: ["goblet_squat", "single_leg_rdl", "lateral_lunge", "single_leg_glute_bridge"],
      moderate: ["back_squat", "single_leg_rdl", "lateral_step_up", "bulgarian_split_squat"],
      advanced: ["back_squat", "single_leg_deadlift", "cossack_squat", "deficit_reverse_lunge"],
    },
    upper: {
      basic: ["push_up", "inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "pull_up", "push_press", "db_row"],
      advanced: ["db_bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    power: {
      basic: ["broad_jump", "deceleration_skater_jump", "kettlebell_swing", "farmers_carry"],
      moderate: ["box_jump", "lateral_single_leg_bounds", "med_ball_rotational_throw", "suitcase_carry"],
      advanced: ["depth_jump", "consecutive_broad_jumps", "shuttle_sprint", "trap_bar_carry"],
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
    lower: {
      basic: ["back_squat", "hip_thrust", "step_up", "single_leg_glute_bridge"],
      moderate: ["front_squat", "single_leg_hip_thrust", "bulgarian_split_squat", "lateral_step_up"],
      advanced: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "nordic_curl"],
    },
    upper: {
      basic: ["push_up", "pull_up", "db_shoulder_press", "inverted_row"],
      moderate: ["db_bench_press", "weighted_pull_up", "push_press", "lat_pulldown"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "pull_up"],
    },
    power: {
      basic: ["box_jump", "broad_jump", "med_ball_slam", "jump_squat"],
      moderate: ["depth_jump", "consecutive_broad_jumps", "med_ball_chest_pass", "split_squat_jump"],
      advanced: ["drop_jump", "depth_jump", "alternating_lunge_jump", "lateral_single_leg_bounds"],
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
    lower: {
      basic: ["back_squat", "single_leg_rdl", "cossack_squat", "lateral_lunge"],
      moderate: ["back_squat", "single_leg_deadlift", "lateral_step_up", "deficit_reverse_lunge"],
      advanced: ["front_squat", "single_leg_deadlift", "assisted_pistol_squat", "cossack_squat"],
    },
    upper: {
      basic: ["sa_db_bench_press", "db_row", "landmine_press", "face_pull"],
      moderate: ["sa_rotational_bench_press", "kroc_row", "push_press", "pull_up"],
      advanced: ["sa_rotational_bench_press", "kroc_row", "push_press", "weighted_pull_up"],
    },
    power: {
      basic: ["med_ball_rotational_throw", "kneeling_med_ball_rotation", "broad_jump", "kettlebell_swing"],
      moderate: ["rotational_med_ball_slam", "med_ball_rotational_throw", "box_jump", "lateral_single_leg_bounds"],
      advanced: ["rotational_med_ball_slam", "low_high_woodchop", "depth_jump", "deceleration_skater_jump"],
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
    lower: {
      basic: ["back_squat", "romanian_deadlift", "walking_lunge", "hip_thrust"],
      moderate: ["back_squat", "trap_bar_deadlift", "front_squat", "bulgarian_split_squat"],
      advanced: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
    },
    upper: {
      basic: ["db_bench_press", "pull_up", "overhead_press", "inverted_row"],
      moderate: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "chest_supported_row"],
    },
    power: {
      basic: ["kettlebell_swing", "sled_push", "farmers_carry", "med_ball_slam"],
      moderate: ["sled_push", "sled_pull", "trap_bar_carry", "med_ball_chest_pass"],
      advanced: ["sled_push", "sled_pull", "zercher_carry", "front_rack_carry"],
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
    lower: {
      basic: ["back_squat", "single_leg_rdl", "bulgarian_split_squat", "hip_thrust"],
      moderate: ["back_squat", "single_leg_deadlift", "lateral_step_up", "single_leg_hip_thrust"],
      advanced: ["back_squat", "trap_bar_deadlift", "deficit_reverse_lunge", "single_leg_deadlift"],
    },
    upper: {
      basic: ["db_bench_press", "pull_up", "push_press", "db_row"],
      moderate: ["db_bench_press", "weighted_pull_up", "push_press", "kroc_row"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    power: {
      basic: ["box_jump", "lateral_single_leg_bounds", "shuttle_sprint", "suitcase_carry"],
      moderate: ["depth_jump", "consecutive_broad_jumps", "sprint", "trap_bar_carry"],
      advanced: ["drop_jump", "lateral_single_leg_bounds", "sprint", "trap_bar_carry"],
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
    lower: {
      basic: ["front_squat", "hip_thrust", "bulgarian_split_squat", "single_leg_hip_thrust"],
      moderate: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "nordic_curl"],
      advanced: ["front_squat", "trap_bar_deadlift", "assisted_pistol_squat", "single_leg_hip_thrust"],
    },
    upper: {
      basic: ["db_bench_press", "weighted_pull_up", "push_press", "pull_up"],
      moderate: ["bench_press", "weighted_pull_up", "push_press", "explosive_pushup"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "plyo_push_up"],
    },
    power: {
      basic: ["depth_jump", "box_jump", "med_ball_chest_pass", "split_squat_jump"],
      moderate: ["drop_jump", "depth_jump", "alternating_lunge_jump", "consecutive_broad_jumps"],
      advanced: ["drop_jump", "depth_jump", "lateral_single_leg_bounds", "standing_long_jump"],
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
    lower: {
      basic: ["back_squat", "single_leg_deadlift", "cossack_squat", "lateral_step_up"],
      moderate: ["front_squat", "single_leg_deadlift", "assisted_pistol_squat", "deficit_reverse_lunge"],
      advanced: ["front_squat", "single_leg_deadlift", "assisted_pistol_squat", "cossack_squat"],
    },
    upper: {
      basic: ["sa_rotational_bench_press", "kroc_row", "push_press", "pull_up"],
      moderate: ["sa_rotational_bench_press", "kroc_row", "push_press", "weighted_pull_up"],
      advanced: ["sa_rotational_bench_press", "kroc_row", "push_press", "weighted_pull_up"],
    },
    power: {
      basic: ["rotational_med_ball_slam", "med_ball_rotational_throw", "box_jump", "deceleration_skater_jump"],
      moderate: ["rotational_med_ball_slam", "low_high_woodchop", "depth_jump", "lateral_single_leg_bounds"],
      advanced: ["rotational_med_ball_slam", "low_high_woodchop", "drop_jump", "lateral_single_leg_bounds"],
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
    lower: {
      basic: ["back_squat", "trap_bar_deadlift", "front_squat", "hip_thrust"],
      moderate: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
      advanced: ["back_squat", "conventional_deadlift", "front_squat", "nordic_curl"],
    },
    upper: {
      basic: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
      moderate: ["bench_press", "weighted_pull_up", "push_press", "chest_supported_row"],
      advanced: ["bench_press", "weighted_pull_up", "push_press", "kroc_row"],
    },
    power: {
      basic: ["sled_push", "sled_pull", "trap_bar_carry", "med_ball_chest_pass"],
      moderate: ["sled_push", "sled_pull", "zercher_carry", "front_rack_carry"],
      advanced: ["sled_push", "sled_pull", "zercher_carry", "front_rack_carry"],
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

  // Get day type
  const dayType = day === 1 ? "lower" : day === 2 ? "upper" : "power";

  // 1. Warmup (structured multi-phase protocol)
  const warmupPrescriptions = generateWarmupPrescriptions(dayType, false, 0);
  for (const wp of warmupPrescriptions) {
    exercises.push({
      exerciseSlug: slug,
      sets: 1,
      reps: dayType === "power" ? "8 each side" : "10",
      restSeconds: 0,
      notes: "Warmup",
      orderIndex: orderIndex++,
      section: wp.section,
      warmupPhase: wp.warmupPhase,
    });
  }

  // 2. Main exercises (4-6 based on skill level)
  const mainPool = pools[dayType][complexity];
  const corePool = pools.core[complexity];

  // Select exercises based on day
  const mainExerciseCount = skillLevel === "Novice" ? 3 : skillLevel === "Moderate" ? 4 : 5;
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

  // 3. Core exercise (1-2)
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

  // 4. Cooldown (1 exercise)
  const cooldownSlug = COOLDOWN_EXERCISES[day === 1 ? 0 : 1];
  exercises.push({
    exerciseSlug: cooldownSlug,
    sets: 1,
    reps: "30s each side",
    restSeconds: 0,
    notes: "Cooldown",
    orderIndex: orderIndex++,
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
  const dayNames = {
    1: "Lower Body",
    2: "Upper Body",
    3: "Power & Conditioning",
  };

  const weekDescriptors = {
    1: "Foundation",
    2: "Build",
    3: "Peak",
    4: "Deload",
  };

  return `${dayNames[day as 1 | 2 | 3]} - ${weekDescriptors[week as 1 | 2 | 3 | 4]}`;
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
 * Generate and seed all 432 templates
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
