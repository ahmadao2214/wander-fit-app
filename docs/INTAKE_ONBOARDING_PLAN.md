# Intake + Onboarding Flow

How a new athlete gets from sign-up to the Today tab. This replaces the original plan from PR #37: the trimming and interleaving it proposed are done, and the screens it proposed removing are gone.

## The combined flow

One flow across two route groups, `app/(intake)/` and `app/(onboarding)/`. The progress dots and back navigation use `COMBINED_FLOW_ROUTES` in `components/IntakeProgressDots.tsx`, which is the source of truth for the order.

| # | Route | What the athlete does |
|---|-------|-----------------------|
| 0 | `(intake)/sport` | Picks a sport, which sets the GPP category |
| 1 | `(onboarding)/why-it-works` | Reads how the three phases work |
| 2 | `(intake)/age-group` | Picks an age group (below) |
| 3 | `(intake)/experience-years` | Sets years of training for the sport |
| 4 | `(intake)/training-days` | Sets training days per week |
| 5 | `(intake)/season-timeline` | Sets weeks until the season |
| 6 | `(intake)/maxes` | Optionally enters 1RMs for the core lifts |
| 7 | `(intake)/results` | Sees the assigned category and program summary |
| 8 | `(onboarding)/commitment` | Commits to the program, then lands on Today |

`(onboarding)/index` forwards to `why-it-works`. It serves revisit mode (`resetOnboardingForRevisit` in `convex/onboarding.ts`), which nothing in the app calls today.

## Age groups

| Value | Label | Ages |
|-------|-------|------|
| `14-17` | Youth | 14–17 |
| `18-35` | Performance | 18–35 |
| `36+` | Vitality | 36+ |

There is no 10–13 group. Older records may hold `"10-13"` or `"18+"`; `normalizeAgeGroup` (`convex/intensityScaling.ts`) maps them to `14-17` and `18-35` when read, and `convex/migrations` rewrites them.

## Category colors

| Category | Token |
|----------|-------|
| 1 Endurance | `$catEndurance` |
| 2 Power | `$catPower` |
| 3 Rotation | `$catRotation` |
| 4 Strength | `$catStrength` |

## State

On the `users` row:

- `intakeCompletedAt`: set by `userPrograms.completeIntake`, which also creates the program.
- `onboardingCompletedAt`: set when onboarding is completed or skipped.
- `onboardingProgress`: index into `ONBOARDING_SCREENS` (`lib/onboarding.ts`). That list keeps the nine original screen IDs in order because stored progress and analytics events use the positions, even though only `why-it-works` and `commitment` still have routes.

`convex/onboarding.ts` owns the mutations (start, advance, skip, complete, reset for revisit). `hooks/useAuth.ts` exposes `needsIntake` and `needsOnboarding`, and `app/index.tsx` routes on them.

## Open

The intake look and feel is being redesigned separately (the First Run work). Update this doc with that redesign.
