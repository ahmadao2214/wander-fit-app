import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

const baseContext = {
  platform: "ios" as const,
  osVersion: "18.2",
  appVersion: "1.0.0",
  buildNumber: "23",
  screenRoute: "/(athlete)/profile",
  colorScheme: "dark" as const,
};

async function setup() {
  const t = convexTest(schema, modules);
  const seeded = await t.run(async (ctx) => {
    const now = Date.now();
    const athleteId = await ctx.db.insert("users", {
      email: "athlete@example.com",
      name: "Pilot Athlete",
      clerkId: "clerk_athlete",
      createdAt: now,
    });
    const otherAthleteId = await ctx.db.insert("users", {
      email: "other@example.com",
      name: "Other Athlete",
      clerkId: "clerk_other",
      createdAt: now,
    });
    const founderId = await ctx.db.insert("users", {
      email: "azhar@wanderfit.app",
      name: "Azhar",
      clerkId: "clerk_founder",
      createdAt: now,
    });
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const exerciseId = await ctx.db.insert("exercises", {
      name: "Goblet Squat",
      slug: "goblet_squat",
      tags: ["lower_body", "squat"],
    });
    const templateId = await ctx.db.insert("program_templates", {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Novice",
      week: 1,
      day: 1,
      name: "Lower Body Foundation",
      estimatedDurationMinutes: 40,
      exercises: [
        {
          exerciseId,
          sets: 3,
          reps: "10",
          restSeconds: 60,
          orderIndex: 0,
        },
      ],
    });
    const intakeId = await ctx.db.insert("intake_responses", {
      userId: athleteId,
      sportId,
      yearsOfExperience: 1,
      preferredTrainingDaysPerWeek: 3,
      assignedGppCategoryId: 2,
      assignedSkillLevel: "Novice",
      intakeType: "initial",
      completedAt: now,
    });
    const programId = await ctx.db.insert("user_programs", {
      userId: athleteId,
      intakeResponseId: intakeId,
      gppCategoryId: 2,
      skillLevel: "Novice",
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      createdAt: now,
      updatedAt: now,
    });
    const athleteSessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId: athleteId,
      templateId,
      userProgramId: programId,
      startedAt: now - 1000,
      status: "in_progress",
      exercises: [],
    });
    const otherSessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId: otherAthleteId,
      templateId,
      userProgramId: programId,
      startedAt: now - 1000,
      status: "in_progress",
      exercises: [],
    });

    return {
      athleteId,
      otherAthleteId,
      founderId,
      sportId,
      exerciseId,
      templateId,
      programId,
      athleteSessionId,
      otherSessionId,
    };
  });

  return {
    t,
    ...seeded,
    asAthlete: t.withIdentity({
      subject: "clerk_athlete",
      email: "athlete@example.com",
      emailVerified: true,
    }),
    asFounder: t.withIdentity({
      subject: "clerk_founder",
      email: "Azhar@WanderFit.app",
      emailVerified: true,
    }),
    asUnverifiedFounder: t.withIdentity({
      subject: "clerk_founder",
      email: "azhar@wanderfit.app",
      emailVerified: false,
    }),
  };
}

async function addCompletedWorkouts(
  t: ReturnType<typeof convexTest>,
  ids: {
    athleteId: Id<"users">;
    templateId: Id<"program_templates">;
    programId: Id<"user_programs">;
  },
  count: number
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      await ctx.db.insert("gpp_workout_sessions", {
        userId: ids.athleteId,
        templateId: ids.templateId,
        userProgramId: ids.programId,
        startedAt: now - (i + 1) * 3_600_000,
        completedAt: now - (i + 1) * 3_600_000 + 1_800_000,
        status: "completed",
        exercises: [],
      });
    }
  });
}

describe("convex/feedback", () => {
  const originalInternalEmails = process.env.INTERNAL_EMAILS;
  const originalWebhookUrl = process.env.FEEDBACK_WEBHOOK_URL;

  beforeEach(() => {
    process.env.INTERNAL_EMAILS = "azhar@wanderfit.app, greg@wanderfit.app";
    delete process.env.FEEDBACK_WEBHOOK_URL;
  });

  afterAll(() => {
    if (originalInternalEmails === undefined) {
      delete process.env.INTERNAL_EMAILS;
    } else {
      process.env.INTERNAL_EMAILS = originalInternalEmails;
    }
    if (originalWebhookUrl === undefined) {
      delete process.env.FEEDBACK_WEBHOOK_URL;
    } else {
      process.env.FEEDBACK_WEBHOOK_URL = originalWebhookUrl;
    }
  });

  describe("internal tester allowlist (INTERNAL_EMAILS)", () => {
    it("tags verified allowlisted emails case-insensitively and rejects unverified claims", async () => {
      const { asAthlete, asFounder, asUnverifiedFounder } = await setup();

      expect(await asFounder.query(api.feedback.getAccess, {})).toEqual({ isInternal: true });
      expect(await asUnverifiedFounder.query(api.feedback.getAccess, {})).toEqual({
        isInternal: false,
      });
      expect(await asAthlete.query(api.feedback.getAccess, {})).toEqual({ isInternal: false });
    });
  });

  describe("Feature 1 — Private Rating & Independent Store Review", () => {
    it("stores private rating with server-computed workout count and updates prompt state", async () => {
      const { t, asAthlete, athleteId, templateId, programId } = await setup();
      await addCompletedWorkouts(t, { athleteId, templateId, programId }, 2);

      const { ratingId } = await asAthlete.mutation(api.feedback.submitRating, {
        stars: 4,
        note: "  Love the warmup flow  ",
        trigger: "post_workout_prompt",
        context: baseContext,
      });

      const stored = await t.run((ctx) => ctx.db.get(ratingId));
      expect(stored).toMatchObject({
        userId: athleteId,
        isInternal: false,
        stars: 4,
        note: "Love the warmup flow",
        trigger: "post_workout_prompt",
        completedWorkoutsAtSubmission: 2,
      });

      const eligibilityAfter = await asAthlete.query(api.feedback.getPromptEligibility, {});
      expect(eligibilityAfter.shouldShowPrivateRatingPrompt).toBe(false);
    });

    it("rejects out-of-range star ratings", async () => {
      const { asAthlete } = await setup();
      await expect(
        asAthlete.mutation(api.feedback.submitRating, {
          stars: 6,
          trigger: "profile_manual",
          context: baseContext,
        })
      ).rejects.toThrow("between 1 and 5");
    });

    it("triggers private rating at 2 workouts and store review independently at 5 workouts even after a 1-star private rating", async () => {
      const { t, asAthlete, athleteId, templateId, programId } = await setup();

      // 1 workout: neither prompt
      await addCompletedWorkouts(t, { athleteId, templateId, programId }, 1);
      expect(await asAthlete.query(api.feedback.getPromptEligibility, {})).toMatchObject({
        shouldShowPrivateRatingPrompt: false,
        shouldRequestStoreReview: false,
      });

      // 2nd workout: private rating eligible
      await addCompletedWorkouts(t, { athleteId, templateId, programId }, 1);
      expect(await asAthlete.query(api.feedback.getPromptEligibility, {})).toMatchObject({
        shouldShowPrivateRatingPrompt: true,
        shouldRequestStoreReview: false,
      });

      // Submit a 1-star private rating
      await asAthlete.mutation(api.feedback.submitRating, {
        stars: 1,
        note: "Volume felt too high",
        trigger: "post_workout_prompt",
        context: baseContext,
      });

      // Add 3 more workouts (total = 5) — native store review is eligible immediately,
      // strictly independent of the 1-star private rating or when it was submitted.
      await addCompletedWorkouts(t, { athleteId, templateId, programId }, 3);

      expect(await asAthlete.query(api.feedback.getPromptEligibility, {})).toMatchObject({
        shouldShowPrivateRatingPrompt: false,
        shouldRequestStoreReview: true,
        completedWorkoutsCount: 5,
      });

      // Recording store review starts the 90-day cooldown
      await asAthlete.mutation(api.feedback.recordStoreReviewRequested, {});
      expect(await asAthlete.query(api.feedback.getPromptEligibility, {})).toMatchObject({
        shouldShowPrivateRatingPrompt: false,
        shouldRequestStoreReview: false,
      });
    });

    it("suppresses both prompts while a reassessment check-in is pending", async () => {
      const { t, asAthlete, athleteId, templateId, programId } = await setup();
      await addCompletedWorkouts(t, { athleteId, templateId, programId }, 5);
      await t.run((ctx) =>
        ctx.db.patch(programId, { reassessmentPendingForPhase: "GPP" })
      );

      expect(await asAthlete.query(api.feedback.getPromptEligibility, {})).toMatchObject({
        shouldShowPrivateRatingPrompt: false,
        shouldRequestStoreReview: false,
      });
    });

    it("records private rating dismissal and suppresses subsequent prompts during cooldown", async () => {
      const { t, asAthlete, athleteId, templateId, programId } = await setup();
      await addCompletedWorkouts(t, { athleteId, templateId, programId }, 2);

      await asAthlete.mutation(api.feedback.dismissRatingPrompt, {});
      expect(await asAthlete.query(api.feedback.getPromptEligibility, {})).toMatchObject({
        shouldShowPrivateRatingPrompt: false,
      });
    });
  });

  describe("Feature 2 — Bug Reports", () => {
    it("stores structured workout context, resolves exerciseName server-side, and saves posthogSessionId", async () => {
      const { t, asAthlete, athleteId, athleteSessionId, templateId, exerciseId } = await setup();

      const { bugReportId } = await asAthlete.mutation(api.feedback.submitBugReport, {
        title: "6x12 looks way too high",
        details: "Goblet squat prescribed 6 sets of 12 in GPP W1D1.",
        severity: "annoying",
        source: "workout_execute",
        context: { ...baseContext, screenRoute: "/(athlete)/workout/execute/[id]" },
        workoutContext: {
          gppSessionId: athleteSessionId,
          templateId,
          exerciseId,
        },
        posthogSessionId: "ph_sess_123",
      });

      const stored = await t.run((ctx) => ctx.db.get(bugReportId));
      expect(stored).toMatchObject({
        userId: athleteId,
        isInternal: false,
        status: "new",
        severity: "annoying",
        source: "workout_execute",
        posthogSessionId: "ph_sess_123",
        workoutContext: {
          gppSessionId: athleteSessionId,
          templateId,
          exerciseId,
          exerciseName: "Goblet Squat",
        },
      });
    });

    it("rejects referencing another athlete's gppSessionId", async () => {
      const { asAthlete, otherSessionId } = await setup();

      await expect(
        asAthlete.mutation(api.feedback.submitBugReport, {
          title: "Spoofed session",
          details: "Trying to attach another athlete's session ID.",
          severity: "minor",
          source: "workout_execute",
          context: baseContext,
          workoutContext: { gppSessionId: otherSessionId },
        })
      ).rejects.toThrow("Not authorized to reference this workout session");
    });
  });

  describe("Feature 3 — Feature Requests", () => {
    it("stores categorized feature request with status new and internal tag", async () => {
      const { t, asFounder, founderId } = await setup();

      const { featureRequestId } = await asFounder.mutation(api.feedback.submitFeatureRequest, {
        category: "equipment_gym_home",
        title: "Home vs Gym toggle",
        details: "Let athletes switch when training in a hotel gym.",
        context: baseContext,
      });

      const stored = await t.run((ctx) => ctx.db.get(featureRequestId));
      expect(stored).toMatchObject({
        userId: founderId,
        isInternal: true,
        category: "equipment_gym_home",
        status: "new",
      });
    });
  });

  describe("Rate limiting", () => {
    it("allows 10 submissions per hour across feedback types and rejects the 11th", async () => {
      const { asAthlete } = await setup();

      for (let i = 0; i < 4; i++) {
        await asAthlete.mutation(api.feedback.submitRating, {
          stars: 5,
          trigger: "profile_manual",
          context: baseContext,
        });
      }
      for (let i = 0; i < 3; i++) {
        await asAthlete.mutation(api.feedback.submitBugReport, {
          title: `Bug ${i}`,
          details: "Details here",
          severity: "minor",
          source: "profile",
          context: baseContext,
        });
      }
      for (let i = 0; i < 3; i++) {
        await asAthlete.mutation(api.feedback.submitFeatureRequest, {
          category: "other",
          title: `Idea ${i}`,
          details: "Idea details",
          context: baseContext,
        });
      }

      await expect(
        asAthlete.mutation(api.feedback.submitFeatureRequest, {
          category: "other",
          title: "11th submission",
          details: "Should be rate-limited",
          context: baseContext,
        })
      ).rejects.toThrow("Please try again in a bit");
    });
  });

  describe("Internal founder triage & metadata-only webhook", () => {
    it("supports triage listing, status updates, and athlete-only summary metrics", async () => {
      const { t, asAthlete, asFounder } = await setup();

      const { bugReportId } = await asAthlete.mutation(api.feedback.submitBugReport, {
        title: "Timer paused on rotate",
        details: "Rotating screen reset timer",
        severity: "blocking",
        source: "workout_execute",
        context: baseContext,
      });
      const { featureRequestId } = await asAthlete.mutation(api.feedback.submitFeatureRequest, {
        category: "progress_maxes",
        title: "Plate calculator",
        details: "Show plates per side",
        context: baseContext,
      });
      await asAthlete.mutation(api.feedback.submitRating, {
        stars: 4,
        trigger: "profile_manual",
        context: baseContext,
      });
      await asFounder.mutation(api.feedback.submitRating, {
        stars: 5,
        trigger: "profile_manual",
        context: baseContext,
      });

      await t.mutation(internal.feedback.updateBugStatus, {
        bugReportId,
        status: "triaged",
        triageNotes: "Reproduced on iOS 18",
      });
      await t.mutation(internal.feedback.updateFeatureRequestStatus, {
        featureRequestId,
        status: "planned",
        triageNotes: "Post-pilot backlog",
      });

      const triagedBugs = await t.query(internal.feedback.listBugsForTriage, {
        status: "triaged",
        isInternal: false,
      });
      expect(triagedBugs).toHaveLength(1);
      expect(triagedBugs[0].triageNotes).toBe("Reproduced on iOS 18");

      const plannedFeatures = await t.query(internal.feedback.listFeatureRequestsForTriage, {
        status: "planned",
        category: "progress_maxes",
      });
      expect(plannedFeatures).toHaveLength(1);

      const athleteSummary = await t.query(internal.feedback.getFeedbackSummary, {});
      expect(athleteSummary).toMatchObject({
        ratingsCount: 1,
        averageStars: 4,
        bugsCount: 1,
        featureRequestsCount: 1,
      });

      const allSummary = await t.query(internal.feedback.getFeedbackSummary, {
        includeInternal: true,
      });
      expect(allSummary.ratingsCount).toBe(2);
      expect(allSummary.averageStars).toBe(4.5);
    });

    it("no-ops notifyWebhook cleanly when FEEDBACK_WEBHOOK_URL is unset", async () => {
      const { t } = await setup();
      const result = await t.action(internal.feedback.notifyWebhook, {
        docId: "doc_123",
        kind: "bug_report",
        isInternal: false,
        severity: "blocking",
        platform: "ios",
      });
      expect(result).toEqual({ sent: false, reason: "unconfigured" });
    });

    it("sends strictly server-validated metadata only when FEEDBACK_WEBHOOK_URL is configured", async () => {
      const { t } = await setup();
      process.env.FEEDBACK_WEBHOOK_URL = "https://hooks.example.test/feedback";
      const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        status: 200,
      } as Response);

      try {
        const result = await t.action(internal.feedback.notifyWebhook, {
          docId: "doc_999",
          kind: "rating",
          isInternal: false,
          stars: 5,
          platform: "ios",
        });
        expect(result).toEqual({ sent: true, status: 200 });
        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const [, init] = fetchSpy.mock.calls[0];
        const bodyText = String(init?.body ?? "");
        expect(bodyText).toContain("[ATHLETE]");
        expect(bodyText).toContain("5/5 stars");
        expect(bodyText).toContain("ios");
        expect(bodyText).toContain("doc=doc_999");
        expect(bodyText).not.toContain("@");
      } finally {
        fetchSpy.mockRestore();
      }
    });

    it("filters internal bugs before taking limit even when many newer athlete bugs exist", async () => {
      const { t, asAthlete, asFounder } = await setup();

      await asFounder.mutation(api.feedback.submitBugReport, {
        title: "Older founder bug",
        details: "Found while dogfooding",
        severity: "minor",
        source: "profile",
        context: baseContext,
      });

      for (let i = 0; i < 4; i++) {
        await asAthlete.mutation(api.feedback.submitBugReport, {
          title: `Newer athlete bug ${i}`,
          details: "Details",
          severity: "minor",
          source: "profile",
          context: baseContext,
        });
      }

      const internalOnly = await t.query(internal.feedback.listBugsForTriage, {
        isInternal: true,
        limit: 1,
      });
      expect(internalOnly).toHaveLength(1);
      expect(internalOnly[0].title).toBe("Older founder bug");
    });
  });

  describe("E2E persona cleanup", () => {
    it("removes all 4 feedback tables when e2e.remove deletes a persona", async () => {
      const { t, asAthlete, athleteId } = await setup();

      await asAthlete.mutation(api.feedback.submitRating, {
        stars: 5,
        trigger: "profile_manual",
        context: baseContext,
      });
      await asAthlete.mutation(api.feedback.submitBugReport, {
        title: "E2E bug",
        details: "E2E bug details",
        severity: "minor",
        source: "profile",
        context: baseContext,
      });
      await asAthlete.mutation(api.feedback.submitFeatureRequest, {
        category: "other",
        title: "E2E idea",
        details: "E2E idea details",
        context: baseContext,
      });

      await t.mutation(internal.e2e.remove, { email: "athlete@example.com" });

      const remaining = await t.run(async (ctx) => ({
        ratings: await ctx.db
          .query("athlete_ratings")
          .withIndex("by_user", (q) => q.eq("userId", athleteId))
          .collect(),
        bugs: await ctx.db
          .query("bug_reports")
          .withIndex("by_user", (q) => q.eq("userId", athleteId))
          .collect(),
        features: await ctx.db
          .query("feature_requests")
          .withIndex("by_user", (q) => q.eq("userId", athleteId))
          .collect(),
        promptStates: await ctx.db
          .query("feedback_prompt_state")
          .withIndex("by_user", (q) => q.eq("userId", athleteId))
          .collect(),
      }));

      expect(remaining).toEqual({
        ratings: [],
        bugs: [],
        features: [],
        promptStates: [],
      });
    });
  });
});
