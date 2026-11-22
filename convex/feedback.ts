import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getCurrentUser, isInternalTester, requireCurrentUser } from "./authHelpers";
import {
  evaluateFeedbackPrompts,
  PRIVATE_RATING_MIN_WORKOUTS,
  STORE_REVIEW_MIN_REASSESSMENTS,
  STORE_REVIEW_MIN_WORKOUTS,
} from "../lib/feedbackEligibility";
import {
  FEEDBACK_DETAILS_MAX,
  FEEDBACK_ERROR_CODE_MAX,
  FEEDBACK_POSTHOG_SESSION_MAX,
  FEEDBACK_RATE_LIMIT_MAX,
  FEEDBACK_RATE_LIMIT_WINDOW_MS,
  FEEDBACK_RATING_NOTE_MAX,
  FEEDBACK_TITLE_MAX,
  normalizeOptionalText,
  normalizeRequiredText,
  truncateOptionalText,
  validateStars,
} from "../lib/feedbackValidation";

// ─────────────────────────────────────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────────────────────────────────────

const feedbackPlatformValidator = v.union(
  v.literal("ios"),
  v.literal("android"),
  v.literal("web")
);

const feedbackColorSchemeValidator = v.union(
  v.literal("light"),
  v.literal("dark")
);

const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

const skillLevelValidator = v.union(
  v.literal("Novice"),
  v.literal("Moderate"),
  v.literal("Advanced")
);

const feedbackContextValidator = v.object({
  platform: feedbackPlatformValidator,
  osVersion: v.optional(v.string()),
  appVersion: v.string(),
  buildNumber: v.optional(v.string()),
  screenRoute: v.string(),
  colorScheme: v.optional(feedbackColorSchemeValidator),
  programContext: v.optional(
    v.object({
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
      skillLevel: skillLevelValidator,
    })
  ),
});

const bugSeverityValidator = v.union(
  v.literal("blocking"),
  v.literal("annoying"),
  v.literal("minor")
);

const bugSourceValidator = v.union(
  v.literal("profile"),
  v.literal("error_boundary"),
  v.literal("workout_detail"),
  v.literal("workout_execute")
);

const bugStatusValidator = v.union(
  v.literal("new"),
  v.literal("triaged"),
  v.literal("in_progress"),
  v.literal("fixed"),
  v.literal("wont_fix")
);

const featureCategoryValidator = v.union(
  v.literal("workouts_exercises"),
  v.literal("program_schedule"),
  v.literal("progress_maxes"),
  v.literal("equipment_gym_home"),
  v.literal("app_experience"),
  v.literal("other")
);

const featureStatusValidator = v.union(
  v.literal("new"),
  v.literal("under_review"),
  v.literal("planned"),
  v.literal("shipped"),
  v.literal("declined")
);

const ratingTriggerValidator = v.union(
  v.literal("post_workout_prompt"),
  v.literal("profile_manual")
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeContext(context: {
  platform: "ios" | "android" | "web";
  osVersion?: string;
  appVersion: string;
  buildNumber?: string;
  screenRoute: string;
  colorScheme?: "light" | "dark";
  programContext?: {
    phase: "GPP" | "SPP" | "SSP";
    week: number;
    day: number;
    skillLevel: "Novice" | "Moderate" | "Advanced";
  };
}) {
  return {
    platform: context.platform,
    ...(truncateOptionalText(context.osVersion, 64)
      ? { osVersion: truncateOptionalText(context.osVersion, 64) }
      : {}),
    appVersion: context.appVersion.trim().slice(0, 32) || "unknown",
    ...(truncateOptionalText(context.buildNumber, 32)
      ? { buildNumber: truncateOptionalText(context.buildNumber, 32) }
      : {}),
    screenRoute: context.screenRoute.trim().slice(0, 120) || "unknown",
    ...(context.colorScheme ? { colorScheme: context.colorScheme } : {}),
    ...(context.programContext ? { programContext: context.programContext } : {}),
  };
}

/**
 * Enforces a shared per-athlete rolling 1-hour rate limit across ratings,
 * bug reports, and feature requests.
 */
async function enforceFeedbackRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  now: number
): Promise<void> {
  const since = now - FEEDBACK_RATE_LIMIT_WINDOW_MS;

  const [recentRatings, recentBugs, recentFeatures] = await Promise.all([
    ctx.db
      .query("athlete_ratings")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId).gte("createdAt", since))
      .collect(),
    ctx.db
      .query("bug_reports")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId).gte("createdAt", since))
      .collect(),
    ctx.db
      .query("feature_requests")
      .withIndex("by_user_createdAt", (q) => q.eq("userId", userId).gte("createdAt", since))
      .collect(),
  ]);

  const totalRecent = recentRatings.length + recentBugs.length + recentFeatures.length;
  if (totalRecent >= FEEDBACK_RATE_LIMIT_MAX) {
    throw new Error("You've sent several submissions recently. Please try again in a bit.");
  }
}

async function getOrCreatePromptState(
  ctx: MutationCtx,
  userId: Id<"users">,
  now: number
) {
  const existing = await ctx.db
    .query("feedback_prompt_state")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();

  if (existing) return existing;

  const id = await ctx.db.insert("feedback_prompt_state", {
    userId,
    ratingDismissCount: 0,
    storeReviewRequestCount: 0,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error("Failed to initialize feedback prompt state");
  }
  return created;
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reports whether the signed-in caller is tagged as an internal team tester
 * via verified Clerk email against `INTERNAL_EMAILS`.
 */
export const getAccess = query({
  args: {},
  handler: async (ctx) => {
    const isInternal = await isInternalTester(ctx);
    return { isInternal };
  },
});

/**
 * Evaluates server-side eligibility for:
 * 1. The private in-app rating sheet (after 2nd completed workout).
 * 2. The strictly decoupled native App Store / Google Play review prompt
 *    (after 5th completed workout or 1st completed phase check-in).
 */
export const getPromptEligibility = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return {
        shouldShowPrivateRatingPrompt: false,
        shouldRequestStoreReview: false,
        completedWorkoutsCount: 0,
      };
    }

    const [completedSessions, reassessments, program, promptState] = await Promise.all([
      ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "completed"))
        // Eligibility only needs to know whether the highest milestone is
        // reached, so read at most that many instead of the whole history.
        .take(Math.max(PRIVATE_RATING_MIN_WORKOUTS, STORE_REVIEW_MIN_WORKOUTS)),
      ctx.db
        .query("intake_responses")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", user._id).eq("intakeType", "reassessment")
        )
        .take(STORE_REVIEW_MIN_REASSESSMENTS),
      ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first(),
      ctx.db
        .query("feedback_prompt_state")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first(),
    ]);

    const completedWorkoutsCount = completedSessions.length;
    const completedReassessmentsCount = reassessments.length;
    const reassessmentPending = Boolean(program?.reassessmentPendingForPhase);

    const decision = evaluateFeedbackPrompts({
      completedWorkoutsCount,
      completedReassessmentsCount,
      reassessmentPending,
      promptState: promptState
        ? {
            lastRatingPromptedAt: promptState.lastRatingPromptedAt,
            lastRatingSubmittedAt: promptState.lastRatingSubmittedAt,
            lastRatingDismissedAt: promptState.lastRatingDismissedAt,
            ratingDismissCount: promptState.ratingDismissCount,
            lastStoreReviewRequestedAt: promptState.lastStoreReviewRequestedAt,
            storeReviewRequestCount: promptState.storeReviewRequestCount,
          }
        : null,
      now: Date.now(),
    });

    return {
      ...decision,
      completedWorkoutsCount,
    };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Feature 1: Submit a private 1-5 star rating + optional note.
 * Never gates or triggers native App Store / Google Play review prompts.
 */
export const submitRating = mutation({
  args: {
    stars: v.number(),
    note: v.optional(v.string()),
    trigger: ratingTriggerValidator,
    context: feedbackContextValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const stars = validateStars(args.stars);
    const note = normalizeOptionalText(args.note, "Feedback note", FEEDBACK_RATING_NOTE_MAX);
    await enforceFeedbackRateLimit(ctx, user._id, now);

    const [isInternal, completedSessions, promptState] = await Promise.all([
      isInternalTester(ctx),
      ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) => q.eq("userId", user._id).eq("status", "completed"))
        .collect(),
      getOrCreatePromptState(ctx, user._id, now),
    ]);

    const sanitizedContext = sanitizeContext(args.context);
    const ratingId = await ctx.db.insert("athlete_ratings", {
      userId: user._id,
      isInternal,
      stars,
      ...(note ? { note } : {}),
      trigger: args.trigger,
      completedWorkoutsAtSubmission: completedSessions.length,
      context: sanitizedContext,
      createdAt: now,
    });

    await ctx.db.patch(promptState._id, {
      lastRatingPromptedAt:
        args.trigger === "post_workout_prompt" ? now : promptState.lastRatingPromptedAt,
      lastRatingSubmittedAt: now,
      updatedAt: now,
    });

    if (process.env.FEEDBACK_WEBHOOK_URL?.trim()) {
      await ctx.scheduler.runAfter(0, internal.feedback.notifyWebhook, {
        docId: String(ratingId),
        kind: "rating",
        isInternal,
        stars,
        platform: sanitizedContext.platform,
      });
    }

    return { ratingId };
  },
});

/**
 * Record dismissal of the auto-triggered private rating prompt (starts 45-day cooldown).
 */
export const dismissRatingPrompt = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const promptState = await getOrCreatePromptState(ctx, user._id, now);

    await ctx.db.patch(promptState._id, {
      lastRatingPromptedAt: now,
      lastRatingDismissedAt: now,
      ratingDismissCount: promptState.ratingDismissCount + 1,
      updatedAt: now,
    });

    return { ok: true };
  },
});

/**
 * Record invocation of the native App Store / Google Play review prompt
 * (starts 90-day cooldown). Strictly independent of private star ratings.
 */
export const recordStoreReviewRequested = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const promptState = await getOrCreatePromptState(ctx, user._id, now);

    await ctx.db.patch(promptState._id, {
      lastStoreReviewRequestedAt: now,
      storeReviewRequestCount: promptState.storeReviewRequestCount + 1,
      updatedAt: now,
    });

    return { ok: true };
  },
});

/**
 * Feature 2: Submit a structured bug report with zero-PII technical context.
 * Validates ownership of any attached `gppSessionId`.
 */
export const submitBugReport = mutation({
  args: {
    title: v.string(),
    details: v.string(),
    severity: bugSeverityValidator,
    source: bugSourceValidator,
    context: feedbackContextValidator,
    workoutContext: v.optional(
      v.object({
        gppSessionId: v.optional(v.id("gpp_workout_sessions")),
        templateId: v.optional(v.id("program_templates")),
        exerciseId: v.optional(v.id("exercises")),
        exerciseName: v.optional(v.string()),
      })
    ),
    errorCode: v.optional(v.string()),
    posthogSessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const title = normalizeRequiredText(args.title, "Summary", FEEDBACK_TITLE_MAX);
    const details = normalizeRequiredText(args.details, "Details", FEEDBACK_DETAILS_MAX);
    const rawErrorCode = truncateOptionalText(args.errorCode, FEEDBACK_ERROR_CODE_MAX);
    const errorCode = rawErrorCode
      ? rawErrorCode.replace(/[^A-Za-z0-9_.-]/g, "") || undefined
      : undefined;
    const posthogSessionId = truncateOptionalText(
      args.posthogSessionId,
      FEEDBACK_POSTHOG_SESSION_MAX
    );

    await enforceFeedbackRateLimit(ctx, user._id, now);

    // Validate optional workout references and enforce ownership on gppSessionId
    let verifiedWorkoutContext:
      | {
          gppSessionId?: Id<"gpp_workout_sessions">;
          templateId?: Id<"program_templates">;
          exerciseId?: Id<"exercises">;
          exerciseName?: string;
        }
      | undefined;

    if (args.workoutContext) {
      const { gppSessionId, templateId, exerciseId, exerciseName } = args.workoutContext;
      let resolvedExerciseName = truncateOptionalText(exerciseName, 120);

      if (gppSessionId) {
        const session = await ctx.db.get(gppSessionId);
        if (!session || session.userId !== user._id) {
          throw new Error("Not authorized to reference this workout session");
        }
      }

      if (templateId) {
        const template = await ctx.db.get(templateId);
        if (!template) {
          throw new Error("Referenced workout template not found");
        }
      }

      if (exerciseId) {
        const exercise = await ctx.db.get(exerciseId);
        if (!exercise) {
          throw new Error("Referenced exercise not found");
        }
        if (!resolvedExerciseName) {
          resolvedExerciseName = exercise.name.slice(0, 120);
        }
      }

      if (gppSessionId || templateId || exerciseId || resolvedExerciseName) {
        verifiedWorkoutContext = {
          ...(gppSessionId ? { gppSessionId } : {}),
          ...(templateId ? { templateId } : {}),
          ...(exerciseId ? { exerciseId } : {}),
          ...(resolvedExerciseName ? { exerciseName: resolvedExerciseName } : {}),
        };
      }
    }

    const isInternal = await isInternalTester(ctx);
    const sanitizedContext = sanitizeContext(args.context);

    const bugReportId = await ctx.db.insert("bug_reports", {
      userId: user._id,
      isInternal,
      title,
      details,
      severity: args.severity,
      source: args.source,
      context: sanitizedContext,
      ...(verifiedWorkoutContext ? { workoutContext: verifiedWorkoutContext } : {}),
      ...(errorCode ? { errorCode } : {}),
      ...(posthogSessionId ? { posthogSessionId } : {}),
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    if (process.env.FEEDBACK_WEBHOOK_URL?.trim()) {
      await ctx.scheduler.runAfter(0, internal.feedback.notifyWebhook, {
        docId: String(bugReportId),
        kind: "bug_report",
        isInternal,
        severity: args.severity,
        platform: sanitizedContext.platform,
      });
    }

    return { bugReportId };
  },
});

/**
 * Feature 3: Submit a categorized feature request.
 */
export const submitFeatureRequest = mutation({
  args: {
    category: featureCategoryValidator,
    title: v.string(),
    details: v.string(),
    context: feedbackContextValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();

    const title = normalizeRequiredText(args.title, "Title", FEEDBACK_TITLE_MAX);
    const details = normalizeRequiredText(args.details, "Details", FEEDBACK_DETAILS_MAX);

    await enforceFeedbackRateLimit(ctx, user._id, now);

    const isInternal = await isInternalTester(ctx);
    const sanitizedContext = sanitizeContext(args.context);

    const featureRequestId = await ctx.db.insert("feature_requests", {
      userId: user._id,
      isInternal,
      category: args.category,
      title,
      details,
      context: sanitizedContext,
      status: "new",
      createdAt: now,
      updatedAt: now,
    });

    if (process.env.FEEDBACK_WEBHOOK_URL?.trim()) {
      await ctx.scheduler.runAfter(0, internal.feedback.notifyWebhook, {
        docId: String(featureRequestId),
        kind: "feature_request",
        isInternal,
        category: args.category,
        platform: sanitizedContext.platform,
      });
    }

    return { featureRequestId };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL FOUNDER TRIAGE QUERIES & MUTATIONS (Convex Dashboard / CLI / MCP)
// ─────────────────────────────────────────────────────────────────────────────

export const listBugsForTriage = internalQuery({
  args: {
    status: v.optional(bugStatusValidator),
    isInternal: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    if (args.isInternal !== undefined && args.status !== undefined) {
      return await ctx.db
        .query("bug_reports")
        .withIndex("by_internal_status", (q) =>
          q.eq("isInternal", args.isInternal!).eq("status", args.status!)
        )
        .order("desc")
        .take(limit);
    }

    if (args.status !== undefined) {
      return await ctx.db
        .query("bug_reports")
        .withIndex("by_status_createdAt", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    const base = ctx.db.query("bug_reports").order("desc");
    if (args.isInternal !== undefined) {
      return await base
        .filter((q) => q.eq(q.field("isInternal"), args.isInternal!))
        .take(limit);
    }

    return await base.take(limit);
  },
});

export const listFeatureRequestsForTriage = internalQuery({
  args: {
    status: v.optional(featureStatusValidator),
    category: v.optional(featureCategoryValidator),
    isInternal: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    if (args.category !== undefined && args.status !== undefined) {
      const indexed = ctx.db
        .query("feature_requests")
        .withIndex("by_category_status", (q) =>
          q.eq("category", args.category!).eq("status", args.status!)
        )
        .order("desc");
      return args.isInternal !== undefined
        ? await indexed
            .filter((q) => q.eq(q.field("isInternal"), args.isInternal!))
            .take(limit)
        : await indexed.take(limit);
    }

    if (args.isInternal !== undefined && args.status !== undefined) {
      const indexed = ctx.db
        .query("feature_requests")
        .withIndex("by_internal_status", (q) =>
          q.eq("isInternal", args.isInternal!).eq("status", args.status!)
        )
        .order("desc");
      return args.category !== undefined
        ? await indexed
            .filter((q) => q.eq(q.field("category"), args.category!))
            .take(limit)
        : await indexed.take(limit);
    }

    if (args.status !== undefined) {
      return await ctx.db
        .query("feature_requests")
        .withIndex("by_status_createdAt", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(limit);
    }

    let queryBuilder = ctx.db.query("feature_requests").order("desc");
    if (args.category !== undefined) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("category"), args.category!));
    }
    if (args.isInternal !== undefined) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("isInternal"), args.isInternal!));
    }
    return await queryBuilder.take(limit);
  },
});

export const listRatingsForTriage = internalQuery({
  args: {
    isInternal: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);

    if (args.isInternal !== undefined) {
      return await ctx.db
        .query("athlete_ratings")
        .withIndex("by_internal_createdAt", (q) => q.eq("isInternal", args.isInternal!))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("athlete_ratings")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});

export const getFeedbackSummary = internalQuery({
  args: {
    includeInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const includeInternal = args.includeInternal ?? false;

    const [allRatings, allBugs, allFeatures] = await Promise.all([
      ctx.db.query("athlete_ratings").collect(),
      ctx.db.query("bug_reports").collect(),
      ctx.db.query("feature_requests").collect(),
    ]);

    const ratings = includeInternal ? allRatings : allRatings.filter((r) => !r.isInternal);
    const bugs = includeInternal ? allBugs : allBugs.filter((b) => !b.isInternal);
    const features = includeInternal ? allFeatures : allFeatures.filter((f) => !f.isInternal);

    const avgStars =
      ratings.length > 0
        ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length) * 100) / 100
        : null;

    const bugsByStatus: Record<string, number> = {};
    const bugsBySeverity: Record<string, number> = {};
    for (const bug of bugs) {
      bugsByStatus[bug.status] = (bugsByStatus[bug.status] ?? 0) + 1;
      bugsBySeverity[bug.severity] = (bugsBySeverity[bug.severity] ?? 0) + 1;
    }

    const featuresByStatus: Record<string, number> = {};
    const featuresByCategory: Record<string, number> = {};
    for (const feature of features) {
      featuresByStatus[feature.status] = (featuresByStatus[feature.status] ?? 0) + 1;
      featuresByCategory[feature.category] = (featuresByCategory[feature.category] ?? 0) + 1;
    }

    return {
      ratingsCount: ratings.length,
      averageStars: avgStars,
      bugsCount: bugs.length,
      bugsByStatus,
      bugsBySeverity,
      featureRequestsCount: features.length,
      featuresByStatus,
      featuresByCategory,
    };
  },
});

export const updateBugStatus = internalMutation({
  args: {
    bugReportId: v.id("bug_reports"),
    status: bugStatusValidator,
    triageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.bugReportId);
    if (!existing) {
      throw new Error("Bug report not found");
    }

    await ctx.db.patch(args.bugReportId, {
      status: args.status,
      ...(args.triageNotes !== undefined ? { triageNotes: args.triageNotes.trim() } : {}),
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const updateFeatureRequestStatus = internalMutation({
  args: {
    featureRequestId: v.id("feature_requests"),
    status: featureStatusValidator,
    triageNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.featureRequestId);
    if (!existing) {
      throw new Error("Feature request not found");
    }

    await ctx.db.patch(args.featureRequestId, {
      status: args.status,
      ...(args.triageNotes !== undefined ? { triageNotes: args.triageNotes.trim() } : {}),
      updatedAt: Date.now(),
    });

    return { ok: true };
  },
});

/**
 * Optional private Slack/Discord webhook ping for founders.
 *
 * Strictly server-validated enum/ID metadata only: ZERO Athlete PII and ZERO
 * caller-supplied free-text fields. Founders open Convex Dashboard using `docId`
 * to read full details. Cleanly no-ops when `FEEDBACK_WEBHOOK_URL` is unset so
 * CI/E2E (`wander-fit-e2e`) never fires external alerts.
 */
export const notifyWebhook = internalAction({
  args: {
    docId: v.string(),
    kind: v.union(
      v.literal("rating"),
      v.literal("bug_report"),
      v.literal("feature_request")
    ),
    isInternal: v.boolean(),
    stars: v.optional(v.number()),
    severity: v.optional(bugSeverityValidator),
    category: v.optional(featureCategoryValidator),
    platform: feedbackPlatformValidator,
  },
  handler: async (_ctx, args) => {
    const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL?.trim();
    if (!webhookUrl) {
      return { sent: false, reason: "unconfigured" as const };
    }

    const tag = args.isInternal ? "[INTERNAL]" : "[ATHLETE]";
    const detail =
      args.kind === "rating"
        ? `${args.stars ?? "?"}/5 stars`
        : args.kind === "bug_report"
          ? `severity=${args.severity ?? "unknown"}`
          : `category=${args.category ?? "unknown"}`;

    const summaryLine = `${tag} New ${args.kind.replace("_", " ")} (${detail}) · ${args.platform} · doc=${args.docId}`;

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Compatible with both Slack (`text`) and Discord (`content`) webhooks
        body: JSON.stringify({
          text: summaryLine,
          content: summaryLine,
        }),
      });
      return { sent: response.ok, status: response.status };
    } catch (error) {
      console.error("[feedback.notifyWebhook] Failed to send notification:", error);
      return { sent: false, reason: "network_error" as const };
    }
  },
});
