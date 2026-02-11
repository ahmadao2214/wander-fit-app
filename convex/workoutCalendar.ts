import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { mapUserWeekToTemplateWeek } from "./weekMapping";

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
function getWorkoutForDate(
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

    // Get dynamic weeks per phase (fallback to 4 for existing users)
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

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

      // Get scheduled workout for this date (pass weeksPerPhase for dynamic calculation)
      const slot = getWorkoutForDate(programStartDate, trainingDays, currentDate, weeksPerPhase);

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
          // Map user week to template week (1-4) preserving periodization curve
          const templateWeek = mapUserWeekToTemplateWeek(slot.week, weeksPerPhase);
          const templateSlotKey = `${slot.phase}-${templateWeek}-${slot.day}`;
          template = templateLookup.get(templateSlotKey);
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

    // Get dynamic weeks per phase (fallback to 4 for existing users)
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

    const programStartDate = new Date(program.createdAt);
    const today = startOfDay(new Date());

    // Get today's scheduled slot
    const todaySlot = getWorkoutForDate(programStartDate, trainingDays, today, weeksPerPhase);
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
      for (let week = 1; week <= weeksPerPhase; week++) {
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
        phaseIdx * weeksPerPhase * trainingDays.length +
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
      for (let week = 1; week <= weeksPerPhase; week++) {
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
 * Swap two workouts in the schedule (for drag-drop reordering)
 *
 * Allows users to manually swap workout positions for planning ahead.
 * Only works for unlocked phases.
 *
 * @param sourceSlot - The original slot being dragged from
 * @param targetSlot - The slot being dropped onto
 */
export const swapWorkouts = mutation({
  args: {
    sourcePhase: phaseValidator,
    sourceWeek: v.number(),
    sourceDay: v.number(),
    targetPhase: phaseValidator,
    targetWeek: v.number(),
    targetDay: v.number(),
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

    // Check phases are unlocked
    const unlockedPhases: Phase[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    if (!unlockedPhases.includes(args.sourcePhase)) {
      throw new Error(`Source phase ${args.sourcePhase} is locked`);
    }
    if (!unlockedPhases.includes(args.targetPhase)) {
      throw new Error(`Target phase ${args.targetPhase} is locked`);
    }

    // Enforce same-week constraint: swaps only allowed within the same phase AND week
    if (args.sourcePhase !== args.targetPhase) {
      throw new Error("Swaps must be within the same phase");
    }
    if (args.sourceWeek !== args.targetWeek) {
      throw new Error("Swaps must be within the same week");
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

    // Get dynamic weeks per phase
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

    // Validate day numbers
    if (args.sourceDay < 1 || args.sourceDay > trainingDays.length) {
      throw new Error("Invalid source day");
    }
    if (args.targetDay < 1 || args.targetDay > trainingDays.length) {
      throw new Error("Invalid target day");
    }

    // Validate week numbers
    if (args.sourceWeek < 1 || args.sourceWeek > weeksPerPhase) {
      throw new Error("Invalid source week");
    }
    if (args.targetWeek < 1 || args.targetWeek > weeksPerPhase) {
      throw new Error("Invalid target week");
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
    for (const t of templates) {
      const key = `${t.phase}-${t.week}-${t.day}`;
      templateLookup.set(key, t);
    }

    // Get existing overrides
    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    const slotOverrides = existingOverride?.slotOverrides ?? [];
    const overrideLookup = new Map<string, string>();
    for (const override of slotOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      overrideLookup.set(key, override.templateId.toString());
    }

    // Get templates currently in each slot
    const getTemplateForSlot = (phase: Phase, week: number, day: number) => {
      const key = `${phase}-${week}-${day}`;
      const overrideId = overrideLookup.get(key);
      if (overrideId) {
        return templates.find((t) => t._id.toString() === overrideId);
      }
      // Map to template week preserving periodization
      const templateWeek = mapUserWeekToTemplateWeek(week, weeksPerPhase);
      const templateKey = `${phase}-${templateWeek}-${day}`;
      return templateLookup.get(templateKey);
    };

    const sourceTemplate = getTemplateForSlot(args.sourcePhase, args.sourceWeek, args.sourceDay);
    const targetTemplate = getTemplateForSlot(args.targetPhase, args.targetWeek, args.targetDay);

    if (!sourceTemplate) {
      throw new Error("No template found at source slot");
    }
    if (!targetTemplate) {
      throw new Error("No template found at target slot");
    }

    // Check neither workout is completed
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();
    const completedTemplateIds = new Set(completedSessions.map((s) => s.templateId.toString()));

    if (completedTemplateIds.has(sourceTemplate._id.toString())) {
      throw new Error("Cannot move a completed workout");
    }
    if (completedTemplateIds.has(targetTemplate._id.toString())) {
      throw new Error("Cannot swap with a completed workout");
    }

    // Build new overrides
    const sourceKey = `${args.sourcePhase}-${args.sourceWeek}-${args.sourceDay}`;
    const targetKey = `${args.targetPhase}-${args.targetWeek}-${args.targetDay}`;

    // Remove existing overrides for these slots
    const newSlotOverrides = slotOverrides.filter((o) => {
      const k = `${o.phase}-${o.week}-${o.day}`;
      return k !== sourceKey && k !== targetKey;
    });

    // Add new overrides (swap the templates)
    // Source slot gets target's template
    newSlotOverrides.push({
      phase: args.sourcePhase,
      week: args.sourceWeek,
      day: args.sourceDay,
      templateId: targetTemplate._id,
    });

    // Target slot gets source's template
    newSlotOverrides.push({
      phase: args.targetPhase,
      week: args.targetWeek,
      day: args.targetDay,
      templateId: sourceTemplate._id,
    });

    const now = Date.now();

    // Save overrides
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
      success: true,
      swapped: {
        source: { phase: args.sourcePhase, week: args.sourceWeek, day: args.sourceDay },
        target: { phase: args.targetPhase, week: args.targetWeek, day: args.targetDay },
      },
    };
  },
});

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
    const programStartDate = new Date(program.createdAt);

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
      formatDateISO(getDateForWorkout(programStartDate, trainingDays, {
        phase: args.sourcePhase,
        week: args.sourceWeek,
        day: args.sourceDay,
      }, weeksPerPhase));

    // If source is already on target date, nothing to do
    if (sourceCurrentDate === args.targetDateISO) {
      return { success: true, noChange: true };
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
            formatDateISO(getDateForWorkout(programStartDate, trainingDays, slot, weeksPerPhase));

          if (slotDate === args.targetDateISO) {
            targetSlot = slot;
            break;
          }
        }
        if (targetSlot) break;
      }
      if (targetSlot) break;
    }

    // Check completed workouts
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    // Get templates to check completion
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", program.gppCategoryId)
      )
      .filter((q) => q.eq(q.field("skillLevel"), program.skillLevel))
      .collect();

    const completedTemplateIds = new Set(completedSessions.map((s) => s.templateId.toString()));

    // Build template lookup considering slot overrides
    const templateLookup = new Map<string, (typeof templates)[0]>();
    for (const t of templates) {
      const key = `${t.phase}-${t.week}-${t.day}`;
      templateLookup.set(key, t);
    }
    const slotOverrideLookup = new Map<string, string>();
    for (const override of slotOverrides) {
      const key = `${override.phase}-${override.week}-${override.day}`;
      slotOverrideLookup.set(key, override.templateId.toString());
    }

    const getTemplateForSlot = (slot: WorkoutSlot) => {
      const key = `${slot.phase}-${slot.week}-${slot.day}`;
      const overrideId = slotOverrideLookup.get(key);
      if (overrideId) {
        return templates.find((t) => t._id.toString() === overrideId);
      }
      const templateWeek = mapUserWeekToTemplateWeek(slot.week, weeksPerPhase);
      const templateKey = `${slot.phase}-${templateWeek}-${slot.day}`;
      return templateLookup.get(templateKey);
    };

    // Check source workout isn't completed
    const sourceTemplate = getTemplateForSlot({
      phase: args.sourcePhase,
      week: args.sourceWeek,
      day: args.sourceDay,
    });
    if (sourceTemplate && completedTemplateIds.has(sourceTemplate._id.toString())) {
      throw new Error("Cannot move a completed workout");
    }

    // If target has a workout, check it's not completed
    if (targetSlot) {
      const targetTemplate = getTemplateForSlot(targetSlot);
      if (targetTemplate && completedTemplateIds.has(targetTemplate._id.toString())) {
        throw new Error("Cannot swap with a completed workout");
      }
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

    const programStartDate = new Date(program.createdAt);

    // Calculate program end date
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: weeksPerPhase,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(
      programStartDate,
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

    // Get dynamic weeks per phase (fallback to 4 for existing users)
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;

    const programStartDate = new Date(program.createdAt);

    // Calculate program end date (last workout of SSP)
    const lastWorkoutSlot: WorkoutSlot = {
      phase: "SSP",
      week: weeksPerPhase,
      day: trainingDays.length,
    };
    const programEndDate = getDateForWorkout(
      programStartDate,
      trainingDays,
      lastWorkoutSlot,
      weeksPerPhase
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

    // Collect all unique exercise IDs from templates to fetch names
    const exerciseIds = new Set<string>();
    for (const template of templates) {
      for (const ex of template.exercises) {
        exerciseIds.add(ex.exerciseId.toString());
      }
    }

    // Fetch exercise names in bulk
    const exerciseNameLookup = new Map<string, string>();
    for (const exId of exerciseIds) {
      try {
        const exercise = await ctx.db.get(exId as any);
        if (exercise && 'name' in exercise) {
          exerciseNameLookup.set(exId, exercise.name as string);
        }
      } catch {
        // Exercise not found, skip
      }
    }

    // Helper to get first N exercise names for a template
    const getExercisePreview = (template: (typeof templates)[0], count: number = 3): string[] => {
      const names: string[] = [];
      const sortedExercises = [...template.exercises].sort((a, b) => a.orderIndex - b.orderIndex);
      for (let i = 0; i < Math.min(count, sortedExercises.length); i++) {
        const exId = sortedExercises[i].exerciseId.toString();
        const name = exerciseNameLookup.get(exId);
        if (name) {
          names.push(name);
        }
      }
      return names;
    };

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
          isLocked: boolean; // Phase not yet unlocked (visible but not draggable)
          completedOnDate?: string;
          exercisePreview: string[]; // First 3 exercise names for preview
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
            effectiveDate = getDateForWorkout(programStartDate, trainingDays, slot, weeksPerPhase);
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
            const isCompleted = completedTemplateIds.has(template._id.toString());
            const isCurrentSlot =
              slot.phase === currentSlot.phase &&
              slot.week === currentSlot.week &&
              slot.day === currentSlot.day;
            const isTodayDate = effectiveDateISO === todayISO;
            const isInProgress =
              inProgressSession?.templateId.toString() === template._id.toString();

            calendarData[effectiveDateISO].workouts.push({
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
              isLocked,
              completedOnDate: completionDates.get(template._id.toString()),
              exercisePreview: getExercisePreview(template, 3),
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
    for (const session of completedSessions) {
      if (session.completedAt) {
        const completionDateISO = formatDateISO(new Date(session.completedAt));
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
                exerciseCount: template.exercises.length,
                estimatedDurationMinutes: template.estimatedDurationMinutes,
                isCompleted: true,
                isToday: false,
                isInProgress: false,
                isLocked: false, // Completed workouts are never locked
                completedOnDate: completionDateISO,
                exercisePreview: getExercisePreview(template, 3),
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
      completedWorkouts: completedSessions.length,
      currentPhase: program.currentPhase,
      currentWeek: program.currentWeek,
      currentDay: program.currentDay,
      unlockedPhases,
      todayFocusTemplateId: scheduleOverride?.todayFocusTemplateId?.toString(),
      gppCategoryId: program.gppCategoryId, // Category for consistent color scheme
    };
  },
});
