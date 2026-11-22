import { useState } from 'react'
import { Button, Card, XStack, YStack } from 'tamagui'
import { Bug, AlertTriangle } from '@tamagui/lucide-icons'
import { FlowErrorBoundary } from './FlowErrorBoundary'
import {
  captureVerificationEvent,
  getSentryStatus,
  isSentryDiagnosticsEnabled,
  isSentryEnabled,
} from '../lib/sentry'
import { Body, Caption, Supporting } from './Typography'

function DiagnosticsCardContent() {
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [triggerCrash, setTriggerCrash] = useState(false)

  if (triggerCrash) {
    throw new Error('WanderFit Sentry boundary verification crash')
  }

  const sentryStatus = getSentryStatus()
  const sentryActive = isSentryEnabled()

  const handleSendTestEvent = () => {
    const result = captureVerificationEvent()
    if (result.queued) {
      setStatusMessage(
        result.eventId
          ? `Queued test event (${result.eventId.slice(0, 8)}...) — check Sentry to confirm ingestion.`
          : 'Queued test event — check Sentry to confirm ingestion.'
      )
    } else {
      setStatusMessage(result.reason ?? 'Sentry is inactive.')
    }
  }

  return (
    <Card
      p="$4"
      bg="$surface"
      rounded="$4"
      borderWidth={1}
      borderColor="$borderColor"
      testID="sentry-diagnostics-card"
    >
      <YStack gap="$3">
        <XStack items="center" gap="$3">
          <YStack bg="$color4" p="$2" rounded="$10">
            <Bug size={18} color="$color10" />
          </YStack>
          <YStack flex={1}>
            <Body fontWeight="500">Crash reporting check</Body>
            <Supporting color="$color10">
              {sentryActive
                ? `Active (${sentryStatus.environment})`
                : `Inactive (${sentryStatus.disabledReason ?? 'client_unavailable'})`}
            </Supporting>
          </YStack>
        </XStack>

        {statusMessage && (
          <Caption color="$color11" testID="sentry-diagnostics-status">
            {statusMessage}
          </Caption>
        )}

        <XStack gap="$2" flexWrap="wrap">
          <Button
            size="$3"
            bg="$primary"
            color="white"
            onPress={handleSendTestEvent}
            testID="sentry-send-test-event"
          >
            Send test event
          </Button>
          <Button
            size="$3"
            variant="outlined"
            icon={<AlertTriangle size={14} />}
            onPress={() => setTriggerCrash(true)}
            testID="sentry-trigger-boundary-crash"
          >
            Test boundary crash
          </Button>
        </XStack>
      </YStack>
    </Card>
  )
}

/**
 * Internal verification card for confirming Sentry event ingestion and
 * source-mapped error boundary stack traces.
 *
 * Strictly gated behind EXPO_PUBLIC_SENTRY_DEBUG_TOOLS=true so production
 * athletes and App Store reviewers never see internal diagnostics controls.
 */
export function SentryDiagnosticsCard() {
  if (!isSentryDiagnosticsEnabled()) {
    return null
  }

  return (
    <FlowErrorBoundary
      flowName="sentry-verification"
      fallbackRoute="/(athlete)/profile"
      errorMessage="Boundary verification crash caught cleanly. Check Sentry for the symbolicated stack trace."
    >
      <DiagnosticsCardContent />
    </FlowErrorBoundary>
  )
}

export default SentryDiagnosticsCard
