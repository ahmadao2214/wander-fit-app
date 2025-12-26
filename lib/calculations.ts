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
 * @param yearsOfExperience - Number of years of sport-specific experience
 * @returns SkillLevel - 'Novice', 'Moderate', or 'Advanced'
 *
 * Thresholds:
 * - < 1 year: Novice
 * - 1-3 years: Moderate
 * - 3+ years: Advanced
 */
export function getSkillLevel(yearsOfExperience: number): SkillLevel {
  if (yearsOfExperience < 1) return "Novice";
  if (yearsOfExperience < 3) return "Moderate";
  return "Advanced";
}

/**
 * Training phase based on weeks until season
 */
export type TrainingPhase = "In-Season Prep" | "Pre-Season" | "Off-Season";

/**
 * Calculate training phase based on weeks until season
 *
 * @param weeksUntilSeason - Number of weeks until the upcoming season
 * @returns TrainingPhase - 'In-Season Prep', 'Pre-Season', or 'Off-Season'
 *
 * Thresholds:
 * - <= 4 weeks: In-Season Prep
 * - 5-8 weeks: Pre-Season
 * - > 8 weeks: Off-Season
 */
export function getTrainingPhase(weeksUntilSeason: number): TrainingPhase {
  if (weeksUntilSeason <= 4) return "In-Season Prep";
  if (weeksUntilSeason <= 8) return "Pre-Season";
  return "Off-Season";
}

