import { query, mutation } from "./_generated/server";
import { calendarStart, phaseAnchor } from "./blockCompletion";
import { loadProgramCompletion } from "./programCompletion";
import { athleteDate, athleteDayArgs, athleteToday } from "./athleteClock";
import { countMainExercises } from "../lib/today";
import { v } from "convex/values";
import { mapUserWeekToTemplateWeek } from "./weekMapping";

/**
 * Workout Calendar - Calendar View Queries and Mutations
 *
 * Provides calendar-based view of the workout program, mapping
 * workout slots (phase, week, day) to actual calendar dates based on:
 * - phaseAnchor(program, phase): each phase's anchor date (convex/blockCompletion.ts)
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
const DEFAULT_WEEKS_PER_PHASE = 4; // Fallback for existing users without dynamic weeks

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

function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  return result;
}

function isSameWeek(a: Date, b: Date): boolean {
  return isSameDay(startOfWeek(a), startOfWeek(b));
}

function findNextDayOfWeek(startDate: Date, dayOfWeek: number): Date {
  const result = startOfDay(startDate);
  const currentDay = result.getDay();
  const daysUntil = (dayOfWeek - currentDay + 7) % 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

/**
 * Find the soonest training day on or after the start date
 * This handles the case where the program is created mid-week
 *
 * @param startDate - The date to start looking from
 * @param trainingDays - Array of day indices (0=Sun, 6=Sat), must be sorted
 * @returns Object with the first training date and the index in trainingDays
 */
function findFirstTrainingDate(
  startDate: Date,
  trainingDays: number[]
): { date: Date; dayIndex: number } {
  const start = startOfDay(startDate);
  const startDayOfWeek = start.getDay();

  // Find the first training day on or after startDayOfWeek
  let dayIndex = trainingDays.findIndex(d => d >= startDayOfWeek);

  if (dayIndex === -1) {
    // All training days are before startDayOfWeek in the week
    // So we wrap to the first training day next week
    dayIndex = 0;
    const daysUntil = (trainingDays[0] - startDayOfWeek + 7) % 7;
    const date = addDays(start, daysUntil === 0 ? 7 : daysUntil);
    return { date, dayIndex };
  }

  // Found a training day in the current week
  const daysUntil = trainingDays[dayIndex] - startDayOfWeek;
  const date = addDays(start, daysUntil);
  return { date, dayIndex };
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
 * @param weeksPerPhase - Dynamic weeks per phase (defaults to 4 for backwards compatibility)
 */
function getDateForWorkout(
  programStartDate: Date,
  trainingDays: number[],
  slot: WorkoutSlot,
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
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
    phaseIndex * weeksPerPhase * workoutsPerWeek +
    (slot.week - 1) * workoutsPerWeek +
    (slot.day - 1);

  const start = startOfDay(programStartDate);

  // Use findFirstTrainingDate to handle mid-week program starts
  // This ensures workouts start on the soonest training day (could be today)
  const { date: firstTrainingDate, dayIndex: startDayIndex } = findFirstTrainingDate(start, sortedDays);

  let workoutCount = 0;
  let currentDate = firstTrainingDate;
  let currentDayIndex = startDayIndex;

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
 * @param weeksPerPhase - Dynamic weeks per phase (defaults to 4 for backwards compatibility)
 */
export function getWorkoutForDate(
  programStartDate: Date,
  trainingDays: number[],
  date: Date,
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): WorkoutSlot | null {
  const targetDate = startOfDay(date);
  const targetDayOfWeek = targetDate.getDay();

  const sortedDays = [...trainingDays].sort((a, b) => a - b);
  if (!sortedDays.includes(targetDayOfWeek)) {
    return null;
  }

  const start = startOfDay(programStartDate);

  // Use findFirstTrainingDate to handle mid-week program starts
  // This ensures workouts start on the soonest training day (could be today)
  const { date: firstTrainingDate, dayIndex: startDayIndex } = findFirstTrainingDate(start, sortedDays);

  if (targetDate < firstTrainingDate) {
    return null;
  }

  let workoutIndex = 0;
  let currentDate = firstTrainingDate;
  let currentDayIndex = startDayIndex;

  // Increase limit for longer programs (max 8 weeks × 3 phases × 7 days = 168)
  const maxWorkouts = weeksPerPhase * PHASE_ORDER.length * sortedDays.length + 50;

  while (!isSameDay(currentDate, targetDate)) {
    currentDayIndex = (currentDayIndex + 1) % sortedDays.length;
    if (currentDayIndex === 0) {
      // Moving to next week - jump to the first training day
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

    if (workoutIndex > maxWorkouts) {
      return null;
    }
  }

  const workoutsPerWeek = sortedDays.length;
  const totalWorkoutsPerPhase = weeksPerPhase * workoutsPerWeek;

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

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

/**
 * Move a workout to a specific calendar date
 *
 * Allows dragging a workout to any day of the week, including non-training days.
 * If the target date already has a workout, they are swapped.
 *
 * @param sourcePhase - The phase of the workout being moved
 * @param sourceWeek - The week of the workout being moved
 * @param sourceDay - The day (within week) of the workout being moved
 * @param targetDateISO - The target date in YYYY-MM-DD format
 */
export const moveWorkoutToDate = mutation({
  args: {
    sourcePhase: phaseValidator,
    sourceWeek: v.number(),
    sourceDay: v.number(),
    targetDateISO: v.string(),
    ...athleteDayArgs,
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

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) {
      throw new Error("No active program found");
    }

    // Check phase is unlocked
    const unlockedPhases: Phase[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    if (!unlockedPhases.includes(args.sourcePhase)) {
      throw new Error(`Phase ${args.sourcePhase} is locked`);
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

    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

    // Validate source slot
    if (args.sourceWeek < 1 || args.sourceWeek > weeksPerPhase) {
      throw new Error("Invalid source week");
    }
    if (args.sourceDay < 1 || args.sourceDay > trainingDays.length) {
      throw new Error("Invalid source day");
    }

    // Parse target date
    const targetDate = parseDateISO(args.targetDateISO);

    // Get existing overrides
    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    const dateOverrides = existingOverride?.dateOverrides ?? [];
    const slotOverrides = existingOverride?.slotOverrides ?? [];

    // Build lookup for current date assignments
    const dateOverrideLookup = new Map<string, string>(); // slot key -> dateISO
    for (const override of dateOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      dateOverrideLookup.set(key, override.dateISO);
    }

    // Get the source slot's current effective date
    const sourceKey = `${args.sourcePhase}-${args.sourceWeek}-${args.sourceDay}`;
    const sourceCurrentDate = dateOverrideLookup.get(sourceKey) ??
      formatDateISO(getDateForWorkout(phaseAnchor(program, args.sourcePhase), trainingDays, {
        phase: args.sourcePhase,
        week: args.sourceWeek,
        day: args.sourceDay,
      }, weeksPerPhase));

    // If source is already on target date, nothing to do
    if (sourceCurrentDate === args.targetDateISO) {
      return { success: true, noChange: true };
    }

    // SAME-WEEK CONSTRAINT: Workouts can only move within the same calendar week
    // Exception: Last week of program allows moves up to 7 days forward
    const LAST_WEEK_BUFFER_DAYS = 7;
    const sourceDate = parseDateISO(sourceCurrentDate);

    // NO PAST DATES CONSTRAINT: Cannot move workouts to dates in the past
    const todayStart = athleteToday(args);
    if (targetDate < todayStart) {
      throw new Error("Cannot move workout to a past date");
    }

    // Calculate the last workout date in the program
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: weeksPerPhase,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(phaseAnchor(program, "SSP"), trainingDays, lastWorkoutSlot, weeksPerPhase);
    const isLastWeek = isSameWeek(sourceDate, programEndDate);

    if (isLastWeek) {
      // Last week: allow moves up to LAST_WEEK_BUFFER_DAYS forward
      const maxDate = addDays(sourceDate, LAST_WEEK_BUFFER_DAYS);
      if (targetDate > maxDate) {
        throw new Error(`Cannot move workout more than ${LAST_WEEK_BUFFER_DAYS} days forward from the last week`);
      }
    } else {
      // Normal weeks: must stay within the same calendar week
      if (!isSameWeek(sourceDate, targetDate)) {
        throw new Error("Workouts can only be moved within the same week");
      }
    }

    // Find if any slot is currently on the target date
    let targetSlot: WorkoutSlot | null = null;
    for (const phase of PHASE_ORDER) {
      if (!unlockedPhases.includes(phase)) continue; // Only check unlocked phases
      for (let week = 1; week <= weeksPerPhase; week++) {
        for (let day = 1; day <= trainingDays.length; day++) {
          const slot: WorkoutSlot = { phase, week, day };
          const slotKey = `${phase}-${week}-${day}`;

          // Skip if this is the source slot
          if (slotKey === sourceKey) continue;

          const slotDate = dateOverrideLookup.get(slotKey) ??
            formatDateISO(getDateForWorkout(phaseAnchor(program, slot.phase), trainingDays, slot, weeksPerPhase));

          if (slotDate === args.targetDateISO) {
            targetSlot = slot;
            break;
          }
        }
        if (targetSlot) break;
      }
      if (targetSlot) break;
    }

    // Neither workout may be one that's done
    const completion = await loadProgramCompletion(ctx, program);
    if (completion.isSlotDone({ phase: args.sourcePhase, week: args.sourceWeek, day: args.sourceDay })) {
      throw new Error("Cannot move a completed workout");
    }
    if (targetSlot && completion.isSlotDone(targetSlot)) {
      throw new Error("Cannot swap with a completed workout");
    }

    // Build new dateOverrides
    // Remove existing overrides for source (and target if swapping)
    const newDateOverrides = dateOverrides.filter((o) => {
      const k = `${o.phase}-${o.week}-${o.day}`;
      if (k === sourceKey) return false;
      if (targetSlot && k === `${targetSlot.phase}-${targetSlot.week}-${targetSlot.day}`) return false;
      return true;
    });

    // Source slot moves to target date
    newDateOverrides.push({
      phase: args.sourcePhase,
      week: args.sourceWeek,
      day: args.sourceDay,
      dateISO: args.targetDateISO,
    });

    // If target had a workout, it moves to source's original date
    if (targetSlot) {
      newDateOverrides.push({
        phase: targetSlot.phase,
        week: targetSlot.week,
        day: targetSlot.day,
        dateISO: sourceCurrentDate,
      });
    }

    const now = Date.now();

    // Save overrides
    if (existingOverride) {
      await ctx.db.patch(existingOverride._id, {
        dateOverrides: newDateOverrides,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("user_schedule_overrides", {
        userId: user._id,
        userProgramId: program._id,
        slotOverrides: [],
        dateOverrides: newDateOverrides,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      moved: {
        source: { phase: args.sourcePhase, week: args.sourceWeek, day: args.sourceDay },
        toDate: args.targetDateISO,
        swappedWith: targetSlot,
      },
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

    // Get dynamic weeks per phase (fallback to 4 for existing users)
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

    const programStartDate = calendarStart(program);

    // Calculate program end date
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: weeksPerPhase,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(phaseAnchor(program, "SSP"),
      trainingDays,
      lastWorkoutSlot,
      weeksPerPhase
    );

    // Calculate total and completed workouts using dynamic weeksPerPhase
    const totalWorkouts = PHASE_ORDER.length * weeksPerPhase * trainingDays.length;

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
  args: athleteDayArgs,
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

    // Get dynamic weeks per phase (fallback to 4 for existing users)
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

    const programStartDate = calendarStart(program);

    // Calculate program end date (last workout of SSP)
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: weeksPerPhase,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(phaseAnchor(program, "SSP"),
      trainingDays,
      lastWorkoutSlot,
      weeksPerPhase
    );

    // Get schedule overrides
    const scheduleOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Which slots are done, and by which session
    const completion = await loadProgramCompletion(ctx, program);

    // Get all templates for user's category and skill level
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_skill", (q) =>
        q
          .eq("gppCategoryId", program.gppCategoryId)
          .eq("skillLevel", program.skillLevel)
      )
      .collect();

    // Build template lookup
    const templateLookup = new Map<string, (typeof templates)[0]>();
    for (const template of templates) {
      const key = `${template.phase}-${template.week}-${template.day}`;
      templateLookup.set(key, template);
    }

    // Apply slot overrides (which template is at each slot)
    const slotOverrides = scheduleOverride?.slotOverrides ?? [];
    const overrideLookup = new Map<string, string>();
    for (const override of slotOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      overrideLookup.set(key, override.templateId.toString());
    }

    // Apply date overrides (which date each slot appears on)
    const dateOverrides = scheduleOverride?.dateOverrides ?? [];
    const dateOverrideLookup = new Map<string, string>(); // slot key -> dateISO
    for (const override of dateOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      dateOverrideLookup.set(key, override.dateISO);
    }

    // Determine unlocked phases
    const unlockedPhases: Phase[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    // Today's info
    const today = athleteToday(args);
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
          isLocked: boolean; // Phase not yet unlocked (visible but not draggable)
          completedOnDate?: string;
        }>;
      }
    > = {};

    // Generate dates from 2 weeks before program start to 2 weeks after end
    const bufferDays = 14;
    const startDate = addDays(programStartDate, -bufferDays);
    const endDate = addDays(programEndDate, bufferDays);

    // Initialize calendar with empty days
    let currentDate = startDate;
    while (currentDate <= endDate) {
      const dateISO = formatDateISO(currentDate);
      calendarData[dateISO] = {
        date: dateISO,
        workouts: [],
      };
      currentDate = addDays(currentDate, 1);
    }

    // Iterate through all workout slots and place them on their effective dates
    // This approach respects dateOverrides (workouts can be moved to any day)
    for (const phase of PHASE_ORDER) {
      for (let week = 1; week <= weeksPerPhase; week++) {
        for (let day = 1; day <= trainingDays.length; day++) {
          const slot: WorkoutSlot = { phase, week, day };
          const slotKey = `${phase}-${week}-${day}`;
          const isLocked = !unlockedPhases.includes(phase);

          // Determine effective date: check dateOverride first, then use default
          let effectiveDate: Date;
          const dateOverride = dateOverrideLookup.get(slotKey);
          if (dateOverride) {
            effectiveDate = parseDateISO(dateOverride);
          } else {
            effectiveDate = getDateForWorkout(phaseAnchor(program, slot.phase), trainingDays, slot, weeksPerPhase);
          }
          const effectiveDateISO = formatDateISO(effectiveDate);

          // Skip if date is outside our range
          if (!calendarData[effectiveDateISO]) continue;

          // Get template for this slot (considering slot overrides)
          const overrideTemplateId = !isLocked ? overrideLookup.get(slotKey) : undefined;
          let template: (typeof templates)[0] | undefined;

          if (overrideTemplateId) {
            template = templates.find(
              (t) => t._id.toString() === overrideTemplateId
            );
          } else {
            // Map user week to template week (1-4) preserving periodization curve
            const templateWeek = mapUserWeekToTemplateWeek(week, weeksPerPhase);
            const templateSlotKey = `${phase}-${templateWeek}-${day}`;
            template = templateLookup.get(templateSlotKey);
          }

          if (template) {
            const doneBy = completion.sessionFor(slot);
            const isCompleted = !!doneBy;
            const isTodayDate = effectiveDateISO === todayISO;
            const isInProgress =
              inProgressSession?.templateId.toString() === template._id.toString();

            calendarData[effectiveDateISO].workouts.push({
              templateId: template._id.toString(),
              name: template.name,
              phase: slot.phase,
              week: slot.week,
              day: slot.day,
              exerciseCount: countMainExercises(template.exercises),
              estimatedDurationMinutes: template.estimatedDurationMinutes,
              isCompleted,
              // isToday follows the date, not the slot - gradient shows on today's workout
              isToday: isTodayDate && !isCompleted,
              isInProgress,
              isLocked,
              completedOnDate: doneBy?.completedAt ? formatDateISO(athleteDate(doneBy.completedAt, args)) : undefined,
            });
          } else {
            // Template not found - this usually means templates need to be regenerated
            const templateWeek = mapUserWeekToTemplateWeek(week, weeksPerPhase);
            console.warn(
              `No template found for ${phase}-W${templateWeek}-D${day} ` +
              `(userWeek: ${week}) - templates may need regeneration`
            );
          }
        }
      }
    }

    // Add workouts completed on specific dates (even if not currently scheduled there)
    // Redos included: a workout logged on a day shows on that day
    for (const session of completion.logged) {
      if (session.completedAt) {
        const completionDateISO = formatDateISO(athleteDate(session.completedAt, args));
        if (calendarData[completionDateISO]) {
          const alreadyAdded = calendarData[completionDateISO].workouts.some(
            (w) => w.templateId === session.templateId.toString()
          );
          if (!alreadyAdded) {
            const template = templates.find(
              (t) => t._id.toString() === session.templateId.toString()
            );
            if (template) {
              calendarData[completionDateISO].workouts.push({
                templateId: template._id.toString(),
                name: template.name,
                phase: template.phase as Phase,
                week: template.week,
                day: template.day,
                exerciseCount: countMainExercises(template.exercises),
                estimatedDurationMinutes: template.estimatedDurationMinutes,
                isCompleted: true,
                isToday: false,
                isInProgress: false,
                isLocked: false, // Completed workouts are never locked
                completedOnDate: completionDateISO,
              });
            }
          }
        }
      }
    }

    // Calculate totals using dynamic weeksPerPhase
    const totalWorkouts = PHASE_ORDER.length * weeksPerPhase * trainingDays.length;

    return {
      calendarData,
      programStartDate: formatDateISO(programStartDate),
      programEndDate: formatDateISO(programEndDate),
      trainingDays,
      weeksPerPhase, // Include in response for UI to use
      totalWorkouts,
      completedWorkouts: completion.sessions.length,
      currentPhase: program.currentPhase,
      currentWeek: program.currentWeek,
      currentDay: program.currentDay,
      unlockedPhases,
      todayFocusTemplateId: scheduleOverride?.todayFocusTemplateId?.toString(),
      gppCategoryId: program.gppCategoryId, // Category for consistent color scheme
    };
  },
});
