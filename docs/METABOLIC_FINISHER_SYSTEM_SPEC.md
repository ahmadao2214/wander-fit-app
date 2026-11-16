# Metabolic Finisher System — Detailed Specification

**Author:** Sebastian
**Date:** 2026-03-18
**Status:** Draft — Pending co-founder review
**Branch:** `plan/metabolic-finisher-detailed-spec`

---

## Table of Contents

1. [Overview & Goals](#overview--goals)
2. [Core Design Principles](#core-design-principles)
3. [What Is a Metabolic Finisher?](#what-is-a-metabolic-finisher)
4. [Sport-Category-to-Equipment Mapping](#sport-category-to-equipment-mapping)
5. [Exercise Library by Category](#exercise-library-by-category)
6. [Finisher Formats](#finisher-formats)
7. [Skill Level Volume Framework](#skill-level-volume-framework)
8. [Phase Progression Model (GPP → SPP → SSP)](#phase-progression-model-gpp--spp--ssp)
9. [Complete Prescription Matrix](#complete-prescription-matrix)
10. [Week-Level Deload Rule](#week-level-deload-rule)
11. [Progressive Overload Summary](#progressive-overload-summary)
12. [UI/UX Design](#uiux-design)
13. [Schema Changes Required](#schema-changes-required)
14. [Implementation Plan](#implementation-plan)
15. [Open Questions for Co-Founder Review](#open-questions-for-co-founder-review)

---

## Overview & Goals

Metabolic finishers are short, high-intensity conditioning blocks appended to the end of every main workout session (excluding rest/recovery days). They serve two primary purposes:

1. **Cardiovascular conditioning** — Elevate heart rate into anaerobic/aerobic threshold zones to build VO2max and cardiac output.
2. **General work capacity** — Train the athlete's ability to sustain effort under fatigue, which directly transfers to late-game performance.

This is a **key differentiating feature** for WanderFit. Most athletes outside of elite programs never receive sport-science-calibrated conditioning work. We are delivering that expertise automatically, scaled to the athlete's experience, sport, and training phase.

---

## Core Design Principles

| Principle | Decision |
|---|---|
| **Sport-relevance** | Finisher exercises match the metabolic demands of the athlete's sport category. A football player uses a weighted sled. A cross country runner does tempo runs. |
| **Equipment-first, bodyweight fallback** | Equipment-based exercises are the default prescription. Every finisher has a documented bodyweight/equipment-free alternative. |
| **Volume scales with experience** | Novice athletes start with the minimum effective dose. Advanced athletes receive full volume. |
| **Phase-progressive overload** | Volume and intensity increase systematically from GPP → SPP → SSP. |
| **Week 4 deload** | Week 4 of every phase is a planned deload at 70% of the normal volume. |
| **Skip is allowed, not rewarded** | Athletes can skip the finisher, but a friction modal with coaching language discourages the habit. Skips are always logged. |
| **Independent timer** | The finisher has its own timer, separate from the main workout timer. |
| **Sport language** | Finisher names use sport-specific conditioning terminology, not generic format labels. |

---

## What Is a Metabolic Finisher?

A metabolic finisher is a **standalone conditioning block** added at the end of the main strength/skill training session. It is:

- **Short:** 5–20 minutes depending on skill level and phase.
- **High-intensity:** Designed to push heart rate to 80–95% of max.
- **Structured:** Follows a defined format (TABATA, AMRAP, circuit rounds, distance-based, etc.).
- **Non-negotiable in prescription:** The app prescribes the finisher; the athlete decides whether to complete it.

Finishers are **not part of the warmup or cooldown** and should be clearly separated in the UI as a distinct workout section.

---

## Sport-Category-to-Equipment Mapping

The existing schema maps sports to 4 GPP categories. Metabolic finishers use the same category system to ensure sport relevance.

### Category 1 — Continuous/Directional
**Sports:** Soccer, Hockey, Field Hockey, Lacrosse, Cross Country, Swimming, Rowing, Cycling, Rugby
**Metabolic Demand:** Sustained aerobic output with repeated sprint bursts; high mileage; directional change under fatigue
**Primary Equipment:** Treadmill / outdoor track, rowing machine, air bike (sustained pace), battle ropes, jump rope
**Secondary Equipment:** Ski erg, sled (moderate distances)
**Finisher Name:** "Field Conditioning"
**Completion Message:** "Field conditioning complete. Work rate banked."

### Category 2 — Explosive/Vertical
**Sports:** Basketball, Volleyball, Track & Field (sprints/jumps), Gymnastics, Cheerleading
**Metabolic Demand:** Explosive repeated efforts, vertical power, short-burst aerobic-anaerobic transitions
**Primary Equipment:** Air bike (TABATA protocol), medicine ball, box/plyo box, battle ropes (explosive wave), jump rope (double unders)
**Secondary Equipment:** Sled (short sprints), dumbbell circuits
**Finisher Name:** "Court Conditioning"
**Completion Message:** "Court conditioning complete. Jump capacity built."

### Category 3 — Rotational/Unilateral
**Sports:** Baseball, Softball, Tennis, Golf, Swimming (individual strokes), Throwing events
**Metabolic Demand:** Rotational power under repeated effort, anti-rotation endurance, single-side fatigue tolerance
**Primary Equipment:** Medicine ball (rotational throws/slams), battle ropes (alternating wave), dumbbell circuits (single-arm emphasis), resistance bands
**Secondary Equipment:** Sprint-backpedal intervals, lateral agility drills
**Finisher Name:** "Rotational Conditioning"
**Completion Message:** "Rotational conditioning complete. Hip drive trained."

### Category 4 — General Strength
**Sports:** Football, Wrestling, Rugby, Powerlifting, Weightlifting, MMA/Combat Sports, Strongman
**Metabolic Demand:** Peak power output, high-force repeated efforts, grappling work capacity, lactic tolerance
**Primary Equipment:** Weighted sled (push/pull), battle ropes (heavy/power waves), farmer's carry, sandbag, air bike (sprint TABATA), kettlebell
**Secondary Equipment:** Barbell complexes, heavy dumbbell circuits, bodyweight (burpees, sprawls for wrestlers)
**Finisher Name:** "Work Capacity"
**Completion Message:** "Work capacity complete. Grind banked."

---

## Exercise Library by Category

### Category 1 — Continuous/Directional

| Exercise | Equipment | Bodyweight Alt | Format Suitability |
|---|---|---|---|
| Treadmill tempo run | Treadmill | Outdoor run / track run | Distance or timed |
| 400m repeats | Track | 30s sprint on flat surface | Distance-based |
| Rowing machine intervals | Row erg | Jump rope intervals | Timed rounds |
| Air bike steady state | Assault bike / Air dyne | Stationary bike | Timed (sustained) |
| Battle ropes — continuous wave | Battle ropes | Jumping jacks | AMRAP / timed |
| Jump rope | Jump rope | High knees | EMOM / timed |
| Ski erg | Ski erg | Medicine ball slam (bilateral) | Timed or rounds |
| Sled push (moderate load, long distance) | Weighted sled | Broad jump + sprint | Distance-based |
| Box step-ups (fast pace) | Box / bench | Stair runs / step-ups (bodyweight) | Timed or rounds |
| Lateral shuffle to sprint | Cones/markers | Lateral shuffle (bodyweight) | AMRAP |

### Category 2 — Explosive/Vertical

| Exercise | Equipment | Bodyweight Alt | Format Suitability |
|---|---|---|---|
| Air bike TABATA | Assault bike / Air dyne | Sprint-in-place intervals | TABATA (20s/10s × 8) |
| Medicine ball slam | Medicine ball | Explosive push-up | AMRAP / timed |
| Box jumps | Plyo box | Squat jumps | EMOM or rounds |
| Broad jumps | None (open space) | Long-stride bounding | Timed or distance |
| Battle ropes — explosive double wave | Battle ropes | Clap push-ups | AMRAP |
| Jump rope double unders | Jump rope | Tuck jumps | EMOM |
| Depth drops to sprint | Box + open space | Drop squat to sprint | Timed circuits |
| Dumbbell push press circuit | Dumbbells | Push-up to jump | Rounds |
| Sprint intervals (15–30m) | Track or hallway | Shuttle run | Distance-based |
| Vertical jump repeats | Wall or target | Squat jumps | EMOM |

### Category 3 — Rotational/Unilateral

| Exercise | Equipment | Bodyweight Alt | Format Suitability |
|---|---|---|---|
| Medicine ball rotational wall throw | Medicine ball + wall | Pallof press hold | AMRAP / rounds |
| Medicine ball overhead slam | Medicine ball | Hip hinge explosive jump | AMRAP |
| Battle ropes — alternating wave | Battle ropes | Alternating punch + lunge | AMRAP |
| Single-arm dumbbell snatch | Dumbbell | Single-arm swing (KB sim.) | EMOM |
| Lateral bound (skater jump) | None | Lateral bound bodyweight | Timed or rounds |
| Rotational med ball chest pass | Medicine ball + wall | Rotational lunge to reach | Timed |
| Sprint backpedal intervals | Track / hallway | Sprint-backpedal flat | Distance or timed |
| Single-leg RDL to hop | Dumbbell | Single-leg RDL bodyweight | EMOM |
| Dumbbell farmers carry (single-arm) | Dumbbell | Suitcase carry (water jug sim.) | Distance-based |
| Lateral hurdle hop + sprint | Hurdles / cones | Lateral jump over line + sprint | Timed circuits |

### Category 4 — General Strength

| Exercise | Equipment | Bodyweight Alt | Format Suitability |
|---|---|---|---|
| Weighted sled push | Weighted sled | Sprint (open field) | Distance-based |
| Weighted sled pull (rope) | Weighted sled + rope | Seated row to sprint | Distance-based |
| Battle ropes — power wave | Battle ropes | Burpee broad jump | AMRAP |
| Farmer's carry | Dumbbells / trap bar / kettlebells | Bodyweight walking lunge | Distance-based |
| Sandbag shouldering | Sandbag | Med ball power clean | AMRAP |
| Air bike sprint TABATA | Assault bike / Air dyne | All-out sprint intervals | TABATA |
| Kettlebell swing | Kettlebell | Hip hinge jump | EMOM |
| Barbell complex (RDL + row + clean + press) | Barbell | Dumbbell complex | Timed rounds |
| Burpee sprawl (wrestling-specific) | None | Burpee standard | AMRAP |
| Heavy dumbbell thruster | Dumbbells | Squat jump + overhead reach | EMOM |
| Push sled + bear crawl combo | Sled + open space | Burpee + bear crawl | Timed circuits |

---

## Finisher Formats

Five distinct formats are used across all categories. Each format has a dedicated timer mode in the UI.

### 1. TABATA
**Structure:** 20 seconds work / 10 seconds rest × 8 rounds (4 minutes per exercise)
**Rest between exercises:** 60–90 seconds
**Best for:** Air bike, battle ropes, sprint intervals
**Category bias:** Category 2, Category 4

### 2. AMRAP (As Many Rounds As Possible)
**Structure:** Perform as many rounds of a circuit as possible in a fixed time window
**Time windows:** 5 min (Novice GPP) → 10 min (Advanced SSP)
**Best for:** Bodyweight circuits, multi-exercise combinations
**Category bias:** All categories; especially Category 1 and 3

### 3. EMOM (Every Minute on the Minute)
**Structure:** Complete a prescribed number of reps at the start of each minute; rest for the remainder
**Duration:** 5–12 minutes
**Best for:** Explosive exercises (box jumps, kettlebell swings, power cleans)
**Category bias:** Category 2, Category 3

### 4. Timed Rounds
**Structure:** X rounds of Y exercises; athlete moves at their own pace; rest is prescribed between rounds
**Best for:** Strength-conditioning hybrids, equipment circuits
**Category bias:** Category 4 (work capacity emphasis)

### 5. Distance-Based
**Structure:** Complete a prescribed distance or number of lengths/shuttles
**Examples:** 4 × 40m sled push, 3 × 400m run, 5 × shuttle run
**Best for:** Sled work, running, rowing, carries
**Category bias:** Category 1, Category 4

---

## Skill Level Volume Framework

Volume is calibrated to the athlete's skill level (Novice / Moderate / Advanced), which is auto-assigned from intake and updated on re-assessment.

### Novice (< 1 year training experience)

**Philosophy:** Minimum effective dose. Build the aerobic base without creating excessive fatigue that disrupts recovery from the main session. The priority is establishing the habit of finishing workouts with conditioning work.

| Phase | Duration | Rounds/Sets | Work:Rest Ratio | Notes |
|---|---|---|---|---|
| GPP | 5–7 min | 2 rounds | 1:2 | Introduce format; very achievable target |
| SPP | 6–9 min | 2–3 rounds | 1:1.5 | Slightly shorter rest; same exercises |
| SSP | 7–10 min | 3 rounds | 1:1 | Higher intensity but same volume ceiling |

### Moderate (1–3 years training experience)

**Philosophy:** Standard prescription. Athletes have a training base and can handle meaningful conditioning volume on top of strength work.

| Phase | Duration | Rounds/Sets | Work:Rest Ratio | Notes |
|---|---|---|---|---|
| GPP | 8–12 min | 3 rounds | 1:1 | Full circuit exposure |
| SPP | 10–14 min | 3–4 rounds | 1.5:1 | Intensity escalates; rest compresses |
| SSP | 12–16 min | 4 rounds | 1:1 | Volume peaks; manageable density |

### Advanced (3+ years training experience)

**Philosophy:** Full prescription. Athletes have the fitness base to handle high-density conditioning. The finisher is a meaningful training stimulus, not just a burnout.

| Phase | Duration | Rounds/Sets | Work:Rest Ratio | Notes |
|---|---|---|---|---|
| GPP | 12–15 min | 4–5 rounds | 2:1 | Volume foundation; moderate intensity |
| SPP | 15–18 min | 5–6 rounds | 2.5:1 | High intensity; compressed rest |
| SSP | 15–20 min | 5–6 rounds | 2:1 | Peak phase; volume holds, rest recovers slightly |

---

## Phase Progression Model (GPP → SPP → SSP)

This is the core progressive overload mechanism. As the athlete moves through phases, three variables escalate: intensity, exercise complexity, and format density.

### GPP Phase — Aerobic Base & Format Introduction

**Goal:** Introduce the athlete to their sport-category finisher format. Build aerobic base and work capacity from zero. Emphasize technique on equipment (sled, battle ropes, etc.).

**Characteristics:**
- Moderate intensity (65–75% effort)
- Simpler exercises (fewer moving parts)
- Longer rest periods
- Focus on completion, not speed
- Equipment: introduce 1–2 pieces of sport-relevant equipment

**Example — Category 4 (Football/Wrestling), Novice, GPP Week 1:**
> 2 rounds of: Sled push 20m + 10 battle rope power waves + rest 90s between rounds
> Total: ~6 minutes

**Example — Category 1 (Soccer/Cross Country), Advanced, GPP Week 2:**
> 4 rounds: 400m tempo run (conversational pace) + 45s battle ropes continuous wave + 30s rest
> Total: ~14 minutes

---

### SPP Phase — Sport-Specific Transfer & Intensity Escalation

**Goal:** Match conditioning work more tightly to sport demands. Increase intensity, decrease rest, introduce more complex multi-exercise sequences. The athlete should feel the conditioning work connecting to their sport.

**Characteristics:**
- High intensity (75–85% effort)
- More complex sequences (2–3 exercises per circuit)
- Work:rest ratio compresses
- Sport-specific movement patterns prioritized
- Equipment: layer in a second or third piece of equipment

**Example — Category 2 (Basketball), Moderate, SPP Week 2:**
> TABATA × 2 exercises: Air bike 20s / 10s rest × 8 rounds, then 60s rest, then box jumps 20s / 10s rest × 8 rounds
> Total: ~12 minutes

**Example — Category 3 (Baseball), Advanced, SPP Week 3:**
> AMRAP 12 min: 8 rotational med ball wall throws (each side) + 10 alternating battle rope waves + 6 lateral bounds each side
> Total: ~15 minutes

---

### SSP Phase — Competition Prep & Peak Work Capacity

**Goal:** Maintain and slightly peak work capacity while managing fatigue ahead of competition. Volume stays high for advanced athletes; moderate and novice athletes see a relative taper in duration but density increases.

**Characteristics:**
- Near-maximal intensity (85–95% effort)
- Dense formats (TABATA, short AMRAP)
- Exercises athletes are now fluent in (no new movements introduced in SSP)
- Sport-specific equipment at full load/speed
- Advanced: volume peaks; Novice/Moderate: volume holds, intensity peaks

**Example — Category 4 (Football), Advanced, SSP Week 2:**
> TABATA circuit: 20s sled push sprint (empty sled = fast) / 10s rest × 8, then 90s rest, then TABATA battle ropes power wave × 8
> Total: ~18 minutes

**Example — Category 1 (Cross Country), Novice, SSP Week 1:**
> 3 rounds: 200m hard run (near-sprint) + 90s walk recovery
> Total: ~9 minutes

---

## Complete Prescription Matrix

This matrix defines the default finisher prescription across all combinations. The implementation in `convex/metabolicFinishers.ts` will follow this structure.

### Prescription Parameters per Cell

Each cell (Category × Phase × SkillLevel × Week) defines:
- `format`: TABATA | AMRAP | EMOM | timed_rounds | distance_based
- `primaryExercises`: 1–3 exercises from the category exercise library
- `bodyweightAlternatives`: mapped exercise slugs
- `rounds` (or `durationMinutes` for AMRAP/timed)
- `workSeconds` and `restSeconds` (for interval formats)
- `restBetweenRounds`: seconds
- `intensityNote`: coaching cue string
- `finisherName`: sport-specific label (from category mapping)

### Category 1 (Continuous/Directional) Prescription Summary

| Phase | Novice | Moderate | Advanced |
|---|---|---|---|
| GPP Wk 1–3 | 2 rounds tempo run + jump rope, 90s rest | 3 rounds row + battle ropes, 60s rest | 4 rounds run repeats + continuous rope, 45s rest |
| GPP Wk 4 (deload) | 70% of above | 70% of above | 70% of above |
| SPP Wk 1–3 | 3 rounds run + rope + step-ups | 4 rounds row intervals + rope + run | 5 rounds speed run + rope + ski erg |
| SPP Wk 4 (deload) | 70% | 70% | 70% |
| SSP Wk 1–3 | 3 rounds near-sprint 200m repeats | 4 rounds 400m repeats + rope | 5–6 rounds sprint + rope + row |
| SSP Wk 4 (deload) | 70% | 70% | 70% |

### Category 2 (Explosive/Vertical) Prescription Summary

| Phase | Novice | Moderate | Advanced |
|---|---|---|---|
| GPP Wk 1–3 | EMOM 5 min: 5 box jumps + 10 rope slams | AMRAP 8 min: jumps + slams + ropes | AMRAP 12 min: box jumps + slams + ropes + bike |
| GPP Wk 4 (deload) | 70% | 70% | 70% |
| SPP Wk 1–3 | TABATA × 1: air bike | TABATA × 2: bike + box jumps | TABATA × 3: bike + jumps + rope |
| SPP Wk 4 (deload) | 70% | 70% | 70% |
| SSP Wk 1–3 | TABATA × 2: bike + slams | TABATA × 3 + EMOM | Full TABATA circuit × 4 exercises |
| SSP Wk 4 (deload) | 70% | 70% | 70% |

### Category 3 (Rotational/Unilateral) Prescription Summary

| Phase | Novice | Moderate | Advanced |
|---|---|---|---|
| GPP Wk 1–3 | 2 rounds: rot. throw + band walk + lateral bound | 3 rounds: throw + ropes + bound | AMRAP 10 min: full rotational circuit |
| GPP Wk 4 (deload) | 70% | 70% | 70% |
| SPP Wk 1–3 | 3 rounds: throw + single-arm snatch + sprint | 4 rounds complex circuit | AMRAP 12 min: high-complexity circuit |
| SPP Wk 4 (deload) | 70% | 70% | 70% |
| SSP Wk 1–3 | EMOM 8 min: snatch + bound combo | AMRAP 12 min + EMOM combo | AMRAP 15 min high-density |
| SSP Wk 4 (deload) | 70% | 70% | 70% |

### Category 4 (General Strength) Prescription Summary

| Phase | Novice | Moderate | Advanced |
|---|---|---|---|
| GPP Wk 1–3 | 2 rounds: sled push 20m + 10 rope waves + rest | 3 rounds: sled + rope + carries | Timed rounds: sled + rope + KB swing + carry |
| GPP Wk 4 (deload) | 70% | 70% | 70% |
| SPP Wk 1–3 | 3 rounds: sled + burpee + rope | TABATA × 2: bike + rope | TABATA × 3 + sled sprint |
| SPP Wk 4 (deload) | 70% | 70% | 70% |
| SSP Wk 1–3 | TABATA × 2: rope + bike | TABATA × 3: bike + rope + burpee | TABATA × 4 + sled sprint |
| SSP Wk 4 (deload) | 70% | 70% | 70% |

---

## Week-Level Deload Rule

**Week 4 of every phase = 70% of standard volume.**

This follows the same `WEEK_VOLUME_MULTIPLIERS` pattern already used in `convex/generateTemplates.ts`:

| Week | Volume Multiplier |
|---|---|
| 1 | 0.85 (ramp-up) |
| 2 | 1.00 (standard) |
| 3 | 1.05 (overreach) |
| 4 | 0.70 (deload) |

For finishers, this applies to:
- **Duration:** Round count or AMRAP time window × multiplier
- **Intensity:** Back off to GPP-phase intensity level
- **Format:** Optionally simplify to 1–2 exercises instead of full circuit

---

## Progressive Overload Summary

The following variables are the levers for progressive overload in the finisher system:

| Variable | GPP | SPP | SSP |
|---|---|---|---|
| Duration | Short | Medium | Long (or maintained with ↑ density) |
| Intensity | Moderate (65–75%) | High (75–85%) | Near-max (85–95%) |
| Rest periods | Long | Moderate | Short |
| Exercise complexity | Simple | Moderate | Complex / combined |
| Equipment used | 1 piece | 1–2 pieces | 2–3 pieces |
| Formats | Timed rounds, distance | TABATA intro, AMRAP | TABATA, dense AMRAP, EMOM |
| Volume (Novice) | 5–7 min | 6–9 min | 7–10 min |
| Volume (Moderate) | 8–12 min | 10–14 min | 12–16 min |
| Volume (Advanced) | 12–15 min | 15–18 min | 15–20 min |

---

## UI/UX Design

### FinisherSection Component

A new `components/workout/FinisherSection.tsx` component will own the entire finisher UX. It is a distinct section within the workout execution screen, placed after the main workout exercises.

**Key UI States:**
1. **Preview state** — Shows the finisher name, format, and exercises before the athlete starts. Includes a prominent "Start Finisher" button.
2. **Active state** — Full-screen timer display with current exercise, round counter, work/rest indicator. Independent start/pause/stop controls.
3. **Completion state** — Sport-specific completion message + stats (rounds completed, total time, format).
4. **Skipped state** — Logged as skipped with a reason prompt.

### Timer Modes (by Format)

| Format | Timer Display | Behavior |
|---|---|---|
| TABATA | 20s/10s countdown + round counter (1–8) | Auto-transitions work → rest → next round |
| AMRAP | Count-up timer to target window | Athlete logs rounds manually |
| EMOM | Countdown per minute + rep target | Auto-resets each minute |
| Timed Rounds | Countdown per round + rest countdown | Auto-transitions round → rest |
| Distance-Based | Elapsed timer + distance/rep counter | Athlete manually logs each set |

### Skip Flow (Friction Modal)

When the athlete taps "Skip Finisher":

> **Modal Title:** "Skip today's finisher?"
> **Body:** "This is where games are won or lost. [Sport-specific conditioning] is built in moments like this one. Are you sure you want to skip?"
> **Options:**
> - "Yes, skip today" → logged as `skipped`, reason = "athlete choice"
> - "I'll do it" → returns to finisher preview

The skip modal copy should be reviewed per category to use sport-specific language (see completion messages in Sport-Category-to-Equipment Mapping section).

### Workout Screen Integration

The finisher appears as the final section in the workout execution screen with a visual separator:
- Section label: **"FINISHER"** (with sport-category name below: "Field Conditioning", "Court Conditioning", etc.)
- Color accent: distinct from the main workout color to signal a mode shift
- Duration estimate displayed upfront so athlete can plan

---

## Schema Changes Required

The following fields need to be added to `gpp_workout_sessions` in `convex/schema.ts`:

```typescript
// In gpp_workout_sessions table
finisher: v.optional(v.object({
  format: v.union(
    v.literal("tabata"),
    v.literal("amrap"),
    v.literal("emom"),
    v.literal("timed_rounds"),
    v.literal("distance_based")
  ),
  status: v.union(
    v.literal("not_started"),
    v.literal("in_progress"),
    v.literal("completed"),
    v.literal("skipped")
  ),
  startedAt: v.optional(v.number()),       // timestamp
  completedAt: v.optional(v.number()),     // timestamp
  durationSeconds: v.optional(v.number()), // actual time spent
  roundsCompleted: v.optional(v.number()), // for AMRAP/rounds formats
  skipReason: v.optional(v.string()),      // if skipped
  exercises: v.optional(v.array(v.object({
    exerciseId: v.id("exercises"),
    sets: v.optional(v.number()),
    repsOrDuration: v.optional(v.string()), // "10 reps" or "20s"
    completed: v.boolean(),
  }))),
})),
```

Additionally, new exercises need to be seeded into the `exercises` table for any finisher-specific movements not already present:

**Exercises to confirm / add:**
- `sled_push` (weighted sled push)
- `sled_pull` (rope-based sled pull)
- `battle_ropes_power_wave`
- `battle_ropes_alternating_wave`
- `battle_ropes_continuous_wave`
- `air_bike_sprint` (Assault bike / Air dyne — high intensity)
- `air_bike_steady_state`
- `medicine_ball_slam`
- `medicine_ball_rotational_throw`
- `farmers_carry`
- `sandbag_shoulder`
- `kettlebell_swing`
- `box_jump`
- `broad_jump`
- `skater_jump` (lateral bound)
- `jump_rope`
- `rowing_machine_interval`
- `ski_erg`
- `tempo_run`
- `sprint_interval`
- `barbell_complex`
- `burpee_sprawl`

---

## Implementation Plan

### Files to Create

| File | Description |
|---|---|
| `convex/metabolicFinishers.ts` | Core module: finisher prescriptions by category × phase × skill × week. Exports `generateFinisherPrescription(params)`. |
| `components/workout/FinisherSection.tsx` | UI component: preview, timer, completion, skip modal. |
| `convex/__tests__/metabolicFinishers.test.ts` | Unit tests: all category × phase × skill combinations return valid prescriptions. |
| `components/workout/__tests__/FinisherSection.test.tsx` | Component tests: renders, timer transitions, skip flow. |

### Files to Modify

| File | Change |
|---|---|
| `convex/schema.ts` | Add `finisher` optional field to `gpp_workout_sessions`. |
| `convex/generateTemplates.ts` | Call `generateFinisherPrescription()` and append finisher exercises with `section: "finisher"` to each template. |
| `convex/seedData.ts` | Add ~20 missing finisher exercises to the exercise seed data. |
| `app/(athlete)/workout/execute/[id].tsx` | Render `<FinisherSection>` after main exercises are complete. |
| `types/index.ts` | Add `FinisherFormat`, `FinisherStatus`, `FinisherPrescription` TypeScript types. |

### Implementation Sequence

1. **Seed exercise library** — Add all missing finisher exercises to `seedData.ts`. Run seed.
2. **Define types** — Add finisher TypeScript types to `types/index.ts`.
3. **Schema update** — Add `finisher` field to `gpp_workout_sessions`.
4. **Build core module** — Implement `convex/metabolicFinishers.ts` with full prescription matrix.
5. **Write unit tests** — Verify all category × phase × skill cells produce valid output.
6. **Integrate into templates** — Update `generateTemplates.ts` to append finishers.
7. **Build FinisherSection UI** — Implement component with all timer modes and skip flow.
8. **Wire into execution screen** — Add `FinisherSection` to the execute workout screen.
9. **Write component tests** — Cover render, timer behavior, skip modal.
10. **Manual QA** — Test all 4 categories × 3 skill levels on device.

---

## Open Questions for Co-Founder Review

The following items need alignment before implementation begins:

### 1. Age Group Restrictions
**Question:** Should the 10–13 age group have finisher restrictions? (e.g., no TABATA, no sled work, lower intensity ceiling)
**Recommendation:** Yes — same age-intensity ceiling logic from `intensityScaling.ts` should apply. TABATA allowed but at 65% intensity max. Sled work allowed at light load. No barbell complexes.

### 2. Rest Day Handling
**Question:** Finishers are excluded from rest days. Should recovery days (active recovery sessions) include a very light finisher (e.g., 5-minute walk/row)?
**Recommendation:** No — keep recovery days finisher-free. The simple rule (workout day = finisher, rest day = no finisher) is cleaner.

### 3. Skip Penalty / Streak Logic
**Question:** Should skipping a finisher break the workout streak, or should it be treated as a completed workout?
**Recommendation:** A skipped finisher should NOT break the streak — the main workout is still completed. However, finisher completion rate should be tracked separately and surfaced in the progress screen.

### 4. Equipment Availability at Onboarding
**Question:** Should we ask athletes which equipment they have access to during intake, and use that to adjust finisher prescriptions (or default to bodyweight)?
**Recommendation:** Add a simple equipment availability question to intake. Default to equipment-based if athlete has access; default to bodyweight/open-space if not. This question should be optional and can be changed in settings.

### 5. Finisher on Short/Busy Workout Days
**Question:** Some athletes select 3 training days/week. On a training day, the main workout may already be 60–70 min. Is the finisher always mandatory to attempt, regardless of total session time?
**Recommendation:** The finisher is always prescribed. The athlete can skip with the skip flow. We should surface the total estimated session time (main workout + finisher) upfront so the athlete can plan.

### 6. Category 4 — Position-Specific Finishers
**Question:** Football is Category 4 (General Strength), but a QB has very different conditioning needs than an offensive lineman, and a wrestler needs different conditioning than a powerlifter. Should we introduce sport sub-categories for Category 4?
**Recommendation:** Not in this iteration. Keep Category 4 as general strength/power conditioning. Position-specific programming is a future feature (post-MVP). The current weighted sled / battle ropes / air bike prescription is effective for all Category 4 athletes.

### 7. Finisher Naming on UI
**Question:** Should the finisher section say the category name ("Work Capacity", "Field Conditioning") or should it just say "Finisher"?
**Recommendation:** Use the sport-category name. It is more motivating and reinforces the sport-specific nature of the programming. This is a key differentiator.

### 8. Multi-Day Finisher Variation
**Question:** Should finishers vary day-to-day within the same week, or can the same finisher format repeat?
**Recommendation:** Vary format and exercise selection by day type (Lower Body day vs Upper Body day vs Full Body day). This prevents monotony and aligns the finisher's energy demand with the main session's focus.

---

*This document is the single source of truth for the Metabolic Finisher System feature. All implementation decisions should trace back to this specification. Comments and suggested changes should be made as PR review comments on GitHub.*
