import * as React from 'react'
import { Platform, ScrollView, KeyboardAvoidingView } from 'react-native'
import { Text, Input, YStack, XStack, Button, RadioGroup, Label, Card, Spinner, styled } from 'tamagui'
import { useSignUp, useSSO, useUser, useClerk } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import * as AuthSession from 'expo-auth-session'
import { PublicOnlyRoute } from '../../components/AuthGuard'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Zap, UserPlus } from '@tamagui/lucide-icons'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 36,
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

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  color: '$color12',
})

const Divider = styled(YStack, {
  height: 1,
  flex: 1,
  bg: '$borderColor',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function SignUpScreen() {
  const insets = useSafeAreaInsets()
  const { isLoaded, signUp, setActive } = useSignUp()
  const { startSSOFlow } = useSSO()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const createUser = useMutation(api.users.createUser)
  const acceptInvitation = useMutation(api.invitations.acceptInvitation)
  
  const { needsSetup, isLoading: isAuthLoading } = useAuth()

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState<'trainer' | 'client'>('client')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [isCreatingUser, setIsCreatingUser] = React.useState(false)
  const [error, setError] = React.useState('')

  // Pre-fill name from Clerk user if they're completing setup
  React.useEffect(() => {
    if (clerkUser && needsSetup) {
      const clerkName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
      if (clerkName && !name) {
        setName(clerkName)
      }
      if (clerkUser.emailAddresses?.[0]?.emailAddress && !emailAddress) {
        setEmailAddress(clerkUser.emailAddresses[0].emailAddress)
      }
    }
  }, [clerkUser, needsSetup])

  // Check for invitation when email changes
  const invitation = useQuery(
    api.invitations.getInvitationByEmail,
    emailAddress ? { email: emailAddress } : "skip"
  )

  // Handle completing setup for users who already have a Clerk account
  const onCompleteSetupPress = async () => {
    if (!clerkUser) return

    setError('')
    setIsCreatingUser(true)

    try {
      const userId = await createUser({
        email: clerkUser.emailAddresses?.[0]?.emailAddress || emailAddress,
        name: name || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
        role: role,
        clerkId: clerkUser.id,
      })

      const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || emailAddress
      if (invitation && role === 'client' && userEmail) {
        try {
          await acceptInvitation({
            email: userEmail,
            clientId: userId,
          })
        } catch (inviteErr) {
          console.error('Failed to accept invitation:', inviteErr)
        }
      }

      if (Platform.OS !== 'web') {
        setTimeout(() => {
          router.replace('/')
        }, 500)
      } else {
        router.replace('/')
      }
    } catch (err: any) {
      console.error('Failed to complete setup:', err)
      setError(err?.message || 'Failed to complete account setup. Please try again.')
    } finally {
      setIsCreatingUser(false)
    }
  }

  // Handle signing out to start fresh
  const onSignOutPress = async () => {
    try {
      await signOut()
      router.replace('/(auth)/sign-in')
    } catch (err) {
      console.error('Failed to sign out:', err)
    }
  }

  // Handle OAuth sign-up
  const onOAuthSignUpPress = React.useCallback(async () => {
    try {
      const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
        strategy: 'oauth_google',
        redirectUrl: Platform.OS === 'web'
          ? AuthSession.makeRedirectUri()
          : Platform.OS === 'ios' || Platform.OS === 'android'
            ? AuthSession.makeRedirectUri({
                scheme: 'myapp',
                path: 'oauth'
              })
            : undefined,
      })

      if (createdSessionId) {
        setActive!({
          session: createdSessionId,
          navigate: async () => {
            if (Platform.OS !== 'web') {
              setTimeout(() => {
                router.replace('/')
              }, 500)
            } else {
              router.replace('/')
            }
          },
        })
      } else if (signUp) {
        const signUpAttempt = await signUp.create({})
        
        if (signUpAttempt.status === 'complete') {
          await setActive!({ session: signUpAttempt.createdSessionId })
          
          await createUser({
            email: signUp.emailAddress!,
            name: `${signUp.firstName || ''} ${signUp.lastName || ''}`.trim() || signUp.emailAddress!,
            role: role,
            clerkId: signUpAttempt.createdUserId!,
          })
          
          if (Platform.OS !== 'web') {
            setTimeout(() => {
              router.replace('/')
            }, 500)
          } else {
            router.replace('/')
          }
        }
      }
    } catch (err) {
      console.error('OAuth Sign-up Error:', JSON.stringify(err, null, 2))
    }
  }, [startSSOFlow, router, role, createUser])


  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return

    setError('')

    if (!emailAddress || !password || !name) {
      setError('Please fill in all fields')
      return
    }

    try {
      await signUp.create({
        emailAddress,
        password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setPendingVerification(true)
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2))
      
      const clerkError = err?.errors?.[0]
      if (clerkError) {
        if (clerkError.code === 'form_identifier_exists') {
          setError('An account with this email already exists. Please sign in instead.')
        } else if (clerkError.code === 'form_password_pwned') {
          setError('This password has been found in a data breach. Please use a different password.')
        } else if (clerkError.code === 'form_password_length_too_short') {
          setError('Password must be at least 8 characters long.')
        } else if (clerkError.code === 'form_param_format_invalid') {
          setError('Please enter a valid email address.')
        } else {
          setError(clerkError.longMessage || clerkError.message || 'Sign up failed. Please try again.')
        }
      } else {
        setError('Sign up failed. Please try again.')
      }
    }
  }

  // Handle submission of verification form
  const onVerifyPress = async () => {
    if (!isLoaded) return

    try {
      setIsCreatingUser(true)

      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId })

        try {
          const userId = await createUser({
            email: emailAddress,
            name: name,
            role: role,
            clerkId: signUpAttempt.createdUserId!,
          })

          if (invitation && role === 'client') {
            try {
              await acceptInvitation({
                email: emailAddress,
                clientId: userId,
              })
            } catch (inviteErr) {
              console.error('Failed to accept invitation:', inviteErr)
            }
          }
          
          if (role === 'trainer') {
            router.replace('/(trainer)')
          } else {
            router.replace('/(client)')
          }
        } catch (convexErr) {
          console.error('Failed to create user in Convex:', convexErr)
          router.replace('/')
        }
      } else {
        console.error(JSON.stringify(signUpAttempt, null, 2))
      }
    } catch (err) {
      console.error(JSON.stringify(err, null, 2))
    } finally {
      setIsCreatingUser(false)
    }
  }


  // Loading state
  if (isAuthLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">Loading...</Text>
      </YStack>
    )
  }

  // User has Clerk account but needs Convex setup
  if (needsSetup && clerkUser) {
    return (
      <YStack flex={1} bg="$background">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <YStack 
              flex={1} 
              justify="center" 
              gap="$5" 
              px="$5" 
              pt={insets.top + 40}
              pb={insets.bottom + 40}
              maxW={400} 
              mx="auto" 
              width="100%"
            >
              <YStack gap="$3" items="center">
                <YStack bg="$brand2" p="$4" rounded="$10">
                  <UserPlus size={40} color="$primary" />
                </YStack>
                <DisplayHeading>COMPLETE SETUP</DisplayHeading>
                <Subtitle>
                  Welcome! Let's finish setting up your account.
                </Subtitle>
                <Text 
                  fontSize={13} 
                  color="$color9" 
                  fontFamily="$body"
                >
                  Signed in as {clerkUser.emailAddresses?.[0]?.emailAddress}
                </Text>
              </YStack>

              {error ? (
                <Card bg="$errorLight" p="$3" rounded="$3">
                  <Text color="$error" text="center" fontSize={14} fontFamily="$body">
                    {error}
                  </Text>
                </Card>
              ) : null}

              <YStack gap="$4">
                {/* Role Selection */}
                <YStack gap="$2">
                  <SectionLabel>I am a:</SectionLabel>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as 'trainer' | 'client')}
                  >
                    <XStack gap="$4">
                      <XStack items="center" gap="$2">
                        <RadioGroup.Item value="client" id="client-setup" />
                        <Label htmlFor="client-setup" fontFamily="$body">Athlete</Label>
                      </XStack>
                      <XStack items="center" gap="$2">
                        <RadioGroup.Item value="trainer" id="trainer-setup" />
                        <Label htmlFor="trainer-setup" fontFamily="$body">Trainer</Label>
                      </XStack>
                    </XStack>
                  </RadioGroup>
                  <Text fontSize={13} color="$color10" fontFamily="$body">
                    {role === 'client' 
                      ? 'I want to follow a training program' 
                      : 'I want to create programs for my athletes'
                    }
                  </Text>
                </YStack>

                {/* Name Input */}
                <Input
                  value={name}
                  placeholder="Full name"
                  onChangeText={(text) => {
                    setName(text)
                    setError('')
                  }}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                />

                {/* Complete Setup Button */}
                <Button
                  onPress={onCompleteSetupPress}
                  disabled={isCreatingUser || !name.trim()}
                  size="$5"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  opacity={isCreatingUser ? 0.7 : 1}
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                >
                  {isCreatingUser ? 'Setting up...' : 'Complete Setup'}
                </Button>
              </YStack>

              {/* Sign out option */}
              <XStack justify="center" gap="$2">
                <Text fontSize={13} color="$color10" fontFamily="$body">
                  Not you?
                </Text>
                <Text 
                  fontSize={13} 
                  fontFamily="$body" fontWeight="600"
                  color="$primary"
                  onPress={onSignOutPress}
                >
                  Sign out
                </Text>
              </XStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    )
  }

  // Verification screen
  if (pendingVerification) {
    return (
      <YStack flex={1} bg="$background">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <YStack 
              flex={1} 
              justify="center" 
              gap="$5" 
              px="$5" 
              pt={insets.top + 40}
              pb={insets.bottom + 40}
              maxW={400} 
              mx="auto" 
              width="100%"
            >
              <YStack gap="$3" items="center">
                <DisplayHeading>VERIFY EMAIL</DisplayHeading>
                <Subtitle>
                  We sent a verification code to{'\n'}{emailAddress}
                </Subtitle>
              </YStack>

              <YStack gap="$4">
                <Input
                  value={code}
                  placeholder="Enter verification code"
                  onChangeText={(code) => setCode(code)}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  text="center"
                  fontSize={20}
                  letterSpacing={4}
                  focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                />
                <Button
                  onPress={onVerifyPress}
                  disabled={isCreatingUser}
                  size="$5"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                >
                  {isCreatingUser ? 'Creating account...' : 'Verify & Continue'}
                </Button>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    )
  }


  return (
    <PublicOnlyRoute>
      <YStack flex={1} bg="$background">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <YStack 
              flex={1} 
              justify="center" 
              gap="$5" 
              px="$5" 
              pt={insets.top + 20}
              pb={insets.bottom + 40}
              maxW={400} 
              mx="auto" 
              width="100%"
            >
              {/* Header */}
              <YStack gap="$3" items="center">
                <YStack bg="$brand2" p="$4" rounded="$10">
                  <Zap size={40} color="$primary" />
                </YStack>
                <DisplayHeading>CREATE ACCOUNT</DisplayHeading>
                <Subtitle>
                  Join as an athlete or trainer
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

              <YStack gap="$4">
                {/* Role Selection */}
                <YStack gap="$2">
                  <SectionLabel>I am a:</SectionLabel>
                  <RadioGroup
                    value={role}
                    onValueChange={(value) => setRole(value as 'trainer' | 'client')}
                  >
                    <XStack gap="$4">
                      <XStack items="center" gap="$2">
                        <RadioGroup.Item value="client" id="client" />
                        <Label htmlFor="client" fontFamily="$body">Athlete</Label>
                      </XStack>
                      <XStack items="center" gap="$2">
                        <RadioGroup.Item value="trainer" id="trainer" />
                        <Label htmlFor="trainer" fontFamily="$body">Trainer</Label>
                      </XStack>
                    </XStack>
                  </RadioGroup>
                  <Text fontSize={13} color="$color10" fontFamily="$body">
                    {role === 'client' 
                      ? 'I want to follow a training program' 
                      : 'I want to create programs for my athletes'
                    }
                  </Text>
                </YStack>

                {/* OAuth Section */}
                <Button
                  onPress={onOAuthSignUpPress}
                  size="$5"
                  bg="$surface"
                  borderWidth={2}
                  borderColor="$borderColor"
                  fontFamily="$body" fontWeight="600"
                  color="$color12"
                  rounded="$4"
                  pressStyle={{ bg: '$surfaceHover' }}
                >
                  Continue with Google
                </Button>

                <XStack items="center" gap="$3">
                  <Divider />
                  <Text 
                    fontSize={12} 
                    color="$color10" 
                    fontFamily="$body"
                    fontWeight="500"
                    letterSpacing={1}
                  >
                    OR
                  </Text>
                  <Divider />
                </XStack>

                {/* Email/Password Section */}
                <Input
                  value={name}
                  placeholder="Full name"
                  onChangeText={(name) => {
                    setName(name)
                    setError('')
                  }}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                />

                <Input
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={emailAddress}
                  placeholder="Email address"
                  onChangeText={(email) => {
                    setEmailAddress(email)
                    setError('')
                  }}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                />

                <Input
                  value={password}
                  placeholder="Password"
                  secureTextEntry={true}
                  onChangeText={(password) => {
                    setPassword(password)
                    setError('')
                  }}
                  size="$5"
                  bg="$surface"
                  borderWidth={1}
                  borderColor="$borderColor"
                  rounded="$4"
                  fontFamily="$body"
                  focusStyle={{ borderColor: '$primary', borderWidth: 2 }}
                />

                {/* Sign Up Button */}
                <Button
                  onPress={onSignUpPress}
                  size="$5"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                >
                  Continue with Email
                </Button>
              </YStack>

              {/* Sign In Link */}
              <XStack justify="center" gap="$2">
                <Text fontFamily="$body" color="$color10">
                  Already have an account?
                </Text>
                <Link href="/sign-in">
                  <Text fontFamily="$body" fontWeight="600" color="$primary">
                    Sign in
                  </Text>
                </Link>
              </XStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    </PublicOnlyRoute>
  )
}
