/**
 * Drag Reorder Logic
 *
 * Pure functions for computing exercise ordering.
 * These are extracted from useDragReorder hook for testability.
 */

interface BaseExercise {
  exerciseId: string;
  [key: string]: unknown;
}

/**
 * Compute ordered exercises based on saved order and original exercises
 *
 * @param exercises - Original exercises array
 * @param savedOrder - Array of indices into original exercises
 * @returns Exercises in the specified order
 */
export function computeOrderedExercises<T extends BaseExercise>(
  exercises: T[],
  savedOrder?: number[]
): T[] {
  if (!exercises.length) return [];

  // If there's a saved order, apply it
  if (savedOrder && savedOrder.length > 0) {
    return savedOrder.map((idx) => exercises[idx]).filter(Boolean) as T[];
  }

  // Otherwise use original order
  return exercises;
}

/**
 * Compute order indices from ordered exercises back to original indices
 *
 * @param exercises - Original exercises array
 * @param orderedExercises - Currently ordered exercises
 * @returns Array of indices into original exercises
 */
export function computeOrderIndices<T extends BaseExercise>(
  exercises: T[],
  orderedExercises: T[]
): number[] {
  if (!exercises.length) return [];

  return orderedExercises
    .map((orderedEx) =>
      exercises.findIndex((ex) => ex.exerciseId === orderedEx.exerciseId)
    )
    .filter((idx) => idx !== -1);
}

/**
 * Check if there's a custom order (different from original)
 *
 * @param orderIndices - Current order as indices
 * @returns True if any exercise is out of original position
 */
export function hasCustomOrder(orderIndices: number[]): boolean {
  if (!orderIndices.length) return false;
  return orderIndices.some((idx, i) => idx !== i);
}

/**
 * Move an exercise from one position to another
 *
 * @param exercises - Current exercise array
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns New array with exercise moved, or null if invalid
 */
export function moveExercise<T>(
  exercises: T[],
  fromIndex: number,
  toIndex: number
): T[] | null {
  if (fromIndex === toIndex) return null;
  if (fromIndex < 0 || toIndex < 0) return null;
  if (fromIndex >= exercises.length || toIndex >= exercises.length) return null;

  const newOrder = [...exercises];
  const [moved] = newOrder.splice(fromIndex, 1);
  newOrder.splice(toIndex, 0, moved);

  return newOrder;
}

