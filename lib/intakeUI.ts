/**
 * Intake UI Utilities
 *
 * Pure helper functions for the intake flow UI components.
 * Extracted for testability and reuse.
 */

/**
 * Intensity color token type
 */
export type IntensityColorToken =
  | "$intensityLow6"
  | "$intensityMed6"
  | "$intensityHigh6";

/**
 * Get slider color based on years of experience (intensity gradient)
 *
 * Maps years of experience to intensity color tokens:
 * - 0-3 years: Green (Low intensity) - $intensityLow6
 * - 4-6 years: Amber (Medium intensity) - $intensityMed6
 * - 7-10+ years: Red (High intensity) - $intensityHigh6
 *
 * @param years - Number of years of experience
 * @returns Tamagui color token string for the intensity level
 */
export function getExperienceSliderColor(years: number): IntensityColorToken {
  if (years <= 3) return "$intensityLow6";
  if (years <= 6) return "$intensityMed6";
  return "$intensityHigh6";
}

/**
 * Extract initials from a sport name for fallback icon display
 *
 * Algorithm:
 * 1. Split by whitespace and common separators: space, parentheses, forward slash
 * 2. Filter out empty strings
 * 3. Take the first letter of each word
 * 4. Filter to only alphabetic characters
 * 5. Take first 2 characters and uppercase
 *
 * @param name - Sport name string
 * @returns 1-2 character uppercase initials
 *
 * @example
 * getSportInitials("Soccer") // "SO"
 * getSportInitials("Ice Hockey") // "IH"
 * getSportInitials("Basketball (Women)") // "BW"
 * getSportInitials("Track/Field") // "TF"
 */
export function getSportInitials(name: string): string {
  return name
    .split(/[\s()/]+/)
    .filter((word) => word.length > 0)
    .map((word) => word[0])
    .filter((char) => /[A-Za-z]/.test(char))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
