import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, Input, Circle, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Search,
  ChevronRight,
  Target,
  Check,
  Star,
  X,
} from '@tamagui/lucide-icons'
import { Id } from '../../convex/_generated/dataModel'
import LottieView from 'lottie-react-native'
import { getSportInitials } from '../../lib'

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
// Sport Icon Lottie Mapping
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_LOTTIE: Record<string, any> = {
  'Soccer': require('../../assets/lottie/sports/soccer.json'),
}

// ─────────────────────────────────────────────────────────────────────────────
// SportIcon Component
// ─────────────────────────────────────────────────────────────────────────────

interface SportIconProps {
  name: string
  size?: number
  isSelected?: boolean
}

const SportIcon = ({ name, size = 56, isSelected = false }: SportIconProps) => {
  const lottieSource = SPORT_LOTTIE[name]
  
  if (lottieSource) {
    return (
      <Circle 
        size={size} 
        bg={isSelected ? '$brand3' : '$color4'}
        overflow="hidden"
        items="center"
        justify="center"
      >
        <LottieView
          key={isSelected ? 'playing' : 'paused'}
          source={lottieSource}
          autoPlay={isSelected}
          loop={isSelected}
          speed={0.8}
          style={{ width: size * 1.4, height: size * 1.4 }}
        />
      </Circle>
    )
  }

  // Fallback: Extract initials using shared utility
  const initials = getSportInitials(name)

  return (
    <Circle 
      size={size} 
      bg={isSelected ? '$brand3' : '$color4'}
    >
      <Text 
        fontSize={size / 2.5} 
        fontFamily="$body" fontWeight="700"
        color={isSelected ? '$primary' : '$color10'}
      >
        {initials}
      </Text>
    </Circle>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SportTile Component (Multi-select with Primary indicator)
// ─────────────────────────────────────────────────────────────────────────────

interface SportTileProps {
  sport: {
    _id: Id<"sports">
    name: string
    description?: string
  }
  isSelected: boolean
  isPrimary: boolean
  onSelect: () => void
}

const SportTile = ({ sport, isSelected, isPrimary, onSelect }: SportTileProps) => {
  return (
    <Card
      width="100%"
      aspectRatio={1}
      bg={isSelected ? (isPrimary ? '$brand2' : '$brand1') : '$surface'}
      borderColor={isSelected ? (isPrimary ? '$primary' : '$color8') : 'transparent'}
      borderWidth={2}
      rounded="$4"
      pressStyle={{ scale: 0.96, opacity: 0.9 }}
      onPress={onSelect}
      position="relative"
    >
      <YStack
        flex={1}
        items="center"
        justify="center"
        gap="$2"
        p="$2"
      >
        <SportIcon
          name={sport.name}
          size={44}
          isSelected={isSelected}
        />
        <Text
          fontSize={12}
          fontFamily="$body" fontWeight="600"
          text="center"
          numberOfLines={2}
          color={isSelected ? '$primary' : '$color12'}
        >
          {sport.name}
        </Text>
      </YStack>

      {/* Primary indicator (star) */}
      {isPrimary && (
        <Circle
          size={22}
          bg="$yellow9"
          position="absolute"
          t={6}
          r={6}
        >
          <Star size={12} color="white" fill="white" strokeWidth={2} />
        </Circle>
      )}

      {/* Selected but not primary indicator (checkmark) */}
      {isSelected && !isPrimary && (
        <Circle
          size={22}
          bg="$color8"
          position="absolute"
          t={6}
          r={6}
        >
          <Check size={12} color="white" strokeWidth={3} />
        </Circle>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SelectedSportChip Component (for displaying selected sports)
// ─────────────────────────────────────────────────────────────────────────────

interface SelectedSportChipProps {
  sport: {
    _id: Id<"sports">
    name: string
  }
  isPrimary: boolean
  onSetPrimary: () => void
  onRemove: () => void
}

const SelectedSportChip = ({ sport, isPrimary, onSetPrimary, onRemove }: SelectedSportChipProps) => {
  return (
    <XStack
      bg={isPrimary ? '$brand2' : '$surface'}
      borderColor={isPrimary ? '$primary' : '$borderColor'}
      borderWidth={1}
      rounded="$3"
      px="$3"
      py="$2"
      items="center"
      gap="$2"
    >
      {isPrimary && (
        <Star size={14} color="$yellow9" fill="$yellow9" />
      )}
      <Text
        fontSize={14}
        fontFamily="$body"
        fontWeight={isPrimary ? '700' : '500'}
        color={isPrimary ? '$primary' : '$color12'}
      >
        {sport.name}
      </Text>
      {!isPrimary && (
        <Button
          size="$1"
          circular
          bg="transparent"
          p={0}
          onPress={onSetPrimary}
          pressStyle={{ opacity: 0.7 }}
        >
          <Star size={14} color="$color9" />
        </Button>
      )}
      <Button
        size="$1"
        circular
        bg="transparent"
        p={0}
        onPress={onRemove}
        pressStyle={{ opacity: 0.7 }}
      >
        <X size={14} color="$color9" />
      </Button>
    </XStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport Selection Screen (Multi-Sport with Primary)
// ─────────────────────────────────────────────────────────────────────────────

export default function SportSelectionScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [searchQuery, setSearchQuery] = useState('')
  // Multi-sport selection: first sport is primary, rest are additional
  const [selectedSportIds, setSelectedSportIds] = useState<Id<"sports">[]>([])

  const sports = useQuery(api.sports.list, {})

  const GAP = 12

  // Primary sport is the first one in the array
  const primarySportId = selectedSportIds[0] || null
  const additionalSportIds = selectedSportIds.slice(1)

  // Get full sport objects for selected sports (for chip display)
  const selectedSports = sports?.filter(s => selectedSportIds.includes(s._id)) || []

  if (!sports) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading sports...
        </Text>
      </YStack>
    )
  }

  const filteredSports = searchQuery
    ? sports.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : sports

  const sortedSports = [...filteredSports].sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  // Handle sport selection toggle
  const handleSportToggle = (sportId: Id<"sports">) => {
    setSelectedSportIds(prev => {
      if (prev.includes(sportId)) {
        // Remove sport (but don't allow removing if it's the last one)
        const newSelection = prev.filter(id => id !== sportId)
        return newSelection
      } else {
        // Add sport to selection
        return [...prev, sportId]
      }
    })
  }

  // Set a sport as primary (move to front of array)
  const handleSetPrimary = (sportId: Id<"sports">) => {
    setSelectedSportIds(prev => {
      const filtered = prev.filter(id => id !== sportId)
      return [sportId, ...filtered]
    })
  }

  // Remove a sport from selection
  const handleRemoveSport = (sportId: Id<"sports">) => {
    setSelectedSportIds(prev => prev.filter(id => id !== sportId))
  }

  const handleContinue = () => {
    if (primarySportId) {
      router.push({
        pathname: '/(intake)/experience',
        params: {
          primarySportId,
          additionalSportIds: additionalSportIds.join(','),
        },
      })
    }
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          gap="$5"
          px="$4"
          pt={insets.top + 24}
          pb="$8"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Header */}
          <YStack gap="$3" items="center">
            <YStack bg="$brand2" p="$4" rounded="$10">
              <Target size={40} color="$primary" />
            </YStack>
            <DisplayHeading>WHAT'S YOUR SPORT?</DisplayHeading>
            <Subtitle>
              Select your sports. The first one you pick will be your primary sport for training.
            </Subtitle>
          </YStack>

          {/* Selected Sports Summary */}
          {selectedSports.length > 0 && (
            <Card p="$4" bg="$background" borderColor="$borderColor" borderWidth={1} rounded="$4">
              <YStack gap="$3">
                <XStack items="center" justify="space-between">
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color11">
                    Selected Sports ({selectedSports.length})
                  </Text>
                  <XStack items="center" gap="$1">
                    <Star size={12} color="$yellow9" fill="$yellow9" />
                    <Text fontSize={12} color="$color10" fontFamily="$body">
                      = Primary
                    </Text>
                  </XStack>
                </XStack>
                <XStack flexWrap="wrap" gap="$2">
                  {selectedSports
                    .sort((a, b) => {
                      // Sort primary first, then by selection order
                      if (a._id === primarySportId) return -1
                      if (b._id === primarySportId) return 1
                      return selectedSportIds.indexOf(a._id) - selectedSportIds.indexOf(b._id)
                    })
                    .map((sport) => (
                      <SelectedSportChip
                        key={sport._id}
                        sport={sport}
                        isPrimary={sport._id === primarySportId}
                        onSetPrimary={() => handleSetPrimary(sport._id)}
                        onRemove={() => handleRemoveSport(sport._id)}
                      />
                    ))}
                </XStack>
                {additionalSportIds.length > 0 && (
                  <Text fontSize={12} color="$color9" fontFamily="$body">
                    Tap the star icon to change your primary sport
                  </Text>
                )}
              </YStack>
            </Card>
          )}

          {/* Search */}
          <XStack
            bg="$surface"
            rounded="$4"
            borderWidth={1}
            borderColor="$borderColor"
            px="$3"
            py="$2.5"
            items="center"
            gap="$2"
          >
            <Search size={20} color="$color10" />
            <Input
              flex={1}
              placeholder="Search sports..."
              placeholderTextColor="$placeholderColor"
              value={searchQuery}
              onChangeText={setSearchQuery}
              bg="transparent"
              borderWidth={0}
              fontSize={15}
              fontFamily="$body"
              p={0}
            />
          </XStack>

          {/* Sport Tiles Grid */}
          <XStack
            width="100%"
            flexWrap="wrap"
            justifyContent="space-between"
          >
            {sortedSports.map((sport) => (
              <YStack
                key={sport._id}
                width="31.5%"
                mb={GAP}
              >
                <SportTile
                  sport={sport}
                  isSelected={selectedSportIds.includes(sport._id)}
                  isPrimary={sport._id === primarySportId}
                  onSelect={() => handleSportToggle(sport._id)}
                />
              </YStack>
            ))}
          </XStack>

          {/* No Results */}
          {sortedSports.length === 0 && searchQuery && (
            <Card p="$6" bg="$surface" rounded="$4">
              <YStack items="center" gap="$2">
                <Text color="$color10" text="center" fontFamily="$body">
                  No sports found matching "{searchQuery}"
                </Text>
                <Text fontSize={13} color="$color9" text="center" fontFamily="$body">
                  Try a different search or select "General Fitness"
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>

      {/* Bottom Action */}
      <YStack
        px="$4"
        py="$4"
        pb={insets.bottom + 16}
        borderTopWidth={1}
        borderTopColor="$borderColor"
        bg="$surface"
        gap="$2"
      >
        {primarySportId && (
          <Text fontSize={13} color="$color10" text="center" fontFamily="$body">
            Primary: {sports.find(s => s._id === primarySportId)?.name}
            {additionalSportIds.length > 0 && ` + ${additionalSportIds.length} more`}
          </Text>
        )}
        <Button
          size="$5"
          bg={primarySportId ? '$primary' : '$color6'}
          color="white"
          disabled={!primarySportId}
          onPress={handleContinue}
          iconAfter={ChevronRight}
          fontFamily="$body" fontWeight="700"
          rounded="$4"
          pressStyle={primarySportId ? { opacity: 0.9, scale: 0.98 } : {}}
        >
          Continue
        </Button>
      </YStack>
    </YStack>
  )
}
