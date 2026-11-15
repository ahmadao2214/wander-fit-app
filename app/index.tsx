import { Redirect } from 'expo-router'
import { YStack, Spinner } from 'tamagui'
import { useAuth } from '../hooks/useAuth'
import { useFirstRunDraft } from '../hooks/useFirstRunDraft'
import { rootRoute } from '../lib/firstRunRoutes'

/**
 * Where the app opens. Signed-in athletes with a program go to their tabs;
 * everyone else goes to the First Run at the step they last reached. See
 * `lib/firstRunRoutes.ts`.
 */
export default function IndexPage() {
  const { isLoading, isAuthenticated, user } = useAuth()
  const { draft } = useFirstRunDraft()

  const route = rootRoute({
    isLoading,
    isAuthenticated,
    hasProgram: !!user?.intakeCompletedAt,
    lastStep: draft?.lastStep ?? null,
  })

  if (!route) {
    return (
      <YStack flex={1} items="center" justify="center" bg="$background" testID="root-loading">
        <Spinner size="large" color="$primaryText" />
      </YStack>
    )
  }

  return <Redirect href={route} />
}
