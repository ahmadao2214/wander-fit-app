import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, Circle, styled } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Id } from '../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  User,
  Trophy,
  Target,
  Calendar,
  TrendingUp,
  ChevronRight,
  Unlink,
  BookOpen,
  Star,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../../types'

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

export default function AthleteDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // Get athlete details
  const athlete = useQuery(
    api.parentRelationships.getAthleteDetails,
    id ? { athleteId: id as Id<"users"> } : "skip"
  )

  // Unlink mutation
  const unlinkRelationship = useMutation(api.parentRelationships.unlinkRelationship)

  const handleUnlink = async () => {
    if (!athlete?.relationship?._id) return

    try {
      await unlinkRelationship({
        relationshipId: athlete.relationship._id as any,
      })
      router.back()
    } catch (err) {
      console.error('Failed to unlink:', err)
    }
  }

  // Loading state
  if (athlete === undefined) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
          <Spinner size="large" color="$primary" />
          <Text color="$color10" fontFamily="$body">Loading athlete...</Text>
        </YStack>
      </>
    )
  }

  // Not found or no access
  if (athlete === null) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$6">
          <Text fontSize={16} fontFamily="$body" color="$color10" text="center">
            Athlete not found or you don't have access.
          </Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </YStack>
      </>
    )
  }

  // Get primary sport
  const primarySport = athlete.sports?.find((s: any) => s.isPrimary)
  const otherSports = athlete.sports?.filter((s: any) => !s.isPrimary) || []

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: athlete.name,
          headerLeft: () => (
            <Button
              size="$3"
              bg="transparent"
              onPress={() => router.back()}
              icon={ArrowLeft}
              circular
            />
          ),
        }}
      />

      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$5"
            px="$4"
            pt="$4"
            pb={insets.bottom + 40}
            maxW={600}
            width="100%"
            self="center"
          >
            {/* Profile Header */}
            <Card p="$5" bg="$brand1" rounded="$5" borderWidth={0}>
              <XStack items="center" gap="$4">
                <Circle size={64} bg="$primary">
                  <User size={32} color="white" />
                </Circle>
                <YStack flex={1} gap="$1">
                  <DisplayHeading>{athlete.name.toUpperCase()}</DisplayHeading>
                  <Text color="$color10" fontFamily="$body" fontSize={14}>
                    {athlete.email}
                  </Text>
                  {athlete.program && (
                    <XStack items="center" gap="$2" pt="$1">
                      <Trophy size={14} color="$accent" />
                      <Text fontSize={13} color="$accent" fontFamily="$body" fontWeight="600">
                        {athlete.program.skillLevel} Athlete
                      </Text>
                    </XStack>
                  )}
                </YStack>
              </XStack>
            </Card>

            {/* Training Status */}
            {athlete.program ? (
              <YStack gap="$3">
                <SectionLabel>TRAINING STATUS</SectionLabel>

                <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
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
                          {PHASE_NAMES[athlete.program.currentPhase as keyof typeof PHASE_NAMES]}
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
                          Week {athlete.program.currentWeek}, Day {athlete.program.currentDay}
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
                          {athlete.program.skillLevel}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>

                {/* View Program Button */}
                <Card
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{ bg: '$surfaceHover' }}
                  onPress={() => router.push(`/(parent)/athletes/${id}/program`)}
                >
                  <XStack items="center" gap="$3">
                    <YStack bg="$brand2" p="$2" rounded="$10">
                      <BookOpen size={18} color="$primary" />
                    </YStack>
                    <Text flex={1} fontSize={15} fontFamily="$body" fontWeight="500" color="$color12">
                      View Training Program
                    </Text>
                    <ChevronRight size={20} color="$color9" />
                  </XStack>
                </Card>
              </YStack>
            ) : (
              <Card p="$5" bg="$yellow2" borderColor="$yellow6" borderWidth={1} rounded="$4">
                <YStack gap="$2" items="center">
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$yellow11">
                    Setup Required
                  </Text>
                  <Text fontSize={13} fontFamily="$body" color="$yellow10" text="center">
                    This athlete hasn't completed their intake assessment yet.
                  </Text>
                </YStack>
              </Card>
            )}

            {/* Sports */}
            {(primarySport || otherSports.length > 0) && (
              <YStack gap="$3">
                <SectionLabel>SPORTS</SectionLabel>

                <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
                  <YStack gap="$3">
                    {primarySport && (
                      <XStack items="center" gap="$3">
                        <YStack bg="$brand2" p="$2" rounded="$10">
                          <Star size={18} color="$yellow9" />
                        </YStack>
                        <YStack flex={1}>
                          <Text fontSize={12} color="$color10" fontFamily="$body">
                            Primary Sport
                          </Text>
                          <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                            {primarySport.sportName}
                          </Text>
                        </YStack>
                      </XStack>
                    )}

                    {otherSports.map((sport: any) => (
                      <XStack key={sport._id} items="center" gap="$3">
                        <YStack bg="$color4" p="$2" rounded="$10">
                          <Target size={18} color="$color10" />
                        </YStack>
                        <YStack flex={1}>
                          <Text fontSize={12} color="$color10" fontFamily="$body">
                            Also Training For
                          </Text>
                          <Text fontSize={15} fontFamily="$body" fontWeight="500" color="$color11">
                            {sport.sportName}
                          </Text>
                        </YStack>
                      </XStack>
                    ))}
                  </YStack>
                </Card>
              </YStack>
            )}

            {/* Relationship Info */}
            <YStack gap="$3">
              <SectionLabel>CONNECTION</SectionLabel>

              <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
                <YStack gap="$3">
                  <XStack justify="space-between" items="center">
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      Relationship
                    </Text>
                    <Text fontSize={13} color="$color11" fontFamily="$body" fontWeight="500" textTransform="capitalize">
                      {athlete.relationship?.type || 'Parent'}
                    </Text>
                  </XStack>
                  <XStack justify="space-between" items="center">
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      Linked On
                    </Text>
                    <Text fontSize={13} color="$color11" fontFamily="$body" fontWeight="500">
                      {new Date(athlete.relationship?.linkedAt || 0).toLocaleDateString()}
                    </Text>
                  </XStack>
                  <XStack justify="space-between" items="center">
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      Permissions
                    </Text>
                    <Text fontSize={13} color="$color11" fontFamily="$body" fontWeight="500" textTransform="capitalize">
                      {athlete.relationship?.permissions?.replace('_', ' ') || 'Full'}
                    </Text>
                  </XStack>
                </YStack>
              </Card>
            </YStack>

            {/* Unlink Button */}
            <Button
              size="$4"
              bg="$color4"
              icon={Unlink}
              onPress={handleUnlink}
              fontFamily="$body"
            >
              <Text color="$red10" fontWeight="600">Unlink Athlete</Text>
            </Button>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
