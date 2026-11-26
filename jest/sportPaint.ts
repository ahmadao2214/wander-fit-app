import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { sportTheme, type Scheme } from '../lib/sportTokens'
import type { SportThemeName } from '../lib/sportTamaguiTheme'

// Helpers for screens that moved onto the basketball sport theme (issue #209).
// Every expected colour comes from sportTheme(), never a new hex.

type Styled = { props: { style?: unknown }; parent: Styled | null }

export const SPORT_SCHEMES = ['chalkboard', 'whiteboard'] as const satisfies readonly (Scheme & SportThemeName)[]

/** The flattened style a node paints with. */
export function paint(node: { props: { style?: unknown } }) {
  return (StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {}) as ViewStyle & TextStyle
}

/** Tamagui wraps a button label. The face is the first ancestor that paints a background. */
export function nearestBackground(node: Styled, depth = 8): string | undefined {
  let host: Styled | null = node
  for (let i = 0; i < depth && host; i++) {
    const background = paint(host).backgroundColor
    if (typeof background === 'string') return background
    host = host.parent
  }
  return undefined
}

/** The colours a moved screen paints with, for one scheme. */
export function sportPaint(scheme: Scheme) {
  const theme = sportTheme('basketball', scheme)
  return {
    ground: theme.instrumentBackground.hex,
    board: theme.boardSurface.hex,
    words: scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex,
    button: theme.button.hex,
    marker: theme.marker.hex,
  }
}

/** Every colour a node or its descendants paint, for "this never shows up" checks. */
export function paintedColors(node: { props: { style?: unknown }; children?: unknown[] }): string[] {
  const out: string[] = []
  const walk = (n: unknown) => {
    if (!n || typeof n !== 'object' || !('props' in n)) return
    const style = paint(n as { props: { style?: unknown } })
    for (const key of ['color', 'backgroundColor', 'borderColor', 'borderLeftColor'] as const) {
      const value = style[key]
      if (typeof value === 'string') out.push(value.toUpperCase())
    }
    const children = (n as { children?: unknown[] }).children ?? []
    for (const child of children) walk(child)
  }
  walk(node)
  return out
}
