import { useState } from 'react'
import { Pressable } from 'react-native'
import { YStack, XStack, Text, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { useRouter } from 'expo-router'
import { api } from 'convex/_generated/api'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { useAuth } from '../../hooks/useAuth'
import { EquipmentModeToggle, type EquipmentMode } from '../../components/EquipmentModeToggle'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

// ─────────────────────────────────────────────────────────────────────────────
// Settings Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()

  const persistedMode = useQuery(api.userPrograms.getEquipmentMode, user ? {} : 'skip')
  const saveEquipmentMode = useMutation(api.userPrograms.setEquipmentMode)

  // Shown while the mutation is in flight so the toggle responds immediately
  const [pendingMode, setPendingMode] = useState<EquipmentMode | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBack = () => {
    router.back()
  }

  const handleEquipmentModeChange = async (nextMode: EquipmentMode) => {
    if (nextMode === (pendingMode ?? persistedMode)) return

    setPendingMode(nextMode)
    setError(null)
    setIsLoading(true)
    try {
      await saveEquipmentMode({ equipmentMode: nextMode })
    } catch (err) {
      console.error('Failed to update equipment mode:', err)
      setError('Could not save your equipment preference. Please try again.')
    } finally {
      setPendingMode(null)
      setIsLoading(false)
    }
  }

  if (persistedMode === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10">Loading...</Text>
      </YStack>
    )
  }

  const equipmentMode: EquipmentMode = pendingMode ?? persistedMode ?? 'gym'

  return (
    <YStack flex={1} bg="$background">
      {/* Header */}
      <XStack
        items="center"
        gap="$3"
        px="$4"
        pt={insets.top + 16}
        pb="$3"
        bg="$background"
      >
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={28} color="$color" />
        </Pressable>
        <Text flex={1} fontSize="$7" fontWeight="700" fontFamily="$heading">
          Settings
        </Text>
      </XStack>

      <ScrollView flex={1} contentContainerStyle={{ pb: insets.bottom + 16 }}>
        <YStack gap="$3" px="$4" pt="$2" maxW={600} width="100%" self="center">
          <SectionLabel>EQUIPMENT</SectionLabel>
          <Text fontSize={14} fontFamily="$body" color="$color11" lineHeight={20}>
            Choose where you train. Home mode swaps gym exercises for ones that
            need minimal equipment.
          </Text>
          <EquipmentModeToggle
            value={equipmentMode}
            onChange={handleEquipmentModeChange}
            disabled={isLoading}
          />
          {error && (
            <Text fontSize={13} fontFamily="$body" color="$red10">
              {error}
            </Text>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
