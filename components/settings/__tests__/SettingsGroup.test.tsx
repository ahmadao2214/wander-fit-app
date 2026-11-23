import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { SettingsGroup } from '../SettingsGroup'
import { SettingsRow } from '../SettingsRow'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

/** The card's direct children, in order, as 'row:<testID>' or 'separator'. */
function cardLayout(card: { children: unknown[] }): string[] {
  return card.children.map((child) => {
    const node = child as { props: { testID?: string } }
    return node.props.testID ? `row:${node.props.testID}` : 'separator'
  })
}

function findCard(tree: unknown): { children: unknown[] } {
  // The card is the parent of the first row
  let found: { children: unknown[] } | null = null
  const walk = (node: unknown) => {
    if (found || !node || typeof node !== 'object') return
    const n = node as { children?: unknown[] }
    if (
      n.children?.some(
        (c) => (c as { props?: { testID?: string } })?.props?.testID?.startsWith('row-') ?? false
      )
    ) {
      found = n as { children: unknown[] }
      return
    }
    n.children?.forEach(walk)
  }
  walk(tree)
  if (!found) throw new Error('card not found')
  return found
}

describe('SettingsGroup', () => {
  it('renders the label as a heading and the footer', () => {
    const { getByRole, getByText } = render(
      <SettingsGroup label="Account" footer="Deletes your program for good.">
        <SettingsRow label="Delete account" onPress={jest.fn()} testID="row-delete" />
      </SettingsGroup>,
      { wrapper }
    )
    expect(getByRole('header', { name: 'Account' })).toBeTruthy()
    expect(getByText('Deletes your program for good.')).toBeTruthy()
  })

  it('renders no label or footer when none is given', () => {
    const { queryByRole } = render(
      <SettingsGroup>
        <SettingsRow label="Delete account" onPress={jest.fn()} testID="row-delete" />
      </SettingsGroup>,
      { wrapper }
    )
    expect(queryByRole('header')).toBeNull()
  })

  it('puts a separator between rows and none before the first or after the last', () => {
    const { toJSON } = render(
      <SettingsGroup label="Support & Legal">
        <SettingsRow label="Help & Support" onPress={jest.fn()} testID="row-a" />
        <SettingsRow label="Privacy Policy" onPress={jest.fn()} testID="row-b" />
        <SettingsRow label="Terms of Service" onPress={jest.fn()} testID="row-c" />
      </SettingsGroup>,
      { wrapper }
    )
    expect(cardLayout(findCard(toJSON()))).toEqual([
      'row:row-a',
      'separator',
      'row:row-b',
      'separator',
      'row:row-c',
    ])
  })

  it('skips null and false children without leaving a stray separator', () => {
    const hidden = false
    const { toJSON } = render(
      <SettingsGroup label="Privacy">
        {null}
        <SettingsRow label="Analytics" value="On" testID="row-a" />
        {hidden ? <SettingsRow label="Replay" testID="row-hidden" /> : null}
        {hidden && <SettingsRow label="Other" testID="row-other" />}
        <SettingsRow label="Last" value="Yes" testID="row-b" />
        {null}
      </SettingsGroup>,
      { wrapper }
    )
    expect(cardLayout(findCard(toJSON()))).toEqual(['row:row-a', 'separator', 'row:row-b'])
  })

  it('has no separator around a single row', () => {
    const { toJSON } = render(
      <SettingsGroup>
        {null}
        <SettingsRow label="Delete account" onPress={jest.fn()} testID="row-only" />
      </SettingsGroup>,
      { wrapper }
    )
    expect(cardLayout(findCard(toJSON()))).toEqual(['row:row-only'])
  })
})
