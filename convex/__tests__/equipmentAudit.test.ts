import { describe, expect, it } from "vitest";
import { EXERCISES } from "../seedData";
import {
  buildExerciseAudit,
  formatExerciseAuditMarkdown,
  type ExerciseLike,
} from "../exerciseMatching";

const findEntry = (exercises: ExerciseLike[], slug: string) =>
  buildExerciseAudit(exercises)
    .flatMap((group) => group.entries)
    .find((entry) => entry.exercise.slug === slug);

describe("equipment audit foundation", () => {
  it("includes the new gym-conditioning exercises in seed data", () => {
    const expectedSlugs = [
      "battle_rope_slams",
      "battle_rope_waves",
      "ski_erg_sprint",
      "assault_bike_sprint",
      "stair_climber_sprint",
      "curve_woodway_sprint",
    ];

    for (const slug of expectedSlugs) {
      expect(EXERCISES.find((exercise) => exercise.slug === slug)).toBeDefined();
    }
  });

  it("builds grouped audit entries for the seeded exercise library", () => {
    const audit = buildExerciseAudit(EXERCISES);

    expect(audit.length).toBeGreaterThan(0);

    const horizontalPushGroup = audit.find(
      (group) => group.key === "bilateral + horizontal + push",
    );

    expect(horizontalPushGroup).toBeDefined();
    expect(
      horizontalPushGroup?.entries.some(
        (entry) => entry.exercise.slug === "bench_press" && entry.home?.slug === "push_up",
      ),
    ).toBe(true);
  });

  it("reports both directions for every exercise", () => {
    const bench = findEntry(EXERCISES, "bench_press");
    expect(bench?.gym?.slug).toBe("bench_press");
    expect(bench?.home?.slug).toBe("push_up");

    const pushUp = findEntry(EXERCISES, "push_up");
    expect(pushUp?.gym?.slug).toBe("push_up");
    expect(pushUp?.home?.slug).toBe("push_up");
    expect(pushUp?.isGap).toBe(false);
  });

  it("flags gym exercises with no home match as gaps", () => {
    const gobletCarry = findEntry(EXERCISES, "goblet_carry");

    expect(gobletCarry).toBeDefined();
    expect(gobletCarry?.isGap).toBe(true);
    expect(gobletCarry?.home).toBeNull();
  });

  it("has no unresolved overrides in the seeded library", () => {
    const unresolved = buildExerciseAudit(EXERCISES)
      .flatMap((group) => group.entries)
      .flatMap((entry) => entry.unresolvedOverrides);

    expect(unresolved).toEqual([]);
  });

  it("flags overrides that do not resolve", () => {
    const exercises: ExerciseLike[] = [
      {
        slug: "box_jump",
        name: "Box Jump",
        tags: ["plyometric"],
        equipment: ["plyo_box"],
        gymAlternativeSlug: "missing_slug",
        homeAlternativeSlug: "sled_push",
      },
      { slug: "sled_push", name: "Sled Push", tags: [], equipment: ["sled"] },
      {
        slug: "push_up",
        name: "Push-Up",
        tags: ["push"],
        equipment: ["bodyweight"],
        homeAlternativeSlug: "sled_push",
      },
    ];

    const boxJump = findEntry(exercises, "box_jump");
    expect(boxJump?.unresolvedOverrides).toEqual([
      { field: "gymAlternativeSlug", slug: "missing_slug", reason: "no exercise with this slug" },
      { field: "homeAlternativeSlug", slug: "sled_push", reason: "target is not a home exercise" },
    ]);

    const pushUp = findEntry(exercises, "push_up");
    expect(pushUp?.unresolvedOverrides).toEqual([
      { field: "homeAlternativeSlug", slug: "sled_push", reason: "source is already a home exercise" },
    ]);

    const markdown = formatExerciseAuditMarkdown(buildExerciseAudit(exercises));
    expect(markdown).toContain("## Unresolved overrides");
    expect(markdown).toContain("missing_slug");
  });

  it("formats the audit as markdown", () => {
    const markdown = formatExerciseAuditMarkdown(buildExerciseAudit(EXERCISES));

    expect(markdown).toContain("# Exercise Equipment Audit");
    expect(markdown).toContain("## bilateral + horizontal + push");
    expect(markdown).toContain("| Exercise | Equipment | Mode | Gym Mode | Home Mode | Overrides | Gap |");
    expect(markdown).toContain("Bench Press");
    expect(markdown).not.toContain("## Unresolved overrides");
  });
});
