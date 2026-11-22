import { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, Share, StyleSheet, Text } from 'react-native'
import { Button, Card, ScrollView, Separator, XStack, YStack } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Check, ChevronLeft, Copy, Share as ShareIcon } from '@tamagui/lucide-icons'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { mcpAddress } from '../../lib/mcpAddress'
import { useAuth } from '../../hooks/useAuth'
import { ReplayExcludedSurface } from '../../components/ReplayExcludedSurface'
import { TelemetryPreferencesCard } from '../../components/settings/TelemetryPreferencesCard'
import { Body, Caption, Display, SectionTitle, Supporting, numeric } from '../../components/Typography'
import type { AthleteAgeGroup } from '../../lib/sessionReplayGate'

const STEPS = [
  'On claude.ai or the Claude desktop app, open Settings, then Connectors, and add a custom connector.',
  'Name it Wander Fit and paste the address above.',
  'Select Connect and sign in with the same account you use in this app.',
  'Open Claude on this phone and ask what today is. A change to a day waits for you to accept it.',
]

/**
 * Copies the address on web. Native has no clipboard module in this build,
 * so it opens the share sheet, which offers Copy.
 */
function AddressAction({ address }: { address: string }) {
  const isWeb = Platform.OS === 'web'
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const onPress = async () => {
    try {
      if (isWeb) {
        await navigator.clipboard.writeText(address)
        setCopied(true)
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => setCopied(false), 2000)
      } else {
        await Share.share({ message: address })
      }
    } catch (error) {
      console.error('Failed to copy the connector address:', error)
    }
  }

  const label = isWeb ? (copied ? 'Copied' : 'Copy') : 'Share'
  const Icon = isWeb ? (copied ? Check : Copy) : ShareIcon

  return (
    <>
    <Button
      size="$3"
      minH={44}
      minW={112}
      self="flex-start"
      bg="transparent"
      borderWidth={1}
      borderColor="$borderColor"
      pressStyle={{ bg: '$color3' }}
      icon={<Icon size={16} color="$color12" />}
      onPress={onPress}
      testID="mcp-address-action"
      aria-label={isWeb ? 'Copy connector address' : 'Share connector address'}
    >
      <Body fontWeight="600" fontSize={15}>
        {label}
      </Body>
    </Button>
    {isWeb ? (
      // Mounted before the copy so screen readers pick up the change
      <Text role="status" testID="mcp-address-status" style={styles.srOnly}>
        {copied ? 'Connector address copied' : ''}
      </Text>
    ) : null}
    </>
  )
}

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
      <YStack flex={1} bg="$background">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ pb: insets.bottom + 32 }}
      >
        <YStack
          width="100%"
          maxW={640}
          self="center"
          px="$4"
          pt={insets.top + 4}
          gap="$6"
        >
          <YStack gap="$1">
            <Pressable
              // Explicit route: on web, back() can leave the app or land on Today
              onPress={() => router.navigate('/(athlete)/profile')}
              accessibilityRole="button"
              accessibilityLabel="Back"
              hitSlop={4}
              style={styles.backButton}
            >
              <ChevronLeft size={28} color="$color12" />
            </Pressable>
            <Display>App Settings</Display>
          </YStack>

          {user ? (
            <TelemetryPreferencesCard
              analyticsOptOut={user.analyticsOptOut === true}
              sessionReplayOptIn={user.sessionReplayOptIn === true}
              hasCompletedIntake={hasCompletedIntake}
              ageGroup={(programState?.ageGroup ?? undefined) as AthleteAgeGroup | undefined}
            />
          ) : null}

          <YStack gap="$3">
            <SectionTitle>Use with Claude</SectionTitle>
            <Supporting>
              Claude can read your program and, after you accept, reorder today&apos;s exercises or swap two days. Logging sets stays in this app.
            </Supporting>
            <Card
              bg="$surface"
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
              overflow="hidden"
            >
              <YStack p="$4" gap="$3">
                <YStack gap="$1">
                  <Caption>Connector address</Caption>
                  {address ? (
                    <Body fontWeight="600" selectable testID="mcp-address">
                      {address}
                    </Body>
                  ) : (
                    <Body color="$color11">This build has no connector address.</Body>
                  )}
                </YStack>
                {address ? <AddressAction address={address} /> : null}
              </YStack>
              <Separator borderColor="$borderColor" />
              <YStack p="$4" gap="$4">
                {STEPS.map((step, index) => (
                  <XStack key={step} gap="$3" items="flex-start">
                    <YStack
                      width={28}
                      height={28}
                      rounded={14}
                      borderWidth={1.5}
                      borderColor="$color8"
                      items="center"
                      justify="center"
                      shrink={0}
                    >
                      <Body fontWeight="700" fontSize={14} lineHeight={20} {...numeric}>
                        {index + 1}
                      </Body>
                    </YStack>
                    <Body flex={1} pt={2}>
                      {step}
                    </Body>
                  </XStack>
                ))}
              </YStack>
            </Card>
          </YStack>
        </YStack>
      </ScrollView>
      </YStack>
    </ReplayExcludedSurface>
  )
}

const styles = StyleSheet.create({
  // 44pt target, chevron optically aligned with the content edge
  backButton: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Visually hidden, still read by screen readers
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
  },
})
