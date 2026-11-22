import { Button, ScrollView, Text, YStack, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { mcpAddress } from '../../lib/mcpAddress'
import { useAuth } from '../../hooks/useAuth'
import { ReplayExcludedSurface } from '../../components/ReplayExcludedSurface'
import { TelemetryPreferencesCard } from '../../components/settings/TelemetryPreferencesCard'
import type { AthleteAgeGroup } from '../../lib/sessionReplayGate'

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 0.5,
  color: '$color12',
})

const BodyText = styled(Text, {
  fontFamily: '$body',
  fontSize: 15,
  lineHeight: 22,
  color: '$color11',
})

const StepTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 15,
  color: '$color12',
})

const STEPS = [
  'On claude.ai or the Claude desktop app, open Settings, then Connectors, and add a custom connector.',
  'Name it Wander Fit and paste the address above.',
  'Select Connect and sign in with the same account you use in this app.',
  'Open Claude on this phone and ask what today is. A change to a day waits for you to accept it.',
]

const Address = styled(Text, {
  fontFamily: '$body',
  fontSize: 15,
  color: '$color12',
})

export default function AthleteSettingsScreen() {
  const address = mcpAddress(process.env.EXPO_PUBLIC_CONVEX_URL)
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user, hasCompletedIntake } = useAuth()
  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : 'skip'
  )

  return (
    <ReplayExcludedSurface>
      <ScrollView
        flex={1}
        bg="$background"
        contentContainerStyle={{ pb: insets.bottom + 32 }}
      >
        <YStack px="$4" pt={insets.top + 12} gap="$4">
          <Button
            unstyled
            // Explicit route: on web, back() can leave the app or land on Today
            onPress={() => router.navigate('/(athlete)/profile')}
            icon={<ChevronLeft size={22} color="$color11" />}
            self="flex-start"
            aria-label="Back"
          />
          <DisplayHeading>App Settings</DisplayHeading>
          {user ? (
            <TelemetryPreferencesCard
              analyticsOptOut={user.analyticsOptOut === true}
              sessionReplayOptIn={user.sessionReplayOptIn === true}
              hasCompletedIntake={hasCompletedIntake}
              ageGroup={(programState?.ageGroup ?? undefined) as AthleteAgeGroup | undefined}
            />
          ) : null}
          <BodyText>
            Claude can read your program and, after you accept, reorder today&apos;s exercises or swap two days. Logging sets stays in this app.
          </BodyText>
          <YStack gap="$1" bg="$color2" rounded="$4" p="$3">
            <StepTitle>Connector address</StepTitle>
            {address ? (
              <Address selectable testID="mcp-address">
                {address}
              </Address>
            ) : (
              <BodyText>This build has no connector address.</BodyText>
            )}
          </YStack>
          <YStack gap="$3">
            {STEPS.map((step, index) => (
              <YStack key={step} gap="$1">
                <StepTitle>{index + 1}</StepTitle>
                <BodyText>{step}</BodyText>
              </YStack>
            ))}
          </YStack>
        </YStack>
      </ScrollView>
    </ReplayExcludedSurface>
  )
}
