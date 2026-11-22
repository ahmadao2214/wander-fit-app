import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { TelemetryPreferencesCard } from '../TelemetryPreferencesCard'

const mockUpdatePreferences = jest.fn()
const mockSetOptOut = jest.fn()

jest.mock('convex/react', () => ({
  useMutation: () => mockUpdatePreferences,
}))

jest.mock('../../../lib/analytics', () => ({
  analytics: {
    setOptOut: (...args: unknown[]) => mockSetOptOut(...args),
  },
}))

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('TelemetryPreferencesCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdatePreferences.mockResolvedValue({})
  })

  it('renders analytics opt-out toggle and persists opt-out change to Convex and analytics SDK', async () => {
    const { getByTestId, queryByTestId } = render(
      <TelemetryPreferencesCard
        analyticsOptOut={false}
        sessionReplayOptIn={false}
        hasCompletedIntake={true}
        ageGroup="14-17"
        replayEnvEnabled={true}
        platformOverride="web"
      />,
      { wrapper: AllTheProviders }
    )

    // Youth (14-17) MUST NEVER see session replay opt-in toggle
    expect(queryByTestId('session-replay-opt-in-switch')).toBeNull()

    const analyticsSwitch = getByTestId('analytics-opt-in-switch')
    fireEvent(analyticsSwitch, 'onCheckedChange', false)

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ analyticsOptOut: true })
      expect(mockSetOptOut).toHaveBeenCalledWith(true)
    })
  })

  it('shows adult Web replay opt-in toggle ONLY for 18+ athletes on Web when env flag is enabled', async () => {
    const { getByTestId } = render(
      <TelemetryPreferencesCard
        analyticsOptOut={false}
        sessionReplayOptIn={false}
        hasCompletedIntake={true}
        ageGroup="18-35"
        replayEnvEnabled={true}
        platformOverride="web"
      />,
      { wrapper: AllTheProviders }
    )

    const replaySwitch = getByTestId('session-replay-opt-in-switch')
    fireEvent(replaySwitch, 'onCheckedChange', true)

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith({ sessionReplayOptIn: true })
    })
  })

  it('hides replay opt-in toggle on native platforms even for 18+ athletes', () => {
    const { queryByTestId } = render(
      <TelemetryPreferencesCard
        analyticsOptOut={false}
        sessionReplayOptIn={false}
        hasCompletedIntake={true}
        ageGroup="36+"
        replayEnvEnabled={true}
        platformOverride="ios"
      />,
      { wrapper: AllTheProviders }
    )

    expect(queryByTestId('session-replay-opt-in-switch')).toBeNull()
  })

  it('hides replay opt-in toggle when EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED is off', () => {
    const { queryByTestId } = render(
      <TelemetryPreferencesCard
        analyticsOptOut={false}
        sessionReplayOptIn={false}
        hasCompletedIntake={true}
        ageGroup="18-35"
        replayEnvEnabled={false}
        platformOverride="web"
      />,
      { wrapper: AllTheProviders }
    )

    expect(queryByTestId('session-replay-opt-in-switch')).toBeNull()
  })
})
