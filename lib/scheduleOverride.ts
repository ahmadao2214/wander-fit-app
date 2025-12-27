/**
 * Schedule Override Utilities
 *
 * Pure functions for schedule override logic.
 * Used by convex/scheduleOverrides.ts for workout swapping and today's focus.
 */

import type { Phase } from "../types";

/**
 * Slot identifier - represents a specific workout slot in the schedule
 */
export interface WorkoutSlot {
  phase: Phase;
  week: number;
  day: number;
}

/**
 * Slot override - maps a slot to a different workout template
 */
export interface SlotOverride {
  phase: Phase;
  week: number;
  day: number;
  templateId: string;
}

/**
 * Check if two slots are the same
 */
export function isSameSlot(slotA: WorkoutSlot, slotB: WorkoutSlot): boolean {
  return (
    slotA.phase === slotB.phase &&
    slotA.week === slotB.week &&
    slotA.day === slotB.day
  );
}

/**
 * Check if two slots are in the same phase
 * Swaps are only allowed within the same phase
 */
export function isSamePhase(slotA: WorkoutSlot, slotB: WorkoutSlot): boolean {
  return slotA.phase === slotB.phase;
}

/**
 * Find an override for a specific slot
 * Returns the override if found, undefined otherwise
 */
export function findSlotOverride(
  overrides: SlotOverride[],
  slot: WorkoutSlot
): SlotOverride | undefined {
  return overrides.find(
    (o) => o.phase === slot.phase && o.week === slot.week && o.day === slot.day
  );
}

/**
 * Remove overrides for specific slots
 * Returns a new array without the removed overrides
 */
export function removeSlotOverrides(
  overrides: SlotOverride[],
  slotsToRemove: WorkoutSlot[]
): SlotOverride[] {
  return overrides.filter(
    (o) => !slotsToRemove.some((slot) => isSameSlot(o, slot))
  );
}

/**
 * Build new slot overrides after a swap operation
 * 
 * When swapping slots A and B:
 * - Slot A gets the template that was in slot B
 * - Slot B gets the template that was in slot A
 * 
 * @param existingOverrides - Current slot overrides
 * @param slotA - First slot to swap
 * @param slotB - Second slot to swap
 * @param templateIdA - Template ID currently in slot A (after considering existing overrides)
 * @param templateIdB - Template ID currently in slot B (after considering existing overrides)
 * @returns New array of slot overrides with the swap applied
 */
export function buildSwapOverrides(
  existingOverrides: SlotOverride[],
  slotA: WorkoutSlot,
  slotB: WorkoutSlot,
  templateIdA: string,
  templateIdB: string
): SlotOverride[] {
  // Remove any existing overrides for these slots
  const filteredOverrides = removeSlotOverrides(existingOverrides, [slotA, slotB]);

  // Add new overrides: A's slot gets B's template, B's slot gets A's template
  return [
    ...filteredOverrides,
    {
      phase: slotA.phase,
      week: slotA.week,
      day: slotA.day,
      templateId: templateIdB,
    },
    {
      phase: slotB.phase,
      week: slotB.week,
      day: slotB.day,
      templateId: templateIdA,
    },
  ];
}

/**
 * Filter overrides to only include those for a specific phase
 */
export function getOverridesForPhase(
  overrides: SlotOverride[],
  phase: Phase
): SlotOverride[] {
  return overrides.filter((o) => o.phase === phase);
}

/**
 * Remove all overrides for a specific phase (reset to default)
 */
export function removePhaseOverrides(
  overrides: SlotOverride[],
  phase: Phase
): SlotOverride[] {
  return overrides.filter((o) => o.phase !== phase);
}

/**
 * Check if today's focus should be cleared based on timestamp
 * Focus is typically cleared at the end of the day
 * 
 * @param focusSetAt - Timestamp when focus was set (milliseconds)
 * @param currentTime - Current timestamp (milliseconds)
 * @returns true if focus should be cleared (set on a previous day)
 */
export function shouldClearTodayFocus(
  focusSetAt: number,
  currentTime: number
): boolean {
  const focusDate = new Date(focusSetAt);
  const currentDate = new Date(currentTime);
  
  // Compare dates (ignoring time)
  return (
    focusDate.getFullYear() !== currentDate.getFullYear() ||
    focusDate.getMonth() !== currentDate.getMonth() ||
    focusDate.getDate() !== currentDate.getDate()
  );
}

/**
 * Validate that a swap is allowed
 * Swaps must be within the same phase
 */
export function validateSwap(
  slotA: WorkoutSlot,
  slotB: WorkoutSlot
): { valid: boolean; error?: string } {
  if (isSameSlot(slotA, slotB)) {
    return { valid: false, error: "Cannot swap a slot with itself" };
  }
  
  if (!isSamePhase(slotA, slotB)) {
    return { valid: false, error: "Swaps must be within the same phase" };
  }
  
  return { valid: true };
}

/**
 * Count the number of overrides for each phase
 */
export function countOverridesByPhase(
  overrides: SlotOverride[]
): Record<Phase, number> {
  const counts: Record<Phase, number> = { GPP: 0, SPP: 0, SSP: 0 };
  
  for (const override of overrides) {
    counts[override.phase]++;
  }
  
  return counts;
}

