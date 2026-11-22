import { useState } from 'react'
import { Platform } from 'react-native'
import { Card, Switch, XStack, YStack } from 'tamagui'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Body, Supporting, SectionTitle } from '../Typography'
import { analytics, type TelemetryPlatform } from '../../lib/analytics'
import {
  canShowSessionReplayOptIn,
  type AthleteAgeGroup,
} from '../../lib/sessionReplayGate'

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
  const envEnabled =
    replayEnvEnabled ?? process.env.EXPO_PUBLIC_POSTHOG_REPLAY_ENABLED === '1'

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
      <SectionTitle>Privacy</SectionTitle>

      <Card
        bg="$surface"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderColor"
        overflow="hidden"
      >
        <YStack>
          {/* Product analytics opt-out toggle */}
          <XStack
            px="$4"
            py="$3.5"
            items="center"
            justify="space-between"
            gap="$3"
            minH={60}
          >
            <YStack flex={1} gap="$1">
              <Body fontWeight="600">Share anonymous usage analytics</Body>
              <Supporting color="$color10" testID="analytics-opt-in-status">
                {analyticsEnabled
                  ? 'Helps us make workouts better. Never includes your name, email or anything personal.'
                  : "Off. Wander Fit doesn't send usage data from this account."}
              </Supporting>
            </YStack>
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
          </XStack>

          {/* Double-gated adult Web session replay opt-in (strictly hidden for 14-17 and native) */}
          {showReplayToggle ? (
            <XStack
              px="$4"
              py="$3.5"
              items="center"
              justify="space-between"
              gap="$3"
              minH={60}
              borderTopWidth={1}
              borderColor="$borderColor"
              opacity={analyticsOptOut ? 0.5 : 1}
            >
              <YStack flex={1} gap="$1">
                <Body fontWeight="600">Help test with masked screen replays</Body>
                <Supporting color="$color10">
                  Records masked layout interactions on web to spot UI bugs. All text and inputs are masked, and Profile, Settings, and Intake are never recorded.
                </Supporting>
              </YStack>
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
            </XStack>
          ) : null}
        </YStack>
      </Card>

      {errorMessage ? (
        <Supporting color="$red11" testID="telemetry-preferences-error">
          {errorMessage}
        </Supporting>
      ) : null}
    </YStack>
  )
}
