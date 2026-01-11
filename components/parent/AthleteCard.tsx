import { YStack, XStack, Text, Card, Circle, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import {
  User,
  ChevronRight,
  Trophy,
  Calendar,
  Target,
  AlertCircle,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface AthleteCardProps {
  athlete: {
    _id: string
    name: string
    email: string
    hasProgram: boolean
    hasCompletedIntake: boolean
    currentPhase?: string
    currentWeek?: number
    primarySport?: string
    linkedAt: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const StatusBadge = styled(XStack, {
  px: '$2',
  py: '$1',
  rounded: '$2',
  items: 'center',
  gap: '$1',

  variants: {
    status: {
      active: {
        bg: '$green3',
      },
      pending: {
        bg: '$yellow3',
      },
      inactive: {
        bg: '$color4',
      },
    },
  } as const,
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function AthleteCard({ athlete }: AthleteCardProps) {
  const router = useRouter()

  const handlePress = () => {
    router.push(`/(parent)/athletes/${athlete._id}`)
  }

  // Determine status
  const hasActiveProgram = athlete.hasProgram && athlete.hasCompletedIntake
  const needsIntake = !athlete.hasCompletedIntake

  return (
    <Card
      p="$4"
      bg="$surface"
      borderWidth={1}
      borderColor="$borderColor"
      rounded="$4"
      pressStyle={{ bg: '$surfaceHover', scale: 0.99 }}
      onPress={handlePress}
    >
      <XStack items="center" gap="$3">
        {/* Avatar */}
        <Circle size={50} bg="$brand2">
          <User size={24} color="$primary" />
        </Circle>

        {/* Info */}
        <YStack flex={1} gap="$1">
          <XStack items="center" justify="space-between">
            <Text fontSize={16} fontFamily="$body" fontWeight="700" color="$color12">
              {athlete.name}
            </Text>
            <ChevronRight size={20} color="$color9" />
          </XStack>

          {/* Sport and Status */}
          <XStack items="center" gap="$2" flexWrap="wrap">
            {athlete.primarySport && (
              <XStack items="center" gap="$1">
                <Target size={12} color="$color10" />
                <Text fontSize={12} fontFamily="$body" color="$color10">
                  {athlete.primarySport}
                </Text>
              </XStack>
            )}

            {hasActiveProgram && athlete.currentPhase && (
              <StatusBadge status="active">
                <Trophy size={10} color="$green10" />
                <Text fontSize={11} fontFamily="$body" fontWeight="600" color="$green10">
                  {PHASE_NAMES[athlete.currentPhase as keyof typeof PHASE_NAMES]} W{athlete.currentWeek}
                </Text>
              </StatusBadge>
            )}

            {needsIntake && (
              <StatusBadge status="pending">
                <AlertCircle size={10} color="$yellow10" />
                <Text fontSize={11} fontFamily="$body" fontWeight="600" color="$yellow10">
                  Needs Setup
                </Text>
              </StatusBadge>
            )}
          </XStack>

          {/* Last Activity */}
          <XStack items="center" gap="$1" pt="$1">
            <Calendar size={11} color="$color9" />
            <Text fontSize={11} fontFamily="$body" color="$color9">
              Linked {new Date(athlete.linkedAt).toLocaleDateString()}
            </Text>
          </XStack>
        </YStack>
      </XStack>
    </Card>
  )
}
