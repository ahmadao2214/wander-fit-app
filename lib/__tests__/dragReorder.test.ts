import { describe, it, expect } from "vitest";
import {
  computeOrderedExercises,
  computeOrderIndices,
  hasCustomOrder,
  moveExercise,
} from "../dragReorder";

// ═══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════════

interface TestExercise {
  exerciseId: string;
  name: string;
  sets: number;
  [key: string]: unknown;
}

const createExercises = (count: number): TestExercise[] =>
  Array.from({ length: count }, (_, i) => ({
    exerciseId: `exercise-${i + 1}`,
    name: `Exercise ${i + 1}`,
    sets: 3,
  }));

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE ORDERED EXERCISES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeOrderedExercises", () => {
  it("returns empty array when exercises is empty", () => {
    expect(computeOrderedExercises([])).toEqual([]);
  });

  it("returns original exercises when no savedOrder", () => {
    const exercises = createExercises(3);
    expect(computeOrderedExercises(exercises)).toEqual(exercises);
  });

  it("returns original exercises when savedOrder is empty", () => {
    const exercises = createExercises(3);
    expect(computeOrderedExercises(exercises, [])).toEqual(exercises);
  });

  it("returns exercises in savedOrder when provided", () => {
    const exercises = createExercises(3);
    const savedOrder = [2, 0, 1]; // Reorder: 3rd, 1st, 2nd
    expect(computeOrderedExercises(exercises, savedOrder)).toEqual([
      exercises[2],
      exercises[0],
      exercises[1],
    ]);
  });

  it("filters out invalid indices from savedOrder", () => {
    const exercises = createExercises(3);
    const savedOrder = [0, 5, 1]; // Index 5 is invalid
    const result = computeOrderedExercises(exercises, savedOrder);
    // Should filter out undefined values (index 5 doesn't exist)
    expect(result).toEqual([exercises[0], exercises[1]]);
  });

  it("handles partial savedOrder", () => {
    const exercises = createExercises(4);
    const savedOrder = [3, 1]; // Only 2 indices
    expect(computeOrderedExercises(exercises, savedOrder)).toEqual([
      exercises[3],
      exercises[1],
    ]);
  });

  it("handles duplicate indices in savedOrder", () => {
    const exercises = createExercises(3);
    const savedOrder = [0, 0, 1]; // Duplicate index 0
    expect(computeOrderedExercises(exercises, savedOrder)).toEqual([
      exercises[0],
      exercises[0],
      exercises[1],
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPUTE ORDER INDICES TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("computeOrderIndices", () => {
  it("returns empty array when exercises is empty", () => {
    expect(computeOrderIndices([], [])).toEqual([]);
  });

  it("returns sequential indices [0,1,2,...] when in original order", () => {
    const exercises = createExercises(4);
    expect(computeOrderIndices(exercises, exercises)).toEqual([0, 1, 2, 3]);
  });

  it("maps reordered exercises back to original indices correctly", () => {
    const exercises = createExercises(3);
    const reordered = [exercises[2], exercises[0], exercises[1]];
    expect(computeOrderIndices(exercises, reordered)).toEqual([2, 0, 1]);
  });

  it("filters out exercises not found in original array", () => {
    const exercises = createExercises(3);
    const unknownExercise: TestExercise = {
      exerciseId: "unknown",
      name: "Unknown",
      sets: 3,
    };
    const reordered = [exercises[0], unknownExercise, exercises[2]];
    expect(computeOrderIndices(exercises, reordered)).toEqual([0, 2]);
  });

  it("handles reversed order", () => {
    const exercises = createExercises(4);
    const reversed = [...exercises].reverse();
    expect(computeOrderIndices(exercises, reversed)).toEqual([3, 2, 1, 0]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// HAS CUSTOM ORDER TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("hasCustomOrder", () => {
  it("returns false when orderIndices is empty", () => {
    expect(hasCustomOrder([])).toBe(false);
  });

  it("returns false when order matches original [0,1,2,...]", () => {
    expect(hasCustomOrder([0, 1, 2, 3])).toBe(false);
  });

  it("returns true when first element is out of position", () => {
    expect(hasCustomOrder([1, 0, 2, 3])).toBe(true);
  });

  it("returns true when last element is out of position", () => {
    expect(hasCustomOrder([0, 1, 3, 2])).toBe(true);
  });

  it("returns true when completely reversed", () => {
    expect(hasCustomOrder([3, 2, 1, 0])).toBe(true);
  });

  it("returns false for single element array", () => {
    expect(hasCustomOrder([0])).toBe(false);
  });

  it("returns true for single element out of position", () => {
    expect(hasCustomOrder([1])).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MOVE EXERCISE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("moveExercise", () => {
  it("returns null when from === to (no movement)", () => {
    const exercises = createExercises(3);
    expect(moveExercise(exercises, 1, 1)).toBeNull();
  });

  it("returns null for negative fromIndex", () => {
    const exercises = createExercises(3);
    expect(moveExercise(exercises, -1, 2)).toBeNull();
  });

  it("returns null for negative toIndex", () => {
    const exercises = createExercises(3);
    expect(moveExercise(exercises, 0, -1)).toBeNull();
  });

  it("returns null for fromIndex out of range", () => {
    const exercises = createExercises(3);
    expect(moveExercise(exercises, 10, 0)).toBeNull();
  });

  it("returns null for toIndex out of range", () => {
    const exercises = createExercises(3);
    expect(moveExercise(exercises, 0, 10)).toBeNull();
  });

  it("moves exercise forward correctly", () => {
    const exercises = createExercises(4);
    const result = moveExercise(exercises, 0, 2);
    expect(result).toEqual([
      exercises[1],
      exercises[2],
      exercises[0],
      exercises[3],
    ]);
  });

  it("moves exercise backward correctly", () => {
    const exercises = createExercises(4);
    const result = moveExercise(exercises, 3, 1);
    expect(result).toEqual([
      exercises[0],
      exercises[3],
      exercises[1],
      exercises[2],
    ]);
  });

  it("swaps adjacent elements correctly (forward)", () => {
    const exercises = createExercises(3);
    const result = moveExercise(exercises, 0, 1);
    expect(result).toEqual([exercises[1], exercises[0], exercises[2]]);
  });

  it("swaps adjacent elements correctly (backward)", () => {
    const exercises = createExercises(3);
    const result = moveExercise(exercises, 2, 1);
    expect(result).toEqual([exercises[0], exercises[2], exercises[1]]);
  });

  it("does not mutate original array", () => {
    const exercises = createExercises(3);
    const originalFirst = exercises[0];
    moveExercise(exercises, 0, 2);
    expect(exercises[0]).toBe(originalFirst);
  });

  it("handles moving to first position", () => {
    const exercises = createExercises(4);
    const result = moveExercise(exercises, 3, 0);
    expect(result).toEqual([
      exercises[3],
      exercises[0],
      exercises[1],
      exercises[2],
    ]);
  });

  it("handles moving to last position", () => {
    const exercises = createExercises(4);
    const result = moveExercise(exercises, 0, 3);
    expect(result).toEqual([
      exercises[1],
      exercises[2],
      exercises[3],
      exercises[0],
    ]);
  });
});

