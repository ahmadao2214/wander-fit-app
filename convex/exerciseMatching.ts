import type { Doc } from "./_generated/dataModel";

export type EquipmentMode = "gym" | "home";

export type ExerciseLike = Pick<
  Doc<"exercises">,
  "slug" | "tags" | "equipment" | "gymAlternativeSlug" | "homeAlternativeSlug" | "difficulty"
> & {
  _id?: unknown;
  name?: string;
};

export type OverrideField = "gymAlternativeSlug" | "homeAlternativeSlug";

export type UnresolvedOverride = {
  field: OverrideField;
  slug: string;
  reason: string;
};

export type ExerciseAuditEntry<T extends ExerciseLike> = {
  exercise: T;
  mode: EquipmentMode;
  signature: string[];
  gym: T;
  home: T | null;
  unresolvedOverrides: UnresolvedOverride[];
  isGap: boolean;
};

export type ExerciseAuditGroup<T extends ExerciseLike> = {
  key: string;
  signature: string[];
  entries: ExerciseAuditEntry<T>[];
};

export type ExerciseModeVariants<T extends ExerciseLike> = {
  gym: T | null;
  home: T | null;
  sourceMode: EquipmentMode;
  hasAlternative: boolean;
};

const MOVEMENT_TAG_WEIGHTS: Record<string, number> = {
  squat: 3,
  hinge: 3,
  lunge: 3,
  push: 3,
  pull: 3,
  carry: 3,
  rotation: 3,
  anti_rotation: 3,
  anti_extension: 3,
  anti_lateral_flexion: 3,
  horizontal: 2,
  vertical: 2,
  incline: 2,
  sagittal: 2,
  frontal: 2,
  transverse: 2,
  bilateral: 1,
  unilateral: 1,
  single_leg: 1,
  single_arm: 1,
};

export const HOME_EQUIPMENT = new Set([
  "bodyweight",
  "band",
  "mini_band",
  "pull_up_bar",
  "wall",
]);

export const MOVEMENT_SIGNATURE_TAGS = new Set(
  Object.keys(MOVEMENT_TAG_WEIGHTS),
);

// A home swap must share at least one of these.
export const PRIMARY_PATTERN_TAGS = new Set([
  "squat",
  "hinge",
  "lunge",
  "push",
  "pull",
  "carry",
  "rotation",
  "anti_rotation",
  "anti_extension",
  "anti_lateral_flexion",
]);

// When both exercises declare a direction, they must share one.
export const DIRECTION_TAGS = new Set(["horizontal", "vertical", "incline"]);

// Carries are loaded isometric trunk work, so they share intent with holds.
const INTENT_BY_TAG: Record<string, string> = {
  power: "power",
  plyometric: "power",
  explosive: "power",
  strength: "strength",
  conditioning: "conditioning",
  isometric: "isometric",
  carry: "isometric",
};

const UNILATERAL_TAGS = new Set(["unilateral", "single_leg", "single_arm"]);

const PLANE_TAGS = ["frontal", "transverse"];

const DIFFICULTY_RANK: Record<string, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const HOME_MATCH_WEIGHTS = {
  pattern: 3,
  direction: 2,
  plane: 2,
  intent: 1,
  laterality: 1,
};

export function normalizeEquipmentMode(
  equipmentMode?: EquipmentMode | null,
): EquipmentMode {
  return equipmentMode ?? "gym";
}

export function extractMovementSignature(tags: string[] = []): string[] {
  return [...new Set(tags.filter((tag) => MOVEMENT_SIGNATURE_TAGS.has(tag)))].sort();
}

export function calculateSignatureOverlap(
  signatureA: string[] = [],
  signatureB: string[] = [],
): number {
  if (signatureA.length === 0 || signatureB.length === 0) {
    return 0;
  }

  const signatureBSet = new Set(signatureB);

  return signatureA.reduce((score, tag) => {
    if (!signatureBSet.has(tag)) {
      return score;
    }

    return score + (MOVEMENT_TAG_WEIGHTS[tag] ?? 0);
  }, 0);
}

/**
 * An exercise is home if it needs no equipment, lists bodyweight (any load is
 * optional, e.g. Reverse Lunge `[dumbbell, bodyweight]`), or only uses home gear.
 */
export function inferEquipmentMode(exercise: ExerciseLike): EquipmentMode {
  const equipment = exercise.equipment ?? [];

  if (equipment.length === 0 || equipment.includes("bodyweight")) {
    return "home";
  }

  return usesOnlyHomeEquipment(exercise) ? "home" : "gym";
}

function usesOnlyHomeEquipment(exercise: ExerciseLike): boolean {
  return (exercise.equipment ?? []).every((item) => HOME_EQUIPMENT.has(item));
}

function isSameExercise(candidate: ExerciseLike, source: ExerciseLike): boolean {
  if (candidate._id !== undefined && source._id !== undefined) {
    return candidate._id === source._id;
  }

  return candidate.slug === source.slug;
}

function getSignatureKey(signature: string[]): string {
  return signature.length > 0 ? signature.join(" + ") : "uncategorized";
}

function countShared(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const tag of a) {
    if (b.has(tag)) shared++;
  }
  return shared;
}

function tagsIn(tags: string[], allowed: Set<string>): Set<string> {
  return new Set(tags.filter((tag) => allowed.has(tag)));
}

function intentsOf(tags: string[]): Set<string> {
  return new Set(
    tags.flatMap((tag) => (INTENT_BY_TAG[tag] ? [INTENT_BY_TAG[tag]] : [])),
  );
}

function isUnilateral(tags: string[]): boolean {
  return tags.some((tag) => UNILATERAL_TAGS.has(tag));
}

function planeOf(tags: string[]): string {
  return PLANE_TAGS.find((plane) => tags.includes(plane)) ?? "sagittal";
}

function difficultyDistance(a: ExerciseLike, b: ExerciseLike): number {
  if (!a.difficulty || !b.difficulty) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.abs(DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty]);
}

/**
 * Scores a home candidate for a gym source, or returns null when the candidate
 * is not an acceptable coaching swap (no shared pattern, conflicting
 * direction, or harder than the source).
 */
export function scoreHomeCandidate(
  source: ExerciseLike,
  candidate: ExerciseLike,
): number | null {
  const sharedPatterns = countShared(
    tagsIn(source.tags, PRIMARY_PATTERN_TAGS),
    tagsIn(candidate.tags, PRIMARY_PATTERN_TAGS),
  );

  if (sharedPatterns === 0) {
    return null;
  }

  const sourceDirections = tagsIn(source.tags, DIRECTION_TAGS);
  const candidateDirections = tagsIn(candidate.tags, DIRECTION_TAGS);
  const sharedDirections = countShared(sourceDirections, candidateDirections);

  if (sourceDirections.size > 0 && candidateDirections.size > 0 && sharedDirections === 0) {
    return null;
  }

  if (
    source.difficulty &&
    candidate.difficulty &&
    DIFFICULTY_RANK[candidate.difficulty] > DIFFICULTY_RANK[source.difficulty]
  ) {
    return null;
  }

  const sharedIntents = countShared(intentsOf(source.tags), intentsOf(candidate.tags));
  const sameLaterality = isUnilateral(source.tags) === isUnilateral(candidate.tags);
  const samePlane = planeOf(source.tags) === planeOf(candidate.tags);

  return (
    sharedPatterns * HOME_MATCH_WEIGHTS.pattern +
    sharedDirections * HOME_MATCH_WEIGHTS.direction +
    (samePlane ? HOME_MATCH_WEIGHTS.plane : 0) +
    sharedIntents * HOME_MATCH_WEIGHTS.intent +
    (sameLaterality ? HOME_MATCH_WEIGHTS.laterality : 0)
  );
}

/**
 * Strict auto-match for a gym exercise in home mode. Ties prefer moves that
 * need no gym gear at all, then the closest difficulty.
 */
export function findHomeMatch<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
): T | null {
  const ranked = allExercises
    .filter((candidate) => !isSameExercise(candidate, exercise))
    .filter((candidate) => inferEquipmentMode(candidate) === "home")
    .map((candidate) => ({
      candidate,
      score: scoreHomeCandidate(exercise, candidate),
      pureHome: usesOnlyHomeEquipment(candidate),
      distance: difficultyDistance(exercise, candidate),
    }))
    .filter((entry) => entry.score !== null)
    .sort((a, b) => {
      if (b.score! !== a.score!) return b.score! - a.score!;
      if (a.pureHome !== b.pureHome) return a.pureHome ? -1 : 1;
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.candidate.slug.localeCompare(b.candidate.slug);
    });

  return ranked[0]?.candidate ?? null;
}

function checkOverride<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
  field: OverrideField,
): { target: T | null; problem: UnresolvedOverride | null } {
  const slug = exercise[field];

  if (!slug) {
    return { target: null, problem: null };
  }

  const fail = (reason: string) => ({ target: null, problem: { field, slug, reason } });
  const target = allExercises.find((candidate) => candidate.slug === slug);

  if (!target) return fail("no exercise with this slug");
  if (isSameExercise(target, exercise)) return fail("points at itself");

  if (field === "homeAlternativeSlug") {
    if (inferEquipmentMode(exercise) === "home") return fail("source is already a home exercise");
    if (inferEquipmentMode(target) !== "home") return fail("target is not a home exercise");
  }

  return { target, problem: null };
}

/**
 * Gym mode only swaps on a deliberate `gymAlternativeSlug`; it never
 * auto-matches. Home mode keeps home exercises, and swaps a gym exercise for
 * its `homeAlternativeSlug` or a strict auto-match, else null (keep original).
 */
export function resolveExerciseForMode<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
  targetMode: EquipmentMode,
): T | null {
  if (targetMode === "gym") {
    return checkOverride(exercise, allExercises, "gymAlternativeSlug").target ?? exercise;
  }

  if (inferEquipmentMode(exercise) === "home") {
    return exercise;
  }

  return (
    checkOverride(exercise, allExercises, "homeAlternativeSlug").target ??
    findHomeMatch(exercise, allExercises)
  );
}

export function buildExerciseModeVariants<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
): ExerciseModeVariants<T> {
  const gym = resolveExerciseForMode(exercise, allExercises, "gym");
  const home = resolveExerciseForMode(exercise, allExercises, "home");

  return {
    gym,
    home,
    sourceMode: inferEquipmentMode(exercise),
    hasAlternative: [gym, home].some(
      (variant) => variant !== null && !isSameExercise(variant, exercise),
    ),
  };
}

export function buildExerciseAudit<T extends ExerciseLike>(
  exercises: T[],
): ExerciseAuditGroup<T>[] {
  const groups = new Map<string, ExerciseAuditGroup<T>>();

  const sortedExercises = [...exercises].sort((a, b) => a.slug.localeCompare(b.slug));

  for (const exercise of sortedExercises) {
    const signature = extractMovementSignature(exercise.tags);
    const mode = inferEquipmentMode(exercise);
    const home = resolveExerciseForMode(exercise, sortedExercises, "home");
    const key = getSignatureKey(signature);
    const unresolvedOverrides = (["gymAlternativeSlug", "homeAlternativeSlug"] as const)
      .map((field) => checkOverride(exercise, sortedExercises, field).problem)
      .filter((problem): problem is UnresolvedOverride => problem !== null);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        signature,
        entries: [],
      });
    }

    groups.get(key)!.entries.push({
      exercise,
      mode,
      signature,
      gym: resolveExerciseForMode(exercise, sortedExercises, "gym")!,
      home,
      unresolvedOverrides,
      isGap: home === null,
    });
  }

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function describeVariant<T extends ExerciseLike>(exercise: T, variant: T | null): string {
  if (variant === null) return "None (keeps original)";
  if (isSameExercise(variant, exercise)) return "Same";
  return variant.name ?? variant.slug;
}

export function formatExerciseAuditMarkdown<T extends ExerciseLike>(
  groups: ExerciseAuditGroup<T>[],
): string {
  const entries = groups.flatMap((group) => group.entries);
  const totalGaps = entries.filter((entry) => entry.isGap).length;
  const gymSwaps = entries.filter((entry) => !isSameExercise(entry.gym, entry.exercise)).length;
  const homeSwaps = entries.filter(
    (entry) => entry.home !== null && !isSameExercise(entry.home, entry.exercise),
  ).length;
  const unresolved = entries.flatMap((entry) =>
    entry.unresolvedOverrides.map((problem) => ({ entry, problem })),
  );

  const unresolvedSection = unresolved.length === 0
    ? []
    : [
        "## Unresolved overrides",
        "",
        "| Exercise | Field | Slug | Problem |",
        "|---|---|---|---|",
        ...unresolved.map(
          ({ entry, problem }) =>
            `| ${entry.exercise.name ?? entry.exercise.slug} | ${problem.field} | ${problem.slug} | ${problem.reason} |`,
        ),
        "",
      ];

  const sections = groups.map((group) => {
    const heading = group.signature.length > 0
      ? group.signature.join(" + ")
      : "Uncategorized";

    const rows = group.entries.map((entry) => {
      const equipment = entry.exercise.equipment?.join(", ") ?? "bodyweight";
      const overrides = [
        entry.exercise.gymAlternativeSlug && `gym: ${entry.exercise.gymAlternativeSlug}`,
        entry.exercise.homeAlternativeSlug && `home: ${entry.exercise.homeAlternativeSlug}`,
      ].filter(Boolean).join("; ") || "None";

      return `| ${entry.exercise.name ?? entry.exercise.slug} | ${equipment} | ${entry.mode} | ${describeVariant(entry.exercise, entry.gym)} | ${describeVariant(entry.exercise, entry.home)} | ${overrides} | ${entry.isGap ? "Yes" : "No"} |`;
    });

    return [
      `## ${heading}`,
      "",
      "| Exercise | Equipment | Mode | Gym Mode | Home Mode | Overrides | Gap |",
      "|---|---|---|---|---|---|---|",
      ...rows,
      "",
    ].join("\n");
  });

  return [
    "# Exercise Equipment Audit",
    "",
    `Generated from ${entries.length} seeded exercises.`,
    "",
    "Gym mode only swaps on `gymAlternativeSlug`. Home mode keeps home exercises and swaps gym exercises for `homeAlternativeSlug` or a strict auto-match (shared movement pattern, compatible direction, not harder). Warmup prescriptions never swap.",
    "",
    "Open product question: bench, plyo_box, medicine_ball and foam_roller are treated as gym equipment.",
    "",
    `- Signature groups: ${groups.length}`,
    `- Exercises swapped in gym mode: ${gymSwaps}`,
    `- Exercises swapped in home mode: ${homeSwaps}`,
    `- Gym exercises without a home match: ${totalGaps}`,
    `- Unresolved overrides: ${unresolved.length}`,
    "",
    ...unresolvedSection,
    ...sections,
    "",
  ].join("\n");
}
