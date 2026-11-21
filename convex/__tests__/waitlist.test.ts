import { convexTest } from "convex-test";
import schema from "../schema";
import { internal } from "../_generated/api";
import { cleanSignup } from "../waitlist";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();
const newTest = () => convexTest(schema, modules);

const TODAY = "2026-11-13";
const athlete = {
  role: "athlete",
  athleteName: "Maya",
  athleteAge: 15,
  sport: "Soccer",
  test: "tryout",
  testDate: "2027-02-06",
  experience: "never",
  athleteEmail: "Maya@Example.com",
  parentEmail: "parent@example.com",
  intent: "reserve",
  source: "westside-fc",
};

describe("cleanSignup", () => {
  it("accepts a complete athlete sign-up and normalizes emails", () => {
    const result = cleanSignup(athlete, TODAY);
    expect(result).toEqual({
      ok: true,
      value: { ...athlete, athleteEmail: "maya@example.com" },
    });
  });

  it("lets a parent sign up without the athlete's email", () => {
    const result = cleanSignup({ ...athlete, role: "parent", athleteEmail: "" }, TODAY);
    expect(result.ok && result.value.athleteEmail).toBe(undefined);
  });

  it("drops the date when there is no test yet", () => {
    const result = cleanSignup({ ...athlete, test: "none", testDate: "" }, TODAY);
    expect(result.ok && result.value.testDate).toBe(undefined);
  });

  it("defaults intent to updates", () => {
    const result = cleanSignup({ ...athlete, intent: "anything" }, TODAY);
    expect(result.ok && result.value.intent).toBe("updates");
  });

  const rejections: Array<[string, Record<string, unknown>, string]> = [
    ["under 13", { athleteAge: 12 }, "WanderFit is for athletes 13 and older."],
    ["no age", { athleteAge: "" }, "Add the athlete's age."],
    ["no name", { athleteName: "  " }, "Add the athlete's first name."],
    ["past date", { testDate: TODAY }, "Pick a test date after today."],
    ["impossible date", { testDate: "2027-02-30" }, "Pick a test date."],
    ["bad parent email", { parentEmail: "nope" }, "Add a parent's email."],
    ["athlete without own email", { athleteEmail: "" }, "Add your email."],
    ["unknown test", { test: "marathon" }, "Pick the kind of test."],
    ["unknown role", { role: "coach" }, "Say whether you're the athlete or a parent."],
  ];
  it.each(rejections)("rejects %s", (_label, change, error) => {
    expect(cleanSignup({ ...athlete, ...change }, TODAY)).toEqual({ ok: false, error });
  });

  it("flags the honeypot as spam", () => {
    expect(cleanSignup({ ...athlete, website: "http://spam" }, TODAY)).toEqual({ ok: false, spam: true });
  });

  it("caps long text", () => {
    const result = cleanSignup({ ...athlete, athleteName: "x".repeat(500) }, TODAY);
    expect(result.ok && result.value.athleteName.length).toBe(80);
  });
});

describe("waitlist.record", () => {
  it("updates the same athlete under the same parent instead of duplicating", async () => {
    const t = newTest();
    const value = (cleanSignup(athlete, TODAY) as { ok: true; value: any }).value;
    await t.mutation(internal.waitlist.record, value);
    const second = await t.mutation(internal.waitlist.record, { ...value, athleteName: "maya", sport: "Track" });
    await t.mutation(internal.waitlist.record, { ...value, athleteName: "Leo" });
    const rows = await t.run((ctx) => ctx.db.query("waitlist_signups").collect());
    expect(second.updated).toBe(true);
    expect(rows.map((r) => [r.athleteName, r.sport])).toEqual([
      ["maya", "Track"],
      ["Leo", "Soccer"],
    ]);
  });
});

describe("POST /waitlist", () => {
  const post = (t: ReturnType<typeof newTest>, body: string) =>
    t.fetch("/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body });

  it("saves a valid sign-up and allows cross-origin requests", async () => {
    const t = newTest();
    const res = await post(t, JSON.stringify({ ...athlete, testDate: "2099-02-06" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    const rows = await t.run((ctx) => ctx.db.query("waitlist_signups").collect());
    expect(rows.map((r) => r.parentEmail)).toEqual(["parent@example.com"]);
  });

  it("returns the validation message for a bad sign-up and saves nothing", async () => {
    const t = newTest();
    const res = await post(t, JSON.stringify({ ...athlete, athleteAge: 11 }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "WanderFit is for athletes 13 and older." });
    expect(await t.run((ctx) => ctx.db.query("waitlist_signups").collect())).toEqual([]);
  });

  it("answers spam like success but saves nothing", async () => {
    const t = newTest();
    const res = await post(t, JSON.stringify({ ...athlete, testDate: "2099-02-06", website: "x" }));
    expect(res.status).toBe(200);
    expect(await t.run((ctx) => ctx.db.query("waitlist_signups").collect())).toEqual([]);
  });

  it("rejects bodies that aren't JSON or are too large", async () => {
    const t = newTest();
    expect((await post(t, "not json")).status).toBe(400);
    expect((await post(t, JSON.stringify({ ...athlete, athleteName: "x".repeat(5000) }))).status).toBe(413);
  });

  it("answers the CORS preflight", async () => {
    const t = newTest();
    const res = await t.fetch("/waitlist", { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Methods")).toBe("POST, OPTIONS");
  });
});
