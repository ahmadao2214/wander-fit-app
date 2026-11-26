import React from 'react'
import { StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native'
import { render, within } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import { sportTheme, type Scheme } from '../../lib/sportTokens'
import { SportThemeProof } from '../SportThemeProof'

type Styled = { props: { style?: unknown }; parent: Styled | null }

function paint(node: { props: { style?: unknown } }) {
  return (StyleSheet.flatten(node.props.style as StyleProp<ViewStyle>) ?? {}) as ViewStyle & TextStyle
}

// Tamagui wraps the button label. The face is the first ancestor that paints a background.
function nearestBackground(node: Styled): string | undefined {
  let host: Styled | null = node
  for (let i = 0; i < 6 && host; i++) {
    const background = paint(host).backgroundColor
    if (typeof background === 'string') return background
    host = host.parent
  }
  return undefined
}

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('SportThemeProof', () => {
  it('renders both basketball themes by default', () => {
    const { getByTestId, getAllByText } = render(<SportThemeProof />, { wrapper: AllTheProviders })
    expect(getByTestId('sport-theme-proof-chalkboard')).toBeTruthy()
    expect(getByTestId('sport-theme-proof-whiteboard')).toBeTruthy()
    expect(getAllByText('Build')).toHaveLength(2)
    expect(getAllByText('Log Set')).toHaveLength(2)
  })

  it('renders one theme when named', () => {
    const { queryByTestId, getAllByText } = render(<SportThemeProof theme="whiteboard" />, {
      wrapper: AllTheProviders,
    })
    expect([
      queryByTestId('sport-theme-proof-whiteboard') !== null,
      queryByTestId('sport-theme-proof-chalkboard'),
    ]).toEqual([true, null])
    expect(getAllByText('Build')).toHaveLength(1)
  })

  it('paints each block from its basketball theme', () => {
    const { getByTestId } = render(<SportThemeProof />, { wrapper: AllTheProviders })
    for (const scheme of ['chalkboard', 'whiteboard'] as const satisfies readonly Scheme[]) {
      const theme = sportTheme('basketball', scheme)
      const words = scheme === 'chalkboard' ? theme.chalk.hex : theme.ink.hex
      const block = within(getByTestId(`sport-theme-proof-${scheme}`))
      expect(paint(getByTestId(`sport-theme-proof-${scheme}`)).backgroundColor).toBe(
        theme.instrumentBackground.hex,
      )
      expect(paint(block.getByText('Build')).color).toBe(words)
      const label = block.getByText('Log Set')
      expect(paint(label).color).toBe(theme.instrumentBackground.hex)
      expect(nearestBackground(label)).toBe(theme.button.hex)
      expect(paint(block.getByText('Drive left, kick out to the corner.')).color).toBe(theme.marker.hex)
    }
  })
})
