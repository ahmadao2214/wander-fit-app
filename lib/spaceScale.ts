/**
 * Spacing and corner radius for the athlete app (design audit, "Proposed
 * system contract"), in points. tamagui.config.ts builds its space and
 * radius tokens from these, so every `p="$4"` or `rounded="$4"` lands on
 * the grid.
 *
 * Spacing roles: 16pt side gutters and container padding ($4), 8–12pt gaps
 * inside one task ($2–$3), 24–32pt between sections ($5–$6).
 */
export const SPACE = {
  0: 0,
  0.25: 1,
  0.5: 2,
  0.75: 3,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  4.5: 20,
  5: 24,
  6: 32,
  7: 40,
  8: 48,
  9: 56,
  10: 64,
  11: 72,
  12: 88,
  13: 102,
  14: 116,
  15: 130,
  16: 144,
  17: 144,
  18: 158,
  19: 172,
  20: 186,
} as const

/** The grid that the main steps ($1–$11) sit on. */
export const SPACE_GRID = 4

/**
 * Radius roles: 8pt controls and small tiles ($3), 12pt task containers
 * such as cards ($4), 16pt sheets, dialogs and large surfaces ($5–$6).
 * $1–$2 are for chips and thin bars; $7 and up are pill and circle sizes.
 */
export const RADIUS = {
  0: 0,
  1: 4,
  2: 6,
  3: 8,
  4: 12,
  5: 16,
  6: 16,
  7: 19,
  8: 22,
  9: 26,
  10: 34,
  11: 42,
  12: 50,
} as const

export const RADIUS_ROLES = {
  control: RADIUS[3],
  container: RADIUS[4],
  sheet: RADIUS[5],
} as const

/** Tamagui space tokens: `$<step>` plus a negative `-<step>` for margins. */
export function spaceTokens(): Record<string, number> {
  const tokens: Record<string, number> = {}
  for (const [key, value] of Object.entries(SPACE)) {
    tokens['$' + key] = value
    if (key !== '0') tokens['-' + key] = -value
  }
  tokens.$true = SPACE[4]
  tokens['-true'] = -SPACE[4]
  return tokens
}
