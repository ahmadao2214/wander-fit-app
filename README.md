# WanderFit

An off-season training app for athletes. An athlete tells it their sport, age group, experience and season dates; it builds a periodized program in three phases (GPP general preparation, SPP specific preparation, SSP sport-specific preparation), schedules the workouts on a calendar, and guides each session set by set.

Everyone who signs up is an athlete. The earlier trainer/client product (trainer dashboards, client invitations, trainer-built workouts) has been removed.

## Stack

| | |
|---|---|
| App | Expo SDK 58, React Native 0.88, React 19.3, Expo Router |
| UI | Tamagui v4 config (shorthand props only), lucide icons, Bebas Neue + Plus Jakarta Sans |
| Backend | Convex (queries, mutations, scheduled data) |
| Auth | Clerk (`@clerk/clerk-expo`), token passed to Convex |
| Tests | Jest (node + react-native projects), Maestro for journeys |
| Package manager | Bun (`bun.lock`) |

## How a user moves through the app

1. **Sign in / sign up** (`app/(auth)`). A new account gets a Convex `users` row.
2. **Intake + onboarding** (`app/(intake)`, `app/(onboarding)`), one combined flow: sport, why it works, age group, experience, training days, season timeline, 1RM maxes, results, commitment. The order lives in `COMBINED_FLOW_ROUTES` in `components/IntakeProgressDots.tsx`.
3. **Athlete tabs** (`app/(athlete)`): Today, Program (week/month calendar with drag-to-reschedule), History, Profile, plus workout detail, execution and Training Science.
4. **Reassessment** (`app/(reassessment)`) at the end of a phase, before the next one unlocks.

Routing between these is decided in `app/index.tsx` and the guards in `components/AuthGuard.tsx`.

### Age groups

Youth 14–17, Performance 18–35, Vitality 36+ (`"14-17" | "18-35" | "36+"`). Records written before these groups existed may still say `"10-13"` or `"18+"`; `normalizeAgeGroup` in `convex/intensityScaling.ts` maps them on read and `convex/migrations` rewrites them.

### Core lifts

1RM is tracked for Back Squat, Bench Press and Trap Bar Deadlift (`CORE_LIFT_SLUGS` in `convex/userMaxes.ts`).

## Project layout

```
app/            Expo Router screens (route groups above)
components/     Shared UI: calendar/, workout/, onboarding/, training-science/
convex/         Schema, queries, mutations, seed data, migrations
hooks/          useAuth, drag reorder, swipe navigation, onboarding analytics
lib/            Pure logic (calendar, scheduling, intake UI, workout math), unit tested
.maestro/       Journey flows (web and native)
scripts/        verify/ (E2E runner), sim/ (simulator self-check), Clerk cleanup
docs/           Design notes and plans
```

## Setup

```bash
bun install
npx convex dev          # first run links a Convex deployment and writes .env.local
bun run start           # Expo dev server
```

`.env.local` needs `EXPO_PUBLIC_CONVEX_URL` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. Seed reference data (sports, exercises, templates) with the internal functions in `convex/seed.ts` from the Convex dashboard.

## Checks

```bash
bun run test:ci      # Jest, both projects; CI blocks on it
bun run typecheck    # tsc --noEmit; CI blocks on it
```

Testing rules (where tests go, mocks, Maestro journeys, the simulator self-check) are in [AGENTS.md](AGENTS.md).

## Clerk user cleanup

The Clerk Development instance has a hard 100-user cap; once it's full, nobody can sign up.
To clear out test and abandoned accounts in bulk:

1. Add the Development secret key (`sk_test_...`, Clerk dashboard → WanderFit → Development → API keys) to `.env.local` as `CLERK_SECRET_KEY`. Never commit it.
2. `npx tsx scripts/clerk-cleanup.ts` does a dry run: it lists every user, flags likely junk (`+clerk_test` / `@example.com` / test-like emails, no sign-in after sign-up, no verified email) and shows the count against the cap.
3. `--delete` removes all flagged users, `--pick` lets you choose by number, and `--keep <email>` protects an account, and `--skip-convex-users` leaves anyone with a Convex `users` row alone. Both delete modes require typing a confirmation phrase.

`claude-test-1792639039+clerk_test@example.com` (shared automated-test account) is always kept. Deleting from Clerk leaves rows in the Convex `users` table; the script reports them but doesn't touch Convex. Details and the proposed Convex cleanup are in [docs/CLERK_USER_CLEANUP.md](docs/CLERK_USER_CLEANUP.md).
