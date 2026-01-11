import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Minus, Plus, Trophy, Award, Medal } from '@tamagui/lucide-icons'
import { Vibration } from 'react-native'
import { IntakeProgressDots, INTAKE_SCREENS } from '../../components/IntakeProgressDots'
import { getSkillLevel } from '../../lib'

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
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MIN_YEARS = 0
const MAX_YEARS = 10

// Skill level styling
const SKILL_STYLES = {
  Novice: {
    color: '$intensityLow11',
    bgColor: '$intensityLow3',
    label: 'Novice',
    description: 'Building your foundation',
  },
  Moderate: {
    color: '$intensityMed11',
    bgColor: '$intensityMed3',
    label: 'Moderate',
    description: 'Developing your skills',
  },
  Advanced: {
    color: '$intensityHigh11',
    bgColor: '$intensityHigh3',
    label: 'Advanced',
    description: 'Refining your expertise',
  },
} as const

// ─────────────────────────────────────────────────────────────────────────────
// TrophyShelf Component
// ─────────────────────────────────────────────────────────────────────────────

interface TrophyShelfProps {
  years: number
  onIncrement: () => void
  onDecrement: () => void
}

const TrophyShelf = ({ years, onIncrement, onDecrement }: TrophyShelfProps) => {
  // Calculate how many trophies to show (1 per 2 years, max 5)
  const trophyCount = Math.min(Math.ceil(years / 2), 5)

  // Determine trophy types based on years
  const getTrophyIcon = (index: number) => {
    if (years >= 6 && index === 0) return Trophy // Gold trophy for 6+ years
    if (years >= 3 && index <= 1) return Award // Award for 3+ years
    return Medal // Medal for base
  }

  const getTrophyColor = (index: number) => {
    if (years >= 6 && index === 0) return '$yellow10' // Gold
    if (years >= 3 && index <= 1) return '$orange9' // Bronze/Orange
    return '$gray10' // Silver
  }

  return (
    <Card
      bg="$surface"
      borderColor="$borderColor"
      borderWidth={1}
      rounded="$6"
      p="$5"
      gap="$5"
    >
      {/* Year Counter */}
      <YStack items="center" gap="$2">
        <Text
          fontSize={64}
          fontFamily="$heading"
          fontWeight="800"
          color="$color12"
        >
          {years}
        </Text>
        <Text
          fontSize={18}
          fontFamily="$body"
          fontWeight="600"
          color="$color10"
          textTransform="uppercase"
          letterSpacing={2}
        >
          {years === 1 ? 'Year' : 'Years'}
        </Text>
      </YStack>

      {/* Trophy Display Shelf */}
      <YStack
        bg="$color3"
        rounded="$4"
        p="$4"
        height={80}
        items="center"
        justify="center"
      >
        {years === 0 ? (
          <Text color="$color9" fontFamily="$body" fontSize={14}>
            Tap + to add your experience
          </Text>
        ) : (
          <XStack gap="$3" items="flex-end" justify="center" flexWrap="wrap">
            {Array.from({ length: trophyCount }, (_, index) => {
              const Icon = getTrophyIcon(index)
              const color = getTrophyColor(index)
              return (
                <YStack
                  key={index}
                  items="center"
                  animation="bouncy"
                  enterStyle={{ opacity: 0, scale: 0.5, y: 20 }}
                >
                  <Icon size={32 - index * 2} color={color} />
                </YStack>
              )
            })}
          </XStack>
        )}
      </YStack>

      {/* Stepper Controls */}
      <XStack items="center" justify="center" gap="$4">
        <Button
          circular
          size="$5"
          bg={years <= MIN_YEARS ? '$color4' : '$color6'}
          disabled={years <= MIN_YEARS}
          onPress={onDecrement}
          pressStyle={{ scale: 0.95 }}
        >
          <Minus
            size={24}
            color={years <= MIN_YEARS ? '$color8' : '$color12'}
          />
        </Button>

        <YStack width={100} items="center">
          <Text fontSize={13} color="$color9" fontFamily="$body">
            {years === 0 && 'Just starting'}
            {years > 0 && years < 3 && 'Getting started'}
            {years >= 3 && years < 6 && 'Experienced'}
            {years >= 6 && 'Seasoned athlete'}
          </Text>
        </YStack>

        <Button
          circular
          size="$5"
          bg={years >= MAX_YEARS ? '$color4' : '$primary'}
          disabled={years >= MAX_YEARS}
          onPress={onIncrement}
          pressStyle={{ scale: 0.95 }}
        >
          <Plus
            size={24}
            color={years >= MAX_YEARS ? '$color8' : 'white'}
          />
        </Button>
      </XStack>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SkillLevelBadge Component
// ─────────────────────────────────────────────────────────────────────────────

interface SkillLevelBadgeProps {
  level: 'Novice' | 'Moderate' | 'Advanced'
}

const SkillLevelBadge = ({ level }: SkillLevelBadgeProps) => {
  const style = SKILL_STYLES[level]

  return (
    <Card
      bg={style.bgColor}
      borderColor={style.color}
      borderWidth={1}
      rounded="$4"
      px="$4"
      py="$3"
      animation="quick"
    >
      <XStack items="center" gap="$3">
        <Circle size={10} bg={style.color} />
        <YStack gap="$0.5">
          <Text
            fontSize={16}
            fontFamily="$body"
            fontWeight="700"
            color={style.color}
          >
            {style.label} Level
          </Text>
          <Text fontSize={13} color="$color10" fontFamily="$body">
            {style.description}
          </Text>
        </YStack>
      </XStack>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Experience Years Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ExperienceYearsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
  }>()

  const [years, setYears] = useState(0)

  // Redirect if missing params
  if (!sportId || !ageGroup) {
    router.replace('/(intake)/sport')
    return null
  }

  const skillLevel = getSkillLevel(years)

  const handleIncrement = () => {
    if (years < MAX_YEARS) {
      Vibration.vibrate(10)
      setYears((prev) => prev + 1)
    }
  }

  const handleDecrement = () => {
    if (years > MIN_YEARS) {
      Vibration.vibrate(10)
      setYears((prev) => prev - 1)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    router.push({
      pathname: '/(intake)/training-days',
      params: {
        sportId,
        ageGroup,
        yearsOfExperience: years.toString(),
      },
    })
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
          <IntakeProgressDots total={7} current={INTAKE_SCREENS.EXPERIENCE_YEARS} />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$5">
          <DisplayHeading>YOUR EXPERIENCE</DisplayHeading>
          <Subtitle>
            How long have you been training{'\n'}for your sport?
          </Subtitle>
        </YStack>

        {/* Trophy Shelf */}
        <TrophyShelf
          years={years}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
        />

        {/* Skill Level Badge */}
        <YStack mt="$4" items="center">
          <SkillLevelBadge level={skillLevel} />
        </YStack>

        {/* Spacer */}
        <YStack flex={1} />
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
            bg="$primary"
            color="white"
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
  )
}
