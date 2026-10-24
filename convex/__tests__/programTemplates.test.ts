import { describe, expect, it } from "vitest";
import { EXERCISES } from "../seedData";
import {
  buildExerciseModeVariants,
  normalizeEquipmentMode,
} from "../exerciseMatching";
import {
  buildPrescriptionModeVariants,
  selectActiveEquipmentVariant,
} from "../programTemplates";

const getExercise = (slug: string) => {
  const exercise = EXERCISES.find((entry) => entry.slug === slug);
  expect(exercise, `Expected exercise "${slug}" to exist in seedData`).toBeDefined();
  return exercise!;
};

describe("programTemplates equipment variants", () => {
  it("builds gym and home exercise variants for a known push pattern", () => {
    const variants = buildExerciseModeVariants(getExercise("bench_press"), EXERCISES);

    expect(variants.sourceMode).toBe("gym");
    expect(variants.gym?.slug).toBe("bench_press");
    expect(variants.home?.slug).toBe("push_up");
    expect(variants.hasAlternative).toBe(true);
  });

  it("never builds variants for warmup prescriptions", () => {
    const variants = buildPrescriptionModeVariants(
      { section: "warmup" },
      getExercise("med_ball_chest_pass_warmup"),
      EXERCISES,
    );

    expect(variants.gym?.slug).toBe("med_ball_chest_pass_warmup");
    expect(variants.home?.slug).toBe("med_ball_chest_pass_warmup");
    expect(variants.hasAlternative).toBe(false);
  });

  it("builds variants for main and unsectioned prescriptions", () => {
    for (const section of ["main", undefined] as const) {
      const variants = buildPrescriptionModeVariants(
        { section },
        getExercise("bench_press"),
        EXERCISES,
      );

      expect(variants.home?.slug).toBe("push_up");
      expect(variants.hasAlternative).toBe(true);
    }
  });

  it("selects the active home variant when one exists", () => {
    const sourceVariant = {
      exercise: getExercise("bench_press"),
      scaledSets: 3,
    };
    const homeVariant = {
      exercise: getExercise("push_up"),
      scaledSets: 4,
    };

    const activeVariant = selectActiveEquipmentVariant(
      normalizeEquipmentMode("home"),
      {
        gym: sourceVariant,
        home: homeVariant,
      },
      sourceVariant,
    );

    expect(activeVariant.exercise.slug).toBe("push_up");
    expect(activeVariant.scaledSets).toBe(4);
  });

  it("falls back to the source variant when the requested mode has no alternative", () => {
    const sourceVariant = {
      exercise: getExercise("goblet_carry"),
      scaledSets: 2,
    };

    const activeVariant = selectActiveEquipmentVariant(
      normalizeEquipmentMode("home"),
      {
        gym: sourceVariant,
        home: null,
      },
      sourceVariant,
    );

    expect(activeVariant.exercise.slug).toBe("goblet_carry");
    expect(activeVariant.scaledSets).toBe(2);
  });
});
