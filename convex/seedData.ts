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
    "agility",        // Quick directional change movements
    "isolation",      // Single-joint/muscle exercises
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
    "deceleration_mechanics",  // Landing/braking emphasis
    "eccentric",               // Lowering phase focus
    "grip_endurance",          // Grip strength emphasis
  ],
  
  // Equipment Context
  equipmentContext: [
    "bodyweight",     // No equipment needed
  ],

  // Sport-Specific
  sportSpecific: [
    "sport_specific", // Sport-specific skill drills
    "basketball",     // Basketball-specific exercises
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

  // Specialty Equipment
  "stability_ball",

  // Bodyweight (no equipment)
  "bodyweight",

  // Basketball program additions
  "sled",        // Weighted sled for push/pull conditioning
  "ez_bar",      // EZ curl bar for isolation exercises
  "trx",         // TRX suspension trainer
  "tank",        // Tank/prowler push-pull device
  "basketball",  // Basketball for sport-specific drills
  "bar",         // Fixed bar for inverted rows
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
    progressions: {
      harder: "back_squat",
    },
  },
  {
    name: "Back Squat",
    slug: "back_squat",
    tags: ["lower_body", "squat", "bilateral", "strength", "compound"],
    equipment: ["barbell", "rack"],
    difficulty: "intermediate" as const,
    instructions:
      "Position barbell on upper back. Unrack and step back. Squat down until hip crease passes below knee level. Drive up maintaining neutral spine.",
    progressions: {
      easier: "goblet_squat",
      harder: "front_squat",
    },
  },
  {
    name: "Front Squat",
    slug: "front_squat",
    tags: ["lower_body", "squat", "bilateral", "strength", "quad_dominant"],
    equipment: ["barbell", "rack"],
    difficulty: "advanced" as const,
    progressions: {
      easier: "back_squat",
    },
  },
  {
    name: "Bulgarian Split Squat",
    slug: "bulgarian_split_squat",
    tags: ["lower_body", "squat", "unilateral", "strength", "single_leg"],
    equipment: ["dumbbell", "bench"],
    difficulty: "intermediate" as const,
    instructions:
      "Place rear foot on a bench behind you. Hold dumbbells at sides. Lower until front thigh is parallel to ground. Drive through front foot to stand.",
    progressions: {
      easier: "single_leg_squat_box",
      harder: "assisted_pistol_squat",
    },
  },
  {
    name: "Single Leg Squat to Box",
    slug: "single_leg_squat_box",
    tags: ["lower_body", "squat", "unilateral", "strength", "single_leg", "balance"],
    equipment: ["box", "bench"],
    difficulty: "intermediate" as const,
    progressions: {
      harder: "bulgarian_split_squat",
    },
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
    progressions: {
      harder: "kickstand_rdl",
    },
  },
  {
    name: "Single Leg RDL",
    slug: "single_leg_rdl",
    tags: ["lower_body", "hinge", "unilateral", "strength", "balance", "hamstring"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "kickstand_rdl",
      harder: "single_leg_deadlift",
    },
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
    progressions: {
      easier: "glute_bridge",
      harder: "single_leg_hip_thrust",
    },
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
    name: "Bodyweight Squat",
    slug: "bodyweight_squat",
    tags: ["lower_body", "squat", "bilateral", "strength", "bodyweight"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Stand with feet shoulder-width apart. Squat down until thighs are parallel to ground, then stand.",
    progressions: {
      easier: "assisted_squat",
      harder: "jump_squat",
    },
  },
  {
    name: "Assisted Squat",
    slug: "assisted_squat",
    tags: ["lower_body", "squat", "bilateral", "mobility", "bodyweight"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Hold onto a sturdy support (door frame, rack) while squatting. Easier than standard squat.",
    progressions: {
      harder: "bodyweight_squat",
    },
  },
  {
    name: "Jump Squat",
    slug: "jump_squat",
    tags: ["lower_body", "squat", "bilateral", "plyometric", "power", "explosive"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "Perform a squat, then explode upward into a jump. Land softly and repeat.",
    progressions: {
      easier: "bodyweight_squat",
      harder: "box_jump",
    },
  },
  {
    name: "Reverse Lunge",
    slug: "reverse_lunge",
    tags: ["lower_body", "lunge", "unilateral", "strength", "single_leg"],
    equipment: ["dumbbell", "bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      harder: "walking_lunge",
    },
  },
  {
    name: "Walking Lunge",
    slug: "walking_lunge",
    tags: ["lower_body", "lunge", "unilateral", "strength", "conditioning"],
    equipment: ["dumbbell", "bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "reverse_lunge",
      harder: "deficit_reverse_lunge",
    },
  },
  {
    name: "Lateral Lunge",
    slug: "lateral_lunge",
    tags: ["lower_body", "lunge", "unilateral", "mobility", "frontal"],
    equipment: ["dumbbell", "bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "lateral_step_up",
      harder: "cossack_squat",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // UPPER BODY - PUSH
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Incline Push-Up",
    slug: "incline_push_up",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bodyweight"],
    equipment: ["bodyweight", "bench"],
    difficulty: "beginner" as const,
    instructions: "Place hands on an elevated surface (bench, box). Perform push-up with body at an incline. Easier than standard push-up.",
    progressions: {
      easier: "wall_push_up",
      harder: "push_up",
    },
  },
  {
    name: "Push-Up",
    slug: "push_up",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bodyweight"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "incline_push_up",
      harder: "decline_push_up",
    },
  },
  {
    name: "Decline Push-Up",
    slug: "decline_push_up",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bodyweight"],
    equipment: ["bodyweight", "bench"],
    difficulty: "intermediate" as const,
    instructions: "Place feet on an elevated surface. Perform push-up with feet higher than hands. Harder than standard push-up.",
    progressions: {
      easier: "push_up",
    },
  },
  {
    name: "Dumbbell Bench Press",
    slug: "db_bench_press",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bilateral"],
    equipment: ["dumbbell", "bench"],
    difficulty: "beginner" as const,
    progressions: {
      harder: "bench_press",
    },
  },
  {
    name: "Bench Press",
    slug: "bench_press",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bilateral", "compound"],
    equipment: ["barbell", "bench", "rack"],
    difficulty: "intermediate" as const,
    instructions: "Lie on bench with feet flat on floor. Grip bar slightly wider than shoulder-width. Lower bar to chest with control, then press up to full lockout.",
    progressions: {
      easier: "db_bench_press",
      harder: "incline_bench_press",
    },
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
    progressions: {
      easier: "db_shoulder_press",
    },
  },
  {
    name: "Dumbbell Shoulder Press",
    slug: "db_shoulder_press",
    tags: ["upper_body", "push", "vertical", "strength", "shoulder"],
    equipment: ["dumbbell"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "pike_pushup",
      harder: "overhead_press",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // UPPER BODY - PULL
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Assisted Pull-Up",
    slug: "assisted_pull_up",
    tags: ["upper_body", "pull", "vertical", "strength", "back"],
    equipment: ["pull_up_bar", "band"],
    difficulty: "beginner" as const,
    instructions: "Use a resistance band or assisted pull-up machine to help complete the movement. Easier than standard pull-up.",
    progressions: {
      easier: "negative_pull_up",
      harder: "pull_up",
    },
  },
  {
    name: "Pull-Up",
    slug: "pull_up",
    tags: ["upper_body", "pull", "vertical", "strength", "back", "bodyweight"],
    equipment: ["pull_up_bar"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "assisted_pull_up",
      harder: "weighted_pull_up",
    },
  },
  {
    name: "Weighted Pull-Up",
    slug: "weighted_pull_up",
    tags: ["upper_body", "pull", "vertical", "strength", "back"],
    equipment: ["pull_up_bar", "dumbbell"],
    difficulty: "advanced" as const,
    instructions: "Perform pull-ups with additional weight (dumbbell between feet or weight belt). Harder than standard pull-up.",
    progressions: {
      easier: "pull_up",
    },
  },
  {
    name: "Inverted Row",
    slug: "inverted_row",
    tags: ["upper_body", "pull", "horizontal", "strength", "back", "bodyweight"],
    equipment: ["barbell", "rack", "rings"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "elevated_inverted_row",
      harder: "feet_elevated_inverted_row",
    },
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
    name: "Knee Plank",
    slug: "knee_plank",
    tags: ["core", "anti_extension", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Hold plank position with knees on the ground. Easier than standard plank.",
    progressions: {
      harder: "plank",
    },
  },
  {
    name: "Plank",
    slug: "plank",
    tags: ["core", "anti_extension", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "knee_plank",
      harder: "plank_shoulder_taps",
    },
  },
  {
    name: "Plank with Shoulder Taps",
    slug: "plank_shoulder_taps",
    tags: ["core", "anti_extension", "anti_rotation", "stability", "dynamic"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "From plank position, alternate tapping each shoulder while maintaining stable hips. Harder than standard plank.",
    progressions: {
      easier: "plank",
    },
  },
  {
    name: "Dead Bug",
    slug: "dead_bug",
    tags: ["core", "anti_extension", "stability", "coordination", "warmup"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      harder: "pallof_press",
    },
  },
  {
    name: "Pallof Press",
    slug: "pallof_press",
    tags: ["core", "anti_rotation", "stability"],
    equipment: ["cable_machine", "band"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "dead_bug",
      harder: "pallof_press_march",
    },
  },
  {
    name: "Bird Dog",
    slug: "bird_dog",
    tags: ["core", "anti_rotation", "stability", "coordination", "warmup"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      harder: "bird_dog_band",
    },
  },
  {
    name: "Cable Woodchop",
    slug: "cable_woodchop",
    tags: ["core", "rotation", "power", "functional"],
    equipment: ["cable_machine"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "band_woodchop",
      harder: "low_high_woodchop",
    },
  },
  {
    name: "Hanging Leg Raise",
    slug: "hanging_leg_raise",
    tags: ["core", "anti_extension", "strength", "hip_flexor"],
    equipment: ["pull_up_bar"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "lying_leg_raise",
      harder: "toes_to_bar",
    },
  },
  {
    name: "Side Plank",
    slug: "side_plank",
    tags: ["core", "anti_lateral_flexion", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "knee_side_plank",
      harder: "side_plank_hip_dip",
    },
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
    progressions: {
      easier: "jump_squat",
      harder: "depth_jump",
    },
  },
  {
    name: "Broad Jump",
    slug: "broad_jump",
    tags: ["lower_body", "plyometric", "power", "horizontal", "explosive"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "pogo_hops",
      harder: "consecutive_broad_jumps",
    },
  },
  {
    name: "Depth Jump",
    slug: "depth_jump",
    tags: ["lower_body", "plyometric", "power", "reactive"],
    equipment: ["plyo_box"],
    difficulty: "advanced" as const,
    progressions: {
      easier: "box_jump",
      harder: "drop_jump",
    },
  },
  {
    name: "Skater Jump",
    slug: "skater_jump",
    tags: ["lower_body", "plyometric", "power", "frontal", "single_leg"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "lateral_lunge",
      harder: "skater_hops",
    },
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
    progressions: {
      easier: "kneeling_med_ball_rotation",
      harder: "rotational_med_ball_slam",
    },
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

  // ─────────────────────────────────────────────────────────────────────────────
  // BASKETBALL PROGRAM EXERCISES
  // Added for trial user (Category 2: Explosive/Vertical)
  // ─────────────────────────────────────────────────────────────────────────────

  // Mobility / Warmup
  {
    name: "Lateral Lean",
    slug: "lateral_lean",
    tags: ["lower_body", "mobility", "frontal", "hip", "warmup"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Lateral Skip",
    slug: "lateral_skip",
    tags: ["lower_body", "warmup", "agility", "frontal", "conditioning"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Jumping Jacks",
    slug: "jumping_jacks",
    tags: ["full_body", "warmup", "conditioning", "dynamic"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },

  // Plyometric / Power
  {
    name: "Skater Hops",
    slug: "skater_hops",
    tags: ["lower_body", "plyometric", "explosive", "frontal", "conditioning", "agility"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "skater_jump",
    },
  },
  {
    name: "Sprint",
    slug: "sprint",
    tags: ["full_body", "conditioning", "explosive", "power"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
  },

  // Conditioning Equipment
  {
    name: "Sled Push",
    slug: "sled_push",
    tags: ["full_body", "conditioning", "strength", "posterior_chain"],
    equipment: ["sled"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "bear_crawl",
    },
  },
  {
    name: "Sled Pull",
    slug: "sled_pull",
    tags: ["full_body", "conditioning", "pull", "posterior_chain"],
    equipment: ["sled"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "reverse_bear_crawl",
    },
  },
  {
    name: "Tank Push",
    slug: "tank_push",
    tags: ["full_body", "conditioning", "strength", "posterior_chain"],
    equipment: ["tank"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "bear_crawl",
    },
  },
  {
    name: "Tank Pull",
    slug: "tank_pull",
    tags: ["full_body", "conditioning", "pull", "posterior_chain"],
    equipment: ["tank"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "reverse_bear_crawl",
    },
  },

  // Upper Body - Power
  {
    name: "Medicine Ball Chest Pass",
    slug: "med_ball_chest_pass",
    tags: ["upper_body", "power", "push", "explosive", "chest"],
    equipment: ["medicine_ball"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "explosive_pushup",
    },
  },
  {
    name: "Medicine Ball Overhead Pass",
    slug: "med_ball_overhead_pass",
    tags: ["full_body", "power", "explosive", "shoulder"],
    equipment: ["medicine_ball"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "burpee",
    },
  },

  // Upper Body - Isolation
  {
    name: "EZ Curl Skullcrusher",
    slug: "ez_curl_skullcrusher",
    tags: ["upper_body", "push", "isolation"],
    equipment: ["ez_bar"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "diamond_pushup",
    },
  },
  {
    name: "Dumbbell Lateral Raise",
    slug: "db_lateral_raise",
    tags: ["upper_body", "shoulder", "isolation", "frontal"],
    equipment: ["dumbbell"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "arm_circles",
    },
  },
  {
    name: "Pike Push-Up",
    slug: "pike_pushup",
    tags: ["upper_body", "push", "shoulder", "bodyweight"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "push_up",
      harder: "db_shoulder_press",
    },
  },

  // Upper Body - Pull
  {
    name: "TRX Row",
    slug: "trx_row",
    tags: ["upper_body", "pull", "back", "horizontal"],
    equipment: ["trx"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "inverted_row",
    },
  },
  {
    name: "Inverted Bar Row",
    slug: "bar_row",
    tags: ["upper_body", "pull", "back", "horizontal"],
    equipment: ["bar"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "inverted_row",
    },
  },

  // Core
  {
    name: "Reverse Plank",
    slug: "reverse_plank",
    tags: ["core", "isometric", "posterior_chain", "glute"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Elbow Side Plank",
    slug: "elbow_side_plank",
    tags: ["core", "isometric", "anti_lateral_flexion", "frontal"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "side_plank",
    },
  },
  {
    name: "Mountain Climbers",
    slug: "mountain_climbers",
    tags: ["core", "conditioning", "dynamic", "full_body"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Ab Bicycle",
    slug: "ab_bicycle",
    tags: ["core", "dynamic", "rotation"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },

  // Sport-Specific
  {
    name: "Aggressive Dribble",
    slug: "aggressive_dribble",
    tags: ["conditioning", "basketball", "sport_specific", "agility"],
    equipment: ["basketball"],
    difficulty: "beginner" as const,
    progressions: {
      easier: "high_knees",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // BODYWEIGHT ALTERNATIVES
  // For athletes without specialized equipment
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Bear Crawl",
    slug: "bear_crawl",
    tags: ["full_body", "conditioning", "strength", "dynamic", "core"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Reverse Bear Crawl",
    slug: "reverse_bear_crawl",
    tags: ["full_body", "conditioning", "pull", "dynamic", "core"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "Explosive Push-Up",
    slug: "explosive_pushup",
    tags: ["upper_body", "power", "push", "explosive", "chest", "plyometric"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "push_up",
    },
  },
  {
    name: "Burpee",
    slug: "burpee",
    tags: ["full_body", "conditioning", "explosive", "power", "plyometric"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "squat_thrust",
    },
  },
  {
    name: "Diamond Push-Up",
    slug: "diamond_pushup",
    tags: ["upper_body", "push", "chest", "isolation"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    progressions: {
      easier: "push_up",
    },
  },
  {
    name: "Arm Circles",
    slug: "arm_circles",
    tags: ["upper_body", "warmup", "shoulder", "mobility"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },
  {
    name: "High Knees",
    slug: "high_knees",
    tags: ["full_body", "conditioning", "warmup", "dynamic", "agility"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // ADDITIONAL EXERCISES (From Spreadsheet)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    name: "Glute Bridge",
    slug: "glute_bridge",
    tags: ["lower_body", "hinge", "bilateral", "glute", "strength"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions:
      "Lie on your back with knees bent and feet flat. Drive through heels to lift hips until body forms a straight line. Hold at top for 2 seconds, then lower with control.",
    progressions: {
      harder: "hip_thrust",
    },
  },
  {
    name: "Bicycle Crunch",
    slug: "bicycle_crunch",
    tags: ["core", "rotation", "conditioning", "dynamic"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions:
      "Lie on back with hands behind head. Bring opposite elbow to opposite knee while extending the other leg. Alternate sides in a pedaling motion.",
  },
  {
    name: "Hamstring Curl",
    slug: "hamstring_curl",
    tags: ["lower_body", "isolation", "hamstring", "strength"],
    equipment: ["cable_machine"],
    difficulty: "beginner" as const,
    instructions:
      "Using a leg curl machine, curl heels toward glutes while keeping hips pressed down. Control the weight on the way back.",
  },
  {
    name: "Single Arm Plank",
    slug: "single_arm_plank",
    tags: ["core", "anti_rotation", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions:
      "From a standard plank position, lift one arm off the ground and hold. Keep hips level and avoid rotation. Alternate sides.",
    progressions: {
      easier: "plank",
    },
  },
  {
    name: "Shuttle Sprint",
    slug: "shuttle_sprint",
    tags: ["conditioning", "power", "agility", "lower_body"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions:
      "Set up cones 10-25 yards apart. Sprint to the far cone, touch the ground, sprint back. Focus on quick direction changes and acceleration.",
  },
  {
    name: "Stability Ball Plank",
    slug: "stability_ball_plank",
    tags: ["core", "anti_extension", "stability", "isometric"],
    equipment: ["stability_ball"],
    difficulty: "intermediate" as const,
    instructions:
      "Place forearms on a stability ball and extend legs behind you in a plank position. Hold while keeping the ball stable and core engaged.",
    progressions: {
      easier: "plank",
    },
  },
  {
    name: "Band Woodchop",
    slug: "band_woodchop",
    tags: ["core", "rotation", "functional", "power"],
    equipment: ["band"],
    difficulty: "beginner" as const,
    instructions:
      "Anchor band at shoulder height. Stand perpendicular, grip with both hands. Rotate torso to pull band diagonally across body. Control the return.",
    progressions: {
      harder: "cable_woodchop",
    },
  },
  {
    name: "Plyometric Push-Up",
    slug: "plyo_push_up",
    tags: ["upper_body", "push", "plyometric", "power", "explosive", "chest"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions:
      "Perform a push-up but explode up so hands leave the ground. Land softly and immediately go into the next rep. Can clap hands at the top.",
    progressions: {
      easier: "push_up",
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // NEW EXERCISES - PHASE II EXPANSION
  // Added for category-specific intensity programming
  // ─────────────────────────────────────────────────────────────────────────────

  // ═══════════════════════════════════════════════════════════════════════════
  // CARRY EXERCISES (NEW MOVEMENT PATTERN)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Goblet Carry",
    slug: "goblet_carry",
    tags: ["full_body", "carry", "core", "strength", "grip_endurance"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner" as const,
    instructions: "Hold a dumbbell or kettlebell at chest height (goblet position). Walk with controlled steps, keeping torso upright and core engaged.",
    progressions: {
      harder: "farmers_carry",
    },
  },
  {
    name: "Farmer's Carry",
    slug: "farmers_carry",
    tags: ["full_body", "carry", "bilateral", "strength", "grip_endurance"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner" as const,
    instructions: "Hold heavy weights at your sides. Walk with controlled steps, keeping shoulders back and core engaged. Maintain grip throughout.",
    progressions: {
      easier: "goblet_carry",
      harder: "trap_bar_carry",
    },
  },
  {
    name: "Trap Bar Carry",
    slug: "trap_bar_carry",
    tags: ["full_body", "carry", "bilateral", "strength", "grip_endurance"],
    equipment: ["trap_bar"],
    difficulty: "intermediate" as const,
    instructions: "Load trap bar heavily. Stand inside, grip handles, and walk with controlled steps. Allows for heavier loads than dumbbells.",
    progressions: {
      easier: "farmers_carry",
    },
  },
  {
    name: "Suitcase Carry",
    slug: "suitcase_carry",
    tags: ["full_body", "carry", "unilateral", "single_arm", "anti_lateral_flexion", "core"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner" as const,
    instructions: "Hold a weight on one side only. Walk without leaning, keeping torso perfectly vertical. The offset load challenges anti-lateral flexion.",
    progressions: {
      harder: "single_arm_overhead_carry",
    },
  },
  {
    name: "Single Arm Overhead Carry",
    slug: "single_arm_overhead_carry",
    tags: ["full_body", "carry", "unilateral", "single_arm", "shoulder", "stability"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "intermediate" as const,
    instructions: "Press weight overhead and lock out arm. Walk with control, keeping weight directly over shoulder. Challenges shoulder stability.",
    progressions: {
      easier: "suitcase_carry",
    },
  },
  {
    name: "Waiter Carry",
    slug: "waiter_carry",
    tags: ["full_body", "carry", "unilateral", "single_arm", "balance", "shoulder"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "intermediate" as const,
    instructions: "Hold weight overhead with palm facing up (like a waiter's tray). Walk with control, maintaining balance throughout.",
    progressions: {
      harder: "double_overhead_carry",
    },
  },
  {
    name: "Double Overhead Carry",
    slug: "double_overhead_carry",
    tags: ["full_body", "carry", "bilateral", "shoulder", "stability", "core"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "advanced" as const,
    instructions: "Press two weights overhead. Walk with both arms locked out, maintaining stable shoulder position throughout.",
    progressions: {
      easier: "waiter_carry",
    },
  },
  {
    name: "Overhead Plate Carry",
    slug: "overhead_plate_carry",
    tags: ["full_body", "carry", "bilateral", "shoulder", "core", "stability"],
    equipment: ["dumbbell"],
    difficulty: "intermediate" as const,
    instructions: "Hold weight plate overhead with both hands. Walk while keeping arms extended and core braced.",
  },
  {
    name: "Front Rack Carry",
    slug: "front_rack_carry",
    tags: ["full_body", "carry", "bilateral", "core", "anti_extension"],
    equipment: ["kettlebell", "barbell"],
    difficulty: "intermediate" as const,
    instructions: "Hold kettlebells in front rack position (resting on forearms at shoulders). Walk while maintaining upright posture against the forward load.",
    progressions: {
      harder: "zercher_carry",
    },
  },
  {
    name: "Zercher Carry",
    slug: "zercher_carry",
    tags: ["full_body", "carry", "bilateral", "core", "strength"],
    equipment: ["barbell"],
    difficulty: "advanced" as const,
    instructions: "Cradle barbell in the crooks of your elbows. Walk with controlled steps, keeping torso upright against the challenging front load.",
    progressions: {
      easier: "front_rack_carry",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNILATERAL PRESS EXERCISES (Greg's Feedback)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Single Arm DB Floor Press",
    slug: "sa_db_floor_press",
    tags: ["upper_body", "push", "horizontal", "unilateral", "single_arm", "chest", "anti_rotation"],
    equipment: ["dumbbell"],
    difficulty: "beginner" as const,
    instructions: "Lie on floor with one dumbbell. Press up while resisting rotation. Floor limits range of motion, making it easier on shoulders.",
    progressions: {
      harder: "sa_db_bench_press",
    },
  },
  {
    name: "Single Arm DB Bench Press",
    slug: "sa_db_bench_press",
    tags: ["upper_body", "push", "horizontal", "unilateral", "single_arm", "chest", "anti_rotation"],
    equipment: ["dumbbell", "bench"],
    difficulty: "intermediate" as const,
    instructions: "Lie on bench with one dumbbell. Press up while keeping hips level and resisting rotation. Full range of motion challenge.",
    progressions: {
      easier: "sa_db_floor_press",
      harder: "sa_rotational_bench_press",
    },
  },
  {
    name: "Single Arm Rotational Bench Press",
    slug: "sa_rotational_bench_press",
    tags: ["upper_body", "push", "horizontal", "unilateral", "single_arm", "chest", "rotation", "power"],
    equipment: ["dumbbell", "bench"],
    difficulty: "advanced" as const,
    instructions: "Single arm bench press with intentional rotation through the pressing motion. Incorporates rotational power for throwing athletes.",
    progressions: {
      easier: "sa_db_bench_press",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UPPER BODY PUSH - VERTICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Wall Push-Up",
    slug: "wall_push_up",
    tags: ["upper_body", "push", "bodyweight", "strength", "chest"],
    equipment: ["bodyweight", "wall"],
    difficulty: "beginner" as const,
    instructions: "Stand facing wall, place hands on wall at shoulder height. Perform push-up movement against wall. Easiest push variation.",
    progressions: {
      harder: "incline_push_up",
    },
  },
  {
    name: "Wall Handstand Push-Up",
    slug: "wall_handstand_push_up",
    tags: ["upper_body", "push", "vertical", "bodyweight", "shoulder", "strength"],
    equipment: ["bodyweight", "wall"],
    difficulty: "advanced" as const,
    instructions: "Kick up into handstand against wall. Lower head toward floor and press back up. Advanced vertical pressing movement.",
    progressions: {
      easier: "pike_pushup",
    },
  },
  {
    name: "Half-Kneeling Press",
    slug: "half_kneeling_press",
    tags: ["upper_body", "push", "vertical", "unilateral", "shoulder", "stability"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner" as const,
    instructions: "From half-kneeling position (one knee down), press weight overhead. The position challenges hip stability while pressing.",
    progressions: {
      harder: "db_shoulder_press",
    },
  },
  {
    name: "Landmine Press",
    slug: "landmine_press",
    tags: ["upper_body", "push", "vertical", "shoulder", "strength"],
    equipment: ["barbell"],
    difficulty: "intermediate" as const,
    instructions: "Stand facing landmine attachment. Press barbell at an angle from shoulder. Angled pressing is shoulder-friendly.",
  },
  {
    name: "Push Press",
    slug: "push_press",
    tags: ["upper_body", "push", "vertical", "power", "explosive", "shoulder", "full_body"],
    equipment: ["barbell", "dumbbell"],
    difficulty: "intermediate" as const,
    instructions: "From front rack, dip knees slightly then drive up explosively while pressing weight overhead. Uses leg drive for heavier loads.",
    progressions: {
      easier: "overhead_press",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UPPER BODY PUSH - HORIZONTAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Close-Grip Bench Press",
    slug: "close_grip_bench_press",
    tags: ["upper_body", "push", "horizontal", "strength", "compound"],
    equipment: ["barbell", "bench", "rack"],
    difficulty: "intermediate" as const,
    instructions: "Bench press with hands closer together (shoulder-width or narrower). Emphasizes triceps more than standard grip.",
  },
  {
    name: "Incline Barbell Press",
    slug: "incline_bench_press",
    tags: ["upper_body", "push", "incline", "strength", "compound", "chest", "shoulder"],
    equipment: ["barbell", "incline_bench", "rack"],
    difficulty: "intermediate" as const,
    instructions: "Set bench to 30-45 degree incline. Press barbell from upper chest to lockout. Targets upper chest and front deltoids.",
    progressions: {
      easier: "bench_press",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UPPER BODY PULL - VERTICAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Straight Arm Pulldown",
    slug: "straight_arm_pulldown",
    tags: ["upper_body", "pull", "vertical", "back", "isolation"],
    equipment: ["cable_machine"],
    difficulty: "beginner" as const,
    instructions: "Stand facing cable machine with high pulley. Keep arms straight and pull bar down to thighs using lats only.",
  },
  {
    name: "Close-Grip Lat Pulldown",
    slug: "close_grip_lat_pulldown",
    tags: ["upper_body", "pull", "vertical", "back", "strength"],
    equipment: ["cable_machine"],
    difficulty: "beginner" as const,
    instructions: "Use close/neutral grip attachment. Pull bar to chest, focusing on squeezing lats at bottom of movement.",
  },
  {
    name: "Scapular Pull-Up",
    slug: "scapular_pull_up",
    tags: ["upper_body", "pull", "vertical", "back", "bodyweight", "stability"],
    equipment: ["pull_up_bar"],
    difficulty: "beginner" as const,
    instructions: "Hang from bar with straight arms. Without bending elbows, pull shoulder blades down and together, lifting body slightly. Foundation for pull-ups.",
    progressions: {
      harder: "negative_pull_up",
    },
  },
  {
    name: "Negative Pull-Up",
    slug: "negative_pull_up",
    tags: ["upper_body", "pull", "vertical", "back", "bodyweight", "eccentric"],
    equipment: ["pull_up_bar"],
    difficulty: "beginner" as const,
    instructions: "Jump or step to top of pull-up position. Lower yourself as slowly as possible (3-5 seconds). Builds strength for full pull-ups.",
    progressions: {
      easier: "scapular_pull_up",
      harder: "assisted_pull_up",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UPPER BODY PULL - HORIZONTAL
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Chest-Supported Row",
    slug: "chest_supported_row",
    tags: ["upper_body", "pull", "horizontal", "back", "bilateral", "strength"],
    equipment: ["dumbbell", "incline_bench"],
    difficulty: "beginner" as const,
    instructions: "Lie face down on incline bench. Row dumbbells up to sides, squeezing shoulder blades. Chest support removes lower back stress.",
  },
  {
    name: "Kroc Row",
    slug: "kroc_row",
    tags: ["upper_body", "pull", "horizontal", "back", "unilateral", "power", "grip_endurance"],
    equipment: ["dumbbell"],
    difficulty: "intermediate" as const,
    instructions: "Heavy single-arm row with controlled body English. Use momentum to lift heavy weights for high reps. Builds grip and back strength.",
  },
  {
    name: "Elevated Inverted Row",
    slug: "elevated_inverted_row",
    tags: ["upper_body", "pull", "horizontal", "back", "bodyweight", "strength"],
    equipment: ["barbell", "rack"],
    difficulty: "beginner" as const,
    instructions: "Set bar at waist height. Grip bar and walk feet forward. Body at steep angle makes it easier than standard inverted row.",
    progressions: {
      harder: "inverted_row",
    },
  },
  {
    name: "Feet-Elevated Inverted Row",
    slug: "feet_elevated_inverted_row",
    tags: ["upper_body", "pull", "horizontal", "back", "bodyweight", "strength"],
    equipment: ["barbell", "rack", "box"],
    difficulty: "intermediate" as const,
    instructions: "Standard inverted row but with feet elevated on box. Increases difficulty by changing body angle.",
    progressions: {
      easier: "inverted_row",
    },
  },
  {
    name: "Seated Cable Row",
    slug: "cable_row",
    tags: ["upper_body", "pull", "horizontal", "back", "bilateral", "strength"],
    equipment: ["cable_machine"],
    difficulty: "beginner" as const,
    instructions: "Sit at cable row station. Pull handle to torso, squeezing shoulder blades together. Keep torso upright throughout.",
  },
  {
    name: "Single Arm Cable Row",
    slug: "single_arm_cable_row",
    tags: ["upper_body", "pull", "horizontal", "back", "unilateral", "single_arm", "anti_rotation"],
    equipment: ["cable_machine"],
    difficulty: "intermediate" as const,
    instructions: "Stand sideways to cable machine. Pull handle with one arm while resisting rotation. Combines pulling with anti-rotation challenge.",
  },
  {
    name: "Band Row",
    slug: "band_row",
    tags: ["upper_body", "pull", "horizontal", "back", "bilateral"],
    equipment: ["band"],
    difficulty: "beginner" as const,
    instructions: "Anchor band at chest height or loop around feet. Pull band to torso, squeezing shoulder blades. Equipment-free pulling option.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOWER BODY PUSH - SQUAT
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Assisted Pistol Squat",
    slug: "assisted_pistol_squat",
    tags: ["lower_body", "squat", "unilateral", "single_leg", "strength", "balance"],
    equipment: ["trx", "bodyweight"],
    difficulty: "advanced" as const,
    instructions: "Hold TRX or stick for balance. Perform single-leg squat to full depth while other leg extends forward. Use assistance as needed.",
    progressions: {
      easier: "bulgarian_split_squat",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LOWER BODY PULL/HINGE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Conventional Deadlift",
    slug: "conventional_deadlift",
    tags: ["lower_body", "hinge", "bilateral", "strength", "compound", "posterior_chain"],
    equipment: ["barbell"],
    difficulty: "intermediate" as const,
    instructions: "Stand with feet hip-width, bar over mid-foot. Hinge and grip bar, then drive through floor to stand. The foundational hinge pattern.",
  },
  {
    name: "Kickstand RDL",
    slug: "kickstand_rdl",
    tags: ["lower_body", "hinge", "unilateral", "hamstring", "glute", "balance"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "beginner" as const,
    instructions: "Stagger stance with back foot on toe for balance only. Hinge on front leg. Transition between bilateral and single-leg RDL.",
    progressions: {
      easier: "romanian_deadlift",
      harder: "single_leg_rdl",
    },
  },
  {
    name: "Single Leg Deadlift",
    slug: "single_leg_deadlift",
    tags: ["lower_body", "hinge", "unilateral", "single_leg", "hamstring", "balance"],
    equipment: ["dumbbell", "kettlebell"],
    difficulty: "advanced" as const,
    instructions: "Stand on one leg. Hinge forward as back leg extends behind. Touch weights to floor and return. Maximum single-leg hinge challenge.",
    progressions: {
      easier: "single_leg_rdl",
    },
  },
  {
    name: "Single Leg Glute Bridge",
    slug: "single_leg_glute_bridge",
    tags: ["lower_body", "hinge", "unilateral", "single_leg", "glute", "strength"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Lie on back, one foot flat, other leg extended. Drive through planted foot to lift hips. Progress from standard glute bridge.",
    progressions: {
      easier: "glute_bridge",
      harder: "hip_thrust",
    },
  },
  {
    name: "Single Leg Hip Thrust",
    slug: "single_leg_hip_thrust",
    tags: ["lower_body", "hinge", "unilateral", "single_leg", "glute", "strength"],
    equipment: ["bench", "bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "Upper back on bench, one foot on floor, other leg extended. Drive through planted foot to lift hips. Advanced glute isolation.",
    progressions: {
      easier: "hip_thrust",
    },
  },
  {
    name: "Nordic Curl",
    slug: "nordic_curl",
    tags: ["lower_body", "hamstring", "eccentric", "strength"],
    equipment: ["bodyweight"],
    difficulty: "advanced" as const,
    instructions: "Kneel with ankles anchored. Slowly lower torso toward floor using hamstring control. Use hands to catch yourself if needed. Advanced hamstring eccentric.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ROTATION EXERCISES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Kneeling Med Ball Rotation",
    slug: "kneeling_med_ball_rotation",
    tags: ["core", "rotation", "power", "transverse"],
    equipment: ["medicine_ball"],
    difficulty: "beginner" as const,
    instructions: "Kneel tall holding med ball. Rotate torso side to side with control. The kneeling position isolates core rotation from hip movement.",
    progressions: {
      harder: "med_ball_rotational_throw",
    },
  },
  {
    name: "Rotational Med Ball Slam",
    slug: "rotational_med_ball_slam",
    tags: ["core", "rotation", "power", "explosive", "conditioning"],
    equipment: ["medicine_ball"],
    difficulty: "intermediate" as const,
    instructions: "Stand with med ball. Rotate and slam ball diagonally across body to floor. Combines rotation with power and conditioning.",
    progressions: {
      easier: "med_ball_rotational_throw",
    },
  },
  {
    name: "Low-to-High Woodchop",
    slug: "low_high_woodchop",
    tags: ["core", "rotation", "functional", "power"],
    equipment: ["cable_machine"],
    difficulty: "intermediate" as const,
    instructions: "Set cable low. Rotate and pull diagonally from low to high across body. Reverse motion of high-to-low woodchop.",
    progressions: {
      easier: "cable_woodchop",
    },
  },
  {
    name: "Standing Rotation Reach",
    slug: "standing_rotation_reach",
    tags: ["core", "rotation", "mobility", "warmup", "thoracic"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Stand with feet wide. Rotate torso and reach one hand toward opposite foot, then reverse. Dynamic thoracic mobility drill.",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CORE - ANTI-ROTATION / ANTI-LATERAL FLEXION
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Knee Side Plank",
    slug: "knee_side_plank",
    tags: ["core", "anti_lateral_flexion", "stability", "isometric"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Side plank position but with bottom knee bent and on floor. Easier entry point to side plank progression.",
    progressions: {
      harder: "side_plank",
    },
  },
  {
    name: "Side Plank Hip Dip",
    slug: "side_plank_hip_dip",
    tags: ["core", "anti_lateral_flexion", "stability", "dynamic"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "From side plank, lower hip toward floor and lift back up. Adds dynamic movement to static side plank.",
    progressions: {
      easier: "side_plank",
    },
  },
  {
    name: "Pallof Press March",
    slug: "pallof_press_march",
    tags: ["core", "anti_rotation", "stability", "dynamic"],
    equipment: ["cable_machine", "band"],
    difficulty: "intermediate" as const,
    instructions: "From Pallof press position, march in place while maintaining anti-rotation. Adds dynamic stability challenge.",
    progressions: {
      easier: "pallof_press",
    },
  },
  {
    name: "Bird Dog with Band",
    slug: "bird_dog_band",
    tags: ["core", "anti_rotation", "stability", "strength"],
    equipment: ["band", "bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "Standard bird dog but with band around working foot or hand for added resistance. Progresses basic bird dog.",
    progressions: {
      easier: "bird_dog",
    },
  },
  {
    name: "Lying Leg Raise",
    slug: "lying_leg_raise",
    tags: ["core", "anti_extension", "strength", "hip_flexor"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Lie flat on back, hands under hips for support. Lift legs to vertical, lower with control. Keep lower back pressed to floor.",
    progressions: {
      harder: "hanging_leg_raise",
    },
  },
  {
    name: "Toes to Bar",
    slug: "toes_to_bar",
    tags: ["core", "anti_extension", "strength", "hip_flexor"],
    equipment: ["pull_up_bar"],
    difficulty: "advanced" as const,
    instructions: "Hang from bar. Lift legs all the way up until toes touch the bar. Requires significant core and hip flexor strength.",
    progressions: {
      easier: "hanging_leg_raise",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LUNGE EXERCISES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Deficit Reverse Lunge",
    slug: "deficit_reverse_lunge",
    tags: ["lower_body", "lunge", "unilateral", "single_leg", "strength"],
    equipment: ["dumbbell", "box"],
    difficulty: "intermediate" as const,
    instructions: "Stand on small platform. Step back into reverse lunge, going deeper due to elevated front foot. Increases range of motion.",
    progressions: {
      easier: "walking_lunge",
    },
  },
  {
    name: "Lateral Step-Up",
    slug: "lateral_step_up",
    tags: ["lower_body", "lunge", "unilateral", "single_leg", "frontal", "strength"],
    equipment: ["box", "dumbbell"],
    difficulty: "beginner" as const,
    instructions: "Stand beside box. Step sideways onto box, driving through that leg to stand. Lower with control. Frontal plane strength.",
    progressions: {
      harder: "lateral_lunge",
    },
  },
  {
    name: "Cossack Squat",
    slug: "cossack_squat",
    tags: ["lower_body", "lunge", "unilateral", "frontal", "mobility", "strength"],
    equipment: ["bodyweight", "dumbbell"],
    difficulty: "intermediate" as const,
    instructions: "Wide stance. Shift weight to one leg, squatting deep while other leg stays straight. Alternates sides. Deep frontal plane mobility.",
    progressions: {
      easier: "lateral_lunge",
    },
  },
  {
    name: "Split Squat Jump",
    slug: "split_squat_jump",
    tags: ["lower_body", "lunge", "plyometric", "power", "explosive"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "Start in split squat position. Jump explosively and land in same position. Don't switch legs mid-air.",
    progressions: {
      harder: "alternating_lunge_jump",
    },
  },
  {
    name: "Alternating Lunge Jump",
    slug: "alternating_lunge_jump",
    tags: ["lower_body", "lunge", "plyometric", "power", "explosive", "reactive"],
    equipment: ["bodyweight"],
    difficulty: "advanced" as const,
    instructions: "From lunge position, jump and switch legs mid-air, landing in opposite lunge. Continuous alternating jumps.",
    progressions: {
      easier: "split_squat_jump",
    },
  },
  {
    name: "Low Box Step-Up",
    slug: "low_box_step_up",
    tags: ["lower_body", "lunge", "unilateral", "single_leg", "strength"],
    equipment: ["box"],
    difficulty: "beginner" as const,
    instructions: "Step onto low box (6-12 inches). Focus on driving through stepping leg without pushing off back foot. Foundation step pattern.",
    progressions: {
      harder: "step_up",
    },
  },
  {
    name: "Step-Up",
    slug: "step_up",
    tags: ["lower_body", "lunge", "unilateral", "single_leg", "strength"],
    equipment: ["box", "dumbbell"],
    difficulty: "beginner" as const,
    instructions: "Step onto box at knee height or higher. Drive through stepping leg to stand on box. Step down with control.",
    progressions: {
      easier: "low_box_step_up",
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // JUMP / PLYOMETRIC EXERCISES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    name: "Pogo Hops",
    slug: "pogo_hops",
    tags: ["lower_body", "plyometric", "reactive", "power"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Stand tall. Hop continuously using mainly ankle stiffness, minimal knee bend. Teaches reactive stiffness for plyometrics.",
    progressions: {
      harder: "broad_jump",
    },
  },
  {
    name: "Consecutive Broad Jumps",
    slug: "consecutive_broad_jumps",
    tags: ["lower_body", "plyometric", "reactive", "horizontal", "power"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "Perform broad jumps in sequence without pausing. Land and immediately transition into next jump. Builds reactive horizontal power.",
    progressions: {
      easier: "broad_jump",
    },
  },
  {
    name: "Ascending Skater Jumps",
    slug: "ascending_skater_jumps",
    tags: ["lower_body", "plyometric", "frontal", "single_leg", "power"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "Lateral bounds where each jump travels slightly forward and up, like skating uphill. Introduction to lateral plyometrics.",
    progressions: {
      harder: "deceleration_skater_jump",
    },
  },
  {
    name: "Deceleration Skater Jump",
    slug: "deceleration_skater_jump",
    tags: ["lower_body", "plyometric", "frontal", "single_leg", "deceleration_mechanics"],
    equipment: ["bodyweight"],
    difficulty: "intermediate" as const,
    instructions: "Lateral bound with focus on controlled landing - stick each landing for 2 seconds before next jump. Trains deceleration/landing mechanics.",
    progressions: {
      easier: "ascending_skater_jumps",
      harder: "lateral_single_leg_bounds",
    },
  },
  {
    name: "Lateral Single Leg Bounds",
    slug: "lateral_single_leg_bounds",
    tags: ["lower_body", "plyometric", "frontal", "single_leg", "power", "reactive"],
    equipment: ["bodyweight"],
    difficulty: "advanced" as const,
    instructions: "Explosive lateral bounds, maximizing distance on each jump. Full power lateral plyometric movement.",
    progressions: {
      easier: "deceleration_skater_jump",
    },
  },
  {
    name: "Drop Jump",
    slug: "drop_jump",
    tags: ["lower_body", "plyometric", "reactive", "power", "vertical"],
    equipment: ["plyo_box"],
    difficulty: "advanced" as const,
    instructions: "Step off box (don't jump), land and immediately rebound as high as possible. Minimize ground contact time. True reactive plyometric.",
    progressions: {
      easier: "depth_jump",
    },
  },
  {
    name: "Standing Long Jump",
    slug: "standing_long_jump",
    tags: ["lower_body", "plyometric", "horizontal", "power"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "From standing, swing arms and jump forward for maximum distance. Land softly with bent knees. Basic horizontal jump test.",
  },
  {
    name: "Squat Thrust",
    slug: "squat_thrust",
    tags: ["full_body", "conditioning", "dynamic", "core"],
    equipment: ["bodyweight"],
    difficulty: "beginner" as const,
    instructions: "From standing, squat down, place hands on floor, jump feet back to plank, jump feet forward, stand. Burpee without the jump and push-up.",
    progressions: {
      harder: "burpee",
    },
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
  name: "Lower Body Foundation",
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
