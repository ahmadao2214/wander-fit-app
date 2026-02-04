import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Workout Calendar - Calendar View Queries and Mutations
 *
 * Provides calendar-based view of the workout program, mapping
 * workout slots (phase, week, day) to actual calendar dates based on:
 * - user_programs.createdAt (program start date)
 * - intake_responses.selectedTrainingDays (which days user trains)
 *
 * UX Model: "Start = Swap"
 * - Tapping a workout → navigates to workout details
 * - Drag-drop → manual swap for planning
 * - Starting a workout → auto-swap to today + cascade
 * - Completing a workout → shows on the day it was completed
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type Phase = "GPP" | "SPP" | "SSP";

interface WorkoutSlot {
  phase: Phase;
  week: number;
  day: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_ORDER: Phase[] = ["GPP", "SPP", "SSP"];
const WEEKS_PER_PHASE = 4;

// Default training days when none specified (common patterns)
const DEFAULT_TRAINING_DAYS: Record<number, number[]> = {
  1: [1], // Monday
  2: [1, 4], // Mon, Thu
  3: [1, 3, 5], // Mon, Wed, Fri
  4: [1, 2, 4, 5], // Mon, Tue, Thu, Fri
  5: [1, 2, 3, 4, 5], // Mon-Fri
  6: [1, 2, 3, 4, 5, 6], // Mon-Sat
  7: [0, 1, 2, 3, 4, 5, 6], // Every day
};

// ─────────────────────────────────────────────────────────────────────────────
// DATE HELPERS (duplicated from lib for server-side use)
// ─────────────────────────────────────────────────────────────────────────────

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

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateISO(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT DATE MAPPING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the date for a specific workout given program parameters
 */
function getDateForWorkout(
  programStartDate: Date,
  trainingDays: number[],
  slot: WorkoutSlot
): Date {
  if (trainingDays.length === 0) {
    throw new Error("trainingDays must not be empty");
  }

  const sortedDays = [...trainingDays].sort((a, b) => a - b);
  const phaseIndex = PHASE_ORDER.indexOf(slot.phase);
  if (phaseIndex === -1) {
    throw new Error(`Invalid phase: ${slot.phase}`);
  }

  const workoutsPerWeek = sortedDays.length;
  const absoluteIndex =
    phaseIndex * WEEKS_PER_PHASE * workoutsPerWeek +
    (slot.week - 1) * workoutsPerWeek +
    (slot.day - 1);

  const start = startOfDay(programStartDate);
  let currentDate = findNextDayOfWeek(start, sortedDays[0]);

  if (currentDate < start) {
    currentDate = addDays(currentDate, 7);
  }

  let workoutCount = 0;
  let currentDayIndex = 0;

  while (workoutCount < absoluteIndex) {
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
    workoutCount++;
  }

  return currentDate;
}

/**
 * Get the workout slot for a given date
 */
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

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get calendar view data for a date range
 *
 * Returns workouts mapped to calendar dates, including:
 * - Workout template details (name, exercises, duration)
 * - Completion status
 * - Phase information for color coding
 * - Whether workout is "today's" workout
 *
 * @param startDate - ISO date string "YYYY-MM-DD"
 * @param endDate - ISO date string "YYYY-MM-DD"
 */
export const getCalendarView = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { startDate, endDate }) => {
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

    // Get user's program
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) {
      return null;
    }

    // Get intake response for training days
    const intakeResponse = await ctx.db.get(program.intakeResponseId);
    if (!intakeResponse) {
      return null;
    }

    // Get training days (with fallback for migration)
    const trainingDays =
      intakeResponse.selectedTrainingDays ??
      DEFAULT_TRAINING_DAYS[intakeResponse.preferredTrainingDaysPerWeek] ??
      DEFAULT_TRAINING_DAYS[3];

    // Get schedule overrides
    const scheduleOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get completed sessions
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Build set of completed template IDs and completion dates
    const completedTemplateIds = new Set(
      completedSessions.map((s) => s.templateId.toString())
    );
    const completionDates = new Map<string, string>(); // templateId -> completion date
    for (const session of completedSessions) {
      if (session.completedAt) {
        const completionDate = formatDateISO(new Date(session.completedAt));
        completionDates.set(session.templateId.toString(), completionDate);
      }
    }

    // Get all templates for user's category and skill level
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", program.gppCategoryId)
      )
      .filter((q) => q.eq(q.field("skillLevel"), program.skillLevel))
      .collect();

    // Build template lookup by (phase, week, day)
    const templateLookup = new Map<string, (typeof templates)[0]>();
    for (const template of templates) {
      const key = `${template.phase}-${template.week}-${template.day}`;
      templateLookup.set(key, template);
    }

    // Apply slot overrides
    const slotOverrides = scheduleOverride?.slotOverrides ?? [];
    const overrideLookup = new Map<string, string>(); // slot key -> template ID
    for (const override of slotOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      overrideLookup.set(key, override.templateId.toString());
    }

    // Parse date range
    const start = parseDateISO(startDate);
    const end = parseDateISO(endDate);
    const programStartDate = new Date(program.createdAt);

    // Determine which phases are unlocked
    const unlockedPhases: Phase[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    // Determine today's date
    const today = startOfDay(new Date());
    const todayISO = formatDateISO(today);

    // Determine current workout slot
    const currentSlot: WorkoutSlot = {
      phase: program.currentPhase as Phase,
      week: program.currentWeek,
      day: program.currentDay,
    };

    // Check for in-progress session
    const inProgressSession = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "in_progress")
      )
      .first();

    // Build calendar data
    const calendarData: Record<
      string,
      {
        date: string;
        workouts: Array<{
          templateId: string;
          name: string;
          phase: Phase;
          week: number;
          day: number;
          exerciseCount: number;
          estimatedDurationMinutes: number;
          isCompleted: boolean;
          isToday: boolean;
          isInProgress: boolean;
          completedOnDate?: string;
        }>;
      }
    > = {};

    // Iterate through each day in range
    let currentDate = start;
    while (currentDate <= end) {
      const dateISO = formatDateISO(currentDate);
      calendarData[dateISO] = {
        date: dateISO,
        workouts: [],
      };

      // Get scheduled workout for this date
      const slot = getWorkoutForDate(programStartDate, trainingDays, currentDate);

      if (slot && unlockedPhases.includes(slot.phase)) {
        const slotKey = `${slot.phase}-${slot.week}-${slot.day}`;

        // Check for override
        const overrideTemplateId = overrideLookup.get(slotKey);
        let template: (typeof templates)[0] | undefined;

        if (overrideTemplateId) {
          template = templates.find(
            (t) => t._id.toString() === overrideTemplateId
          );
        } else {
          template = templateLookup.get(slotKey);
        }

        if (template) {
          const isCompleted = completedTemplateIds.has(template._id.toString());
          const isCurrentSlot =
            slot.phase === currentSlot.phase &&
            slot.week === currentSlot.week &&
            slot.day === currentSlot.day;
          const isTodayDate = dateISO === todayISO;
          const isInProgress =
            inProgressSession?.templateId.toString() === template._id.toString();

          calendarData[dateISO].workouts.push({
            templateId: template._id.toString(),
            name: template.name,
            phase: slot.phase,
            week: slot.week,
            day: slot.day,
            exerciseCount: template.exercises.length,
            estimatedDurationMinutes: template.estimatedDurationMinutes,
            isCompleted,
            isToday: isTodayDate && (isCurrentSlot || isInProgress),
            isInProgress,
            completedOnDate: completionDates.get(template._id.toString()),
          });
        }
      }

      // Add any workouts completed on this date (even if not scheduled for this date)
      for (const session of completedSessions) {
        if (session.completedAt) {
          const completionDateISO = formatDateISO(new Date(session.completedAt));
          if (completionDateISO === dateISO) {
            // Check if this workout is already in the list (scheduled for this day)
            const alreadyAdded = calendarData[dateISO].workouts.some(
              (w) => w.templateId === session.templateId.toString()
            );
            if (!alreadyAdded) {
              // Find the template
              const template = templates.find(
                (t) => t._id.toString() === session.templateId.toString()
              );
              if (template) {
                // This workout was completed on this day but wasn't scheduled here
                // (it was swapped/moved)
                calendarData[dateISO].workouts.push({
                  templateId: template._id.toString(),
                  name: template.name,
                  phase: template.phase as Phase,
                  week: template.week,
                  day: template.day,
                  exerciseCount: template.exercises.length,
                  estimatedDurationMinutes: template.estimatedDurationMinutes,
                  isCompleted: true,
                  isToday: false,
                  isInProgress: false,
                  completedOnDate: completionDateISO,
                });
              }
            }
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return {
      calendarData,
      programStartDate: formatDateISO(programStartDate),
      trainingDays,
      currentPhase: program.currentPhase,
      currentWeek: program.currentWeek,
      currentDay: program.currentDay,
      unlockedPhases,
      todayFocusTemplateId: scheduleOverride?.todayFocusTemplateId?.toString(),
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

/**
 * Cascade workouts when starting a future workout
 *
 * When a user starts a workout that's scheduled for a future date:
 * 1. The selected workout moves to today's slot
 * 2. Today's original workout shifts to the next slot
 * 3. All workouts between cascade down
 *
 * This implements the "Start = Swap" UX model with cascade behavior.
 *
 * @param templateId - The template being started
 * @returns Object with cascadeApplied boolean and affected slot count
 */
export const cascadeWorkoutsToToday = mutation({
  args: {
    templateId: v.id("program_templates"),
  },
  handler: async (ctx, { templateId }) => {
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

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) {
      throw new Error("No active program found");
    }

    // Get intake for training days
    const intakeResponse = await ctx.db.get(program.intakeResponseId);
    if (!intakeResponse) {
      throw new Error("Intake response not found");
    }

    const trainingDays =
      intakeResponse.selectedTrainingDays ??
      DEFAULT_TRAINING_DAYS[intakeResponse.preferredTrainingDaysPerWeek] ??
      DEFAULT_TRAINING_DAYS[3];

    const programStartDate = new Date(program.createdAt);
    const today = startOfDay(new Date());

    // Get today's scheduled slot
    const todaySlot = getWorkoutForDate(programStartDate, trainingDays, today);
    if (!todaySlot) {
      // Today is not a training day - no cascade needed
      return { cascadeApplied: false, reason: "not_training_day", affectedSlots: 0 };
    }

    // Get the template being started
    const template = await ctx.db.get(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Check if template belongs to user's program
    if (template.gppCategoryId !== program.gppCategoryId) {
      throw new Error("Template does not belong to your program");
    }

    if (template.skillLevel !== program.skillLevel) {
      throw new Error("Template skill level does not match your program");
    }

    const selectedSlot: WorkoutSlot = {
      phase: template.phase as Phase,
      week: template.week,
      day: template.day,
    };

    // Get existing schedule overrides
    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get all templates for user's category and skill level
    const allTemplates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", program.gppCategoryId)
      )
      .filter((q) => q.eq(q.field("skillLevel"), program.skillLevel))
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

    // Get current template for a slot (considering overrides)
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
        for (let day = 1; day <= trainingDays.length; day++) {
          const slot: WorkoutSlot = { phase, week, day };
          const slotTemplate = getTemplateForSlot(slot);
          if (slotTemplate && slotTemplate._id.toString() === templateId.toString()) {
            selectedTemplateCurrentSlot = slot;
            break;
          }
        }
        if (selectedTemplateCurrentSlot) break;
      }
      if (selectedTemplateCurrentSlot) break;
    }

    if (!selectedTemplateCurrentSlot) {
      throw new Error("Selected template not found in schedule");
    }

    // Calculate absolute indices for comparison
    const getAbsoluteIndex = (slot: WorkoutSlot) => {
      const phaseIdx = PHASE_ORDER.indexOf(slot.phase);
      return (
        phaseIdx * WEEKS_PER_PHASE * trainingDays.length +
        (slot.week - 1) * trainingDays.length +
        (slot.day - 1)
      );
    };

    const todayIndex = getAbsoluteIndex(todaySlot);
    const selectedIndex = getAbsoluteIndex(selectedTemplateCurrentSlot);

    // If selected workout is already at today's slot, no cascade needed
    if (todayIndex === selectedIndex) {
      return { cascadeApplied: false, reason: "already_today", affectedSlots: 0 };
    }

    // If selected is before today (in the past), no cascade needed
    if (selectedIndex < todayIndex) {
      return { cascadeApplied: false, reason: "workout_in_past", affectedSlots: 0 };
    }

    // Generate all slots in order
    const allSlots: WorkoutSlot[] = [];
    for (const phase of PHASE_ORDER) {
      for (let week = 1; week <= WEEKS_PER_PHASE; week++) {
        for (let day = 1; day <= trainingDays.length; day++) {
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
    const completedTemplateIds = new Set(completedSessions.map((s) => s.templateId.toString()));

    // Check if any workout in the cascade range is completed
    const slotsInRange = allSlots.slice(todayIndex, selectedIndex + 1);
    for (const slot of slotsInRange) {
      const slotTemplate = getTemplateForSlot(slot);
      if (slotTemplate && completedTemplateIds.has(slotTemplate._id.toString())) {
        throw new Error("Cannot cascade: a workout in the range is already completed");
      }
    }

    // Build new slot overrides with cascade
    // 1. Selected workout goes to today's slot
    // 2. Everything between shifts down by one

    // Collect current template assignments for affected range
    const rangeTemplates: Array<{ slot: WorkoutSlot; template: (typeof allTemplates)[0] }> = [];
    for (const slot of slotsInRange) {
      const t = getTemplateForSlot(slot);
      if (t) {
        rangeTemplates.push({ slot, template: t });
      }
    }

    // Create new assignments:
    // - today's slot gets the selected template
    // - each subsequent slot gets the template from the previous slot
    const newAssignments: Array<{ slot: WorkoutSlot; templateId: string }> = [];

    // Today's slot gets the selected template
    newAssignments.push({
      slot: slotsInRange[0],
      templateId: templateId.toString(),
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
    // Remove existing overrides for affected slots
    const newSlotOverrides = slotOverrides.filter((o) => {
      const oIndex = getAbsoluteIndex({ phase: o.phase as Phase, week: o.week, day: o.day });
      return oIndex < todayIndex || oIndex > selectedIndex;
    });

    // Add new cascade overrides
    for (const assignment of newAssignments) {
      // Only add override if it differs from the default
      const defaultTemplate = templateLookup.get(
        `${assignment.slot.phase}-${assignment.slot.week}-${assignment.slot.day}`
      );
      if (!defaultTemplate || defaultTemplate._id.toString() !== assignment.templateId) {
        newSlotOverrides.push({
          phase: assignment.slot.phase,
          week: assignment.slot.week,
          day: assignment.slot.day,
          templateId: allTemplates.find((t) => t._id.toString() === assignment.templateId)!._id,
        });
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
        userProgramId: program._id,
        slotOverrides: newSlotOverrides,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      cascadeApplied: true,
      reason: "cascade_completed",
      affectedSlots: slotsInRange.length,
      fromSlot: selectedTemplateCurrentSlot,
      toSlot: todaySlot,
    };
  },
});

/**
 * Get program metadata for calendar display
 */
export const getProgramCalendarMeta = query({
  args: {},
  handler: async (ctx) => {
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

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) {
      return null;
    }

    const intakeResponse = await ctx.db.get(program.intakeResponseId);
    if (!intakeResponse) {
      return null;
    }

    const trainingDays =
      intakeResponse.selectedTrainingDays ??
      DEFAULT_TRAINING_DAYS[intakeResponse.preferredTrainingDaysPerWeek] ??
      DEFAULT_TRAINING_DAYS[3];

    const programStartDate = new Date(program.createdAt);

    // Calculate program end date
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: WEEKS_PER_PHASE,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(
      programStartDate,
      trainingDays,
      lastWorkoutSlot
    );

    // Calculate total and completed workouts
    const totalWorkouts = PHASE_ORDER.length * WEEKS_PER_PHASE * trainingDays.length;

    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const completedWorkouts = completedSessions.length;

    // Determine unlocked phases
    const unlockedPhases: Phase[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    return {
      programStartDate: formatDateISO(programStartDate),
      programEndDate: formatDateISO(programEndDate),
      trainingDays,
      totalWorkouts,
      completedWorkouts,
      currentPhase: program.currentPhase,
      currentWeek: program.currentWeek,
      currentDay: program.currentDay,
      unlockedPhases,
      gppCategoryId: program.gppCategoryId,
      skillLevel: program.skillLevel,
    };
  },
});

/**
 * Get FULL calendar view for entire program duration
 *
 * Fetches ALL workouts mapped to calendar dates upfront.
 * No date range filtering - loads everything once.
 * This eliminates loading when scrolling between weeks/months.
 *
 * Returns:
 * - All workout dates for the program (12 weeks, all phases)
 * - Completion status
 * - Phase information for color coding
 * - Program metadata (start/end dates, progress)
 */
export const getFullProgramCalendar = query({
  args: {},
  handler: async (ctx) => {
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

    // Get user's program
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) {
      return null;
    }

    // Get intake response for training days
    const intakeResponse = await ctx.db.get(program.intakeResponseId);
    if (!intakeResponse) {
      return null;
    }

    // Get training days
    const trainingDays =
      intakeResponse.selectedTrainingDays ??
      DEFAULT_TRAINING_DAYS[intakeResponse.preferredTrainingDaysPerWeek] ??
      DEFAULT_TRAINING_DAYS[3];

    const programStartDate = new Date(program.createdAt);

    // Calculate program end date (last workout of SSP)
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: WEEKS_PER_PHASE,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(
      programStartDate,
      trainingDays,
      lastWorkoutSlot
    );

    // Get schedule overrides
    const scheduleOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get completed sessions
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Build set of completed template IDs and completion dates
    const completedTemplateIds = new Set(
      completedSessions.map((s) => s.templateId.toString())
    );
    const completionDates = new Map<string, string>();
    for (const session of completedSessions) {
      if (session.completedAt) {
        const completionDate = formatDateISO(new Date(session.completedAt));
        completionDates.set(session.templateId.toString(), completionDate);
      }
    }

    // Get all templates for user's category and skill level
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", program.gppCategoryId)
      )
      .filter((q) => q.eq(q.field("skillLevel"), program.skillLevel))
      .collect();

    // Build template lookup
    const templateLookup = new Map<string, (typeof templates)[0]>();
    for (const template of templates) {
      const key = `${template.phase}-${template.week}-${template.day}`;
      templateLookup.set(key, template);
    }

    // Apply slot overrides
    const slotOverrides = scheduleOverride?.slotOverrides ?? [];
    const overrideLookup = new Map<string, string>();
    for (const override of slotOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      overrideLookup.set(key, override.templateId.toString());
    }

    // Determine unlocked phases
    const unlockedPhases: Phase[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    // Today's info
    const today = startOfDay(new Date());
    const todayISO = formatDateISO(today);

    // Current slot
    const currentSlot: WorkoutSlot = {
      phase: program.currentPhase as Phase,
      week: program.currentWeek,
      day: program.currentDay,
    };

    // Check for in-progress session
    const inProgressSession = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", user._id).eq("status", "in_progress")
      )
      .first();

    // Build calendar data for ALL dates
    const calendarData: Record<
      string,
      {
        date: string;
        workouts: Array<{
          templateId: string;
          name: string;
          phase: Phase;
          week: number;
          day: number;
          exerciseCount: number;
          estimatedDurationMinutes: number;
          isCompleted: boolean;
          isToday: boolean;
          isInProgress: boolean;
          completedOnDate?: string;
        }>;
      }
    > = {};

    // Generate dates from 2 weeks before program start to 2 weeks after end
    const bufferDays = 14;
    const startDate = addDays(programStartDate, -bufferDays);
    const endDate = addDays(programEndDate, bufferDays);

    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateISO = formatDateISO(currentDate);
      calendarData[dateISO] = {
        date: dateISO,
        workouts: [],
      };

      // Get scheduled workout for this date
      const slot = getWorkoutForDate(programStartDate, trainingDays, currentDate);

      if (slot && unlockedPhases.includes(slot.phase)) {
        const slotKey = `${slot.phase}-${slot.week}-${slot.day}`;

        // Check for override
        const overrideTemplateId = overrideLookup.get(slotKey);
        let template: (typeof templates)[0] | undefined;

        if (overrideTemplateId) {
          template = templates.find(
            (t) => t._id.toString() === overrideTemplateId
          );
        } else {
          template = templateLookup.get(slotKey);
        }

        if (template) {
          const isCompleted = completedTemplateIds.has(template._id.toString());
          const isCurrentSlot =
            slot.phase === currentSlot.phase &&
            slot.week === currentSlot.week &&
            slot.day === currentSlot.day;
          const isTodayDate = dateISO === todayISO;
          const isInProgress =
            inProgressSession?.templateId.toString() === template._id.toString();

          calendarData[dateISO].workouts.push({
            templateId: template._id.toString(),
            name: template.name,
            phase: slot.phase,
            week: slot.week,
            day: slot.day,
            exerciseCount: template.exercises.length,
            estimatedDurationMinutes: template.estimatedDurationMinutes,
            isCompleted,
            isToday: isTodayDate && (isCurrentSlot || isInProgress),
            isInProgress,
            completedOnDate: completionDates.get(template._id.toString()),
          });
        }
      }

      // Add workouts completed on this date (even if not scheduled)
      for (const session of completedSessions) {
        if (session.completedAt) {
          const completionDateISO = formatDateISO(new Date(session.completedAt));
          if (completionDateISO === dateISO) {
            const alreadyAdded = calendarData[dateISO].workouts.some(
              (w) => w.templateId === session.templateId.toString()
            );
            if (!alreadyAdded) {
              const template = templates.find(
                (t) => t._id.toString() === session.templateId.toString()
              );
              if (template) {
                calendarData[dateISO].workouts.push({
                  templateId: template._id.toString(),
                  name: template.name,
                  phase: template.phase as Phase,
                  week: template.week,
                  day: template.day,
                  exerciseCount: template.exercises.length,
                  estimatedDurationMinutes: template.estimatedDurationMinutes,
                  isCompleted: true,
                  isToday: false,
                  isInProgress: false,
                  completedOnDate: completionDateISO,
                });
              }
            }
          }
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    // Calculate totals
    const totalWorkouts = PHASE_ORDER.length * WEEKS_PER_PHASE * trainingDays.length;

    return {
      calendarData,
      programStartDate: formatDateISO(programStartDate),
      programEndDate: formatDateISO(programEndDate),
      trainingDays,
      totalWorkouts,
      completedWorkouts: completedSessions.length,
      currentPhase: program.currentPhase,
      currentWeek: program.currentWeek,
      currentDay: program.currentDay,
      unlockedPhases,
      todayFocusTemplateId: scheduleOverride?.todayFocusTemplateId?.toString(),
    };
  },
});
