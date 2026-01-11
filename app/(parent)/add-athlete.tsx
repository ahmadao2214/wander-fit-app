import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, Input, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import {
  UserPlus,
  Copy,
  Check,
  ArrowLeft,
  Clock,
  Link as LinkIcon,
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

const CodeDisplay = styled(Text, {
  fontFamily: '$mono',
  fontSize: 32,
  fontWeight: '700',
  letterSpacing: 6,
  color: '$primary',
  text: 'center',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AddAthleteScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCode, setGeneratedCode] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const createInvitation = useMutation(api.parentInvitations.createInvitation)

  const handleGenerateCode = async () => {
    setIsGenerating(true)
    setError('')

    try {
      const result = await createInvitation({})
      setGeneratedCode(result.inviteCode)
      setExpiresAt(result.expiresAt)
    } catch (err: any) {
      console.error('Failed to generate code:', err)
      setError(err?.message || 'Failed to generate invite code')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyCode = async () => {
    if (!generatedCode) return

    try {
      await Clipboard.setStringAsync(generatedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatExpiryDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Add Athlete',
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
                <UserPlus size={40} color="$primary" />
              </YStack>
              <DisplayHeading>ADD AN ATHLETE</DisplayHeading>
              <Subtitle>
                Generate an invite code to link with your athlete's account.
              </Subtitle>
            </YStack>

            {/* Error Message */}
            {error ? (
              <Card bg="$errorLight" p="$3" rounded="$3">
                <Text color="$error" text="center" fontSize={14} fontFamily="$body">
                  {error}
                </Text>
              </Card>
            ) : null}

            {/* Generated Code Display */}
            {generatedCode ? (
              <YStack gap="$4">
                <Card p="$6" bg="$surface" borderColor="$primary" borderWidth={2} rounded="$4">
                  <YStack gap="$4" items="center">
                    <Text fontSize={14} fontFamily="$body" color="$color10">
                      Share this code with your athlete
                    </Text>

                    <CodeDisplay>{generatedCode}</CodeDisplay>

                    <Button
                      size="$4"
                      bg={copied ? '$green9' : '$brand1'}
                      color={copied ? 'white' : '$primary'}
                      onPress={handleCopyCode}
                      icon={copied ? Check : Copy}
                      fontFamily="$body"
                      fontWeight="600"
                    >
                      {copied ? 'Copied!' : 'Copy Code'}
                    </Button>

                    {expiresAt && (
                      <XStack items="center" gap="$2">
                        <Clock size={14} color="$color9" />
                        <Text fontSize={12} fontFamily="$body" color="$color9">
                          Expires {formatExpiryDate(expiresAt)}
                        </Text>
                      </XStack>
                    )}
                  </YStack>
                </Card>

                {/* Instructions */}
                <Card p="$4" bg="$background" borderColor="$borderColor" borderWidth={1} rounded="$4">
                  <YStack gap="$3">
                    <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                      Next Steps:
                    </Text>

                    <XStack gap="$3" items="flex-start">
                      <YStack bg="$brand1" px="$2" py="$1" rounded="$2">
                        <Text fontSize={12} fontFamily="$body" fontWeight="700" color="$primary">
                          1
                        </Text>
                      </YStack>
                      <Text flex={1} fontSize={13} fontFamily="$body" color="$color11">
                        Share this code with your athlete (text, email, or tell them in person)
                      </Text>
                    </XStack>

                    <XStack gap="$3" items="flex-start">
                      <YStack bg="$brand1" px="$2" py="$1" rounded="$2">
                        <Text fontSize={12} fontFamily="$body" fontWeight="700" color="$primary">
                          2
                        </Text>
                      </YStack>
                      <Text flex={1} fontSize={13} fontFamily="$body" color="$color11">
                        They open their Wander Fit app and go to Profile → Link to Parent
                      </Text>
                    </XStack>

                    <XStack gap="$3" items="flex-start">
                      <YStack bg="$brand1" px="$2" py="$1" rounded="$2">
                        <Text fontSize={12} fontFamily="$body" fontWeight="700" color="$primary">
                          3
                        </Text>
                      </YStack>
                      <Text flex={1} fontSize={13} fontFamily="$body" color="$color11">
                        They enter the code and you'll be connected!
                      </Text>
                    </XStack>
                  </YStack>
                </Card>

                {/* Generate Another */}
                <Button
                  size="$4"
                  variant="outlined"
                  onPress={handleGenerateCode}
                  disabled={isGenerating}
                  icon={LinkIcon}
                  fontFamily="$body"
                >
                  Generate New Code
                </Button>
              </YStack>
            ) : (
              /* Initial State - Generate Button */
              <YStack gap="$4">
                <Card p="$5" bg="$surface" borderColor="$borderColor" borderWidth={1} rounded="$4">
                  <YStack gap="$3" items="center">
                    <LinkIcon size={32} color="$color10" />
                    <Text fontSize={14} fontFamily="$body" color="$color11" text="center">
                      Generate a unique 6-character code that your athlete can use to link their account to yours.
                    </Text>
                  </YStack>
                </Card>

                <Button
                  size="$5"
                  bg="$primary"
                  color="white"
                  onPress={handleGenerateCode}
                  disabled={isGenerating}
                  icon={isGenerating ? undefined : UserPlus}
                  fontFamily="$body"
                  fontWeight="700"
                  rounded="$4"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                >
                  {isGenerating ? (
                    <XStack items="center" gap="$2">
                      <Spinner size="small" color="white" />
                      <Text color="white" fontWeight="700">Generating...</Text>
                    </XStack>
                  ) : (
                    'Generate Invite Code'
                  )}
                </Button>
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
