import { useState, useMemo, useEffect, useRef } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Animated, Easing } from 'react-native'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import {
  ChevronRight,
  ChevronLeft,
  Calendar,
  Flag,
} from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import LottieView from 'lottie-react-native'
import { getSportInitials } from '../../lib'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'

// Sport Lottie mapping (same as sport.tsx)
const SPORT_LOTTIE: Record<string, any> = {
  'Soccer': require('../../assets/lottie/sports/soccer.json'),
}

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
// Sport Icon Component (for timeline)
// ─────────────────────────────────────────────────────────────────────────────

interface SportIconProps {
  name: string
  size?: number
}

const SportIcon = ({ name, size = 36 }: SportIconProps) => {
  const lottieSource = SPORT_LOTTIE[name]

  if (lottieSource) {
    return (
      <Circle
        size={size}
        bg="$brand3"
        overflow="hidden"
        items="center"
        justify="center"
        borderWidth={2}
        borderColor="$primary"
      >
        <LottieView
          source={lottieSource}
          autoPlay
          loop
          speed={0.8}
          style={{ width: size * 1.3, height: size * 1.3 }}
        />
      </Circle>
    )
  }

  // Fallback: initials
  const initials = getSportInitials(name)

  return (
    <Circle
      size={size}
      bg="$brand3"
      borderWidth={2}
      borderColor="$primary"
    >
      <Text
        fontSize={size / 2.5}
        fontFamily="$body"
        fontWeight="700"
        color="$primary"
      >
        {initials}
      </Text>
    </Circle>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WeeksDisplay Component (with count-up animation and sport icon)
// ─────────────────────────────────────────────────────────────────────────────

interface WeeksDisplayProps {
  weeks: number
  sportName?: string
}

const WeeksDisplay = ({ weeks, sportName }: WeeksDisplayProps) => {
  const [displayWeeks, setDisplayWeeks] = useState(0)
  const [lineWidth, setLineWidth] = useState(0)
  const [animationComplete, setAnimationComplete] = useState(false)
  const previousWeeksRef = useRef<number | null>(null)
  const slideAnim = useRef(new Animated.Value(0)).current

  // Use the same size as the flag circle so they align perfectly
  const FLAG_CIRCLE_SIZE = 44
  const SPORT_ICON_SIZE = 44

  // Count-up animation when weeks changes
  useEffect(() => {
    // Skip animation if weeks decreased or is the same
    if (previousWeeksRef.current !== null && weeks <= previousWeeksRef.current) {
      setDisplayWeeks(weeks)
      previousWeeksRef.current = weeks
      slideAnim.setValue(1) // Jump to end
      setAnimationComplete(true)
      return
    }

    previousWeeksRef.current = weeks
    setAnimationComplete(false)

    // Start from 0 and animate up
    setDisplayWeeks(0)
    slideAnim.setValue(0)

    const duration = 600 // ms
    const steps = Math.min(weeks, 30) // Cap steps for very long durations
    const stepDuration = duration / steps

    // Start the slide animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setAnimationComplete(true)
    })

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      // Ease-out: start fast, slow down at the end
      const progress = currentStep / steps
      const easedProgress = 1 - Math.pow(1 - progress, 3) // Cubic ease-out
      const newValue = Math.round(easedProgress * weeks)
      setDisplayWeeks(newValue)

      if (currentStep >= steps) {
        clearInterval(interval)
        setDisplayWeeks(weeks) // Ensure final value is exact
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [weeks, slideAnim])

  // Calculate the end position for the sport icon
  // The icon should end exactly where the flag circle is (at the right edge of the line)
  // lineWidth is the width of the middle section, and the flag is right after it
  // So the icon needs to travel: lineWidth (to reach the end) + offset to center on the flag
  const iconEndPosition = Math.max(0, lineWidth + (FLAG_CIRCLE_SIZE - SPORT_ICON_SIZE) / 2)

  return (
    <YStack px="$2">
      <XStack items="center" height={56}>
        {/* Today Circle */}
        <Circle size={44} bg="$color5" borderWidth={2} borderColor="$primary">
          <Calendar size={22} color="$primary" />
        </Circle>

        {/* Connected Line with Sport Icon moving along it */}
        <XStack
          flex={1}
          items="center"
          position="relative"
          height={56}
          onLayout={(e) => setLineWidth(e.nativeEvent.layout.width)}
        >
          {/* The connecting line */}
          <YStack
            position="absolute"
            left={0}
            right={0}
            top={26}
            height={4}
            bg="$primary"
            opacity={0.3}
            rounded="$2"
          />

          {/* Progress fill (animated) */}
          <Animated.View
            style={{
              position: 'absolute',
              left: 0,
              top: 26,
              height: 4,
              backgroundColor: '#2563EB', // $primary
              borderRadius: 4,
              width: '100%',
              transform: [{
                scaleX: slideAnim,
              }],
              transformOrigin: 'left',
            }}
          />

          {/* Sport icon sliding along the line - positioned to end exactly on the flag */}
          {sportName && lineWidth > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                left: 0,
                top: 6, // Vertically centered (56 - 44) / 2 = 6
                zIndex: 10, // Ensure it's above the flag
                transform: [{
                  translateX: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, iconEndPosition],
                  }),
                }],
              }}
            >
              <SportIcon name={sportName} size={SPORT_ICON_SIZE} />
            </Animated.View>
          )}

          {/* Weeks badge - centered on the line */}
          <YStack flex={1} items="center" pt="$1">
            <XStack
              bg="$background"
              px="$3"
              py="$1"
              rounded="$4"
              items="baseline"
              gap="$1"
              animation="quick"
              enterStyle={{ scale: 0.8, opacity: 0 }}
            >
              <Text
                fontSize={28}
                fontFamily="$heading"
                fontWeight="800"
                color="$primary"
                animation="quick"
              >
                {displayWeeks}
              </Text>
              <Text fontSize={14} color="$color10" fontFamily="$body">
                {displayWeeks === 1 ? 'week' : 'weeks'}
              </Text>
            </XStack>
          </YStack>
        </XStack>

        {/* Season End Circle - hide when sport icon covers it */}
        <Circle
          size={44}
          bg="$primary"
          opacity={sportName && animationComplete ? 0 : 1}
        >
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
  const { sportId, ageGroup, yearsOfExperience, trainingDays, selectedTrainingDays } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
    trainingDays: string
    selectedTrainingDays: string
  }>()

  // Query sport to get name for the icon
  const sport = useQuery(
    api.sports.getById,
    sportId ? { sportId: sportId as Id<"sports"> } : "skip"
  )

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
  if (!sportId || !ageGroup || !yearsOfExperience || !trainingDays || !selectedTrainingDays) {
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

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, ageGroup, yearsOfExperience, trainingDays, selectedTrainingDays },
      } as any)
    }
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
          selectedTrainingDays,
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
            <IntakeProgressDots
              total={COMBINED_FLOW_SCREEN_COUNT}
              current={COMBINED_FLOW_SCREENS.SEASON_TIMELINE}
              onNavigate={handleProgressNavigate}
            />
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
              <WeeksDisplay weeks={weeks} sportName={sport?.name} />
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
