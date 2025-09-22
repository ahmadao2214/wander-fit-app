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
                            scheme: 'wander-fit-app',
                            path: 'oauth'
                        })
                        : undefined,
            })

            // If sign in was successful, set the active session
            if (createdSessionId) {
                setActive!({
                    session: createdSessionId,
                    navigate: async () => router.replace('/'),
                })
            } else {
                // If there is no `createdSessionId`,
                // there are missing requirements, such as MFA
                // Use the `signIn` or `signUp` returned from `startSSOFlow`
                // to handle next steps
                console.log('Additional steps required:', signIn || signUp)
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

            // If sign-in process is complete, set the created session as active
            // and redirect the user
            if (signInAttempt.status === 'complete') {
                await setActive({ session: signInAttempt.createdSessionId })
                router.replace('/')
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
        <YStack gap="$4" flex={1} justify="center">
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
                    background="$red10"
                    color="white"
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
                <Button
                    onPress={onSignInPress}
                    background="$blue10"
                    color="white"
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