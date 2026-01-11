import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Check, Users, Zap, Crown } from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import { IntakeProgressDots, INTAKE_SCREENS } from '../../components/IntakeProgressDots'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type AgeGroup = '10-13' | '14-17' | '18+'

interface DivisionData {
  id: AgeGroup
  label: string
  subtitle: string
  icon: React.ElementType
  color: string
  bgColor: string
}

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
// DATA
// ─────────────────────────────────────────────────────────────────────────────

const DIVISIONS: DivisionData[] = [
  {
    id: '10-13',
    label: 'Youth',
    subtitle: 'Ages 10-13',
    icon: Users,
    color: '$intensityLow11',
    bgColor: '$intensityLow3',
  },
  {
    id: '14-17',
    label: 'Junior',
    subtitle: 'Ages 14-17',
    icon: Zap,
    color: '$intensityMed11',
    bgColor: '$intensityMed3',
  },
  {
    id: '18+',
    label: 'Adult',
    subtitle: 'Ages 18+',
    icon: Crown,
    color: '$intensityHigh11',
    bgColor: '$intensityHigh3',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// DivisionCard Component
// ─────────────────────────────────────────────────────────────────────────────

interface DivisionCardProps {
  division: DivisionData
  isSelected: boolean
  onSelect: () => void
}

const DivisionCard = ({ division, isSelected, onSelect }: DivisionCardProps) => {
  const Icon = division.icon

  return (
    <Card
      width="100%"
      bg={isSelected ? (division.bgColor as any) : '$surface'}
      borderColor={isSelected ? (division.color as any) : '$borderColor'}
      borderWidth={2}
      rounded="$5"
      pressStyle={{ scale: 0.97, opacity: 0.9 }}
      onPress={onSelect}
      position="relative"
      overflow="hidden"
      animation="quick"
      p="$5"
    >
      <XStack items="center" gap="$4">
        {/* Icon Badge */}
        <Circle
          size={64}
          bg={isSelected ? (division.color as any) : '$color5'}
          animation="quick"
        >
          <Icon
            size={32}
            color={isSelected ? 'white' : '$color10'}
          />
        </Circle>

        {/* Text Content */}
        <YStack flex={1} gap="$1">
          <Text
            fontSize={22}
            fontFamily="$heading"
            fontWeight="700"
            color={isSelected ? (division.color as any) : '$color12'}
            animation="quick"
          >
            {division.label}
          </Text>
          <Text
            fontSize={15}
            fontFamily="$body"
            color="$color10"
          >
            {division.subtitle}
          </Text>
        </YStack>

        {/* Selected Check */}
        {isSelected && (
          <Circle size={28} bg={division.color as any}>
            <Check size={16} color="white" strokeWidth={3} />
          </Circle>
        )}
      </XStack>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Age Group Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AgeGroupScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId } = useLocalSearchParams<{ sportId: string }>()

  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup | null>(null)

  // Redirect if missing params
  if (!sportId) {
    router.replace('/(intake)/sport')
    return null
  }

  const handleSelect = (ageGroup: AgeGroup) => {
    Vibration.vibrate(10)
    setSelectedAgeGroup(ageGroup)
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    if (selectedAgeGroup) {
      router.push({
        pathname: '/(intake)/experience-years',
        params: {
          sportId,
          ageGroup: selectedAgeGroup,
        },
      })
    }
  }

  return (
    <YStack flex={1} bg="$background">
      {/* Main Content */}
      <YStack
        flex={1}
        px="$4"
        pt={insets.top + 16}
        pb="$4"
        maxW={600}
        width="100%"
        self="center"
      >
        {/* Progress Dots */}
        <YStack items="center" mb="$4">
          <IntakeProgressDots total={7} current={INTAKE_SCREENS.AGE_GROUP} />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$6">
          <DisplayHeading>YOUR DIVISION</DisplayHeading>
          <Subtitle>
            Select your age group to optimize{'\n'}training intensity
          </Subtitle>
        </YStack>

        {/* Division Cards */}
        <YStack gap="$3" flex={1}>
          {DIVISIONS.map((division) => (
            <DivisionCard
              key={division.id}
              division={division}
              isSelected={selectedAgeGroup === division.id}
              onSelect={() => handleSelect(division.id)}
            />
          ))}
        </YStack>
      </YStack>

      {/* Bottom Actions */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
      >
        <XStack gap="$3">
          <Button
            flex={1}
            size="$5"
            bg="$color4"
            color="$color11"
            onPress={handleBack}
            icon={ChevronLeft}
            fontFamily="$body"
            fontWeight="600"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            Back
          </Button>
          <Button
            flex={2}
            size="$5"
            bg={selectedAgeGroup ? '$primary' : '$color6'}
            color="white"
            disabled={!selectedAgeGroup}
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={selectedAgeGroup ? { opacity: 0.9, scale: 0.98 } : {}}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
