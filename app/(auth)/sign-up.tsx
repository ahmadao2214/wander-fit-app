import * as React from 'react'
import { Platform, ScrollView, KeyboardAvoidingView, Keyboard } from 'react-native'
import { Text, Input, YStack, XStack, Button, RadioGroup, Label, Card, Spinner, styled } from 'tamagui'
import { useSignUp, useSSO, useUser, useClerk } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import * as AuthSession from 'expo-auth-session'
import { PublicOnlyRoute } from '../../components/AuthGuard'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Zap, UserPlus, User, Users, Eye, EyeOff } from '@tamagui/lucide-icons'
import { RadioButton } from '../../components/RadioButton'
import { GoogleIcon } from '../../components/GoogleIcon'
import { VerificationCodeInput } from '../../components/VerificationCodeInput'

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
  const [emailError, setEmailError] = React.useState('')
  const [passwordError, setPasswordError] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)

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

    // Dismiss keyboard immediately on submit
    Keyboard.dismiss()

    // Clear all errors
    setError('')
    setEmailError('')
    setPasswordError('')

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
      
      // Process all Clerk errors and set field-level + general errors
      const clerkErrors = err?.errors
      if (clerkErrors && clerkErrors.length > 0) {
        const generalErrors: string[] = []
        
        for (const clerkError of clerkErrors) {
          if (clerkError.code === 'form_identifier_exists') {
            setEmailError('This email is already registered.')
            generalErrors.push('An account with this email already exists. Please sign in instead.')
          } else if (clerkError.code === 'form_password_pwned') {
            setPasswordError('This password was found in a data breach.')
            generalErrors.push('Please use a different password.')
          } else if (clerkError.code === 'form_password_length_too_short') {
            setPasswordError('Must be at least 8 characters.')
            generalErrors.push('Password must be at least 8 characters long.')
          } else if (clerkError.code === 'form_param_format_invalid') {
            setEmailError('Invalid email format.')
            generalErrors.push('Please enter a valid email address.')
          } else {
            generalErrors.push(clerkError.longMessage || clerkError.message || 'Sign up failed.')
          }
        }
        
        // Set general error (deduplicated)
        const uniqueErrors = [...new Set(generalErrors)]
        setError(uniqueErrors.join(' '))
      } else {
        setError('Sign up failed. Please try again.')
      }
    }
  }

  // Auto-submit when code is complete (6 digits)
  React.useEffect(() => {
    if (code.length === 6 && pendingVerification && !isCreatingUser) {
      onVerifyPress()
    }
  }, [code, pendingVerification, isCreatingUser])

  // Handle resending verification code
  const onResendCode = async () => {
    if (!isLoaded) return

    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setCode('')
      setError('')
    } catch (err: any) {
      console.error('Failed to resend code:', err)
      setError('Failed to resend code. Please try again.')
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


  // Verification screen
  if (pendingVerification) {
    return (
      <YStack flex={1} bg="$background">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          enabled={Platform.OS === 'ios'}
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
                <VerificationCodeInput
                  value={code}
                  onChange={setCode}
                  length={6}
                />
                <Button
                  onPress={onVerifyPress}
                  disabled={isCreatingUser}
                  size="$5"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  hoverStyle={{ bg: '#1d4ed8', opacity: 0.95 }}
                  pressStyle={{ bg: '#1e40af', scale: 0.98 }}
                >
                  {isCreatingUser ? 'Creating account...' : 'Verify & Continue'}
                </Button>
              </YStack>

              <XStack justify="center" gap="$2">
                <Text fontSize={13} color="$color10" fontFamily="$body">
                  Didn't receive the code?
                </Text>
                <Text
                  fontSize={13}
                  fontFamily="$body" fontWeight="600"
                  color="$primary"
                  onPress={onResendCode}
                  cursor="pointer"
                  hoverStyle={{ opacity: 0.8 }}
                >
                  Resend
                </Text>
              </XStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </YStack>
    )
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
                    <XStack gap="$3">
                      <RadioButton
                        value="client"
                        id="client-setup"
                        label="Athlete"
                        description="Follow a training program"
                        checked={role === 'client'}
                        icon={User}
                        onPress={() => setRole('client')}
                      />
                      <RadioButton
                        value="trainer"
                        id="trainer-setup"
                        label="Trainer"
                        description="Create programs for athletes"
                        checked={role === 'trainer'}
                        icon={Users}
                        onPress={() => setRole('trainer')}
                      />
                    </XStack>
                  </RadioGroup>
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
                  hoverStyle={{ bg: '#1d4ed8', opacity: 0.95 }}
                  pressStyle={{ bg: '#1e40af', scale: 0.98 }}
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
                  cursor="pointer"
                  hoverStyle={{ opacity: 0.8 }}
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
                    <XStack gap="$3">
                      <RadioButton
                        value="client"
                        id="client"
                        label="Athlete"
                        description="Follow a training program"
                        checked={role === 'client'}
                        icon={User}
                        onPress={() => setRole('client')}
                      />
                      <RadioButton
                        value="trainer"
                        id="trainer"
                        label="Trainer"
                        description="Create programs for athletes"
                        checked={role === 'trainer'}
                        icon={Users}
                        onPress={() => setRole('trainer')}
                      />
                    </XStack>
                  </RadioGroup>
                </YStack>

                {/* OAuth Section */}
                <Button
                  onPress={onOAuthSignUpPress}
                  size="$5"
                  bg="white"
                  borderWidth={1}
                  borderColor="#dadce0"
                  fontFamily="$body" fontWeight="500"
                  color="#3c4043"
                  rounded="$3"
                  hoverStyle={{ bg: '#f1f3f4', borderColor: '#c0c4c7' }}
                  pressStyle={{ bg: '#e8eaed', scale: 0.98 }}
                  icon={<GoogleIcon size={20} />}
                  iconAfter={false}
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

                <YStack gap="$1">
                  <Input
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={emailAddress}
                    placeholder="Email address"
                    onChangeText={(email) => {
                      setEmailAddress(email)
                      setError('')
                      setEmailError('')
                    }}
                    size="$5"
                    bg="$surface"
                    borderWidth={emailError ? 2 : 1}
                    borderColor={emailError ? '$error' : '$borderColor'}
                    rounded="$4"
                    fontFamily="$body"
                    focusStyle={{ borderColor: emailError ? '$error' : '$primary', borderWidth: 2 }}
                  />
                  {emailError ? (
                    <Text color="$error" fontSize={12} fontFamily="$body" pl="$1">
                      {emailError}
                    </Text>
                  ) : null}
                </YStack>

                <YStack gap="$1">
                  <XStack position="relative">
                    <Input
                      value={password}
                      placeholder="Password"
                      secureTextEntry={!showPassword}
                      onChangeText={(password) => {
                        setPassword(password)
                        setError('')
                        setPasswordError('')
                      }}
                      size="$5"
                      bg="$surface"
                      borderWidth={passwordError ? 2 : 1}
                      borderColor={passwordError ? '$error' : '$borderColor'}
                      rounded="$4"
                      fontFamily="$body"
                      focusStyle={{ borderColor: passwordError ? '$error' : '$primary', borderWidth: 2 }}
                      flex={1}
                      pr="$10"
                    />
                    <XStack
                      position="absolute"
                      right="$3"
                      top={0}
                      bottom={0}
                      items="center"
                      justify="center"
                      onPress={() => setShowPassword(!showPassword)}
                      cursor="pointer"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {showPassword ? (
                        <EyeOff size={20} color="$color10" />
                      ) : (
                        <Eye size={20} color="$color10" />
                      )}
                    </XStack>
                  </XStack>
                  {passwordError ? (
                    <Text color="$error" fontSize={12} fontFamily="$body" pl="$1">
                      {passwordError}
                    </Text>
                  ) : null}
                </YStack>

                {/* Sign Up Button */}
                <Button
                  onPress={onSignUpPress}
                  size="$5"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  hoverStyle={{ bg: '#1d4ed8', opacity: 0.95 }}
                  pressStyle={{ bg: '#1e40af', scale: 0.98 }}
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
                  <Text fontFamily="$body" fontWeight="600" color="$primary" cursor="pointer" hoverStyle={{ opacity: 0.8 }}>
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
