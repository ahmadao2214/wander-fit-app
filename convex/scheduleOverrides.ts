import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Schedule Overrides - User Schedule Customization
 * 
 * Enables athletes to:
 * 1. Set a different workout as "today's focus"
 * 2. Swap/reorder workouts within the same phase
 * 3. Reset to default schedule
 * 
 * DESIGN PRINCIPLES:
 * - Swaps are same-phase only (no cross-phase swapping)
 * - Today's focus is a temporary override (can be cleared)
 * - Slot overrides are persistent until reset
 */

// Shared validators
const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current user's schedule override record
 */
export const getScheduleOverride = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    return await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();
  },
});

/**
 * Get workouts for a specific week with overrides applied
 * Returns the actual schedule the user will see
 */
export const getWeekSchedule = query({
  args: {
    phase: phaseValidator,
    week: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    // Get default templates for this week
    const defaultTemplates = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", program.gppCategoryId)
          .eq("phase", args.phase)
          .eq("skillLevel", program.skillLevel)
          .eq("week", args.week)
      )
      .collect();

    // Get user's override record
    const overrideRecord = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    if (!overrideRecord || overrideRecord.slotOverrides.length === 0) {
      // No overrides, return default sorted by day
      return defaultTemplates.sort((a, b) => a.day - b.day);
    }

    // Apply overrides
    const result = await Promise.all(
      defaultTemplates.map(async (template) => {
        // Check if there's an override for this slot
        const override = overrideRecord.slotOverrides.find(
          (o) =>
            o.phase === args.phase &&
            o.week === args.week &&
            o.day === template.day
        );

        if (override) {
          // Fetch the overridden template
          const overriddenTemplate = await ctx.db.get(override.templateId);
          if (overriddenTemplate) {
            // Return the overridden template but keep the slot's day position
            return {
              ...overriddenTemplate,
              _originalDay: template.day, // Track original slot
              _isOverridden: true,
            };
          }
        }

        return {
          ...template,
          _isOverridden: false,
        };
      })
    );

    return result.sort((a, b) => a.day - b.day);
  },
});

/**
 * Get today's workout (with focus override applied if set)
 * Returns the workout the user should focus on today
 * 
 * PRIORITY ORDER:
 * 1. In-progress session (if user has an active workout, that IS today's focus)
 * 2. Explicit focus override (via setTodayFocus)
 * 3. First incomplete workout in current week
 * 4. Scheduled workout for current day
 */
export const getTodayWorkout = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.intakeCompletedAt) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    // PRIORITY 1: Check for in-progress session first
    // If user is in the middle of a workout, that IS today's focus
    const inProgressSession = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .first();

    if (inProgressSession) {
      const inProgressTemplate = await ctx.db.get(inProgressSession.templateId);
      if (inProgressTemplate) {
        const exerciseIds = inProgressTemplate.exercises.map((e: any) => e.exerciseId);
        const exercises = await Promise.all(
          exerciseIds.map((id: any) => ctx.db.get(id))
        );
        const exerciseMap = new Map(
          exercises.filter(Boolean).map((ex) => [ex!._id, ex!])
        );
        return {
          ...inProgressTemplate,
          exercises: inProgressTemplate.exercises.map((prescription: any) => ({
            ...prescription,
            exercise: exerciseMap.get(prescription.exerciseId),
          })),
          _isInProgress: true,
          _isFocusOverride: false,
          _isSlotOverride: false,
          _isFirstIncomplete: false,
        };
      }
    }

    // Check for today's focus override
    const overrideRecord = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get all completed template IDs for this user
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();
    const completedTemplateIds = new Set(completedSessions.map((s) => s.templateId));

    // Helper to get template with exercise details
    const getTemplateWithExercises = async (template: any, flags: { isFocusOverride?: boolean; isSlotOverride?: boolean; isFirstIncomplete?: boolean }) => {
      const exerciseIds = template.exercises.map((e: any) => e.exerciseId);
      const exercises = await Promise.all(
        exerciseIds.map((id: any) => ctx.db.get(id))
      );
      const exerciseMap = new Map(
        exercises.filter(Boolean).map((ex) => [ex!._id, ex!])
      );
      return {
        ...template,
        exercises: template.exercises.map((prescription: any) => ({
          ...prescription,
          exercise: exerciseMap.get(prescription.exerciseId),
        })),
        _isFocusOverride: flags.isFocusOverride ?? false,
        _isSlotOverride: flags.isSlotOverride ?? false,
        _isFirstIncomplete: flags.isFirstIncomplete ?? false,
      };
    };

    // If there's an explicit focus override, check if it's completed
    if (overrideRecord?.todayFocusTemplateId) {
      const focusTemplate = await ctx.db.get(overrideRecord.todayFocusTemplateId);
      if (focusTemplate && !completedTemplateIds.has(focusTemplate._id)) {
        return getTemplateWithExercises(focusTemplate, { isFocusOverride: true });
      }
      // Focus override is completed, fall through to find first incomplete
    }

    // Get all workouts for current week (considering slot overrides)
    const weekWorkouts = await ctx.db
      .query("program_templates")
      .withIndex("by_assignment", (q) =>
        q
          .eq("gppCategoryId", program.gppCategoryId)
          .eq("phase", program.currentPhase)
          .eq("skillLevel", program.skillLevel)
          .eq("week", program.currentWeek)
      )
      .collect();

    // Apply slot overrides to get effective workout order
    const getEffectiveTemplateForSlot = async (day: number) => {
      const slotOverride = overrideRecord?.slotOverrides.find(
        (o) =>
          o.phase === program.currentPhase &&
          o.week === program.currentWeek &&
          o.day === day
      );
      
      if (slotOverride) {
        return await ctx.db.get(slotOverride.templateId);
      }
      
      return weekWorkouts.find((w) => w.day === day) ?? null;
    };

    // Sort by day and find first incomplete
    const sortedDays = [...new Set(weekWorkouts.map((w) => w.day))].sort((a, b) => a - b);
    
    for (const day of sortedDays) {
      const template = await getEffectiveTemplateForSlot(day);
      if (template && !completedTemplateIds.has(template._id)) {
        const isScheduledSlot = day === program.currentDay;
        return getTemplateWithExercises(template, { 
          isSlotOverride: !!overrideRecord?.slotOverrides.find(
            (o) => o.phase === program.currentPhase && o.week === program.currentWeek && o.day === day
          ),
          isFirstIncomplete: !isScheduledSlot, // Mark if this is different from scheduled slot
        });
      }
    }

    // All workouts in current week are completed, return the scheduled slot
    const scheduledTemplate = await getEffectiveTemplateForSlot(program.currentDay);
    if (scheduledTemplate) {
      return getTemplateWithExercises(scheduledTemplate, { isSlotOverride: false });
    }

    return null;
  },
});

/**
 * Get phase overview with user's schedule overrides applied
 * 
 * This returns the workouts for a phase, but with the user's
 * custom slot assignments (from drag-and-drop reordering) applied.
 * 
 * The key insight: slot overrides store which template is assigned to each slot.
 * When displaying, we need to show the overridden template in each slot's position.
 */
export const getPhaseOverviewWithOverrides = query({
  args: {
    phase: phaseValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    // Get all templates for this phase
    const allTemplates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", program.gppCategoryId).eq("phase", args.phase)
      )
      .collect();

    // Filter by skill level
    const templates = allTemplates.filter((t) => t.skillLevel === program.skillLevel);

    // Get user's override record
    const overrideRecord = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get phase-specific slot overrides
    const phaseOverrides = overrideRecord?.slotOverrides.filter(
      (o) => o.phase === args.phase
    ) || [];

    // Create a map of slot -> overridden templateId
    const slotOverrideMap = new Map<string, string>();
    phaseOverrides.forEach((o) => {
      slotOverrideMap.set(`${o.week}-${o.day}`, o.templateId);
    });

    // Create a map of all templates by ID for lookup
    const templateMap = new Map(templates.map((t) => [t._id, t]));

    // Organize templates by week, applying overrides
    const byWeek = new Map<number, typeof templates>();

    templates.forEach((t) => {
      const slotKey = `${t.week}-${t.day}`;
      const overriddenTemplateId = slotOverrideMap.get(slotKey);

      // If this slot has an override, use the overridden template
      // but keep the original slot's week/day for display
      let workoutToShow = t;
      if (overriddenTemplateId) {
        const overriddenTemplate = templateMap.get(overriddenTemplateId as any);
        if (overriddenTemplate) {
          // Create a "virtual" template with the overridden workout's content
          // but displayed in this slot's position
          workoutToShow = {
            ...overriddenTemplate,
            // Keep the slot's week/day for UI positioning
            week: t.week,
            day: t.day,
            // Mark as overridden
            _isOverridden: true,
          } as typeof t;
        }
      }

      const week = byWeek.get(t.week) || [];
      week.push(workoutToShow);
      byWeek.set(t.week, week);
    });

    return Array.from(byWeek.entries())
      .sort(([a], [b]) => a - b)
      .map(([week, workouts]) => ({
        week,
        workouts: workouts.sort((a, b) => a.day - b.day),
      }));
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set today's workout focus
 * Temporarily overrides what workout to show/do today
 */
export const setTodayFocus = mutation({
  args: {
    templateId: v.id("program_templates"),
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

    // Verify template exists and belongs to user's category
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.gppCategoryId !== program.gppCategoryId) {
      throw new Error("Template does not belong to your program category");
    }

    const now = Date.now();

    // Get or create override record
    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    if (existingOverride) {
      await ctx.db.patch(existingOverride._id, {
        todayFocusTemplateId: args.templateId,
        todayFocusSetAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("user_schedule_overrides", {
        userId: user._id,
        userProgramId: program._id,
        todayFocusTemplateId: args.templateId,
        todayFocusSetAt: now,
        slotOverrides: [],
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, templateId: args.templateId };
  },
});

/**
 * Clear today's focus (revert to default/scheduled workout)
 */
export const clearTodayFocus = mutation({
  args: {},
  handler: async (ctx) => {
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

    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    if (existingOverride) {
      await ctx.db.patch(existingOverride._id, {
        todayFocusTemplateId: undefined,
        todayFocusSetAt: undefined,
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Swap two workout slots (same phase only)
 * When you swap A and B, A goes to B's slot and B goes to A's slot
 */
export const swapWorkouts = mutation({
  args: {
    slotA: v.object({
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
    }),
    slotB: v.object({
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Enforce same-phase only
    if (args.slotA.phase !== args.slotB.phase) {
      throw new Error("Swaps must be within the same phase");
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

    // Get current override record
    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Helper to get the current template for a slot (considering existing overrides)
    const getTemplateForSlot = async (slot: { phase: string; week: number; day: number }) => {
      // Check if there's already an override for this slot
      if (existingOverride) {
        const existingSlotOverride = existingOverride.slotOverrides.find(
          (o) => o.phase === slot.phase && o.week === slot.week && o.day === slot.day
        );
        if (existingSlotOverride) {
          return await ctx.db.get(existingSlotOverride.templateId);
        }
      }

      // Otherwise get the default template
      return await ctx.db
        .query("program_templates")
        .withIndex("by_assignment", (q) =>
          q
            .eq("gppCategoryId", program.gppCategoryId)
            .eq("phase", slot.phase as "GPP" | "SPP" | "SSP")
            .eq("skillLevel", program.skillLevel)
            .eq("week", slot.week)
            .eq("day", slot.day)
        )
        .first();
    };

    // Get templates currently in each slot
    const templateA = await getTemplateForSlot(args.slotA);
    const templateB = await getTemplateForSlot(args.slotB);

    if (!templateA || !templateB) {
      throw new Error("One or both workout slots are empty (rest days)");
    }

    const now = Date.now();

    // Build new slot overrides
    let newSlotOverrides = existingOverride?.slotOverrides || [];

    // Remove any existing overrides for these slots
    newSlotOverrides = newSlotOverrides.filter(
      (o) =>
        !(o.phase === args.slotA.phase && o.week === args.slotA.week && o.day === args.slotA.day) &&
        !(o.phase === args.slotB.phase && o.week === args.slotB.week && o.day === args.slotB.day)
    );

    // Add new overrides: A's slot gets B's template, B's slot gets A's template
    newSlotOverrides.push({
      phase: args.slotA.phase,
      week: args.slotA.week,
      day: args.slotA.day,
      templateId: templateB._id,
    });

    newSlotOverrides.push({
      phase: args.slotB.phase,
      week: args.slotB.week,
      day: args.slotB.day,
      templateId: templateA._id,
    });

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

    return { success: true };
  },
});

/**
 * Reset all slot overrides for a phase to default
 */
export const resetPhaseToDefault = mutation({
  args: {
    phase: phaseValidator,
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

    const existingOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    if (!existingOverride) {
      return { success: true, message: "No overrides to reset" };
    }

    // Remove all overrides for this phase
    const newSlotOverrides = existingOverride.slotOverrides.filter(
      (o) => o.phase !== args.phase
    );

    await ctx.db.patch(existingOverride._id, {
      slotOverrides: newSlotOverrides,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});


