import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  INTENSITY_CONFIG,
  BODYWEIGHT_INTENSITY_CONFIG,
  scaleRepsOrDuration,
  isBodyweightExercise,
  type Intensity,
  // Category-specific intensity imports
  type CategoryId,
  type AgeGroup,
  type Phase,
  getCategoryExerciseParameters,
  getExerciseFocus,
  getExperienceBucket,
  getBodyweightVariant,
  formatTempo,
  normalizeAgeGroup,
} from "./intensityScaling";

/**
 * GPP Workout Sessions - Execution Tracking
 *
 * Tracks workout execution against program templates.
 * Athletes create sessions for their scheduled workout of the day.
 *
 * UX Model: "Start = Swap" with Cascade
 * When starting a workout scheduled for a future date:
 * 1. That workout moves to today's slot
 * 2. Today's original workout shifts to the next slot
 * 3. All workouts between cascade down
 */

// Calendar date mapping types
type CalendarPhase = "GPP" | "SPP" | "SSP";

interface WorkoutSlot {
  phase: CalendarPhase;
  week: number;
  day: number;
}

// Constants for calendar calculations
const PHASE_ORDER: CalendarPhase[] = ["GPP", "SPP", "SSP"];
const WEEKS_PER_PHASE = 4;

const DEFAULT_TRAINING_DAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [0, 1, 2, 3, 4, 5, 6],
};

// Date helpers for cascade calculation
function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function findNextDayOfWeek(startDate: Date, dayOfWeek: number): Date {
  const result = startOfDay(startDate);
  const currentDay = result.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function getWorkoutForDate(
  programStartDate: Date,
  trainingDays: number[],
  date: Date
): WorkoutSlot | null {
  const targetDate = startOfDay(date);
  const targetDayOfWeek = targetDate.getDay();

  const sortedDays = [...trainingDays].sort((a, b) => a - b);
  if (!sortedDays.includes(targetDayOfWeek)) {
    return null;
  }

  const start = startOfDay(programStartDate);
  const firstTrainingDate = findNextDayOfWeek(start, sortedDays[0]);

  if (targetDate < firstTrainingDate) {
    return null;
  }

  let workoutIndex = 0;
  let currentDate = firstTrainingDate;
  let currentDayIndex = 0;

  while (!isSameDay(currentDate, targetDate)) {
    currentDayIndex = (currentDayIndex + 1) % sortedDays.length;
    if (currentDayIndex === 0) {
      currentDate = addDays(
        currentDate,
        7 - (sortedDays[sortedDays.length - 1] - sortedDays[0])
      );
      currentDate = findNextDayOfWeek(currentDate, sortedDays[0]);
    } else {
      const daysDiff = sortedDays[currentDayIndex] - sortedDays[currentDayIndex - 1];
      currentDate = addDays(currentDate, daysDiff);
    }
    workoutIndex++;

    if (workoutIndex > 100) {
      return null;
    }
  }

  const workoutsPerWeek = sortedDays.length;
  const totalWorkoutsPerPhase = WEEKS_PER_PHASE * workoutsPerWeek;

  const phaseIndex = Math.floor(workoutIndex / totalWorkoutsPerPhase);
  if (phaseIndex >= PHASE_ORDER.length) {
    return null;
  }

  const withinPhaseIndex = workoutIndex % totalWorkoutsPerPhase;
  const week = Math.floor(withinPhaseIndex / workoutsPerWeek) + 1;
  const day = (withinPhaseIndex % workoutsPerWeek) + 1;

  return {
    phase: PHASE_ORDER[phaseIndex],
    week,
    day,
  };
}

function getAbsoluteIndex(slot: WorkoutSlot, workoutsPerWeek: number): number {
  const phaseIdx = PHASE_ORDER.indexOf(slot.phase);
  return (
    phaseIdx * WEEKS_PER_PHASE * workoutsPerWeek +
    (slot.week - 1) * workoutsPerWeek +
    (slot.day - 1)
  );
}

// Validators
const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

const sessionStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("abandoned")
);

const setCompletionValidator = v.object({
  repsCompleted: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  weight: v.optional(v.number()),
  rpe: v.optional(v.number()), // Rate of Perceived Exertion 1-10
  completed: v.boolean(),
  skipped: v.boolean(),
});

const exerciseCompletionValidator = v.object({
  exerciseId: v.id("exercises"),
  completed: v.boolean(),
  skipped: v.boolean(),
  notes: v.optional(v.string()),
  sets: v.array(setCompletionValidator),
});

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the current in-progress session for the user
 * 
 * NOTE: This query is defensive and returns null on any error
 * to prevent client crashes when data is inconsistent.
 */
export const getCurrentSession = query({
  args: {},
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        return null;
      }

      const session = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", user._id).eq("status", "in_progress")
        )
        .first();

      if (!session) {
        return null;
      }

      // Get the template for context (may be null if deleted)
      const template = await ctx.db.get(session.templateId);

      return {
        ...session,
        template,
      };
    } catch (error) {
      console.error("getCurrentSession error:", error);
      return null;
    }
  },
});

/**
 * Get the most recent session for a specific template
 * Used to check if today's workout has been completed
 * 
 * NOTE: This query is defensive and returns null on any error
 * to prevent client crashes when data is inconsistent or when
 * called with invalid parameters from older client builds.
 * 
 * The templateId is optional to allow old clients that might pass
 * undefined values to gracefully fail instead of throwing validation errors.
 */
export const getSessionForTemplate = query({
  args: { templateId: v.optional(v.id("program_templates")) },
  handler: async (ctx, args) => {
    try {
      // Early return if no templateId provided
      if (!args.templateId) {
        return null;
      }

      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        return null;
      }

      // Get the most recent session for this template
      // templateId is guaranteed to be defined here since we check above
      const sessions = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_template", (q) => q.eq("templateId", args.templateId!))
        .order("desc")
        .take(10);

      // Find the user's session (most recent)
      const userSession = sessions.find(s => s.userId === user._id);

      if (!userSession) {
        return null;
      }

      // Get the template for context (may be null if deleted)
      const template = await ctx.db.get(userSession.templateId);

      return {
        ...userSession,
        template,
      };
    } catch (error) {
      // Log error for debugging but don't crash the client
      console.error("getSessionForTemplate error:", error);
      return null;
    }
  },
});

/**
 * Get a specific session by ID with full details
 *
 * INTENSITY SCALING (v2 - Category-Specific):
 * If the session has a scalingSnapshot, uses the category-specific intensity
 * system to calculate exercise parameters. Falls back to targetIntensity
 * (the old Low/Moderate/High system) for backward compatibility.
 */
export const getById = query({
  args: { sessionId: v.id("gpp_workout_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const template = await ctx.db.get(session.templateId);
    if (!template) {
      return { ...session, template: null, exerciseDetails: [] };
    }

    // Fetch all exercise details
    const exerciseIds = template.exercises.map((e) => e.exerciseId);
    const exercises = await Promise.all(
      exerciseIds.map((id) => ctx.db.get(id))
    );

    const exerciseMap = new Map(
      exercises.filter(Boolean).map((ex) => [ex!._id.toString(), ex!])
    );

    // Get user's 1RM records for intensity scaling
    let userMaxMap: Record<string, number> = {};
    if (session.userId) {
      const userMaxes = await ctx.db
        .query("user_maxes")
        .withIndex("by_user", (q) => q.eq("userId", session.userId))
        .collect();

      for (const max of userMaxes) {
        userMaxMap[max.exerciseId.toString()] = max.oneRepMax;
      }
    }

    // Check if we have the new scaling snapshot (category-specific system)
    if (session.scalingSnapshot) {
      // Use category-specific intensity system
      const { categoryId, phase, ageGroup: rawAgeGroup, yearsOfExperience } = session.scalingSnapshot;
      const ageGroup = normalizeAgeGroup(rawAgeGroup);
      const experienceBucket = getExperienceBucket(yearsOfExperience);

      const scaledExercises = template.exercises.map((prescription) => {
        const exercise = exerciseMap.get(prescription.exerciseId.toString());
        const oneRepMax = userMaxMap[prescription.exerciseId.toString()];

        // Detect exercise focus
        const exerciseFocus = getExerciseFocus(exercise?.tags, exercise?.equipment);

        // Get category-specific parameters
        const params = getCategoryExerciseParameters(
          categoryId as CategoryId,
          phase as Phase,
          ageGroup as AgeGroup,
          yearsOfExperience,
          exerciseFocus
        );

        // Calculate average 1RM% for weight recommendation
        const avgPercent = (params.oneRepMaxPercent.min + params.oneRepMaxPercent.max) / 2;

        if (exerciseFocus === "bodyweight") {
          // Bodyweight exercise - get variant based on phase + experience
          const variantResult = getBodyweightVariant(
            exercise?.slug || "",
            phase as Phase,
            experienceBucket,
            exercise?.progressions
          );

          return {
            ...prescription,
            exercise,
            // Scaled values from category-specific system
            scaledSets: params.sets,
            scaledReps: String(params.reps),
            scaledRestSeconds: params.restSeconds,
            // Intensity metadata
            isBodyweight: true,
            isSubstituted: variantResult.isSubstituted,
            substitutedExerciseSlug: variantResult.isSubstituted ? variantResult.slug : undefined,
            rpeTarget: params.rpe,
            tempo: formatTempo(params.tempo),
            // No weight for bodyweight exercises
            targetWeight: undefined,
            percentOf1RM: undefined,
            hasOneRepMax: false,
          };
        } else {
          // Weighted exercise (strength or power)
          return {
            ...prescription,
            exercise,
            // Scaled values from category-specific system
            scaledSets: params.sets,
            scaledReps: String(params.reps),
            scaledRestSeconds: params.restSeconds,
            // Weight calculation (if 1RM known)
            targetWeight: oneRepMax ? Math.round(oneRepMax * avgPercent) : undefined,
            percentOf1RM: Math.round(avgPercent * 100),
            // Intensity metadata
            isBodyweight: false,
            isSubstituted: false,
            rpeTarget: params.rpe,
            tempo: formatTempo(params.tempo),
            hasOneRepMax: !!oneRepMax,
            exerciseFocus,
          };
        }
      });

      return {
        ...session,
        template: {
          ...template,
          exercises: scaledExercises,
          // Category-specific context
          scalingContext: {
            categoryId,
            phase,
            ageGroup,
            yearsOfExperience,
            experienceBucket,
          },
        },
      };
    }

    // FALLBACK: Use old intensity system (Low/Moderate/High) for backward compatibility
    const intensity = (session.targetIntensity || "Moderate") as Intensity;
    const config = INTENSITY_CONFIG[intensity];
    const bwConfig = BODYWEIGHT_INTENSITY_CONFIG[intensity];
    const avgPercent = (config.oneRepMaxPercent.min + config.oneRepMaxPercent.max) / 2;

    const scaledExercises = template.exercises.map((prescription) => {
      const exercise = exerciseMap.get(prescription.exerciseId.toString());
      const oneRepMax = userMaxMap[prescription.exerciseId.toString()];
      const isBW = isBodyweightExercise(exercise?.equipment);

      // Parse original reps to number for weighted exercises
      const repsMatch = prescription.reps.match(/^(\d+)/);
      const baseReps = repsMatch ? parseInt(repsMatch[1]) : 8;

      if (isBW) {
        // Bodyweight exercise scaling
        const scaledReps = scaleRepsOrDuration(prescription.reps, bwConfig.repsMultiplier);

        // Determine variant based on intensity
        let exerciseSlug = exercise?.slug || "";
        let isSubstituted = false;

        if (exercise?.progressions) {
          if (intensity === "Low" && exercise.progressions.easier) {
            exerciseSlug = exercise.progressions.easier;
            isSubstituted = true;
          } else if (intensity === "High" && exercise.progressions.harder) {
            exerciseSlug = exercise.progressions.harder;
            isSubstituted = true;
          }
        }

        return {
          ...prescription,
          exercise,
          // Scaled values
          scaledSets: prescription.sets,
          scaledReps: scaledReps,
          scaledRestSeconds: Math.max(15, Math.round(prescription.restSeconds * config.restMultiplier)),
          // Intensity metadata
          isBodyweight: true,
          isSubstituted,
          substitutedExerciseSlug: isSubstituted ? exerciseSlug : undefined,
          rpeTarget: config.rpeTarget,
        };
      } else {
        // Weighted exercise scaling
        const scaledSets = Math.max(1, Math.round(prescription.sets * config.setsMultiplier));
        const scaledReps = Math.max(1, Math.round(baseReps * config.repsMultiplier));
        const scaledRest = Math.max(15, Math.round(prescription.restSeconds * config.restMultiplier));

        return {
          ...prescription,
          exercise,
          // Scaled values
          scaledSets,
          scaledReps: String(scaledReps),
          scaledRestSeconds: scaledRest,
          // Weight calculation (if 1RM known)
          targetWeight: oneRepMax ? Math.round(oneRepMax * avgPercent) : undefined,
          percentOf1RM: Math.round(avgPercent * 100),
          // Intensity metadata
          isBodyweight: false,
          isSubstituted: false,
          rpeTarget: config.rpeTarget,
          hasOneRepMax: !!oneRepMax,
        };
      }
    });

    return {
      ...session,
      template: {
        ...template,
        exercises: scaledExercises,
        appliedIntensity: intensity,
        intensityConfig: {
          percentOf1RM: Math.round(avgPercent * 100),
          rpeTarget: config.rpeTarget,
        },
      },
    };
  },
});

/**
 * Get session history for the current user
 */
export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    const limit = args.limit || 20;

    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    // Enrich with template names
    const enriched = await Promise.all(
      sessions.map(async (session) => {
        const template = await ctx.db.get(session.templateId);
        return {
          ...session,
          templateName: template?.name || "Unknown Workout",
          phase: template?.phase,
          week: template?.week,
          day: template?.day,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get IDs of all templates that have completed sessions
 * Used by Program tab to show completion status on workout cards
 */
export const getCompletedTemplateIds = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // Get all completed sessions for this user
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Return unique template IDs
    const templateIds = Array.from(new Set(completedSessions.map((s) => s.templateId)));
    return templateIds;
  },
});

/**
 * Get the last completed session for a specific template with full performance data
 * Used to show comparison on workout detail screen and inline during execution
 */
export const getLastCompletedSessionForTemplate = query({
  args: { templateId: v.id("program_templates") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    // Get completed sessions for this template, most recent first
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .order("desc")
      .take(20);

    // Find the user's most recent completed session
    const lastCompleted = sessions.find(
      (s) => s.userId === user._id && s.status === "completed"
    );

    if (!lastCompleted) {
      return null;
    }

    // Get template for exercise names
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      return null;
    }

    // Get exercise details for each exercise in the session
    const exerciseDetails = await Promise.all(
      (lastCompleted.exercises || []).map(async (sessionExercise, index) => {
        const exercise = await ctx.db.get(sessionExercise.exerciseId);

        // Get prescribed data from template if available
        const templateExercise = template.exercises?.[index];
        const prescribedSets = templateExercise?.sets ?? sessionExercise.sets.length;
        const prescribedReps = templateExercise?.reps ?? "?";

        return {
          exerciseId: sessionExercise.exerciseId,
          exerciseName: exercise?.name || "Unknown",
          exerciseSlug: exercise?.slug || "unknown",
          prescribedSets,
          prescribedReps,
          completed: sessionExercise.completed,
          skipped: sessionExercise.skipped,
          sets: sessionExercise.sets.map((set, setIdx) => ({
            ...set,
            setNumber: setIdx + 1,
          })),
        };
      })
    );

    return {
      _id: lastCompleted._id,
      completedAt: lastCompleted.completedAt,
      totalDurationSeconds: lastCompleted.totalDurationSeconds,
      targetIntensity: lastCompleted.targetIntensity,
      exercises: exerciseDetails,
      templateName: template.name,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

// Intensity validator
const intensityValidator = v.union(
  v.literal("Low"),
  v.literal("Moderate"),
  v.literal("High")
);

/**
 * Start a new workout session
 *
 * UX Model: "Start = Swap" with Cascade
 * When starting a workout scheduled for a future date, the schedule
 * automatically cascades so that:
 * 1. The started workout moves to today's slot
 * 2. Today's original workout shifts to the next slot
 * 3. All workouts between cascade down
 *
 * @param templateId - The workout template to start
 * @param exerciseOrder - Optional custom exercise order
 * @param targetIntensity - Optional target intensity
 * @param skipCascade - Optional flag to skip cascade (default false)
 */
export const startSession = mutation({
  args: {
    templateId: v.id("program_templates"),
    exerciseOrder: v.optional(v.array(v.number())),
    targetIntensity: v.optional(intensityValidator),
    skipCascade: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get user's program for linking
    const userProgram = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!userProgram) {
      throw new Error("No active program found. Please complete intake first.");
    }

    // Check for existing in-progress session
    const existingSession = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "in_progress")
      )
      .first();

    if (existingSession) {
      // Return existing session instead of creating new one
      return {
        sessionId: existingSession._id,
        isExisting: true,
        message: "Resuming existing workout session",
        cascadeApplied: false,
      };
    }

    // Get the template to initialize exercises
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Workout template not found");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CASCADE LOGIC: Auto-swap when starting a future workout
    // ─────────────────────────────────────────────────────────────────────────
    let cascadeApplied = false;
    let cascadeAffectedSlots = 0;

    if (!args.skipCascade) {
      // Get intake for training days
      const intake = await ctx.db.get(userProgram.intakeResponseId);

      if (intake) {
        const trainingDays =
          intake.selectedTrainingDays ??
          DEFAULT_TRAINING_DAYS[intake.preferredTrainingDaysPerWeek] ??
          DEFAULT_TRAINING_DAYS[3];

        const programStartDate = new Date(userProgram.createdAt);
        const today = startOfDay(new Date());

        // Get today's scheduled slot
        const todaySlot = getWorkoutForDate(programStartDate, trainingDays, today);

        if (todaySlot) {
          const selectedSlot: WorkoutSlot = {
            phase: template.phase as CalendarPhase,
            week: template.week,
            day: template.day,
          };

          const workoutsPerWeek = trainingDays.length;
          const todayIndex = getAbsoluteIndex(todaySlot, workoutsPerWeek);

          // Get existing schedule overrides
          const existingOverride = await ctx.db
            .query("user_schedule_overrides")
            .withIndex("by_user_program", (q) => q.eq("userProgramId", userProgram._id))
            .first();

          // Get all templates for user's category and skill level
          const allTemplates = await ctx.db
            .query("program_templates")
            .withIndex("by_category_phase", (q) =>
              q.eq("gppCategoryId", userProgram.gppCategoryId)
            )
            .filter((q) => q.eq(q.field("skillLevel"), userProgram.skillLevel))
            .collect();

          // Build template lookup
          const templateLookup = new Map<string, (typeof allTemplates)[0]>();
          for (const t of allTemplates) {
            const key = `${t.phase}-${t.week}-${t.day}`;
            templateLookup.set(key, t);
          }

          // Build current slot assignments (considering existing overrides)
          const slotOverrides = existingOverride?.slotOverrides ?? [];
          const overrideLookup = new Map<string, string>();
          for (const override of slotOverrides) {
            const key = `${override.phase}-${override.week}-${override.day}`;
            overrideLookup.set(key, override.templateId.toString());
          }

          // Get current template for a slot
          const getTemplateForSlot = (slot: WorkoutSlot) => {
            const key = `${slot.phase}-${slot.week}-${slot.day}`;
            const overrideId = overrideLookup.get(key);
            if (overrideId) {
              return allTemplates.find((t) => t._id.toString() === overrideId);
            }
            return templateLookup.get(key);
          };

          // Find which slot currently contains the selected template
          let selectedTemplateCurrentSlot: WorkoutSlot | null = null;
          for (const phase of PHASE_ORDER) {
            for (let week = 1; week <= WEEKS_PER_PHASE; week++) {
              for (let day = 1; day <= workoutsPerWeek; day++) {
                const slot: WorkoutSlot = { phase, week, day };
                const slotTemplate = getTemplateForSlot(slot);
                if (slotTemplate && slotTemplate._id.toString() === args.templateId.toString()) {
                  selectedTemplateCurrentSlot = slot;
                  break;
                }
              }
              if (selectedTemplateCurrentSlot) break;
            }
            if (selectedTemplateCurrentSlot) break;
          }

          if (selectedTemplateCurrentSlot) {
            const selectedIndex = getAbsoluteIndex(selectedTemplateCurrentSlot, workoutsPerWeek);

            // Only cascade if selected workout is in the future (not today or past)
            if (selectedIndex > todayIndex) {
              // Generate all slots in order
              const allSlots: WorkoutSlot[] = [];
              for (const phase of PHASE_ORDER) {
                for (let week = 1; week <= WEEKS_PER_PHASE; week++) {
                  for (let day = 1; day <= workoutsPerWeek; day++) {
                    allSlots.push({ phase, week, day });
                  }
                }
              }

              // Get completed template IDs
              const completedSessions = await ctx.db
                .query("gpp_workout_sessions")
                .withIndex("by_user", (q) => q.eq("userId", user._id))
                .filter((q) => q.eq(q.field("status"), "completed"))
                .collect();
              const completedTemplateIds = new Set(
                completedSessions.map((s) => s.templateId.toString())
              );

              // Get slots in the cascade range
              const slotsInRange = allSlots.slice(todayIndex, selectedIndex + 1);

              // Check if any workout in the cascade range is completed
              let canCascade = true;
              for (const slot of slotsInRange) {
                const slotTemplate = getTemplateForSlot(slot);
                if (slotTemplate && completedTemplateIds.has(slotTemplate._id.toString())) {
                  canCascade = false;
                  break;
                }
              }

              if (canCascade) {
                // Build new slot overrides with cascade
                const rangeTemplates: Array<{ slot: WorkoutSlot; template: (typeof allTemplates)[0] }> = [];
                for (const slot of slotsInRange) {
                  const t = getTemplateForSlot(slot);
                  if (t) {
                    rangeTemplates.push({ slot, template: t });
                  }
                }

                // Create new assignments
                const newAssignments: Array<{ slot: WorkoutSlot; templateId: string }> = [];

                // Today's slot gets the selected template
                newAssignments.push({
                  slot: slotsInRange[0],
                  templateId: args.templateId.toString(),
                });

                // Each subsequent slot gets what was in the previous slot
                for (let i = 1; i < slotsInRange.length; i++) {
                  const prevSlotTemplate = rangeTemplates[i - 1]?.template;
                  if (prevSlotTemplate) {
                    newAssignments.push({
                      slot: slotsInRange[i],
                      templateId: prevSlotTemplate._id.toString(),
                    });
                  }
                }

                // Build final slot overrides
                const newSlotOverrides = slotOverrides.filter((o) => {
                  const oIndex = getAbsoluteIndex(
                    { phase: o.phase as CalendarPhase, week: o.week, day: o.day },
                    workoutsPerWeek
                  );
                  return oIndex < todayIndex || oIndex > selectedIndex;
                });

                // Add new cascade overrides
                for (const assignment of newAssignments) {
                  const defaultTemplate = templateLookup.get(
                    `${assignment.slot.phase}-${assignment.slot.week}-${assignment.slot.day}`
                  );
                  if (!defaultTemplate || defaultTemplate._id.toString() !== assignment.templateId) {
                    const assignedTemplate = allTemplates.find(
                      (t) => t._id.toString() === assignment.templateId
                    );
                    if (assignedTemplate) {
                      newSlotOverrides.push({
                        phase: assignment.slot.phase,
                        week: assignment.slot.week,
                        day: assignment.slot.day,
                        templateId: assignedTemplate._id,
                      });
                    }
                  }
                }

                const now = Date.now();

                // Save override record
                if (existingOverride) {
                  await ctx.db.patch(existingOverride._id, {
                    slotOverrides: newSlotOverrides,
                    updatedAt: now,
                  });
                } else {
                  await ctx.db.insert("user_schedule_overrides", {
                    userId: user._id,
                    userProgramId: userProgram._id,
                    slotOverrides: newSlotOverrides,
                    createdAt: now,
                    updatedAt: now,
                  });
                }

                cascadeApplied = true;
                cascadeAffectedSlots = slotsInRange.length;
              }
            }
          }
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CREATE SESSION
    // ─────────────────────────────────────────────────────────────────────────

    // Get the latest intake for years of experience (for scaling snapshot)
    const intake = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();

    // Create scaling snapshot to capture athlete profile at workout time
    const scalingSnapshot = {
      categoryId: userProgram.gppCategoryId,
      phase: template.phase as "GPP" | "SPP" | "SSP",
      ageGroup: normalizeAgeGroup(userProgram.ageGroup),
      yearsOfExperience: intake?.yearsOfExperience ?? 0,
    };

    // Initialize exercise tracking structure
    const initialExercises = template.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      completed: false,
      skipped: false,
      sets: Array(ex.sets)
        .fill(null)
        .map(() => ({
          repsCompleted: undefined,
          durationSeconds: undefined,
          weight: undefined,
          rpe: undefined,
          completed: false,
          skipped: false,
        })),
    }));

    const now = Date.now();

    const sessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId: user._id,
      templateId: args.templateId,
      userProgramId: userProgram._id,
      startedAt: now,
      status: "in_progress",
      exercises: initialExercises,
      exerciseOrder: args.exerciseOrder,
      targetIntensity: args.targetIntensity,
      scalingSnapshot,
      templateSnapshot: {
        name: template.name,
        phase: template.phase,
        week: template.week,
        day: template.day,
        workoutDate: now,
      },
    });

    return {
      sessionId,
      isExisting: false,
      message: cascadeApplied
        ? `Workout started! Schedule cascaded (${cascadeAffectedSlots} workouts shifted).`
        : "Workout session started",
      cascadeApplied,
      cascadeAffectedSlots,
    };
  },
});

/**
 * Update session progress (called periodically during workout)
 */
export const updateProgress = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exercises: v.array(exerciseCompletionValidator),
    exerciseOrder: v.optional(v.array(v.number())), // For reordering (indices into template.exercises)
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== user._id) {
      throw new Error("Not authorized to update this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("Cannot update a completed or abandoned session");
    }

    // Build update object
    const updates: { exercises: typeof args.exercises; exerciseOrder?: number[] } = {
      exercises: args.exercises,
    };

    // Include exercise order if provided
    if (args.exerciseOrder) {
      updates.exerciseOrder = args.exerciseOrder;
    }

    await ctx.db.patch(args.sessionId, updates);

    return { success: true };
  },
});

/**
 * Complete the workout session
 */
export const completeSession = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exercises: v.array(exerciseCompletionValidator),
    exerciseOrder: v.optional(v.array(v.number())), // Persist exercise order on complete
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== user._id) {
      throw new Error("Not authorized to complete this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const now = Date.now();
    const totalDurationSeconds = Math.round((now - session.startedAt) / 1000);

    const updates: {
      exercises: typeof args.exercises;
      completedAt: number;
      totalDurationSeconds: number;
      status: "completed";
      exerciseOrder?: number[];
    } = {
      exercises: args.exercises,
      completedAt: now,
      totalDurationSeconds,
      status: "completed",
    };

    if (args.exerciseOrder) {
      updates.exerciseOrder = args.exerciseOrder;
    }

    await ctx.db.patch(args.sessionId, updates);

    // Update user program's last workout date
    const userProgram = await ctx.db.get(session.userProgramId);
    if (userProgram) {
      await ctx.db.patch(userProgram._id, {
        lastWorkoutDate: now,
        updatedAt: now,
      });

      // Note: We intentionally do NOT clear todayFocusTemplateId here.
      // If user explicitly selected this workout as today's workout, it should
      // remain visible on the Today's Workout card with a "Completed" badge.
      // The focus will be cleared automatically when a new day starts or
      // when the user selects a different workout.
    }

    return {
      success: true,
      totalDurationSeconds,
      message: "Workout completed!",
    };
  },
});

/**
 * Abandon the workout session
 */
export const abandonSession = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exercises: v.optional(v.array(exerciseCompletionValidator)),
    exerciseOrder: v.optional(v.array(v.number())), // Persist exercise order on abandon
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.userId !== user._id) {
      throw new Error("Not authorized to abandon this session");
    }

    if (session.status !== "in_progress") {
      throw new Error("Session is not in progress");
    }

    const updates: { 
      status: "abandoned"; 
      exercises?: typeof args.exercises;
      exerciseOrder?: number[];
    } = {
      status: "abandoned",
    };

    if (args.exercises) {
      updates.exercises = args.exercises;
    }

    if (args.exerciseOrder) {
      updates.exerciseOrder = args.exerciseOrder;
    }

    await ctx.db.patch(args.sessionId, updates);

    return { success: true, message: "Workout session abandoned" };
  },
});
