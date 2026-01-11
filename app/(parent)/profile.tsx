import { YStack, XStack, Text, Card, Button, ScrollView, styled } from 'tamagui'
import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  User,
  Mail,
  LogOut,
  Settings,
  ChevronRight,
} from '@tamagui/lucide-icons'
import { useAuth } from '../../hooks/useAuth'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SectionTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  color: '$color10',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parent Profile Screen
 *
 * Shows parent account info and settings.
 */
export default function ParentProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { signOut } = useClerk()
  const { user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      router.replace('/(auth)/sign-in')
    } catch (err) {
      console.error('Failed to sign out:', err)
    }
  }

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          px="$4"
          pt={insets.top + 20}
          pb={insets.bottom + 40}
          maxW={600}
          width="100%"
          self="center"
          gap="$6"
        >
          {/* Header */}
          <YStack gap="$2">
            <Text fontSize={28} fontFamily="$heading" color="$color12">
              Profile
            </Text>
            <Text fontSize={14} fontFamily="$body" color="$color10">
              Manage your parent account
            </Text>
          </YStack>

          {/* Profile Info Card */}
          <YStack gap="$3">
            <SectionTitle>Account</SectionTitle>
            <Card p="$4" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
              <YStack gap="$4">
                <XStack items="center" gap="$3">
                  <YStack bg="$brand2" p="$3" rounded="$10">
                    <User size={24} color="$primary" />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize={16} fontFamily="$body" fontWeight="600" color="$color12">
                      {user?.name || 'Parent'}
                    </Text>
                    <Text fontSize={13} fontFamily="$body" color="$color10">
                      Parent Account
                    </Text>
                  </YStack>
                </XStack>

                <YStack
                  borderTopWidth={1}
                  borderTopColor="$borderColor"
                  pt="$4"
                  gap="$3"
                >
                  <XStack items="center" gap="$3">
                    <Mail size={18} color="$color10" />
                    <Text fontSize={14} fontFamily="$body" color="$color11">
                      {user?.email || 'No email'}
                    </Text>
                  </XStack>
                </YStack>
              </YStack>
            </Card>
          </YStack>

          {/* Settings Section */}
          <YStack gap="$3">
            <SectionTitle>Settings</SectionTitle>
            <Card bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4" overflow="hidden">
              <Button
                size="$5"
                bg="transparent"
                justifyContent="space-between"
                borderWidth={0}
                borderRadius={0}
                pressStyle={{ bg: '$backgroundHover' }}
              >
                <XStack items="center" gap="$3">
                  <Settings size={20} color="$color11" />
                  <Text fontSize={15} fontFamily="$body" color="$color12">
                    App Settings
                  </Text>
                </XStack>
                <ChevronRight size={20} color="$color9" />
              </Button>
            </Card>
          </YStack>

          {/* Sign Out */}
          <YStack gap="$3">
            <SectionTitle>Session</SectionTitle>
            <Button
              size="$5"
              bg="$surface"
              borderColor="$borderColor"
              borderWidth={1}
              rounded="$4"
              onPress={handleSignOut}
              pressStyle={{ bg: '$backgroundHover' }}
            >
              <XStack items="center" gap="$3">
                <LogOut size={20} color="$red10" />
                <Text fontSize={15} fontFamily="$body" color="$red10">
                  Sign Out
                </Text>
              </XStack>
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  )
}
