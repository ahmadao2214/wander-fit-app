/**
 * The shape of a new program, worked out from intake answers.
 *
 * `completeIntake` stores this, and the First Run reveal shows it before the
 * athlete has an account. Both call this one function so the reveal can't
 * promise a different program than the one that gets saved.
 */
import { calculateWeeksPerPhase, NUMBER_OF_PHASES } from "./weekMapping";

export type SkillLevel = "Novice" | "Moderate" | "Advanced";

/** Program length when the athlete has no set season. */
export const NO_SEASON_PROGRAM_WEEKS = 12;

export interface ProgramShape {
  skillLevel: SkillLevel;
  /** Stored as `totalProgramWeeks`: the weeks until season, or the default. */
  totalProgramWeeks: number;
  /** Weeks in each of GPP, SPP and SSP. Every phase has the same length. */
  weeksPerPhase: number;
  /** Weeks the program actually runs: `weeksPerPhase` times three. */
  programWeeks: number;
  /** Workouts across all three phases. */
  sessionCount: number;
}

/** Under 1 year Novice, under 3 Moderate, otherwise Advanced. */
export function skillLevelFromYears(yearsOfExperience: number): SkillLevel {
  if (yearsOfExperience < 1) return "Novice";
  if (yearsOfExperience < 3) return "Moderate";
  return "Advanced";
}

export function programShape(input: {
  yearsOfExperience: number;
  /** Undefined means no set season. */
  weeksUntilSeason?: number;
  trainingDaysPerWeek: number;
}): ProgramShape {
  const totalProgramWeeks = input.weeksUntilSeason ?? NO_SEASON_PROGRAM_WEEKS;
  const weeksPerPhase = calculateWeeksPerPhase(totalProgramWeeks);
  const programWeeks = weeksPerPhase * NUMBER_OF_PHASES;
  return {
    skillLevel: skillLevelFromYears(input.yearsOfExperience),
    totalProgramWeeks,
    weeksPerPhase,
    programWeeks,
    sessionCount: programWeeks * input.trainingDaysPerWeek,
  };
}
