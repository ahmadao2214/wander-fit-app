import { useState } from 'react'
import { YStack, XStack, H2, Text, Input, Button, Card, Spinner, Tabs, ScrollView } from 'tamagui'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { useAuth } from '../hooks/useAuth'
import { ArrowLeft, UserPlus, Mail, Users } from '@tamagui/lucide-icons'
import { TrainerOnlyRoute } from '../components/AuthGuard'

export default function AddClientScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const createInvitation = useMutation(api.invitations.createClientInvitation)
  const connectClient = useMutation(api.users.connectExistingClient)

  const [clientEmail, setClientEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successData, setSuccessData] = useState<{ name: string, email: string, type: 'invited' | 'connected' } | null>(null)
  const [activeTab, setActiveTab] = useState('invite')

  // Get unassigned clients for the connect tab
  const unassignedClients = useQuery(api.users.getUnassignedClients)

  const handleAddClient = async () => {
    if (!clientEmail || !clientName) {
      setError('Please fill in all fields')
      return
    }

    if (!user) {
      setError('You must be logged in as a trainer')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Create an invitation instead of a user directly
      await createInvitation({
        email: clientEmail,
        name: clientName,
        trainerId: user._id,
      })

      // Store success data before clearing form
      setSuccessData({ name: clientName, email: clientEmail, type: 'invited' })
      setSuccess(true)
      setClientEmail('')
      setClientName('')

      // Show success briefly then go back
      setTimeout(() => {
        router.back()
      }, 2000)

    } catch (err) {
      console.error('Error creating invitation:', err)
      setError('Failed to send invitation. They may already have been invited or exist in the system.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnectClient = async (client: any) => {
    if (!user) {
      setError('You must be logged in as a trainer')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await connectClient({
        clientId: client._id,
        trainerId: user._id,
      })

      // Store success data
      setSuccessData({ name: client.name, email: client.email, type: 'connected' })
      setSuccess(true)

      // Show success briefly then go back
      setTimeout(() => {
        router.back()
      }, 2000)

    } catch (err) {
      console.error('Error connecting client:', err)
      setError('Failed to connect client. They may already have a trainer.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <TrainerOnlyRoute>
        <YStack flex={1} bg="$background">
          <YStack
            flex={1}
            gap="$4"
            px="$4"
            pt="$6"
            maxW={1200}
            width="100%"
            self="center"
            $sm={{ px: "$6" }}
            $md={{ px: "$8" }}
          >
            <Card p="$6" bg="$green2" borderColor="$green8">
              <YStack items="center" gap="$4">
                <UserPlus size={48} color="$green10" />
                <H2 color="$green11">
                  {successData?.type === 'invited' ? 'Invitation Sent Successfully!' : 'Client Connected Successfully!'}
                </H2>
                <Text color="$green11">
                  {successData?.type === 'invited'
                    ? `An invitation has been sent to ${successData?.name} at ${successData?.email}. They can now sign up using that email to access workouts you create.`
                    : `${successData?.name} has been connected to your account. You can now create and assign workouts to them.`
                  }
                </Text>
                <Text fontSize="$2" color="$green10">
                  Redirecting back to dashboard...
                </Text>
              </YStack>
            </Card>
          </YStack>
        </YStack>
      </TrainerOnlyRoute>
    )
  }

  return (
    <TrainerOnlyRoute>
      <YStack flex={1} bg="$background">
        <YStack
          flex={1}
          gap="$4"
          px="$4"
          pt="$6"
          maxW={1200}
          width="100%"
          self="center"
        $sm={{ px: "$6" }}
        $md={{ px: "$8" }}
      >
        {/* Header */}
        <XStack items="center" gap="$3">
          <Button
            size="$3"
            variant="outlined"
            icon={ArrowLeft}
            onPress={() => router.back()}
            circular
          />
          <YStack flex={1}>
            <H2>Add New Client</H2>
            <Text color="gray">
              Add a client to your roster so they can access workouts you create
            </Text>
          </YStack>
        </XStack>

        {/* Error Message */}
        {error && (
          <Card p="$3" bg="$red2" borderColor="$red8">
            <Text color="$red11" fontSize="$3">
              {error}
            </Text>
          </Card>
        )}

        {/* Tabbed Interface */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="horizontal"
          flexDirection="column"
          borderWidth="$0.25"
          borderColor="$borderColor"
          bg="$background"
        >
          <Tabs.List
            separator={<></>}
            bg="$background"
            borderBottomWidth="$0.25"
            borderBottomColor="$borderColor"
          >
            <Tabs.Tab value="invite" flex={1}>
              <XStack items="center" gap="$2">
                <Mail size={16} />
                <Text>Invite New</Text>
              </XStack>
            </Tabs.Tab>
            <Tabs.Tab value="connect" flex={1}>
              <XStack items="center" gap="$2">
                <Users size={16} />
                <Text>Connect Existing</Text>
              </XStack>
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Content value="invite" p="$4">
            <YStack gap="$4">
              <YStack gap="$2">
                <Text fontWeight="600">Invite New Client</Text>
                <Text fontSize="$2" color="gray">
                  Send an invitation to someone who hasn't signed up yet
                </Text>
              </YStack>

              {/* Client Name */}
              <YStack gap="$2">
                <Text fontWeight="500">Full Name</Text>
                <Input
                  placeholder="e.g. John Smith"
                  value={clientName}
                  onChangeText={setClientName}
                  size="$4"
                />
              </YStack>

              {/* Client Email */}
              <YStack gap="$2">
                <Text fontWeight="500">Email Address</Text>
                <Input
                  placeholder="e.g. john@example.com"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  size="$4"
                />
                <Text fontSize="$2" color="gray">
                  They'll use this email to sign up for WanderFit
                </Text>
              </YStack>

              {/* Action Buttons */}
              <XStack gap="$3" >
                <Button
                  variant="outlined"
                  onPress={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  bg="$blue9"
                  color="white"
                  onPress={handleAddClient}
                  disabled={isLoading || !clientEmail || !clientName}
                  icon={isLoading ? Spinner : UserPlus}
                >
                  {isLoading ? 'Send Invitation' : 'Send Invitation'}
                </Button>
              </XStack>
            </YStack>
          </Tabs.Content>

          <Tabs.Content value="connect" p="$4">
            <YStack gap="$4">
              <YStack gap="$2">
                <Text fontWeight="600">Connect Existing Client</Text>
                <Text fontSize="$2" color="gray">
                  Connect with clients who have already signed up but don't have a trainer
                </Text>
              </YStack>

              <ScrollView height={300}>
                <YStack gap="$2">
                  {unassignedClients && unassignedClients.length > 0 ? (
                    unassignedClients.map((client) => (
                      <Card key={client._id} p="$3" backgroundColor="$background" borderColor="$borderColor">
                        <XStack >
                          <YStack gap="$1">
                            <Text fontWeight="600">{client.name}</Text>
                            <Text fontSize="$2" color="gray">
                              {client.email}
                            </Text>
                          </YStack>
                          <Button
                            size="$3"
                            bg="$green9"
                            color="white"
                            onPress={() => handleConnectClient(client)}
                            disabled={isLoading}
                          >
                            Connect
                          </Button>
                        </XStack>
                      </Card>
                    ))
                  ) : (
                    <Card p="$4" backgroundColor="gray" borderColor="black">
                      <YStack items="center" gap="$2">
                        <Text>
                          No available clients to connect
                        </Text>
                        <Text fontSize="$2">
                          All signed-up clients already have trainers assigned
                        </Text>
                      </YStack>
                    </Card>
                  )}
                </YStack>
              </ScrollView>
              <XStack gap="$3" >
                <Button
                  variant="outlined"
                  onPress={() => router.back()}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </XStack>
            </YStack>
          </Tabs.Content>
        </Tabs>
        </YStack>
      </YStack>
    </TrainerOnlyRoute>
  )
}
