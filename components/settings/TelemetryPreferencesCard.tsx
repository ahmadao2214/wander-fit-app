import { useState } from 'react'
import { Platform } from 'react-native'
import { Switch, YStack } from 'tamagui'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Supporting } from '../Typography'
import { SettingsGroup } from './SettingsGroup'
import { SettingsRow } from './SettingsRow'
import { analytics, type TelemetryPlatform } from '../../lib/analytics'
import { canShowSessionReplayOptIn, type AthleteAgeGroup } from '../../lib/sessionReplayGate'

function currentPlatform(): TelemetryPlatform {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS
  return 'web'
}

export interface TelemetryPreferencesCardProps {
  analyticsOptOut: boolean
  sessionReplayOptIn: boolean
  hasCompletedIntake: boolean
  ageGroup: AthleteAgeGroup | undefined
  /** Override for tests; defaults to EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED === '1'. */
  replayEnvEnabled?: boolean
  /** Override for tests; defaults to current Platform.OS. */
  platformOverride?: TelemetryPlatform
}

/**
 * Athlete privacy & telemetry controls (ADR 0005).
 *
 * - Product analytics opt-out is available to every signed-in Athlete.
 * - Adult Web session replay opt-in is strictly hidden for 14-17 Athletes,
 *   native platforms (Phase 1), incomplete Intake, or when the env flag is off.
 */
export function TelemetryPreferencesCard({
  analyticsOptOut,
  sessionReplayOptIn,
  hasCompletedIntake,
  ageGroup,
  replayEnvEnabled,
  platformOverride,
}: TelemetryPreferencesCardProps) {
  const updateTelemetryPreferences = useMutation(api.users.updateTelemetryPreferences)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const platform = platformOverride ?? currentPlatform()
  const envEnabled = replayEnvEnabled ?? process.env.EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED === '1'

  const showReplayToggle = canShowSessionReplayOptIn({
    platform,
    envEnabled,
    isAuthenticated: true,
    hasCompletedIntake,
    ageGroup,
  })

  const analyticsEnabled = !analyticsOptOut

  const handleAnalyticsToggle = async (checked: boolean) => {
    if (saving) return
    setSaving(true)
    setErrorMessage(null)
    const nextOptOut = !checked
    try {
      await updateTelemetryPreferences({ analyticsOptOut: nextOptOut })
      analytics.setOptOut(nextOptOut)
    } catch (error) {
      console.error('Failed to update analytics preference:', error)
      setErrorMessage("Couldn't save your preference. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleReplayToggle = async (checked: boolean) => {
    if (saving || analyticsOptOut) return
    setSaving(true)
    setErrorMessage(null)
    try {
      await updateTelemetryPreferences({ sessionReplayOptIn: checked })
    } catch (error) {
      console.error('Failed to update session replay preference:', error)
      setErrorMessage("Couldn't save your preference. Try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <YStack gap="$3">
      <SettingsGroup label="Privacy">
        {/* Product analytics opt-out toggle */}
        <SettingsRow
          label="Share anonymous usage analytics"
          supporting={
            analyticsEnabled
              ? 'Helps us make workouts better. Never includes your name or email.'
              : "Off. Wander Fit doesn't send usage data from this account."
          }
          supportingTestID="analytics-opt-in-status"
          trailing={
            <Switch
              size="$3"
              checked={analyticsEnabled}
              disabled={saving}
              onCheckedChange={handleAnalyticsToggle}
              accessibilityLabel="Share anonymous usage analytics"
              testID="analytics-opt-in-switch"
              bg={analyticsEnabled ? '$primary' : '$color5'}
            >
              <Switch.Thumb animation="quick" />
            </Switch>
          }
        />

        {/* Double-gated adult Web session replay opt-in (strictly hidden for 14-17 and native) */}
        {showReplayToggle ? (
          <YStack opacity={analyticsOptOut ? 0.5 : 1}>
            <SettingsRow
              label="Help test with masked screen replays"
              supporting="Records masked layout interactions on web to spot UI bugs. All text and inputs are masked, and Profile, Settings, and Intake are never recorded."
              trailing={
                <Switch
                  size="$3"
                  checked={!analyticsOptOut && sessionReplayOptIn}
                  disabled={saving || analyticsOptOut}
                  onCheckedChange={handleReplayToggle}
                  accessibilityLabel="Help test with masked screen replays"
                  testID="session-replay-opt-in-switch"
                  bg={!analyticsOptOut && sessionReplayOptIn ? '$primary' : '$color5'}
                >
                  <Switch.Thumb animation="quick" />
                </Switch>
              }
            />
          </YStack>
        ) : null}
      </SettingsGroup>

      {errorMessage ? (
        <Supporting color="$red11" testID="telemetry-preferences-error">
          {errorMessage}
        </Supporting>
      ) : null}
    </YStack>
  )
}
