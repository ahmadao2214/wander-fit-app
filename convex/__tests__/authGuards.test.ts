import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import * as debug from "../debug";
import * as seed from "../seed";
import * as migrations from "../migrations";
import * as generateTemplates from "../generateTemplates";
import * as exercises from "../exercises";
import * as sports from "../sports";
import * as programTemplates from "../programTemplates";
import * as users from "../users";
import * as userPrograms from "../userPrograms";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

// ─────────────────────────────────────────────────────────────────────────────
// Visibility: dev, seed and maintenance functions must not be public
// ─────────────────────────────────────────────────────────────────────────────

type RegisteredFn = {
  isQuery?: boolean;
  isMutation?: boolean;
  isAction?: boolean;
  isPublic?: boolean;
  isInternal?: boolean;
};

function registeredFunctions(mod: Record<string, unknown>): [string, RegisteredFn][] {
  return Object.entries(mod).filter(([, value]) => {
    const fn = value as RegisteredFn;
    return !!fn && (fn.isQuery || fn.isMutation || fn.isAction);
  }) as [string, RegisteredFn][];
}

describe("internal-only modules", () => {
  const internalModules = { debug, seed, migrations, generateTemplates };

  for (const [moduleName, mod] of Object.entries(internalModules)) {
    it(`${moduleName}: every function is internal`, () => {
      const fns = registeredFunctions(mod);
      expect(fns.length).toBeGreaterThan(0);
      const publicFns = fns.filter(([, fn]) => !fn.isInternal).map(([name]) => name);
      expect(publicFns).toEqual([]);
    });
  }
});

describe("reference data writes and unused user lookups are internal", () => {
  const cases: [string, RegisteredFn][] = [
    ["exercises.create", exercises.create as RegisteredFn],
    ["exercises.upsertBySlug", exercises.upsertBySlug as RegisteredFn],
    ["exercises.bulkInsert", exercises.bulkInsert as RegisteredFn],
    ["sports.createSport", sports.createSport as RegisteredFn],
    ["sports.createCategory", sports.createCategory as RegisteredFn],
    ["sports.seedSportsAndCategories", sports.seedSportsAndCategories as RegisteredFn],
    ["programTemplates.create", programTemplates.create as RegisteredFn],
    ["programTemplates.upsert", programTemplates.upsert as RegisteredFn],
    ["programTemplates.remove", programTemplates.remove as RegisteredFn],
    ["users.getUserById", users.getUserById as RegisteredFn],
    ["userPrograms.getByUserId", userPrograms.getByUserId as RegisteredFn],
  ];

  for (const [name, fn] of cases) {
    it(`${name} is internal`, () => {
      expect(fn.isInternal).toBe(true);
    });
  }

  it("internal functions are still callable server-side", async () => {
    const t = convexTest(schema, modules);
    const status = await t.query(internal.seed.getSeedStatus, {});
    expect(status).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const trainer = await ctx.db.insert("users", {
      email: "trainer@example.com",
      name: "Trainer",
      clerkId: "clerk_trainer",
      role: "trainer",
      createdAt: now,
    });
    const otherTrainer = await ctx.db.insert("users", {
      email: "other-trainer@example.com",
      name: "Other Trainer",
      clerkId: "clerk_other_trainer",
      role: "trainer",
      createdAt: now,
    });
    const client = await ctx.db.insert("users", {
      email: "client@example.com",
      name: "Client",
      clerkId: "clerk_client",
      role: "client",
      createdAt: now,
    });
    const stranger = await ctx.db.insert("users", {
      email: "stranger@example.com",
      name: "Stranger",
      clerkId: "clerk_stranger",
      role: "client",
      createdAt: now,
    });
    return { trainer, otherTrainer, client, stranger };
  });

  return {
    t,
    ids,
    asTrainer: t.withIdentity({ subject: "clerk_trainer", email: "trainer@example.com" }),
    asOtherTrainer: t.withIdentity({ subject: "clerk_other_trainer", email: "other-trainer@example.com" }),
    asClient: t.withIdentity({ subject: "clerk_client", email: "client@example.com" }),
    asStranger: t.withIdentity({ subject: "clerk_stranger", email: "stranger@example.com" }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// users
// ─────────────────────────────────────────────────────────────────────────────

describe("users.createUser", () => {
  const newUser = {
    email: "new@example.com",
    name: "New User",
    role: "client" as const,
    clerkId: "clerk_new",
  };

  it("rejects unauthenticated calls", async () => {
    const { t } = await setup();
    await expect(t.mutation(api.users.createUser, newUser)).rejects.toThrow("Not authenticated");
  });

  it("rejects creating a user for another Clerk account", async () => {
    const { asStranger } = await setup();
    await expect(asStranger.mutation(api.users.createUser, newUser)).rejects.toThrow(
      "Cannot create a user for another account"
    );
  });

  it("creates the caller's own user with Clerk's email", async () => {
    const { t } = await setup();
    const asNew = t.withIdentity({ subject: "clerk_new", email: "verified@example.com" });
    const userId = await asNew.mutation(api.users.createUser, newUser);
    const user = await t.run((ctx) => ctx.db.get(userId));
    expect(user?.clerkId).toBe("clerk_new");
    expect(user?.email).toBe("verified@example.com");
  });
});

describe("users.getCurrentUser", () => {
  it("returns null when unauthenticated", async () => {
    const { t } = await setup();
    expect(await t.query(api.users.getCurrentUser, { clerkId: "clerk_client" })).toBeNull();
  });

  it("returns null for another account's clerkId", async () => {
    const { asStranger } = await setup();
    expect(await asStranger.query(api.users.getCurrentUser, { clerkId: "clerk_client" })).toBeNull();
  });

  it("returns the caller's own record", async () => {
    const { asClient, ids } = await setup();
    const user = await asClient.query(api.users.getCurrentUser, { clerkId: "clerk_client" });
    expect(user?._id).toBe(ids.client);
  });
});

describe("users.updateUser", () => {
  it("updateUser only updates the caller's profile", async () => {
    const { t, asStranger, ids } = await setup();
    await expect(
      t.mutation(api.users.updateUser, { userId: ids.client, name: "Hacked" })
    ).rejects.toThrow("Not authenticated");
    await expect(
      asStranger.mutation(api.users.updateUser, { userId: ids.client, name: "Hacked" })
    ).rejects.toThrow("You can only update your own profile");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// gppWorkoutSessions
// ─────────────────────────────────────────────────────────────────────────────

describe("gppWorkoutSessions.getById", () => {
  async function setupGppSession() {
    const ctx = await setup();
    const sessionId: Id<"gpp_workout_sessions"> = await ctx.t.run(async (db) => {
      const now = Date.now();
      const sportId = await db.db.insert("sports", { name: "Soccer", gppCategoryId: 1 });
      const intakeResponseId = await db.db.insert("intake_responses", {
        userId: ctx.ids.client,
        sportId,
        yearsOfExperience: 2,
        preferredTrainingDaysPerWeek: 3,
        assignedGppCategoryId: 1,
        assignedSkillLevel: "Moderate",
        intakeType: "initial",
        completedAt: now,
      });
      const userProgramId = await db.db.insert("user_programs", {
        userId: ctx.ids.client,
        intakeResponseId,
        gppCategoryId: 1,
        skillLevel: "Moderate",
        currentPhase: "GPP",
        currentWeek: 1,
        currentDay: 1,
        phaseStartDate: now,
        createdAt: now,
        updatedAt: now,
      });
      const templateId = await db.db.insert("program_templates", {
        gppCategoryId: 1,
        phase: "GPP",
        skillLevel: "Moderate",
        week: 1,
        day: 1,
        name: "Lower Body Foundation",
        estimatedDurationMinutes: 45,
        exercises: [],
      });
      return await db.db.insert("gpp_workout_sessions", {
        userId: ctx.ids.client,
        templateId,
        userProgramId,
        startedAt: now,
        status: "in_progress",
        exercises: [],
      });
    });
    return { ...ctx, sessionId };
  }

  it("returns null for unauthenticated callers and other users", async () => {
    const { t, asStranger, asTrainer, sessionId } = await setupGppSession();
    expect(await t.query(api.gppWorkoutSessions.getById, { sessionId })).toBeNull();
    expect(await asStranger.query(api.gppWorkoutSessions.getById, { sessionId })).toBeNull();
    expect(await asTrainer.query(api.gppWorkoutSessions.getById, { sessionId })).toBeNull();
  });

  it("returns the owner's session", async () => {
    const { asClient, sessionId } = await setupGppSession();
    const session = await asClient.query(api.gppWorkoutSessions.getById, { sessionId });
    expect(session?._id).toBe(sessionId);
  });
});

describe("workoutSessions.getHistory (compatibility path for installed builds)", () => {
  async function setupCompletedSession() {
    const ctx = await setup();
    await ctx.t.run(async (db) => {
      const now = Date.now();
      const sportId = await db.db.insert("sports", { name: "Soccer", gppCategoryId: 1 });
      const intakeResponseId = await db.db.insert("intake_responses", {
        userId: ctx.ids.client,
        sportId,
        yearsOfExperience: 2,
        preferredTrainingDaysPerWeek: 3,
        assignedGppCategoryId: 1,
        assignedSkillLevel: "Moderate",
        intakeType: "initial",
        completedAt: now,
      });
      const userProgramId = await db.db.insert("user_programs", {
        userId: ctx.ids.client,
        intakeResponseId,
        gppCategoryId: 1,
        skillLevel: "Moderate",
        currentPhase: "GPP",
        currentWeek: 1,
        currentDay: 2,
        phaseStartDate: now,
        createdAt: now,
        updatedAt: now,
      });
      const templateId = await db.db.insert("program_templates", {
        gppCategoryId: 1,
        phase: "GPP",
        skillLevel: "Moderate",
        week: 1,
        day: 1,
        name: "Lower Body Foundation",
        estimatedDurationMinutes: 45,
        exercises: [],
      });
      await db.db.insert("gpp_workout_sessions", {
        userId: ctx.ids.client,
        templateId,
        userProgramId,
        startedAt: now,
        completedAt: now,
        status: "completed",
        exercises: [],
      });
    });
    return ctx;
  }

  it("serves the caller's GPP sessions, the same as gppWorkoutSessions.getHistory", async () => {
    const { asClient } = await setupCompletedSession();
    const legacy = await asClient.query(api.workoutSessions.getHistory, {});
    const current = await asClient.query(api.gppWorkoutSessions.getHistory, {});
    expect(legacy.map((s) => s.templateName)).toEqual(["Lower Body Foundation"]);
    expect(legacy).toEqual(current);
  });

  it("returns nothing for other users", async () => {
    const { asStranger } = await setupCompletedSession();
    expect(await asStranger.query(api.workoutSessions.getHistory, {})).toEqual([]);
  });
});
