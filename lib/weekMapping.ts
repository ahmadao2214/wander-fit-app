/**
 * Week Mapping Utilities
 *
 * This module re-exports from the single source of truth in convex/weekMapping.ts
 * to provide a clean API for frontend code while avoiding code duplication.
 *
 * Maps user's actual program week to template week (1-4) to preserve
 * periodization regardless of phase length.
 */

// Re-export everything from the single source of truth
export {
  calculateWeeksPerPhase,
  mapUserWeekToTemplateWeek,
  getWeekFocusLabel,
  getWeekVolumeMultiplier,
  generateWeekMapping,
  DEFAULT_WEEKS_PER_PHASE,
  MIN_WEEKS_PER_PHASE,
  MAX_WEEKS_PER_PHASE,
  NUMBER_OF_PHASES,
} from "../convex/weekMapping";
