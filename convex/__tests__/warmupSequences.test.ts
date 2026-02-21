import { describe, it, expect } from "vitest";
import {
  WARMUP_PHASES,
  WARMUP_POOLS,
  generateWarmupPrescriptions,
  getWarmupDuration,
  getWarmupPhaseGroups,
  getActivePhasesForDayType,
} from "../warmupSequences";
import { EXERCISES } from "../seedData";

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CONFIGURATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("WARMUP_PHASES", () => {
  it("should define exactly 7 phases", () => {
    expect(WARMUP_PHASES).toHaveLength(7);
  });

  it("should have phases in correct order", () => {
    const phaseOrder = WARMUP_PHASES.map((p) => p.phase);
    expect(phaseOrder).toEqual([
      "foam_rolling",
      "mobility",
      "core_isometric",
      "core_dynamic",
      "walking_drills",
      "movement_prep",
      "power_primer",
    ]);
  });

  it("foam_rolling should be optional", () => {
    const foamRolling = WARMUP_PHASES.find((p) => p.phase === "foam_rolling");
    expect(foamRolling?.optional).toBe(true);
  });

  it("non-foam-rolling phases should not be optional", () => {
    const nonFoamRolling = WARMUP_PHASES.filter(
      (p) => p.phase !== "foam_rolling"
    );
    for (const phase of nonFoamRolling) {
      expect(phase.optional).toBe(false);
    }
  });

  it("each phase should have a label", () => {
    for (const phase of WARMUP_PHASES) {
      expect(phase.label).toBeTruthy();
      expect(typeof phase.label).toBe("string");
    }
  });

  it("each phase should have exerciseCount > 0", () => {
    for (const phase of WARMUP_PHASES) {
      expect(phase.exerciseCount).toBeGreaterThan(0);
    }
  });

  it("total duration for all phases should be approximately 10-12 minutes", () => {
    const totalDuration = WARMUP_PHASES.reduce(
      (sum, p) => sum + p.durationMin,
      0
    );
    expect(totalDuration).toBeGreaterThanOrEqual(10);
    expect(totalDuration).toBeLessThanOrEqual(14);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DAY-TYPE PHASE VARIATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getActivePhasesForDayType", () => {
  it("lower_a should have all 7 phases", () => {
    const phases = getActivePhasesForDayType("lower_a");
    expect(phases).toHaveLength(7);
  });

  it("upper_a should have all 7 phases", () => {
    const phases = getActivePhasesForDayType("upper_a");
    expect(phases).toHaveLength(7);
  });

  it("power should have all 7 phases", () => {
    const phases = getActivePhasesForDayType("power");
    expect(phases).toHaveLength(7);
  });

  it("full_body should have all 7 phases", () => {
    const phases = getActivePhasesForDayType("full_body");
    expect(phases).toHaveLength(7);
  });

  it("recovery should have only 2 phases (foam_rolling and mobility)", () => {
    const phases = getActivePhasesForDayType("recovery");
    expect(phases).toHaveLength(2);
    expect(phases).toContain("foam_rolling");
    expect(phases).toContain("mobility");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE POOLS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("WARMUP_POOLS", () => {
  const dayTypes = [
    "lower_a",
    "upper_a",
    "power",
    "lower_b",
    "upper_b",
    "full_body",
    "recovery",
  ] as const;

  it("should have pools for all day types", () => {
    for (const dayType of dayTypes) {
      expect(WARMUP_POOLS[dayType]).toBeDefined();
    }
  });

  it("all exercise slugs in pools should exist in EXERCISES seed data", () => {
    const validSlugs = new Set(EXERCISES.map((e) => e.slug));
    for (const dayType of dayTypes) {
      const dayPools = WARMUP_POOLS[dayType];
      for (const [phase, slugs] of Object.entries(dayPools)) {
        for (const slug of slugs as string[]) {
          expect(validSlugs.has(slug)).toBe(true);
        }
      }
    }
  });

  it("each active phase pool should have enough exercises for its exerciseCount", () => {
    for (const dayType of dayTypes) {
      const activePhases = getActivePhasesForDayType(dayType);
      const dayPools = WARMUP_POOLS[dayType];

      for (const phase of activePhases) {
        const phaseConfig = WARMUP_PHASES.find((p) => p.phase === phase);
        const pool = dayPools[phase];
        if (pool && phaseConfig) {
          expect(pool.length).toBeGreaterThanOrEqual(phaseConfig.exerciseCount);
        }
      }
    }
  });

  it("recovery day should only have foam_rolling and mobility pools", () => {
    const recoveryPools = WARMUP_POOLS["recovery"];
    const poolPhases = Object.keys(recoveryPools);
    expect(poolPhases).toContain("foam_rolling");
    expect(poolPhases).toContain("mobility");
    expect(poolPhases).not.toContain("power_primer");
    expect(poolPhases).not.toContain("walking_drills");
    expect(poolPhases).not.toContain("movement_prep");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE WARMUP PRESCRIPTIONS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateWarmupPrescriptions", () => {
  it("should return exercises with section: 'warmup'", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a");
    for (const ex of prescriptions) {
      expect(ex.section).toBe("warmup");
    }
  });

  it("should set warmupPhase on each exercise", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a");
    for (const ex of prescriptions) {
      expect(ex.warmupPhase).toBeDefined();
    }
  });

  it("exercises should be in phase order", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a");
    const phaseOrder = WARMUP_PHASES.map((p) => p.phase);

    let lastPhaseIndex = -1;
    for (const ex of prescriptions) {
      const currentPhaseIndex = phaseOrder.indexOf(ex.warmupPhase!);
      expect(currentPhaseIndex).toBeGreaterThanOrEqual(lastPhaseIndex);
      lastPhaseIndex = currentPhaseIndex;
    }
  });

  it("exercises should have sequential orderIndex values", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a", false, 0);
    for (let i = 0; i < prescriptions.length; i++) {
      expect(prescriptions[i].orderIndex).toBe(i);
    }
  });

  it("should respect startingOrderIndex parameter", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a", false, 5);
    expect(prescriptions[0].orderIndex).toBe(5);
    for (let i = 1; i < prescriptions.length; i++) {
      expect(prescriptions[i].orderIndex).toBe(prescriptions[i - 1].orderIndex + 1);
    }
  });

  it("should have no duplicate exercise slugs within a warmup", () => {
    const dayTypes = ["lower_a", "upper_a", "power", "lower_b", "upper_b", "full_body", "recovery"] as const;
    for (const dayType of dayTypes) {
      const prescriptions = generateWarmupPrescriptions(dayType);
      const slugs = prescriptions.map((e) => e.exerciseSlug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    }
  });

  it("lower days should include hip-specific exercises", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a");
    const slugs = prescriptions.map((e) => e.exerciseSlug);
    // Should include at least one hip-related exercise
    const hipExercises = EXERCISES.filter(
      (e) => slugs.includes(e.slug) && (e.tags.includes("hip") || e.tags.includes("glute"))
    );
    expect(hipExercises.length).toBeGreaterThan(0);
  });

  it("upper days should include thoracic/shoulder-specific exercises", () => {
    const prescriptions = generateWarmupPrescriptions("upper_a");
    const slugs = prescriptions.map((e) => e.exerciseSlug);
    const thoracicExercises = EXERCISES.filter(
      (e) => slugs.includes(e.slug) && (e.tags.includes("thoracic") || e.tags.includes("shoulder"))
    );
    expect(thoracicExercises.length).toBeGreaterThan(0);
  });

  it("recovery days should produce fewer exercises than lower/upper days", () => {
    const recoveryPrescriptions = generateWarmupPrescriptions("recovery");
    const lowerPrescriptions = generateWarmupPrescriptions("lower_a");
    expect(recoveryPrescriptions.length).toBeLessThan(lowerPrescriptions.length);
  });

  it("includeOptional=false should exclude foam rolling exercises", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a", false);
    const foamRollingExercises = prescriptions.filter(
      (e) => e.warmupPhase === "foam_rolling"
    );
    expect(foamRollingExercises).toHaveLength(0);
  });

  it("includeOptional=true should include foam rolling exercises", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a", true);
    const foamRollingExercises = prescriptions.filter(
      (e) => e.warmupPhase === "foam_rolling"
    );
    expect(foamRollingExercises.length).toBeGreaterThan(0);
  });

  it("each exercise should have sets, reps, and restSeconds", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a");
    for (const ex of prescriptions) {
      expect(ex.sets).toBeGreaterThan(0);
      expect(ex.reps).toBeTruthy();
      expect(typeof ex.restSeconds).toBe("number");
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DURATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getWarmupDuration", () => {
  it("should return a lower value for recovery than for lower days", () => {
    const recoveryDuration = getWarmupDuration("recovery");
    const lowerDuration = getWarmupDuration("lower_a");
    expect(recoveryDuration).toBeLessThan(lowerDuration);
  });

  it("should return approximately 10-12 minutes for full day types", () => {
    const lowerDuration = getWarmupDuration("lower_a");
    expect(lowerDuration).toBeGreaterThanOrEqual(8);
    expect(lowerDuration).toBeLessThanOrEqual(14);
  });

  it("recovery duration should be less than 5 minutes", () => {
    const recoveryDuration = getWarmupDuration("recovery");
    expect(recoveryDuration).toBeLessThanOrEqual(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE GROUPING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getWarmupPhaseGroups", () => {
  it("should group exercises by warmupPhase", () => {
    const prescriptions = generateWarmupPrescriptions("lower_a", true);
    const groups = getWarmupPhaseGroups(prescriptions);

    // Should have entries for active phases
    expect(Object.keys(groups).length).toBeGreaterThan(0);

    // Each group should only contain exercises from that phase
    for (const [phase, exercises] of Object.entries(groups)) {
      for (const ex of exercises) {
        expect(ex.warmupPhase).toBe(phase);
      }
    }
  });

  it("should return empty object for empty input", () => {
    const groups = getWarmupPhaseGroups([]);
    expect(Object.keys(groups)).toHaveLength(0);
  });
});
