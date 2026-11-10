import { describe, it, expect } from "vitest";
import {
  AgeGroup,
  CategoryId,
  ExerciseFocus,
  ExercisePrescriptionProfile,
  Phase,
  AGE_SAFETY_CONSTRAINTS,
  WEEKLY_WAVE,
  applyWeeklyWave,
  getCategoryExerciseParameters,
  getExercisePrescriptionProfile,
} from "../intensityScaling";
import {
  getSlotTemplateWeek,
  getWeekVolumeMultiplier,
  mapUserWeekToTemplateWeek,
  MIN_WEEKS_PER_PHASE,
  MAX_WEEKS_PER_PHASE,
} from "../weekMapping";
import { normalizeSetCompletions } from "../gppWorkoutSessions";
import * as libScaling from "../../lib/intensityScaling";

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORIES: CategoryId[] = [1, 2, 3, 4];
const PHASES: Phase[] = ["GPP", "SPP", "SSP"];
const AGE_GROUPS: AgeGroup[] = ["14-17", "18-35", "36+"];
const YEARS = [0.5, 3, 7];
const WEEKS = [1, 2, 3, 4];

/** One representative exercise per prescription profile getExercisePrescriptionProfile returns. */
const EXERCISES: Record<
  Exclude<ExercisePrescriptionProfile, "power">,
  { focus: ExerciseFocus; tags: string[]; equipment: string[] }
> = {
  primary_loaded_lift: { focus: "strength", tags: ["lower_body", "squat", "compound"], equipment: ["barbell", "rack"] },
  general_strength: { focus: "strength", tags: ["lower_body"], equipment: ["dumbbell"] },
  unilateral_accessory: { focus: "strength", tags: ["lower_body", "unilateral"], equipment: ["dumbbell"] },
  anti_rotation: { focus: "strength", tags: ["core", "anti_rotation", "dynamic"], equipment: ["cable"] },
  upper_body_accessory: { focus: "strength", tags: ["upper_body", "push"], equipment: ["dumbbell"] },
  core_accessory: { focus: "strength", tags: ["core", "anti_extension"], equipment: ["pull_up_bar"] },
  mobility_recovery: { focus: "bodyweight", tags: ["mobility"], equipment: ["none"] },
  power_conditioning: { focus: "power", tags: ["plyometric"], equipment: ["box"] },
  bodyweight: { focus: "bodyweight", tags: ["lower_body"], equipment: ["none"] },
};
type Profile = keyof typeof EXERCISES;
const PROFILES = Object.keys(EXERCISES) as Profile[];

/** Profiles whose %1RM moves with the wave (strength track). */
const LOAD_WAVE_PROFILES = PROFILES.filter(
  (p) => !["power_conditioning", "bodyweight", "mobility_recovery"].includes(p)
);

function params(
  profile: Profile,
  categoryId: CategoryId,
  phase: Phase,
  ageGroup: AgeGroup,
  years: number,
  week?: number
) {
  const { focus, tags, equipment } = EXERCISES[profile];
  return getCategoryExerciseParameters(categoryId, phase, ageGroup, years, focus, tags, equipment, week);
}

/** Every athlete × exercise combination. */
function* everyCombination() {
  for (const profile of PROFILES)
    for (const categoryId of CATEGORIES)
      for (const phase of PHASES)
        for (const ageGroup of AGE_GROUPS)
          for (const years of YEARS) yield { profile, categoryId, phase, ageGroup, years };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

describe("WEEKLY_WAVE", () => {
  it("fixtures cover every prescription profile", () => {
    for (const profile of PROFILES) {
      const { focus, tags, equipment } = EXERCISES[profile];
      expect(getExercisePrescriptionProfile(focus, tags, equipment)).toBe(profile);
    }
  });

  it("uses the template week volume multipliers for sets", () => {
    for (const week of WEEKS) {
      expect(WEEKLY_WAVE[week as 1 | 2 | 3 | 4].setsMultiplier).toBe(getWeekVolumeMultiplier(week));
    }
    expect(WEEKLY_WAVE[1].setsMultiplier).toBe(0.7);
    expect(WEEKLY_WAVE[2].setsMultiplier).toBe(0.85);
    expect(WEEKLY_WAVE[3].setsMultiplier).toBe(1.0);
    expect(WEEKLY_WAVE[4].setsMultiplier).toBe(0.6);
  });

  it("peak week is the unmodified prescription", () => {
    expect(WEEKLY_WAVE[3]).toEqual({ setsMultiplier: 1, oneRepMaxOffset: 0, rpeOffset: 0 });
  });

  it("never raises sets, load or RPE above peak", () => {
    for (const week of WEEKS) {
      const step = WEEKLY_WAVE[week as 1 | 2 | 3 | 4];
      expect(step.setsMultiplier).toBeLessThanOrEqual(1);
      expect(step.oneRepMaxOffset).toBeLessThanOrEqual(0);
      expect(step.rpeOffset).toBeLessThanOrEqual(0);
    }
  });

  it("deload is the lightest week on every dimension", () => {
    for (const week of [1, 2, 3] as const) {
      expect(WEEKLY_WAVE[4].setsMultiplier).toBeLessThan(WEEKLY_WAVE[week].setsMultiplier);
      expect(WEEKLY_WAVE[4].oneRepMaxOffset).toBeLessThan(WEEKLY_WAVE[week].oneRepMaxOffset);
      expect(WEEKLY_WAVE[4].rpeOffset).toBeLessThan(WEEKLY_WAVE[week].rpeOffset);
    }
  });

  it("is re-exported unchanged from lib/intensityScaling", () => {
    expect(libScaling.WEEKLY_WAVE).toBe(WEEKLY_WAVE);
    expect(libScaling.applyWeeklyWave).toBe(applyWeeklyWave);
    expect(libScaling.getCategoryExerciseParameters).toBe(getCategoryExerciseParameters);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SAMPLE ATHLETE: CATEGORY 4, SPP, 18-35, 2 YEARS
// ═══════════════════════════════════════════════════════════════════════════════

describe("weekly wave for a category 4 SPP athlete (18-35, 2 years)", () => {
  const primary = (week?: number) => params("primary_loaded_lift", 4, "SPP", "18-35", 2, week);
  const general = (week?: number) => params("general_strength", 4, "SPP", "18-35", 2, week);
  const power = (week?: number) => params("power_conditioning", 4, "SPP", "18-35", 2, week);

  it("primary lift waves 3 → 3 → 4 → 2 sets at 70 → 72.5 → 75 → 65%", () => {
    expect(WEEKS.map((w) => primary(w).sets)).toEqual([3, 3, 4, 2]);
    expect(WEEKS.map((w) => primary(w).oneRepMaxPercent.max)).toEqual([0.7, 0.725, 0.75, 0.65]);
    expect(WEEKS.map((w) => primary(w).reps)).toEqual([8, 8, 8, 8]);
  });

  it("general strength waves sets, load and RPE", () => {
    expect(WEEKS.map((w) => general(w).sets)).toEqual([4, 4, 5, 3]);
    expect(WEEKS.map((w) => general(w).oneRepMaxPercent)).toEqual([
      { min: 0.65, max: 0.8 },
      { min: 0.675, max: 0.825 },
      { min: 0.7, max: 0.85 },
      { min: 0.6, max: 0.75 },
    ]);
    expect(WEEKS.map((w) => general(w).rpe)).toEqual([
      { min: 6, max: 8 },
      { min: 7, max: 9 },
      { min: 7, max: 9 },
      { min: 5, max: 7 },
    ]);
  });

  it("power work waves sets but keeps its speed-focused load", () => {
    expect(WEEKS.map((w) => power(w).sets)).toEqual([3, 3, 4, 2]);
    for (const week of WEEKS) {
      expect(power(week).oneRepMaxPercent).toEqual(power().oneRepMaxPercent);
    }
  });

  it("week 3 and no week both give the peak prescription", () => {
    expect(primary(3)).toEqual(primary());
    expect(general(3)).toEqual(general());
  });

  it("rest, reps and tempo do not change across the wave", () => {
    for (const week of WEEKS) {
      expect(general(week).reps).toBe(general().reps);
      expect(general(week).restSeconds).toBe(general().restSeconds);
      expect(general(week).tempo).toEqual(general().tempo);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVERY PROFILE × CATEGORY × PHASE × AGE × EXPERIENCE
// ═══════════════════════════════════════════════════════════════════════════════

describe("weekly wave across every athlete and exercise", () => {
  it("treats a missing or out-of-range week as peak", () => {
    for (const c of everyCombination()) {
      const peak = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years);
      expect(params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, 3)).toEqual(peak);
      expect(params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, 0)).toEqual(peak);
      expect(params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, 5)).toEqual(peak);
    }
  });

  it("keeps sets at 1 or more every week", () => {
    for (const c of everyCombination()) {
      for (const week of WEEKS) {
        expect(params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, week).sets).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("never exceeds the age 1RM ceiling (85% for 14-17, 90% otherwise)", () => {
    for (const c of everyCombination()) {
      const ceiling = AGE_SAFETY_CONSTRAINTS[c.ageGroup].oneRepMaxCeiling;
      expect(ceiling).toBe(c.ageGroup === "14-17" ? 0.85 : 0.9);
      for (const week of WEEKS) {
        const p = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, week);
        expect(p.oneRepMaxPercent.min).toBeLessThanOrEqual(ceiling);
        expect(p.oneRepMaxPercent.max).toBeLessThanOrEqual(ceiling);
        expect(p.oneRepMaxPercent.min).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("keeps primary lifts within their guardrails (≤ 4 sets, ≤ 10 reps, ≤ 80%)", () => {
    for (const c of everyCombination()) {
      if (c.profile !== "primary_loaded_lift") continue;
      for (const week of WEEKS) {
        const p = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, week);
        expect(p.sets).toBeLessThanOrEqual(4);
        expect(p.reps).toBeLessThanOrEqual(10);
        expect(p.oneRepMaxPercent.max).toBeLessThanOrEqual(0.8);
      }
    }
  });

  it("never prescribes more than peak in any week", () => {
    for (const c of everyCombination()) {
      const peak = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, 3);
      for (const week of WEEKS) {
        const p = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, week);
        expect(p.sets).toBeLessThanOrEqual(peak.sets);
        expect(p.oneRepMaxPercent.max).toBeLessThanOrEqual(peak.oneRepMaxPercent.max);
        expect(p.rpe.max).toBeLessThanOrEqual(peak.rpe.max);
      }
    }
  });

  it("ramps sets and load from intro through build to peak", () => {
    for (const c of everyCombination()) {
      const [intro, build, peak] = [1, 2, 3].map((w) =>
        params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, w)
      );
      expect(intro.sets).toBeLessThanOrEqual(build.sets);
      expect(build.sets).toBeLessThanOrEqual(peak.sets);
      expect(intro.oneRepMaxPercent.max).toBeLessThanOrEqual(build.oneRepMaxPercent.max);
      expect(build.oneRepMaxPercent.max).toBeLessThanOrEqual(peak.oneRepMaxPercent.max);
    }
  });

  it("makes the deload visibly lighter than peak for every periodized exercise", () => {
    for (const c of everyCombination()) {
      if (c.profile === "mobility_recovery") continue;
      const peak = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, 3);
      const deload = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, 4);

      expect(deload.rpe.max).toBeLessThan(peak.rpe.max);
      if (peak.sets >= 2) {
        expect(deload.sets).toBeLessThan(peak.sets);
      }
      if (LOAD_WAVE_PROFILES.includes(c.profile)) {
        expect(deload.oneRepMaxPercent.max).toBeLessThan(peak.oneRepMaxPercent.max);
      }
    }
  });

  it("leaves mobility and recovery work unchanged", () => {
    for (const c of everyCombination()) {
      if (c.profile !== "mobility_recovery") continue;
      const peak = params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years);
      for (const week of WEEKS) {
        expect(params(c.profile, c.categoryId, c.phase, c.ageGroup, c.years, week)).toEqual(peak);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE LENGTHS (via mapUserWeekToTemplateWeek)
// ═══════════════════════════════════════════════════════════════════════════════

describe("weekly wave over real phase lengths", () => {
  it("the last week of every phase length is a deload lighter than the heaviest week", () => {
    for (let weeksPerPhase = MIN_WEEKS_PER_PHASE; weeksPerPhase <= MAX_WEEKS_PER_PHASE; weeksPerPhase++) {
      const prescriptions = Array.from({ length: weeksPerPhase }, (_, i) =>
        params("primary_loaded_lift", 4, "SPP", "18-35", 2, mapUserWeekToTemplateWeek(i + 1, weeksPerPhase))
      );
      const last = prescriptions[prescriptions.length - 1];
      const heaviest = Math.max(...prescriptions.map((p) => p.oneRepMaxPercent.max));
      const mostSets = Math.max(...prescriptions.map((p) => p.sets));

      expect(last).toEqual(params("primary_loaded_lift", 4, "SPP", "18-35", 2, 4));
      expect(last.oneRepMaxPercent.max).toBeLessThan(heaviest);
      expect(last.sets).toBeLessThan(mostSets);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// applyWeeklyWave EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════════

describe("applyWeeklyWave", () => {
  const base = {
    oneRepMaxPercent: { min: 0.05, max: 0.9 },
    sets: 1,
    reps: 8,
    restSeconds: 60,
    tempo: { eccentric: 2, isometric: 0, concentric: 2 } as const,
    rpe: { min: 1, max: 2 },
  };

  it("floors sets at 1, load at 0 and RPE at 1", () => {
    const deload = applyWeeklyWave(base, 4, "general_strength", "18-35");
    expect(deload.sets).toBe(1);
    expect(deload.oneRepMaxPercent.min).toBe(0);
    expect(deload.rpe).toEqual({ min: 1, max: 1 });
  });

  it("re-applies the age ceiling to the result", () => {
    const teen = applyWeeklyWave({ ...base, oneRepMaxPercent: { min: 0.9, max: 0.9 } }, 3, "general_strength", "14-17");
    expect(teen.oneRepMaxPercent.max).toBe(0.85);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SWAPPED WORKOUTS FOLLOW THEIR SLOT'S WEEK
// ═══════════════════════════════════════════════════════════════════════════════

describe("getSlotTemplateWeek", () => {
  const peakDay1 = { id: "peak-d1", phase: "SPP", week: 3, day: 1 };
  const deloadDay1 = { id: "deload-d1", phase: "SPP", week: 4, day: 1 };

  it("uses the template's own week when nothing is overridden", () => {
    expect(getSlotTemplateWeek(peakDay1, [], 4)).toBe(3);
    expect(getSlotTemplateWeek(deloadDay1, [], 4)).toBe(4);
  });

  it("prescribes a peak template swapped into the last week as a deload", () => {
    const swap = [
      { phase: "SPP", week: 3, day: 1, templateId: "deload-d1" },
      { phase: "SPP", week: 4, day: 1, templateId: "peak-d1" },
    ];
    expect(getSlotTemplateWeek(peakDay1, swap, 4)).toBe(4);
    expect(getSlotTemplateWeek(deloadDay1, swap, 4)).toBe(3);
  });

  it("maps the slot's user week for longer phases", () => {
    // 6-week phase maps user weeks to [1, 2, 2, 3, 3, 4]
    const intro = { id: "intro-d2", phase: "GPP", week: 1, day: 2 };
    const moved = [
      { phase: "GPP", week: 1, day: 2, templateId: "other" },
      { phase: "GPP", week: 6, day: 2, templateId: "intro-d2" },
    ];
    expect(getSlotTemplateWeek(intro, moved, 6)).toBe(4);
  });

  it("uses the first slot the template sits in", () => {
    // Template week 2 serves user weeks 2 and 3 of a 6-week phase; moving the
    // week-3 copy to week 6 still leaves it in its default week-2 slot first
    const build = { id: "build-d1", phase: "GPP", week: 2, day: 1 };
    const moved = [
      { phase: "GPP", week: 3, day: 1, templateId: "other" },
      { phase: "GPP", week: 6, day: 1, templateId: "build-d1" },
    ];
    expect(getSlotTemplateWeek(build, moved, 6)).toBe(2);
  });

  it("ignores overrides from other phases", () => {
    const otherPhase = [{ phase: "GPP", week: 4, day: 1, templateId: "peak-d1" }];
    expect(getSlotTemplateWeek(peakDay1, otherPhase, 4)).toBe(3);
  });

  it("feeds the deload prescription for a swapped peak template", () => {
    const swap = [
      { phase: "SPP", week: 3, day: 1, templateId: "deload-d1" },
      { phase: "SPP", week: 4, day: 1, templateId: "peak-d1" },
    ];
    const week = getSlotTemplateWeek(peakDay1, swap, 4);
    expect(params("primary_loaded_lift", 4, "SPP", "18-35", 2, week)).toEqual(
      params("primary_loaded_lift", 4, "SPP", "18-35", 2, 4)
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGGED SETS SURVIVE A LOWER PRESCRIPTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("normalizeSetCompletions", () => {
  const empty = () => ({ completed: false, skipped: false });
  const logged = (weight: number) => ({ completed: true, skipped: false, repsCompleted: 8, weight });

  it("keeps sets that have logged data even above the prescribed count", () => {
    const sets = [logged(100), logged(100), logged(105), logged(105)];
    expect(normalizeSetCompletions(sets, 2)).toEqual(sets);
  });

  it("trims only trailing empty sets", () => {
    const sets = [logged(100), logged(100), logged(105), empty(), empty()];
    expect(normalizeSetCompletions(sets, 2)).toEqual(sets.slice(0, 3));
  });

  it("treats partially entered or skipped sets as logged", () => {
    const sets = [empty(), empty(), { completed: false, skipped: false, weight: 95 }, { completed: false, skipped: true }];
    expect(normalizeSetCompletions(sets, 2)).toHaveLength(4);
  });

  it("trims empty sets down to the prescription", () => {
    expect(normalizeSetCompletions([empty(), empty(), empty(), empty()], 2)).toHaveLength(2);
  });

  it("pads up to the prescription and keeps at least one set", () => {
    expect(normalizeSetCompletions([logged(100)], 3)).toHaveLength(3);
    expect(normalizeSetCompletions([], 0)).toHaveLength(1);
  });
});
