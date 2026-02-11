import { useState } from 'react'
import { YStack, XStack, Text, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Check, Dumbbell } from '@tamagui/lucide-icons'
import { Vibration, Animated } from 'react-native'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation'

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

// Square calendar cell styled component
const CalendarCell = styled(YStack, {
  width: 44,
  height: 56,
  rounded: '$3',
  items: 'center',
  justify: 'center',
  gap: '$1',
  borderWidth: 2,
  animation: 'quick',
  pressStyle: { scale: 0.95, opacity: 0.9 },
  variants: {
    selected: {
      true: {
        bg: '$primary',
        borderColor: '$primary',
      },
      false: {
        bg: '$color3',
        borderColor: '$color5',
      },
    },
  } as const,
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
// DaySlot Component (Square Calendar Cell)
// ─────────────────────────────────────────────────────────────────────────────

interface DaySlotProps {
  day: (typeof DAYS)[number]
  isSelected: boolean
  onToggle: () => void
}

const DaySlot = ({ day, isSelected, onToggle }: DaySlotProps) => {
  return (
    <CalendarCell
      selected={isSelected}
      onPress={onToggle}
      cursor="pointer"
    >
      {/* Day Letter */}
      <Text
        fontSize={12}
        fontFamily="$body"
        fontWeight="600"
        color={isSelected ? 'white' : '$color10'}
        opacity={isSelected ? 0.9 : 1}
      >
        {day.short}
      </Text>

      {/* Icon or Empty State */}
      {isSelected ? (
        <Dumbbell size={18} color="white" />
      ) : (
        <YStack
          width={18}
          height={18}
          rounded="$1"
          borderWidth={1}
          borderColor="$color6"
          borderStyle="dashed"
        />
      )}
    </CalendarCell>
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

  // Swipe navigation - only backward (right swipe), forward requires Continue button
  const { panHandlers, translateX } = useSwipeNavigation({
    onSwipeRight: () => router.back(),
    canSwipeRight: true,
    canSwipeLeft: false,
  })

  const isValid = selectedDays.size >= MIN_DAYS

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
      // Sort days in order (0=Sun through 6=Sat)
      const sortedDays = Array.from(selectedDays).sort((a, b) => a - b)
      router.push({
        pathname: '/(intake)/season-timeline',
        params: {
          sportId,
          ageGroup,
          yearsOfExperience,
          trainingDays: selectedDays.size.toString(),
          selectedTrainingDays: sortedDays.join(','), // "1,3,5" for Mon,Wed,Fri
        },
      })
    }
  }

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, ageGroup, yearsOfExperience },
      } as any)
    }
  }

  return (
    <Animated.View
      {...panHandlers}
      style={{ flex: 1, transform: [{ translateX }] }}
    >
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
          <IntakeProgressDots
            total={COMBINED_FLOW_SCREEN_COUNT}
            current={COMBINED_FLOW_SCREENS.TRAINING_DAYS}
            onNavigate={handleProgressNavigate}
          />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$6">
          <DisplayHeading>TRAINING DAYS</DisplayHeading>
          <Subtitle>
            Tap the days you can commit{'\n'}to training each week
          </Subtitle>
        </YStack>

        {/* Main Content - Full Width */}
        <YStack flex={1} justify="center" gap="$6">
          {/* Calendar Strip Container */}
          <YStack
            bg="$color2"
            rounded="$5"
            p="$4"
            borderWidth={1}
            borderColor="$color4"
          >
            {/* Week Label */}
            <XStack justify="center" mb="$3">
              <Text
                fontSize={13}
                fontFamily="$body"
                fontWeight="600"
                color="$color10"
                letterSpacing={1}
                textTransform="uppercase"
              >
                Your Weekly Schedule
              </Text>
            </XStack>

            {/* Days Grid */}
            <XStack justify="space-between">
              {DAYS.map((day) => (
                <DaySlot
                  key={day.index}
                  day={day}
                  isSelected={selectedDays.has(day.index)}
                  onToggle={() => handleToggleDay(day.index)}
                />
              ))}
            </XStack>
          </YStack>

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
            <YStack
              bg={isInRecommendedRange ? '$brand2' : '$orange3'}
              px="$4"
              py="$2"
              rounded="$3"
            >
              <XStack items="center" gap="$2">
                <Circle size={8} bg={isInRecommendedRange ? '$primary' : '$orange10'} />
                <Text
                  fontSize={14}
                  color={isInRecommendedRange ? '$primary' : '$orange11'}
                  fontFamily="$body"
                  fontWeight="500"
                >
                  {isInRecommendedRange
                    ? 'Perfect! This is our recommended range'
                    : count < RECOMMENDED_MIN
                      ? `We recommend at least ${RECOMMENDED_MIN} days`
                      : 'Include rest days for recovery'}
                </Text>
              </XStack>
            </YStack>
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
    </Animated.View>
  )
}
