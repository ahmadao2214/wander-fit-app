/**
 * Exercise order and set tracking during workout execution.
 *
 * Two arrays describe a session and they must not be confused:
 * - completions are stored in TEMPLATE order (one per template exercise,
 *   warmup included). Reordering never moves them.
 * - exerciseOrder lists the main exercises' TEMPLATE indices in the order the
 *   athlete does them.
 *
 * The execution screen shows template[exerciseOrder[position]] and must read
 * that exercise's sets from the completion at the same template index.
 */

export interface SectionedExercise {
  exerciseId: string
  section?: string
  notes?: string
}

/** Warmup by section, or by notes on older templates that have no section. */
export function isWarmupExercise(ex: SectionedExercise): boolean {
  return ex.section === 'warmup' || (!ex.section && ex.notes === 'Warmup')
}

/** Template indices of the main (non-warmup) exercises, in template order. */
export function mainTemplateIndices(exercises: readonly SectionedExercise[]): number[] {
  const indices: number[] = []
  exercises.forEach((ex, index) => {
    if (!isWarmupExercise(ex)) indices.push(index)
  })
  return indices
}

/**
 * A complete, valid order of the main exercises as template indices.
 * Keeps the saved order where it is valid, drops warmup, unknown and repeated
 * indices, and appends any main exercise the saved order left out, so a
 * truncated order can never hide an exercise.
 */
export function normalizeExerciseOrder(
  saved: readonly number[] | undefined,
  exercises: readonly SectionedExercise[]
): number[] {
  const main = mainTemplateIndices(exercises)
  const valid = new Set(main)
  const seen = new Set<number>()
  const order: number[] = []
  for (const index of saved ?? []) {
    if (valid.has(index) && !seen.has(index)) {
      seen.add(index)
      order.push(index)
    }
  }
  for (const index of main) {
    if (!seen.has(index)) order.push(index)
  }
  return order
}

/** Positions among the main exercises (what drag-reorder works in) → template indices. */
export function mainOrderToTemplateOrder(
  mainOrder: readonly number[],
  exercises: readonly SectionedExercise[]
): number[] {
  const main = mainTemplateIndices(exercises)
  return mainOrder.map((position) => main[position]).filter((index): index is number => index !== undefined)
}

/** Template indices → positions among the main exercises. */
export function templateOrderToMainOrder(
  order: readonly number[],
  exercises: readonly SectionedExercise[]
): number[] {
  const positionOf = new Map(mainTemplateIndices(exercises).map((index, position) => [index, position]))
  return order.map((index) => positionOf.get(index)).filter((position): position is number => position !== undefined)
}

/**
 * Put saved completions back under the template exercise they belong to,
 * matching by exerciseId. A slot keeps the completion at its own position
 * when the IDs agree; otherwise it takes the first unused completion for its
 * exercise. Earlier builds saved completions in reordered positions, and some
 * saved only the main exercises (those match main slots only, never a warmup
 * with the same exerciseId); both come back aligned. Slots with nothing saved
 * are undefined.
 */
export function alignCompletionsToTemplate<C extends { exerciseId: string }>(
  exercises: readonly SectionedExercise[],
  saved: readonly C[]
): (C | undefined)[] {
  // A main-only save (one record per main exercise, warmups left out) must not
  // hand a main exercise's record to a warmup that shares its exerciseId.
  const main = mainTemplateIndices(exercises)
  const mainIds = new Set(main.map((index) => String(exercises[index].exerciseId)))
  if (
    main.length < exercises.length &&
    saved.length === main.length &&
    saved.every((completion) => mainIds.has(String(completion.exerciseId)))
  ) {
    const alignedMain = alignCompletionsToTemplate(
      main.map((index) => exercises[index]),
      saved
    )
    const aligned: (C | undefined)[] = exercises.map(() => undefined)
    main.forEach((templateIndex, position) => {
      aligned[templateIndex] = alignedMain[position]
    })
    return aligned
  }

  const used = new Set<number>()
  const aligned: (C | undefined)[] = exercises.map((ex, index) => {
    const atPosition = saved[index]
    if (atPosition && String(atPosition.exerciseId) === String(ex.exerciseId)) {
      used.add(index)
      return atPosition
    }
    return undefined
  })
  exercises.forEach((ex, index) => {
    if (aligned[index]) return
    const match = saved.findIndex(
      (completion, savedIndex) => !used.has(savedIndex) && String(completion.exerciseId) === String(ex.exerciseId)
    )
    if (match !== -1) {
      used.add(match)
      aligned[index] = saved[match]
    }
  })
  return aligned
}
