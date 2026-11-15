/**
 * Type scale for the athlete app (design audit F08), in points.
 * The role components in components/Typography.tsx read these values.
 */
export const TYPE_SCALE = {
  display: { size: 28, lineHeight: 34 },
  title: { size: 24, lineHeight: 30 },
  section: { size: 18, lineHeight: 24 },
  body: { size: 16, lineHeight: 24 },
  supporting: { size: 14, lineHeight: 20 },
  caption: { size: 12, lineHeight: 16 },
} as const

/** The smallest text size allowed in the athlete app. */
export const MIN_FONT_SIZE = TYPE_SCALE.caption.size
