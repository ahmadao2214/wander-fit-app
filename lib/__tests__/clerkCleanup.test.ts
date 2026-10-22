import { describe, it, expect } from "vitest";
import {
  NEW_ACCOUNT_GRACE_MS,
  PROTECTED_EMAILS,
  SIGN_UP_SESSION_WINDOW_MS,
  classifyUsers,
  confirmationPhrase,
  getFlagReasons,
  getPrimaryEmail,
  isClerkTestEmail,
  isDevelopmentSecretKey,
  isKept,
  isTestDomain,
  isTestPatternEmail,
  parseCleanupArgs,
  parseEnvLine,
  parseJsonLines,
  parseSelection,
  sameDocumentIds,
  type ClerkUser,
} from "../clerkCleanup";

const NOW = Date.UTC(2026, 9, 22);
const DAY = 24 * 60 * 60 * 1000;

function makeUser(overrides: Partial<ClerkUser> & { email?: string; verified?: boolean } = {}): ClerkUser {
  const { email = "real.person@gmail.com", verified = true, ...rest } = overrides;
  const createdAt = NOW - 30 * DAY;
  return {
    id: `user_${email}`,
    email_addresses: [
      { id: "idn_1", email_address: email, verification: { status: verified ? "verified" : "unverified" } },
    ],
    primary_email_address_id: "idn_1",
    created_at: createdAt,
    last_sign_in_at: createdAt + 5 * DAY,
    ...rest,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

describe("email pattern detection", () => {
  it("detects +clerk_test emails case-insensitively", () => {
    expect(isClerkTestEmail("someone+clerk_test@gmail.com")).toBe(true);
    expect(isClerkTestEmail("Someone+CLERK_TEST@gmail.com")).toBe(true);
    expect(isClerkTestEmail("someone@gmail.com")).toBe(false);
  });

  it("detects reserved and disposable test domains", () => {
    expect(isTestDomain("a@example.com")).toBe(true);
    expect(isTestDomain("a@mail.example.org")).toBe(true);
    expect(isTestDomain("a@foo.test")).toBe(true);
    expect(isTestDomain("a@mailinator.com")).toBe(true);
    expect(isTestDomain("a@gmail.com")).toBe(false);
    expect(isTestDomain("a@notexample.com")).toBe(false);
  });

  it("detects whole-word test markers in the local part", () => {
    expect(isTestPatternEmail("test@gmail.com")).toBe(true);
    expect(isTestPatternEmail("test123@gmail.com")).toBe(true);
    expect(isTestPatternEmail("john.test@gmail.com")).toBe(true);
    expect(isTestPatternEmail("john+fake2@gmail.com")).toBe(true);
    expect(isTestPatternEmail("asdf@yahoo.com")).toBe(true);
  });

  it("does not flag words that merely contain 'test'", () => {
    expect(isTestPatternEmail("contest.winner@gmail.com")).toBe(false);
    expect(isTestPatternEmail("attested@gmail.com")).toBe(false);
    expect(isTestPatternEmail("demonstrate@gmail.com")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FLAG REASONS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getFlagReasons", () => {
  it("returns no reasons for an active, verified, real-looking user", () => {
    expect(getFlagReasons(makeUser(), NOW)).toEqual([]);
  });

  it("flags +clerk_test@example.com once for the pattern and once for the domain", () => {
    const reasons = getFlagReasons(makeUser({ email: "x+clerk_test@example.com" }), NOW);
    expect(reasons).toContain("clerk_test_email");
    expect(reasons).toContain("test_domain");
    expect(reasons).not.toContain("test_pattern");
  });

  it("flags users who never signed in", () => {
    expect(getFlagReasons(makeUser({ last_sign_in_at: null }), NOW)).toEqual(["never_signed_in"]);
  });

  it("flags users whose only sign-in was the sign-up session", () => {
    const createdAt = NOW - 10 * DAY;
    const user = makeUser({ created_at: createdAt, last_sign_in_at: createdAt + 30_000 });
    expect(getFlagReasons(user, NOW)).toEqual(["no_sign_in_after_sign_up"]);
  });

  it("does not flag a sign-in just outside the sign-up window", () => {
    const createdAt = NOW - 10 * DAY;
    const user = makeUser({ created_at: createdAt, last_sign_in_at: createdAt + SIGN_UP_SESSION_WINDOW_MS + 1 });
    expect(getFlagReasons(user, NOW)).toEqual([]);
  });

  it("never flags brand-new accounts for inactivity", () => {
    const user = makeUser({ created_at: NOW - NEW_ACCOUNT_GRACE_MS + 1000, last_sign_in_at: null });
    expect(getFlagReasons(user, NOW)).toEqual([]);
  });

  it("flags users with no verified email", () => {
    expect(getFlagReasons(makeUser({ verified: false }), NOW)).toEqual(["no_verified_email"]);
  });

  it("flags users with no email addresses at all", () => {
    const user = makeUser({ email_addresses: [], primary_email_address_id: null });
    expect(getFlagReasons(user, NOW)).toEqual(["no_verified_email"]);
  });

  it("checks secondary email addresses too", () => {
    const user = makeUser();
    user.email_addresses.push({ id: "idn_2", email_address: "x@example.com", verification: null });
    expect(getFlagReasons(user, NOW)).toEqual(["test_domain"]);
  });
});

describe("getPrimaryEmail", () => {
  it("prefers the primary address and falls back to the first one", () => {
    const user = makeUser({ email: "first@gmail.com" });
    user.email_addresses.push({ id: "idn_2", email_address: "primary@gmail.com", verification: null });
    expect(getPrimaryEmail({ ...user, primary_email_address_id: "idn_2" })).toBe("primary@gmail.com");
    expect(getPrimaryEmail({ ...user, primary_email_address_id: null })).toBe("first@gmail.com");
    expect(getPrimaryEmail(makeUser({ email_addresses: [] }))).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("classifyUsers", () => {
  const sharedTestAccount = makeUser({ email: "claude-test-1792639039+clerk_test@example.com", last_sign_in_at: null });

  it("always keeps the shared automated-test account even though it matches every pattern", () => {
    expect(PROTECTED_EMAILS).toContain("claude-test-1792639039+clerk_test@example.com");
    expect(isKept(sharedTestAccount)).toBe(true);

    const result = classifyUsers([sharedTestAccount], { now: NOW });
    expect(result.flagged).toHaveLength(0);
    expect(result.kept.map((k) => k.email)).toEqual(["claude-test-1792639039+clerk_test@example.com"]);
  });

  it("keeps --keep emails case-insensitively", () => {
    const junk = makeUser({ email: "Cofounder+Test@Gmail.com" });
    const result = classifyUsers([junk], { keep: ["cofounder+test@gmail.com"], now: NOW });
    expect(result.kept).toHaveLength(1);
    expect(result.flagged).toHaveLength(0);
  });

  it("splits flagged and clean users and sorts flagged by reason count, then age", () => {
    const real = makeUser({ email: "real@gmail.com" });
    const oneReasonOld = makeUser({ email: "old@gmail.com", created_at: NOW - 60 * DAY, last_sign_in_at: null });
    const oneReasonNew = makeUser({ email: "new@gmail.com", created_at: NOW - 5 * DAY, last_sign_in_at: null });
    const manyReasons = makeUser({ email: "test@example.com", verified: false, last_sign_in_at: null });

    const result = classifyUsers([real, oneReasonNew, manyReasons, oneReasonOld, sharedTestAccount], { now: NOW });

    expect(result.clean.map((c) => c.email)).toEqual(["real@gmail.com"]);
    expect(result.flagged.map((f) => f.email)).toEqual(["test@example.com", "old@gmail.com", "new@gmail.com"]);
    expect(result.kept).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("parseCleanupArgs", () => {
  it("defaults to a dry run against .env.local", () => {
    expect(parseCleanupArgs([])).toEqual({
      mode: "dry-run",
      keep: [],
      envFile: ".env.local",
      skipConvexUsers: false,
      help: false,
    });
  });

  it("parses --skip-convex-users", () => {
    expect(parseCleanupArgs(["--delete", "--skip-convex-users"]).skipConvexUsers).toBe(true);
  });

  it("parses --delete, --pick and repeated --keep", () => {
    expect(parseCleanupArgs(["--delete"]).mode).toBe("delete");
    expect(parseCleanupArgs(["--pick"]).mode).toBe("pick");
    expect(parseCleanupArgs(["--delete", "--pick"]).mode).toBe("pick");
    expect(parseCleanupArgs(["--pick", "--delete"]).mode).toBe("pick");
    expect(parseCleanupArgs(["--keep", "A@B.com", "--keep", "c@d.com"]).keep).toEqual(["a@b.com", "c@d.com"]);
  });

  it("rejects unknown flags and missing values", () => {
    expect(() => parseCleanupArgs(["--force"])).toThrow("Unknown argument");
    expect(() => parseCleanupArgs(["--keep"])).toThrow("needs a value");
    expect(() => parseCleanupArgs(["--keep", "--delete"])).toThrow("needs a value");
  });
});

describe("parseSelection", () => {
  it("parses numbers and ranges into sorted unique indexes", () => {
    expect(parseSelection("3, 1-2 2 5", 5)).toEqual([1, 2, 3, 5]);
  });

  it("rejects out-of-range, reversed, empty and garbage input", () => {
    expect(() => parseSelection("0", 5)).toThrow("out of range");
    expect(() => parseSelection("6", 5)).toThrow("out of range");
    expect(() => parseSelection("4-2", 5)).toThrow("out of range");
    expect(() => parseSelection("  ", 5)).toThrow("Nothing selected");
    expect(() => parseSelection("all", 5)).toThrow("Can't read");
  });
});

describe("confirmationPhrase", () => {
  it("includes the exact count", () => {
    expect(confirmationPhrase(1)).toBe("delete 1 user");
    expect(confirmationPhrase(37)).toBe("delete 37 users");
  });
});

describe("parseEnvLine", () => {
  it("parses plain, exported and quoted values", () => {
    expect(parseEnvLine("FOO=bar")).toEqual({ key: "FOO", value: "bar" });
    expect(parseEnvLine("export FOO = bar ")).toEqual({ key: "FOO", value: "bar" });
    expect(parseEnvLine('FOO="a # not a comment"')).toEqual({ key: "FOO", value: "a # not a comment" });
  });

  it("strips inline comments like the one Convex writes after CONVEX_DEPLOYMENT", () => {
    expect(parseEnvLine("CONVEX_DEPLOYMENT=dev:some-name-123 # team: x, project: y")).toEqual({
      key: "CONVEX_DEPLOYMENT",
      value: "dev:some-name-123",
    });
  });

  it("ignores blank lines and comments", () => {
    expect(parseEnvLine("")).toBeNull();
    expect(parseEnvLine("# Clerk")).toBeNull();
  });
});

describe("parseJsonLines", () => {
  it("parses one document per line and skips non-JSON lines", () => {
    const text = '{"_id":"a","clerkId":"user_1"}\n{"_id":"b","clerkId":"user_2"}\n\nsome notice\n';
    expect(parseJsonLines(text)).toEqual([
      { _id: "a", clerkId: "user_1" },
      { _id: "b", clerkId: "user_2" },
    ]);
  });

  it("returns null when a line was cut off mid-document", () => {
    expect(parseJsonLines('{"_id":"a","clerkId":"user_1"}\n{"_id":"b","clerkId":"us')).toBeNull();
  });
});

describe("sameDocumentIds", () => {
  it("matches reads with the same ids in any order", () => {
    expect(sameDocumentIds([{ _id: "a" }, { _id: "b" }], [{ _id: "b" }, { _id: "a" }])).toBe(true);
  });

  it("rejects a shorter or different read", () => {
    expect(sameDocumentIds([{ _id: "a" }, { _id: "b" }], [{ _id: "a" }])).toBe(false);
    expect(sameDocumentIds([{ _id: "a" }, { _id: "b" }], [{ _id: "a" }, { _id: "c" }])).toBe(false);
  });
});

describe("isDevelopmentSecretKey", () => {
  it("only accepts sk_test_ keys", () => {
    expect(isDevelopmentSecretKey("sk_test_abc")).toBe(true);
    expect(isDevelopmentSecretKey("sk_live_abc")).toBe(false);
    expect(isDevelopmentSecretKey("pk_test_abc")).toBe(false);
    expect(isDevelopmentSecretKey(undefined)).toBe(false);
  });
});
