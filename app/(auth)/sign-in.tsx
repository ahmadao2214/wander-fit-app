import React, { useCallback, useEffect } from 'react'
import { useSignIn, useSSO } from '@clerk/clerk-expo'
import { Link, useRouter } from 'expo-router'
import { Platform } from 'react-native'
import { Text, Input, Button, YStack, XStack } from 'tamagui'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'

// Custom hook for warming up browser on Android
export const useWarmUpBrowser = () => {
    useEffect(() => {
        // Preloads the browser for Android devices to reduce authentication load time
        // See: https://docs.expo.dev/guides/authentication/#improving-user-experience
        Platform.OS === 'android' && void WebBrowser.warmUpAsync()
        return () => {
            // Cleanup: closes browser when component unmounts
            Platform.OS === 'android' && void WebBrowser.coolDownAsync()
        }
    }, [])
}

// Handle any pending authentication sessions
WebBrowser.maybeCompleteAuthSession()

export default function Page() {
    useWarmUpBrowser()

    const { signIn, setActive, isLoaded } = useSignIn()
    const { startSSOFlow } = useSSO()
    const router = useRouter()

    const [emailAddress, setEmailAddress] = React.useState('')
    const [password, setPassword] = React.useState('')

    // Handle OAuth sign-in
    const onOAuthPress = useCallback(async () => {
        try {
            // Start the authentication process by calling `startSSOFlow()`
            const { createdSessionId, setActive, signIn, signUp } = await startSSOFlow({
                strategy: 'oauth_google',
                // For web, defaults to current path
                // For native, you must pass a scheme, like AuthSession.makeRedirectUri({ scheme, path })
                redirectUrl: Platform.OS === 'web'
                    ? AuthSession.makeRedirectUri()
                    : Platform.OS === 'ios' || Platform.OS === 'android'
                        ? AuthSession.makeRedirectUri({
                            scheme: 'myapp',
                            path: 'oauth'
                        })
                        : undefined,
            })

            // If sign in was successful, set the active session
            if (createdSessionId) {
                setActive!({
                    session: createdSessionId,
                    navigate: async () => {
                        // Use same navigation logic as email/password sign-in
                        if (Platform.OS !== 'web') {
                            console.log('OAuth Mobile: Adding delay for auth state sync')
                            setTimeout(() => {
                                console.log('OAuth Mobile: Delayed navigation to /')
                                router.replace('/')
                            }, 500)
                        } else {
                            router.replace('/')
                        }
                    },
                })
            } else {
                // If there is no `createdSessionId`,
                // there are missing requirements, such as MFA
                // Use the `signIn` or `signUp` returned from `startSSOFlow`
                // to handle next steps
                console.log('Additional steps required:', signIn || signUp)
                
                // Check if this is a sign-up scenario (new user)
                if (signUp) {
                    console.log('New user detected, redirecting to sign-up')
                    router.push('/(auth)/sign-up')
                }
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error('OAuth Error:', JSON.stringify(err, null, 2))
        }
    }, [startSSOFlow, router])

    // Handle the submission of the sign-in form
    const onSignInPress = async () => {
        if (!isLoaded) return

        // Start the sign-in process using the email and password provided
        try {
            const signInAttempt = await signIn.create({
                identifier: emailAddress,
                password,
            })

            console.log('signInAttempt', signInAttempt)

            // If sign-in process is complete, set the created session as active
            // and redirect the user
            if (signInAttempt.status === 'complete') {
                console.log('Setting active session with ID:', signInAttempt.createdSessionId)
                await setActive({ session: signInAttempt.createdSessionId })
                console.log('Session set, attempting to navigate to /')
                
                // Add small delay on mobile for auth state to sync
                if (Platform.OS !== 'web') {
                    console.log('Mobile: Adding delay for auth state sync')
                    setTimeout(() => {
                        console.log('Mobile: Delayed navigation to /')
                        router.replace('/')
                    }, 500)
                } else {
                    router.replace('/')
                }
                console.log('Navigation called')
            } else {
                // If the status isn't complete, check why. User might need to
                // complete further steps.
                console.error(JSON.stringify(signInAttempt, null, 2))
            }
        } catch (err) {
            // See https://clerk.com/docs/custom-flows/error-handling
            // for more info on error handling
            console.error(JSON.stringify(err, null, 2))
        }
    }

    return (
        <YStack gap="$4" flex={1} justify="center" px="$4" maxW={400} mx="auto" width="100%">
            <YStack gap="$2" items="center">
                <Text fontSize="$8" fontWeight="bold">Sign in</Text>
                <Text text="center">
                    Welcome back! Please sign in to your account.
                </Text>
            </YStack>

            {/* OAuth Section */}
            <YStack gap="$3">
                <Button
                    onPress={onOAuthPress}
                    theme="red"
                    fontWeight="600"
                    size="$4"
                >
                    Continue with Google
                </Button>

                <XStack items="center" gap="$3">
                    <Text fontSize="$3">OR</Text>
                </XStack>
            </YStack>

            {/* Email/Password Section */}
            <YStack gap="$3">
                <Input
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Enter email"
                    onChangeText={(emailAddress) => setEmailAddress(emailAddress)}
                    size="$4"
                />
                <Input
                    value={password}
                    placeholder="Enter password"
                    secureTextEntry={true}
                    onChangeText={(password) => setPassword(password)}
                    size="$4"
                />
                {/*
                No Error Handling
                Signs in but doesn't redirect
                */}
                <Button
                    onPress={onSignInPress} // TODO: This is not redirecting as expected
                    theme="blue"
                    fontWeight="600"
                    size="$4"
                >
                    Continue
                </Button>
            </YStack>

            <XStack justify="center" gap="$2">
                <Text>Don't have an account?</Text>
                <Link href="/sign-up">
                    <Text fontWeight="600">Sign up</Text>
                </Link>
            </XStack>
        </YStack>
    )
}