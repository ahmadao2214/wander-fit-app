import { internalMutation, internalQuery, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { calculateWeeksPerPhase } from "./weekMapping";

// Internal only. The persona CLI calls these on wander-fit-e2e. Never from the app.

const stateValidator = v.union(
  v.literal("new"),
  v.literal("needs-intake"),
  v.literal("onboarded"),
  v.literal("phase-end"),
);

const TRAINING_DAYS = [0, 1, 2, 3, 4, 5, 6];

// The rows intake and commitment write for a user.
async function clearProgramRows(ctx: MutationCtx, userId: Id<"users">) {
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

    // Every state starts from the user row alone. needs-intake stops there.
    await clearProgramRows(ctx, userId);

    if (args.state === "new" || args.state === "needs-intake") {
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

    const totalProgramWeeks = 12;
    const weeksPerPhase = calculateWeeksPerPhase(totalProgramWeeks);
    const preferredDays = TRAINING_DAYS.length;
    const currentWeek = args.state === "phase-end" ? weeksPerPhase : 1;
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

    await ctx.db.insert("user_programs", {
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
      phaseStartDate: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(userId, {
      intakeCompletedAt: now,
      onboardingCompletedAt: now,
      onboardingSkipped: true,
    });

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

    return {
      found: true as const,
      email: user.email,
      name: user.name,
      intakeCompleted: user.intakeCompletedAt !== undefined,
      onboardingCompleted: user.onboardingCompletedAt !== undefined,
      hasProgram: program !== null,
      phase: program?.currentPhase ?? null,
      week: program?.currentWeek ?? null,
      day: program?.currentDay ?? null,
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
