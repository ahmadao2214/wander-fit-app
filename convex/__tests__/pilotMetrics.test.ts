import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();
const DAY_MS = 24 * 60 * 60 * 1000;

describe("pilotMetrics.getPilotScorecard", () => {
  const originalInternalEmails = process.env.INTERNAL_EMAILS;

  afterEach(() => {
    if (originalInternalEmails === undefined) {
      delete process.env.INTERNAL_EMAILS;
    } else {
      process.env.INTERNAL_EMAILS = originalInternalEmails;
    }
  });

  it("includes 0-workout Pilot Athletes, computes Week 1 vs Week 2 retention, excludes INTERNAL_EMAILS, and emits zero PII", async () => {
    process.env.INTERNAL_EMAILS = "founder@wanderfit.app, coach@wanderfit.app ";
    const t = convexTest(schema, modules);
    const t0 = 1_760_000_000_000;

    await t.run(async (ctx) => {
      const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
      const templateId = await ctx.db.insert("program_templates", {
        gppCategoryId: 2,
        phase: "GPP",
        skillLevel: "Moderate",
        week: 1,
        day: 1,
        name: "Lower Body Power",
        estimatedDurationMinutes: 45,
        exercises: [],
      });

      const addAthlete = async (opts: {
        email: string;
        clerkId: string;
        ageGroup: "14-17" | "18-35" | "36+";
        intakeCompleted: boolean;
        completedOffsetsDays: number[];
        openedOnlyOffsetsDays?: number[];
      }) => {
        const userId = await ctx.db.insert("users", {
          email: opts.email,
          name: "Private Name Should Never Appear",
          clerkId: opts.clerkId,
          createdAt: t0,
          intakeCompletedAt: opts.intakeCompleted ? t0 : undefined,
        });
        const intakeId = await ctx.db.insert("intake_responses", {
          userId,
          sportId,
          yearsOfExperience: 2,
          preferredTrainingDaysPerWeek: 3,
          ageGroup: opts.ageGroup,
          assignedGppCategoryId: 2,
          assignedSkillLevel: "Moderate",
          intakeType: "initial",
          completedAt: t0,
        });
        const programId = await ctx.db.insert("user_programs", {
          userId,
          intakeResponseId: intakeId,
          gppCategoryId: 2,
          skillLevel: "Moderate",
          ageGroup: opts.ageGroup,
          currentPhase: "GPP",
          currentWeek: 1,
          currentDay: 1,
          phaseStartDate: t0,
          createdAt: t0,
          updatedAt: t0,
        });

        for (const dayOffset of opts.completedOffsetsDays) {
          await ctx.db.insert("gpp_workout_sessions", {
            userId,
            templateId,
            userProgramId: programId,
            startedAt: t0 + dayOffset * DAY_MS,
            completedAt: t0 + dayOffset * DAY_MS + 30 * 60 * 1000,
            status: "completed",
            exercises: [],
          });
        }
        for (const dayOffset of opts.openedOnlyOffsetsDays ?? []) {
          await ctx.db.insert("gpp_workout_sessions", {
            userId,
            templateId,
            userProgramId: programId,
            startedAt: t0 + dayOffset * DAY_MS,
            status: "abandoned",
            exercises: [],
          });
        }
      };

      // 1. Retained athlete (Week 1 + Week 2)
      await addAthlete({
        email: "pilot1@example.com",
        clerkId: "clerk_p1",
        ageGroup: "14-17",
        intakeCompleted: true,
        completedOffsetsDays: [1, 8],
      });

      // 2. Week-1 only athlete (dropped before Week 2)
      await addAthlete({
        email: "pilot2@example.com",
        clerkId: "clerk_p2",
        ageGroup: "18-35",
        intakeCompleted: true,
        completedOffsetsDays: [2],
      });

      // 3. 0-workout athlete (completed intake, opened 0 workouts — MUST stay in denominator)
      await addAthlete({
        email: "pilot3@example.com",
        clerkId: "clerk_p3",
        ageGroup: "36+",
        intakeCompleted: true,
        completedOffsetsDays: [],
      });

      // 4. Internal team account (excluded by default)
      await addAthlete({
        email: "Founder@WanderFit.app",
        clerkId: "clerk_founder",
        ageGroup: "18-35",
        intakeCompleted: true,
        completedOffsetsDays: [1, 4, 9, 12],
      });
    });

    const scorecard = await t.query(internal.pilotMetrics.getPilotScorecard, {
      cohortStartMs: t0,
    });

    expect(scorecard.totals).toEqual({
      totalAthletes: 3,
      intakeCompletedCount: 3,
      intakeCompletedRetainedWeek2Count: 1,
      zeroWorkoutCount: 1,
      startedAtLeastOneCount: 2,
      completedWeek1Count: 2,
      retainedWeek2Count: 1,
      retainedOverallCount: 1,
      week2RetentionRate: 0.3333,
      intakeWeek2RetentionRate: 0.3333,
      meetsPilotGate: false,
    });

    expect(scorecard.byAgeGroup["14-17"]).toEqual({
      athletes: 1,
      intakeCompleted: 1,
      retainedWeek2: 1,
    });
    expect(scorecard.byGppCategory["2"]).toEqual({
      athletes: 3,
      retainedWeek2: 1,
    });

    // Zero PII in serialized scorecard output
    const serialized = JSON.stringify(scorecard);
    expect(serialized).not.toContain("pilot1@example.com");
    expect(serialized).not.toContain("Private Name");
    expect(serialized).not.toContain("clerk_p1");

    // Including internal accounts increases total from 3 to 4
    const withInternal = await t.query(internal.pilotMetrics.getPilotScorecard, {
      cohortStartMs: t0,
      includeInternal: true,
    });
    expect(withInternal.totals.totalAthletes).toBe(4);
    expect(withInternal.totals.retainedWeek2Count).toBe(2);
  });

  it("passes meetsPilotGate when >= 6/10 intake-completed Pilot Athletes retain in Week 2", async () => {
    const t = convexTest(schema, modules);
    const t0 = 1_760_000_000_000;

    await t.run(async (ctx) => {
      const sportId = await ctx.db.insert("sports", { name: "Soccer", gppCategoryId: 1 });
      const templateId = await ctx.db.insert("program_templates", {
        gppCategoryId: 1,
        phase: "GPP",
        skillLevel: "Novice",
        week: 1,
        day: 1,
        name: "Foundation",
        estimatedDurationMinutes: 40,
        exercises: [],
      });

      for (let i = 0; i < 10; i += 1) {
        const userId = await ctx.db.insert("users", {
          email: `athlete${i}@example.com`,
          name: `Athlete ${i}`,
          clerkId: `clerk_a${i}`,
          createdAt: t0,
          intakeCompletedAt: t0,
        });
        const intakeId = await ctx.db.insert("intake_responses", {
          userId,
          sportId,
          yearsOfExperience: 1,
          preferredTrainingDaysPerWeek: 3,
          ageGroup: "18-35",
          assignedGppCategoryId: 1,
          assignedSkillLevel: "Novice",
          intakeType: "initial",
          completedAt: t0,
        });
        const programId = await ctx.db.insert("user_programs", {
          userId,
          intakeResponseId: intakeId,
          gppCategoryId: 1,
          skillLevel: "Novice",
          ageGroup: "18-35",
          currentPhase: "GPP",
          currentWeek: 1,
          currentDay: 1,
          phaseStartDate: t0,
          createdAt: t0,
          updatedAt: t0,
        });

        if (i < 6) {
          await ctx.db.insert("gpp_workout_sessions", {
            userId,
            templateId,
            userProgramId: programId,
            startedAt: t0 + 9 * DAY_MS,
            completedAt: t0 + 9 * DAY_MS + 1000,
            status: "completed",
            exercises: [],
          });
        }
      }
      // Add 2 accounts that have NOT completed Intake yet (12 total cohort, 10 intake completed, 6 retained)
      for (let j = 0; j < 2; j += 1) {
        await ctx.db.insert("users", {
          email: `incomplete${j}@example.com`,
          name: `Incomplete ${j}`,
          clerkId: `clerk_inc${j}`,
          createdAt: t0,
        });
      }
    });

    const scorecard = await t.query(internal.pilotMetrics.getPilotScorecard, {});
    expect(scorecard.totals.totalAthletes).toBe(12);
    expect(scorecard.totals.intakeCompletedCount).toBe(10);
    expect(scorecard.totals.intakeCompletedRetainedWeek2Count).toBe(6);
    expect(scorecard.totals.retainedWeek2Count).toBe(6);
    // Full cohort rate: 6 / 12 = 0.5; Intake-completed Pilot gate rate: 6 / 10 = 0.6 -> passes gate
    expect(scorecard.totals.week2RetentionRate).toBe(0.5);
    expect(scorecard.totals.intakeWeek2RetentionRate).toBe(0.6);
    expect(scorecard.totals.meetsPilotGate).toBe(true);
  });
});
