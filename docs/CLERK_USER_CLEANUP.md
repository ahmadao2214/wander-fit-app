# Clerk User Cleanup

The Clerk **Development** instance (`electric-leopard-75`) is capped at 100 users. When it fills up,
every new sign-up fails. `scripts/clerk-cleanup.ts` finds and deletes junk users in bulk.

## Setup

Put the Development secret key (`sk_test_...`, from dashboard.clerk.com → WanderFit → Development →
API keys) in `.env.local` as `CLERK_SECRET_KEY`. `.env.local` is gitignored; never commit the key.
The script refuses to run with anything other than an `sk_test_` key.

## Usage

```bash
npx tsx scripts/clerk-cleanup.ts                     # dry run: table + count vs. the 100 cap
npx tsx scripts/clerk-cleanup.ts --delete            # delete every flagged user
npx tsx scripts/clerk-cleanup.ts --pick              # choose users by number ("1-5, 9" or "flagged")
npx tsx scripts/clerk-cleanup.ts --delete --keep cofounder@gmail.com
npx tsx scripts/clerk-cleanup.ts --delete --skip-convex-users   # leave users with Convex rows alone
npx tsx scripts/clerk-cleanup.ts --env-file ../wander-fit-app/.env.local
```

`--delete` and `--pick` always print the list first and only delete after you type the exact phrase
shown (e.g. `delete 37 users`). They need an interactive terminal.

Without a terminal (e.g. asking Claude Code from your phone): a dry run prints a confirmation code
for exactly the users `--delete` would remove with the same options, like `36-9f1c04ab`. Re-run with
the same options plus `--delete --confirm <code>`. It deletes only if the selection still produces
that code; if anyone signed up, signed in or got a Convex row in between, it refuses.

A user is flagged when any of these hold (logic in `lib/clerkCleanup.ts`):

| Reason | Rule |
|---|---|
| +clerk_test email | any address contains `+clerk_test` |
| test/disposable domain | `example.com/.net/.org`, `.test`/`.invalid`/`.localhost` TLDs, mailinator etc. |
| test-like email | local part has a whole word like `test`, `fake`, `dummy`, `demo`, `asdf` |
| never signed in | `last_sign_in_at` is null |
| no sign-in after sign-up | only sign-in was within 10 min of account creation |
| no verified email | no address has `verification.status === "verified"` |

Accounts younger than 24 h are never flagged for the two sign-in rules, so someone signing up right
now isn't caught. `claude-test-1792639039+clerk_test@example.com` (the shared automated-test account)
is always kept, as is anything passed with `--keep`.

## Convex rows left behind

Deleting a Clerk user does **not** delete its row in the Convex `users` table (there is no Clerk
webhook). The script reads the dev deployment's `users` table with `npx convex data users`
(read-only) and reports:

- which flagged / deleted Clerk users still have a Convex row (`Convex` column, and a list after deleting)
- Convex rows whose `clerkId` no longer exists in Clerk at all ("already orphaned")

It never modifies Convex.

### Proposed cleanup (not implemented yet)

Orphaned rows are harmless to sign-ups, so there's no rush. When we do clean them:

1. Back up the dev deployment: `npx convex export --path ./convex-backup.zip`.
2. Add an `internalMutation` (internal, so it can't be called from the app) that takes one `clerkId`
   and a `dryRun` flag, and **refuses** unless the `clerkId` is absent from Clerk (pass in the
   script's orphan list; don't trust a hand-typed id):

   ```ts
   export const deleteOrphanedUser = internalMutation({
     args: { clerkId: v.string(), dryRun: v.boolean() },
     handler: async (ctx, { clerkId, dryRun }) => {
       const user = await ctx.db.query("users").withIndex("by_clerk", (q) => q.eq("clerkId", clerkId)).first();
       if (!user) return null;
       // Trainer-owned data affects other users: stop and handle it by hand
       const trainerOwned =
         (await ctx.db.query("workouts").withIndex("by_trainer", (q) => q.eq("trainerId", user._id)).first()) ??
         (await ctx.db.query("users").withIndex("by_trainer", (q) => q.eq("trainerId", user._id)).first());
       if (trainerOwned) throw new Error(`${clerkId} owns trainer data; clean up manually`);
       const byUser = ["user_maxes", "intake_responses", "user_programs", "gpp_workout_sessions",
         "user_progress", "user_schedule_overrides"] as const;
       const docs = [
         ...(await Promise.all(byUser.map((t) =>
           ctx.db.query(t).withIndex("by_user", (q) => q.eq("userId", user._id)).collect()))).flat(),
         ...(await ctx.db.query("workouts").withIndex("by_client", (q) => q.eq("clientId", user._id)).collect()),
         ...(await ctx.db.query("workoutSessions").withIndex("by_client", (q) => q.eq("clientId", user._id)).collect()),
         ...(await ctx.db.query("trainerClientRelationships").withIndex("by_client", (q) => q.eq("clientId", user._id)).collect()),
       ];
       if (!dryRun) {
         for (const doc of docs) await ctx.db.delete(doc._id);
         await ctx.db.delete(user._id);
       }
       return { userId: user._id, dependentDocs: docs.length, dryRun };
     },
   });
   ```

3. Run it with `dryRun: true` for each orphan, review the counts, then with `dryRun: false`:
   `npx convex run admin:deleteOrphanedUser '{"clerkId":"user_...","dryRun":true}'`.
4. Longer term: add a Clerk `user.deleted` webhook (Convex HTTP action) so rows are removed automatically.
