import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, Theme } from 'tamagui'
import { useSportScheme } from '../../hooks/useSportScheme'
import { useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { OneRepMaxSheet } from '../../components/OneRepMaxSheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  User,
  Trophy,
  Target,
  Calendar,
  Settings,
  ChevronRight,
  Dumbbell,
  Check,
  Lightbulb,
  LogOut,
  Award,
  Clock,
  CalendarDays,
  TrendingUp,
  ClipboardCheck,
} from '@tamagui/lucide-icons'
import { phaseWord } from '../../lib/sportScreen'
import { experienceLabel, trainingDaysLabel } from '../../lib/profile'
import { Title, SectionTitle, Body, Supporting, Caption, numeric } from '../../components/Typography'

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function ProfilePageContent() {
  const { user, isLoading: authLoading } = useAuth()
  const insets = useSafeAreaInsets()
  const router = useRouter()

  // Sheet state for editing 1RM
  const [maxSheetOpen, setMaxSheetOpen] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<{
    _id: string
    name: string
    slug: string
    currentMax: number | null
  } | null>(null)

  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : "skip"
  )

  const intakeHistory = useQuery(
    api.userPrograms.getIntakeHistory,
    user ? {} : "skip"
  )


  // Core lift exercises with user's maxes
  const coreLiftExercises = useQuery(
    api.userMaxes.getCoreLiftExercises,
    user ? {} : "skip"
  )

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$color" />
        <Text color="$color10" fontFamily="$body">
          Loading profile...
        </Text>
      </YStack>
    )
  }

  if (!user) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text fontFamily="$body">Error loading profile</Text>
        <SignOutButton />
      </YStack>
    )
  }

  const latestIntake = intakeHistory?.[0]

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          gap="$5"
          px="$4"
          pt={insets.top + 16}
          pb={insets.bottom + 100}
          maxW={800}
          width="100%"
          self="center"
        >
          {/* Profile Header */}
          <Card
            p="$5"
            bg="$background"
            rounded="$5"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <XStack items="center" gap="$4">
              <YStack
                width={64}
                height={64}
                rounded="$10"
                bg="$primary"
                items="center"
                justify="center"
              >
                <User size={32} color="$background" />
              </YStack>
              <YStack flex={1} gap="$1">
                <Title>{user.name}</Title>
                <Supporting color="$color10">{user.email}</Supporting>
                {programState && (
                  <XStack items="center" gap="$2" pt="$1">
                    <Trophy size={14} color="$orange10" />
                    <Supporting color="$orange11" fontWeight="600">
                      {programState.skillLevel} Athlete
                    </Supporting>
                  </XStack>
                )}
              </YStack>
            </XStack>
          </Card>

          {/* Training Info */}
          {programState && (
            <YStack gap="$3">
              <SectionTitle>Training info</SectionTitle>

              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack gap="$4">
                  {/* Sport */}
                  {programState.sportName && (
                    <XStack items="center" gap="$3">
                      <Award size={20} color="$color9" />
                      <YStack flex={1}>
                        <Caption>Sport</Caption>
                        <Body fontWeight="600">{programState.sportName}</Body>
                      </YStack>
                    </XStack>
                  )}

                  {/* Training category */}
                  {programState.categoryName && (
                    <XStack items="center" gap="$3">
                      <Dumbbell size={20} color="$color9" />
                      <YStack flex={1}>
                        <Caption>Category</Caption>
                        <Body fontWeight="600">{programState.categoryName}</Body>
                      </YStack>
                    </XStack>
                  )}

                  {/* Program Duration */}
                  {programState.totalProgramWeeks && (
                    <XStack items="center" gap="$3">
                      <Clock size={20} color="$color9" />
                      <YStack flex={1}>
                        <Caption>Program duration</Caption>
                        <Body fontWeight="600">{programState.totalProgramWeeks} weeks</Body>
                      </YStack>
                    </XStack>
                  )}

                  <XStack items="center" gap="$3">
                    <Target size={20} color="$color9" />
                    <YStack flex={1}>
                      <Caption>Current phase</Caption>
                      <Body fontWeight="600">{phaseWord(programState.phase)}</Body>
                    </YStack>
                  </XStack>

                  <XStack items="center" gap="$3">
                    <Calendar size={20} color="$color9" />
                    <YStack flex={1}>
                      <Caption>Position</Caption>
                      <Body fontWeight="600">Week {programState.week}, Day {programState.day}</Body>
                    </YStack>
                  </XStack>

                  <XStack items="center" gap="$3">
                    <Trophy size={20} color="$color9" />
                    <YStack flex={1}>
                      <Caption>Skill level</Caption>
                      <Body fontWeight="600">{programState.skillLevel}</Body>
                    </YStack>
                  </XStack>

                  {/* Baseline from the latest assessment, as words, not stat tiles */}
                  {latestIntake && (
                    <>
                      <XStack items="center" gap="$3">
                        <CalendarDays size={20} color="$color9" />
                        <YStack flex={1}>
                          <Caption>Training days</Caption>
                          <Body fontWeight="600">{trainingDaysLabel(latestIntake.preferredTrainingDaysPerWeek)}</Body>
                        </YStack>
                      </XStack>

                      <XStack items="center" gap="$3">
                        <TrendingUp size={20} color="$color9" />
                        <YStack flex={1}>
                          <Caption>Experience</Caption>
                          <Body fontWeight="600">{experienceLabel(latestIntake.yearsOfExperience)}</Body>
                        </YStack>
                      </XStack>

                      <XStack items="center" gap="$3">
                        <ClipboardCheck size={20} color="$color9" />
                        <YStack flex={1}>
                          <Caption>Last assessment</Caption>
                          <Body fontWeight="600" style={numeric}>
                            {new Date(latestIntake.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Body>
                        </YStack>
                      </XStack>
                    </>
                  )}
                </YStack>
              </Card>
            </YStack>
          )}

          {/* My Maxes */}
          {coreLiftExercises && coreLiftExercises.length > 0 && (
            <YStack gap="$3">
              <SectionTitle>My maxes</SectionTitle>

              {/* One card with divided rows, not a bordered card inside a bordered card */}
              <Card
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                overflow="hidden"
              >
                <YStack>
                  {coreLiftExercises.map((exercise, index) => (
                    <Card
                      key={exercise.slug}
                      testID={`max-row-${exercise.slug}`}
                      px="$4"
                      py="$3"
                      bg="$surface"
                      rounded={0}
                      borderTopWidth={index === 0 ? 0 : 1}
                      borderColor="$borderColor"
                      pressStyle={{ bg: '$surfaceHover' }}
                      onPress={() => {
                        setSelectedExercise({
                          _id: exercise._id,
                          name: exercise.name,
                          slug: exercise.slug,
                          currentMax: exercise.currentMax,
                        })
                        setMaxSheetOpen(true)
                      }}
                    >
                      <XStack items="center" gap="$3">
                        <YStack
                          width={32}
                          height={32}
                          rounded="$10"
                          bg={exercise.currentMax ? '$color3' : '$color4'}
                          items="center"
                          justify="center"
                        >
                          {exercise.currentMax ? (
                            <Check size={16} color="$color" />
                          ) : (
                            <Dumbbell size={16} color="$color9" />
                          )}
                        </YStack>
                        <YStack flex={1}>
                          <Body fontWeight="600">{exercise.name}</Body>
                          {exercise.currentMax ? (
                            <Supporting color="$color10" style={numeric}>
                              {exercise.currentMax} lbs
                            </Supporting>
                          ) : (
                            <Supporting color="$color10">Not set</Supporting>
                          )}
                        </YStack>
                        <ChevronRight size={18} color="$color9" />
                      </XStack>
                    </Card>
                  ))}
                </YStack>
              </Card>
            </YStack>
          )}

          {/* Learn Section */}
          <YStack gap="$3">
            <SectionTitle>Learn</SectionTitle>

            {/* Training Science */}
            <Card
              p="$4"
              bg="$surface"
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
              pressStyle={{ bg: '$surfaceHover' }}
              onPress={() => {
                router.push('/(athlete)/training-science' as any)
              }}
            >
              <XStack items="center" gap="$3">
                <YStack borderWidth={1} borderColor="$color" p="$2" rounded="$10">
                  <Lightbulb size={18} color="$color" />
                </YStack>
                <YStack flex={1}>
                  <Body fontWeight="500">Training Science</Body>
                  <Supporting color="$color10">Understand your program</Supporting>
                </YStack>
                <ChevronRight size={20} color="$color9" />
              </XStack>
            </Card>
          </YStack>

          {/* Settings Section */}
          <YStack gap="$3">
            <SectionTitle>Settings</SectionTitle>

            <Card
              p="$4"
              bg="$surface"
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
              pressStyle={{ bg: '$surfaceHover' }}
              onPress={() => {
                console.log('Settings pressed')
              }}
            >
              <XStack items="center" gap="$3">
                <YStack bg="$color4" p="$2" rounded="$10">
                  <Settings size={18} color="$color10" />
                </YStack>
                <Body flex={1} fontWeight="500">
                  App settings
                </Body>
                <ChevronRight size={20} color="$color9" />
              </XStack>
            </Card>
          </YStack>

          {/* Sign Out */}
          <YStack pt="$2">
            <SignOutButton />
          </YStack>
        </YStack>
      </ScrollView>

      {/* 1RM Edit Sheet */}
      {selectedExercise && (
        <OneRepMaxSheet
          open={maxSheetOpen}
          onOpenChange={setMaxSheetOpen}
          mode="single"
          exercise={selectedExercise}
          onComplete={() => setSelectedExercise(null)}
        />
      )}
    </YStack>
  )
}

/** On the basketball sport theme (issue #209): dark → chalkboard, light → whiteboard. */
export default function ProfilePage() {
  const scheme = useSportScheme()
  return (
    <Theme name={scheme}>
      <ProfilePageContent />
    </Theme>
  )
}
