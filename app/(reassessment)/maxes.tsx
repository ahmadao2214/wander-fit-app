import { useState, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Card,
  ScrollView,
  Input,
  Spinner,
} from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { ArrowLeft, ArrowUp, ArrowDown, Minus } from '@tamagui/lucide-icons'
import Animated, { FadeInUp } from 'react-native-reanimated'

/**
 * Maxes Screen — Screen 3 of Reassessment Flow
 *
 * Lets athletes update their 1RM for core lifts.
 * Shows previous max as placeholder with change indicators.
 */
export default function MaxesScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const params = useLocalSearchParams<{
    difficulty: string
    energy: string
    notes: string
  }>()

  const [maxValues, setMaxValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const coreLifts = useQuery(
    api.userMaxes.getCoreLiftExercises,
    user ? {} : 'skip'
  )

  const setMultipleMaxes = useMutation(api.userMaxes.setMultipleMaxes)

  if (coreLifts === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text fontFamily="$body" color="$color10">Loading...</Text>
      </YStack>
    )
  }

  const handleValueChange = (slug: string, value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '')
    setMaxValues((prev) => ({ ...prev, [slug]: numericValue }))

    // Validate
    const num = parseInt(numericValue, 10)
    if (numericValue && num > 2000) {
      setErrors((prev) => ({ ...prev, [slug]: 'Max value cannot exceed 2000 lbs' }))
    } else {
      setErrors((prev) => {
        const next = { ...prev }
        delete next[slug]
        return next
      })
    }
  }

  const getChangeIndicator = (slug: string, currentMax: number | null) => {
    const value = maxValues[slug]
    if (!value || !currentMax) return null
    const num = parseInt(value, 10)
    if (isNaN(num)) return null

    if (num > currentMax) return { icon: ArrowUp, color: '$green10' as const, label: `+${num - currentMax}` }
    if (num < currentMax) return { icon: ArrowDown, color: '$red10' as const, label: `${num - currentMax}` }
    return { icon: Minus, color: '$color9' as const, label: 'No change' }
  }

  const hasErrors = Object.keys(errors).length > 0

  const handleSave = async () => {
    if (hasErrors) return

    setIsSaving(true)
    try {
      const maxes = (coreLifts ?? [])
        .filter((lift) => {
          const val = maxValues[lift.slug]
          return val && parseInt(val, 10) > 0
        })
        .map((lift) => ({
          exerciseSlug: lift.slug,
          oneRepMax: parseInt(maxValues[lift.slug], 10),
        }))

      if (maxes.length > 0) {
        await setMultipleMaxes({ maxes })
      }

      router.push({
        pathname: '/(reassessment)/results' as any,
        params: {
          ...params,
          maxesUpdated: maxes.length > 0 ? 'true' : 'false',
        },
      })
    } catch (error) {
      console.error('Failed to save maxes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = () => {
    router.push({
      pathname: '/(reassessment)/results' as any,
      params: {
        ...params,
        maxesUpdated: 'false',
      },
    })
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      enabled={Platform.OS === 'ios'}
    >
      <YStack flex={1} bg="$background">
        <ScrollView
          flex={1}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1 } as any}
          showsVerticalScrollIndicator={false}
        >
          <YStack
            px="$4"
            pt={insets.top + 16}
            pb={insets.bottom + 24}
            gap="$5"
            maxW={600}
            width="100%"
            self="center"
          >
            {/* Header */}
            <XStack items="center" gap="$3">
              <Button
                size="$3"
                variant="outlined"
                icon={ArrowLeft}
                onPress={() => router.back()}
                circular
              />
              <YStack flex={1}>
                <Text fontFamily="$heading" fontSize={28} letterSpacing={0.5} color="$color12">
                  UPDATE YOUR MAXES
                </Text>
                <Text fontFamily="$body" color="$color10" fontSize={14}>
                  Enter new 1RM values or skip if unchanged
                </Text>
              </YStack>
            </XStack>

            {/* Core Lifts */}
            {(coreLifts ?? []).map((lift, index) => {
              const change = getChangeIndicator(lift.slug, lift.currentMax)
              const error = errors[lift.slug]

              return (
                <Animated.View
                  key={lift.slug}
                  entering={FadeInUp.delay(index * 80).duration(250)}
                >
                  <Card
                    p="$4"
                    bg="$surface"
                    borderWidth={1}
                    borderColor={error ? '$red6' : '$borderColor'}
                    borderCurve="continuous"
                    rounded="$4"
                    gap="$3"
                  >
                    <XStack justify="space-between" items="center">
                      <Text fontFamily="$body" fontWeight="700" fontSize={16} color="$color12">
                        {lift.name}
                      </Text>
                      {lift.currentMax && (
                        <Text fontFamily="$body" fontSize={13} color="$color10">
                          Current: {lift.currentMax} lbs
                        </Text>
                      )}
                    </XStack>

                    <XStack items="center" gap="$3">
                      <Input
                        flex={1}
                        size="$4"
                        placeholder={lift.currentMax ? `${lift.currentMax}` : 'Enter 1RM'}
                        value={maxValues[lift.slug] ?? ''}
                        onChangeText={(val) => handleValueChange(lift.slug, val)}
                        keyboardType="numeric"
                        fontFamily="$body"
                        fontWeight="700"
                        fontSize={18}
                        bg="$background"
                        borderColor={error ? '$red6' : '$borderColor'}
                        rounded="$3"
                      />
                      <Text fontFamily="$body" color="$color10" fontSize={14}>
                        lbs
                      </Text>
                      {change && (
                        <XStack items="center" gap="$1" minW={60}>
                          <change.icon size={16} color={change.color} />
                          <Text fontFamily="$body" fontWeight="600" fontSize={13} color={change.color}>
                            {change.label}
                          </Text>
                        </XStack>
                      )}
                    </XStack>

                    {error && (
                      <Text fontFamily="$body" fontSize={12} color="$red10">
                        {error}
                      </Text>
                    )}
                  </Card>
                </Animated.View>
              )
            })}

            {/* Actions */}
            <YStack gap="$3" pt="$2">
              <Button
                width="100%"
                size="$5"
                bg="$primary"
                color="white"
                fontFamily="$body"
                fontWeight="700"
                rounded="$4"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
                disabled={hasErrors || isSaving}
                opacity={hasErrors ? 0.5 : 1}
                onPress={handleSave}
              >
                {isSaving ? 'Saving...' : 'Save & Continue'}
              </Button>
              <Button
                width="100%"
                size="$4"
                bg="transparent"
                color="$color10"
                fontFamily="$body"
                onPress={handleSkip}
                disabled={isSaving}
              >
                Skip
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </KeyboardAvoidingView>
  )
}
