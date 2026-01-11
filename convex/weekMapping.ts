/**
 * Week Mapping Utilities
 *
 * Maps user's actual program week to template week (1-4) to preserve
 * periodization regardless of phase length.
 *
 * Template weeks have specific training focuses:
 * - Week 1: Introduction (70% volume)
 * - Week 2: Build (85% volume)
 * - Week 3: Peak (100% volume)
 * - Week 4: Deload (60% volume)
 */

/** Default weeks per phase if not specified */
export const DEFAULT_WEEKS_PER_PHASE = 4;

/** Minimum weeks per phase to maintain periodization */
export const MIN_WEEKS_PER_PHASE = 2;

/** Maximum weeks per phase */
export const MAX_WEEKS_PER_PHASE = 8;

/** Number of phases in a program */
export const NUMBER_OF_PHASES = 3;

/**
 * Calculate weeks per phase from total program weeks
 *
 * @param totalWeeks - Total program weeks (from weeksUntilSeason)
 * @param numberOfPhases - Number of phases (default 3: GPP, SPP, SSP)
 * @returns Weeks per phase (minimum 2)
 *
 * @example
 * calculateWeeksPerPhase(12) // 4
 * calculateWeeksPerPhase(9)  // 3
 * calculateWeeksPerPhase(6)  // 2
 * calculateWeeksPerPhase(5)  // 2 (minimum enforced)
 */
export function calculateWeeksPerPhase(
  totalWeeks: number,
  numberOfPhases: number = NUMBER_OF_PHASES
): number {
  const calculated = Math.floor(totalWeeks / numberOfPhases);
  return Math.max(MIN_WEEKS_PER_PHASE, Math.min(MAX_WEEKS_PER_PHASE, calculated));
}

/**
 * Maps user's actual week (1 to N) to template week (1-4)
 *
 * Preserves periodization curve:
 * - First week always maps to template week 1 (intro)
 * - Last week always maps to template week 4 (deload)
 * - Middle weeks distribute across template weeks 2-3
 *
 * @param userWeek - The user's current week in the phase (1 to weeksPerPhase)
 * @param weeksPerPhase - Total weeks in the phase
 * @returns Template week (1-4) for database lookup
 *
 * @example
 * // 2 weeks per phase
 * mapUserWeekToTemplateWeek(1, 2) // 1 (intro)
 * mapUserWeekToTemplateWeek(2, 2) // 4 (deload)
 *
 * // 3 weeks per phase
 * mapUserWeekToTemplateWeek(1, 3) // 1 (intro)
 * mapUserWeekToTemplateWeek(2, 3) // 2 (build)
 * mapUserWeekToTemplateWeek(3, 3) // 4 (deload)
 *
 * // 4 weeks per phase (standard)
 * mapUserWeekToTemplateWeek(1, 4) // 1
 * mapUserWeekToTemplateWeek(2, 4) // 2
 * mapUserWeekToTemplateWeek(3, 4) // 3
 * mapUserWeekToTemplateWeek(4, 4) // 4
 *
 * // 5 weeks per phase
 * mapUserWeekToTemplateWeek(1, 5) // 1 (intro)
 * mapUserWeekToTemplateWeek(2, 5) // 2 (build)
 * mapUserWeekToTemplateWeek(3, 5) // 2 (extended build)
 * mapUserWeekToTemplateWeek(4, 5) // 3 (peak)
 * mapUserWeekToTemplateWeek(5, 5) // 4 (deload)
 *
 * // 6 weeks per phase
 * mapUserWeekToTemplateWeek(1, 6) // 1 (intro)
 * mapUserWeekToTemplateWeek(2, 6) // 2 (build)
 * mapUserWeekToTemplateWeek(3, 6) // 2 (extended build)
 * mapUserWeekToTemplateWeek(4, 6) // 3 (peak)
 * mapUserWeekToTemplateWeek(5, 6) // 3 (extended peak)
 * mapUserWeekToTemplateWeek(6, 6) // 4 (deload)
 */
export function mapUserWeekToTemplateWeek(
  userWeek: number,
  weeksPerPhase: number = DEFAULT_WEEKS_PER_PHASE
): number {
  // Clamp weeksPerPhase to valid range
  const clampedWeeksPerPhase = Math.max(
    MIN_WEEKS_PER_PHASE,
    Math.min(MAX_WEEKS_PER_PHASE, weeksPerPhase)
  );

  // Clamp userWeek to valid range
  const clampedUserWeek = Math.max(1, Math.min(clampedWeeksPerPhase, userWeek));

  // Special case: exactly 4 weeks (standard) - direct mapping
  if (clampedWeeksPerPhase === 4) {
    return clampedUserWeek;
  }

  // Special case: 2 weeks - intro and deload only
  if (clampedWeeksPerPhase === 2) {
    return clampedUserWeek === 1 ? 1 : 4;
  }

  // Special case: 3 weeks - intro, build, deload
  if (clampedWeeksPerPhase === 3) {
    if (clampedUserWeek === 1) return 1;
    if (clampedUserWeek === 2) return 2;
    return 4;
  }

  // For phases longer than 4 weeks, distribute middle weeks
  // First week = intro (1), last week = deload (4)
  // Middle weeks distribute across build (2) and peak (3)

  if (clampedUserWeek === 1) {
    return 1; // Always intro
  }

  if (clampedUserWeek === clampedWeeksPerPhase) {
    return 4; // Always deload
  }

  // Middle weeks (2 to weeksPerPhase-1) map to template weeks 2-3
  const middleWeeks = clampedWeeksPerPhase - 2; // Number of middle weeks
  const middlePosition = clampedUserWeek - 1; // Position within middle weeks (1-indexed)

  // Split middle weeks between build (2) and peak (3)
  // First half goes to build, second half to peak
  const halfPoint = Math.ceil(middleWeeks / 2);

  if (middlePosition <= halfPoint) {
    return 2; // Build phase
  } else {
    return 3; // Peak phase
  }
}

/**
 * Get the display label for a week based on template mapping
 *
 * @param templateWeek - The template week (1-4)
 * @returns Human-readable label for the week focus
 */
export function getWeekFocusLabel(templateWeek: number): string {
  switch (templateWeek) {
    case 1:
      return "Introduction";
    case 2:
      return "Build";
    case 3:
      return "Peak";
    case 4:
      return "Deload";
    default:
      return "Training";
  }
}

/**
 * Get volume multiplier for a template week
 * Matches the values in generateTemplates.ts
 *
 * @param templateWeek - The template week (1-4)
 * @returns Volume multiplier (0.6 - 1.0)
 */
export function getWeekVolumeMultiplier(templateWeek: number): number {
  switch (templateWeek) {
    case 1:
      return 0.7; // Introduction
    case 2:
      return 0.85; // Build
    case 3:
      return 1.0; // Peak
    case 4:
      return 0.6; // Deload
    default:
      return 1.0;
  }
}

/**
 * Generate a complete week mapping for a phase
 * Useful for displaying the full phase schedule
 *
 * @param weeksPerPhase - Total weeks in the phase
 * @returns Array of template weeks for each user week
 *
 * @example
 * generateWeekMapping(4) // [1, 2, 3, 4]
 * generateWeekMapping(6) // [1, 2, 2, 3, 3, 4]
 */
export function generateWeekMapping(weeksPerPhase: number): number[] {
  const mapping: number[] = [];
  for (let week = 1; week <= weeksPerPhase; week++) {
    mapping.push(mapUserWeekToTemplateWeek(week, weeksPerPhase));
  }
  return mapping;
}
