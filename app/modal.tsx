import { Platform, TouchableOpacity } from 'react-native'
import { View, XStack, Text } from 'tamagui'
import { Authenticated, Unauthenticated, AuthLoading, useQuery } from "convex/react";
import { api } from 'convex/_generated/api'
import { GoogleOneTap } from '@clerk/clerk-expo/web'
import { useUser } from '@clerk/clerk-expo'
import { Link } from 'expo-router'
import { SignOutButton } from '../components/SignOutButton'


export default function ModalScreen() {
  const tasks = useQuery(api.tasks.get);
  const { user } = useUser()


  return (
    <View flex={1} items="center" justify="center">
      <XStack gap="$2" flexDirection="column" items="center">
        <Authenticated>
          <Text>Hello {user?.emailAddresses[0].emailAddress}</Text>
          <View>
            {tasks?.map((task) => (
              <Text key={task._id}>{task.text}</Text>
            ))}
          </View>
          <SignOutButton />
        </Authenticated>
        <Unauthenticated>
          {Platform.OS === 'web' && <GoogleOneTap />}
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity>
              <Text>Sign in</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity>
              <Text>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </Unauthenticated>
        <AuthLoading>
          <Text>AuthLoading</Text>
        </AuthLoading>
      </XStack>
    </View>
  )
}
