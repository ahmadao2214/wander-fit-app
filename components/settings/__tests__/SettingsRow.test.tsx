import React from 'react'
import { Text } from 'react-native'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import { LifeBuoy } from '@tamagui/lucide-icons'
import config from '../../../tamagui.config'
import { SettingsRow } from '../SettingsRow'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('SettingsRow', () => {
  it('calls onPress and reads as a button', () => {
    const onPress = jest.fn()
    const { getByLabelText } = render(
      <SettingsRow icon={LifeBuoy} label="Help & Support" onPress={onPress} testID="row" />,
      { wrapper }
    )
    const row = getByLabelText('Help & Support')
    expect(row.props.role).toBe('button')
    expect(row.props.testID).toBe('row')
    fireEvent.press(row)
    expect(onPress).toHaveBeenCalledTimes(1)
  })

  it('says an external row opens in the browser', () => {
    const { getByLabelText } = render(
      <SettingsRow label="Privacy Policy" external onPress={jest.fn()} testID="row" />,
      { wrapper }
    )
    expect(getByLabelText('Privacy Policy, opens in browser')).toBeTruthy()
  })

  it('renders a fact row with no button role that reads label and value together', () => {
    const { getByLabelText, queryByRole, getByText } = render(
      <SettingsRow label="Training days" value="3 days a week" testID="fact" />,
      { wrapper }
    )
    const row = getByLabelText('Training days, 3 days a week')
    expect(row.props.testID).toBe('fact')
    expect(row.props.accessible).toBe(true)
    expect(row.props.role).toBeUndefined()
    expect(queryByRole('button')).toBeNull()
    expect(getByText('3 days a week')).toBeTruthy()
  })

  it('renders the supporting line, and a value that truncates on a row that opens something', () => {
    const { getByText, getByTestId } = render(
      <SettingsRow
        label="Email"
        supporting="Used to sign in"
        supportingTestID="email-supporting"
        value="someone.with.a.long.address@example.com"
        valueNumeric
        onPress={jest.fn()}
      />,
      { wrapper }
    )
    expect(getByTestId('email-supporting').props.children).toBe('Used to sign in')
    expect(getByText('someone.with.a.long.address@example.com').props.numberOfLines).toBe(1)
  })

  it('applies tabular figures only when the value is numeric', () => {
    const { getByText, rerender } = render(<SettingsRow label="Week" value="3 of 12" />, {
      wrapper,
    })
    const flat = (node: ReturnType<typeof getByText>) =>
      JSON.stringify(node.props.style ?? {}) + JSON.stringify(node.props.fontVariant ?? '')
    expect(flat(getByText('3 of 12'))).not.toContain('tabular-nums')
    rerender(<SettingsRow label="Week" value="3 of 12" valueNumeric />)
    expect(flat(getByText('3 of 12'))).toContain('tabular-nums')
  })

  it('shows a trailing control in place of the chevron and leaves it its own element', () => {
    const { getByTestId, queryByLabelText, toJSON } = render(
      <SettingsRow
        label="Share anonymous usage analytics"
        trailing={<Text testID="control">switch</Text>}
        testID="toggle-row"
      />,
      { wrapper }
    )
    expect(getByTestId('control')).toBeTruthy()
    const row = getByTestId('toggle-row')
    expect(row.props.accessible).not.toBe(true)
    expect(queryByLabelText('Share anonymous usage analytics')).toBeNull()

    const pressable = render(
      <SettingsRow label="Share anonymous usage analytics" onPress={jest.fn()} />,
      { wrapper }
    )
    // The chevron is the only svg in a plain pressable row; the toggle row has none
    expect(JSON.stringify(pressable.toJSON())).toMatch(/svg|RNSVG/i)
    expect(JSON.stringify(toJSON())).not.toMatch(/svg|RNSVG/i)
  })

  it('has no chevron on a fact row', () => {
    const { toJSON } = render(<SettingsRow label="Experience" value="2 years" />, { wrapper })
    expect(JSON.stringify(toJSON())).not.toMatch(/svg|RNSVG/i)
  })
  it('can leave its name to its own text, so a web flow still finds it by testID', () => {
    const { getByTestId, queryByLabelText } = render(
      <SettingsRow label="App settings" onPress={jest.fn()} nameFromContent testID="row" />,
      { wrapper }
    )
    expect(getByTestId('row').props.role).toBe('button')
    expect(queryByLabelText('App settings')).toBeNull()
  })

  it('lets a fact wrap once so a long value can be read', () => {
    const { getByText } = render(
      <SettingsRow label="Email" value="maximiliano.fitzgerald-okonkwo@westlakeprep.edu" />,
      { wrapper }
    )
    expect(getByText('maximiliano.fitzgerald-okonkwo@westlakeprep.edu').props.numberOfLines).toBe(2)
  })
  it('reads a fact row with a supporting line as one element', () => {
    const { getByLabelText } = render(
      <SettingsRow label="Email" supporting="athlete@example.com" />,
      { wrapper }
    )
    expect(getByLabelText('Email, athlete@example.com')).toBeTruthy()
  })
})
