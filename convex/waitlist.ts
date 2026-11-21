import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Landing-page waitlist. The page posts to the public HTTP route in http.ts,
 * which validates with `cleanSignup` and saves through `record`. Nothing here
 * is a public Convex function, so the only way in is the validated route.
 */

export const TESTS = ["tryout", "beep", "mile", "academy", "none"] as const;
export const EXPERIENCE = ["never", "some", "regular"] as const;
export const MIN_AGE = 13; // COPPA: no accounts for under-13s
export const MAX_AGE = 19;

export type Signup = {
  role: "athlete" | "parent";
  athleteName: string;
  athleteAge: number;
  sport: string;
  test: (typeof TESTS)[number];
  testDate?: string;
  experience: (typeof EXPERIENCE)[number];
  athleteEmail?: string;
  parentEmail: string;
  intent: "reserve" | "updates";
  source?: string;
};

export type CleanResult =
  | { ok: true; value: Signup }
  | { ok: false; error: string }
  | { ok: false; spam: true };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

/** Validate and normalize a raw sign-up body. `today` is YYYY-MM-DD (UTC). */
export function cleanSignup(raw: unknown, today: string): CleanResult {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Send the sign-up as JSON." };
  const body = raw as Record<string, unknown>;

  // Honeypot: a hidden field people never see. Bots fill it; drop quietly.
  if (text(body.website, 200)) return { ok: false, spam: true };

  const role = body.role === "parent" ? "parent" : body.role === "athlete" ? "athlete" : null;
  if (!role) return { ok: false, error: "Say whether you're the athlete or a parent." };

  const athleteName = text(body.athleteName, 80);
  if (!athleteName) return { ok: false, error: "Add the athlete's first name." };

  const rawAge = body.athleteAge;
  const athleteAge = rawAge === "" || rawAge === null || rawAge === undefined ? NaN : Number(rawAge);
  if (!Number.isInteger(athleteAge)) return { ok: false, error: "Add the athlete's age." };
  if (athleteAge < MIN_AGE) return { ok: false, error: "WanderFit is for athletes 13 and older." };
  if (athleteAge > MAX_AGE) return { ok: false, error: "Add an age between 13 and 19." };

  const sport = text(body.sport, 40);
  if (!sport) return { ok: false, error: "Add the athlete's sport." };

  const test = TESTS.find((t) => t === body.test);
  if (!test) return { ok: false, error: "Pick the kind of test." };

  let testDate: string | undefined;
  if (test !== "none") {
    const date = text(body.testDate, 10);
    if (!isRealDate(date)) return { ok: false, error: "Pick a test date." };
    if (date <= today) return { ok: false, error: "Pick a test date after today." };
    testDate = date;
  }

  const experience = EXPERIENCE.find((e) => e === body.experience);
  if (!experience) return { ok: false, error: "Say how much the athlete has lifted." };

  const athleteEmailRaw = text(body.athleteEmail, 254).toLowerCase();
  const parentEmail = text(body.parentEmail, 254).toLowerCase();
  if (!EMAIL.test(parentEmail)) {
    return { ok: false, error: role === "parent" ? "Add your email." : "Add a parent's email." };
  }
  if (role === "athlete" && !EMAIL.test(athleteEmailRaw)) return { ok: false, error: "Add your email." };
  if (athleteEmailRaw && !EMAIL.test(athleteEmailRaw)) {
    return { ok: false, error: "Fix the athlete's email or leave it blank." };
  }

  const intent = body.intent === "reserve" ? "reserve" : "updates";
  const source = text(body.source, 100) || undefined;

  return {
    ok: true,
    value: {
      role,
      athleteName,
      athleteAge,
      sport,
      test,
      testDate,
      experience,
      athleteEmail: athleteEmailRaw || undefined,
      parentEmail,
      intent,
      source,
    },
  };
}

const signupArgs = {
  role: v.union(v.literal("athlete"), v.literal("parent")),
  athleteName: v.string(),
  athleteAge: v.number(),
  sport: v.string(),
  test: v.union(
    v.literal("tryout"),
    v.literal("beep"),
    v.literal("mile"),
    v.literal("academy"),
    v.literal("none")
  ),
  testDate: v.optional(v.string()),
  experience: v.union(v.literal("never"), v.literal("some"), v.literal("regular")),
  athleteEmail: v.optional(v.string()),
  parentEmail: v.string(),
  intent: v.union(v.literal("reserve"), v.literal("updates")),
  source: v.optional(v.string()),
};

/**
 * Save a cleaned sign-up. The same athlete (by name) under the same parent
 * email updates the existing row instead of adding a duplicate.
 */
export const record = internalMutation({
  args: signupArgs,
  handler: async (ctx, args) => {
    const now = Date.now();
    const sameParent = await ctx.db
      .query("waitlist_signups")
      .withIndex("by_parent_email", (q) => q.eq("parentEmail", args.parentEmail))
      .collect();
    const existing = sameParent.find(
      (row) => row.athleteName.toLowerCase() === args.athleteName.toLowerCase()
    );
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, updatedAt: now });
      return { id: existing._id, updated: true };
    }
    const id = await ctx.db.insert("waitlist_signups", { ...args, createdAt: now, updatedAt: now });
    return { id, updated: false };
  },
});
