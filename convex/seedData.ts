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
    },
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
    name: "Incline Push-Up",
    slug: "incline_push_up",
    tags: ["upper_body", "push", "horizontal", "strength", "chest", "bodyweight"],
    equipment: ["bodyweight", "bench"],
    difficulty: "beginner" as const,
    instructions: "Place hands on an elevated surface (bench, box). Perform push-up with body at an incline. Easier than standard push-up.",
    progressions: {
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
    name: "Assisted Pull-Up",
    slug: "assisted_pull_up",
    tags: ["upper_body", "pull", "vertical", "strength", "back"],
    equipment: ["pull_up_bar", "band"],
    difficulty: "beginner" as const,
    instructions: "Use a resistance band or assisted pull-up machine to help complete the movement. Easier than standard pull-up.",
    progressions: {
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
      easier: "lateral_lunge",
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
