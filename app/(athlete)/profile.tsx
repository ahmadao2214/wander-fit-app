import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled } from 'tamagui'
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
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 24,
  letterSpacing: 0.5,
  color: '$color12',
})

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

const StatNumber = styled(Text, {
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: 24,
})

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

  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : "skip"
  )

  const progress = useQuery(
    api.userPrograms.getProgressSummary,
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
        <Spinner size="large" color="$primary" />
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
            bg="$brand1" 
            rounded="$5"
            borderWidth={0}
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
                <User size={32} color="white" />
              </YStack>
              <YStack flex={1} gap="$1">
                <DisplayHeading>{user.name?.toUpperCase()}</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  {user.email}
                </Text>
                {programState && (
                  <XStack items="center" gap="$2" pt="$1">
                    <Trophy size={14} color="$accent" />
                    <Text 
                      fontSize={13} 
                      color="$accent" 
                      fontFamily="$body" fontWeight="600"
                    >
                      {programState.skillLevel} Athlete
                    </Text>
                  </XStack>
                )}
              </YStack>
            </XStack>
          </Card>

          {/* Progress Stats */}
          {progress && (
            <YStack gap="$3">
              <SectionLabel>PROGRESS STATS</SectionLabel>

              <XStack gap="$3" flexWrap="wrap">
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {progress.daysCompleted}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Days{'\n'}Completed
                    </Text>
                  </YStack>
                </Card>

                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {progress.currentStreak}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Current{'\n'}Streak
                    </Text>
                  </YStack>
                </Card>

                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {progress.uniqueExercisesPerformed}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Exercises{'\n'}Tried
                    </Text>
                  </YStack>
                </Card>
              </XStack>
            </YStack>
          )}

          {/* Training Info */}
          {programState && (
            <YStack gap="$3">
              <SectionLabel>TRAINING INFO</SectionLabel>

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
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          Sport
                        </Text>
                        <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                          {programState.sportName}
                        </Text>
                      </YStack>
                    </XStack>
                  )}

                  {/* Training Category */}
                  {programState.categoryName && (
                    <XStack items="center" gap="$3">
                      <Dumbbell size={20} color="$color9" />
                      <YStack flex={1}>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          Training Focus
                        </Text>
                        <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                          {programState.categoryName}
                        </Text>
                      </YStack>
                    </XStack>
                  )}

                  <XStack items="center" gap="$3">
                    <Target size={20} color="$color9" />
                    <YStack flex={1}>
                      <Text fontSize={12} color="$color10" fontFamily="$body">
                        Current Phase
                      </Text>
                      <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                        {PHASE_NAMES[programState.phase as keyof typeof PHASE_NAMES]}
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack items="center" gap="$3">
                    <Calendar size={20} color="$color9" />
                    <YStack flex={1}>
                      <Text fontSize={12} color="$color10" fontFamily="$body">
                        Position
                      </Text>
                      <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                        Week {programState.week}, Day {programState.day}
                      </Text>
                    </YStack>
                  </XStack>

                  <XStack items="center" gap="$3">
                    <Trophy size={20} color="$color9" />
                    <YStack flex={1}>
                      <Text fontSize={12} color="$color10" fontFamily="$body">
                        Skill Level
                      </Text>
                      <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                        {programState.skillLevel}
                      </Text>
                    </YStack>
                  </XStack>
                </YStack>
              </Card>
            </YStack>
          )}

          {/* My Maxes */}
          {coreLiftExercises && coreLiftExercises.length > 0 && (
            <YStack gap="$3">
              <SectionLabel>MY MAXES</SectionLabel>

              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack gap="$3">
                  {coreLiftExercises.map((exercise, index) => (
                    <Card
                      key={exercise.slug}
                      p="$3"
                      bg="$background"
                      rounded="$3"
                      borderWidth={1}
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
                          <Text
                            fontSize={14}
                            fontFamily="$body"
                            fontWeight="600"
                            color="$color12"
                          >
                            {exercise.name}
                          </Text>
                          {exercise.currentMax ? (
                            <Text fontSize={12} fontFamily="$body" color="$color10">
                              {exercise.currentMax} lbs
                            </Text>
                          ) : (
                            <Text fontSize={12} fontFamily="$body" color="$color9">
                              Not set
                            </Text>
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

          {/* Assessment */}
          {latestIntake && (
            <YStack gap="$3">
              <SectionLabel>ASSESSMENT</SectionLabel>

              <XStack gap="$3" flexWrap="wrap">
                {/* Training Days */}
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {latestIntake.preferredTrainingDaysPerWeek}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Days{'\n'}Per Week
                    </Text>
                  </YStack>
                </Card>

                {/* Experience */}
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {latestIntake.yearsOfExperience}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Years{'\n'}Experience
                    </Text>
                  </YStack>
                </Card>

                {/* Last Assessment */}
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <Text
                      fontSize={14}
                      fontFamily="$body" fontWeight="700"
                      color="$color11"
                    >
                      {new Date(latestIntake.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Last{'\n'}Assessment
                    </Text>
                  </YStack>
                </Card>
              </XStack>
            </YStack>
          )}

          {/* Learn Section */}
          <YStack gap="$3">
            <SectionLabel>LEARN</SectionLabel>

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
                  <Lightbulb size={18} color="$primary" />
                </YStack>
                <YStack flex={1}>
                  <Text
                    fontSize={15}
                    fontFamily="$body" fontWeight="500"
                    color="$color12"
                  >
                    Training Science
                  </Text>
                  <Text
                    fontSize={12}
                    fontFamily="$body"
                    color="$color10"
                  >
                    Understand your program
                  </Text>
                </YStack>
                <ChevronRight size={20} color="$color9" />
              </XStack>
            </Card>
          </YStack>

          {/* Settings Section */}
          <YStack gap="$3">
            <SectionLabel>SETTINGS</SectionLabel>

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
                <Text
                  flex={1}
                  fontSize={15}
                  fontFamily="$body" fontWeight="500"
                  color="$color12"
                >
                  App Settings
                </Text>
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
