/**
 * Clerk User Cleanup Logic
 *
 * Pure functions used by scripts/clerk-cleanup.ts to decide which Clerk users
 * look like junk (test sign-ups, abandoned accounts) on the Development
 * instance, which is capped at 100 users. Kept free of I/O so it can be tested.
 */

/** Hard user cap on Clerk Development instances */
export const CLERK_DEV_USER_CAP = 100;

/** Accounts that must never be flagged or deleted */
export const PROTECTED_EMAILS = [
  "claude-test-1792639039+clerk_test@example.com",
];

/**
 * Completing sign-up creates a session, so Clerk sets last_sign_in_at a few
 * seconds after created_at. A sign-in within this window is the sign-up itself.
 */
export const SIGN_UP_SESSION_WINDOW_MS = 10 * 60 * 1000;

/** Accounts younger than this are never flagged for inactivity (e.g. someone signing up right now) */
export const NEW_ACCOUNT_GRACE_MS = 24 * 60 * 60 * 1000;

const RESERVED_TEST_DOMAINS = ["example.com", "example.net", "example.org"];
const RESERVED_TEST_TLDS = ["test", "example", "invalid", "localhost"];
const DISPOSABLE_DOMAINS = [
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "temp-mail.org",
  "sharklasers.com",
];
// Whole-word test markers in the local part: "test@", "john.test2@", "qa+fake@" (but not "contest@")
const TEST_LOCAL_PART = /(^|[^a-z])(test|testing|tester|fake|dummy|demo|asdf|qwerty|temp|throwaway)\d*($|[^a-z])/i;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Subset of the Clerk Backend API user object that we rely on */
export interface ClerkEmailAddress {
  id: string;
  email_address: string;
  verification: { status: string } | null;
}

export interface ClerkUser {
  id: string;
  email_addresses: ClerkEmailAddress[];
  primary_email_address_id: string | null;
  created_at: number;
  last_sign_in_at: number | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
}

export type FlagReason =
  | "clerk_test_email"
  | "test_domain"
  | "test_pattern"
  | "never_signed_in"
  | "no_sign_in_after_sign_up"
  | "no_verified_email";

export const REASON_LABELS: Record<FlagReason, string> = {
  clerk_test_email: "+clerk_test email",
  test_domain: "test/disposable domain",
  test_pattern: "test-like email",
  never_signed_in: "never signed in",
  no_sign_in_after_sign_up: "no sign-in after sign-up",
  no_verified_email: "no verified email",
};

export interface ClassifiedUser {
  user: ClerkUser;
  email: string | null;
  reasons: FlagReason[];
}

export interface Classification {
  flagged: ClassifiedUser[];
  clean: ClassifiedUser[];
  /** PROTECTED_EMAILS plus anything passed via --keep */
  kept: ClassifiedUser[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLAGGING
// ═══════════════════════════════════════════════════════════════════════════════

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Primary email, falling back to the first address on the account */
export function getPrimaryEmail(user: ClerkUser): string | null {
  const primary = user.email_addresses.find((e) => e.id === user.primary_email_address_id);
  return (primary ?? user.email_addresses[0])?.email_address ?? null;
}

function getDomain(email: string): string {
  return normalizeEmail(email).split("@")[1] ?? "";
}

function getLocalPart(email: string): string {
  return normalizeEmail(email).split("@")[0] ?? "";
}

export function isClerkTestEmail(email: string): boolean {
  return normalizeEmail(email).includes("+clerk_test");
}

export function isTestDomain(email: string): boolean {
  const domain = getDomain(email);
  if (!domain) return false;
  const matchesDomain = (d: string) => domain === d || domain.endsWith(`.${d}`);
  const tld = domain.split(".").pop() ?? "";
  return (
    RESERVED_TEST_DOMAINS.some(matchesDomain) ||
    DISPOSABLE_DOMAINS.some(matchesDomain) ||
    RESERVED_TEST_TLDS.includes(tld)
  );
}

export function isTestPatternEmail(email: string): boolean {
  return TEST_LOCAL_PART.test(getLocalPart(email));
}

/** Every reason this user looks like junk; empty means it looks like a real user */
export function getFlagReasons(user: ClerkUser, now: number = Date.now()): FlagReason[] {
  const reasons: FlagReason[] = [];
  const emails = user.email_addresses.map((e) => e.email_address);

  if (emails.some(isClerkTestEmail)) {
    reasons.push("clerk_test_email");
  } else if (emails.some(isTestPatternEmail)) {
    // +clerk_test already implies a test pattern, so only report one of them
    reasons.push("test_pattern");
  }
  if (emails.some(isTestDomain)) reasons.push("test_domain");

  const isNewAccount = now - user.created_at < NEW_ACCOUNT_GRACE_MS;
  if (!isNewAccount) {
    if (user.last_sign_in_at == null) {
      reasons.push("never_signed_in");
    } else if (user.last_sign_in_at - user.created_at <= SIGN_UP_SESSION_WINDOW_MS) {
      reasons.push("no_sign_in_after_sign_up");
    }
  }

  if (!user.email_addresses.some((e) => e.verification?.status === "verified")) {
    reasons.push("no_verified_email");
  }

  return reasons;
}

/** True if any of the user's emails is protected or in the keep list */
export function isKept(user: ClerkUser, keep: string[] = []): boolean {
  const keepSet = new Set([...PROTECTED_EMAILS, ...keep].map(normalizeEmail));
  return user.email_addresses.some((e) => keepSet.has(normalizeEmail(e.email_address)));
}

/**
 * Split users into flagged / clean / kept. Flagged users are sorted with the
 * most reasons first, then oldest first.
 */
export function classifyUsers(
  users: ClerkUser[],
  options: { keep?: string[]; now?: number } = {}
): Classification {
  const now = options.now ?? Date.now();
  const result: Classification = { flagged: [], clean: [], kept: [] };

  for (const user of users) {
    const entry: ClassifiedUser = {
      user,
      email: getPrimaryEmail(user),
      reasons: getFlagReasons(user, now),
    };
    if (isKept(user, options.keep)) result.kept.push(entry);
    else if (entry.reasons.length > 0) result.flagged.push(entry);
    else result.clean.push(entry);
  }

  result.flagged.sort(
    (a, b) => b.reasons.length - a.reasons.length || a.user.created_at - b.user.created_at
  );
  result.clean.sort((a, b) => a.user.created_at - b.user.created_at);
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export type CleanupMode = "dry-run" | "delete" | "pick";

export interface CleanupArgs {
  mode: CleanupMode;
  keep: string[];
  envFile: string;
  /** Never delete users that still have a Convex users row */
  skipConvexUsers: boolean;
  help: boolean;
}

export function parseCleanupArgs(argv: string[]): CleanupArgs {
  const args: CleanupArgs = {
    mode: "dry-run",
    keep: [],
    envFile: ".env.local",
    skipConvexUsers: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const takeValue = () => {
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new Error(`${arg} needs a value`);
      return value;
    };

    if (arg === "--delete") args.mode = args.mode === "pick" ? "pick" : "delete";
    else if (arg === "--pick") args.mode = "pick";
    else if (arg === "--keep") args.keep.push(normalizeEmail(takeValue()));
    else if (arg === "--env-file") args.envFile = takeValue();
    else if (arg === "--skip-convex-users") args.skipConvexUsers = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

/**
 * Parse a pick-mode selection like "1-3, 7 9" into sorted 1-based indexes.
 * Throws on anything out of range or unparseable.
 */
export function parseSelection(input: string, max: number): number[] {
  const picked = new Set<number>();
  const tokens = input.split(/[\s,]+/).filter(Boolean);
  if (tokens.length === 0) throw new Error("Nothing selected");

  for (const token of tokens) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Can't read "${token}"`);
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (start < 1 || end > max || start > end) {
      throw new Error(`"${token}" is out of range (1-${max})`);
    }
    for (let n = start; n <= end; n++) picked.add(n);
  }

  return [...picked].sort((a, b) => a - b);
}

/** The exact text the user has to type before anything is deleted */
export function confirmationPhrase(count: number): string {
  return `delete ${count} ${count === 1 ? "user" : "users"}`;
}

/**
 * Parse one .env line: `KEY=value`, `export KEY="value"`, `KEY=value # comment`.
 * Returns null for blanks and comments.
 */
export function parseEnvLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
  if (!match) return null;
  const raw = match[2];
  const quoted = raw.match(/^(['"])(.*)\1$/);
  return { key: match[1], value: quoted ? quoted[2] : raw.replace(/\s+#.*$/, "") };
}

/**
 * Parse `convex data --format jsonLines` output. Returns null if any document
 * line is malformed (e.g. cut off mid-line) so callers never act on partial data.
 */
export function parseJsonLines<T>(text: string): T[] | null {
  const rows: T[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim().startsWith("{")) continue;
    try {
      rows.push(JSON.parse(line) as T);
    } catch {
      return null;
    }
  }
  return rows;
}

/** True if both reads contain exactly the same Convex documents */
export function sameDocumentIds(a: { _id: string }[], b: { _id: string }[]): boolean {
  if (a.length !== b.length) return false;
  const ids = new Set(a.map((row) => row._id));
  return b.every((row) => ids.has(row._id));
}

/** Only Development keys are allowed; this tool must never touch production */
export function isDevelopmentSecretKey(key: string | undefined): boolean {
  return typeof key === "string" && key.startsWith("sk_test_");
}
