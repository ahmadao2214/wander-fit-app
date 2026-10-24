import { describe, expect, it } from "vitest";
import { EXERCISES } from "../seedData";
import {
  buildExerciseAudit,
  formatExerciseAuditMarkdown,
} from "../exerciseMatching";

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
        (entry) => entry.exercise.slug === "bench_press" && entry.alternative?.slug === "push_up",
      ),
    ).toBe(true);
  });

  it("flags unmatched exercises as gaps", () => {
    const audit = buildExerciseAudit(EXERCISES);
    const allEntries = audit.flatMap((group) => group.entries);
    const gobletCarry = allEntries.find(
      (entry) => entry.exercise.slug === "goblet_carry",
    );

    expect(gobletCarry).toBeDefined();
    expect(gobletCarry?.isGap).toBe(true);
    expect(gobletCarry?.alternative).toBeNull();
  });

  it("formats the audit as markdown", () => {
    const markdown = formatExerciseAuditMarkdown(buildExerciseAudit(EXERCISES));

    expect(markdown).toContain("# Exercise Equipment Audit");
    expect(markdown).toContain("## bilateral + horizontal + push");
    expect(markdown).toContain("| Exercise | Equipment | Mode | Target Mode | Auto Match | Override | Gap |");
    expect(markdown).toContain("Bench Press");
  });
});
