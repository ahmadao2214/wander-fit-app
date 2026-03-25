import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import {
  generateTemplate,
  PHASES,
  SKILL_LEVELS,
  WEEKS,
  DAYS,
} from "../generateTemplates";
import type { GppCategoryId } from "../generateTemplates";

/**
 * Migration: Replace old seed templates with generateAllTemplates output.
 *
 * Old templates have:
 * - Day numbers in names (e.g., "Lower Body Foundation – Day 1")
 * - Warmup exercises with `notes: "Warmup"` instead of `section: "warmup"` + `warmupPhase`
 *
 * Run per category to stay within Convex mutation time limits:
 *   bunx convex run migrations/migrateTemplates:migrateTemplates '{"categoryId": 1}'
 *   bunx convex run migrations/migrateTemplates:migrateTemplates '{"categoryId": 2}'
 *   bunx convex run migrations/migrateTemplates:migrateTemplates '{"categoryId": 3}'
 *   bunx convex run migrations/migrateTemplates:migrateTemplates '{"categoryId": 4}'
 *
 * Then clean up stale references:
 *   bunx convex run migrations/migrateTemplates:cleanupStaleOverrides
 */

export const migrateTemplates = internalMutation({
  args: {
    categoryId: v.number(),
  },
  handler: async (ctx, args) => {
    const categoryId = args.categoryId as GppCategoryId;
    if (![1, 2, 3, 4].includes(categoryId)) {
      throw new Error("Invalid category ID. Must be 1, 2, 3, or 4.");
    }

    const results = {
      oldTemplatesDeleted: 0,
      oldWithMissingSections: 0,
      newTemplatesCreated: 0,
      errors: [] as string[],
    };

    // Build exercise slug → ID map
    const allExercises = await ctx.db.query("exercises").collect();
    const exerciseMap = new Map(allExercises.map((e) => [e.slug, e._id]));

    // Query all existing templates for this category across all phases
    for (const phase of PHASES) {
      const existingTemplates = await ctx.db
        .query("program_templates")
        .withIndex("by_category_phase", (q) =>
          q.eq("gppCategoryId", categoryId).eq("phase", phase)
        )
        .collect();

      // Count old templates (exercises missing section field)
      for (const template of existingTemplates) {
        const hasMissingSection = template.exercises.some(
          (e) => e.section === undefined
        );
        if (hasMissingSection) {
          results.oldWithMissingSections++;
        }
      }

      // Delete all existing templates for this category+phase
      for (const template of existingTemplates) {
        await ctx.db.delete(template._id);
        results.oldTemplatesDeleted++;
      }
    }

    // Regenerate all templates for this category
    for (const phase of PHASES) {
      for (const skillLevel of SKILL_LEVELS) {
        for (const week of WEEKS) {
          for (const day of DAYS) {
            try {
              const template = generateTemplate(
                categoryId,
                phase,
                skillLevel,
                week,
                day
              );

              // Resolve exercise slugs to IDs
              const exercisesWithIds = template.exercises.map((ex) => {
                const exerciseId = exerciseMap.get(ex.exerciseSlug);
                if (!exerciseId) {
                  throw new Error(`Exercise not found: ${ex.exerciseSlug}`);
                }
                return {
                  exerciseId,
                  sets: ex.sets,
                  reps: ex.reps,
                  tempo: ex.tempo,
                  restSeconds: ex.restSeconds,
                  notes: ex.notes,
                  orderIndex: ex.orderIndex,
                  superset: ex.superset,
                  section: ex.section,
                  warmupPhase: ex.warmupPhase,
                };
              });

              await ctx.db.insert("program_templates", {
                gppCategoryId: template.gppCategoryId,
                phase: template.phase,
                skillLevel: template.skillLevel,
                week: template.week,
                day: template.day,
                name: template.name,
                description: template.description,
                estimatedDurationMinutes: template.estimatedDurationMinutes,
                exercises: exercisesWithIds,
              });

              results.newTemplatesCreated++;
            } catch (error) {
              results.errors.push(
                `Category ${categoryId}, ${phase}, ${skillLevel}, Week ${week}, Day ${day}: ${error}`
              );
            }
          }
        }
      }
    }

    return results;
  },
});

/**
 * Re-link completed workout sessions to new template IDs after migration.
 *
 * The migration deleted old templates and created new ones with new IDs.
 * Completed sessions still reference old (deleted) template IDs, which causes
 * getTodayWorkout to think no workouts are completed (showing day 1 again).
 *
 * This function matches sessions to new templates using the templateSnapshot
 * (phase/week/day) + the user's program (category/skillLevel).
 *
 * Run after migrateTemplates:
 *   bunx convex run migrations/migrateTemplates:relinkSessions
 */
export const relinkSessions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      sessionsScanned: 0,
      sessionsRelinked: 0,
      sessionsAlreadyValid: 0,
      sessionsFailed: 0,
      errors: [] as string[],
    };

    // Get all workout sessions
    const allSessions = await ctx.db
      .query("gpp_workout_sessions")
      .collect();
    results.sessionsScanned = allSessions.length;

    for (const session of allSessions) {
      // Check if current templateId still exists
      const existingTemplate = await ctx.db.get(session.templateId);
      if (existingTemplate) {
        results.sessionsAlreadyValid++;
        continue;
      }

      // Template was deleted — try to find the new one using snapshot + program
      const snapshot = session.templateSnapshot;
      if (!snapshot) {
        results.sessionsFailed++;
        results.errors.push(
          `Session ${session._id}: no templateSnapshot, cannot relink`
        );
        continue;
      }

      // Get the user's program for category and skillLevel
      const program = await ctx.db.get(session.userProgramId);
      if (!program) {
        results.sessionsFailed++;
        results.errors.push(
          `Session ${session._id}: program ${session.userProgramId} not found`
        );
        continue;
      }

      // Look up the new template by assignment coordinates
      const newTemplate = await ctx.db
        .query("program_templates")
        .withIndex("by_assignment", (q) =>
          q
            .eq("gppCategoryId", program.gppCategoryId)
            .eq("phase", snapshot.phase)
            .eq("skillLevel", program.skillLevel)
            .eq("week", snapshot.week)
            .eq("day", snapshot.day)
        )
        .first();

      if (!newTemplate) {
        results.sessionsFailed++;
        results.errors.push(
          `Session ${session._id}: no matching template for cat=${program.gppCategoryId} phase=${snapshot.phase} skill=${program.skillLevel} w=${snapshot.week} d=${snapshot.day}`
        );
        continue;
      }

      // Update the session's templateId to the new template
      await ctx.db.patch(session._id, {
        templateId: newTemplate._id,
      });
      results.sessionsRelinked++;
    }

    return results;
  },
});

/**
 * Clean up stale override references after template migration.
 *
 * Run after all migrateTemplates calls:
 *   bunx convex run migrations/migrateTemplates:cleanupStaleOverrides
 */
export const cleanupStaleOverrides = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      overridesScanned: 0,
      todayFocusCleared: 0,
      slotOverridesRemoved: 0,
    };

    const allOverrides = await ctx.db
      .query("user_schedule_overrides")
      .collect();
    results.overridesScanned = allOverrides.length;

    for (const override of allOverrides) {
      let needsUpdate = false;
      const patch: Record<string, unknown> = {};

      // Check todayFocusTemplateId
      if (override.todayFocusTemplateId) {
        const template = await ctx.db.get(override.todayFocusTemplateId);
        if (!template) {
          patch.todayFocusTemplateId = undefined;
          patch.todayFocusSetAt = undefined;
          results.todayFocusCleared++;
          needsUpdate = true;
        }
      }

      // Filter slotOverrides to remove entries pointing to deleted templates
      if (override.slotOverrides && override.slotOverrides.length > 0) {
        const validSlotOverrides = [];
        for (const slot of override.slotOverrides) {
          const template = await ctx.db.get(slot.templateId);
          if (template) {
            validSlotOverrides.push(slot);
          } else {
            results.slotOverridesRemoved++;
            needsUpdate = true;
          }
        }
        if (needsUpdate) {
          patch.slotOverrides = validSlotOverrides;
        }
      }

      if (needsUpdate) {
        patch.updatedAt = Date.now();
        await ctx.db.patch(override._id, patch);
      }
    }

    return results;
  },
});
