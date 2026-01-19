import { useState } from 'react'
import { YStack, XStack, Text, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Check } from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 32,
  letterSpacing: 1,
  color: '$color12',
  text: 'center',
})

const Subtitle = styled(Text, {
  fontFamily: '$body',
  fontSize: 15,
  color: '$color10',
  text: 'center',
  lineHeight: 22,
})

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const DAYS = [
  { short: 'S', full: 'Sunday', index: 0 },
  { short: 'M', full: 'Monday', index: 1 },
  { short: 'T', full: 'Tuesday', index: 2 },
  { short: 'W', full: 'Wednesday', index: 3 },
  { short: 'T', full: 'Thursday', index: 4 },
  { short: 'F', full: 'Friday', index: 5 },
  { short: 'S', full: 'Saturday', index: 6 },
] as const

const MIN_DAYS = 1
const RECOMMENDED_MIN = 3
const RECOMMENDED_MAX = 4

// ─────────────────────────────────────────────────────────────────────────────
// DaySlot Component
// ─────────────────────────────────────────────────────────────────────────────

interface DaySlotProps {
  day: (typeof DAYS)[number]
  isSelected: boolean
  onToggle: () => void
}

const DaySlot = ({ day, isSelected, onToggle }: DaySlotProps) => {
  return (
    <YStack items="center" gap="$3">
      {/* Day Label */}
      <Text
        fontSize={14}
        fontFamily="$body"
        fontWeight="600"
        color="$color10"
      >
        {day.short}
      </Text>

      {/* Slot Button */}
      <Button
        size="$5"
        circular
        bg={isSelected ? '$primary' : '$color4'}
        borderWidth={2}
        borderColor={isSelected ? '$primary' : '$color6'}
        pressStyle={{ scale: 0.92 }}
        onPress={onToggle}
      >
        {isSelected ? (
          <Check size={24} color="white" strokeWidth={3} />
        ) : (
          <Text fontSize={18} color="$color8" fontFamily="$body" fontWeight="500">
            –
          </Text>
        )}
      </Button>
    </YStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Training Days Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainingDaysScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup, yearsOfExperience } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
  }>()

  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set())

  // Redirect if missing params
  if (!sportId || !ageGroup || !yearsOfExperience) {
    router.replace('/(intake)/sport')
    return null
  }

  const count = selectedDays.size
  const isInRecommendedRange = count >= RECOMMENDED_MIN && count <= RECOMMENDED_MAX

  const handleToggleDay = (dayIndex: number) => {
    Vibration.vibrate(10)
    setSelectedDays((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(dayIndex)) {
        newSet.delete(dayIndex)
      } else {
        newSet.add(dayIndex)
      }
      return newSet
    })
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    if (selectedDays.size >= MIN_DAYS) {
      router.push({
        pathname: '/(intake)/season-timeline',
        params: {
          sportId,
          ageGroup,
          yearsOfExperience,
          trainingDays: selectedDays.size.toString(),
        },
      })
    }
  }

  const isValid = selectedDays.size >= MIN_DAYS

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <YStack
        flex={1}
        px="$4"
        pt={insets.top + 16}
        pb="$4"
        maxW={600}
        width="100%"
        self="center"
      >
        {/* Progress Dots */}
        <YStack items="center" mb="$4">
          <IntakeProgressDots total={COMBINED_FLOW_SCREEN_COUNT} current={COMBINED_FLOW_SCREENS.TRAINING_DAYS} />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$6">
          <DisplayHeading>TRAINING DAYS</DisplayHeading>
          <Subtitle>
            Tap the days you can commit{'\n'}to training each week
          </Subtitle>
        </YStack>

        {/* Main Content - Full Width */}
        <YStack flex={1} justify="center" gap="$8">
          {/* Days Grid */}
          <XStack justify="space-between" px="$2">
            {DAYS.map((day) => (
              <DaySlot
                key={day.index}
                day={day}
                isSelected={selectedDays.has(day.index)}
                onToggle={() => handleToggleDay(day.index)}
              />
            ))}
          </XStack>

          {/* Session Counter */}
          <YStack items="center" gap="$3">
            <XStack items="baseline" gap="$2">
              <Text
                fontSize={72}
                fontFamily="$heading"
                fontWeight="800"
                color={isInRecommendedRange ? '$primary' : '$color12'}
                lineHeight={72}
              >
                {count}
              </Text>
              <Text
                fontSize={20}
                fontFamily="$body"
                color="$color10"
              >
                {count === 1 ? 'session' : 'sessions'} / week
              </Text>
            </XStack>

            {/* Recommendation */}
            <XStack items="center" gap="$2">
              <Circle size={8} bg={isInRecommendedRange ? '$primary' : '$orange10'} />
              <Text
                fontSize={14}
                color={isInRecommendedRange ? '$primary' : '$orange11'}
                fontFamily="$body"
              >
                {isInRecommendedRange
                  ? 'Great choice! This is our recommended range'
                  : count < RECOMMENDED_MIN
                    ? `We recommend at least ${RECOMMENDED_MIN} days for best results`
                    : 'Make sure to include rest days for recovery'}
              </Text>
            </XStack>
          </YStack>
        </YStack>
      </YStack>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
        <XStack gap="$3">
          <Button
            flex={1}
            size="$5"
            bg="$color4"
            color="$color11"
            onPress={handleBack}
            icon={ChevronLeft}
            fontFamily="$body"
            fontWeight="600"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            Back
          </Button>
          <Button
            flex={2}
            size="$5"
            bg={isValid ? '$primary' : '$color6'}
            color="white"
            disabled={!isValid}
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={isValid ? { opacity: 0.9, scale: 0.98 } : {}}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
