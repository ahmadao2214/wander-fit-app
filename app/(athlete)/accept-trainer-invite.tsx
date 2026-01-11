import { useState } from 'react'
import { YStack, XStack, Text, Input, Button, Card, Spinner, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { ArrowLeft, UserCheck, AlertCircle, Check } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 24,
  letterSpacing: 0.5,
  color: '$color12',
})

const CodeInput = styled(Input, {
  fontFamily: 'monospace',
  fontSize: 24,
  fontWeight: '700',
  letterSpacing: 6,
  text: 'center',
  textTransform: 'uppercase',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AcceptTrainerInviteScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const insets = useSafeAreaInsets()

  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [trainerName, setTrainerName] = useState('')

  const validateCode = useQuery(
    api.trainerInvitations.validateInviteCode,
    inviteCode.length === 6 ? { inviteCode: inviteCode.toUpperCase() } : "skip"
  )

  const acceptInvitation = useMutation(api.trainerInvitations.acceptInvitation)
  const hasActiveTrainer = useQuery(
    api.trainerRelationships.hasActiveTrainer,
    user ? { athleteUserId: user._id } : "skip"
  )

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric characters and limit to 6
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)
    setInviteCode(cleaned)
    setError('')
  }

  const handleAcceptInvitation = async () => {
    if (!user) {
      setError('You must be logged in')
      return
    }

    if (!validateCode?.valid) {
      setError(validateCode?.error || 'Invalid code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await acceptInvitation({
        inviteCode: inviteCode.toUpperCase(),
        athleteUserId: user._id,
      })

      setTrainerName(validateCode.invitation?.trainerName || 'Your trainer')
      setSuccess(true)

      // Redirect after a brief delay
      setTimeout(() => {
        router.back()
      }, 2500)
    } catch (err) {
      console.error('Error accepting invitation:', err)
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setIsLoading(false)
    }
  }

  // Already has a trainer
  if (hasActiveTrainer) {
    return (
      <YStack flex={1} bg="$background" px="$4" pt={insets.top + 16}>
        <XStack items="center" gap="$3" mb="$5">
          <Button
            size="$3"
            bg="$surface"
            borderWidth={1}
            borderColor="$borderColor"
            icon={ArrowLeft}
            onPress={() => router.back()}
            circular
          />
          <DisplayHeading>LINK TRAINER</DisplayHeading>
        </XStack>

        <Card
          p="$6"
          bg="$yellow2"
          rounded="$5"
          borderWidth={1}
          borderColor="$yellow8"
        >
          <YStack items="center" gap="$4">
            <YStack bg="$yellow5" p="$3" rounded="$10">
              <AlertCircle size={32} color="$yellow11" />
            </YStack>
            <YStack items="center" gap="$2">
              <Text fontFamily="$body" fontWeight="600" color="$yellow11" fontSize={16}>
                Already Linked
              </Text>
              <Text text="center" color="$yellow11" fontFamily="$body" fontSize={14}>
                You already have a trainer linked to your account.
                To link with a different trainer, please unlink your current trainer first from your profile.
              </Text>
            </YStack>
            <Button
              size="$4"
              bg="$yellow9"
              color="white"
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              onPress={() => router.push('/(athlete)/profile')}
            >
              Go to Profile
            </Button>
          </YStack>
        </Card>
      </YStack>
    )
  }

  // Success state
  if (success) {
    return (
      <YStack flex={1} bg="$background" px="$4" pt={insets.top + 16}>
        <Card
          p="$6"
          bg="$green2"
          rounded="$5"
          borderWidth={1}
          borderColor="$green8"
          mt="$10"
        >
          <YStack items="center" gap="$4">
            <YStack bg="$green5" p="$4" rounded="$10">
              <Check size={40} color="$green11" />
            </YStack>
            <YStack items="center" gap="$2">
              <Text fontFamily="$body" fontWeight="700" color="$green11" fontSize={18}>
                Successfully Linked!
              </Text>
              <Text text="center" color="$green11" fontFamily="$body" fontSize={14}>
                You are now connected with {trainerName}. They can now view your progress and customize your workouts.
              </Text>
            </YStack>
            <Text fontSize={12} color="$green10" fontFamily="$body">
              Redirecting...
            </Text>
          </YStack>
        </Card>
      </YStack>
    )
  }

  const isValidCode = validateCode?.valid === true
  const validationError = validateCode?.valid === false ? validateCode.error : null

  return (
    <YStack flex={1} bg="$background" px="$4" pt={insets.top + 16}>
      {/* Header */}
      <XStack items="center" gap="$3" mb="$5">
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
          <DisplayHeading>LINK TRAINER</DisplayHeading>
          <Text color="$color10" fontFamily="$body" fontSize={14}>
            Enter the code from your trainer
          </Text>
        </YStack>
      </XStack>

      {/* Code Entry */}
      <Card
        p="$5"
        bg="$brand1"
        rounded="$5"
        borderWidth={0}
        mb="$4"
      >
        <YStack items="center" gap="$4">
          <YStack bg="$primary" p="$3" rounded="$10">
            <UserCheck size={28} color="white" />
          </YStack>

          <YStack items="center" gap="$2" width="100%">
            <Text color="$color10" fontFamily="$body" fontSize={14}>
              Enter your 6-character invite code
            </Text>
            <CodeInput
              placeholder="XXXXXX"
              value={inviteCode}
              onChangeText={handleCodeChange}
              maxLength={6}
              autoCapitalize="characters"
              size="$5"
              bg="$background"
              width="100%"
            />
          </YStack>

          {/* Validation Status */}
          {inviteCode.length === 6 && (
            <YStack items="center" gap="$2">
              {validateCode === undefined ? (
                <XStack items="center" gap="$2">
                  <Spinner size="small" color="$color10" />
                  <Text color="$color10" fontFamily="$body" fontSize={13}>
                    Validating...
                  </Text>
                </XStack>
              ) : isValidCode ? (
                <Card p="$3" bg="$green3" rounded="$3" width="100%">
                  <XStack items="center" gap="$2" justify="center">
                    <Check size={16} color="$green11" />
                    <Text color="$green11" fontFamily="$body" fontWeight="600" fontSize={14}>
                      Valid code from {validateCode.invitation?.trainerName}
                    </Text>
                  </XStack>
                </Card>
              ) : (
                <Card p="$3" bg="$red3" rounded="$3" width="100%">
                  <XStack items="center" gap="$2" justify="center">
                    <AlertCircle size={16} color="$red11" />
                    <Text color="$red11" fontFamily="$body" fontSize={14}>
                      {validationError}
                    </Text>
                  </XStack>
                </Card>
              )}
            </YStack>
          )}
        </YStack>
      </Card>

      {/* Error Message */}
      {error && (
        <Card p="$3" bg="$red2" borderColor="$red8" borderWidth={1} mb="$4">
          <Text color="$red11" fontSize={14} fontFamily="$body">
            {error}
          </Text>
        </Card>
      )}

      {/* Accept Button */}
      <Button
        size="$5"
        bg={isValidCode ? '$primary' : '$color5'}
        color="white"
        fontFamily="$body"
        fontWeight="700"
        rounded="$4"
        pressStyle={{ opacity: 0.9, scale: 0.98 }}
        onPress={handleAcceptInvitation}
        disabled={!isValidCode || isLoading}
        icon={isLoading ? Spinner : undefined}
      >
        {isLoading ? 'Linking...' : 'Accept & Link Trainer'}
      </Button>

      {/* Info */}
      <Card
        p="$4"
        bg="$surface"
        rounded="$4"
        borderWidth={1}
        borderColor="$borderColor"
        mt="$4"
      >
        <YStack gap="$2">
          <Text fontFamily="$body" fontWeight="600" color="$color11" fontSize={14}>
            What happens when you link?
          </Text>
          <Text color="$color10" fontFamily="$body" fontSize={13}>
            Your trainer will be able to view your workout history, track your progress, and customize your training program. You can unlink at any time from your profile.
          </Text>
        </YStack>
      </Card>
    </YStack>
  )
}
