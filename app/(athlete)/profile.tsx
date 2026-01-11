import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled, AlertDialog } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import {
  User,
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  Settings,
  ChevronRight,
  UserPlus,
  UserMinus,
  Users,
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
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)
  const [isUnlinking, setIsUnlinking] = useState(false)

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

  // Trainer relationship queries
  const trainerRelationship = useQuery(
    api.trainerRelationships.getAthleteTrainer,
    user ? { athleteUserId: user._id } : "skip"
  )

  const removeRelationship = useMutation(api.trainerRelationships.removeRelationship)

  const handleUnlinkTrainer = async () => {
    if (!user || !trainerRelationship) return

    setIsUnlinking(true)
    try {
      await removeRelationship({
        relationshipId: trainerRelationship.relationshipId,
        requestingUserId: user._id,
      })
      setShowUnlinkDialog(false)
    } catch (err) {
      console.error('Error unlinking trainer:', err)
    } finally {
      setIsUnlinking(false)
    }
  }

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
                  <XStack items="center" gap="$3">
                    <YStack bg="$brand2" p="$2" rounded="$10">
                      <Target size={18} color="$primary" />
                    </YStack>
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
                    <YStack bg="$catPowerLight" p="$2" rounded="$10">
                      <Calendar size={18} color="$catPower" />
                    </YStack>
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
                    <YStack bg="$intensityLow2" p="$2" rounded="$10">
                      <TrendingUp size={18} color="$intensityLow6" />
                    </YStack>
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
                    <StatNumber color="$accent">
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
                    <StatNumber color="$catPower">
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

          {/* Assessment History */}
          {latestIntake && (
            <YStack gap="$3">
              <SectionLabel>ASSESSMENT</SectionLabel>

              <Card 
                p="$4" 
                bg="$surface" 
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack gap="$3">
                  <XStack justify="space-between" items="center">
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      Last Assessment
                    </Text>
                    <Text fontSize={13} color="$color11" fontFamily="$body" fontWeight="500">
                      {new Date(latestIntake.completedAt).toLocaleDateString()}
                    </Text>
                  </XStack>
                  <XStack justify="space-between" items="center">
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      Experience
                    </Text>
                    <Text fontSize={13} color="$color11" fontFamily="$body" fontWeight="500">
                      {latestIntake.yearsOfExperience} years
                    </Text>
                  </XStack>
                  <XStack justify="space-between" items="center">
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      Training Days
                    </Text>
                    <Text fontSize={13} color="$color11" fontFamily="$body" fontWeight="500">
                      {latestIntake.preferredTrainingDaysPerWeek} days/week
                    </Text>
                  </XStack>
                </YStack>
              </Card>
            </YStack>
          )}

          {/* Trainer Section */}
          <YStack gap="$3">
            <SectionLabel>MY TRAINER</SectionLabel>

            {trainerRelationship ? (
              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack gap="$4">
                  <XStack items="center" gap="$3">
                    <YStack
                      width={48}
                      height={48}
                      rounded="$10"
                      bg="$brand2"
                      items="center"
                      justify="center"
                    >
                      <Users size={24} color="$primary" />
                    </YStack>
                    <YStack flex={1} gap="$0.5">
                      <Text
                        fontFamily="$body"
                        fontWeight="600"
                        color="$color12"
                        fontSize={16}
                      >
                        {trainerRelationship.trainerName}
                      </Text>
                      <Text
                        fontSize={13}
                        color="$color10"
                        fontFamily="$body"
                      >
                        {trainerRelationship.trainerEmail}
                      </Text>
                      <Text
                        fontSize={11}
                        color="$color9"
                        fontFamily="$body"
                      >
                        Linked {new Date(trainerRelationship.linkedAt).toLocaleDateString()}
                      </Text>
                    </YStack>
                  </XStack>
                  <Button
                    size="$3"
                    bg="$red3"
                    color="$red11"
                    fontFamily="$body"
                    fontWeight="600"
                    rounded="$3"
                    icon={UserMinus}
                    onPress={() => setShowUnlinkDialog(true)}
                  >
                    Unlink Trainer
                  </Button>
                </YStack>
              </Card>
            ) : (
              <Card
                p="$5"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack items="center" gap="$4">
                  <YStack bg="$brand2" p="$3" rounded="$10">
                    <UserPlus size={24} color="$primary" />
                  </YStack>
                  <YStack items="center" gap="$1">
                    <Text
                      fontFamily="$body"
                      fontWeight="600"
                      color="$color12"
                      fontSize={15}
                    >
                      No Trainer Linked
                    </Text>
                    <Text
                      text="center"
                      color="$color10"
                      fontFamily="$body"
                      fontSize={13}
                    >
                      Link with a trainer to get personalized workout guidance
                    </Text>
                  </YStack>
                  <Button
                    size="$4"
                    bg="$primary"
                    color="white"
                    icon={UserPlus}
                    fontFamily="$body"
                    fontWeight="700"
                    rounded="$4"
                    pressStyle={{ opacity: 0.9, scale: 0.98 }}
                    onPress={() => router.push('/(athlete)/accept-trainer-invite')}
                  >
                    Enter Invite Code
                  </Button>
                </YStack>
              </Card>
            )}
          </YStack>

          {/* Unlink Confirmation Dialog */}
          <AlertDialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
            <AlertDialog.Portal>
              <AlertDialog.Overlay
                key="overlay"
                animation="quick"
                opacity={0.5}
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
              <AlertDialog.Content
                bordered
                elevate
                key="content"
                animation={[
                  'quick',
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
                enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
                exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
                x={0}
                scale={1}
                opacity={1}
                y={0}
                p="$5"
                bg="$background"
                rounded="$5"
                maxWidth={400}
                mx="$4"
              >
                <YStack gap="$4">
                  <AlertDialog.Title fontFamily="$body" fontWeight="700" fontSize={18}>
                    Unlink Trainer?
                  </AlertDialog.Title>
                  <AlertDialog.Description fontFamily="$body" color="$color10" fontSize={14}>
                    Are you sure you want to unlink from {trainerRelationship?.trainerName}?
                    They will no longer be able to view your progress or modify your workouts.
                  </AlertDialog.Description>
                  <XStack gap="$3" justifyContent="flex-end">
                    <AlertDialog.Cancel asChild>
                      <Button
                        bg="$surface"
                        borderWidth={1}
                        borderColor="$borderColor"
                        fontFamily="$body"
                        fontWeight="600"
                        color="$color11"
                      >
                        Cancel
                      </Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <Button
                        bg="$red9"
                        color="white"
                        fontFamily="$body"
                        fontWeight="700"
                        onPress={handleUnlinkTrainer}
                        disabled={isUnlinking}
                        icon={isUnlinking ? Spinner : undefined}
                      >
                        {isUnlinking ? 'Unlinking...' : 'Unlink'}
                      </Button>
                    </AlertDialog.Action>
                  </XStack>
                </YStack>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog>

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
    </YStack>
  )
}
