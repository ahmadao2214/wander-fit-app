import * as React from 'react'
import { Text, Input, YStack, XStack, Button, RadioGroup, Label } from 'tamagui'
import { useSignUp } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const router = useRouter()
  const createUser = useMutation(api.users.createUser)

  const [emailAddress, setEmailAddress] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')
  const [role, setRole] = React.useState<'trainer' | 'client'>('client')
  const [pendingVerification, setPendingVerification] = React.useState(false)
  const [code, setCode] = React.useState('')
  const [isCreatingUser, setIsCreatingUser] = React.useState(false)

  // Handle submission of sign-up form
  const onSignUpPress = async () => {
    if (!isLoaded) return

    // Validate inputs
    if (!emailAddress || !password || !name) {
      console.error('Please fill in all fields')
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
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error(JSON.stringify(err, null, 2))
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
          await createUser({
            email: emailAddress,
            name: name,
            role: role,
            clerkId: signUpAttempt.createdUserId!,
          })

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

  if (pendingVerification) {
    return (
      <YStack flex={1} justify="center" gap="$4" px="$4" maxW={400} mx="auto" width="100%">
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
    )
  }

  {/*
No google signup button
                */}

  return (
    <YStack flex={1} justify="center" gap="$4" px="$4" maxW={400} mx="auto" width="100%">
      <YStack gap="$2" items="center">
        <Text fontSize="$8" fontWeight="bold">Create Account</Text>
        <Text text="center">
          Join WanderFit as a trainer or client
        </Text>
      </YStack>

      <YStack gap="$3">
        {/* Name Input */}
        <Input
          value={name}
          placeholder="Full name"
          onChangeText={(name) => setName(name)}
          size="$4"
        />

        {/* Email Input */}
        <Input
          autoCapitalize="none"
          value={emailAddress}
          placeholder="Email address"
          onChangeText={(email) => setEmailAddress(email)}
          size="$4"
        />

        {/* Password Input */}
        <Input
          value={password}
          placeholder="Password"
          secureTextEntry={true}
          onChangeText={(password) => setPassword(password)}
          size="$4"
        />

        {/* Role Selection */}
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

        {/* Sign Up Button */}
        <Button
          onPress={onSignUpPress}
          theme="blue"
          fontWeight="600"
          size="$4"
        >
          Continue
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
  )
}