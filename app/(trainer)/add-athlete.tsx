import { useState } from 'react'
import { YStack, XStack, Text, Input, Button, Card, Spinner, ScrollView, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { ArrowLeft, UserPlus, Copy, Check, RefreshCw, Mail } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'

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

const CodeDisplay = styled(Text, {
  fontFamily: 'monospace',
  fontSize: 32,
  fontWeight: '700',
  letterSpacing: 8,
  color: '$primary',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AddAthleteScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()

  const createInvitation = useMutation(api.trainerInvitations.createInvitation)
  const revokeInvitation = useMutation(api.trainerInvitations.revokeInvitation)
  const pendingInvitations = useQuery(
    api.trainerInvitations.getPendingInvitations,
    user ? { trainerId: user._id } : "skip"
  )

  const [athleteEmail, setAthleteEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateInvitation = async (email?: string) => {
    if (!user) {
      setError('You must be logged in as a trainer')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await createInvitation({
        trainerId: user._id,
        athleteEmail: email || undefined,
      })

      setGeneratedCode(result.inviteCode)
      setAthleteEmail('')
    } catch (err) {
      console.error('Error creating invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to create invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (generatedCode) {
      await Clipboard.setStringAsync(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!user) return

    try {
      await revokeInvitation({
        invitationId: invitationId as any,
        trainerId: user._id,
      })
    } catch (err) {
      console.error('Error revoking invitation:', err)
    }
  }

  // Code generated success view
  if (generatedCode) {
    return (
      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$5"
            px="$4"
            pt={insets.top + 16}
            pb={insets.bottom + 100}
            maxW={600}
            width="100%"
            self="center"
          >
            {/* Header */}
            <XStack items="center" gap="$3">
              <Button
                size="$3"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                icon={ArrowLeft}
                onPress={() => setGeneratedCode(null)}
                circular
              />
              <YStack flex={1}>
                <DisplayHeading>INVITE CODE</DisplayHeading>
              </YStack>
            </XStack>

            {/* Code Display Card */}
            <Card
              p="$6"
              bg="$brand1"
              rounded="$5"
              borderWidth={0}
            >
              <YStack items="center" gap="$5">
                <YStack bg="$primary" p="$4" rounded="$10">
                  <UserPlus size={32} color="white" />
                </YStack>

                <YStack items="center" gap="$2">
                  <Text color="$color10" fontFamily="$body" fontSize={14}>
                    Share this code with your athlete
                  </Text>
                  <CodeDisplay>{generatedCode}</CodeDisplay>
                </YStack>

                <Button
                  size="$4"
                  bg={copied ? '$intensityLow5' : '$primary'}
                  color="white"
                  icon={copied ? Check : Copy}
                  fontFamily="$body"
                  fontWeight="700"
                  rounded="$4"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                  onPress={handleCopyCode}
                >
                  {copied ? 'Copied!' : 'Copy Code'}
                </Button>

                <Text
                  color="$color9"
                  fontFamily="$body"
                  fontSize={12}
                  text="center"
                >
                  This code expires in 7 days
                </Text>
              </YStack>
            </Card>

            {/* Instructions */}
            <Card
              p="$4"
              bg="$surface"
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack gap="$3">
                <SectionLabel>HOW IT WORKS</SectionLabel>
                <YStack gap="$2">
                  <XStack gap="$3">
                    <Text color="$primary" fontFamily="$body" fontWeight="700">1.</Text>
                    <Text color="$color11" fontFamily="$body" fontSize={14} flex={1}>
                      Share the code with your athlete
                    </Text>
                  </XStack>
                  <XStack gap="$3">
                    <Text color="$primary" fontFamily="$body" fontWeight="700">2.</Text>
                    <Text color="$color11" fontFamily="$body" fontSize={14} flex={1}>
                      They enter the code in their WanderFit app
                    </Text>
                  </XStack>
                  <XStack gap="$3">
                    <Text color="$primary" fontFamily="$body" fontWeight="700">3.</Text>
                    <Text color="$color11" fontFamily="$body" fontSize={14} flex={1}>
                      Once accepted, you can view and modify their workouts
                    </Text>
                  </XStack>
                </YStack>
              </YStack>
            </Card>

            {/* Actions */}
            <XStack gap="$3">
              <Button
                flex={1}
                size="$4"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                fontFamily="$body"
                fontWeight="600"
                color="$color11"
                rounded="$4"
                icon={RefreshCw}
                onPress={() => setGeneratedCode(null)}
              >
                New Code
              </Button>
              <Button
                flex={1}
                size="$4"
                bg="$primary"
                color="white"
                fontFamily="$body"
                fontWeight="700"
                rounded="$4"
                onPress={() => router.back()}
              >
                Done
              </Button>
            </XStack>
          </YStack>
        </ScrollView>
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
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Header */}
          <XStack items="center" gap="$3">
            <Button
              size="$3"
              bg="$surface"
              borderWidth={1}
              borderColor="$borderColor"
              icon={ArrowLeft}
              onPress={() => router.back()}
              circular
            />
            <YStack flex={1}>
              <DisplayHeading>ADD ATHLETE</DisplayHeading>
              <Text color="$color10" fontFamily="$body" fontSize={14}>
                Generate a code for your athlete to join
              </Text>
            </YStack>
          </XStack>

          {/* Error Message */}
          {error && (
            <Card p="$3" bg="$red2" borderColor="$red8" borderWidth={1}>
              <Text color="$red11" fontSize={14} fontFamily="$body">
                {error}
              </Text>
            </Card>
          )}

          {/* Quick Generate */}
          <Card
            p="$5"
            bg="$brand1"
            rounded="$5"
            borderWidth={0}
          >
            <YStack items="center" gap="$4">
              <YStack bg="$primary" p="$3" rounded="$10">
                <UserPlus size={28} color="white" />
              </YStack>
              <YStack items="center" gap="$1">
                <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={16}>
                  Generate Invite Code
                </Text>
                <Text text="center" color="$color10" fontFamily="$body" fontSize={14}>
                  Create a code that any athlete can use to link with you
                </Text>
              </YStack>
              <Button
                size="$4"
                bg="$primary"
                color="white"
                fontFamily="$body"
                fontWeight="700"
                rounded="$4"
                pressStyle={{ opacity: 0.9, scale: 0.98 }}
                onPress={() => handleCreateInvitation()}
                disabled={isLoading}
                icon={isLoading ? Spinner : undefined}
              >
                {isLoading ? 'Generating...' : 'Generate Code'}
              </Button>
            </YStack>
          </Card>

          {/* Email-specific invite (optional) */}
          <YStack gap="$3">
            <SectionLabel>OR INVITE BY EMAIL</SectionLabel>
            <Card
              p="$4"
              bg="$surface"
              rounded="$4"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <YStack gap="$4">
                <Text color="$color10" fontFamily="$body" fontSize={13}>
                  Optionally restrict the code to a specific email address
                </Text>
                <Input
                  placeholder="athlete@example.com"
                  value={athleteEmail}
                  onChangeText={setAthleteEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  size="$4"
                  bg="$background"
                />
                <Button
                  size="$4"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  fontFamily="$body"
                  fontWeight="600"
                  color="$color11"
                  rounded="$4"
                  icon={Mail}
                  onPress={() => handleCreateInvitation(athleteEmail)}
                  disabled={isLoading || !athleteEmail}
                >
                  Generate Email-Specific Code
                </Button>
              </YStack>
            </Card>
          </YStack>

          {/* Pending Invitations */}
          {pendingInvitations && pendingInvitations.length > 0 && (
            <YStack gap="$3">
              <SectionLabel>PENDING INVITATIONS</SectionLabel>
              <YStack gap="$2">
                {pendingInvitations.map((invitation) => (
                  <Card
                    key={invitation._id}
                    p="$4"
                    bg="$surface"
                    rounded="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <XStack justify="space-between" items="center">
                      <YStack gap="$1">
                        <Text
                          fontFamily="monospace"
                          fontSize={18}
                          fontWeight="700"
                          color="$primary"
                          letterSpacing={4}
                        >
                          {invitation.inviteCode}
                        </Text>
                        {invitation.athleteEmail && (
                          <Text fontSize={12} color="$color10" fontFamily="$body">
                            For: {invitation.athleteEmail}
                          </Text>
                        )}
                        <Text fontSize={11} color="$color9" fontFamily="$body">
                          Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                        </Text>
                      </YStack>
                      <Button
                        size="$3"
                        bg="$red3"
                        color="$red11"
                        fontFamily="$body"
                        fontWeight="600"
                        rounded="$3"
                        onPress={() => handleRevokeInvitation(invitation._id)}
                      >
                        Revoke
                      </Button>
                    </XStack>
                  </Card>
                ))}
              </YStack>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
