import { describe, it, expect } from "vitest";
import {
  GPP_CATEGORIES,
  SPORTS,
  TAGS_GLOSSARY,
  ALL_VALID_TAGS,
  EQUIPMENT_GLOSSARY,
  EXERCISES,
  SAMPLE_TEMPLATE,
  EXAMPLE_INTAKE,
  EXAMPLE_USER_PROGRAM,
} from "../seedData";

// ═══════════════════════════════════════════════════════════════════════════════
// GPP CATEGORIES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("GPP_CATEGORIES", () => {
  it("should have exactly 4 categories", () => {
    expect(GPP_CATEGORIES).toHaveLength(4);
  });

  it("should have category IDs 1-4", () => {
    const categoryIds = GPP_CATEGORIES.map((c) => c.categoryId);
    expect(categoryIds).toEqual([1, 2, 3, 4]);
  });

  it("should have required fields for each category", () => {
    for (const category of GPP_CATEGORIES) {
      expect(category).toHaveProperty("categoryId");
      expect(category).toHaveProperty("name");
      expect(category).toHaveProperty("shortName");
      expect(category).toHaveProperty("description");
      expect(category).toHaveProperty("tags");
      expect(Array.isArray(category.tags)).toBe(true);
    }
  });

  it("Category 1 should be Continuous/Directional", () => {
    const cat1 = GPP_CATEGORIES.find((c) => c.categoryId === 1);
    expect(cat1?.name).toBe("Continuous/Directional");
    expect(cat1?.shortName).toBe("Endurance");
  });

  it("Category 2 should be Explosive/Vertical", () => {
    const cat2 = GPP_CATEGORIES.find((c) => c.categoryId === 2);
    expect(cat2?.name).toBe("Explosive/Vertical");
    expect(cat2?.shortName).toBe("Power");
  });

  it("Category 3 should be Rotational/Unilateral", () => {
    const cat3 = GPP_CATEGORIES.find((c) => c.categoryId === 3);
    expect(cat3?.name).toBe("Rotational/Unilateral");
    expect(cat3?.shortName).toBe("Rotation");
  });

  it("Category 4 should be General Strength", () => {
    const cat4 = GPP_CATEGORIES.find((c) => c.categoryId === 4);
    expect(cat4?.name).toBe("General Strength");
    expect(cat4?.shortName).toBe("Strength");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SPORTS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("SPORTS", () => {
  it("should have at least 25 sports", () => {
    expect(SPORTS.length).toBeGreaterThanOrEqual(25);
  });

  it("each sport should have name and gppCategoryId", () => {
    for (const sport of SPORTS) {
      expect(sport).toHaveProperty("name");
      expect(sport).toHaveProperty("gppCategoryId");
      expect(typeof sport.name).toBe("string");
      expect([1, 2, 3, 4]).toContain(sport.gppCategoryId);
    }
  });

  it("should have sports in all 4 categories", () => {
    const categoriesWithSports = new Set(SPORTS.map((s) => s.gppCategoryId));
    expect(categoriesWithSports.size).toBe(4);
  });

  // Category 1 - Continuous/Directional sports
  describe("Category 1 (Continuous/Directional)", () => {
    it("should include Soccer", () => {
      const soccer = SPORTS.find((s) => s.name === "Soccer");
      expect(soccer?.gppCategoryId).toBe(1);
    });

    it("should include Field Hockey", () => {
      const fieldHockey = SPORTS.find((s) => s.name === "Field Hockey");
      expect(fieldHockey?.gppCategoryId).toBe(1);
    });

    it("should include Lacrosse", () => {
      const lacrosse = SPORTS.find((s) => s.name === "Lacrosse");
      expect(lacrosse?.gppCategoryId).toBe(1);
    });
  });

  // Category 2 - Explosive/Vertical sports
  describe("Category 2 (Explosive/Vertical)", () => {
    it("should include Basketball", () => {
      const basketball = SPORTS.find((s) => s.name === "Basketball");
      expect(basketball?.gppCategoryId).toBe(2);
    });

    it("should include Volleyball", () => {
      const volleyball = SPORTS.find((s) => s.name === "Volleyball");
      expect(volleyball?.gppCategoryId).toBe(2);
    });

    it("should include Gymnastics", () => {
      const gymnastics = SPORTS.find((s) => s.name === "Gymnastics");
      expect(gymnastics?.gppCategoryId).toBe(2);
    });
  });

  // Category 3 - Rotational/Unilateral sports
  describe("Category 3 (Rotational/Unilateral)", () => {
    it("should include Baseball", () => {
      const baseball = SPORTS.find((s) => s.name === "Baseball");
      expect(baseball?.gppCategoryId).toBe(3);
    });

    it("should include Tennis", () => {
      const tennis = SPORTS.find((s) => s.name === "Tennis");
      expect(tennis?.gppCategoryId).toBe(3);
    });

    it("should include Golf", () => {
      const golf = SPORTS.find((s) => s.name === "Golf");
      expect(golf?.gppCategoryId).toBe(3);
    });
  });

  // Category 4 - General Strength sports
  describe("Category 4 (General Strength)", () => {
    it("should include Football", () => {
      const football = SPORTS.find((s) => s.name === "Football");
      expect(football?.gppCategoryId).toBe(4);
    });

    it("should include Wrestling", () => {
      const wrestling = SPORTS.find((s) => s.name === "Wrestling");
      expect(wrestling?.gppCategoryId).toBe(4);
    });

    it("should include Swimming", () => {
      const swimming = SPORTS.find((s) => s.name === "Swimming");
      expect(swimming?.gppCategoryId).toBe(4);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TAGS GLOSSARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("TAGS_GLOSSARY", () => {
  it("should have all required tag categories", () => {
    expect(TAGS_GLOSSARY).toHaveProperty("bodyPart");
    expect(TAGS_GLOSSARY).toHaveProperty("movementPattern");
    expect(TAGS_GLOSSARY).toHaveProperty("laterality");
    expect(TAGS_GLOSSARY).toHaveProperty("purpose");
    expect(TAGS_GLOSSARY).toHaveProperty("muscleEmphasis");
    expect(TAGS_GLOSSARY).toHaveProperty("plane");
    expect(TAGS_GLOSSARY).toHaveProperty("trainingQuality");
    expect(TAGS_GLOSSARY).toHaveProperty("equipmentContext");
  });

  it("bodyPart should include core tag types", () => {
    expect(TAGS_GLOSSARY.bodyPart).toContain("lower_body");
    expect(TAGS_GLOSSARY.bodyPart).toContain("upper_body");
    expect(TAGS_GLOSSARY.bodyPart).toContain("core");
    expect(TAGS_GLOSSARY.bodyPart).toContain("full_body");
  });

  it("movementPattern should include fundamental patterns", () => {
    expect(TAGS_GLOSSARY.movementPattern).toContain("squat");
    expect(TAGS_GLOSSARY.movementPattern).toContain("hinge");
    expect(TAGS_GLOSSARY.movementPattern).toContain("lunge");
    expect(TAGS_GLOSSARY.movementPattern).toContain("push");
    expect(TAGS_GLOSSARY.movementPattern).toContain("pull");
  });

  it("purpose should include training purposes", () => {
    expect(TAGS_GLOSSARY.purpose).toContain("warmup");
    expect(TAGS_GLOSSARY.purpose).toContain("strength");
    expect(TAGS_GLOSSARY.purpose).toContain("power");
    expect(TAGS_GLOSSARY.purpose).toContain("conditioning");
    expect(TAGS_GLOSSARY.purpose).toContain("plyometric");
  });
});

describe("ALL_VALID_TAGS", () => {
  it("should be a flat array of all tags", () => {
    expect(Array.isArray(ALL_VALID_TAGS)).toBe(true);
    expect(ALL_VALID_TAGS.length).toBeGreaterThan(0);
  });

  it("should include tags from multiple categories", () => {
    expect(ALL_VALID_TAGS).toContain("lower_body");
    expect(ALL_VALID_TAGS).toContain("squat");
    expect(ALL_VALID_TAGS).toContain("warmup");
    expect(ALL_VALID_TAGS).toContain("plyometric");
  });

  it("should have no duplicates", () => {
    const uniqueTags = new Set(ALL_VALID_TAGS);
    expect(uniqueTags.size).toBe(ALL_VALID_TAGS.length);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPMENT GLOSSARY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("EQUIPMENT_GLOSSARY", () => {
  it("should include basic free weights", () => {
    expect(EQUIPMENT_GLOSSARY).toContain("dumbbell");
    expect(EQUIPMENT_GLOSSARY).toContain("kettlebell");
    expect(EQUIPMENT_GLOSSARY).toContain("barbell");
    expect(EQUIPMENT_GLOSSARY).toContain("medicine_ball");
  });

  it("should include benches and boxes", () => {
    expect(EQUIPMENT_GLOSSARY).toContain("bench");
    expect(EQUIPMENT_GLOSSARY).toContain("plyo_box");
    expect(EQUIPMENT_GLOSSARY).toContain("box");
  });

  it("should include bodyweight option", () => {
    expect(EQUIPMENT_GLOSSARY).toContain("bodyweight");
  });

  // Basketball program additions (PR #14)
  describe("Basketball Program Equipment (PR #14)", () => {
    it("should include sled for conditioning", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("sled");
    });

    it("should include ez_bar for isolation exercises", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("ez_bar");
    });

    it("should include trx for suspension training", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("trx");
    });

    it("should include tank for push/pull conditioning", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("tank");
    });

    it("should include basketball for sport-specific drills", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("basketball");
    });

    it("should include bar for inverted rows", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("bar");
    });
  });

  // PR #17 additions
  describe("Additional Equipment (PR #17)", () => {
    it("should include stability_ball", () => {
      expect(EQUIPMENT_GLOSSARY).toContain("stability_ball");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("EXERCISES", () => {
  it("should have at least 50 exercises", () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(50);
  });

  it("each exercise should have required fields", () => {
    for (const exercise of EXERCISES) {
      expect(exercise).toHaveProperty("name");
      expect(exercise).toHaveProperty("slug");
      expect(exercise).toHaveProperty("tags");
      expect(exercise).toHaveProperty("equipment");
      expect(exercise).toHaveProperty("difficulty");
      expect(Array.isArray(exercise.tags)).toBe(true);
      expect(Array.isArray(exercise.equipment)).toBe(true);
    }
  });

  it("all slugs should be unique", () => {
    const slugs = EXERCISES.map((e) => e.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("difficulty should be valid values", () => {
    const validDifficulties = ["beginner", "intermediate", "advanced"];
    for (const exercise of EXERCISES) {
      expect(validDifficulties).toContain(exercise.difficulty);
    }
  });

  it("all exercise tags should be valid", () => {
    for (const exercise of EXERCISES) {
      for (const tag of exercise.tags) {
        expect(ALL_VALID_TAGS).toContain(tag);
      }
    }
  });

  it("all exercise equipment should be valid", () => {
    for (const exercise of EXERCISES) {
      for (const equip of exercise.equipment) {
        expect(EQUIPMENT_GLOSSARY).toContain(equip);
      }
    }
  });

  // Basketball Program Exercises (PR #14)
  describe("Basketball Program Exercises (PR #14)", () => {
    it("should include lateral_lean for mobility", () => {
      const exercise = EXERCISES.find((e) => e.slug === "lateral_lean");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("mobility");
    });

    it("should include lateral_skip for warmup", () => {
      const exercise = EXERCISES.find((e) => e.slug === "lateral_skip");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("warmup");
    });

    it("should include skater_hops for plyometrics", () => {
      const exercise = EXERCISES.find((e) => e.slug === "skater_hops");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("plyometric");
    });

    it("should include sled_push for conditioning", () => {
      const exercise = EXERCISES.find((e) => e.slug === "sled_push");
      expect(exercise).toBeDefined();
      expect(exercise?.equipment).toContain("sled");
      expect(exercise?.tags).toContain("conditioning");
    });

    it("should include sled_pull for conditioning", () => {
      const exercise = EXERCISES.find((e) => e.slug === "sled_pull");
      expect(exercise).toBeDefined();
      expect(exercise?.equipment).toContain("sled");
    });

    it("should include med_ball_chest_pass for power", () => {
      const exercise = EXERCISES.find((e) => e.slug === "med_ball_chest_pass");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("power");
    });

    it("should include ez_curl_skullcrusher for isolation", () => {
      const exercise = EXERCISES.find((e) => e.slug === "ez_curl_skullcrusher");
      expect(exercise).toBeDefined();
      expect(exercise?.equipment).toContain("ez_bar");
    });

    it("should include trx_row for pulling", () => {
      const exercise = EXERCISES.find((e) => e.slug === "trx_row");
      expect(exercise).toBeDefined();
      expect(exercise?.equipment).toContain("trx");
    });

    it("should include aggressive_dribble for sport-specific", () => {
      const exercise = EXERCISES.find((e) => e.slug === "aggressive_dribble");
      expect(exercise).toBeDefined();
      expect(exercise?.equipment).toContain("basketball");
      expect(exercise?.tags).toContain("basketball");
    });

    it("should include bodyweight alternatives", () => {
      expect(EXERCISES.find((e) => e.slug === "bear_crawl")).toBeDefined();
      expect(EXERCISES.find((e) => e.slug === "reverse_bear_crawl")).toBeDefined();
      expect(EXERCISES.find((e) => e.slug === "explosive_pushup")).toBeDefined();
      expect(EXERCISES.find((e) => e.slug === "burpee")).toBeDefined();
    });
  });

  // PR #17 Exercises
  describe("Additional Exercises (PR #17)", () => {
    it("should include glute_bridge", () => {
      const exercise = EXERCISES.find((e) => e.slug === "glute_bridge");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("glute");
    });

    it("should include bicycle_crunch", () => {
      const exercise = EXERCISES.find((e) => e.slug === "bicycle_crunch");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("core");
    });

    it("should include hamstring_curl", () => {
      const exercise = EXERCISES.find((e) => e.slug === "hamstring_curl");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("hamstring");
    });

    it("should include single_arm_plank", () => {
      const exercise = EXERCISES.find((e) => e.slug === "single_arm_plank");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("anti_rotation");
    });

    it("should include shuttle_sprint", () => {
      const exercise = EXERCISES.find((e) => e.slug === "shuttle_sprint");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("agility");
    });

    it("should include stability_ball_plank", () => {
      const exercise = EXERCISES.find((e) => e.slug === "stability_ball_plank");
      expect(exercise).toBeDefined();
      expect(exercise?.equipment).toContain("stability_ball");
    });

    it("should include band_woodchop", () => {
      const exercise = EXERCISES.find((e) => e.slug === "band_woodchop");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("rotation");
    });

    it("should include plyo_push_up", () => {
      const exercise = EXERCISES.find((e) => e.slug === "plyo_push_up");
      expect(exercise).toBeDefined();
      expect(exercise?.tags).toContain("plyometric");
    });
  });

  // Exercise progressions
  describe("Exercise Progressions", () => {
    it("sled_push should have bear_crawl as easier progression", () => {
      const exercise = EXERCISES.find((e) => e.slug === "sled_push");
      expect(exercise?.progressions?.easier).toBe("bear_crawl");
    });

    it("sled_pull should have reverse_bear_crawl as easier progression", () => {
      const exercise = EXERCISES.find((e) => e.slug === "sled_pull");
      expect(exercise?.progressions?.easier).toBe("reverse_bear_crawl");
    });

    it("aggressive_dribble should have high_knees as easier progression", () => {
      const exercise = EXERCISES.find((e) => e.slug === "aggressive_dribble");
      expect(exercise?.progressions?.easier).toBe("high_knees");
    });

    it("single_arm_plank should have plank as easier progression", () => {
      const exercise = EXERCISES.find((e) => e.slug === "single_arm_plank");
      expect(exercise?.progressions?.easier).toBe("plank");
    });

    it("band_woodchop should have cable_woodchop as harder progression", () => {
      const exercise = EXERCISES.find((e) => e.slug === "band_woodchop");
      expect(exercise?.progressions?.harder).toBe("cable_woodchop");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE TEMPLATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("SAMPLE_TEMPLATE", () => {
  it("should have all required fields", () => {
    expect(SAMPLE_TEMPLATE).toHaveProperty("gppCategoryId");
    expect(SAMPLE_TEMPLATE).toHaveProperty("phase");
    expect(SAMPLE_TEMPLATE).toHaveProperty("skillLevel");
    expect(SAMPLE_TEMPLATE).toHaveProperty("week");
    expect(SAMPLE_TEMPLATE).toHaveProperty("day");
    expect(SAMPLE_TEMPLATE).toHaveProperty("name");
    expect(SAMPLE_TEMPLATE).toHaveProperty("description");
    expect(SAMPLE_TEMPLATE).toHaveProperty("estimatedDurationMinutes");
    expect(SAMPLE_TEMPLATE).toHaveProperty("exercises");
  });

  it("should have valid gppCategoryId", () => {
    expect([1, 2, 3, 4]).toContain(SAMPLE_TEMPLATE.gppCategoryId);
  });

  it("should have valid phase", () => {
    expect(["GPP", "SPP", "SSP"]).toContain(SAMPLE_TEMPLATE.phase);
  });

  it("should have valid skillLevel", () => {
    expect(["Novice", "Moderate", "Advanced"]).toContain(SAMPLE_TEMPLATE.skillLevel);
  });

  it("exercises should have proper structure", () => {
    expect(Array.isArray(SAMPLE_TEMPLATE.exercises)).toBe(true);
    expect(SAMPLE_TEMPLATE.exercises.length).toBeGreaterThan(0);

    for (const exercise of SAMPLE_TEMPLATE.exercises) {
      expect(exercise).toHaveProperty("exerciseSlug");
      expect(exercise).toHaveProperty("sets");
      expect(exercise).toHaveProperty("reps");
      expect(exercise).toHaveProperty("restSeconds");
      expect(exercise).toHaveProperty("orderIndex");
    }
  });

  it("all exercise slugs should reference valid exercises", () => {
    const validSlugs = EXERCISES.map((e) => e.slug);
    for (const exercise of SAMPLE_TEMPLATE.exercises) {
      expect(validSlugs).toContain(exercise.exerciseSlug);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE DATA TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("EXAMPLE_INTAKE", () => {
  it("should have all required intake fields", () => {
    expect(EXAMPLE_INTAKE).toHaveProperty("sportName");
    expect(EXAMPLE_INTAKE).toHaveProperty("yearsOfExperience");
    expect(EXAMPLE_INTAKE).toHaveProperty("preferredTrainingDaysPerWeek");
    expect(EXAMPLE_INTAKE).toHaveProperty("assignedGppCategoryId");
    expect(EXAMPLE_INTAKE).toHaveProperty("assignedSkillLevel");
    expect(EXAMPLE_INTAKE).toHaveProperty("intakeType");
  });

  it("should map Soccer to Category 1", () => {
    expect(EXAMPLE_INTAKE.sportName).toBe("Soccer");
    expect(EXAMPLE_INTAKE.assignedGppCategoryId).toBe(1);
  });

  it("should have valid skill level", () => {
    expect(["Novice", "Moderate", "Advanced"]).toContain(EXAMPLE_INTAKE.assignedSkillLevel);
  });

  it("should have valid intake type", () => {
    expect(["initial", "reassessment"]).toContain(EXAMPLE_INTAKE.intakeType);
  });
});

describe("EXAMPLE_USER_PROGRAM", () => {
  it("should have all required program fields", () => {
    expect(EXAMPLE_USER_PROGRAM).toHaveProperty("gppCategoryId");
    expect(EXAMPLE_USER_PROGRAM).toHaveProperty("skillLevel");
    expect(EXAMPLE_USER_PROGRAM).toHaveProperty("currentPhase");
    expect(EXAMPLE_USER_PROGRAM).toHaveProperty("currentWeek");
    expect(EXAMPLE_USER_PROGRAM).toHaveProperty("currentDay");
  });

  it("should start in GPP phase", () => {
    expect(EXAMPLE_USER_PROGRAM.currentPhase).toBe("GPP");
  });

  it("should start at week 1, day 1", () => {
    expect(EXAMPLE_USER_PROGRAM.currentWeek).toBe(1);
    expect(EXAMPLE_USER_PROGRAM.currentDay).toBe(1);
  });

  it("SPP and SSP should be locked initially", () => {
    expect(EXAMPLE_USER_PROGRAM.sppUnlockedAt).toBeUndefined();
    expect(EXAMPLE_USER_PROGRAM.sspUnlockedAt).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WARMUP EXERCISES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Warmup Exercises", () => {
  const warmupExercises = EXERCISES.filter((e) => e.tags.includes("warmup"));

  it("should have at least 50 warmup-tagged exercises", () => {
    expect(warmupExercises.length).toBeGreaterThanOrEqual(50);
  });

  it("all warmup exercise slugs should be unique", () => {
    const slugs = warmupExercises.map((e) => e.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  describe("Foam Rolling exercises", () => {
    const foamRolling = EXERCISES.filter((e) => e.tags.includes("foam_rolling"));

    it("should have at least 8 foam rolling exercises", () => {
      expect(foamRolling.length).toBeGreaterThanOrEqual(8);
    });

    it("all foam rolling exercises should require foam_roller equipment", () => {
      for (const ex of foamRolling) {
        expect(ex.equipment).toContain("foam_roller");
      }
    });

    it("all foam rolling exercises should be beginner difficulty", () => {
      for (const ex of foamRolling) {
        expect(ex.difficulty).toBe("beginner");
      }
    });
  });

  describe("Mobility exercises", () => {
    const mobilityExercises = EXERCISES.filter(
      (e) => e.tags.includes("mobility") && e.tags.includes("warmup")
    );

    it("should have at least 8 mobility warmup exercises", () => {
      expect(mobilityExercises.length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("Core Isometric exercises", () => {
    const coreIsometric = EXERCISES.filter(
      (e) => e.tags.includes("isometric") && e.tags.includes("warmup")
    );

    it("should have at least 4 isometric warmup exercises", () => {
      expect(coreIsometric.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("Walking Drills", () => {
    const walkingDrills = EXERCISES.filter(
      (e) => e.slug.startsWith("walking_") || e.slug === "heel_toe_walk" || e.slug === "lateral_shuffle"
    );

    it("should have at least 8 walking drill exercises", () => {
      expect(walkingDrills.length).toBeGreaterThanOrEqual(8);
    });

    it("all walking drills should be beginner difficulty", () => {
      for (const ex of walkingDrills) {
        expect(ex.difficulty).toBe("beginner");
      }
    });
  });

  describe("Movement Prep exercises", () => {
    const movementPrep = ["jog", "carioca", "skip", "power_skip", "a_skip", "b_skip", "high_knees_drill", "butt_kicks"];

    it("should have all movement prep exercises", () => {
      for (const slug of movementPrep) {
        const found = EXERCISES.find((e) => e.slug === slug);
        expect(found).toBeDefined();
        expect(found?.tags).toContain("warmup");
      }
    });
  });

  describe("Power Primer exercises", () => {
    const powerPrimers = EXERCISES.filter(
      (e) => e.tags.includes("warmup") && e.tags.includes("power") && e.tags.includes("explosive")
    );

    it("should have at least 7 power primer exercises", () => {
      expect(powerPrimers.length).toBeGreaterThanOrEqual(7);
    });

    it("all power primer exercises should be beginner difficulty", () => {
      for (const ex of powerPrimers) {
        expect(ex.difficulty).toBe("beginner");
      }
    });
  });

  it("new warmup exercises should all be beginner difficulty", () => {
    const newWarmupSlugs = [
      "foam_roll_quads", "foam_roll_hamstrings", "foam_roll_it_band", "foam_roll_calves",
      "foam_roll_glutes", "foam_roll_thoracic", "foam_roll_lats", "foam_roll_adductors",
      "ankle_circles", "hip_circles", "arm_cross_body_stretch", "shoulder_pass_through",
      "inchworm", "scorpion_stretch",
      "hollow_body_hold", "bear_crawl_hold", "tall_kneeling_pallof_hold", "quadruped_belly_lift",
      "core_bicycle", "bird_dog_crunch", "glute_bridge_march", "dead_bug_with_reach",
      "heel_toe_walk", "walking_knee_hug", "walking_quad_stretch", "walking_cradle_stretch",
      "walking_rdl_reach", "walking_spiderman", "lateral_shuffle", "walking_lunge_rotation",
      "jog", "carioca", "skip", "power_skip", "a_skip", "b_skip", "high_knees_drill", "butt_kicks",
      "med_ball_chest_pass_warmup", "med_ball_overhead_throw_warmup", "med_ball_rotational_pass",
      "broad_jump_warmup", "vertical_jump_warmup", "box_jump_warmup", "explosive_pushup_warmup",
    ];

    for (const slug of newWarmupSlugs) {
      const exercise = EXERCISES.find((e) => e.slug === slug);
      expect(exercise).toBeDefined();
      expect(exercise?.difficulty).toBe("beginner");
    }
  });
});

describe("Warmup Equipment", () => {
  it("should include foam_roller in equipment glossary", () => {
    expect(EQUIPMENT_GLOSSARY).toContain("foam_roller");
  });

  it("should include mini_band in equipment glossary", () => {
    expect(EQUIPMENT_GLOSSARY).toContain("mini_band");
  });
});

describe("Warmup Tags", () => {
  it("should include foam_rolling in purpose tags", () => {
    expect(TAGS_GLOSSARY.purpose).toContain("foam_rolling");
  });

  it("should include activation in purpose tags", () => {
    expect(TAGS_GLOSSARY.purpose).toContain("activation");
  });
});
