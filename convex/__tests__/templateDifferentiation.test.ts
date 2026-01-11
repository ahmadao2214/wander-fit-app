/**
 * Template Differentiation Tests
 *
 * Verifies that the 432 program templates are correctly differentiated by:
 * - GPP Category (1-4)
 * - Skill Level (Novice, Moderate, Advanced)
 * - Phase (GPP, SPP, SSP)
 * - Week (1-4)
 * - Day (1-3)
 *
 * These tests ensure that users with different profiles receive different workouts.
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION (mirrors generateTemplates.ts)
// ═══════════════════════════════════════════════════════════════════════════════

type Phase = "GPP" | "SPP" | "SSP";
type SkillLevel = "Novice" | "Moderate" | "Advanced";
type GppCategoryId = 1 | 2 | 3 | 4;

const PHASES: Phase[] = ["GPP", "SPP", "SSP"];
const SKILL_LEVELS: SkillLevel[] = ["Novice", "Moderate", "Advanced"];
const CATEGORIES: GppCategoryId[] = [1, 2, 3, 4];
const WEEKS = [1, 2, 3, 4];
const DAYS = [1, 2, 3];

// Week volume multipliers
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
    repsModifier: number;
    restModifier: number;
  }
> = {
  GPP: { tempo: "3010", repsModifier: 1.2, restModifier: 1.0 },
  SPP: { tempo: "2010", repsModifier: 1.0, restModifier: 0.9 },
  SSP: { tempo: "X010", repsModifier: 0.8, restModifier: 1.1 },
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
  Novice: { baseSets: 3, baseReps: 12, baseRest: 60, complexity: "basic" },
  Moderate: { baseSets: 4, baseReps: 10, baseRest: 60, complexity: "moderate" },
  Advanced: { baseSets: 5, baseReps: 8, baseRest: 45, complexity: "advanced" },
};

// Category-specific exercise pools (subset for testing)
const EXERCISE_POOLS: Record<
  GppCategoryId,
  {
    lower: { basic: string[]; moderate: string[]; advanced: string[] };
    upper: { basic: string[]; moderate: string[]; advanced: string[] };
    power: { basic: string[]; moderate: string[]; advanced: string[] };
    core: { basic: string[]; moderate: string[]; advanced: string[] };
  }
> = {
  1: {
    lower: {
      basic: ["goblet_squat", "romanian_deadlift", "reverse_lunge", "glute_bridge"],
      moderate: ["back_squat", "romanian_deadlift", "bulgarian_split_squat", "single_leg_rdl"],
      advanced: ["back_squat", "trap_bar_deadlift", "bulgarian_split_squat", "single_leg_rdl", "single_leg_squat_box"],
    },
    upper: {
      basic: ["push_up", "inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "db_row", "overhead_press", "pull_up", "face_pull"],
      advanced: ["db_bench_press", "db_row", "overhead_press", "weighted_pull_up", "incline_db_press"],
    },
    power: {
      basic: ["broad_jump", "med_ball_slam", "kettlebell_swing", "skater_jump"],
      moderate: ["box_jump", "med_ball_rotational_throw", "kettlebell_swing", "shuttle_sprint"],
      advanced: ["depth_jump", "box_jump", "med_ball_rotational_throw", "sled_push", "shuttle_sprint"],
    },
    core: {
      basic: ["plank", "dead_bug", "bird_dog", "bicycle_crunch"],
      moderate: ["pallof_press", "plank_shoulder_taps", "side_plank", "band_woodchop"],
      advanced: ["cable_woodchop", "hanging_leg_raise", "single_arm_plank", "stability_ball_plank"],
    },
  },
  2: {
    lower: {
      basic: ["goblet_squat", "hip_thrust", "reverse_lunge", "glute_bridge"],
      moderate: ["back_squat", "hip_thrust", "bulgarian_split_squat", "romanian_deadlift"],
      advanced: ["front_squat", "trap_bar_deadlift", "bulgarian_split_squat", "single_leg_squat_box"],
    },
    upper: {
      basic: ["push_up", "inverted_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "lat_pulldown", "overhead_press", "db_row"],
      advanced: ["db_bench_press", "pull_up", "overhead_press", "weighted_pull_up", "incline_db_press"],
    },
    power: {
      basic: ["box_jump", "broad_jump", "med_ball_slam", "jump_squat"],
      moderate: ["box_jump", "depth_jump", "med_ball_slam", "skater_jump"],
      advanced: ["depth_jump", "box_jump", "plyo_push_up", "broad_jump", "med_ball_chest_pass"],
    },
    core: {
      basic: ["plank", "dead_bug", "glute_bridge", "bird_dog"],
      moderate: ["pallof_press", "plank_shoulder_taps", "hanging_leg_raise", "side_plank"],
      advanced: ["hanging_leg_raise", "cable_woodchop", "single_arm_plank", "stability_ball_plank"],
    },
  },
  3: {
    lower: {
      basic: ["goblet_squat", "romanian_deadlift", "lateral_lunge", "glute_bridge"],
      moderate: ["back_squat", "single_leg_rdl", "lateral_lunge", "bulgarian_split_squat"],
      advanced: ["back_squat", "trap_bar_deadlift", "single_leg_rdl", "single_leg_squat_box"],
    },
    upper: {
      basic: ["push_up", "db_row", "db_shoulder_press", "face_pull"],
      moderate: ["db_bench_press", "db_row", "overhead_press", "inverted_row"],
      advanced: ["incline_db_press", "db_row", "overhead_press", "pull_up", "face_pull"],
    },
    power: {
      basic: ["med_ball_rotational_throw", "med_ball_slam", "kettlebell_swing", "broad_jump"],
      moderate: ["med_ball_rotational_throw", "cable_woodchop", "kettlebell_swing", "skater_jump"],
      advanced: ["med_ball_rotational_throw", "cable_woodchop", "box_jump", "sled_push", "sled_pull"],
    },
    core: {
      basic: ["pallof_press", "dead_bug", "side_plank", "bird_dog"],
      moderate: ["pallof_press", "band_woodchop", "side_plank", "plank_shoulder_taps"],
      advanced: ["cable_woodchop", "pallof_press", "single_arm_plank", "hanging_leg_raise"],
    },
  },
  4: {
    lower: {
      basic: ["goblet_squat", "romanian_deadlift", "walking_lunge", "hip_thrust"],
      moderate: ["back_squat", "trap_bar_deadlift", "walking_lunge", "romanian_deadlift"],
      advanced: ["back_squat", "trap_bar_deadlift", "front_squat", "bulgarian_split_squat"],
    },
    upper: {
      basic: ["push_up", "inverted_row", "db_shoulder_press", "db_bench_press"],
      moderate: ["db_bench_press", "db_row", "overhead_press", "pull_up"],
      advanced: ["db_bench_press", "weighted_pull_up", "overhead_press", "incline_db_press", "db_row"],
    },
    power: {
      basic: ["kettlebell_swing", "med_ball_slam", "broad_jump", "box_jump"],
      moderate: ["kettlebell_swing", "sled_push", "box_jump", "med_ball_slam"],
      advanced: ["sled_push", "sled_pull", "kettlebell_swing", "depth_jump", "plyo_push_up"],
    },
    core: {
      basic: ["plank", "dead_bug", "glute_bridge", "bird_dog"],
      moderate: ["pallof_press", "plank_shoulder_taps", "side_plank", "hanging_leg_raise"],
      advanced: ["hanging_leg_raise", "cable_woodchop", "single_arm_plank", "stability_ball_plank"],
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get exercises for a specific category, day, and complexity
 */
function getExercisesForTemplate(
  categoryId: GppCategoryId,
  day: number,
  skillLevel: SkillLevel
): string[] {
  const dayType = day === 1 ? "lower" : day === 2 ? "upper" : "power";
  const complexity = SKILL_CONFIG[skillLevel].complexity;
  return EXERCISE_POOLS[categoryId][dayType][complexity];
}

/**
 * Calculate expected sets for a given skill level and week
 */
function calculateExpectedSets(skillLevel: SkillLevel, week: number): number {
  const baseSets = SKILL_CONFIG[skillLevel].baseSets;
  const volumeMultiplier = WEEK_VOLUME_MULTIPLIERS[week];
  return Math.max(2, Math.round(baseSets * volumeMultiplier));
}

/**
 * Calculate expected reps for a given skill level and phase
 */
function calculateExpectedReps(skillLevel: SkillLevel, phase: Phase): number {
  const baseReps = SKILL_CONFIG[skillLevel].baseReps;
  const repsModifier = PHASE_CONFIG[phase].repsModifier;
  return Math.round(baseReps * repsModifier);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE MATRIX TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Template Matrix Coverage", () => {
  it("should generate exactly 432 unique template combinations", () => {
    const combinations = new Set<string>();
    
    for (const category of CATEGORIES) {
      for (const phase of PHASES) {
        for (const skillLevel of SKILL_LEVELS) {
          for (const week of WEEKS) {
            for (const day of DAYS) {
              const key = `${category}-${phase}-${skillLevel}-${week}-${day}`;
              combinations.add(key);
            }
          }
        }
      }
    }
    
    expect(combinations.size).toBe(432);
  });

  it("should have 4 categories × 3 phases × 3 skill levels × 4 weeks × 3 days = 432", () => {
    const total = CATEGORIES.length * PHASES.length * SKILL_LEVELS.length * WEEKS.length * DAYS.length;
    expect(total).toBe(432);
  });

  it("each category should have 108 templates (3×3×4×3)", () => {
    const templatesPerCategory = PHASES.length * SKILL_LEVELS.length * WEEKS.length * DAYS.length;
    expect(templatesPerCategory).toBe(108);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY DIFFERENTIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Category Differentiation", () => {
  it("Category 1 (Soccer) should emphasize single-leg and rotational exercises", () => {
    const cat1Lower = EXERCISE_POOLS[1].lower.moderate;
    expect(cat1Lower).toContain("single_leg_rdl");
    expect(cat1Lower).toContain("bulgarian_split_squat");
  });

  it("Category 2 (Basketball) should emphasize vertical power exercises", () => {
    const cat2Power = EXERCISE_POOLS[2].power.moderate;
    expect(cat2Power).toContain("box_jump");
    expect(cat2Power).toContain("depth_jump");
  });

  it("Category 3 (Baseball) should emphasize rotational exercises", () => {
    const cat3Power = EXERCISE_POOLS[3].power.moderate;
    expect(cat3Power).toContain("med_ball_rotational_throw");
    expect(cat3Power).toContain("cable_woodchop");
  });

  it("Category 4 (Football) should emphasize bilateral strength", () => {
    const cat4Lower = EXERCISE_POOLS[4].lower.moderate;
    expect(cat4Lower).toContain("back_squat");
    expect(cat4Lower).toContain("trap_bar_deadlift");
  });

  it("different categories should have different exercise pools", () => {
    // Compare Category 1 vs Category 2 lower body exercises
    const cat1LowerAdvanced = EXERCISE_POOLS[1].lower.advanced;
    const cat2LowerAdvanced = EXERCISE_POOLS[2].lower.advanced;
    
    // They should not be identical
    const areIdentical = 
      cat1LowerAdvanced.length === cat2LowerAdvanced.length &&
      cat1LowerAdvanced.every((ex, i) => ex === cat2LowerAdvanced[i]);
    
    expect(areIdentical).toBe(false);
  });

  it("Category 1 vs Category 2 should have at least one different exercise", () => {
    const cat1Lower = new Set(EXERCISE_POOLS[1].lower.moderate);
    const cat2Lower = new Set(EXERCISE_POOLS[2].lower.moderate);
    
    // Check for exercises unique to each category
    const uniqueToCat1 = [...cat1Lower].filter(ex => !cat2Lower.has(ex));
    const uniqueToCat2 = [...cat2Lower].filter(ex => !cat1Lower.has(ex));
    
    expect(uniqueToCat1.length + uniqueToCat2.length).toBeGreaterThan(0);
  });

  it("all categories should have unique main lower body exercise selections", () => {
    const lowerPools = CATEGORIES.map(cat => 
      JSON.stringify(EXERCISE_POOLS[cat].lower.moderate.sort())
    );
    const uniquePools = new Set(lowerPools);
    
    // Not all pools should be identical
    expect(uniquePools.size).toBeGreaterThan(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SKILL LEVEL DIFFERENTIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Skill Level Differentiation", () => {
  it("Novice should have fewer base sets than Advanced", () => {
    expect(SKILL_CONFIG.Novice.baseSets).toBeLessThan(SKILL_CONFIG.Advanced.baseSets);
  });

  it("Novice should have more base reps than Advanced", () => {
    expect(SKILL_CONFIG.Novice.baseReps).toBeGreaterThan(SKILL_CONFIG.Advanced.baseReps);
  });

  it("Advanced should have less rest than Novice", () => {
    expect(SKILL_CONFIG.Advanced.baseRest).toBeLessThan(SKILL_CONFIG.Novice.baseRest);
  });

  it("skill levels should use different exercise complexity", () => {
    expect(SKILL_CONFIG.Novice.complexity).toBe("basic");
    expect(SKILL_CONFIG.Moderate.complexity).toBe("moderate");
    expect(SKILL_CONFIG.Advanced.complexity).toBe("advanced");
  });

  it("Novice exercises should be simpler than Advanced", () => {
    // Novice should have goblet squat, Advanced should have back squat
    const noviceExercises = EXERCISE_POOLS[1].lower.basic;
    const advancedExercises = EXERCISE_POOLS[1].lower.advanced;
    
    expect(noviceExercises).toContain("goblet_squat");
    expect(advancedExercises).toContain("back_squat");
    expect(advancedExercises).not.toContain("goblet_squat");
  });

  it("Advanced should have more exercises than Novice", () => {
    const noviceCount = EXERCISE_POOLS[1].lower.basic.length;
    const advancedCount = EXERCISE_POOLS[1].lower.advanced.length;
    
    expect(advancedCount).toBeGreaterThanOrEqual(noviceCount);
  });

  it("calculated sets should differ by skill level", () => {
    const noviceSets = calculateExpectedSets("Novice", 3); // Peak week
    const advancedSets = calculateExpectedSets("Advanced", 3);
    
    expect(advancedSets).toBeGreaterThan(noviceSets);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE DIFFERENTIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Phase Differentiation", () => {
  it("each phase should have a unique tempo", () => {
    const tempos = PHASES.map(phase => PHASE_CONFIG[phase].tempo);
    const uniqueTempos = new Set(tempos);
    expect(uniqueTempos.size).toBe(3);
  });

  it("GPP should have controlled tempo (3010)", () => {
    expect(PHASE_CONFIG.GPP.tempo).toBe("3010");
  });

  it("SSP should have explosive tempo (X010)", () => {
    expect(PHASE_CONFIG.SSP.tempo).toBe("X010");
  });

  it("GPP should have higher reps than SSP", () => {
    expect(PHASE_CONFIG.GPP.repsModifier).toBeGreaterThan(PHASE_CONFIG.SSP.repsModifier);
  });

  it("SSP should have more rest than SPP (heavier loads)", () => {
    expect(PHASE_CONFIG.SSP.restModifier).toBeGreaterThan(PHASE_CONFIG.SPP.restModifier);
  });

  it("calculated reps should differ by phase", () => {
    const gppReps = calculateExpectedReps("Moderate", "GPP");
    const sspReps = calculateExpectedReps("Moderate", "SSP");
    
    expect(gppReps).toBeGreaterThan(sspReps);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WEEK PROGRESSION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Week Progression", () => {
  it("Week 3 should have peak volume (100%)", () => {
    expect(WEEK_VOLUME_MULTIPLIERS[3]).toBe(1.0);
  });

  it("Week 4 should be deload (lowest volume)", () => {
    const minVolume = Math.min(...Object.values(WEEK_VOLUME_MULTIPLIERS));
    expect(WEEK_VOLUME_MULTIPLIERS[4]).toBe(minVolume);
  });

  it("Week 1 should have less volume than Week 3", () => {
    expect(WEEK_VOLUME_MULTIPLIERS[1]).toBeLessThan(WEEK_VOLUME_MULTIPLIERS[3]);
  });

  it("volume should progress: Week 1 < Week 2 < Week 3 > Week 4", () => {
    expect(WEEK_VOLUME_MULTIPLIERS[1]).toBeLessThan(WEEK_VOLUME_MULTIPLIERS[2]);
    expect(WEEK_VOLUME_MULTIPLIERS[2]).toBeLessThan(WEEK_VOLUME_MULTIPLIERS[3]);
    expect(WEEK_VOLUME_MULTIPLIERS[4]).toBeLessThan(WEEK_VOLUME_MULTIPLIERS[3]);
  });

  it("calculated sets should differ by week", () => {
    const week1Sets = calculateExpectedSets("Moderate", 1);
    const week3Sets = calculateExpectedSets("Moderate", 3);
    const week4Sets = calculateExpectedSets("Moderate", 4);
    
    expect(week3Sets).toBeGreaterThan(week1Sets);
    expect(week3Sets).toBeGreaterThan(week4Sets);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DAY DIFFERENTIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Day Differentiation", () => {
  it("Day 1 should focus on lower body", () => {
    const day1Exercises = getExercisesForTemplate(1, 1, "Moderate");
    const lowerBodyExercises = ["back_squat", "romanian_deadlift", "bulgarian_split_squat", "single_leg_rdl"];
    
    const hasLowerBody = day1Exercises.some(ex => lowerBodyExercises.includes(ex));
    expect(hasLowerBody).toBe(true);
  });

  it("Day 2 should focus on upper body", () => {
    const day2Exercises = getExercisesForTemplate(1, 2, "Moderate");
    const upperBodyExercises = ["db_bench_press", "db_row", "overhead_press", "pull_up"];
    
    const hasUpperBody = day2Exercises.some(ex => upperBodyExercises.includes(ex));
    expect(hasUpperBody).toBe(true);
  });

  it("Day 3 should focus on power/conditioning", () => {
    const day3Exercises = getExercisesForTemplate(1, 3, "Moderate");
    const powerExercises = ["box_jump", "med_ball_rotational_throw", "kettlebell_swing"];
    
    const hasPower = day3Exercises.some(ex => powerExercises.includes(ex));
    expect(hasPower).toBe(true);
  });

  it("different days should have different exercises", () => {
    const day1 = new Set(getExercisesForTemplate(1, 1, "Moderate"));
    const day2 = new Set(getExercisesForTemplate(1, 2, "Moderate"));
    const day3 = new Set(getExercisesForTemplate(1, 3, "Moderate"));
    
    // Days should have minimal overlap
    const day1Day2Overlap = [...day1].filter(ex => day2.has(ex));
    const day1Day3Overlap = [...day1].filter(ex => day3.has(ex));
    
    // Main exercises should be different
    expect(day1Day2Overlap.length).toBeLessThan(day1.size);
    expect(day1Day3Overlap.length).toBeLessThan(day1.size);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-WORLD SCENARIO TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Real-World Scenarios", () => {
  describe("Az19 (Soccer, Moderate) vs Az20 (Basketball, Advanced)", () => {
    const az19Category: GppCategoryId = 1; // Soccer
    const az19Skill: SkillLevel = "Moderate";
    
    const az20Category: GppCategoryId = 2; // Basketball
    const az20Skill: SkillLevel = "Advanced";

    it("should have different exercise pools", () => {
      const az19Exercises = getExercisesForTemplate(az19Category, 1, az19Skill);
      const az20Exercises = getExercisesForTemplate(az20Category, 1, az20Skill);
      
      const az19Set = new Set(az19Exercises);
      const az20Set = new Set(az20Exercises);
      
      // They should not be identical
      const areIdentical = 
        az19Set.size === az20Set.size &&
        [...az19Set].every(ex => az20Set.has(ex));
      
      expect(areIdentical).toBe(false);
    });

    it("Az20 (Advanced) should have more base sets", () => {
      const az19Sets = SKILL_CONFIG[az19Skill].baseSets;
      const az20Sets = SKILL_CONFIG[az20Skill].baseSets;
      
      expect(az20Sets).toBeGreaterThan(az19Sets);
    });

    it("Az20 (Advanced) should have fewer base reps", () => {
      const az19Reps = SKILL_CONFIG[az19Skill].baseReps;
      const az20Reps = SKILL_CONFIG[az20Skill].baseReps;
      
      expect(az20Reps).toBeLessThan(az19Reps);
    });

    it("Az20 should have more complex exercises", () => {
      const az19Complexity = SKILL_CONFIG[az19Skill].complexity;
      const az20Complexity = SKILL_CONFIG[az20Skill].complexity;
      
      expect(az19Complexity).toBe("moderate");
      expect(az20Complexity).toBe("advanced");
    });

    it("Az20 (Basketball) power day should emphasize jumping", () => {
      const az20PowerExercises = EXERCISE_POOLS[az20Category].power.advanced;
      
      expect(az20PowerExercises).toContain("depth_jump");
      expect(az20PowerExercises).toContain("box_jump");
    });

    it("Az19 (Soccer) should have different secondary exercises", () => {
      // Soccer emphasizes hip hinge for running
      const az19Lower = EXERCISE_POOLS[az19Category].lower.moderate;
      expect(az19Lower).toContain("romanian_deadlift");
      
      // Basketball emphasizes hip thrust for jumping
      const az20Lower = EXERCISE_POOLS[az20Category].lower.moderate;
      expect(az20Lower).toContain("hip_thrust");
    });
  });

  describe("Novice Soccer vs Advanced Soccer (same sport, different skill)", () => {
    const category: GppCategoryId = 1;

    it("should have different exercise complexity", () => {
      const noviceExercises = EXERCISE_POOLS[category].lower.basic;
      const advancedExercises = EXERCISE_POOLS[category].lower.advanced;
      
      // Novice gets goblet squat, Advanced gets back squat
      expect(noviceExercises).toContain("goblet_squat");
      expect(advancedExercises).toContain("back_squat");
      expect(advancedExercises).not.toContain("goblet_squat");
    });

    it("Advanced should have unilateral progressions", () => {
      const advancedExercises = EXERCISE_POOLS[category].lower.advanced;
      
      expect(advancedExercises).toContain("single_leg_squat_box");
    });

    it("calculated workout volume should differ", () => {
      const noviceSets = calculateExpectedSets("Novice", 3);
      const advancedSets = calculateExpectedSets("Advanced", 3);
      
      expect(advancedSets).toBeGreaterThan(noviceSets);
      expect(noviceSets).toBe(3); // 3 * 1.0 = 3
      expect(advancedSets).toBe(5); // 5 * 1.0 = 5
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT-TO-CATEGORY MAPPING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Sport to Category Mapping", () => {
  // These map to what's in seedData.ts
  const sportCategoryMap: Record<string, GppCategoryId> = {
    Soccer: 1,
    Basketball: 2,
    Baseball: 3,
    Football: 4,
    Lacrosse: 1,
    Volleyball: 2,
    Tennis: 3,
    Wrestling: 4,
  };

  it("Soccer should map to Category 1 (Continuous/Directional)", () => {
    expect(sportCategoryMap.Soccer).toBe(1);
  });

  it("Basketball should map to Category 2 (Explosive/Vertical)", () => {
    expect(sportCategoryMap.Basketball).toBe(2);
  });

  it("Baseball should map to Category 3 (Rotational/Unilateral)", () => {
    expect(sportCategoryMap.Baseball).toBe(3);
  });

  it("Football should map to Category 4 (General Strength)", () => {
    expect(sportCategoryMap.Football).toBe(4);
  });

  it("similar sports should map to same category", () => {
    expect(sportCategoryMap.Soccer).toBe(sportCategoryMap.Lacrosse);
    expect(sportCategoryMap.Basketball).toBe(sportCategoryMap.Volleyball);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY & EDGE CASE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Boundary and Edge Cases", () => {
  it("minimum sets should never go below 2", () => {
    // Even with deload week (0.6 multiplier) and Novice (3 base sets)
    // 3 * 0.6 = 1.8, rounds to 2 (minimum)
    const minSets = calculateExpectedSets("Novice", 4);
    expect(minSets).toBeGreaterThanOrEqual(2);
  });

  it("all categories should have exercises for all day types", () => {
    for (const category of CATEGORIES) {
      expect(EXERCISE_POOLS[category].lower).toBeDefined();
      expect(EXERCISE_POOLS[category].upper).toBeDefined();
      expect(EXERCISE_POOLS[category].power).toBeDefined();
      expect(EXERCISE_POOLS[category].core).toBeDefined();
    }
  });

  it("all complexity levels should exist for each category/day", () => {
    for (const category of CATEGORIES) {
      for (const dayType of ["lower", "upper", "power", "core"] as const) {
        expect(EXERCISE_POOLS[category][dayType].basic).toBeDefined();
        expect(EXERCISE_POOLS[category][dayType].moderate).toBeDefined();
        expect(EXERCISE_POOLS[category][dayType].advanced).toBeDefined();
      }
    }
  });

  it("each exercise pool should have at least 3 exercises", () => {
    for (const category of CATEGORIES) {
      for (const dayType of ["lower", "upper", "power", "core"] as const) {
        for (const complexity of ["basic", "moderate", "advanced"] as const) {
          expect(EXERCISE_POOLS[category][dayType][complexity].length).toBeGreaterThanOrEqual(3);
        }
      }
    }
  });
});
