import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Check, X } from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import { IntakeProgressDots, INTAKE_SCREENS } from '../../components/IntakeProgressDots'

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
const MAX_DAYS = 7
const RECOMMENDED_MIN = 3
const RECOMMENDED_MAX = 4

// ─────────────────────────────────────────────────────────────────────────────
// DaySlot Component
// ─────────────────────────────────────────────────────────────────────────────

interface DaySlotProps {
  day: (typeof DAYS)[number]
  isSelected: boolean
  onToggle: () => void
  index: number
}

const DaySlot = ({ day, isSelected, onToggle, index }: DaySlotProps) => {
  return (
    <YStack
      items="center"
      gap="$2"
      animation="quick"
      enterStyle={{
        opacity: 0,
        y: 10,
      }}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Day Label */}
      <Text
        fontSize={12}
        fontFamily="$body"
        fontWeight="600"
        color="$color10"
        textTransform="uppercase"
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
// WhiteboardCard Component
// ─────────────────────────────────────────────────────────────────────────────

interface WhiteboardCardProps {
  selectedDays: Set<number>
  onToggleDay: (dayIndex: number) => void
}

const WhiteboardCard = ({ selectedDays, onToggleDay }: WhiteboardCardProps) => {
  const count = selectedDays.size
  const isInRecommendedRange = count >= RECOMMENDED_MIN && count <= RECOMMENDED_MAX

  return (
    <Card
      bg="$surface"
      borderColor="$borderColor"
      borderWidth={1}
      rounded="$6"
      overflow="hidden"
    >
      {/* Whiteboard Header */}
      <YStack
        bg="$color3"
        px="$4"
        py="$3"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        <Text
          fontSize={14}
          fontFamily="$body"
          fontWeight="700"
          color="$color11"
          textTransform="uppercase"
          letterSpacing={1}
        >
          Weekly Training Schedule
        </Text>
      </YStack>

      {/* Days Grid */}
      <YStack p="$5" gap="$5">
        <XStack justify="space-between" px="$2">
          {DAYS.map((day, index) => (
            <DaySlot
              key={day.index}
              day={day}
              index={index}
              isSelected={selectedDays.has(day.index)}
              onToggle={() => onToggleDay(day.index)}
            />
          ))}
        </XStack>

        {/* Session Counter */}
        <YStack
          bg="$color2"
          rounded="$4"
          p="$4"
          items="center"
          gap="$2"
        >
          <XStack items="baseline" gap="$2">
            <Text
              fontSize={48}
              fontFamily="$heading"
              fontWeight="800"
              color={isInRecommendedRange ? '$primary' : '$color12'}
            >
              {count}
            </Text>
            <Text
              fontSize={18}
              fontFamily="$body"
              color="$color10"
            >
              {count === 1 ? 'session' : 'sessions'} / week
            </Text>
          </XStack>

          {/* Recommendation Hint */}
          <XStack
            items="center"
            gap="$2"
            opacity={0.8}
          >
            {isInRecommendedRange ? (
              <>
                <Circle size={8} bg="$intensityLow10" />
                <Text fontSize={13} color="$intensityLow11" fontFamily="$body">
                  Great choice! This is in our recommended range
                </Text>
              </>
            ) : count < RECOMMENDED_MIN ? (
              <>
                <Circle size={8} bg="$intensityMed10" />
                <Text fontSize={13} color="$intensityMed11" fontFamily="$body">
                  We recommend at least {RECOMMENDED_MIN} days for best results
                </Text>
              </>
            ) : (
              <>
                <Circle size={8} bg="$intensityMed10" />
                <Text fontSize={13} color="$intensityMed11" fontFamily="$body">
                  Make sure to include rest days for recovery
                </Text>
              </>
            )}
          </XStack>
        </YStack>
      </YStack>
    </Card>
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
          <IntakeProgressDots total={7} current={INTAKE_SCREENS.TRAINING_DAYS} />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$5">
          <DisplayHeading>TRAINING DAYS</DisplayHeading>
          <Subtitle>
            Tap the days you can commit{'\n'}to training each week
          </Subtitle>
        </YStack>

        {/* Whiteboard */}
        <WhiteboardCard
          selectedDays={selectedDays}
          onToggleDay={handleToggleDay}
        />

        {/* Spacer */}
        <YStack flex={1} />
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
