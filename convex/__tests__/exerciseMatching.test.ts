import { describe, expect, it } from "vitest";
import { EXERCISES } from "../seedData";
import {
  buildExerciseModeVariants,
  calculateSignatureOverlap,
  extractMovementSignature,
  findHomeMatch,
  inferEquipmentMode,
  resolveExerciseForMode,
  scoreHomeCandidate,
  type ExerciseLike,
} from "../exerciseMatching";

const getExercise = (slug: string) => {
  const exercise = EXERCISES.find((entry) => entry.slug === slug);
  expect(exercise, `Expected exercise "${slug}" to exist in seedData`).toBeDefined();
  return exercise!;
};

const homeSlugFor = (slug: string) =>
  resolveExerciseForMode(getExercise(slug), EXERCISES, "home")?.slug ?? null;

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

    it("treats exercises with no equipment as home mode", () => {
      expect(inferEquipmentMode({ slug: "x", tags: [], equipment: [] })).toBe("home");
      expect(inferEquipmentMode({ slug: "x", tags: [] })).toBe("home");
    });

    it("treats any exercise that lists bodyweight as home, since the load is optional", () => {
      expect(inferEquipmentMode(getExercise("reverse_lunge"))).toBe("home");
      expect(inferEquipmentMode(getExercise("cossack_squat"))).toBe("home");
    });

    it("treats a wall as home equipment", () => {
      expect(inferEquipmentMode({ slug: "x", tags: [], equipment: ["wall"] })).toBe("home");
      expect(inferEquipmentMode(getExercise("wall_push_up"))).toBe("home");
    });

    it("treats full gym equipment exercises as gym mode", () => {
      expect(inferEquipmentMode(getExercise("bench_press"))).toBe("gym");
      expect(inferEquipmentMode(getExercise("battle_rope_slams"))).toBe("gym");
    });

    it("keeps bench, plyo box, medicine ball and foam roller as gym (open product question)", () => {
      expect(inferEquipmentMode(getExercise("box_jump"))).toBe("gym");
      expect(inferEquipmentMode(getExercise("med_ball_slam"))).toBe("gym");
      expect(inferEquipmentMode(getExercise("med_ball_rotational_throw"))).toBe("gym");
      expect(inferEquipmentMode(getExercise("foam_roll_quads"))).toBe("gym");
      expect(inferEquipmentMode({ slug: "x", tags: [], equipment: ["bench"] })).toBe("gym");
    });
  });

  describe("scoreHomeCandidate", () => {
    const source: ExerciseLike = {
      slug: "src",
      tags: ["push", "vertical", "strength", "bilateral"],
      equipment: ["barbell"],
      difficulty: "intermediate",
    };

    it("rejects candidates that share no primary movement pattern", () => {
      expect(
        scoreHomeCandidate(source, { slug: "c", tags: ["pull", "vertical"], equipment: [] }),
      ).toBeNull();
      expect(
        scoreHomeCandidate(
          { slug: "s", tags: ["plyometric", "vertical", "power"], equipment: ["plyo_box"] },
          { slug: "c", tags: ["pull", "vertical"], equipment: [] },
        ),
      ).toBeNull();
    });

    it("rejects candidates whose direction differs when both declare one", () => {
      expect(
        scoreHomeCandidate(source, { slug: "c", tags: ["push", "horizontal"], equipment: [] }),
      ).toBeNull();
    });

    it("allows candidates without a direction tag", () => {
      expect(
        scoreHomeCandidate(source, { slug: "c", tags: ["push"], equipment: [] }),
      ).not.toBeNull();
    });

    it("rejects candidates harder than the source when both have a difficulty", () => {
      expect(
        scoreHomeCandidate(source, {
          slug: "c",
          tags: ["push", "vertical"],
          equipment: [],
          difficulty: "advanced",
        }),
      ).toBeNull();
      expect(
        scoreHomeCandidate(source, { slug: "c", tags: ["push", "vertical"], equipment: [] }),
      ).not.toBeNull();
    });

    it("ranks a shared direction above a shared intent", () => {
      const sameDirection = scoreHomeCandidate(source, {
        slug: "c",
        tags: ["push", "vertical"],
        equipment: [],
      })!;
      const sameIntent = scoreHomeCandidate(source, {
        slug: "c",
        tags: ["push", "strength"],
        equipment: [],
      })!;
      expect(sameDirection).toBeGreaterThan(sameIntent);
    });

    it("gives a bonus for shared intent", () => {
      const power: ExerciseLike = { slug: "p", tags: ["squat", "power"], equipment: ["barbell"] };
      const plyo = scoreHomeCandidate(power, { slug: "c", tags: ["squat", "plyometric"], equipment: [] })!;
      const strength = scoreHomeCandidate(power, { slug: "c", tags: ["squat", "strength"], equipment: [] })!;
      expect(plyo).toBeGreaterThan(strength);
    });

    it("treats carries as isometric and conditioning as its own intent", () => {
      const carry: ExerciseLike = { slug: "c", tags: ["carry", "anti_extension"], equipment: ["kettlebell"] };
      const hold = scoreHomeCandidate(carry, { slug: "h", tags: ["anti_extension", "isometric"], equipment: [] })!;
      const dynamic = scoreHomeCandidate(carry, { slug: "d", tags: ["anti_extension"], equipment: [] })!;
      expect(hold).toBeGreaterThan(dynamic);

      const drag: ExerciseLike = { slug: "s", tags: ["pull", "conditioning"], equipment: ["sled"] };
      const crawl = scoreHomeCandidate(drag, { slug: "r", tags: ["pull", "conditioning"], equipment: [] })!;
      const row = scoreHomeCandidate(drag, { slug: "b", tags: ["pull"], equipment: [] })!;
      expect(crawl).toBeGreaterThan(row);
    });

    it("gives a bonus for matching plane of motion", () => {
      const lateral: ExerciseLike = { slug: "l", tags: ["lunge", "frontal"], equipment: ["box"] };
      const frontal = scoreHomeCandidate(lateral, { slug: "f", tags: ["lunge", "frontal"], equipment: [] })!;
      const sagittal = scoreHomeCandidate(lateral, { slug: "s", tags: ["lunge", "strength"], equipment: [] })!;
      expect(frontal).toBeGreaterThan(sagittal);
    });

    it("gives a bonus for matching laterality", () => {
      const unilateral: ExerciseLike = {
        slug: "u",
        tags: ["hinge", "unilateral"],
        equipment: ["dumbbell"],
      };
      const singleLeg = scoreHomeCandidate(unilateral, { slug: "c", tags: ["hinge", "single_leg"], equipment: [] })!;
      const bilateral = scoreHomeCandidate(unilateral, { slug: "c", tags: ["hinge", "bilateral"], equipment: [] })!;
      expect(singleLeg).toBeGreaterThan(bilateral);
    });
  });

  describe("findHomeMatch", () => {
    it("returns null when nothing shares a movement pattern", () => {
      const source: ExerciseLike = {
        slug: "custom_gym_balance_drill",
        tags: ["balance"],
        equipment: ["bosu"],
      };
      const candidates: ExerciseLike[] = [
        source,
        { slug: "custom_home_strength_move", tags: ["strength"], equipment: ["bodyweight"] },
      ];

      expect(findHomeMatch(source, candidates)).toBeNull();
    });

    it("only considers home exercises", () => {
      const source: ExerciseLike = { slug: "a", tags: ["squat"], equipment: ["barbell"] };
      const candidates: ExerciseLike[] = [
        source,
        { slug: "b", tags: ["squat"], equipment: ["dumbbell"] },
      ];

      expect(findHomeMatch(source, candidates)).toBeNull();
    });

    it("prefers pure home equipment over bodyweight moves that also need gym gear", () => {
      const source: ExerciseLike = { slug: "a", tags: ["push"], equipment: ["barbell"] };
      const candidates: ExerciseLike[] = [
        source,
        { slug: "a_bench_push", tags: ["push"], equipment: ["bodyweight", "bench"] },
        { slug: "z_floor_push", tags: ["push"], equipment: ["bodyweight"] },
      ];

      expect(findHomeMatch(source, candidates)?.slug).toBe("z_floor_push");
    });
  });

  describe("seeded home swaps", () => {
    it("swaps bench press for push-ups", () => {
      expect(homeSlugFor("bench_press")).toBe("push_up");
    });

    it("swaps vertical presses for a vertical push, not a horizontal one", () => {
      expect(homeSlugFor("overhead_press")).toBe("pike_pushup");
      expect(homeSlugFor("push_press")).not.toBe("diamond_pushup");
    });

    it("keeps pull-ups at or below the source difficulty", () => {
      expect(homeSlugFor("weighted_pull_up")).toBe("pull_up");
      expect(homeSlugFor("lat_pulldown")).toBe("assisted_pull_up");
    });

    it("leaves jumps without a movement pattern unmatched instead of picking a pull", () => {
      expect(homeSlugFor("drop_jump")).toBeNull();
      expect(homeSlugFor("box_jump")).toBeNull();
    });

    it("leaves loaded carries unmatched instead of picking a squat", () => {
      expect(homeSlugFor("farmers_carry")).toBeNull();
      expect(homeSlugFor("goblet_carry")).toBeNull();
    });

    it("swaps a carry for an isometric hold rather than a dynamic core move", () => {
      expect(homeSlugFor("front_rack_carry")).not.toBe("hanging_leg_raise");
      expect(getExercise(homeSlugFor("front_rack_carry")!).tags).toContain("isometric");
      expect(getExercise(homeSlugFor("suitcase_carry")!).tags).toEqual(
        expect.arrayContaining(["anti_lateral_flexion", "isometric"]),
      );
    });

    it("swaps conditioning drags for conditioning, not strict pull-ups", () => {
      expect(homeSlugFor("sled_pull")).toBe("reverse_bear_crawl");
    });

    it("keeps lunges in the same plane", () => {
      expect(homeSlugFor("deficit_reverse_lunge")).toBe("reverse_lunge");
      expect(homeSlugFor("lateral_step_up")).toBe("lateral_lunge");
    });

    it("never swaps a home exercise in home mode", () => {
      for (const exercise of EXERCISES.filter((e) => inferEquipmentMode(e) === "home")) {
        expect(resolveExerciseForMode(exercise, EXERCISES, "home")?.slug).toBe(exercise.slug);
      }
    });
  });

  describe("resolveExerciseForMode", () => {
    const pushUp: ExerciseLike = { slug: "push_up", tags: ["push", "horizontal"], equipment: ["bodyweight"] };
    const bench: ExerciseLike = { slug: "bench_press", tags: ["push", "horizontal"], equipment: ["barbell"] };
    const sled: ExerciseLike = { slug: "sled_push", tags: ["conditioning"], equipment: ["sled"] };
    const boxJump: ExerciseLike = { slug: "box_jump", tags: ["plyometric"], equipment: ["plyo_box"] };
    const broadJump: ExerciseLike = { slug: "broad_jump", tags: ["plyometric"], equipment: ["bodyweight"] };

    describe("gym mode", () => {
      it("keeps every seeded exercise as itself when no overrides exist", () => {
        for (const exercise of EXERCISES) {
          expect(resolveExerciseForMode(exercise, EXERCISES, "gym")?.slug).toBe(exercise.slug);
        }
      });

      it("never auto-matches a home exercise to a gym one", () => {
        expect(resolveExerciseForMode(pushUp, [pushUp, bench], "gym")?.slug).toBe("push_up");
      });

      it("uses gymAlternativeSlug when it resolves", () => {
        const source = { ...boxJump, gymAlternativeSlug: "sled_push" };
        expect(resolveExerciseForMode(source, [source, sled], "gym")?.slug).toBe("sled_push");
      });

      it("falls back to the exercise itself when gymAlternativeSlug does not resolve", () => {
        const source = { ...boxJump, gymAlternativeSlug: "missing_slug" };
        expect(resolveExerciseForMode(source, [source, sled], "gym")?.slug).toBe("box_jump");
      });
    });

    describe("home mode", () => {
      it("keeps a home exercise as itself even with a homeAlternativeSlug", () => {
        const source = { ...pushUp, homeAlternativeSlug: "broad_jump" };
        expect(resolveExerciseForMode(source, [source, broadJump], "home")?.slug).toBe("push_up");
      });

      it("uses homeAlternativeSlug when it resolves to a home exercise", () => {
        const source = { ...boxJump, homeAlternativeSlug: "broad_jump" };
        expect(resolveExerciseForMode(source, [source, broadJump], "home")?.slug).toBe("broad_jump");
      });

      it("ignores a homeAlternativeSlug that points at a gym exercise and auto-matches instead", () => {
        const source = { ...bench, homeAlternativeSlug: "sled_push" };
        expect(resolveExerciseForMode(source, [source, sled, pushUp], "home")?.slug).toBe("push_up");
      });

      it("returns null when a gym exercise has no override and no strict match", () => {
        expect(resolveExerciseForMode(boxJump, [boxJump, broadJump], "home")).toBeNull();
      });
    });
  });

  describe("buildExerciseModeVariants", () => {
    it("reports an alternative only when some mode resolves to a different exercise", () => {
      expect(buildExerciseModeVariants(getExercise("push_up"), EXERCISES).hasAlternative).toBe(false);
      expect(buildExerciseModeVariants(getExercise("farmers_carry"), EXERCISES).hasAlternative).toBe(false);
      expect(buildExerciseModeVariants(getExercise("bench_press"), EXERCISES).hasAlternative).toBe(true);
    });
  });
});
