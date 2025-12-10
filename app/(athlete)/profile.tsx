import { YStack, XStack, H2, H3, Text, Card, Button, ScrollView, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import {
    User,
    Trophy,
    Target,
    Calendar,
    TrendingUp,
    Settings,
    ChevronRight,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

/**
 * Profile Tab
 * 
 * Shows:
 * - User info and skill level
 * - Progress stats
 * - Settings and sign out
 */
export default function ProfilePage() {
    const { user, isLoading: authLoading } = useAuth()

    // Get program state
    const programState = useQuery(
        api.userPrograms.getCurrentProgramState,
        user ? {} : "skip"
    )

    // Get progress summary
    const progress = useQuery(
        api.userPrograms.getProgressSummary,
        user ? {} : "skip"
    )

    // Get intake history
    const intakeHistory = useQuery(
        api.userPrograms.getIntakeHistory,
        user ? {} : "skip"
    )

    if (authLoading) {
        return (
            <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
                <Spinner size="large" color="$green10" />
                <Text color="$gray11">Loading profile...</Text>
            </YStack>
        )
    }

    if (!user) {
        return (
            <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
                <Text>Error loading profile</Text>
                <SignOutButton />
            </YStack>
        )
    }

    const latestIntake = intakeHistory?.[0]

    return (
        <YStack flex={1} bg="$background">
            <ScrollView flex={1}>
                <YStack
                    gap="$4"
                    px="$4"
                    pt="$6"
                    pb="$8"
                    maxW={800}
                    width="100%"
                    alignSelf="center"
                >
                    {/* Profile Header */}
                    <Card p="$5" bg="$green2" borderColor="$green7">
                        <XStack items="center" gap="$4">
                            <Card
                                width={64}
                                height={64}
                                borderRadius={32}
                                bg="$green9"
                                items="center"
                                justify="center"
                            >
                                <User size={32} color="white" />
                            </Card>
                            <YStack flex={1} gap="$1">
                                <H3>{user.name}</H3>
                                <Text color="$green11">{user.email}</Text>
                                {programState && (
                                    <XStack items="center" gap="$2" pt="$1">
                                        <Trophy size={16} color="$green10" />
                                        <Text fontSize="$3" color="$green10" fontWeight="500">
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
                            <Text fontSize="$5" fontWeight="600">Training Info</Text>

                            <Card p="$4" bg="$background" borderColor="$gray6" borderWidth={1}>
                                <YStack gap="$4">
                                    <XStack items="center" gap="$3">
                                        <Target size={20} color="$blue10" />
                                        <YStack flex={1}>
                                            <Text fontSize="$2" color="$gray10">Current Phase</Text>
                                            <Text fontSize="$4" fontWeight="500">
                                                {PHASE_NAMES[programState.phase as keyof typeof PHASE_NAMES]}
                                            </Text>
                                        </YStack>
                                    </XStack>

                                    <XStack items="center" gap="$3">
                                        <Calendar size={20} color="$purple10" />
                                        <YStack flex={1}>
                                            <Text fontSize="$2" color="$gray10">Position</Text>
                                            <Text fontSize="$4" fontWeight="500">
                                                Week {programState.week}, Day {programState.day}
                                            </Text>
                                        </YStack>
                                    </XStack>

                                    <XStack items="center" gap="$3">
                                        <TrendingUp size={20} color="$green10" />
                                        <YStack flex={1}>
                                            <Text fontSize="$2" color="$gray10">Skill Level</Text>
                                            <Text fontSize="$4" fontWeight="500">
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
                            <Text fontSize="$5" fontWeight="600">Progress Stats</Text>

                            <XStack gap="$3" flexWrap="wrap">
                                <Card flex={1} minWidth={100} p="$4" bg="$blue2" borderColor="$blue6">
                                    <YStack items="center" gap="$1">
                                        <Text fontSize="$6" fontWeight="700" color="$blue11">
                                            {progress.daysCompleted}
                                        </Text>
                                        <Text fontSize="$2" color="$blue10" textAlign="center">
                                            Days{'\n'}Completed
                                        </Text>
                                    </YStack>
                                </Card>

                                <Card flex={1} minWidth={100} p="$4" bg="$orange2" borderColor="$orange6">
                                    <YStack items="center" gap="$1">
                                        <Text fontSize="$6" fontWeight="700" color="$orange11">
                                            {progress.currentStreak}
                                        </Text>
                                        <Text fontSize="$2" color="$orange10" textAlign="center">
                                            Current{'\n'}Streak
                                        </Text>
                                    </YStack>
                                </Card>

                                <Card flex={1} minWidth={100} p="$4" bg="$purple2" borderColor="$purple6">
                                    <YStack items="center" gap="$1">
                                        <Text fontSize="$6" fontWeight="700" color="$purple11">
                                            {progress.uniqueExercisesPerformed}
                                        </Text>
                                        <Text fontSize="$2" color="$purple10" textAlign="center">
                                            Exercises{'\n'}Tried
                                        </Text>
                                    </YStack>
                                </Card>
                            </XStack>
                        </YStack>
                    )}

                    {/* Intake History */}
                    {latestIntake && (
                        <YStack gap="$3">
                            <Text fontSize="$5" fontWeight="600">Assessment</Text>

                            <Card p="$4" bg="$background" borderColor="$gray6" borderWidth={1}>
                                <YStack gap="$2">
                                    <XStack justify="space-between" items="center">
                                        <Text fontSize="$3" color="$gray10">Last Assessment</Text>
                                        <Text fontSize="$3" color="$gray11">
                                            {new Date(latestIntake.completedAt).toLocaleDateString()}
                                        </Text>
                                    </XStack>
                                    <XStack justify="space-between" items="center">
                                        <Text fontSize="$3" color="$gray10">Experience</Text>
                                        <Text fontSize="$3" color="$gray11">
                                            {latestIntake.yearsOfExperience} years
                                        </Text>
                                    </XStack>
                                    <XStack justify="space-between" items="center">
                                        <Text fontSize="$3" color="$gray10">Training Days</Text>
                                        <Text fontSize="$3" color="$gray11">
                                            {latestIntake.preferredTrainingDaysPerWeek} days/week
                                        </Text>
                                    </XStack>
                                </YStack>
                            </Card>
                        </YStack>
                    )}

                    {/* Settings Section */}
                    <YStack gap="$3">
                        <Text fontSize="$5" fontWeight="600">Settings</Text>

                        <Card
                            p="$4"
                            bg="$background"
                            borderColor="$gray6"
                            borderWidth={1}
                            pressStyle={{ opacity: 0.8 }}
                            onPress={() => {
                                // TODO: Navigate to settings
                                console.log('Settings pressed')
                            }}
                        >
                            <XStack items="center" gap="$3">
                                <Settings size={20} color="$gray10" />
                                <Text flex={1} fontSize="$4">App Settings</Text>
                                <ChevronRight size={20} color="$gray8" />
                            </XStack>
                        </Card>
                    </YStack>

                    {/* Sign Out */}
                    <YStack pt="$4">
                        <SignOutButton />
                    </YStack>
                </YStack>
            </ScrollView>
        </YStack>
    )
}

