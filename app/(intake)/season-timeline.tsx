import { useState, useMemo } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Flag,
} from '@tamagui/lucide-icons'
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

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getWeeksBetween(start: Date, end: Date): number {
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  return Math.ceil((end.getTime() - start.getTime()) / msPerWeek)
}

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Add padding for the first week
  const startPadding = firstDay.getDay()
  for (let i = startPadding - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push(d)
  }

  // Add all days of the month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i))
  }

  // Add padding for the last week
  const endPadding = 6 - lastDay.getDay()
  for (let i = 1; i <= endPadding; i++) {
    days.push(new Date(year, month + 1, i))
  }

  return days
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isDateInRange(date: Date, today: Date, selectedDate: Date | null): boolean {
  if (!selectedDate) return false
  const dateTime = date.getTime()
  const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const selectedTime = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime()
  return dateTime >= todayTime && dateTime <= selectedTime
}

// ─────────────────────────────────────────────────────────────────────────────
// CalendarMonth Component
// ─────────────────────────────────────────────────────────────────────────────

interface CalendarMonthProps {
  year: number
  month: number
  today: Date
  selectedDate: Date | null
  onSelectDate: (date: Date) => void
}

const CalendarMonth = ({
  year,
  month,
  today,
  selectedDate,
  onSelectDate,
}: CalendarMonthProps) => {
  const days = useMemo(() => getMonthDays(year, month), [year, month])

  return (
    <YStack gap="$2" minW={280}>
      {/* Month Header */}
      <Text
        fontSize={16}
        fontFamily="$body"
        fontWeight="700"
        color="$color12"
        mb="$1"
      >
        {MONTHS[month]} {year}
      </Text>

      {/* Day Labels */}
      <XStack justify="space-between" px="$1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <Text
            key={i}
            width={36}
            text="center"
            fontSize={11}
            fontFamily="$body"
            color="$color9"
          >
            {d}
          </Text>
        ))}
      </XStack>

      {/* Days Grid */}
      <YStack gap="$1">
        {Array.from({ length: Math.ceil(days.length / 7) }, (_, weekIdx) => (
          <XStack key={weekIdx} justify="space-between">
            {days.slice(weekIdx * 7, (weekIdx + 1) * 7).map((date, dayIdx) => {
              const isOutsideMonth = date.getMonth() !== month
              const isToday = isSameDay(date, today)
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isPast = date < today && !isToday
              const isInRange = isDateInRange(date, today, selectedDate)

              return (
                <Button
                  key={dayIdx}
                  size="$3"
                  width={36}
                  height={36}
                  circular
                  bg={
                    isSelected
                      ? '$primary'
                      : isInRange
                        ? '$primary'
                        : isToday
                          ? '$color5'
                          : 'transparent'
                  }
                  opacity={
                    isOutsideMonth
                      ? 0.3
                      : isPast
                        ? 0.5
                        : isInRange && !isSelected
                          ? 0.4
                          : 1
                  }
                  borderWidth={isToday && !isSelected && !isInRange ? 2 : 0}
                  borderColor="$primary"
                  disabled={isPast || isOutsideMonth}
                  pressStyle={{ scale: 0.95 }}
                  onPress={() => {
                    if (!isPast && !isOutsideMonth) {
                      onSelectDate(date)
                    }
                  }}
                >
                  <Text
                    fontSize={14}
                    fontFamily="$body"
                    fontWeight={isToday || isSelected || isInRange ? '700' : '400'}
                    color={
                      isSelected || isInRange
                        ? 'white'
                        : isToday
                          ? '$primary'
                          : isPast
                            ? '$color8'
                            : '$color12'
                    }
                  >
                    {date.getDate()}
                  </Text>
                </Button>
              )
            })}
          </XStack>
        ))}
      </YStack>
    </YStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WeeksDisplay Component (simplified, connected line with weeks on it)
// ─────────────────────────────────────────────────────────────────────────────

interface WeeksDisplayProps {
  weeks: number
}

const WeeksDisplay = ({ weeks }: WeeksDisplayProps) => {
  return (
    <YStack px="$2">
      <XStack items="center" height={50}>
        {/* Today Circle */}
        <Circle size={44} bg="$color5" borderWidth={2} borderColor="$primary">
          <Calendar size={22} color="$primary" />
        </Circle>

        {/* Connected Line with Weeks on it */}
        <XStack flex={1} items="center" position="relative">
          {/* The connecting line */}
          <YStack
            position="absolute"
            left={0}
            right={0}
            height={3}
            bg="$primary"
            opacity={0.4}
          />
          {/* Weeks badge on the line */}
          <YStack flex={1} items="center">
            <XStack
              bg="$background"
              px="$3"
              py="$1"
              rounded="$4"
              items="baseline"
              gap="$1"
            >
              <Text
                fontSize={24}
                fontFamily="$heading"
                fontWeight="800"
                color="$primary"
              >
                {weeks}
              </Text>
              <Text fontSize={14} color="$color10" fontFamily="$body">
                weeks
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Season End Circle */}
        <Circle size={44} bg="$primary">
          <Flag size={22} color="white" />
        </Circle>
      </XStack>

      {/* Labels below */}
      <XStack justify="space-between" mt="$2">
        <Text fontSize={13} fontFamily="$body" color="$color10" width={44} text="center">
          Today
        </Text>
        <Text fontSize={13} fontFamily="$body" color="$color10" width={44} text="center">
          Season
        </Text>
      </XStack>
    </YStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Season Timeline Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SeasonTimelineScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup, yearsOfExperience, trainingDays } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
    trainingDays: string
  }>()

  const today = useMemo(() => new Date(), [])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [currentMonthIndex, setCurrentMonthIndex] = useState(0)

  // Generate next 4 months for the calendar
  const months = useMemo((): { year: number; month: number }[] => {
    const result: { year: number; month: number }[] = []
    for (let i = 0; i < 4; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
      result.push({ year: date.getFullYear(), month: date.getMonth() })
    }
    return result
  }, [today])

  // Redirect if missing params
  if (!sportId || !ageGroup || !yearsOfExperience || !trainingDays) {
    router.replace('/(intake)/sport')
    return null
  }

  const weeks = selectedDate ? getWeeksBetween(today, selectedDate) : 0

  const handleSelectDate = (date: Date) => {
    Vibration.vibrate(10)
    setSelectedDate(date)
  }

  const handlePrevMonth = () => {
    if (currentMonthIndex > 0) {
      Vibration.vibrate(10)
      setCurrentMonthIndex(i => i - 1)
    }
  }

  const handleNextMonth = () => {
    if (currentMonthIndex < months.length - 1) {
      Vibration.vibrate(10)
      setCurrentMonthIndex(i => i + 1)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    if (selectedDate) {
      // Navigate directly to maxes screen (skip personal-timeline, merged into results)
      router.push({
        pathname: '/(intake)/maxes',
        params: {
          sportId,
          ageGroup,
          yearsOfExperience,
          trainingDays,
          weeksUntilSeason: weeks.toString(),
        },
      } as any)
    }
  }

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <YStack flex={1}>
        <YStack
          px="$4"
          pt={insets.top + 16}
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Progress Dots */}
          <YStack items="center" mb="$4">
            <IntakeProgressDots total={COMBINED_FLOW_SCREEN_COUNT} current={COMBINED_FLOW_SCREENS.SEASON_TIMELINE} />
          </YStack>

          {/* Header */}
          <YStack gap="$3" items="center" mb="$4">
            <DisplayHeading>SEASON START</DisplayHeading>
            <Subtitle>
              When does your competitive{'\n'}season begin?
            </Subtitle>
          </YStack>
        </YStack>

        {/* Single Month Calendar with Navigation */}
        <YStack flex={1} px="$4">
          <XStack items="center" gap="$3" width="100%">
            {/* Previous Month Button */}
            <Button
              circular
              size="$4"
              bg={currentMonthIndex === 0 ? '$color3' : '$color4'}
              disabled={currentMonthIndex === 0}
              opacity={currentMonthIndex === 0 ? 0.4 : 1}
              onPress={handlePrevMonth}
              pressStyle={{ scale: 0.95 }}
            >
              <ChevronLeft size={20} color={currentMonthIndex === 0 ? '$color8' : '$color11'} />
            </Button>

            {/* Calendar Month */}
            <YStack flex={1} items="center">
              <CalendarMonth
                year={months[currentMonthIndex].year}
                month={months[currentMonthIndex].month}
                today={today}
                selectedDate={selectedDate}
                onSelectDate={handleSelectDate}
              />
            </YStack>

            {/* Next Month Button */}
            <Button
              circular
              size="$4"
              bg={currentMonthIndex === months.length - 1 ? '$color3' : '$color4'}
              disabled={currentMonthIndex === months.length - 1}
              opacity={currentMonthIndex === months.length - 1 ? 0.4 : 1}
              onPress={handleNextMonth}
              pressStyle={{ scale: 0.95 }}
            >
              <ChevronRight size={20} color={currentMonthIndex === months.length - 1 ? '$color8' : '$color11'} />
            </Button>
          </XStack>

          {/* Month Indicator Dots */}
          <XStack gap="$2" mt="$3" justify="center">
            {months.map((_, i) => (
              <Circle
                key={i}
                size={8}
                bg={i === currentMonthIndex ? '$primary' : '$color6'}
                animation="quick"
              />
            ))}
          </XStack>

          {/* Weeks Display - directly below calendar */}
          <YStack mt="$5" maxW={600} width="100%">
            {selectedDate ? (
              <WeeksDisplay weeks={weeks} />
            ) : (
              <YStack items="center" gap="$2" py="$4">
                <Calendar size={28} color="$color9" />
                <Text color="$color10" fontFamily="$body" text="center" fontSize={14}>
                  Select your season start date above
                </Text>
              </YStack>
            )}
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
            bg={selectedDate ? '$primary' : '$color6'}
            color="white"
            disabled={!selectedDate}
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={selectedDate ? { opacity: 0.9, scale: 0.98 } : {}}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
