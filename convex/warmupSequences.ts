/**
 * Warmup Sequences Module
 *
 * Pure TypeScript module (not a Convex function). Defines the 7-phase warmup protocol
 * with day-specific phase selection and exercise pools.
 *
 * Phase progression: Foam Rolling → Mobility → Core Isometric → Core Dynamic →
 *   Walking Drills → Movement Prep → Power Primer
 *
 * Day types determine which phases and exercises are included.
 */

import type { WarmupPhase, ExerciseSection } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type DayType =
  | "lower_a"
  | "upper_a"
  | "power"
  | "lower_b"
  | "upper_b"
  | "full_body"
  | "recovery";

export interface WarmupPhaseConfig {
  phase: WarmupPhase;
  label: string;
  durationMin: number;
  optional: boolean;
  exerciseCount: number;
  defaultSets: number;
  defaultReps: string;
  defaultRest: number;
}

export interface WarmupPrescription {
  exerciseSlug: string;
  sets: number;
  reps: string;
  restSeconds: number;
  orderIndex: number;
  section: ExerciseSection;
  warmupPhase: WarmupPhase;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export const WARMUP_PHASES: WarmupPhaseConfig[] = [
  {
    phase: "foam_rolling",
    label: "Foam Rolling",
    durationMin: 2,
    optional: true,
    exerciseCount: 3,
    defaultSets: 1,
    defaultReps: "30s",
    defaultRest: 0,
  },
  {
    phase: "mobility",
    label: "Mobility",
    durationMin: 2,
    optional: false,
    exerciseCount: 3,
    defaultSets: 1,
    defaultReps: "8 each side",
    defaultRest: 0,
  },
  {
    phase: "core_isometric",
    label: "Core Isometric",
    durationMin: 1.5,
    optional: false,
    exerciseCount: 2,
    defaultSets: 1,
    defaultReps: "20s",
    defaultRest: 0,
  },
  {
    phase: "core_dynamic",
    label: "Core Dynamic",
    durationMin: 1,
    optional: false,
    exerciseCount: 2,
    defaultSets: 1,
    defaultReps: "8 each side",
    defaultRest: 0,
  },
  {
    phase: "walking_drills",
    label: "Walking Drills",
    durationMin: 2,
    optional: false,
    exerciseCount: 3,
    defaultSets: 1,
    defaultReps: "20 yards",
    defaultRest: 0,
  },
  {
    phase: "movement_prep",
    label: "Movement Prep",
    durationMin: 2,
    optional: false,
    exerciseCount: 3,
    defaultSets: 1,
    defaultReps: "20 yards",
    defaultRest: 0,
  },
  {
    phase: "power_primer",
    label: "Power Primer",
    durationMin: 1.5,
    optional: false,
    exerciseCount: 2,
    defaultSets: 3,
    defaultReps: "3-5",
    defaultRest: 15,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE POOLS BY DAY TYPE
//
// Each day type has a subset of phases, and each phase has a pool of exercises
// to select from. The generation function picks `exerciseCount` from each pool.
// ═══════════════════════════════════════════════════════════════════════════════

export const WARMUP_POOLS: Record<
  DayType,
  Partial<Record<WarmupPhase, string[]>>
> = {
  // ── Lower A (Squat dominant) ──────────────────────────────────────────────
  lower_a: {
    foam_rolling: [
      "foam_roll_quads",
      "foam_roll_adductors",
      "foam_roll_glutes",
      "foam_roll_calves",
    ],
    mobility: [
      "worlds_greatest_stretch",
      "90_90_hip_stretch",
      "hip_circles",
      "ankle_circles",
      "hip_flexor_stretch",
    ],
    core_isometric: [
      "hollow_body_hold",
      "bear_crawl_hold",
      "dead_bug",
      "quadruped_belly_lift",
    ],
    core_dynamic: [
      "glute_bridge_march",
      "dead_bug_with_reach",
      "bird_dog_crunch",
    ],
    walking_drills: [
      "walking_knee_hug",
      "walking_quad_stretch",
      "walking_rdl_reach",
      "walking_cradle_stretch",
    ],
    movement_prep: [
      "jog",
      "a_skip",
      "high_knees_drill",
      "butt_kicks",
    ],
    power_primer: [
      "broad_jump_warmup",
      "vertical_jump_warmup",
      "box_jump_warmup",
    ],
  },

  // ── Lower B (Hinge dominant) ──────────────────────────────────────────────
  lower_b: {
    foam_rolling: [
      "foam_roll_hamstrings",
      "foam_roll_glutes",
      "foam_roll_it_band",
      "foam_roll_calves",
    ],
    mobility: [
      "hip_flexor_stretch",
      "90_90_hip_stretch",
      "hip_circles",
      "ankle_circles",
      "scorpion_stretch",
    ],
    core_isometric: [
      "bear_crawl_hold",
      "hollow_body_hold",
      "bird_dog",
      "quadruped_belly_lift",
    ],
    core_dynamic: [
      "glute_bridge_march",
      "bird_dog_crunch",
      "dead_bug_with_reach",
    ],
    walking_drills: [
      "walking_rdl_reach",
      "walking_knee_hug",
      "walking_cradle_stretch",
      "heel_toe_walk",
    ],
    movement_prep: [
      "jog",
      "b_skip",
      "butt_kicks",
      "high_knees_drill",
    ],
    power_primer: [
      "broad_jump_warmup",
      "box_jump_warmup",
      "vertical_jump_warmup",
    ],
  },

  // ── Upper A (Push emphasis) ───────────────────────────────────────────────
  upper_a: {
    foam_rolling: [
      "foam_roll_thoracic",
      "foam_roll_lats",
      "foam_roll_quads",
      "foam_roll_glutes",
    ],
    mobility: [
      "thoracic_rotation",
      "shoulder_pass_through",
      "arm_cross_body_stretch",
      "cat_cow",
      "inchworm",
    ],
    core_isometric: [
      "hollow_body_hold",
      "tall_kneeling_pallof_hold",
      "dead_bug",
      "plank",
    ],
    core_dynamic: [
      "dead_bug_with_reach",
      "core_bicycle",
      "bird_dog_crunch",
    ],
    walking_drills: [
      "walking_spiderman",
      "walking_lunge_rotation",
      "lateral_shuffle",
      "heel_toe_walk",
    ],
    movement_prep: [
      "jog",
      "skip",
      "carioca",
      "a_skip",
    ],
    power_primer: [
      "med_ball_chest_pass_warmup",
      "explosive_pushup_warmup",
      "med_ball_overhead_throw_warmup",
    ],
  },

  // ── Upper B (Pull emphasis) ───────────────────────────────────────────────
  upper_b: {
    foam_rolling: [
      "foam_roll_lats",
      "foam_roll_thoracic",
      "foam_roll_glutes",
      "foam_roll_hamstrings",
    ],
    mobility: [
      "thoracic_rotation",
      "arm_cross_body_stretch",
      "shoulder_pass_through",
      "cat_cow",
      "scorpion_stretch",
    ],
    core_isometric: [
      "tall_kneeling_pallof_hold",
      "hollow_body_hold",
      "bird_dog",
      "plank",
    ],
    core_dynamic: [
      "core_bicycle",
      "dead_bug_with_reach",
      "bird_dog_crunch",
    ],
    walking_drills: [
      "walking_spiderman",
      "walking_lunge_rotation",
      "lateral_shuffle",
      "walking_knee_hug",
    ],
    movement_prep: [
      "jog",
      "carioca",
      "skip",
      "high_knees_drill",
    ],
    power_primer: [
      "med_ball_overhead_throw_warmup",
      "med_ball_chest_pass_warmup",
      "explosive_pushup_warmup",
    ],
  },

  // ── Power / Conditioning ──────────────────────────────────────────────────
  power: {
    foam_rolling: [
      "foam_roll_quads",
      "foam_roll_hamstrings",
      "foam_roll_thoracic",
      "foam_roll_glutes",
    ],
    mobility: [
      "worlds_greatest_stretch",
      "hip_circles",
      "thoracic_rotation",
      "ankle_circles",
      "inchworm",
    ],
    core_isometric: [
      "hollow_body_hold",
      "bear_crawl_hold",
      "dead_bug",
      "plank",
    ],
    core_dynamic: [
      "glute_bridge_march",
      "bird_dog_crunch",
      "core_bicycle",
    ],
    walking_drills: [
      "walking_spiderman",
      "walking_rdl_reach",
      "lateral_shuffle",
      "walking_lunge_rotation",
    ],
    movement_prep: [
      "a_skip",
      "power_skip",
      "carioca",
      "high_knees_drill",
    ],
    power_primer: [
      "vertical_jump_warmup",
      "broad_jump_warmup",
      "box_jump_warmup",
    ],
  },

  // ── Full Body / Athletic ──────────────────────────────────────────────────
  full_body: {
    foam_rolling: [
      "foam_roll_quads",
      "foam_roll_thoracic",
      "foam_roll_glutes",
      "foam_roll_lats",
    ],
    mobility: [
      "worlds_greatest_stretch",
      "thoracic_rotation",
      "hip_circles",
      "shoulder_pass_through",
      "cat_cow",
    ],
    core_isometric: [
      "hollow_body_hold",
      "bear_crawl_hold",
      "tall_kneeling_pallof_hold",
      "dead_bug",
    ],
    core_dynamic: [
      "glute_bridge_march",
      "dead_bug_with_reach",
      "core_bicycle",
    ],
    walking_drills: [
      "walking_knee_hug",
      "walking_spiderman",
      "lateral_shuffle",
      "walking_lunge_rotation",
    ],
    movement_prep: [
      "jog",
      "skip",
      "a_skip",
      "carioca",
    ],
    power_primer: [
      "med_ball_chest_pass_warmup",
      "broad_jump_warmup",
      "med_ball_rotational_pass",
    ],
  },

  // ── Recovery (Foam Rolling + Mobility only) ───────────────────────────────
  recovery: {
    foam_rolling: [
      "foam_roll_quads",
      "foam_roll_hamstrings",
      "foam_roll_thoracic",
      "foam_roll_glutes",
      "foam_roll_lats",
      "foam_roll_it_band",
    ],
    mobility: [
      "worlds_greatest_stretch",
      "90_90_hip_stretch",
      "cat_cow",
      "hip_flexor_stretch",
      "thoracic_rotation",
      "scorpion_stretch",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns which warmup phases are active for a given day type.
 */
export function getActivePhasesForDayType(dayType: DayType): WarmupPhase[] {
  const dayPools = WARMUP_POOLS[dayType];
  return WARMUP_PHASES.filter((p) => dayPools[p.phase] !== undefined).map(
    (p) => p.phase
  );
}

/**
 * Returns the total warmup duration in minutes for a given day type.
 * Excludes optional phases (foam rolling) by default.
 */
export function getWarmupDuration(
  dayType: DayType,
  includeOptional = false
): number {
  const activePhases = getActivePhasesForDayType(dayType);
  return WARMUP_PHASES.filter(
    (p) =>
      activePhases.includes(p.phase) && (includeOptional || !p.optional)
  ).reduce((sum, p) => sum + p.durationMin, 0);
}

/**
 * Groups warmup prescriptions by their warmupPhase.
 */
export function getWarmupPhaseGroups(
  exercises: WarmupPrescription[]
): Partial<Record<WarmupPhase, WarmupPrescription[]>> {
  const groups: Partial<Record<WarmupPhase, WarmupPrescription[]>> = {};
  for (const ex of exercises) {
    if (!ex.warmupPhase) continue;
    if (!groups[ex.warmupPhase]) {
      groups[ex.warmupPhase] = [];
    }
    groups[ex.warmupPhase]!.push(ex);
  }
  return groups;
}

/**
 * Generates the full warmup prescription list for a given day type.
 *
 * @param dayType - The type of workout day
 * @param includeOptional - Whether to include optional phases (foam rolling). Default: false
 * @param startingOrderIndex - Starting orderIndex for exercises. Default: 0
 * @returns Array of WarmupPrescription with section, warmupPhase, and sequential orderIndex
 */
export function generateWarmupPrescriptions(
  dayType: DayType,
  includeOptional = false,
  startingOrderIndex = 0
): WarmupPrescription[] {
  const dayPools = WARMUP_POOLS[dayType];
  const prescriptions: WarmupPrescription[] = [];
  let orderIndex = startingOrderIndex;
  const usedSlugs = new Set<string>();

  for (const phaseConfig of WARMUP_PHASES) {
    const pool = dayPools[phaseConfig.phase];

    // Skip phases with no pool for this day type
    if (!pool) continue;

    // Skip optional phases if not requested
    if (phaseConfig.optional && !includeOptional) continue;

    // Select exercises from pool, avoiding duplicates
    let count = 0;
    for (const slug of pool) {
      if (count >= phaseConfig.exerciseCount) break;
      if (usedSlugs.has(slug)) continue;

      usedSlugs.add(slug);
      prescriptions.push({
        exerciseSlug: slug,
        sets: phaseConfig.defaultSets,
        reps: phaseConfig.defaultReps,
        restSeconds: phaseConfig.defaultRest,
        orderIndex: orderIndex++,
        section: "warmup",
        warmupPhase: phaseConfig.phase,
      });
      count++;
    }
  }

  return prescriptions;
}
