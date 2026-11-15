import { useState } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Spinner, Text, YStack } from 'tamagui'
import { api } from '../convex/_generated/api'
import { AthleteOnlyRoute } from '../components/AuthGuard'

/**
 * After "Save your plan": the account and program exist, so the athlete
 * can go straight into Day 1's warm-up, or to Today.
 */
function Ready() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { kept } = useLocalSearchParams<{ kept?: string }>()
  const today = useQuery(api.scheduleOverrides.getTodayWorkout, {})
  const startSession = useMutation(api.gppWorkoutSessions.startSession)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const keptExisting = kept === '1'

  const onStart = async () => {
    if (!today || starting) return
    setStarting(true)
    setError('')
    try {
      const { sessionId } = await startSession({ templateId: today._id })
      router.replace({ pathname: '/(athlete)/workout/execute/[id]', params: { id: sessionId } })
    } catch (e) {
      console.error('Starting Day 1 failed:', e)
      setError("We couldn't start the workout. Try again, or find it on Today.")
      setStarting(false)
    }
  }

  return (
    <YStack flex={1} bg="$background" px="$5" pt={insets.top + 48} pb={insets.bottom + 16} justify="space-between">
      <YStack gap="$3" maxW={560} width="100%" self="center">
        <Text fontFamily="$body" fontSize={32} lineHeight={38} fontWeight="700" color="$color12" accessibilityRole="header">
          You're set.
        </Text>
        <Text fontFamily="$body" fontSize={17} lineHeight={24} color="$color11" testID="ready-detail">
          {keptExisting
            ? 'You already had a plan on this account, so we kept it and its history.'
            : today
              ? `${today.name} is first. It starts with the warm-up.`
              : 'Your plan is saved.'}
        </Text>
        {error ? (
          <Text fontFamily="$body" fontSize={15} color="$red11" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </YStack>

      <YStack gap="$3" maxW={560} width="100%" self="center">
        <Button
          size="$5"
          bg={today ? '$primary' : '$color5'}
          color={today ? 'white' : '$color10'}
          disabled={!today || starting}
          onPress={onStart}
          fontFamily="$body"
          fontWeight="700"
          rounded="$4"
          pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
          icon={starting || today === undefined ? <Spinner color={today ? 'white' : '$color10'} /> : undefined}
          testID="ready-start"
        >
          {keptExisting ? "Start today's workout" : 'Start Day 1'}
        </Button>
        <Button
          size="$5"
          chromeless
          onPress={() => router.replace('/(athlete)')}
          fontFamily="$body"
          fontWeight="600"
          color="$color11"
          testID="ready-not-now"
        >
          Not now
        </Button>
      </YStack>
    </YStack>
  )
}

export default function ReadyScreen() {
  return (
    <AthleteOnlyRoute>
      <Ready />
    </AthleteOnlyRoute>
  )
}
