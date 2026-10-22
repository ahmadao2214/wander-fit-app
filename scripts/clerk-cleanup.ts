/**
 * Clerk Development user cleanup.
 *
 *   npx tsx scripts/clerk-cleanup.ts                  # dry run (default): list users, flag junk
 *   npx tsx scripts/clerk-cleanup.ts --delete         # delete all flagged users (typed confirmation)
 *   npx tsx scripts/clerk-cleanup.ts --pick           # choose users to delete by number (typed confirmation)
 *   npx tsx scripts/clerk-cleanup.ts --keep a@b.com   # never flag/delete this email (repeatable)
 *   npx tsx scripts/clerk-cleanup.ts --delete --skip-convex-users  # don't delete users that have Convex rows
 *   npx tsx scripts/clerk-cleanup.ts --env-file path  # where CLERK_SECRET_KEY / CONVEX_DEPLOYMENT live (default .env.local)
 *
 * Only Development keys (sk_test_...) are accepted. Convex rows are reported, never touched.
 * See docs/CLERK_USER_CLEANUP.md.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import {
  CLERK_DEV_USER_CAP,
  PROTECTED_EMAILS,
  REASON_LABELS,
  classifyUsers,
  confirmationPhrase,
  isDevelopmentSecretKey,
  parseCleanupArgs,
  parseEnvLine,
  parseSelection,
  type ClassifiedUser,
  type ClerkUser,
} from "../lib/clerkCleanup";

const CLERK_API = "https://api.clerk.com/v1";
const PAGE_SIZE = 500;
// `convex data` rejects limits much above this ("Requested too many items")
const CONVEX_ROW_LIMIT = 8000;

interface ConvexUserRow {
  _id: string;
  clerkId: string;
  email: string;
}

// ─── env ──────────────────────────────────────────────────────────────────────

/** Minimal .env parser; values are loaded into process.env and never printed */
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const entry = parseEnvLine(line);
    if (!entry || process.env[entry.key] !== undefined) continue;
    process.env[entry.key] = entry.value;
  }
}

// ─── Clerk ────────────────────────────────────────────────────────────────────

async function clerkRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${CLERK_API}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`, ...init.headers },
    });
    if (res.status === 429 && attempt < 5) {
      const waitSeconds = Number(res.headers.get("retry-after")) || 2 ** attempt;
      await new Promise((r) => setTimeout(r, waitSeconds * 1000));
      continue;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { errors?: { message: string }[] } | null;
      const message = body?.errors?.map((e) => e.message).join("; ") ?? res.statusText;
      throw new Error(`Clerk ${init.method ?? "GET"} ${path} failed (${res.status}): ${message}`);
    }
    return (await res.json()) as T;
  }
}

async function listAllUsers(): Promise<ClerkUser[]> {
  const users: ClerkUser[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = await clerkRequest<ClerkUser[]>(
      `/users?limit=${PAGE_SIZE}&offset=${offset}&order_by=created_at`
    );
    users.push(...page);
    if (page.length < PAGE_SIZE) return users;
  }
}

// ─── Convex (read-only) ───────────────────────────────────────────────────────

/**
 * Reads the dev deployment's users table via the Convex CLI; null if unavailable.
 * CONVEX_DEPLOYMENT comes from the env file we already loaded. Don't pass the CLI
 * --env-file: in convex 1.27 that skips the saved login and fails with MissingAccessToken.
 */
function loadConvexUsers(): ConvexUserRow[] | null {
  const result = spawnSync(
    "npx",
    ["convex", "data", "users", "--limit", String(CONVEX_ROW_LIMIT), "--format", "jsonLines"],
    { encoding: "utf8", env: process.env, maxBuffer: 64 * 1024 * 1024 }
  );
  if (result.status !== 0) {
    console.warn(`⚠️  Couldn't read Convex users table (skipping Convex check): ${result.stderr.trim().split("\n").pop()}`);
    return null;
  }
  const rows = result.stdout
    .split("\n")
    .filter((line) => line.trim().startsWith("{"))
    .map((line) => JSON.parse(line) as ConvexUserRow);
  if (rows.length >= CONVEX_ROW_LIMIT) {
    console.warn(`⚠️  Convex users table has ${CONVEX_ROW_LIMIT}+ rows; Convex results may be incomplete.`);
  }
  return rows;
}

// ─── output ───────────────────────────────────────────────────────────────────

function formatDate(ms: number | null): string {
  return ms == null ? "never" : new Date(ms).toISOString().slice(0, 16).replace("T", " ");
}

function printTable(rows: ClassifiedUser[], convexClerkIds: Set<string> | null, numbered = false) {
  const header = [numbered ? "#" : "", "Email", "Created", "Last sign-in", "Convex", "Flagged because"];
  const lines = rows.map((row, i) => [
    numbered ? String(i + 1) : "",
    row.email ?? `(no email) ${row.user.id}`,
    formatDate(row.user.created_at),
    formatDate(row.user.last_sign_in_at),
    convexClerkIds == null ? "?" : convexClerkIds.has(row.user.id) ? "row" : "-",
    row.reasons.map((r) => REASON_LABELS[r]).join(", ") || "-",
  ]);
  const columns = header.map((_, c) => c).filter((c) => numbered || c !== 0);
  const widths = columns.map((c) => Math.max(header[c].length, ...lines.map((l) => l[c].length)));
  const format = (cells: string[]) => columns.map((c, i) => cells[c].padEnd(widths[i])).join("  ");

  console.log(format(header));
  console.log(widths.map((w) => "─".repeat(w)).join("  "));
  for (const line of lines) console.log(format(line));
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseCleanupArgs(process.argv.slice(2));
  if (args.help) {
    console.log(readFileSync(__filename, "utf8").split("*/")[0]);
    return;
  }

  const envFile = resolve(process.cwd(), args.envFile);
  loadEnvFile(envFile);
  if (!isDevelopmentSecretKey(process.env.CLERK_SECRET_KEY)) {
    throw new Error(
      `CLERK_SECRET_KEY in ${envFile} is missing or not a Development key (sk_test_...). Refusing to run.`
    );
  }

  console.log("Fetching Clerk users…");
  const users = await listAllUsers();
  const { flagged, clean, kept } = classifyUsers(users, { keep: args.keep });

  const convexUsers = loadConvexUsers();
  const convexByClerkId = new Map((convexUsers ?? []).map((row) => [row.clerkId, row]));
  const convexClerkIds = convexUsers ? new Set(convexByClerkId.keys()) : null;
  if (args.skipConvexUsers && !convexUsers) {
    throw new Error("--skip-convex-users needs the Convex users table, which couldn't be read. Nothing deleted.");
  }

  console.log(`\nClerk users: ${users.length} / ${CLERK_DEV_USER_CAP} cap (${CLERK_DEV_USER_CAP - users.length} free)`);
  console.log(`Flagged: ${flagged.length}   Look real: ${clean.length}   Kept: ${kept.length}\n`);

  if (args.mode === "pick") {
    // One numbered list so every non-kept user is pickable
    console.log("USERS (flagged first)");
    printTable([...flagged, ...clean], convexClerkIds, true);
  } else {
    if (flagged.length > 0) {
      console.log("FLAGGED");
      printTable(flagged, convexClerkIds);
    }
    if (clean.length > 0) {
      console.log("\nNOT FLAGGED");
      printTable(clean, convexClerkIds);
    }
  }
  if (kept.length > 0) {
    console.log(`\nKEPT (never deleted): ${kept.map((k) => k.email).join(", ")}`);
  }
  for (const email of [...PROTECTED_EMAILS, ...args.keep]) {
    if (!kept.some((k) => k.user.email_addresses.some((e) => e.email_address.toLowerCase() === email))) {
      console.log(`  note: keep email ${email} matched no Clerk user`);
    }
  }

  if (convexUsers) {
    const clerkIds = new Set(users.map((u) => u.id));
    const orphans = convexUsers.filter((row) => !clerkIds.has(row.clerkId));
    console.log(`\nConvex users rows: ${convexUsers.length}. Already orphaned (no Clerk user): ${orphans.length}`);
    for (const row of orphans) console.log(`  ${row.email}  clerkId=${row.clerkId}  _id=${row._id}`);
  }

  if (args.mode === "dry-run") {
    console.log("\nDry run: nothing was deleted. Re-run with --delete (all flagged) or --pick (choose).");
    return;
  }

  if (!process.stdin.isTTY) throw new Error("--delete / --pick need an interactive terminal.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    let targets = flagged;
    if (args.mode === "pick") {
      const pickable = [...flagged, ...clean];
      const answer = await rl.question(
        `\nWhich users to delete? Numbers/ranges like "1-5, 9", "flagged" for #1-${flagged.length}, blank to cancel: `
      );
      if (!answer.trim()) return console.log("Cancelled. Nothing deleted.");
      targets =
        answer.trim().toLowerCase() === "flagged"
          ? flagged
          : parseSelection(answer, pickable.length).map((n) => pickable[n - 1]);
    }
    if (args.skipConvexUsers) {
      const withRows = targets.filter((t) => convexByClerkId.has(t.user.id));
      if (withRows.length > 0) {
        console.log(`\nSkipping ${withRows.length} user(s) that still have Convex rows (--skip-convex-users).`);
      }
      targets = targets.filter((t) => !convexByClerkId.has(t.user.id));
    }
    if (targets.length === 0) return console.log("\nNothing to delete.");

    console.log(`\nAbout to permanently delete ${targets.length} Clerk user(s):`);
    for (const t of targets) console.log(`  - ${t.email ?? t.user.id}`);
    const phrase = confirmationPhrase(targets.length);
    const typed = await rl.question(`\nType "${phrase}" to confirm: `);
    if (typed.trim() !== phrase) return console.log("Confirmation didn't match. Nothing deleted.");

    const deleted: ClassifiedUser[] = [];
    for (const t of targets) {
      try {
        await clerkRequest(`/users/${t.user.id}`, { method: "DELETE" });
        deleted.push(t);
        console.log(`  ✓ deleted ${t.email ?? t.user.id}`);
      } catch (error) {
        console.error(`  ✗ ${t.email ?? t.user.id}: ${(error as Error).message}`);
      }
    }
    console.log(`\nDeleted ${deleted.length}/${targets.length}. Clerk users now: ${users.length - deleted.length} / ${CLERK_DEV_USER_CAP}`);

    const leftBehind = deleted.filter((d) => convexByClerkId.has(d.user.id));
    if (convexUsers && leftBehind.length > 0) {
      console.log(`\n${leftBehind.length} deleted user(s) still have Convex users rows (not touched):`);
      for (const d of leftBehind) {
        const row = convexByClerkId.get(d.user.id)!;
        console.log(`  ${d.email}  clerkId=${d.user.id}  _id=${row._id}`);
      }
      console.log("See docs/CLERK_USER_CLEANUP.md for the proposed Convex cleanup.");
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(`\n${(error as Error).message}`);
  process.exit(1);
});
