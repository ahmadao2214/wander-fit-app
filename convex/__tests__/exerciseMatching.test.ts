import { describe, expect, it } from "vitest";
import { EXERCISES } from "../seedData";
import {
  calculateSignatureOverlap,
  extractMovementSignature,
  findAlternativeExercise,
  inferEquipmentMode,
  type ExerciseLike,
} from "../exerciseMatching";

const getExercise = (slug: string) => {
  const exercise = EXERCISES.find((entry) => entry.slug === slug);
  expect(exercise, `Expected exercise "${slug}" to exist in seedData`).toBeDefined();
  return exercise!;
};

describe("exerciseMatching", () => {
  describe("extractMovementSignature", () => {
    it("keeps only movement-defining tags", () => {
      expect(
        extractMovementSignature([
          "upper_body",
          "push",
          "horizontal",
          "strength",
          "bodyweight",
          "bilateral",
        ]),
      ).toEqual(["bilateral", "horizontal", "push"]);
    });

    it("deduplicates repeated movement tags", () => {
      expect(
        extractMovementSignature(["push", "push", "horizontal", "horizontal"]),
      ).toEqual(["horizontal", "push"]);
    });
  });

  describe("calculateSignatureOverlap", () => {
    it("scores shared movement tags with weighting", () => {
      const source = extractMovementSignature(["push", "horizontal", "bilateral"]);
      const target = extractMovementSignature(["push", "horizontal"]);

      expect(calculateSignatureOverlap(source, target)).toBe(5);
      expect(calculateSignatureOverlap(target, source)).toBe(5);
    });

    it("returns zero when one signature is empty", () => {
      expect(calculateSignatureOverlap([], ["push"])).toBe(0);
    });
  });

  describe("inferEquipmentMode", () => {
    it("treats bodyweight and minimal-gear exercises as home mode", () => {
      expect(inferEquipmentMode(getExercise("push_up"))).toBe("home");
      expect(inferEquipmentMode(getExercise("hanging_leg_raise"))).toBe("home");
    });

    it("treats full gym equipment exercises as gym mode", () => {
      expect(inferEquipmentMode(getExercise("bench_press"))).toBe("gym");
      expect(inferEquipmentMode(getExercise("battle_rope_slams"))).toBe("gym");
    });
  });

  describe("findAlternativeExercise", () => {
    it("finds a known gym-to-home match for bench press", () => {
      const alternative = findAlternativeExercise(
        getExercise("bench_press"),
        EXERCISES,
        "home",
      );

      expect(alternative?.slug).toBe("push_up");
    });

    it("returns null when no opposite-mode match exists", () => {
      const source: ExerciseLike = {
        slug: "custom_home_balance_drill",
        name: "Custom Home Balance Drill",
        tags: ["balance"],
        equipment: ["bodyweight"],
      };

      const candidates: ExerciseLike[] = [
        source,
        {
          slug: "custom_gym_strength_move",
          name: "Custom Gym Strength Move",
          tags: ["strength"],
          equipment: ["barbell"],
        },
      ];

      const alternative = findAlternativeExercise(
        source,
        candidates,
        "home",
      );

      expect(alternative).toBeNull();
    });

    it("prefers preferredAlternativeSlug over score-based matching", () => {
      const source: ExerciseLike = {
        slug: "custom_box_jump",
        name: "Custom Box Jump",
        tags: ["lower_body", "power", "conditioning", "plyometric"],
        equipment: ["bodyweight"],
        preferredAlternativeSlug: "sled_push",
      };

      const candidates: ExerciseLike[] = [
        source,
        {
          slug: "sled_push",
          name: "Sled Push",
          tags: ["full_body", "conditioning", "strength", "posterior_chain"],
          equipment: ["sled"],
        },
        {
          slug: "assault_bike_sprint",
          name: "Assault Bike Sprint",
          tags: ["full_body", "conditioning", "power"],
          equipment: ["assault_bike"],
        },
      ];

      const alternative = findAlternativeExercise(source, candidates, "gym");

      expect(alternative?.slug).toBe("sled_push");
    });
  });
});
