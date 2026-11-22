import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { calculateWeeksPerPhase } from "./weekMapping";
import { mainTemplateIndices } from "../lib/executionOrder";

// Internal only. The persona CLI calls these on wander-fit-e2e. Never from the app.

const stateValidator = v.union(
  v.literal("new"),
  v.literal("onboarded"),
  v.literal("phase-end"),
  // onboarded, plus one completed GPP W1D1 session today and two earlier
  // weeks fully on plan, for the History flow
  v.literal("with-history"),
  // Week 3 of a 5-week GPP block with weeks 1 and 2 done. In a 5-week phase
  // user weeks 2 and 3 both run the week-2 templates, so Today must offer
  // week 2's first workout again, not show it done.
  v.literal("repeated-week"),
);

const TRAINING_DAYS = [0, 1, 2, 3, 4, 5, 6];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Noon UTC on each day of the two Monday-to-Sunday weeks (UTC) before `now`'s week */
function twoWeeksOnPlanBefore(now: number): number[] {
  const today = Math.floor(now / MS_PER_DAY);
  // 1970-01-01 was a Thursday, so (day + 3) % 7 is days since Monday
  const thisMonday = today - ((today + 3) % 7);
  return Array.from({ length: 14 }, (_, i) => (thisMonday - 14 + i) * MS_PER_DAY + MS_PER_DAY / 2);
}

// The rows intake and commitment write for a user.
async function clearProgramRows(ctx: MutationCtx, userId: Id<"users">) {
  const sessions = await ctx.db
    .query("gpp_workout_sessions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const session of sessions) {
    await ctx.db.delete(session._id);
  }

  const programs = await ctx.db
    .query("user_programs")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const program of programs) {
    await ctx.db.delete(program._id);
  }

  const intakes = await ctx.db
    .query("intake_responses")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const intake of intakes) {
    await ctx.db.delete(intake._id);
  }

  const ratings = await ctx.db
    .query("athlete_ratings")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const rating of ratings) {
    await ctx.db.delete(rating._id);
  }

  const bugReports = await ctx.db
    .query("bug_reports")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const bug of bugReports) {
    await ctx.db.delete(bug._id);
  }

  const featureRequests = await ctx.db
    .query("feature_requests")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const request of featureRequests) {
    await ctx.db.delete(request._id);
  }

  const promptStates = await ctx.db
    .query("feedback_prompt_state")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const state of promptStates) {
    await ctx.db.delete(state._id);
  }
}

export const provision = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    state: stateValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const userId = existing
      ? existing._id
      : await ctx.db.insert("users", {
          email: args.email,
          name: args.name,
          clerkId: args.clerkId,
          role: "client",
          createdAt: now,
        });

    if (existing) {
      await ctx.db.patch(userId, { email: args.email, name: args.name });
    }

    // Every state starts from the user row alone. new stops there.
    await clearProgramRows(ctx, userId);

    if (args.state === "new") {
      await ctx.db.patch(userId, {
        intakeCompletedAt: undefined,
        onboardingCompletedAt: undefined,
        onboardingProgress: undefined,
        onboardingSkipped: undefined,
      });
      return { email: args.email, state: args.state };
    }

    const sport = await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", "Basketball"))
      .first();
    if (!sport) {
      throw new Error("Basketball sport is missing. Run seed:seedAll on wander-fit-e2e first.");
    }

    const repeatedWeek = args.state === "repeated-week";
    const totalProgramWeeks = repeatedWeek ? 15 : 12;
    const weeksPerPhase = calculateWeeksPerPhase(totalProgramWeeks);
    const preferredDays = TRAINING_DAYS.length;
    const currentWeek = args.state === "phase-end" ? weeksPerPhase : repeatedWeek ? 3 : 1;
    const currentDay = args.state === "phase-end" ? preferredDays : 1;

    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId,
      sportId: sport._id,
      yearsOfExperience: 0.5,
      preferredTrainingDaysPerWeek: preferredDays,
      selectedTrainingDays: TRAINING_DAYS,
      weeksUntilSeason: totalProgramWeeks,
      assignedGppCategoryId: sport.gppCategoryId,
      assignedSkillLevel: "Novice",
      ageGroup: "18-35",
      intakeType: "initial",
      completedAt: now,
    });

    const userProgramId = await ctx.db.insert("user_programs", {
      userId,
      intakeResponseId,
      gppCategoryId: sport.gppCategoryId,
      skillLevel: "Novice",
      ageGroup: "18-35",
      totalProgramWeeks,
      weeksPerPhase,
      currentPhase: "GPP",
      currentWeek,
      currentDay,
      // phase-end: the GPP block ran its full length with nothing logged,
      // and the check-in is pending, as advanceToNextDay leaves it
      phaseStartDate:
        args.state === "phase-end"
          ? now - weeksPerPhase * 7 * MS_PER_DAY
          : repeatedWeek
            ? now - 14 * MS_PER_DAY
            : now,
      ...(args.state === "phase-end" ? { reassessmentPendingForPhase: "GPP" as const } : {}),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(userId, {
      intakeCompletedAt: now,
      onboardingCompletedAt: now,
      onboardingSkipped: true,
    });

    if (args.state === "with-history") {
      const template = await ctx.db
        .query("program_templates")
        .withIndex("by_assignment", (q) =>
          q.eq("gppCategoryId", sport.gppCategoryId).eq("phase", "GPP").eq("skillLevel", "Novice").eq("week", 1).eq("day", 1)
        )
        .first();
      if (!template) {
        throw new Error("No GPP W1D1 Novice template for Basketball. Run seed:seedAll on wander-fit-e2e first.");
      }
      const completedSession = (completedAt: number) => {
        const startedAt = completedAt - 45 * 60 * 1000;
        return ctx.db.insert("gpp_workout_sessions", {
          userId,
          templateId: template._id,
          userProgramId,
          startedAt,
          completedAt,
          totalDurationSeconds: 45 * 60,
          status: "completed",
          exercises: template.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            completed: true,
            skipped: false,
            sets: Array.from({ length: exercise.sets }, () => ({ completed: true, skipped: false })),
          })),
          templateSnapshot: { name: template.name, phase: "GPP", week: 1, day: 1, workoutDate: startedAt },
        });
      };
      // Weeks on plan (lib/weeksOnPlan): every day of the two Monday-to-Sunday
      // weeks before this one, at noon UTC, so History shows
      // "15 workouts done · 2 weeks on plan" for the 7-day persona
      for (const completedAt of twoWeeksOnPlanBefore(now)) {
        await completedSession(completedAt);
      }
      await completedSession(now);
    }

    if (repeatedWeek) {
      // Every workout of template weeks 1 and 2, done once each, a day apart
      const templates = await ctx.db
        .query("program_templates")
        .withIndex("by_assignment", (q) =>
          q.eq("gppCategoryId", sport.gppCategoryId).eq("phase", "GPP").eq("skillLevel", "Novice")
        )
        .collect();
      const done = templates
        .filter((t) => t.week <= 2)
        .sort((a, b) => a.week - b.week || a.day - b.day);
      if (done.length === 0) {
        throw new Error("No GPP Novice templates for Basketball. Run seed:seedAll on wander-fit-e2e first.");
      }
      for (const [i, template] of done.entries()) {
        const completedAt = now - (14 - i) * MS_PER_DAY;
        await ctx.db.insert("gpp_workout_sessions", {
          userId,
          templateId: template._id,
          userProgramId,
          startedAt: completedAt - 45 * 60 * 1000,
          completedAt,
          totalDurationSeconds: 45 * 60,
          status: "completed",
          exercises: template.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            completed: true,
            skipped: false,
            sets: Array.from({ length: exercise.sets }, () => ({ completed: true, skipped: false })),
          })),
          templateSnapshot: {
            name: template.name, phase: "GPP", week: template.week, day: template.day, workoutDate: completedAt,
          },
        });
      }
    }

    return { email: args.email, state: args.state };
  },
});

export const inspect = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return { found: false as const, email: args.email };

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return {
      found: true as const,
      email: user.email,
      name: user.name,
      intakeCompleted: user.intakeCompletedAt !== undefined,
      firstLaunchRecorded: user.firstLaunchAt !== undefined,
      onboardingCompleted: user.onboardingCompletedAt !== undefined,
      hasProgram: program !== null,
      phase: program?.currentPhase ?? null,
      week: program?.currentWeek ?? null,
      day: program?.currentDay ?? null,
      // Oldest first, so a flow's own session is the last one.
      sessions: await Promise.all(sessions.map(async (session) => {
        // Saved exercises line up by position with the template's, warmup
        // included. A main exercise is logged when its saved entry is
        // completed, not skipped, and logs every prescribed set.
        const template = await ctx.db.get(session.templateId);
        const mainIndices = template ? mainTemplateIndices(template.exercises) : null;
        const notLogged = (mainIndices ?? []).filter((index) => {
          const saved = session.exercises[index];
          const logged = saved?.sets.filter((set) => set.completed && !set.skipped).length ?? 0;
          return !saved || !saved.completed || saved.skipped || logged < template!.exercises[index].sets;
        });
        return {
          status: session.status,
          exerciseIds: session.exercises.map((exercise) => exercise.exerciseId),
          mainExercises: mainIndices?.length ?? null,
          mainExercisesNotLogged: mainIndices ? notLogged.length : null,
        };
      })),
    };
  },
});

export const remove = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    if (!user) return { deleted: false as const, email: args.email };

    await clearProgramRows(ctx, user._id);
    await ctx.db.delete(user._id);
    return { deleted: true as const, email: args.email };
  },
});
