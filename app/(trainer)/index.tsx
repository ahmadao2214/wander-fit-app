import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { Plus, Users, Dumbbell, Clock, ChevronRight, UserPlus } from '@tamagui/lucide-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
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
  fontSize: 28,
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainerDashboard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const clients = useQuery(
    api.users.getTrainerClients,
    user ? { trainerId: user._id } : "skip"
  )

  const workoutStats = useQuery(
    api.workouts.getWorkoutStats,
    user ? {} : "skip"
  )

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading...
        </Text>
      </YStack>
    )
  }

  // Error state
  if (!user) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text fontFamily="$body">Error loading user data</Text>
        <SignOutButton />
      </YStack>
    )
  }

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
          {/* Header */}
          <XStack justify="space-between" items="center">
            <YStack gap="$1">
              <Text 
                color="$color10" 
                fontSize={14} 
                fontFamily="$body"
              >
                Welcome back
              </Text>
              <DisplayHeading>{user.name?.toUpperCase() || 'COACH'}</DisplayHeading>
            </YStack>
            <SignOutButton />
          </XStack>

          {/* Stats Cards */}
          <XStack gap="$3" flexWrap="wrap">
            {/* Active Athletes */}
            <Card 
              flex={1} 
              minWidth={100} 
              p="$4" 
              bg="$surface" 
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack items="center" gap="$2">
                <YStack bg="$brand2" p="$2" rounded="$10">
                  <Users size={20} color="$primary" />
                </YStack>
                <StatNumber color="$primary">
                  {clients?.length || 0}
                </StatNumber>
                <Text 
                  fontSize={11} 
                  color="$color10" 
                  text="center"
                  fontFamily="$body" fontWeight="500"
                >
                  Active{'\n'}Athletes
                </Text>
              </YStack>
            </Card>

            {/* Active Workouts */}
            <Card 
              flex={1} 
              minWidth={100} 
              p="$4" 
              bg="$surface" 
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack items="center" gap="$2">
                <YStack bg="$intensityLow2" p="$2" rounded="$10">
                  <Dumbbell size={20} color="$intensityLow6" />
                </YStack>
                <StatNumber color="$intensityLow6">
                  {workoutStats?.activeWorkouts || 0}
                </StatNumber>
                <Text 
                  fontSize={11} 
                  color="$color10" 
                  text="center"
                  fontFamily="$body" fontWeight="500"
                >
                  Active{'\n'}Workouts
                </Text>
              </YStack>
            </Card>

            {/* Total Minutes */}
            <Card 
              flex={1} 
              minWidth={100} 
              p="$4" 
              bg="$surface" 
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack items="center" gap="$2">
                <YStack bg="$catPowerLight" p="$2" rounded="$10">
                  <Clock size={20} color="$catPower" />
                </YStack>
                <StatNumber color="$catPower">
                  {workoutStats?.totalTrainingMinutes || 0}
                </StatNumber>
                <Text 
                  fontSize={11} 
                  color="$color10" 
                  text="center"
                  fontFamily="$body" fontWeight="500"
                >
                  Total{'\n'}Minutes
                </Text>
              </YStack>
            </Card>
          </XStack>

          {/* Athletes Section */}
          <YStack gap="$3">
            <XStack justify="space-between" items="center">
              <SectionLabel>YOUR ATHLETES</SectionLabel>
              <Button
                size="$3"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                icon={Plus}
                fontFamily="$body" fontWeight="600"
                color="$color11"
                rounded="$3"
                pressStyle={{ bg: '$surfaceHover' }}
                onPress={() => router.push('/(trainer)/add-athlete')}
              >
                Add
              </Button>
            </XStack>

            {clients && clients.length > 0 ? (
              <YStack gap="$2">
                {clients.map((client) => (
                  <Card 
                    key={client._id} 
                    p="$4" 
                    bg="$surface"
                    rounded="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                    pressStyle={{ scale: 0.98, bg: '$surfaceHover' }}
                    onPress={() => {
                      console.log('View client:', client._id)
                    }}
                  >
                    <XStack justify="space-between" items="center">
                      <XStack items="center" gap="$3">
                        <YStack 
                          width={40} 
                          height={40} 
                          rounded="$5"
                          bg="$brand2"
                          items="center"
                          justify="center"
                        >
                          <Text 
                            fontFamily="$body" fontWeight="700" 
                            color="$primary"
                            fontSize={16}
                          >
                            {client.name?.charAt(0)?.toUpperCase() || '?'}
                          </Text>
                        </YStack>
                        <YStack gap="$0.5">
                          <Text 
                            fontFamily="$body" fontWeight="600"
                            color="$color12"
                            fontSize={15}
                          >
                            {client.name}
                          </Text>
                          <Text 
                            fontSize={13} 
                            color="$color10"
                            fontFamily="$body"
                          >
                            {client.email}
                          </Text>
                        </YStack>
                      </XStack>
                      <ChevronRight size={20} color="$color9" />
                    </XStack>
                  </Card>
                ))}
              </YStack>
            ) : (
              <Card 
                p="$6" 
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack items="center" gap="$4">
                  <YStack bg="$brand2" p="$4" rounded="$10">
                    <UserPlus size={32} color="$primary" />
                  </YStack>
                  <YStack items="center" gap="$1">
                    <Text 
                      fontFamily="$body" fontWeight="600"
                      color="$color12"
                      fontSize={16}
                    >
                      No Athletes Yet
                    </Text>
                    <Text 
                      text="center" 
                      color="$color10"
                      fontFamily="$body"
                      fontSize={14}
                    >
                      Add your first athlete to start building their training program.
                    </Text>
                  </YStack>
                  <Button
                    size="$4"
                    bg="$primary"
                    color="white"
                    icon={Plus}
                    fontFamily="$body" fontWeight="700"
                    rounded="$4"
                    pressStyle={{ opacity: 0.9, scale: 0.98 }}
                    onPress={() => router.push('/(trainer)/add-athlete')}
                  >
                    Add Your First Athlete
                  </Button>
                </YStack>
              </Card>
            )}
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
