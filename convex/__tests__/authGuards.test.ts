// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import * as debug from "../debug";
import * as seed from "../seed";
import * as sampleData from "../sampleData";
import * as migrations from "../migrations";
import * as generateTemplates from "../generateTemplates";
import * as exercises from "../exercises";
import * as sports from "../sports";
import * as programTemplates from "../programTemplates";
import * as users from "../users";
import * as userPrograms from "../userPrograms";

const modules = import.meta.glob("../**/*.ts");

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
  const internalModules = { debug, seed, sampleData, migrations, generateTemplates };

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
    ["users.getTrainers", users.getTrainers as RegisteredFn],
    ["users.getClientTrainer", users.getClientTrainer as RegisteredFn],
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
      trainerId: trainer,
      createdAt: now,
    });
    const stranger = await ctx.db.insert("users", {
      email: "stranger@example.com",
      name: "Stranger",
      clerkId: "clerk_stranger",
      role: "client",
      createdAt: now,
    });
    await ctx.db.insert("trainerClientRelationships", {
      trainerId: trainer,
      clientId: client,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    const workout = await ctx.db.insert("workouts", {
      trainerId: trainer,
      clientId: client,
      name: "Legacy Workout",
      exercises: [],
      createdAt: now,
      isActive: true,
    });
    const workoutSession = await ctx.db.insert("workoutSessions", {
      workoutId: workout,
      clientId: client,
      startedAt: now,
      status: "in_progress",
      exercises: [],
    });
    return { trainer, otherTrainer, client, stranger, workout, workoutSession };
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

describe("users trainer functions", () => {
  it("getTrainerClients rejects unauthenticated and other trainers", async () => {
    const { t, asOtherTrainer, asTrainer, ids } = await setup();
    await expect(
      t.query(api.users.getTrainerClients, { trainerId: ids.trainer })
    ).rejects.toThrow("Not authenticated");
    await expect(
      asOtherTrainer.query(api.users.getTrainerClients, { trainerId: ids.trainer })
    ).rejects.toThrow("You can only view your own clients");

    const clients = await asTrainer.query(api.users.getTrainerClients, { trainerId: ids.trainer });
    expect(clients.map((c) => c._id)).toEqual([ids.client]);
  });

  it("getUnassignedClients is trainer-only", async () => {
    const { t, asClient, asTrainer, ids } = await setup();
    await expect(t.query(api.users.getUnassignedClients, {})).rejects.toThrow("Not authenticated");
    await expect(asClient.query(api.users.getUnassignedClients, {})).rejects.toThrow(
      "Only trainers can do this"
    );
    const unassigned = await asTrainer.query(api.users.getUnassignedClients, {});
    expect(unassigned.map((u) => u._id)).toEqual([ids.stranger]);
  });

  it("connectExistingClient only connects clients to the caller", async () => {
    const { t, asOtherTrainer, ids } = await setup();
    const args = { clientId: ids.stranger, trainerId: ids.trainer };
    await expect(t.mutation(api.users.connectExistingClient, args)).rejects.toThrow(
      "Not authenticated"
    );
    await expect(asOtherTrainer.mutation(api.users.connectExistingClient, args)).rejects.toThrow(
      "You can only connect clients to yourself"
    );
  });

  it("requestTrainerRelationship is only for the caller", async () => {
    const { asStranger, ids } = await setup();
    await expect(
      asStranger.mutation(api.users.requestTrainerRelationship, {
        clientId: ids.client,
        trainerId: ids.otherTrainer,
      })
    ).rejects.toThrow("You can only request a trainer for yourself");
  });

  it("approveTrainerRelationship is only for the requested trainer", async () => {
    const { asStranger, asOtherTrainer, asTrainer, ids } = await setup();
    const relationshipId = await asStranger.mutation(api.users.requestTrainerRelationship, {
      clientId: ids.stranger,
      trainerId: ids.trainer,
    });

    await expect(
      asStranger.mutation(api.users.approveTrainerRelationship, { relationshipId, approve: true })
    ).rejects.toThrow("Only trainers can do this");
    await expect(
      asOtherTrainer.mutation(api.users.approveTrainerRelationship, { relationshipId, approve: true })
    ).rejects.toThrow("You can only approve requests sent to you");

    const approved = await asTrainer.mutation(api.users.approveTrainerRelationship, {
      relationshipId,
      approve: true,
    });
    expect(approved?.status).toBe("active");
  });

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
// invitations
// ─────────────────────────────────────────────────────────────────────────────

describe("invitations", () => {
  async function setupWithInvitation() {
    const ctx = await setup();
    const invitationId = await ctx.asTrainer.mutation(api.invitations.createClientInvitation, {
      email: "invitee@example.com",
      name: "Invitee",
      trainerId: ctx.ids.trainer,
    });
    return { ...ctx, invitationId };
  }

  it("createClientInvitation rejects unauthenticated and impersonated trainers", async () => {
    const { t, asOtherTrainer, ids } = await setup();
    const args = { email: "x@example.com", name: "X", trainerId: ids.trainer };
    await expect(t.mutation(api.invitations.createClientInvitation, args)).rejects.toThrow(
      "Not authenticated"
    );
    await expect(asOtherTrainer.mutation(api.invitations.createClientInvitation, args)).rejects.toThrow(
      "You can only send invitations as yourself"
    );
  });

  it("getTrainerInvitations only lists the caller's invitations", async () => {
    const { asOtherTrainer, asTrainer, ids, invitationId } = await setupWithInvitation();
    await expect(
      asOtherTrainer.query(api.invitations.getTrainerInvitations, { trainerId: ids.trainer })
    ).rejects.toThrow("You can only view your own invitations");
    const invitations = await asTrainer.query(api.invitations.getTrainerInvitations, {
      trainerId: ids.trainer,
    });
    expect(invitations.map((i) => i._id)).toEqual([invitationId]);
  });

  it("getInvitationByEmail only answers for the caller's own email", async () => {
    const { t, asStranger, invitationId } = await setupWithInvitation();
    const args = { email: "invitee@example.com" };
    expect(await t.query(api.invitations.getInvitationByEmail, args)).toBeNull();
    expect(await asStranger.query(api.invitations.getInvitationByEmail, args)).toBeNull();

    const asInvitee = t.withIdentity({ subject: "clerk_invitee", email: "invitee@example.com" });
    const invitation = await asInvitee.query(api.invitations.getInvitationByEmail, args);
    expect(invitation?._id).toBe(invitationId);
  });

  it("acceptInvitation rejects other users and ignores a spoofed email", async () => {
    const { t, asStranger, ids } = await setupWithInvitation();
    await expect(
      t.mutation(api.invitations.acceptInvitation, { email: "invitee@example.com", clientId: ids.stranger })
    ).rejects.toThrow("Not authenticated");
    await expect(
      asStranger.mutation(api.invitations.acceptInvitation, {
        email: "invitee@example.com",
        clientId: ids.client,
      })
    ).rejects.toThrow("You can only accept invitations for yourself");

    // The stranger claims the invitee's email: the lookup uses their own email, so nothing matches
    const result = await asStranger.mutation(api.invitations.acceptInvitation, {
      email: "invitee@example.com",
      clientId: ids.stranger,
    });
    expect(result).toBeNull();
    const stranger = await t.run((ctx) => ctx.db.get(ids.stranger));
    expect(stranger?.trainerId).toBeUndefined();
  });

  it("acceptInvitation links the invited user", async () => {
    const { t, ids } = await setupWithInvitation();
    const asInvitee = t.withIdentity({ subject: "clerk_invitee", email: "invitee@example.com" });
    const inviteeId = await asInvitee.mutation(api.users.createUser, {
      email: "invitee@example.com",
      name: "Invitee",
      role: "client",
      clerkId: "clerk_invitee",
    });
    const trainerId = await asInvitee.mutation(api.invitations.acceptInvitation, {
      email: "invitee@example.com",
      clientId: inviteeId,
    });
    expect(trainerId).toBe(ids.trainer);
  });

  it("never matches on the editable users.email", async () => {
    const { t, invitationId } = await setupWithInvitation();
    // No email claim in the token; the caller sets their profile email to the invitee's
    const asNoClaim = t.withIdentity({ subject: "clerk_no_claim" });
    const userId = await asNoClaim.mutation(api.users.createUser, {
      email: "invitee@example.com",
      name: "Impostor",
      role: "client",
      clerkId: "clerk_no_claim",
    });

    expect(
      await asNoClaim.query(api.invitations.getInvitationByEmail, { email: "invitee@example.com" })
    ).toBeNull();
    expect(
      await asNoClaim.mutation(api.invitations.acceptInvitation, {
        email: "invitee@example.com",
        clientId: userId,
      })
    ).toBeNull();
    const invitation = await t.run((ctx) => ctx.db.get(invitationId));
    expect(invitation?.status).toBe("pending");
  });

  it("ignores an email claim marked unverified", async () => {
    const { t } = await setupWithInvitation();
    const asUnverified = t.withIdentity({
      subject: "clerk_unverified",
      email: "invitee@example.com",
      emailVerified: false,
    });
    expect(
      await asUnverified.query(api.invitations.getInvitationByEmail, { email: "invitee@example.com" })
    ).toBeNull();
  });

  it("stores new invitations with a normalized email", async () => {
    const { t, asTrainer, ids } = await setup();
    const invitationId = await asTrainer.mutation(api.invitations.createClientInvitation, {
      email: "  Alex@Example.com ",
      name: "Alex",
      trainerId: ids.trainer,
    });
    const invitation = await t.run((ctx) => ctx.db.get(invitationId));
    expect(invitation?.email).toBe("alex@example.com");

    await expect(
      asTrainer.mutation(api.invitations.createClientInvitation, {
        email: "ALEX@example.com",
        name: "Alex",
        trainerId: ids.trainer,
      })
    ).rejects.toThrow("An invitation has already been sent to this email");
  });

  it("matches older mixed-case invitations case-insensitively", async () => {
    const { t, ids } = await setup();
    const invitationId = await t.run((ctx) =>
      ctx.db.insert("clientInvitations", {
        email: "Alex@Example.com",
        name: "Alex",
        trainerId: ids.trainer,
        status: "pending",
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      })
    );
    const asAlex = t.withIdentity({ subject: "clerk_alex", email: "alex@example.com" });

    const found = await asAlex.query(api.invitations.getInvitationByEmail, {
      email: "Alex@Example.com",
    });
    expect(found?._id).toBe(invitationId);

    const alexId = await asAlex.mutation(api.users.createUser, {
      email: "Alex@Example.com",
      name: "Alex",
      role: "client",
      clerkId: "clerk_alex",
    });
    const trainerId = await asAlex.mutation(api.invitations.acceptInvitation, {
      email: "Alex@Example.com",
      clientId: alexId,
    });
    expect(trainerId).toBe(ids.trainer);
  });

  it("cancelInvitation is only for the inviting trainer", async () => {
    const { t, asOtherTrainer, asTrainer, invitationId } = await setupWithInvitation();
    await expect(t.mutation(api.invitations.cancelInvitation, { invitationId })).rejects.toThrow(
      "Not authenticated"
    );
    await expect(
      asOtherTrainer.mutation(api.invitations.cancelInvitation, { invitationId })
    ).rejects.toThrow("You can only cancel your own invitations");
    await asTrainer.mutation(api.invitations.cancelInvitation, { invitationId });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// workouts / workoutSessions (legacy) and gppWorkoutSessions
// ─────────────────────────────────────────────────────────────────────────────

describe("workouts reads", () => {
  it("getWorkoutById is limited to the workout's client and trainer", async () => {
    const { t, asStranger, asClient, asTrainer, ids } = await setup();
    await expect(t.query(api.workouts.getWorkoutById, { workoutId: ids.workout })).rejects.toThrow(
      "Not authenticated"
    );
    await expect(
      asStranger.query(api.workouts.getWorkoutById, { workoutId: ids.workout })
    ).rejects.toThrow("Not authorized to view this workout");
    expect((await asClient.query(api.workouts.getWorkoutById, { workoutId: ids.workout }))._id).toBe(
      ids.workout
    );
    expect((await asTrainer.query(api.workouts.getWorkoutById, { workoutId: ids.workout }))._id).toBe(
      ids.workout
    );
  });

  it("getClientWorkouts is limited to the client and their trainer", async () => {
    const { asStranger, asOtherTrainer, asTrainer, ids } = await setup();
    await expect(
      asStranger.query(api.workouts.getClientWorkouts, { clientId: ids.client })
    ).rejects.toThrow("Not authorized");
    await expect(
      asOtherTrainer.query(api.workouts.getClientWorkouts, { clientId: ids.client })
    ).rejects.toThrow("Not authorized");
    const workouts = await asTrainer.query(api.workouts.getClientWorkouts, { clientId: ids.client });
    expect(workouts.map((w) => w._id)).toEqual([ids.workout]);
  });
});

describe("workoutSessions.getSessionById", () => {
  it("is limited to the session's client and their trainer", async () => {
    const { t, asStranger, asClient, asTrainer, ids } = await setup();
    const args = { sessionId: ids.workoutSession };
    await expect(t.query(api.workoutSessions.getSessionById, args)).rejects.toThrow(
      "Not authenticated"
    );
    await expect(asStranger.query(api.workoutSessions.getSessionById, args)).rejects.toThrow(
      "Not authorized to view this session"
    );
    expect((await asClient.query(api.workoutSessions.getSessionById, args))._id).toBe(
      ids.workoutSession
    );
    expect((await asTrainer.query(api.workoutSessions.getSessionById, args))._id).toBe(
      ids.workoutSession
    );
  });
});

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
