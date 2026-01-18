import { useState, useMemo } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle, ScrollView } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Plane,
  Flag,
  ArrowRight,
} from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT } from '../../components/IntakeProgressDots'
import { getTrainingPhase } from '../../lib'

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

const PHASE_STYLES = {
  'Off-Season': {
    color: '$blue10',
    bgColor: '$blue3',
    label: 'Off-Season',
    description: 'Building your base',
  },
  'Pre-Season': {
    color: '$orange10',
    bgColor: '$orange3',
    label: 'Pre-Season',
    description: 'Sport-specific prep',
  },
  'In-Season Prep': {
    color: '$green10',
    bgColor: '$green3',
    label: 'In-Season Prep',
    description: 'Peak performance',
  },
} as const

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

function getDayPhaseColor(date: Date, today: Date): string {
  const weeks = getWeeksBetween(today, date)
  if (weeks <= 0) return '$color4' // Past
  if (weeks <= 4) return '$green4' // In-Season Prep
  if (weeks <= 8) return '$orange4' // Pre-Season
  return '$blue4' // Off-Season
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
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

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
              const phaseColor = getDayPhaseColor(date, today)

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
                      : isToday
                        ? '$color5'
                        : isOutsideMonth || isPast
                          ? 'transparent'
                          : (phaseColor as any)
                  }
                  borderWidth={isToday && !isSelected ? 2 : 0}
                  borderColor="$primary"
                  disabled={isPast || isOutsideMonth}
                  opacity={isOutsideMonth ? 0.3 : isPast ? 0.5 : 1}
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
                    fontWeight={isToday || isSelected ? '700' : '400'}
                    color={
                      isSelected
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
// FlightPath Component
// ─────────────────────────────────────────────────────────────────────────────

interface FlightPathProps {
  weeks: number
  phase: ReturnType<typeof getTrainingPhase>
}

const FlightPath = ({ weeks, phase }: FlightPathProps) => {
  const style = PHASE_STYLES[phase]

  return (
    <Card
      bg={style.bgColor}
      borderColor={style.color}
      borderWidth={1}
      rounded="$5"
      p="$4"
    >
      <XStack items="center" justify="space-between">
        {/* Today */}
        <YStack items="center" gap="$1">
          <Circle size={40} bg="$color5" borderWidth={2} borderColor="$primary">
            <Calendar size={20} color="$primary" />
          </Circle>
          <Text fontSize={12} fontFamily="$body" color="$color10">
            Today
          </Text>
        </YStack>

        {/* Flight Path */}
        <YStack flex={1} px="$3" items="center" gap="$1">
          <XStack items="center" gap="$2">
            <YStack flex={1} height={2} bg={style.color} opacity={0.3} />
            <Plane size={20} color={style.color} style={{ transform: [{ rotate: '45deg' }] }} />
            <YStack flex={1} height={2} bg={style.color} opacity={0.3} />
          </XStack>
          <XStack items="baseline" gap="$1">
            <Text
              fontSize={28}
              fontFamily="$heading"
              fontWeight="800"
              color={style.color}
            >
              {weeks}
            </Text>
            <Text fontSize={14} color="$color10" fontFamily="$body">
              weeks
            </Text>
          </XStack>
        </YStack>

        {/* Season Start */}
        <YStack items="center" gap="$1">
          <Circle size={40} bg={style.color}>
            <Flag size={20} color="white" />
          </Circle>
          <Text fontSize={12} fontFamily="$body" color="$color10">
            Season
          </Text>
        </YStack>
      </XStack>

      {/* Phase Badge */}
      <XStack mt="$3" items="center" justify="center" gap="$2">
        <Circle size={8} bg={style.color} />
        <Text fontSize={14} fontFamily="$body" fontWeight="600" color={style.color}>
          {style.label}
        </Text>
        <Text fontSize={13} color="$color10" fontFamily="$body">
          – {style.description}
        </Text>
      </XStack>
    </Card>
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
  const phase = getTrainingPhase(weeks)

  const handleSelectDate = (date: Date) => {
    Vibration.vibrate(10)
    setSelectedDate(date)
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    if (selectedDate) {
      // Navigate to onboarding personal-timeline screen
      router.push({
        pathname: '/(onboarding)/personal-timeline',
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

          {/* Phase Legend */}
          <XStack justify="center" gap="$4" mb="$4" flexWrap="wrap">
            <XStack items="center" gap="$1.5">
              <Circle size={10} bg="$blue4" />
              <Text fontSize={11} color="$color10" fontFamily="$body">Off-Season</Text>
            </XStack>
            <XStack items="center" gap="$1.5">
              <Circle size={10} bg="$orange4" />
              <Text fontSize={11} color="$color10" fontFamily="$body">Pre-Season</Text>
            </XStack>
            <XStack items="center" gap="$1.5">
              <Circle size={10} bg="$green4" />
              <Text fontSize={11} color="$color10" fontFamily="$body">In-Season</Text>
            </XStack>
          </XStack>
        </YStack>

        {/* Scrollable Calendar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            gap: 24,
          } as any}
        >
          {months.map((m) => (
            <CalendarMonth
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              today={today}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
            />
          ))}
        </ScrollView>

        {/* Flight Path Display */}
        <YStack px="$4" mt="$4" maxW={600} width="100%" self="center">
          {selectedDate ? (
            <FlightPath weeks={weeks} phase={phase} />
          ) : (
            <Card
              bg="$color3"
              rounded="$5"
              p="$5"
              items="center"
              gap="$2"
            >
              <Calendar size={32} color="$color9" />
              <Text color="$color10" fontFamily="$body" text="center">
                Select your season start date above
              </Text>
            </Card>
          )}
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
