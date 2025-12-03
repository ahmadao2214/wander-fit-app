/**
 * GPP Seed Data (MVP)
 * 
 * This file contains the reference data for:
 * - GPP Categories (4)
 * - Sports (mapped to categories)
 * - Core Exercises (foundational movement library)
 * 
 * Run via Convex dashboard: seed.seedAll({})
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE DECISIONS (Confirmed)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1. Workout Access Model: HYBRID
 *    - "Suggested next workout" displayed prominently
 *    - Athletes can browse any workout within unlocked phases
 * 
 * 2. Phase Accessibility: SEQUENTIAL
 *    - Must complete GPP (4 weeks) → unlocks SPP
 *    - Must complete SPP (4 weeks) → unlocks SSP
 * 
 * 3. Skill Level: AUTO-CALCULATED + MANUAL OVERRIDE
 *    - Initially calculated from intake assessment
 *    - Can be manually changed by athlete
 *    - Advances upon training block completion
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUTURE ITERATION: Re-Assessment Intake
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * After completing a training block, athletes should have the option to
 * re-take assessment questions to evaluate skill level advancement.
 * 
 * Example (from co-founder):
 * - Initial intake: "Can you hold a plank for 2 minutes?" → Novice
 * - After training block: "Try around-the-worlds plank" → If successful → Moderate
 * 
 * This allows the intake to serve dual purposes:
 * 1. Initial assignment (sport → category, experience → skill level)
 * 2. Progression assessment (re-evaluate after training block completion)
 * 
 * Questions to think through:
 * - When should re-assessment be triggered? (After phase? After X workouts?)
 * - Should it be automatic prompt or user-initiated?
 * - How to design assessment exercises for each skill level transition?
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// GPP CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

export const GPP_CATEGORIES = [
  {
    categoryId: 1,
    name: "Continuous/Directional",
    shortName: "Endurance",
    description:
      "Sports requiring sustained running with directional changes. Focus on endurance, single-leg stability, and rotational core strength.",
    tags: [
      "high_rep_ranges",
      "single_leg_stability",
      "rotational_core",
      "aerobic_capacity",
    ],
  },
  {
    categoryId: 2,
    name: "Explosive/Vertical",
    shortName: "Power",
    description:
      "Sports requiring explosive vertical movements and rapid deceleration. Focus on jump mechanics, landing tolerance, and vertical power.",
    tags: [
      "deceleration_mechanics",
      "vertical_power",
      "landing_tolerance",
      "reactive_strength",
    ],
  },
  {
    categoryId: 3,
    name: "Rotational/Unilateral",
    shortName: "Rotation",
    description:
      "Sports requiring powerful rotation and asymmetric movement patterns. Focus on anti-rotation, thoracic mobility, and hip power.",
    tags: [
      "anti_rotation",
      "thoracic_mobility",
      "hip_power",
      "unilateral_strength",
    ],
  },
  {
    categoryId: 4,
    name: "General Strength",
    shortName: "Strength",
    description:
      "Sports requiring overall strength, grappling, and work capacity. Focus on absolute strength, grip endurance, and general conditioning.",
    tags: [
      "absolute_strength",
      "grip_endurance",
      "work_capacity",
      "bilateral_power",
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const SPORTS = [
  // Category 1: Continuous/Directional
  { name: "Soccer", gppCategoryId: 1 },
  { name: "Field Hockey", gppCategoryId: 1 },
  { name: "Lacrosse", gppCategoryId: 1 },
  { name: "Rugby", gppCategoryId: 1 },
  { name: "Ultimate Frisbee", gppCategoryId: 1 },
  { name: "Cross Country", gppCategoryId: 1 },
  { name: "Track (Distance)", gppCategoryId: 1 },

  // Category 2: Explosive/Vertical
  { name: "Basketball", gppCategoryId: 2 },
  { name: "Volleyball", gppCategoryId: 2 },
  { name: "Track (Sprints/Jumps)", gppCategoryId: 2 },
  { name: "Gymnastics", gppCategoryId: 2 },
  { name: "Cheerleading", gppCategoryId: 2 },
  { name: "Diving", gppCategoryId: 2 },

  // Category 3: Rotational/Unilateral
  { name: "Baseball", gppCategoryId: 3 },
  { name: "Softball", gppCategoryId: 3 },
  { name: "Tennis", gppCategoryId: 3 },
  { name: "Golf", gppCategoryId: 3 },
  { name: "Badminton", gppCategoryId: 3 },
  { name: "Racquetball", gppCategoryId: 3 },
  { name: "Cricket", gppCategoryId: 3 },

  // Category 4: General Strength
  { name: "Football", gppCategoryId: 4 },
  { name: "Wrestling", gppCategoryId: 4 },
  { name: "Ice Hockey", gppCategoryId: 4 },
  { name: "Swimming", gppCategoryId: 4 },
  { name: "Martial Arts", gppCategoryId: 4 },
  { name: "Weightlifting", gppCategoryId: 4 },
  { name: "General Fitness", gppCategoryId: 4 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TAGS GLOSSARY
// 
// This is the reference list of valid tags for exercises.
// Keep this updated as new exercises are added.
// ═══════════════════════════════════════════════════════════════════════════════

export const TAGS_GLOSSARY = {
  // Body Part (where the exercise primarily targets)
  bodyPart: [
    "lower_body",
    "upper_body",
    "core",
    "full_body",
  ],
  
  // Movement Pattern (the type of movement)
  movementPattern: [
    "squat",
    "hinge",
    "lunge",
    "push",
    "pull",
    "carry",
    "rotation",
    "anti_rotation",
    "anti_extension",
    "anti_lateral_flexion",
  ],
  
  // Laterality (bilateral vs unilateral)
  laterality: [
    "bilateral",
    "unilateral",
    "single_leg",
    "single_arm",
  ],
  
  // Purpose (what the exercise is used for)
  purpose: [
    "warmup",
    "cooldown",
    "mobility",
    "strength",
    "power",
    "conditioning",
    "plyometric",
    "stability",
    "isometric",
  ],
  
  // Muscle Emphasis (specific muscle focus)
  muscleEmphasis: [
    "quad_dominant",
    "hamstring",
    "glute",
    "posterior_chain",
    "chest",
    "back",
    "shoulder",
    "rear_delt",
    "hip_flexor",
    "thoracic",
    "hip",
    "spine",
  ],
  
  // Plane of Motion
  plane: [
    "sagittal",       // Forward/backward
    "frontal",        // Side to side
    "transverse",     // Rotational
    "horizontal",     // Horizontal pushing/pulling
    "vertical",       // Vertical pushing/pulling
    "incline",
  ],
  
  // Training Quality
  trainingQuality: [
    "explosive",
    "reactive",
    "dynamic",
    "static",
    "compound",
    "functional",
    "balance",
    "coordination",
    "shoulder_health",
  ],
  
  // Equipment Context
  equipmentContext: [
    "bodyweight",     // No equipment needed
  ],
};

// Flat list of all valid tags (for validation)
export const ALL_VALID_TAGS = Object.values(TAGS_GLOSSARY).flat();

// ═══════════════════════════════════════════════════════════════════════════════
// EQUIPMENT GLOSSARY
// 
// Valid equipment names for exercises.
// ═══════════════════════════════════════════════════════════════════════════════

export const EQUIPMENT_GLOSSARY = [
  // Free Weights
  "dumbbell",
  "kettlebell",
  "barbell",
  "trap_bar",
  "medicine_ball",
  
  // Benches & Boxes
  "bench",
  "incline_bench",
  "plyo_box",
  "box",
  
  // Racks & Bars
  "rack",
  "pull_up_bar",
  
  // Machines & Cables
  "cable_machine",
  
  // Accessories
  "band",
  "rings",
  "wall",
  
  // Bodyweight (no equipment)
  "bodyweight",
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISES
// 
// Tags should use values from TAGS_GLOSSARY above.
// Equipment should use values from EQUIPMENT_GLOSSARY above.
// ═══════════════════════════════════════════════════════════════════════════════

export const EXERCISES = [
  // ─────────────────────────────────────────────────────────────────────────────
  // LOWER BODY - SQUAT PATTERNS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Goblet Squat",
    slug: "goblet_squat",
    tags: ["lower_body", "squat", "bilateral", "strength", "quad_dominant"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner" as const,
    instructions:
      "Hold a dumbbell or kettlebell at chest height with both hands. Squat down keeping your torso upright, elbows tracking inside your knees. Drive through your whole foot to stand.",
  },
  {
    name: "Back Squat",
    slug: "back_squat",
    tags: ["lower_body", "squat", "bilateral", "strength", "compound"],
    equipment: ["barbell", "rack"],
    difficulty: "intermediate" as const,
    instructions:
      "Position barbell on upper back. Unrack and step back. Squat down until hip crease passes below knee level. Drive up maintaining neutral spine.",
  },
  {
    name: "Front Squat",
    slug: "front_squat",
    tags: ["lower_body", "squat", "bilateral", "strength", "quad_dominant"],
    equipment: ["barbell", "rack"],
    difficulty: "advanced" as const,
  },
  {
    name: "Bulgarian Split Squat",
    slug: "bulgarian_split_squat",
    tags: ["lower_body", "squat", "unilateral", "strength", "single_leg"],
    equipment: ["dumbbell", "bench"],
    difficulty: "intermediate" as const,
    instructions:
      "Place rear foot on a bench behind you. Hold dumbbells at sides. Lower until front thigh is parallel to ground. Drive through front foot to stand.",
  },
  {
    name: "Single Leg Squat to Box",
    slug: "single_leg_squat_box",
    tags: ["lower_body", "squat", "unilateral", "strength", "single_leg", "balance"],
    equipment: ["box", "bench"],
    difficulty: "intermediate" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOWER BODY - HINGE PATTERNS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Romanian Deadlift",
    slug: "romanian_deadlift",
    tags: ["lower_body", "hinge", "bilateral", "strength", "hamstring", "posterior_chain"],
    equipment: ["barbell", "dumbbell"],
    difficulty: "intermediate" as const,
    instructions:
      "Hold barbell at hip level. Push hips back while maintaining slight knee bend. Lower until you feel hamstring stretch. Drive hips forward to return.",
  },
  {
    name: "Single Leg RDL",
    slug: "single_leg_rdl",
    tags: ["lower_body", "hinge", "unilateral", "strength", "balance", "hamstring"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Trap Bar Deadlift",
    slug: "trap_bar_deadlift",
    tags: ["lower_body", "hinge", "bilateral", "strength", "compound", "power"],
    equipment: ["trap_bar"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Hip Thrust",
    slug: "hip_thrust",
    tags: ["lower_body", "hinge", "bilateral", "strength", "glute"],
    equipment: ["barbell", "bench"],
    difficulty: "beginner" as const,
  },
  {
    name: "Kettlebell Swing",
    slug: "kettlebell_swing",
    tags: ["lower_body", "hinge", "bilateral", "power", "conditioning"],
    equipment: ["kettlebell"],
    difficulty: "intermediate" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // LOWER BODY - LUNGE PATTERNS
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Reverse Lunge",
    slug: "reverse_lunge",
    tags: ["lower_body", "lunge", "unilateral", "strength", "single_leg"],
    equipment: ["dumbbell", "bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Walking Lunge",
    slug: "walking_lunge",
    tags: ["lower_body", "lunge", "unilateral", "strength", "conditioning"],
    equipment: ["dumbbell", "bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Lateral Lunge",
    slug: "lateral_lunge",
    tags: ["lower_body", "lunge", "unilateral", "mobility", "frontal"],
    equipment: ["dumbbell", "bodyweight"],
    difficulty: "beginner" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // UPPER BODY - PUSH
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Push-Up",
    slug: "push_up",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bodyweight"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Dumbbell Bench Press",
    slug: "db_bench_press",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bilateral"],
    equipment: ["dumbbell", "bench"],
    difficulty: "beginner" as const,
  },
  {
    name: "Incline Dumbbell Press",
    slug: "incline_db_press",
    tags: ["upper_body", "push", "incline", "strength", "chest"],
    equipment: ["dumbbell", "incline_bench"],
    difficulty: "beginner" as const,
  },
  {
    name: "Overhead Press",
    slug: "overhead_press",
    tags: ["upper_body", "push", "vertical", "strength", "shoulder"],
    equipment: ["barbell", "dumbbell"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Dumbbell Shoulder Press",
    slug: "db_shoulder_press",
    tags: ["upper_body", "push", "vertical", "strength", "shoulder"],
    equipment: ["dumbbell"],
    difficulty: "beginner" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // UPPER BODY - PULL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Pull-Up",
    slug: "pull_up",
    tags: ["upper_body", "pull", "vertical", "strength", "back", "bodyweight"],
    equipment: ["pull_up_bar"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Inverted Row",
    slug: "inverted_row",
    tags: ["upper_body", "pull", "horizontal", "strength", "back", "bodyweight"],
    equipment: ["barbell", "rack", "rings"],
    difficulty: "beginner" as const,
  },
  {
    name: "Dumbbell Row",
    slug: "db_row",
    tags: ["upper_body", "pull", "horizontal", "strength", "back", "unilateral"],
    equipment: ["dumbbell", "bench"],
    difficulty: "beginner" as const,
  },
  {
    name: "Lat Pulldown",
    slug: "lat_pulldown",
    tags: ["upper_body", "pull", "vertical", "strength", "back"],
    equipment: ["cable_machine"],
    difficulty: "beginner" as const,
  },
  {
    name: "Face Pull",
    slug: "face_pull",
    tags: ["upper_body", "pull", "horizontal", "shoulder_health", "rear_delt"],
    equipment: ["cable_machine", "band"],
    difficulty: "beginner" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // CORE
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Plank",
    slug: "plank",
    tags: ["core", "anti_extension", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Dead Bug",
    slug: "dead_bug",
    tags: ["core", "anti_extension", "stability", "coordination", "warmup"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Pallof Press",
    slug: "pallof_press",
    tags: ["core", "anti_rotation", "stability"],
    equipment: ["cable_machine", "band"],
    difficulty: "beginner" as const,
  },
  {
    name: "Bird Dog",
    slug: "bird_dog",
    tags: ["core", "anti_rotation", "stability", "coordination", "warmup"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Cable Woodchop",
    slug: "cable_woodchop",
    tags: ["core", "rotation", "power", "functional"],
    equipment: ["cable_machine"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Hanging Leg Raise",
    slug: "hanging_leg_raise",
    tags: ["core", "anti_extension", "strength", "hip_flexor"],
    equipment: ["pull_up_bar"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Side Plank",
    slug: "side_plank",
    tags: ["core", "anti_lateral_flexion", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // PLYOMETRICS / POWER
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Box Jump",
    slug: "box_jump",
    tags: ["lower_body", "plyometric", "power", "explosive"],
    equipment: ["plyo_box"],
    difficulty: "intermediate" as const,
  },
  {
    name: "Broad Jump",
    slug: "broad_jump",
    tags: ["lower_body", "plyometric", "power", "horizontal", "explosive"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Depth Jump",
    slug: "depth_jump",
    tags: ["lower_body", "plyometric", "power", "reactive"],
    equipment: ["plyo_box"],
    difficulty: "advanced" as const,
  },
  {
    name: "Skater Jump",
    slug: "skater_jump",
    tags: ["lower_body", "plyometric", "power", "frontal", "single_leg"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Medicine Ball Slam",
    slug: "med_ball_slam",
    tags: ["full_body", "power", "upper_body", "core", "conditioning"],
    equipment: ["medicine_ball"],
    difficulty: "beginner" as const,
  },
  {
    name: "Medicine Ball Rotational Throw",
    slug: "med_ball_rotational_throw",
    tags: ["core", "power", "rotation", "explosive"],
    equipment: ["medicine_ball", "wall"],
    difficulty: "intermediate" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // MOBILITY / WARMUP
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "World's Greatest Stretch",
    slug: "worlds_greatest_stretch",
    tags: ["mobility", "warmup", "hip", "thoracic", "dynamic"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "90/90 Hip Stretch",
    slug: "90_90_hip_stretch",
    tags: ["mobility", "hip", "rotation", "cooldown"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Cat-Cow",
    slug: "cat_cow",
    tags: ["mobility", "warmup", "spine", "dynamic"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Hip Flexor Stretch",
    slug: "hip_flexor_stretch",
    tags: ["mobility", "hip", "cooldown"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Thoracic Rotation",
    slug: "thoracic_rotation",
    tags: ["mobility", "thoracic", "rotation", "warmup"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE PROGRAM TEMPLATE
// Example of how templates will be structured (uses exercise slugs)
// ═══════════════════════════════════════════════════════════════════════════════

export const SAMPLE_TEMPLATE = {
  gppCategoryId: 1,
  phase: "GPP" as const,
  skillLevel: "Novice" as const,
  week: 1,
  day: 1,
  name: "Lower Body Foundation - Day 1",
  description: "Introduction to fundamental lower body movement patterns with emphasis on form and control.",
  estimatedDurationMinutes: 45,
  exercises: [
    // Warmup exercises (tagged as warmup)
    { exerciseSlug: "cat_cow", sets: 1, reps: "10", restSeconds: 0, notes: "Warmup: slow, controlled", orderIndex: 0 },
    { exerciseSlug: "worlds_greatest_stretch", sets: 1, reps: "5 each side", restSeconds: 0, orderIndex: 1 },
    // Main workout
    { exerciseSlug: "goblet_squat", sets: 3, reps: "12-15", tempo: "3010", restSeconds: 60, notes: "Focus on depth and control", orderIndex: 2 },
    { exerciseSlug: "romanian_deadlift", sets: 3, reps: "10-12", tempo: "3010", restSeconds: 60, notes: "Feel the hamstring stretch", orderIndex: 3 },
    { exerciseSlug: "reverse_lunge", sets: 2, reps: "10 each", tempo: "2010", restSeconds: 45, orderIndex: 4 },
    { exerciseSlug: "plank", sets: 3, reps: "30s", restSeconds: 30, notes: "Maintain neutral spine", orderIndex: 5 },
    // Cooldown (tagged as cooldown)
    { exerciseSlug: "90_90_hip_stretch", sets: 1, reps: "30s each side", restSeconds: 0, notes: "Cooldown", orderIndex: 6 },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE USER PROGRAM (for testing)
// This demonstrates the data structure for an active athlete's program
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Example intake response from a soccer player
 */
export const EXAMPLE_INTAKE = {
  // User answers
  sportName: "Soccer", // Maps to gppCategoryId: 1
  yearsOfExperience: 2,
  preferredTrainingDaysPerWeek: 4,
  weeksUntilSeason: 12,
  
  // Calculated results
  assignedGppCategoryId: 1, // Continuous/Directional (from Soccer)
  assignedSkillLevel: "Novice" as const, // 2 years → Novice
  intakeType: "initial" as const,
};

/**
 * Example user program state after completing intake
 */
export const EXAMPLE_USER_PROGRAM = {
  // From intake
  gppCategoryId: 1,
  skillLevel: "Novice" as const,
  
  // Scheduled workout pointer
  currentPhase: "GPP" as const,
  currentWeek: 1,
  currentDay: 1,
  
  // Phase unlocking (GPP always unlocked)
  sppUnlockedAt: undefined, // Not yet completed GPP
  sspUnlockedAt: undefined, // Not yet completed SPP
};

/**
 * What this athlete's dashboard would show:
 * 
 * ┌─────────────────────────────────────────────────────────────┐
 * │  🎯 TODAY'S WORKOUT                                         │
 * │  "Lower Body Foundation - Day 1"                            │
 * │  GPP Week 1 • ~45 min                                       │
 * │  [Start Workout]                                            │
 * └─────────────────────────────────────────────────────────────┘
 * │                                                             │
 * │  📚 BROWSE TRAINING BLOCK                                   │
 * │  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │
 * │  │   GPP    │ │   SPP    │ │   SSP    │                    │
 * │  │    ✓     │ │    🔒    │ │    🔒    │                    │
 * │  │ unlocked │ │  locked  │ │  locked  │                    │
 * │  └──────────┘ └──────────┘ └──────────┘                    │
 * │                                                             │
 * │  📊 PROGRESS                                                │
 * │  Week 1 of 4 • Day 1 of 4                                   │
 * │  [░░░░░░░░░░] 0% of GPP complete                            │
 * └─────────────────────────────────────────────────────────────┘
 */
