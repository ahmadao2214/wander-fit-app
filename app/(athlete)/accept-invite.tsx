import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, Input, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Link as LinkIcon,
  ArrowLeft,
  Heart,
  Check,
  AlertCircle,
} from '@tamagui/lucide-icons'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
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
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AcceptInviteScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Look up invitation as user types (after 6 characters)
  const invitation = useQuery(
    api.parentInvitations.getInvitationByCode,
    code.length === 6 ? { code: code.toUpperCase() } : "skip"
  )

  const acceptInvitation = useMutation(api.parentInvitations.acceptInvitation)

  const handleCodeChange = (text: string) => {
    // Only allow alphanumeric, uppercase, max 6 characters
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCode(cleaned)
    setError('')
  }

  const handleSubmit = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-character code')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      await acceptInvitation({ code })
      setSuccess(true)
    } catch (err: any) {
      console.error('Failed to accept invitation:', err)
      setError(err?.message || 'Failed to link to parent')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (success) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Link to Parent',
            headerLeft: () => (
              <Button
                size="$3"
                bg="transparent"
                onPress={() => router.back()}
                icon={ArrowLeft}
                circular
              />
            ),
          }}
        />

        <YStack
          flex={1}
          bg="$background"
          items="center"
          justify="center"
          gap="$6"
          px="$6"
        >
          <YStack bg="$green3" p="$5" rounded="$10">
            <Check size={48} color="$green10" />
          </YStack>

          <YStack gap="$3" items="center">
            <DisplayHeading>LINKED!</DisplayHeading>
            <Subtitle>
              You're now connected to your parent. They can view your training schedule and progress.
            </Subtitle>
          </YStack>

          <Button
            size="$5"
            bg="$primary"
            color="white"
            onPress={() => router.back()}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
          >
            Done
          </Button>
        </YStack>
      </>
    )
  }

  // Determine invitation status for preview
  const isValidCode = code.length === 6
  const isInvitationValid = invitation && invitation.status === 'pending'
  const isInvitationExpired = invitation?.status === 'expired'
  const isInvitationUsed = invitation?.status === 'accepted'

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Link to Parent',
          headerLeft: () => (
            <Button
              size="$3"
              bg="transparent"
              onPress={() => router.back()}
              icon={ArrowLeft}
              circular
            />
          ),
        }}
      />

      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$6"
            px="$4"
            pt="$6"
            pb={insets.bottom + 40}
            maxW={500}
            width="100%"
            self="center"
          >
            {/* Header */}
            <YStack gap="$3" items="center">
              <YStack bg="$brand2" p="$4" rounded="$10">
                <LinkIcon size={40} color="$primary" />
              </YStack>
              <DisplayHeading>LINK TO PARENT</DisplayHeading>
              <Subtitle>
                Enter the 6-character code your parent shared with you.
              </Subtitle>
            </YStack>

            {/* Error Message */}
            {error ? (
              <Card bg="$errorLight" p="$3" rounded="$3">
                <XStack items="center" gap="$2">
                  <AlertCircle size={18} color="$error" />
                  <Text color="$error" fontSize={14} fontFamily="$body" flex={1}>
                    {error}
                  </Text>
                </XStack>
              </Card>
            ) : null}

            {/* Code Input */}
            <YStack gap="$4">
              <Input
                value={code}
                onChangeText={handleCodeChange}
                placeholder="XXXXXX"
                size="$6"
                bg="$surface"
                borderWidth={2}
                borderColor={
                  isInvitationValid
                    ? '$green9'
                    : isInvitationExpired || isInvitationUsed
                    ? '$error'
                    : isValidCode
                    ? '$yellow9'
                    : '$borderColor'
                }
                rounded="$4"
                fontFamily="$mono"
                fontSize={28}
                letterSpacing={8}
                text="center"
                autoCapitalize="characters"
                maxLength={6}
                focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
              />

              {/* Status Preview */}
              {isValidCode && invitation === undefined && (
                <XStack items="center" justify="center" gap="$2">
                  <Spinner size="small" color="$color10" />
                  <Text fontSize={13} fontFamily="$body" color="$color10">
                    Checking code...
                  </Text>
                </XStack>
              )}

              {isInvitationValid && (
                <Card p="$4" bg="$green2" borderColor="$green6" borderWidth={1} rounded="$4">
                  <XStack items="center" gap="$3">
                    <YStack bg="$green3" p="$2" rounded="$10">
                      <Heart size={18} color="$green10" />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$green11">
                        Valid Code
                      </Text>
                      <Text fontSize={13} fontFamily="$body" color="$green10">
                        From: {invitation.parentName}
                      </Text>
                    </YStack>
                  </XStack>
                </Card>
              )}

              {isInvitationExpired && (
                <Card p="$4" bg="$errorLight" borderColor="$error" borderWidth={1} rounded="$4">
                  <Text fontSize={14} fontFamily="$body" color="$error" text="center">
                    This invitation has expired. Ask your parent for a new code.
                  </Text>
                </Card>
              )}

              {isInvitationUsed && (
                <Card p="$4" bg="$errorLight" borderColor="$error" borderWidth={1} rounded="$4">
                  <Text fontSize={14} fontFamily="$body" color="$error" text="center">
                    This invitation has already been used.
                  </Text>
                </Card>
              )}

              {isValidCode && invitation === null && (
                <Card p="$4" bg="$errorLight" borderColor="$error" borderWidth={1} rounded="$4">
                  <Text fontSize={14} fontFamily="$body" color="$error" text="center">
                    Invalid code. Please check and try again.
                  </Text>
                </Card>
              )}
            </YStack>

            {/* Submit Button */}
            <Button
              size="$5"
              bg={isInvitationValid ? '$primary' : '$color6'}
              color="white"
              onPress={handleSubmit}
              disabled={!isInvitationValid || isSubmitting}
              icon={isSubmitting ? undefined : Heart}
              fontFamily="$body"
              fontWeight="700"
              rounded="$4"
              pressStyle={isInvitationValid ? { opacity: 0.9, scale: 0.98 } : {}}
            >
              {isSubmitting ? (
                <XStack items="center" gap="$2">
                  <Spinner size="small" color="white" />
                  <Text color="white" fontWeight="700">Linking...</Text>
                </XStack>
              ) : (
                'Link to Parent'
              )}
            </Button>

            {/* Help Text */}
            <Card p="$4" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
              <YStack gap="$2">
                <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                  Don't have a code?
                </Text>
                <Text fontSize={13} fontFamily="$body" color="$color10">
                  Ask your parent to create an invite code from their Wander Fit app. They can find this in Athletes → Add Athlete.
                </Text>
              </YStack>
            </Card>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
