import { describe, it, expect } from "vitest";
import {
  isSameSlot,
  isSamePhase,
  findSlotOverride,
  removeSlotOverrides,
  buildSwapOverrides,
  getOverridesForPhase,
  removePhaseOverrides,
  shouldClearTodayFocus,
  validateSwap,
  countOverridesByPhase,
  type WorkoutSlot,
  type SlotOverride,
} from "../scheduleOverride";

// ═══════════════════════════════════════════════════════════════════════════════
// SLOT COMPARISON TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("isSameSlot", () => {
  it("returns true for identical slots", () => {
    const slot: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    expect(isSameSlot(slot, slot)).toBe(true);
  });

  it("returns true for slots with same values", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 2, day: 3 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 2, day: 3 };
    expect(isSameSlot(slotA, slotB)).toBe(true);
  });

  it("returns false for different phases", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "SPP", week: 1, day: 1 };
    expect(isSameSlot(slotA, slotB)).toBe(false);
  });

  it("returns false for different weeks", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 2, day: 1 };
    expect(isSameSlot(slotA, slotB)).toBe(false);
  });

  it("returns false for different days", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 1, day: 2 };
    expect(isSameSlot(slotA, slotB)).toBe(false);
  });
});

describe("isSamePhase", () => {
  it("returns true for same phase", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 3, day: 2 };
    expect(isSamePhase(slotA, slotB)).toBe(true);
  });

  it("returns false for GPP vs SPP", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "SPP", week: 1, day: 1 };
    expect(isSamePhase(slotA, slotB)).toBe(false);
  });

  it("returns false for SPP vs SSP", () => {
    const slotA: WorkoutSlot = { phase: "SPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "SSP", week: 1, day: 1 };
    expect(isSamePhase(slotA, slotB)).toBe(false);
  });

  it("returns false for GPP vs SSP", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "SSP", week: 1, day: 1 };
    expect(isSamePhase(slotA, slotB)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OVERRIDE LOOKUP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("findSlotOverride", () => {
  const overrides: SlotOverride[] = [
    { phase: "GPP", week: 1, day: 1, templateId: "template1" },
    { phase: "GPP", week: 2, day: 3, templateId: "template2" },
    { phase: "SPP", week: 1, day: 2, templateId: "template3" },
  ];

  it("finds an existing override", () => {
    const slot: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const result = findSlotOverride(overrides, slot);
    expect(result).toEqual({ phase: "GPP", week: 1, day: 1, templateId: "template1" });
  });

  it("returns undefined for non-existent slot", () => {
    const slot: WorkoutSlot = { phase: "GPP", week: 4, day: 1 };
    const result = findSlotOverride(overrides, slot);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty overrides array", () => {
    const slot: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const result = findSlotOverride([], slot);
    expect(result).toBeUndefined();
  });

  it("finds override in different phase", () => {
    const slot: WorkoutSlot = { phase: "SPP", week: 1, day: 2 };
    const result = findSlotOverride(overrides, slot);
    expect(result?.templateId).toBe("template3");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OVERRIDE REMOVAL TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("removeSlotOverrides", () => {
  const overrides: SlotOverride[] = [
    { phase: "GPP", week: 1, day: 1, templateId: "template1" },
    { phase: "GPP", week: 2, day: 3, templateId: "template2" },
    { phase: "SPP", week: 1, day: 2, templateId: "template3" },
  ];

  it("removes a single slot override", () => {
    const slotsToRemove: WorkoutSlot[] = [{ phase: "GPP", week: 1, day: 1 }];
    const result = removeSlotOverrides(overrides, slotsToRemove);
    expect(result).toHaveLength(2);
    expect(result.find((o) => o.templateId === "template1")).toBeUndefined();
  });

  it("removes multiple slot overrides", () => {
    const slotsToRemove: WorkoutSlot[] = [
      { phase: "GPP", week: 1, day: 1 },
      { phase: "SPP", week: 1, day: 2 },
    ];
    const result = removeSlotOverrides(overrides, slotsToRemove);
    expect(result).toHaveLength(1);
    expect(result[0].templateId).toBe("template2");
  });

  it("returns same array if no matches", () => {
    const slotsToRemove: WorkoutSlot[] = [{ phase: "GPP", week: 4, day: 1 }];
    const result = removeSlotOverrides(overrides, slotsToRemove);
    expect(result).toHaveLength(3);
  });

  it("returns empty array if all removed", () => {
    const slotsToRemove: WorkoutSlot[] = [
      { phase: "GPP", week: 1, day: 1 },
      { phase: "GPP", week: 2, day: 3 },
      { phase: "SPP", week: 1, day: 2 },
    ];
    const result = removeSlotOverrides(overrides, slotsToRemove);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SWAP OPERATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildSwapOverrides", () => {
  it("creates swap overrides from empty array", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 1, day: 2 };
    
    const result = buildSwapOverrides([], slotA, slotB, "templateA", "templateB");
    
    expect(result).toHaveLength(2);
    expect(result.find((o) => o.day === 1)?.templateId).toBe("templateB");
    expect(result.find((o) => o.day === 2)?.templateId).toBe("templateA");
  });

  it("replaces existing overrides for swapped slots", () => {
    const existingOverrides: SlotOverride[] = [
      { phase: "GPP", week: 1, day: 1, templateId: "oldTemplate1" },
      { phase: "GPP", week: 1, day: 3, templateId: "unrelated" },
    ];
    
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 1, day: 2 };
    
    const result = buildSwapOverrides(existingOverrides, slotA, slotB, "templateA", "templateB");
    
    // Should have 3 overrides: the unrelated one + 2 new swap overrides
    expect(result).toHaveLength(3);
    expect(result.find((o) => o.day === 1)?.templateId).toBe("templateB");
    expect(result.find((o) => o.day === 2)?.templateId).toBe("templateA");
    expect(result.find((o) => o.day === 3)?.templateId).toBe("unrelated");
  });

  it("handles cross-week swaps within same phase", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 3, day: 2 };
    
    const result = buildSwapOverrides([], slotA, slotB, "week1Template", "week3Template");
    
    expect(result).toHaveLength(2);
    const override1 = result.find((o) => o.week === 1 && o.day === 1);
    const override2 = result.find((o) => o.week === 3 && o.day === 2);
    expect(override1?.templateId).toBe("week3Template");
    expect(override2?.templateId).toBe("week1Template");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE FILTERING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("getOverridesForPhase", () => {
  const overrides: SlotOverride[] = [
    { phase: "GPP", week: 1, day: 1, templateId: "t1" },
    { phase: "GPP", week: 2, day: 1, templateId: "t2" },
    { phase: "SPP", week: 1, day: 1, templateId: "t3" },
    { phase: "SSP", week: 1, day: 1, templateId: "t4" },
  ];

  it("returns only GPP overrides", () => {
    const result = getOverridesForPhase(overrides, "GPP");
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.phase === "GPP")).toBe(true);
  });

  it("returns only SPP overrides", () => {
    const result = getOverridesForPhase(overrides, "SPP");
    expect(result).toHaveLength(1);
    expect(result[0].templateId).toBe("t3");
  });

  it("returns empty array for phase with no overrides", () => {
    const gppOnly: SlotOverride[] = [
      { phase: "GPP", week: 1, day: 1, templateId: "t1" },
    ];
    const result = getOverridesForPhase(gppOnly, "SSP");
    expect(result).toHaveLength(0);
  });
});

describe("removePhaseOverrides", () => {
  const overrides: SlotOverride[] = [
    { phase: "GPP", week: 1, day: 1, templateId: "t1" },
    { phase: "GPP", week: 2, day: 1, templateId: "t2" },
    { phase: "SPP", week: 1, day: 1, templateId: "t3" },
  ];

  it("removes all GPP overrides", () => {
    const result = removePhaseOverrides(overrides, "GPP");
    expect(result).toHaveLength(1);
    expect(result[0].phase).toBe("SPP");
  });

  it("removes all SPP overrides", () => {
    const result = removePhaseOverrides(overrides, "SPP");
    expect(result).toHaveLength(2);
    expect(result.every((o) => o.phase === "GPP")).toBe(true);
  });

  it("returns same array if phase has no overrides", () => {
    const result = removePhaseOverrides(overrides, "SSP");
    expect(result).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TODAY FOCUS TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("shouldClearTodayFocus", () => {
  it("returns false when set and checked on same day", () => {
    const setTime = new Date("2024-01-15T10:00:00").getTime();
    const checkTime = new Date("2024-01-15T18:00:00").getTime();
    expect(shouldClearTodayFocus(setTime, checkTime)).toBe(false);
  });

  it("returns true when set yesterday", () => {
    const setTime = new Date("2024-01-14T10:00:00").getTime();
    const checkTime = new Date("2024-01-15T10:00:00").getTime();
    expect(shouldClearTodayFocus(setTime, checkTime)).toBe(true);
  });

  it("returns true when set in previous month", () => {
    const setTime = new Date("2024-01-31T10:00:00").getTime();
    const checkTime = new Date("2024-02-01T10:00:00").getTime();
    expect(shouldClearTodayFocus(setTime, checkTime)).toBe(true);
  });

  it("returns true when set in previous year", () => {
    const setTime = new Date("2023-12-31T10:00:00").getTime();
    const checkTime = new Date("2024-01-01T10:00:00").getTime();
    expect(shouldClearTodayFocus(setTime, checkTime)).toBe(true);
  });

  it("returns false when set earlier and checked later same day", () => {
    const setTime = new Date("2024-01-15T08:00:00").getTime();
    const checkTime = new Date("2024-01-15T23:59:59").getTime();
    expect(shouldClearTodayFocus(setTime, checkTime)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("validateSwap", () => {
  it("returns valid for same-phase swap", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "GPP", week: 2, day: 3 };
    const result = validateSwap(slotA, slotB);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("returns invalid for same slot", () => {
    const slot: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const result = validateSwap(slot, slot);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Cannot swap a slot with itself");
  });

  it("returns invalid for cross-phase swap (GPP to SPP)", () => {
    const slotA: WorkoutSlot = { phase: "GPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "SPP", week: 1, day: 1 };
    const result = validateSwap(slotA, slotB);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Swaps must be within the same phase");
  });

  it("returns invalid for cross-phase swap (SPP to SSP)", () => {
    const slotA: WorkoutSlot = { phase: "SPP", week: 1, day: 1 };
    const slotB: WorkoutSlot = { phase: "SSP", week: 1, day: 1 };
    const result = validateSwap(slotA, slotB);
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Swaps must be within the same phase");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COUNTING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("countOverridesByPhase", () => {
  it("counts overrides correctly for mixed phases", () => {
    const overrides: SlotOverride[] = [
      { phase: "GPP", week: 1, day: 1, templateId: "t1" },
      { phase: "GPP", week: 2, day: 1, templateId: "t2" },
      { phase: "SPP", week: 1, day: 1, templateId: "t3" },
      { phase: "SSP", week: 1, day: 1, templateId: "t4" },
      { phase: "SSP", week: 1, day: 2, templateId: "t5" },
    ];
    
    const result = countOverridesByPhase(overrides);
    expect(result.GPP).toBe(2);
    expect(result.SPP).toBe(1);
    expect(result.SSP).toBe(2);
  });

  it("returns zero for all phases when empty", () => {
    const result = countOverridesByPhase([]);
    expect(result.GPP).toBe(0);
    expect(result.SPP).toBe(0);
    expect(result.SSP).toBe(0);
  });

  it("handles single-phase overrides", () => {
    const overrides: SlotOverride[] = [
      { phase: "GPP", week: 1, day: 1, templateId: "t1" },
      { phase: "GPP", week: 1, day: 2, templateId: "t2" },
    ];
    
    const result = countOverridesByPhase(overrides);
    expect(result.GPP).toBe(2);
    expect(result.SPP).toBe(0);
    expect(result.SSP).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO: TODAY'S WORKOUT PRIORITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to determine today's workout based on priority order:
 * 1. In-progress session (if user has active workout → that IS today's focus)
 * 2. Explicit focus override (via setTodayFocus)
 * 3. First incomplete workout in current week
 * 4. Scheduled workout for current day
 */
interface WorkoutTemplate {
  id: string;
  day: number;
}

interface TodayWorkoutContext {
  inProgressTemplateId: string | null;
  focusOverrideTemplateId: string | null;
  weekWorkouts: WorkoutTemplate[];
  completedTemplateIds: Set<string>;
  currentDay: number;
}

function determineTodayWorkout(ctx: TodayWorkoutContext): string | null {
  // Priority 1: In-progress session
  if (ctx.inProgressTemplateId) {
    return ctx.inProgressTemplateId;
  }

  // Priority 2: Explicit focus override (return even if completed)
  // UPDATED: We now keep showing the focused workout even after completion
  // so the user sees their completed workout on Today's card with a "Completed" badge
  if (ctx.focusOverrideTemplateId) {
    return ctx.focusOverrideTemplateId;
  }

  // Priority 3: First incomplete workout in current week
  const sortedWorkouts = [...ctx.weekWorkouts].sort((a, b) => a.day - b.day);
  const firstIncomplete = sortedWorkouts.find(w => !ctx.completedTemplateIds.has(w.id));
  if (firstIncomplete) {
    return firstIncomplete.id;
  }

  // Priority 4: Scheduled workout for current day
  const scheduledWorkout = ctx.weekWorkouts.find(w => w.day === ctx.currentDay);
  return scheduledWorkout?.id ?? null;
}

describe("Today's Workout Priority Logic", () => {
  const weekWorkouts: WorkoutTemplate[] = [
    { id: "lower-body", day: 1 },
    { id: "upper-body", day: 2 },
    { id: "power-conditioning", day: 3 },
  ];

  describe("Priority 1: In-Progress Session", () => {
    it("returns in-progress workout even if it's not today's scheduled", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: "upper-body",
        focusOverrideTemplateId: null,
        weekWorkouts,
        completedTemplateIds: new Set(),
        currentDay: 1, // Day 1 is scheduled, but Day 2 is in-progress
      });
      expect(result).toBe("upper-body");
    });

    it("returns in-progress workout even with focus override set", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: "power-conditioning",
        focusOverrideTemplateId: "lower-body",
        weekWorkouts,
        completedTemplateIds: new Set(),
        currentDay: 1,
      });
      expect(result).toBe("power-conditioning");
    });

    it("returns in-progress workout even if that workout is also completed", () => {
      // Edge case: workout is completed but still showing in-progress (shouldn't happen, but test robustness)
      const result = determineTodayWorkout({
        inProgressTemplateId: "lower-body",
        focusOverrideTemplateId: null,
        weekWorkouts,
        completedTemplateIds: new Set(["lower-body"]),
        currentDay: 1,
      });
      expect(result).toBe("lower-body");
    });
  });

  describe("Priority 2: Focus Override", () => {
    it("returns focus override when no in-progress session", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: null,
        focusOverrideTemplateId: "power-conditioning",
        weekWorkouts,
        completedTemplateIds: new Set(),
        currentDay: 1,
      });
      expect(result).toBe("power-conditioning");
    });

    it("returns completed focus override (shows as completed on Today's card)", () => {
      // UPDATED: Focus is now returned even when completed
      // This allows the UI to show the workout with a "Completed" badge
      const result = determineTodayWorkout({
        inProgressTemplateId: null,
        focusOverrideTemplateId: "lower-body", // Day 1 is completed but still focused
        weekWorkouts,
        completedTemplateIds: new Set(["lower-body"]),
        currentDay: 1,
      });
      expect(result).toBe("lower-body"); // Returns focus even if completed
    });
  });

  describe("Priority 3: First Incomplete Workout", () => {
    it("returns first incomplete when Day 1 is completed", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: null,
        focusOverrideTemplateId: null,
        weekWorkouts,
        completedTemplateIds: new Set(["lower-body"]),
        currentDay: 1,
      });
      expect(result).toBe("upper-body");
    });

    it("returns first incomplete when Days 1 and 2 are completed", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: null,
        focusOverrideTemplateId: null,
        weekWorkouts,
        completedTemplateIds: new Set(["lower-body", "upper-body"]),
        currentDay: 1,
      });
      expect(result).toBe("power-conditioning");
    });

    it("handles out-of-order completions (Day 3 done before Day 1 and 2)", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: null,
        focusOverrideTemplateId: null,
        weekWorkouts,
        completedTemplateIds: new Set(["power-conditioning"]),
        currentDay: 1,
      });
      expect(result).toBe("lower-body"); // Day 1 is still first incomplete
    });
  });

  describe("Priority 4: Scheduled Workout", () => {
    it("returns scheduled workout when all are completed", () => {
      const result = determineTodayWorkout({
        inProgressTemplateId: null,
        focusOverrideTemplateId: null,
        weekWorkouts,
        completedTemplateIds: new Set(["lower-body", "upper-body", "power-conditioning"]),
        currentDay: 2,
      });
      expect(result).toBe("upper-body"); // Day 2 scheduled
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO: COMPLETED WORKOUT BLOCKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to check if a swap is allowed considering completed workouts
 */
function isSwapAllowed(
  fromTemplateId: string,
  toTemplateId: string,
  completedTemplateIds: Set<string>
): { allowed: boolean; reason?: string } {
  if (completedTemplateIds.has(fromTemplateId)) {
    return { allowed: false, reason: "Cannot swap: source workout is completed" };
  }
  if (completedTemplateIds.has(toTemplateId)) {
    return { allowed: false, reason: "Cannot swap: target workout is completed" };
  }
  return { allowed: true };
}

describe("Completed Workout Blocking", () => {
  it("allows swap between two incomplete workouts", () => {
    const result = isSwapAllowed("lower-body", "upper-body", new Set());
    expect(result.allowed).toBe(true);
  });

  it("blocks swap when source workout is completed", () => {
    const result = isSwapAllowed("lower-body", "upper-body", new Set(["lower-body"]));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("source workout is completed");
  });

  it("blocks swap when target workout is completed", () => {
    const result = isSwapAllowed("lower-body", "upper-body", new Set(["upper-body"]));
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("target workout is completed");
  });

  it("blocks swap when both workouts are completed", () => {
    const result = isSwapAllowed("lower-body", "upper-body", new Set(["lower-body", "upper-body"]));
    expect(result.allowed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO: SET AS TODAY AUTO-SWAP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper to find the first incomplete slot in current week for auto-swap
 */
function findFirstIncompleteSlot(
  weekWorkouts: WorkoutTemplate[],
  completedTemplateIds: Set<string>
): WorkoutTemplate | null {
  const sorted = [...weekWorkouts].sort((a, b) => a.day - b.day);
  return sorted.find(w => !completedTemplateIds.has(w.id)) ?? null;
}

/**
 * Determines if a swap is needed when setting a workout as today's focus
 */
function determineSetTodaySwap(
  selectedWorkoutId: string,
  selectedWorkoutDay: number,
  weekWorkouts: WorkoutTemplate[],
  completedTemplateIds: Set<string>
): { needsSwap: boolean; swapWithDay?: number } {
  const firstIncomplete = findFirstIncompleteSlot(weekWorkouts, completedTemplateIds);
  
  if (!firstIncomplete) {
    return { needsSwap: false };
  }

  // If selected is already first incomplete, no swap needed
  if (firstIncomplete.id === selectedWorkoutId) {
    return { needsSwap: false };
  }

  // If selected is already in the first incomplete slot, no swap needed
  if (selectedWorkoutDay === firstIncomplete.day) {
    return { needsSwap: false };
  }

  return { needsSwap: true, swapWithDay: firstIncomplete.day };
}

describe("Set As Today Auto-Swap", () => {
  const weekWorkouts: WorkoutTemplate[] = [
    { id: "lower-body", day: 1 },
    { id: "upper-body", day: 2 },
    { id: "power-conditioning", day: 3 },
  ];

  it("no swap needed when selecting first incomplete workout", () => {
    const result = determineSetTodaySwap(
      "lower-body",
      1,
      weekWorkouts,
      new Set()
    );
    expect(result.needsSwap).toBe(false);
  });

  it("swaps Day 3 workout with Day 1 (first incomplete)", () => {
    const result = determineSetTodaySwap(
      "power-conditioning",
      3,
      weekWorkouts,
      new Set()
    );
    expect(result.needsSwap).toBe(true);
    expect(result.swapWithDay).toBe(1);
  });

  it("swaps Day 3 workout with Day 2 when Day 1 is completed", () => {
    const result = determineSetTodaySwap(
      "power-conditioning",
      3,
      weekWorkouts,
      new Set(["lower-body"])
    );
    expect(result.needsSwap).toBe(true);
    expect(result.swapWithDay).toBe(2);
  });

  it("no swap needed when all workouts are completed", () => {
    const result = determineSetTodaySwap(
      "power-conditioning",
      3,
      weekWorkouts,
      new Set(["lower-body", "upper-body", "power-conditioning"])
    );
    expect(result.needsSwap).toBe(false);
  });

  it("correctly handles selecting Day 2 when Day 1 is incomplete", () => {
    const result = determineSetTodaySwap(
      "upper-body",
      2,
      weekWorkouts,
      new Set()
    );
    expect(result.needsSwap).toBe(true);
    expect(result.swapWithDay).toBe(1); // Swap with Day 1 (first incomplete)
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO: AUTO-FOCUS ON START
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determines if auto-focus should be set when starting a workout
 */
function shouldAutoFocusOnStart(
  startingWorkoutId: string,
  currentTodayWorkoutId: string | null
): boolean {
  // Auto-focus if starting a different workout than today's focus
  return currentTodayWorkoutId !== null && startingWorkoutId !== currentTodayWorkoutId;
}

describe("Auto-Focus On Start", () => {
  it("should auto-focus when starting a different workout", () => {
    const result = shouldAutoFocusOnStart("upper-body", "lower-body");
    expect(result).toBe(true);
  });

  it("should not auto-focus when starting today's workout", () => {
    const result = shouldAutoFocusOnStart("lower-body", "lower-body");
    expect(result).toBe(false);
  });

  it("should not auto-focus when no today workout exists", () => {
    const result = shouldAutoFocusOnStart("lower-body", null);
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO: MULTIPLE COMPLETIONS PER DAY
// ═══════════════════════════════════════════════════════════════════════════════

describe("Multiple Completions Per Day", () => {
  it("allows starting different workouts after completing one", () => {
    const weekWorkouts: WorkoutTemplate[] = [
      { id: "lower-body", day: 1 },
      { id: "upper-body", day: 2 },
      { id: "power-conditioning", day: 3 },
    ];
    
    // Day 1 completed
    const completedTemplateIds = new Set(["lower-body"]);
    
    // User wants to start Day 3 next
    const swapAllowed = isSwapAllowed("power-conditioning", "upper-body", completedTemplateIds);
    expect(swapAllowed.allowed).toBe(true);
    
    // Today's workout should be Day 2 (first incomplete)
    const todayWorkout = determineTodayWorkout({
      inProgressTemplateId: null,
      focusOverrideTemplateId: null,
      weekWorkouts,
      completedTemplateIds,
      currentDay: 1,
    });
    expect(todayWorkout).toBe("upper-body");
  });

  it("tracks multiple completed workouts independently", () => {
    const completedTemplateIds = new Set(["lower-body", "power-conditioning"]);
    
    // Day 1 and Day 3 completed, Day 2 still available
    const weekWorkouts: WorkoutTemplate[] = [
      { id: "lower-body", day: 1 },
      { id: "upper-body", day: 2 },
      { id: "power-conditioning", day: 3 },
    ];
    
    const todayWorkout = determineTodayWorkout({
      inProgressTemplateId: null,
      focusOverrideTemplateId: null,
      weekWorkouts,
      completedTemplateIds,
      currentDay: 1,
    });
    
    expect(todayWorkout).toBe("upper-body"); // Only incomplete workout
  });
});

