import type { Doc } from "./_generated/dataModel";

export type EquipmentMode = "gym" | "home";

export type ExerciseLike = Pick<
  Doc<"exercises">,
  "slug" | "tags" | "equipment" | "preferredAlternativeSlug"
> & {
  _id?: unknown;
  name?: string;
};

export type ExerciseAuditEntry<T extends ExerciseLike> = {
  exercise: T;
  mode: EquipmentMode;
  targetMode: EquipmentMode;
  signature: string[];
  alternative: T | null;
  hasOverride: boolean;
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
]);

export const MOVEMENT_SIGNATURE_TAGS = new Set(
  Object.keys(MOVEMENT_TAG_WEIGHTS),
);

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

export function inferEquipmentMode(exercise: ExerciseLike): EquipmentMode {
  const equipment = exercise.equipment ?? [];

  if (equipment.length === 0) {
    return "home";
  }

  return equipment.every((item) => HOME_EQUIPMENT.has(item)) ? "home" : "gym";
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

export function findAlternativeExercise<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
  targetMode: EquipmentMode,
): T | null {
  const overrideSlug = exercise.preferredAlternativeSlug;

  if (overrideSlug) {
    const override = allExercises.find(
      (candidate) =>
        candidate.slug === overrideSlug &&
        !isSameExercise(candidate, exercise) &&
        inferEquipmentMode(candidate) === targetMode,
    );

    if (override) {
      return override;
    }
  }

  const sourceSignature = extractMovementSignature(exercise.tags);

  if (sourceSignature.length === 0) {
    return null;
  }

  const rankedCandidates = allExercises
    .filter((candidate) => !isSameExercise(candidate, exercise))
    .filter((candidate) => inferEquipmentMode(candidate) === targetMode)
    .map((candidate) => ({
      candidate,
      score: calculateSignatureOverlap(
        sourceSignature,
        extractMovementSignature(candidate.tags),
      ),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.candidate.slug.localeCompare(b.candidate.slug);
    });

  return rankedCandidates[0]?.candidate ?? null;
}

export function resolveExerciseForMode<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
  targetMode: EquipmentMode,
): T | null {
  return inferEquipmentMode(exercise) === targetMode
    ? exercise
    : findAlternativeExercise(exercise, allExercises, targetMode);
}

export function buildExerciseModeVariants<T extends ExerciseLike>(
  exercise: T,
  allExercises: T[],
): ExerciseModeVariants<T> {
  const sourceMode = inferEquipmentMode(exercise);
  const gym = resolveExerciseForMode(exercise, allExercises, "gym");
  const home = resolveExerciseForMode(exercise, allExercises, "home");

  return {
    gym,
    home,
    sourceMode,
    hasAlternative: sourceMode === "gym" ? home !== null : gym !== null,
  };
}

export function buildExerciseAudit<T extends ExerciseLike>(
  exercises: T[],
): ExerciseAuditGroup<T>[] {
  const groups = new Map<string, ExerciseAuditGroup<T>>();

  const sortedExercises = [...exercises].sort((a, b) => a.slug.localeCompare(b.slug));

  for (const exercise of sortedExercises) {
    const signature = extractMovementSignature(exercise.tags);
    const variants = buildExerciseModeVariants(exercise, sortedExercises);
    const mode = variants.sourceMode;
    const targetMode: EquipmentMode = mode === "gym" ? "home" : "gym";
    const alternative = mode === "gym" ? variants.home : variants.gym;
    const key = getSignatureKey(signature);

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
      targetMode,
      signature,
      alternative,
      hasOverride: Boolean(exercise.preferredAlternativeSlug),
      isGap: alternative === null,
    });
  }

  return [...groups.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function formatExerciseAuditMarkdown<T extends ExerciseLike>(
  groups: ExerciseAuditGroup<T>[],
): string {
  const totalExercises = groups.reduce(
    (count, group) => count + group.entries.length,
    0,
  );
  const totalGaps = groups.reduce(
    (count, group) =>
      count + group.entries.filter((entry) => entry.isGap).length,
    0,
  );

  const sections = groups.map((group) => {
    const heading = group.signature.length > 0
      ? group.signature.join(" + ")
      : "Uncategorized";

    const rows = group.entries.map((entry) => {
      const equipment = entry.exercise.equipment?.join(", ") ?? "bodyweight";
      const alternative = entry.alternative?.name ?? "None";
      const override = entry.exercise.preferredAlternativeSlug ?? "None";

      return `| ${entry.exercise.name ?? entry.exercise.slug} | ${equipment} | ${entry.mode} | ${entry.targetMode} | ${alternative} | ${override} | ${entry.isGap ? "Yes" : "No"} |`;
    });

    return [
      `## ${heading}`,
      "",
      "| Exercise | Equipment | Mode | Target Mode | Auto Match | Override | Gap |",
      "|---|---|---|---|---|---|---|",
      ...rows,
    ].join("\n");
  });

  return [
    "# Exercise Equipment Audit",
    "",
    `Generated from ${totalExercises} seeded exercises.`,
    "",
    `- Signature groups: ${groups.length}`,
    `- Exercises without an opposite-mode match: ${totalGaps}`,
    "",
    ...sections,
    "",
  ].join("\n");
}
