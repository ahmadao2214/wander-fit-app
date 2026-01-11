import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import {
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  Target,
  Calendar as CalendarIcon,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Workout {
  templateId: string
  day: number
  focus: string
  isCompleted: boolean
  isOverridden: boolean
  isRestDay: boolean
}

interface AthleteSchedule {
  athleteId: string
  athleteName: string
  hasProgram: boolean
  currentPhase?: string
  currentWeek?: number
  currentDay?: number
  skillLevel?: string
  primarySport?: string
  workouts: Workout[]
}

interface FamilyCalendarProps {
  athletes: AthleteSchedule[]
  weekStart: number
  weekOffset: number
  onWeekChange: (offset: number) => void
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DayLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 12,
  color: '$color10',
  textTransform: 'uppercase',
})

const WorkoutCell = styled(YStack, {
  minHeight: 50,
  p: '$2',
  rounded: '$3',
  gap: '$1',

  variants: {
    status: {
      completed: {
        bg: '$green2',
        borderWidth: 1,
        borderColor: '$green6',
      },
      today: {
        bg: '$brand2',
        borderWidth: 2,
        borderColor: '$primary',
      },
      upcoming: {
        bg: '$surface',
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      rest: {
        bg: '$color3',
        borderWidth: 1,
        borderColor: '$color5',
      },
    },
  } as const,
})

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates(weekStart: number): Date[] {
  const dates: Date[] = []
  const start = new Date(weekStart)
  for (let i = 0; i < 7; i++) {
    const date = new Date(start)
    date.setDate(start.getDate() + i)
    dates.push(date)
  }
  return dates
}

function formatWeekRange(weekStart: number): string {
  const start = new Date(weekStart)
  const end = new Date(weekStart)
  end.setDate(start.getDate() + 6)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} - ${end.getDate()}`
  }
  return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}`
}

function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function FamilyCalendar({
  athletes,
  weekStart,
  weekOffset,
  onWeekChange,
}: FamilyCalendarProps) {
  const router = useRouter()
  const weekDates = getWeekDates(weekStart)
  const today = new Date()
  const todayDayOfWeek = today.getDay()

  return (
    <YStack gap="$4" flex={1}>
      {/* Week Navigation */}
      <Card p="$3" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
        <XStack items="center" justify="space-between">
          <Button
            size="$3"
            bg="transparent"
            icon={ChevronLeft}
            onPress={() => onWeekChange(weekOffset - 1)}
            circular
          />
          <YStack items="center" gap="$1">
            <Text fontSize={16} fontFamily="$body" fontWeight="600" color="$color12">
              {formatWeekRange(weekStart)}
            </Text>
            {weekOffset === 0 && (
              <Text fontSize={12} fontFamily="$body" color="$primary">
                This Week
              </Text>
            )}
            {weekOffset === 1 && (
              <Text fontSize={12} fontFamily="$body" color="$color10">
                Next Week
              </Text>
            )}
            {weekOffset === -1 && (
              <Text fontSize={12} fontFamily="$body" color="$color10">
                Last Week
              </Text>
            )}
          </YStack>
          <Button
            size="$3"
            bg="transparent"
            icon={ChevronRight}
            onPress={() => onWeekChange(weekOffset + 1)}
            circular
          />
        </XStack>
      </Card>

      {/* Day Headers */}
      <XStack gap="$2" px="$1">
        {weekDates.map((date, index) => (
          <YStack key={index} flex={1} items="center" gap="$1">
            <DayLabel color={isToday(date) ? '$primary' : '$color10'}>
              {DAY_NAMES[index]}
            </DayLabel>
            <Text
              fontSize={14}
              fontFamily="$body"
              fontWeight={isToday(date) ? '700' : '400'}
              color={isToday(date) ? '$primary' : '$color11'}
            >
              {date.getDate()}
            </Text>
          </YStack>
        ))}
      </XStack>

      {/* Athlete Rows */}
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack gap="$4">
          {athletes.map((athlete) => (
            <Card
              key={athlete.athleteId}
              p="$3"
              bg="$surface"
              borderColor="$borderColor"
              borderWidth={1}
              rounded="$4"
            >
              {/* Athlete Header */}
              <XStack items="center" gap="$2" mb="$3">
                <YStack bg="$brand2" p="$2" rounded="$10">
                  <User size={16} color="$primary" />
                </YStack>
                <YStack flex={1}>
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                    {athlete.athleteName}
                  </Text>
                  {athlete.hasProgram ? (
                    <Text fontSize={11} fontFamily="$body" color="$color10">
                      {PHASE_NAMES[athlete.currentPhase as keyof typeof PHASE_NAMES]} Week{' '}
                      {athlete.currentWeek}
                      {athlete.primarySport && ` - ${athlete.primarySport}`}
                    </Text>
                  ) : (
                    <Text fontSize={11} fontFamily="$body" color="$yellow10">
                      Needs Setup
                    </Text>
                  )}
                </YStack>
                <Button
                  size="$2"
                  bg="$color4"
                  onPress={() => router.push(`/(parent)/athletes/${athlete.athleteId}`)}
                >
                  <Text fontSize={12} fontFamily="$body" color="$color11">
                    View
                  </Text>
                </Button>
              </XStack>

              {/* Workout Grid */}
              {athlete.hasProgram ? (
                <XStack gap="$2">
                  {weekDates.map((date, dayIndex) => {
                    // Find workout for this day of week (1-7 mapping)
                    const workout = athlete.workouts.find((w) => w.day === dayIndex + 1)
                    const isTodayCell = isToday(date) && weekOffset === 0

                    if (!workout) {
                      // Rest day
                      return (
                        <WorkoutCell key={dayIndex} flex={1} status="rest">
                          <Text fontSize={10} fontFamily="$body" color="$color9" text="center">
                            Rest
                          </Text>
                        </WorkoutCell>
                      )
                    }

                    const status = workout.isCompleted
                      ? 'completed'
                      : isTodayCell
                        ? 'today'
                        : 'upcoming'

                    return (
                      <WorkoutCell
                        key={dayIndex}
                        flex={1}
                        status={status}
                        pressStyle={{ opacity: 0.8 }}
                        onPress={() =>
                          router.push(`/(parent)/athletes/${athlete.athleteId}/program`)
                        }
                      >
                        {workout.isCompleted && (
                          <Check size={12} color="$green10" alignSelf="center" />
                        )}
                        <Text
                          fontSize={10}
                          fontFamily="$body"
                          fontWeight="500"
                          color={
                            status === 'completed'
                              ? '$green10'
                              : status === 'today'
                                ? '$primary'
                                : '$color11'
                          }
                          text="center"
                          numberOfLines={2}
                        >
                          {workout.focus}
                        </Text>
                        {workout.isOverridden && (
                          <XStack items="center" justify="center" gap="$1">
                            <Target size={8} color="$yellow10" />
                          </XStack>
                        )}
                      </WorkoutCell>
                    )
                  })}
                </XStack>
              ) : (
                <Card
                  p="$3"
                  bg="$yellow2"
                  borderColor="$yellow6"
                  borderWidth={1}
                  rounded="$3"
                >
                  <Text fontSize={12} fontFamily="$body" color="$yellow11" text="center">
                    This athlete needs to complete their intake assessment
                  </Text>
                </Card>
              )}
            </Card>
          ))}

          {athletes.length === 0 && (
            <Card p="$5" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
              <YStack gap="$3" items="center">
                <YStack bg="$color4" p="$3" rounded="$10">
                  <CalendarIcon size={24} color="$color10" />
                </YStack>
                <Text fontSize={14} fontFamily="$body" color="$color10" text="center">
                  No athletes linked yet. Add an athlete to see their training schedule here.
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
