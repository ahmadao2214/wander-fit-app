# Add Metabolic Finisher System for Workouts

**Branch:** `claude/add-metabolic-finisher-YKyDS` → `main`

---

## Summary

Adds sport-specific **metabolic finishers** to the end of every workout. These are short, high-intensity conditioning bouts (2–6 minutes) designed to spike heart rate above the level of the main workout.

### What's included

- **9 new finisher exercises**: Airdyne bike sprint, curve treadmill sprint, resistance treadmill sprint, battle rope waves/slams, infinity rope pull, kettlebell Tabata swings, bodyweight Tabata, treadmill incline walk
- **6 new equipment types** in the glossary: `airdyne_bike`, `curve_treadmill`, `resistance_treadmill`, `treadmill`, `battle_ropes`, `infinity_rope`
- **`convex/metabolicFinishers.ts`** — Core selection engine with interval protocol definitions and per-category finisher pools
- **Template generation integration** — Every generated template now includes a finisher exercise with `section: "finisher"` before the cooldown
- **23 unit tests** covering selection logic, phase progression, age safety, week scaling, and protocol math

---

## How Finisher Selection Works

| Factor | How it affects the finisher |
|--------|---------------------------|
| **GPP Category** | Determines exercise type — see table below |
| **Phase (GPP → SPP → SSP)** | Intensity & duration increase. GPP = half Tabata intro; SPP = full protocols; SSP = extended/peak |
| **Skill Level** | Gates access to complex equipment (e.g., kettlebell Tabata = Advanced only) |
| **Age Group** | 14-17 gets bodyweight/basic equipment; resistance treadmill & KB Tabata require 18+ |
| **Week (1–4)** | Week 1 = 75% rounds, Week 3 = 100%, Week 4 (deload) = 60%. Minimum 2 rounds always |

---

## Category-Specific Finisher Design

| Category | Sport Examples | Finisher Philosophy | Key Equipment |
|----------|---------------|-------------------|---------------|
| **1 — Endurance** | Soccer, Cross Country, Hockey | Longer, leg-focused. Full Tabata → Extended (12 rounds). Build aerobic power under fatigue | Curve treadmill, Airdyne |
| **2 — Power** | Basketball, Volleyball, Football | Short explosive bursts. 10s sprint bouts with full recovery. Max power output | Airdyne sprints, Battle ropes |
| **3 — Rotation** | Baseball, Tennis, Golf | Upper body bias with rotational endurance. Sustained grip and shoulder work | Battle ropes, Infinity rope |
| **4 — Strength** | Football, Wrestling | Heavy conditioning. Strength-biased high-intensity efforts | Resistance treadmill, KB swings, Battle ropes |

---

## Interval Protocols

| Protocol | Format | Duration | Used for |
|----------|--------|----------|----------|
| `TABATA_HALF` | 20s/10s × 4 | 2 min | GPP intro, younger athletes |
| `TABATA_FULL` | 20s/10s × 8 | 4 min | Standard finisher |
| `TABATA_EXTENDED` | 20s/10s × 12 | 6 min | Endurance peak phase |
| `SPRINT_SHORT` | 10s/20s × 6 | 3 min | Power athletes |
| `SPRINT_POWER` | 10s/30s × 8 | ~5 min | Football-style play simulation |
| `INTERVAL_LONG` | 30s/30s × 6 | 6 min | Sustained output |
| `INTERVAL_MODERATE` | 30s/15s × 6 | ~4.5 min | Upper body endurance |
| `STEADY_2MIN` | 2 min continuous | 2 min | Intro/low intensity |

---

## Files Changed

| File | Change |
|------|--------|
| `convex/metabolicFinishers.ts` | **New** — Finisher selection engine |
| `convex/__tests__/metabolicFinishers.test.ts` | **New** — 23 tests |
| `convex/seedData.ts` | Added 9 exercises, 6 equipment types, 2 tags |
| `convex/generateTemplates.ts` | Integrated finisher into template generation |

---

## Things to Review / Discuss

- [ ] Are the finisher exercise choices right for each category? (Especially Cat 3 rotational — infinity rope vs battle ropes)
- [ ] Should deload week (Week 4) skip the finisher entirely instead of reducing rounds?
- [ ] Do we want to add finisher equipment preferences to the intake flow so we know what gear the athlete has access to?
- [ ] The `section: "finisher"` field is in the schema but not yet rendered differently in the workout execution UI — that's a follow-up

---

## Test Plan

- [x] All 1198 existing tests pass (no regressions)
- [x] 23 new finisher tests pass
- [ ] Verify finisher appears in generated templates by running `generateAllTemplates({ dryRun: true })` on Convex dashboard
- [ ] After seeding new exercises, confirm finisher exercises resolve correctly
- [ ] Manual review of finisher selection across a few category/phase/age combos
