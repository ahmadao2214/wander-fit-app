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

  it("returns false at midnight boundary (same day)", () => {
    const setTime = new Date("2024-01-15T23:59:59").getTime();
    const checkTime = new Date("2024-01-15T00:00:01").getTime();
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

