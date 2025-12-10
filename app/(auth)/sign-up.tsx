import * as React from 'react'
import { Platform, ScrollView, KeyboardAvoidingView } from 'react-native'
import { Text, Input, YStack, XStack, Button, RadioGroup, Label, Card, Spinner } from 'tamagui'
import { useSignUp, useSSO, useUser, useClerk } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import * as AuthSession from 'expo-auth-session'
import { PublicOnlyRoute } from '../../components/AuthGuard'
import { useAuth } from '../../hooks/useAuth'

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const { startSSOFlow } = useSSO()
  const { user: clerkUser } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const createUser = useMutation(api.users.createUser)
  const acceptInvitation = useMutation(api.invitations.acceptInvitation)
  
  // Check if user is already authenticated with Clerk but needs Convex setup
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

      // If there's an invitation for this email, accept it
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

      // Navigate based on role - for now, everyone goes through intake
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
        // User already exists, sign them in
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
        // New user, complete signup immediately with selected role
        console.log('New OAuth user, completing signup with role:', role)
        
        const signUpAttempt = await signUp.create({})
        
        if (signUpAttempt.status === 'complete') {
          await setActive!({ session: signUpAttempt.createdSessionId })
          
          // Create user in Convex database with the pre-selected role
          await createUser({
            email: signUp.emailAddress!,
            name: `${signUp.firstName || ''} ${signUp.lastName || ''}`.trim() || signUp.emailAddress!,
            role: role, // Use the role selected in the main form
            clerkId: signUpAttempt.createdUserId!,
          })
          
          // Navigate based on role
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

    // Clear previous errors
    setError('')

    // Validate inputs
    if (!emailAddress || !password || !name) {
      setError('Please fill in all fields')
      return
    }

    // Start sign-up process using email and password provided
    try {
      await signUp.create({
        emailAddress,
        password,
      })

      // Send user an email with verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })

      // Set 'pendingVerification' to true to display second form
      // and capture OTP code
      setPendingVerification(true)
    } catch (err: any) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
      
      // Extract user-friendly error message from Clerk error
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

      // Use the code the user provided to attempt verification
      const signUpAttempt = await signUp.attemptEmailAddressVerification({
        code,
      })

      // If verification was completed, set the session to active
      // and create user in Convex
      if (signUpAttempt.status === 'complete') {
        await setActive({ session: signUpAttempt.createdSessionId })

        // Create user in Convex database
        try {
          const userId = await createUser({
            email: emailAddress,
            name: name,
            role: role,
            clerkId: signUpAttempt.createdUserId!,
          })

          // If there's an invitation for this email, accept it
          if (invitation && role === 'client') {
            try {
              await acceptInvitation({
                email: emailAddress,
                clientId: userId,
              })
            } catch (inviteErr) {
              console.error('Failed to accept invitation:', inviteErr)
              // Continue anyway - user is created
            }
          }
          
          // Navigate based on role
          if (role === 'trainer') {
            router.replace('/(trainer)')
          } else {
            router.replace('/(client)')
          }
        } catch (convexErr) {
          console.error('Failed to create user in Convex:', convexErr)
          // Still redirect to app, they can try again
          router.replace('/')
        }
      } else {
        // If the status is not complete, check why. User may need to
        // complete further steps.
        console.error(JSON.stringify(signUpAttempt, null, 2))
      }
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
    } finally {
      setIsCreatingUser(false)
    }
  }


  // Loading state while determining auth status
  if (isAuthLoading) {
    return (
      <YStack flex={1} items="center" justify="center" gap="$4" bg="$background">
        <Spinner size="large" color="$blue10" />
        <Text color="$gray11">Loading...</Text>
      </YStack>
    )
  }

  // User has Clerk account but needs Convex setup
  if (needsSetup && clerkUser) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} justify="center" gap="$4" px="$4" py="$6" maxW={400} mx="auto" width="100%">
            <YStack gap="$2" items="center">
              <Text fontSize="$8" fontWeight="bold">Complete Setup</Text>
              <Text text="center">
                Welcome! Let's finish setting up your account.
              </Text>
              <Text fontSize="$2" color="$gray11" text="center">
                Signed in as {clerkUser.emailAddresses?.[0]?.emailAddress}
              </Text>
            </YStack>

            {/* Error Message */}
            {error ? (
              <YStack bg="$red2" p="$3" rounded="$3">
                <Text color="$red10" text="center">{error}</Text>
              </YStack>
            ) : null}

            <YStack gap="$3">
              {/* Role Selection */}
              <YStack gap="$2">
                <Text fontWeight="600">I am a:</Text>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as 'trainer' | 'client')}
                >
                  <XStack gap="$4">
                    <XStack items="center" gap="$2">
                      <RadioGroup.Item value="client" id="client-setup" />
                      <Label htmlFor="client-setup">Client</Label>
                    </XStack>
                    <XStack items="center" gap="$2">
                      <RadioGroup.Item value="trainer" id="trainer-setup" />
                      <Label htmlFor="trainer-setup">Trainer</Label>
                    </XStack>
                  </XStack>
                </RadioGroup>
                <Text fontSize="$2">
                  {role === 'client' 
                    ? 'I want to follow workouts from my trainer' 
                    : 'I want to create workouts for my clients'
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
                size="$4"
              />

              {/* Complete Setup Button */}
              <Button
                onPress={onCompleteSetupPress}
                disabled={isCreatingUser || !name.trim()}
                theme="blue"
                fontWeight="600"
                size="$4"
                opacity={isCreatingUser ? 0.7 : 1}
              >
                {isCreatingUser ? 'Setting up...' : 'Complete Setup'}
              </Button>
            </YStack>

            {/* Sign out option */}
            <XStack justify="center" gap="$2">
              <Text fontSize="$2" color="$gray11">Not you?</Text>
              <Text 
                fontSize="$2" 
                fontWeight="600" 
                color="$blue10"
                onPress={onSignOutPress}
              >
                Sign out
              </Text>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} justify="center" gap="$4" px="$4" py="$6" maxW={400} mx="auto" width="100%">
            <YStack gap="$2" items="center">
              <Text fontSize="$8" fontWeight="bold">Verify your email</Text>
              <Text text="center">
                We sent a verification code to {emailAddress}
              </Text>
            </YStack>

            <YStack gap="$3">
              <Input
                value={code}
                placeholder="Enter verification code"
                onChangeText={(code) => setCode(code)}
                size="$4"
              />
              <Button
                onPress={onVerifyPress}
                disabled={isCreatingUser}
                theme="blue"
                fontWeight="600"
                size="$4"
              >
                {isCreatingUser ? 'Creating account...' : 'Verify & Continue'}
              </Button>
            </YStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }


  return (
    <PublicOnlyRoute>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <YStack flex={1} justify="center" gap="$4" px="$4" py="$6" maxW={400} mx="auto" width="100%">
            <YStack gap="$2" items="center">
              <Text fontSize="$8" fontWeight="bold">Create Account</Text>
              <Text text="center">
                Join WanderFit as a trainer or client
              </Text>
            </YStack>

            {/* Error Message */}
            {error ? (
              <YStack bg="$red2" p="$3" rounded="$3">
                <Text color="$red10" text="center">{error}</Text>
              </YStack>
            ) : null}

            <YStack gap="$3">
              {/* Role Selection - Moved to top */}
              <YStack gap="$2">
                <Text fontWeight="600">I am a:</Text>
                <RadioGroup
                  value={role}
                  onValueChange={(value) => setRole(value as 'trainer' | 'client')}
                >
                  <XStack gap="$4">
                    <XStack items="center" gap="$2">
                      <RadioGroup.Item value="client" id="client" />
                      <Label htmlFor="client">Client</Label>
                    </XStack>
                    <XStack items="center" gap="$2">
                      <RadioGroup.Item value="trainer" id="trainer" />
                      <Label htmlFor="trainer">Trainer</Label>
                    </XStack>
                  </XStack>
                </RadioGroup>
                <Text fontSize="$2">
                  {role === 'client' 
                    ? 'I want to follow workouts from my trainer' 
                    : 'I want to create workouts for my clients'
                  }
                </Text>
              </YStack>

              {/* OAuth Section - After role selection */}
              <Button
                onPress={onOAuthSignUpPress}
                theme="red"
                fontWeight="600"
                size="$4"
              >
                Continue with Google
              </Button>

              <XStack items="center" gap="$3">
                <Text fontSize="$3">OR</Text>
              </XStack>

              {/* Email/Password Section */}
              <Input
                value={name}
                placeholder="Full name"
                onChangeText={(name) => {
                  setName(name)
                  setError('')
                }}
                size="$4"
              />

              <Input
                autoCapitalize="none"
                value={emailAddress}
                placeholder="Email address"
                onChangeText={(email) => {
                  setEmailAddress(email)
                  setError('')
                }}
                size="$4"
              />

              <Input
                value={password}
                placeholder="Password"
                secureTextEntry={true}
                onChangeText={(password) => {
                  setPassword(password)
                  setError('')
                }}
                size="$4"
              />

              {/* Sign Up Button */}
              <Button
                onPress={onSignUpPress}
                theme="blue"
                fontWeight="600"
                size="$4"
              >
                Continue with Email
              </Button>
            </YStack>

            {/* Sign In Link */}
            <XStack justify="center" gap="$2">
              <Text>Already have an account?</Text>
              <Link href="/sign-in">
                <Text fontWeight="600">Sign in</Text>
              </Link>
            </XStack>
          </YStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </PublicOnlyRoute>
  )
}