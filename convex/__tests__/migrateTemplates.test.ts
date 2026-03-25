import { describe, it, expect } from "vitest";
import {
  generateTemplate,
  PHASES,
  SKILL_LEVELS,
  WEEKS,
  DAYS,
} from "../generateTemplates";
import type { GppCategoryId, TemplateDefinition } from "../generateTemplates";

// ═══════════════════════════════════════════════════════════════════════════════
// GENERATE TEMPLATE OUTPUT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("generateTemplate", () => {
  // Generate one template per day type for thorough coverage
  const sampleTemplates: TemplateDefinition[] = DAYS.map((day) =>
    generateTemplate(1 as GppCategoryId, "GPP", "Moderate", 1, day)
  );

  it("should produce templates with no 'Day' in the name", () => {
    for (const categoryId of [1, 2, 3, 4] as GppCategoryId[]) {
      for (const phase of PHASES) {
        for (const skillLevel of SKILL_LEVELS) {
          for (const week of WEEKS) {
            for (const day of DAYS) {
              const template = generateTemplate(
                categoryId,
                phase,
                skillLevel,
                week,
                day
              );
              expect(template.name).not.toMatch(/Day \d/);
            }
          }
        }
      }
    }
  });

  it("should produce warmup exercises with section: 'warmup'", () => {
    for (const template of sampleTemplates) {
      const warmupExercises = template.exercises.filter(
        (e) => e.warmupPhase !== undefined
      );
      for (const ex of warmupExercises) {
        expect(ex.section).toBe("warmup");
      }
    }
  });

  it("should produce warmup exercises with valid warmupPhase values", () => {
    const validPhases = [
      "foam_rolling",
      "mobility",
      "core_isometric",
      "core_dynamic",
      "walking_drills",
      "movement_prep",
      "power_primer",
    ];

    for (const template of sampleTemplates) {
      const warmupExercises = template.exercises.filter(
        (e) => e.section === "warmup"
      );
      for (const ex of warmupExercises) {
        expect(ex.warmupPhase).toBeDefined();
        expect(validPhases).toContain(ex.warmupPhase);
      }
    }
  });

  it("should produce main exercises with section: 'main'", () => {
    for (const template of sampleTemplates) {
      const mainExercises = template.exercises.filter(
        (e) => e.section === "main"
      );
      // Every non-recovery template should have main exercises
      if (template.day !== 7) {
        expect(mainExercises.length).toBeGreaterThan(0);
      }
    }
  });

  it("should produce exercises for all 7 day types", () => {
    for (const day of DAYS) {
      const template = generateTemplate(
        1 as GppCategoryId,
        "GPP",
        "Moderate",
        1,
        day
      );
      expect(template.exercises.length).toBeGreaterThan(0);
      expect(template.day).toBe(day);
    }
  });

  it("should produce correct name format: '{DayName} - {WeekDescriptor}'", () => {
    const dayNames = [
      "Lower Body A",
      "Upper Body A",
      "Power & Conditioning",
      "Lower Body B",
      "Upper Body B",
      "Full Body Athletic",
      "Active Recovery",
    ];
    const weekDescriptors = ["Foundation", "Build", "Peak", "Deload"];

    for (const week of WEEKS) {
      for (const day of DAYS) {
        const template = generateTemplate(
          1 as GppCategoryId,
          "GPP",
          "Moderate",
          week,
          day
        );
        const expectedName = `${dayNames[day - 1]} - ${weekDescriptors[week - 1]}`;
        expect(template.name).toBe(expectedName);
      }
    }
  });

  it("warmup exercises should appear before main exercises (by orderIndex)", () => {
    for (const template of sampleTemplates) {
      const warmupExercises = template.exercises.filter(
        (e) => e.section === "warmup"
      );
      const mainExercises = template.exercises.filter(
        (e) => e.section === "main"
      );

      if (warmupExercises.length > 0 && mainExercises.length > 0) {
        const maxWarmupOrder = Math.max(
          ...warmupExercises.map((e) => e.orderIndex)
        );
        const minMainOrder = Math.min(
          ...mainExercises.map((e) => e.orderIndex)
        );
        expect(maxWarmupOrder).toBeLessThan(minMainOrder);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OLD TEMPLATE DETECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("migration: old template detection", () => {
  it("template exercises missing section field should be flagged as old", () => {
    // Simulate old seed data shape
    const oldExercises = [
      {
        exerciseSlug: "goblet_squat",
        sets: 3,
        reps: "10",
        restSeconds: 60,
        orderIndex: 0,
        notes: "Warmup",
        // No section or warmupPhase fields
      },
    ];

    const hasMissingSection = oldExercises.some((e) => !("section" in e) || e.section === undefined);
    expect(hasMissingSection).toBe(true);
  });

  it("template exercises with section: 'warmup' + warmupPhase should not be flagged", () => {
    // Exercises from generateTemplate have proper fields
    const template = generateTemplate(
      1 as GppCategoryId,
      "GPP",
      "Moderate",
      1,
      1
    );

    const warmupExercises = template.exercises.filter(
      (e) => e.section === "warmup"
    );

    // All warmup exercises should have both section and warmupPhase
    for (const ex of warmupExercises) {
      expect(ex.section).toBe("warmup");
      expect(ex.warmupPhase).toBeDefined();
    }

    // No exercises should be missing section
    const hasMissingSection = template.exercises.some(
      (e) => e.section === undefined
    );
    expect(hasMissingSection).toBe(false);
  });
});
