import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, styled, Circle } from 'tamagui'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronRight, ChevronLeft, Check, Dumbbell, House } from '@tamagui/lucide-icons'
import { Vibration, Animated } from 'react-native'
import { IntakeProgressDots, COMBINED_FLOW_SCREENS, COMBINED_FLOW_SCREEN_COUNT, COMBINED_FLOW_ROUTES } from '../../components/IntakeProgressDots'
import type { EquipmentMode } from '../../components/EquipmentModeToggle'
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation'

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

const EQUIPMENT_OPTIONS: Array<{
  id: EquipmentMode
  label: string
  subtitle: string
  icon: typeof Dumbbell
}> = [
  {
    id: 'gym',
    label: 'Gym',
    subtitle: 'I have access to a full gym',
    icon: Dumbbell,
  },
  {
    id: 'home',
    label: 'Home',
    subtitle: 'I train at home with minimal equipment',
    icon: House,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// EquipmentCard Component
// ─────────────────────────────────────────────────────────────────────────────

interface EquipmentCardProps {
  option: (typeof EQUIPMENT_OPTIONS)[number]
  isSelected: boolean
  onSelect: () => void
}

const EquipmentCard = ({ option, isSelected, onSelect }: EquipmentCardProps) => {
  const Icon = option.icon

  return (
    <Card
      width="100%"
      bg={isSelected ? '$brand2' : '$surface'}
      borderColor={isSelected ? '$primary' : '$borderColor'}
      borderWidth={2}
      rounded="$5"
      pressStyle={{ scale: 0.97, opacity: 0.9 }}
      onPress={onSelect}
      animation="quick"
      p="$5"
      accessibilityRole="button"
      accessibilityLabel={`${option.label}: ${option.subtitle}`}
      accessibilityState={{ selected: isSelected }}
    >
      <XStack items="center" gap="$4">
        <Circle
          size={64}
          bg={isSelected ? '$brand2' : '$color5'}
          borderWidth={isSelected ? 2 : 0}
          borderColor={isSelected ? '$primary' : 'transparent'}
          animation="quick"
        >
          <Icon size={32} color={isSelected ? '$primary' : '$color10'} />
        </Circle>

        <YStack flex={1} gap="$1">
          <Text
            fontSize={22}
            fontFamily="$heading"
            fontWeight="700"
            color={isSelected ? '$primary' : '$color12'}
          >
            {option.label}
          </Text>
          <Text fontSize={15} fontFamily="$body" color="$color10">
            {option.subtitle}
          </Text>
        </YStack>

        {isSelected && (
          <Circle size={28} bg="$brand2" borderWidth={2} borderColor="$primary">
            <Check size={16} color="$primary" strokeWidth={3} />
          </Circle>
        )}
      </XStack>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Equipment Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function EquipmentScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { sportId, ageGroup, yearsOfExperience, trainingDays, selectedTrainingDays } = useLocalSearchParams<{
    sportId: string
    ageGroup: string
    yearsOfExperience: string
    trainingDays: string
    selectedTrainingDays: string
  }>()

  const [selectedMode, setSelectedMode] = useState<EquipmentMode | null>(null)

  // Swipe navigation - only backward (right swipe), forward requires Continue button
  const { panHandlers, translateX } = useSwipeNavigation({
    onSwipeRight: () => router.back(),
    canSwipeRight: true,
    canSwipeLeft: false,
  })

  // Redirect if missing params
  if (!sportId || !ageGroup || !yearsOfExperience || !trainingDays || !selectedTrainingDays) {
    router.replace('/(intake)/sport')
    return null
  }

  const handleSelect = (mode: EquipmentMode) => {
    Vibration.vibrate(10)
    setSelectedMode(mode)
  }

  const handleBack = () => {
    router.back()
  }

  const handleContinue = () => {
    if (selectedMode) {
      router.push({
        pathname: '/(intake)/season-timeline',
        params: {
          sportId,
          ageGroup,
          yearsOfExperience,
          trainingDays,
          selectedTrainingDays,
          equipmentMode: selectedMode,
        },
      })
    }
  }

  // Navigation handler for progress dots (backward navigation only)
  const handleProgressNavigate = (index: number) => {
    const route = COMBINED_FLOW_ROUTES[index]
    if (route) {
      router.push({
        pathname: route,
        params: { sportId, ageGroup, yearsOfExperience, trainingDays, selectedTrainingDays },
      } as any)
    }
  }

  return (
    <Animated.View
      {...panHandlers}
      style={{ flex: 1, transform: [{ translateX }] }}
    >
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
          <IntakeProgressDots
            total={COMBINED_FLOW_SCREEN_COUNT}
            current={COMBINED_FLOW_SCREENS.EQUIPMENT}
            onNavigate={handleProgressNavigate}
          />
        </YStack>

        {/* Header */}
        <YStack gap="$3" items="center" mb="$6">
          <DisplayHeading>WHERE YOU TRAIN</DisplayHeading>
          <Subtitle>
            We'll match exercises to the{'\n'}equipment you have
          </Subtitle>
        </YStack>

        {/* Equipment Cards */}
        <YStack gap="$3" flex={1}>
          {EQUIPMENT_OPTIONS.map((option) => (
            <EquipmentCard
              key={option.id}
              option={option}
              isSelected={selectedMode === option.id}
              onSelect={() => handleSelect(option.id)}
            />
          ))}
          <Text fontSize={13} fontFamily="$body" color="$color9" text="center" mt="$2">
            You can change this anytime in Settings
          </Text>
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
            bg={selectedMode ? '$primary' : '$color6'}
            color="white"
            disabled={!selectedMode}
            onPress={handleContinue}
            iconAfter={ChevronRight}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={selectedMode ? { opacity: 0.9, scale: 0.98 } : {}}
          >
            Continue
          </Button>
        </XStack>
      </YStack>
    </YStack>
    </Animated.View>
  )
}
