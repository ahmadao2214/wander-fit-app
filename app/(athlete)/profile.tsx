import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { OneRepMaxSheet } from '../../components/OneRepMaxSheet'
import { SentryDiagnosticsCard } from '../../components/SentryDiagnosticsCard'
import { ReplayExcludedSurface } from '../../components/ReplayExcludedSurface'
import { RatingFeedbackSheet, BugReportSheet, FeatureRequestSheet } from '../../components/feedback'
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
  Star,
  Bug,
  Sparkles,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'
import { experienceLabel, trainingDaysLabel } from '../../lib/profile'
import {
  Title,
  SectionTitle,
  Body,
  Supporting,
  Caption,
  numeric,
} from '../../components/Typography'

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
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

  // Feedback sheets (submit + toast only; no in-app history list)
  const [ratingSheetOpen, setRatingSheetOpen] = useState(false)
  const [bugSheetOpen, setBugSheetOpen] = useState(false)
  const [featureSheetOpen, setFeatureSheetOpen] = useState(false)

  const programState = useQuery(api.userPrograms.getCurrentProgramState, user ? {} : 'skip')

  const intakeHistory = useQuery(api.userPrograms.getIntakeHistory, user ? {} : 'skip')

  // Core lift exercises with user's maxes
  const coreLiftExercises = useQuery(api.userMaxes.getCoreLiftExercises, user ? {} : 'skip')

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primaryText" />
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
    <ReplayExcludedSurface>
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
            <Card p="$5" bg="$brand1" rounded="$5" borderWidth={0}>
              <XStack items="center" gap="$4">
                <YStack
                  width={64}
                  height={64}
                  rounded="$10"
                  bg="$primary"
                  items="center"
                  justify="center"
                >
                  <User size={32} color="white" />
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

                <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
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

                    {/* GPP Category */}
                    {programState.categoryName && (
                      <XStack items="center" gap="$3">
                        <Dumbbell size={20} color="$color9" />
                        <YStack flex={1}>
                          <Caption>GPP Category</Caption>
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
                        <Body fontWeight="600">
                          {PHASE_NAMES[programState.phase as keyof typeof PHASE_NAMES]}
                        </Body>
                      </YStack>
                    </XStack>

                    <XStack items="center" gap="$3">
                      <Calendar size={20} color="$color9" />
                      <YStack flex={1}>
                        <Caption>Position</Caption>
                        <Body fontWeight="600">
                          Week {programState.week}, Day {programState.day}
                        </Body>
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
                            <Body fontWeight="600">
                              {trainingDaysLabel(latestIntake.preferredTrainingDaysPerWeek)}
                            </Body>
                          </YStack>
                        </XStack>

                        <XStack items="center" gap="$3">
                          <TrendingUp size={20} color="$color9" />
                          <YStack flex={1}>
                            <Caption>Experience</Caption>
                            <Body fontWeight="600">
                              {experienceLabel(latestIntake.yearsOfExperience)}
                            </Body>
                          </YStack>
                        </XStack>

                        <XStack items="center" gap="$3">
                          <ClipboardCheck size={20} color="$color9" />
                          <YStack flex={1}>
                            <Caption>Last assessment</Caption>
                            <Body fontWeight="600" style={numeric}>
                              {new Date(latestIntake.completedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
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
                            bg={exercise.currentMax ? '$green3' : '$color4'}
                            items="center"
                            justify="center"
                          >
                            {exercise.currentMax ? (
                              <Check size={16} color="$green10" />
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
                  <YStack bg="$brand2" p="$2" rounded="$10">
                    <Lightbulb size={18} color="$primaryText" />
                  </YStack>
                  <YStack flex={1}>
                    <Body fontWeight="500">Training Science</Body>
                    <Supporting color="$color10">Understand your program</Supporting>
                  </YStack>
                  <ChevronRight size={20} color="$color9" />
                </XStack>
              </Card>
            </YStack>

            {/* Feedback & Support Section (submit + confirmation toast only) */}
            <YStack gap="$3">
              <SectionTitle>Feedback & support</SectionTitle>

              <Card
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                overflow="hidden"
              >
                <YStack>
                  <Card
                    testID="feedback-row-rate"
                    px="$4"
                    py="$3"
                    bg="$surface"
                    rounded={0}
                    pressStyle={{ bg: '$surfaceHover' }}
                    onPress={() => setRatingSheetOpen(true)}
                  >
                    <XStack items="center" gap="$3" minH={36}>
                      <YStack bg="$orange3" p="$2" rounded="$10">
                        <Star size={18} color="$orange10" />
                      </YStack>
                      <YStack flex={1}>
                        <Body fontWeight="500">Rate WanderFit</Body>
                        <Supporting color="$color10">Share a quick private rating</Supporting>
                      </YStack>
                      <ChevronRight size={20} color="$color9" />
                    </XStack>
                  </Card>

                  <Card
                    testID="feedback-row-bug"
                    px="$4"
                    py="$3"
                    bg="$surface"
                    rounded={0}
                    borderTopWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ bg: '$surfaceHover' }}
                    onPress={() => setBugSheetOpen(true)}
                  >
                    <XStack items="center" gap="$3" minH={36}>
                      <YStack bg="$red3" p="$2" rounded="$10">
                        <Bug size={18} color="$red10" />
                      </YStack>
                      <YStack flex={1}>
                        <Body fontWeight="500">Report a bug</Body>
                        <Supporting color="$color10">Flag something broken or off</Supporting>
                      </YStack>
                      <ChevronRight size={20} color="$color9" />
                    </XStack>
                  </Card>

                  <Card
                    testID="feedback-row-feature"
                    px="$4"
                    py="$3"
                    bg="$surface"
                    rounded={0}
                    borderTopWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ bg: '$surfaceHover' }}
                    onPress={() => setFeatureSheetOpen(true)}
                  >
                    <XStack items="center" gap="$3" minH={36}>
                      <YStack bg="$brand2" p="$2" rounded="$10">
                        <Sparkles size={18} color="$primaryText" />
                      </YStack>
                      <YStack flex={1}>
                        <Body fontWeight="500">Request a feature</Body>
                        <Supporting color="$color10">Suggest an improvement</Supporting>
                      </YStack>
                      <ChevronRight size={20} color="$color9" />
                    </XStack>
                  </Card>
                </YStack>
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
                testID="profile-app-settings"
                onPress={() => {
                  router.push('/(athlete)/settings')
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

              <SentryDiagnosticsCard />
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

        {/* Feedback Sheets (submit + confirmation toast only) */}
        {ratingSheetOpen ? (
          <RatingFeedbackSheet
            open={ratingSheetOpen}
            onOpenChange={setRatingSheetOpen}
            trigger="profile_manual"
            screenRoute="/(athlete)/profile"
            programContext={
              programState
                ? {
                    phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
                    week: programState.week,
                    day: programState.day,
                    skillLevel: programState.skillLevel,
                  }
                : undefined
            }
          />
        ) : null}

        {bugSheetOpen ? (
          <BugReportSheet
            open={bugSheetOpen}
            onOpenChange={setBugSheetOpen}
            source="profile"
            screenRoute="/(athlete)/profile"
            programContext={
              programState
                ? {
                    phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
                    week: programState.week,
                    day: programState.day,
                    skillLevel: programState.skillLevel,
                  }
                : undefined
            }
          />
        ) : null}

        {featureSheetOpen ? (
          <FeatureRequestSheet
            open={featureSheetOpen}
            onOpenChange={setFeatureSheetOpen}
            screenRoute="/(athlete)/profile"
            programContext={
              programState
                ? {
                    phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
                    week: programState.week,
                    day: programState.day,
                    skillLevel: programState.skillLevel,
                  }
                : undefined
            }
          />
        ) : null}
      </YStack>
    </ReplayExcludedSurface>
  )
}
