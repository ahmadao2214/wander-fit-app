import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider, Theme } from 'tamagui'
import config from '../../../tamagui.config'
import { SPORT_SCHEMES, buttonFace, buttonHost, paint, sportPaint } from '../../../jest/sportPaint'
import { SetEditSheet } from '../SetEditSheet'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

function renderSheet(scheme: (typeof SPORT_SCHEMES)[number]) {
  return render(
    <Theme name={scheme}>
      <SetEditSheet
        open
        onOpenChange={jest.fn()}
        setNumber={2}
        prescribedReps="10"
        initialData={{ completed: false, skipped: false }}
        onSave={jest.fn()}
      />
    </Theme>,
    { wrapper: AllTheProviders }
  )
}

describe('SetEditSheet on the sport theme', () => {
  it.each(SPORT_SCHEMES)('keeps Close as text and Save as the only filled button on the %s theme', (scheme) => {
    const colors = sportPaint(scheme)
    const { getByText } = renderSheet(scheme)
    const save = getByText('Save')
    expect(paint(save).color).toBe(colors.ground)
    expect(buttonFace(save)).toBe(colors.button)
    for (const label of ['Close', 'Skip Set']) {
      // The label sits in a real button, so an unfilled face is not a missed lookup
      expect({ label, inButton: buttonHost(getByText(label)) !== null }).toEqual({ label, inButton: true })
      const face = buttonFace(getByText(label))
      expect({ label, filled: face !== undefined && face !== 'transparent' }).toEqual({ label, filled: false })
    }
  })
})
