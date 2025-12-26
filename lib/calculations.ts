import type { SkillLevel } from "../types";

/**
 * Intake Calculation Utilities
 *
 * Pure functions for calculating skill level and training phase
 * based on user intake responses.
 */

/**
 * Calculate skill level based on years of experience
 *
 * @param yearsOfExperience - Number of years of sport-specific experience. Negative values
 *   are treated as 0 and classified as "Novice".
 * @returns SkillLevel - 'Novice', 'Moderate', or 'Advanced'
 *
 * Thresholds (after normalization):
 * - < 1 year: Novice
 * - 1-3 years: Moderate
 * - 3+ years: Advanced
 */
export function getSkillLevel(yearsOfExperience: number): SkillLevel {
  const normalizedYears = Math.max(0, yearsOfExperience);
  if (normalizedYears < 1) return "Novice";
  if (normalizedYears < 3) return "Moderate";
  return "Advanced";
}

/**
 * Training phase based on weeks until season
 */
export type TrainingPhase = "In-Season Prep" | "Pre-Season" | "Off-Season";

/**
 * Calculate training phase based on weeks until season
 *
 * @param weeksUntilSeason - Number of weeks until the upcoming season. Values less than or equal to 0
 *   (season has started or date is in the past) are treated as 0 and classified as "In-Season Prep".
 * @returns TrainingPhase - 'In-Season Prep', 'Pre-Season', or 'Off-Season'
 *
 * Thresholds (after normalization):
 * - 0-4 weeks: In-Season Prep
 * - 5-8 weeks: Pre-Season
 * - > 8 weeks: Off-Season
 */
export function getTrainingPhase(weeksUntilSeason: number): TrainingPhase {
  const normalizedWeeks = Math.max(0, weeksUntilSeason);
  if (normalizedWeeks <= 4) return "In-Season Prep";
  if (normalizedWeeks <= 8) return "Pre-Season";
  return "Off-Season";
}

