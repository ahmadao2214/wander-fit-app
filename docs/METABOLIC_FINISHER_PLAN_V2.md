# Add Metabolic Finisher System

## What This PR Does

Adds a sport-category-aware metabolic finisher system that appends a structured conditioning block to the end of every main workout session (excluding recovery days). This is a core differentiating feature for WanderFit — it delivers sport-science expertise that athletes would otherwise need a specialized coach to access.

Finishers are determined by three inputs: the athlete's GPP Category (1–4), the day type (lower, upper, power, full body), and their current phase (GPP → SPP → SSP). All finishers default to bodyweight-compatible exercises.

## Design Decisions Locked In

| Decision | Resolution |
|---|---|
| Equipment | Bodyweight by default. Equipment upgrades (sled, carries) appear as optional notes only. |
| Skipping | Allowed, but always logged. A friction modal with coaching language discourages the habit. |
| Intensity scaling | Phase-progressive: GPP builds base, SPP transfers at higher intensity, SSP peaks at reduced volume. Week-level deload (week 4 = 0.7× volume) also applies. |
| Timer | FinisherSection owns its timer independently from the total workout timer. Five timer modes by format. |
| Sport language | Finisher names and on-screen descriptions use category-specific conditioning terminology, not generic format names. |

## Finisher Identity by Category

| Category | Sports | Finisher Name | Completion Message |
|---|---|---|---|
| 1 — Continuous | Soccer, Hockey, Lacrosse | "Field Conditioning" | "Field conditioning complete. Work rate banked." |
| 2 — Explosive | Basketball, Volleyball | "Court Conditioning" | "Court conditioning complete. Jump capacity built." |
| 3 — Rotational | Baseball, Tennis, Golf | "Rotational Conditioning" | "Rotational conditioning complete. Hip drive trained." |
| 4 — General Strength | Football, Wrestling | "Work Capacity" | "Work capacity complete. Grind banked." |

## Files to Create / Modify

| File | Status | Description |
|---|---|---|
| `convex/metabolicFinishers.ts` | NEW | Finisher prescriptions by category × day × phase × week |
| `convex/seedData.ts` | MODIFIED | Confirm and add ~9 missing exercises |
| `convex/generateTemplates.ts` | MODIFIED | Integrate `generateFinisherPrescriptions()` call |
| `convex/schema.ts` | MODIFIED | Add 5 finisher tracking fields to `gpp_workout_sessions` |
| `components/workout/FinisherSection.tsx` | NEW | UI component with independent timer, skip flow, round logging |
| `convex/__tests__/metabolicFinishers.test.ts` | NEW | Unit tests for finisher generation logic |
| `components/workout/__tests__/FinisherSection.test.tsx` | NEW | Component tests including timer and skip modal |
| `types/index.ts` | MODIFIED | Add `FinisherFormat`, `FinisherTimerState` types |

## Full Specification

The complete feature spec including all 24 category × day finisher prescriptions, phase progression multipliers, timer state interface, skip flow UX copy, and sport-language definitions is in `docs/METABOLIC_FINISHER_PLAN_V2.md`.

## Review Checklist

- [ ] Finisher matrix covers all Category × Day combinations (24 total)
- [ ] Bodyweight substitution map is complete — no exercise requires equipment
- [ ] Phase multipliers match the `WEEK_VOLUME_MULTIPLIERS` pattern in `generateTemplates.ts`
- [ ] Skip modal copy approved
- [ ] Sport language (finisher names + completion messages) approved per category
- [ ] Timer modes reviewed for each of the five finisher formats
- [ ] Schema additions to `gpp_workout_sessions` reviewed
