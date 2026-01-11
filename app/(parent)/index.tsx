import { YStack, XStack, Text, Card, Button, ScrollView, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Users,
  UserPlus,
  Heart,
  Link as LinkIcon,
} from '@tamagui/lucide-icons'
import { useAuth } from '../../hooks/useAuth'

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
// EMPTY STATE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter()

  return (
    <YStack flex={1} items="center" justify="center" gap="$6" px="$6">
      {/* Icon */}
      <YStack bg="$brand2" p="$6" rounded="$10">
        <Users size={64} color="$primary" />
      </YStack>

      {/* Heading */}
      <YStack gap="$3" items="center">
        <DisplayHeading>YOUR ATHLETES</DisplayHeading>
        <Subtitle>
          Link your athlete's account to view their training schedule and track their progress.
        </Subtitle>
      </YStack>

      {/* How it works */}
      <Card p="$4" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4" width="100%">
        <YStack gap="$4">
          <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
            How it works:
          </Text>

          <XStack gap="$3" items="flex-start">
            <YStack bg="$brand1" p="$2" rounded="$3">
              <UserPlus size={18} color="$primary" />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                1. Create an invite code
              </Text>
              <Text fontSize={13} fontFamily="$body" color="$color10">
                Generate a unique code to share with your athlete
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" items="flex-start">
            <YStack bg="$brand1" p="$2" rounded="$3">
              <LinkIcon size={18} color="$primary" />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                2. Your athlete enters the code
              </Text>
              <Text fontSize={13} fontFamily="$body" color="$color10">
                They'll link their account to yours
              </Text>
            </YStack>
          </XStack>

          <XStack gap="$3" items="flex-start">
            <YStack bg="$brand1" p="$2" rounded="$3">
              <Heart size={18} color="$primary" />
            </YStack>
            <YStack flex={1} gap="$1">
              <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                3. View and manage their training
              </Text>
              <Text fontSize={13} fontFamily="$body" color="$color10">
                See their schedule, progress, and coordinate training
              </Text>
            </YStack>
          </XStack>
        </YStack>
      </Card>

      {/* CTA Button */}
      <Button
        size="$5"
        bg="$primary"
        color="white"
        onPress={() => router.push('/(parent)/add-athlete')}
        icon={UserPlus}
        fontFamily="$body"
        fontWeight="700"
        rounded="$4"
        pressStyle={{ opacity: 0.9, scale: 0.98 }}
        width="100%"
      >
        Add Your First Athlete
      </Button>
    </YStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function ParentDashboardScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { user } = useAuth()

  // TODO: Query linked athletes once PR 4 is implemented
  // const linkedAthletes = useQuery(api.parentRelationships.getLinkedAthletes, {})

  // For now, always show empty state
  const linkedAthletes: any[] = []

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          flex={1}
          px="$4"
          pt={insets.top + 20}
          pb={insets.bottom + 20}
          maxW={600}
          width="100%"
          self="center"
          minHeight="100%"
        >
          {/* Header */}
          <YStack gap="$1" mb="$4">
            <Text fontSize={14} fontFamily="$body" color="$color10">
              Welcome back,
            </Text>
            <Text fontSize={24} fontFamily="$heading" color="$color12">
              {user?.name || 'Parent'}
            </Text>
          </YStack>

          {/* Content */}
          {linkedAthletes.length === 0 ? (
            <EmptyState />
          ) : (
            // TODO: Implement athlete cards list once PR 5 is ready
            <YStack gap="$4">
              {linkedAthletes.map((athlete) => (
                <Card key={athlete._id} p="$4" bg="$surface" rounded="$4">
                  <Text>{athlete.name}</Text>
                </Card>
              ))}
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
