import { YStack, XStack, Text, Card, ScrollView, styled, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
  Layers,
  Target,
  Dumbbell,
  Zap,
  Clock,
  Activity,
  Users,
  Flame,
  Trophy,
} from '@tamagui/lucide-icons'
import { ScienceSection } from '../../../components/training-science/ScienceSection'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 0.5,
  color: '$color12',
})

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

const BodyText = styled(Text, {
  fontFamily: '$body',
  fontSize: 14,
  lineHeight: 22,
  color: '$color11',
})

const SubHeading = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 15,
  color: '$color12',
})

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY INFO MAPPING
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_INFO: Record<number, {
  name: string
  emphasis: string
  description: string
  icon: typeof Zap
  color: string
  bgColor: string
}> = {
  1: {
    name: 'Endurance',
    emphasis: 'Work Capacity & Conditioning',
    description: 'Your program emphasizes building aerobic capacity and muscular endurance. Higher volume training with shorter rest periods develops the stamina your sport demands.',
    icon: Activity,
    color: '$catEndurance',
    bgColor: '$catEnduranceLight',
  },
  2: {
    name: 'Power',
    emphasis: 'Explosive Movements & Athleticism',
    description: 'Your program emphasizes explosive power and vertical athleticism. Balanced strength and plyometric training develops the quick, powerful movements your sport requires.',
    icon: Zap,
    color: '$catPower',
    bgColor: '$catPowerLight',
  },
  3: {
    name: 'Rotational',
    emphasis: 'Core Strength & Rotational Power',
    description: 'Your program emphasizes rotational core strength and unilateral power. Training develops the torso stability and hip rotation your sport demands.',
    icon: Target,
    color: '$catRotation',
    bgColor: '$catRotationLight',
  },
  4: {
    name: 'Strength',
    emphasis: 'Maximum Strength & Power',
    description: 'Your program emphasizes building maximum strength and explosive power. Higher intensity training with longer rest periods develops the raw strength your sport requires.',
    icon: Dumbbell,
    color: '$catStrength',
    bgColor: '$catStrengthLight',
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function TrainingSciencePage() {
  const { user, isLoading: authLoading } = useAuth()

  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : 'skip'
  )

  const category = programState?.gppCategoryId
    ? CATEGORY_INFO[programState.gppCategoryId]
    : null

  if (authLoading) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading...
        </Text>
      </YStack>
    )
  }

  const insets = useSafeAreaInsets()
  
  return (
    <ScrollView
      flex={1}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      bg="$background"
    >
      <YStack
        gap="$4"
        px="$4"
        pt={insets.top + 16}
        pb={insets.bottom + 16}
        maxW={800}
        width="100%"
        self="center"
      >
          {/* Hero Section */}
          <Card bg="$brand1" p="$4" rounded="$4">
            <YStack gap="$2">
              <DisplayHeading>UNDERSTAND YOUR PROGRAM</DisplayHeading>
              <BodyText color="$color10">
                Your training is built on sports science principles, personalized for your sport, age, and experience level.
              </BodyText>
            </YStack>
          </Card>

          {/* The Three Phases */}
          <ScienceSection
            title="The Three Phases"
            icon={Layers}
            iconColor="$primary"
            iconBgColor="$brand2"
            defaultExpanded
          >
            <BodyText>
              Your program follows a proven periodization model with three distinct training phases, each building on the last.
            </BodyText>

            {/* GPP */}
            <Card bg="$blue3" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$blue9">
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Target size={16} color="$blue9" />
                  <SubHeading color="$blue11">GPP: Building Your Foundation</SubHeading>
                </XStack>
                <BodyText color="$blue11">
                  General Physical Preparation focuses on movement quality, work capacity, and injury prevention. Think of this as building the engine.
                </BodyText>
                <Text fontSize={12} fontFamily="$body" color="$blue10">
                  Lighter loads (60-75%) • Higher reps • Controlled tempo
                </Text>
              </YStack>
            </Card>

            {/* SPP */}
            <Card bg="$orange3" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$accent">
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Flame size={16} color="$accent" />
                  <SubHeading color="$orange11">SPP: Sports Physical Preparedness</SubHeading>
                </XStack>
                <BodyText color="$orange11">
                  Sports Physical Preparedness builds sport-ready athleticism. Now we develop the physical qualities your sport demands.
                </BodyText>
                <Text fontSize={12} fontFamily="$body" color="$orange10">
                  Moderate loads (75-85%) • Sport movements • Faster tempo
                </Text>
              </YStack>
            </Card>

            {/* SSP */}
            <Card bg="$green3" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$green9">
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Trophy size={16} color="$green9" />
                  <SubHeading color="$green11">SSP: Sports Specific Preparation</SubHeading>
                </XStack>
                <BodyText color="$green11">
                  Sports Specific Preparation is about competition readiness. Lower volume, higher intensity, maintaining your gains. Time to race.
                </BodyText>
                <Text fontSize={12} fontFamily="$body" color="$green10">
                  Higher loads (85-90%) • Lower volume • Explosive tempo
                </Text>
              </YStack>
            </Card>
          </ScienceSection>

          {/* Understanding Your Numbers */}
          <ScienceSection
            title="Understanding Your Numbers"
            icon={Dumbbell}
            iconColor="$primary"
            iconBgColor="$brand2"
          >
            {/* 1RM */}
            <YStack gap="$2">
              <SubHeading>What is 1RM?</SubHeading>
              <BodyText>
                Your One Rep Max (1RM) is the maximum weight you can lift for a single repetition. Even if you never test it directly, we estimate it from your workout history.
              </BodyText>
              <Card bg="$color3" p="$3" rounded="$3">
                <BodyText>
                  <Text fontWeight="600">Why it matters:</Text> All your training weights are calculated as a percentage of your 1RM. When you see "75% intensity," that means 75% of your estimated max.
                </BodyText>
              </Card>
            </YStack>

            {/* Prescription */}
            <YStack gap="$2" pt="$2">
              <SubHeading>Reading Your Prescription</SubHeading>
              <BodyText>
                Each exercise shows a prescription like "4 × 8 @ 135 lbs" which means:
              </BodyText>
              <Card bg="$color3" p="$3" rounded="$3">
                <YStack gap="$1">
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">4</Text> = Sets (how many rounds)
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">8</Text> = Reps (lifts per set)
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">135 lbs</Text> = Target weight
                  </Text>
                </YStack>
              </Card>
            </YStack>

            {/* Tempo */}
            <YStack gap="$2" pt="$2">
              <SubHeading>Tempo Notation (e.g., "2.1.2")</SubHeading>
              <BodyText>
                Tempo controls how fast you move the weight. The three numbers represent seconds for each phase of the lift:
              </BodyText>
              <Card bg="$color3" p="$3" rounded="$3">
                <YStack gap="$1">
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">First number (2)</Text> = Eccentric (lowering)
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">Second number (1)</Text> = Pause at bottom
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">Third number (2)</Text> = Concentric (lifting)
                  </Text>
                </YStack>
              </Card>
              <BodyText>
                Early phases use controlled tempos to build strength. Later phases use explosive tempo (shown as "x.x.x") to develop power.
              </BodyText>
            </YStack>
          </ScienceSection>

          {/* Training Intensity */}
          <ScienceSection
            title="Training Intensity"
            icon={Activity}
            iconColor="$primary"
            iconBgColor="$brand2"
          >
            <BodyText>
              Your daily workout intensity varies between Low, Moderate, and High to optimize recovery and adaptation.
            </BodyText>

            {/* Intensity Levels */}
            <YStack gap="$2">
              <Card bg="$intensityLow2" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$intensityLow6">
                <YStack gap="$1">
                  <SubHeading color="$intensityLow6">Low Intensity</SubHeading>
                  <BodyText>
                    Recovery focus. 60-70% effort with longer rest. You should feel like you have 4-5 reps left after each set.
                  </BodyText>
                </YStack>
              </Card>

              <Card bg="$intensityMed2" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$intensityMed6">
                <YStack gap="$1">
                  <SubHeading color="$intensityMed6">Moderate Intensity</SubHeading>
                  <BodyText>
                    Standard training. 75-80% effort with balanced rest. You should feel like you have 3-4 reps left.
                  </BodyText>
                </YStack>
              </Card>

              <Card bg="$intensityHigh2" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$intensityHigh6">
                <YStack gap="$1">
                  <SubHeading color="$intensityHigh6">High Intensity</SubHeading>
                  <BodyText>
                    Pushing limits. 85-90% effort with shorter rest. You should feel like you have only 1-2 reps left.
                  </BodyText>
                </YStack>
              </Card>
            </YStack>

            {/* RPE */}
            <YStack gap="$2" pt="$2">
              <SubHeading>RPE: Rate of Perceived Exertion</SubHeading>
              <BodyText>
                RPE is a 1-10 scale for how hard a set felt. It helps you adjust in real-time because your strength varies day to day.
              </BodyText>
              <Card bg="$color3" p="$3" rounded="$3">
                <YStack gap="$1">
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">RPE 5-6:</Text> Moderate effort, 4-5 reps left
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">RPE 7-8:</Text> Hard effort, 2-3 reps left
                  </Text>
                  <Text fontFamily="$body" fontSize={14} color="$color11">
                    <Text fontWeight="600">RPE 9-10:</Text> Maximum effort, 0-1 reps left
                  </Text>
                </YStack>
              </Card>
            </YStack>
          </ScienceSection>

          {/* Your Sport Category - Personalized */}
          {category && (
            <ScienceSection
              title="Your Sport Category"
              icon={Trophy}
              iconColor="$primary"
              iconBgColor="$brand2"
            >
              <Card
                bg="$brand1"
                p="$3"
                rounded="$3"
                borderLeftWidth={3}
                borderLeftColor="$primary"
              >
                <YStack gap="$2">
                  <XStack items="center" gap="$2">
                    <category.icon size={18} color="$primary" />
                    <SubHeading color="$primary">
                      Category {programState?.gppCategoryId}: {category.name}
                    </SubHeading>
                  </XStack>
                  <Text fontSize={13} fontFamily="$body" fontWeight="600" color="$brand9">
                    Emphasis: {category.emphasis}
                  </Text>
                </YStack>
              </Card>
              <BodyText>{category.description}</BodyText>
              <BodyText>
                Athletes in different sports have different training needs. Your category determines the balance of volume, intensity, rest periods, and movement types in your program.
              </BodyText>
            </ScienceSection>
          )}

          {/* Your Profile Factors */}
          <ScienceSection
            title="Your Profile Factors"
            icon={Users}
            iconColor="$primary"
            iconBgColor="$brand2"
          >
            <BodyText>
              Beyond your sport, two factors fine-tune your training prescription:
            </BodyText>

            <YStack gap="$2">
              <SubHeading>Age Considerations</SubHeading>
              <BodyText>
                Younger athletes (under 18) have modified intensity caps and rep ranges to support safe development. As athletes mature, they can handle higher intensities and volumes.
              </BodyText>
            </YStack>

            <YStack gap="$2">
              <SubHeading>Training Experience</SubHeading>
              <BodyText>
                Your years of training experience determines your starting position within prescribed ranges. More experienced athletes can handle higher volumes and intensities from the start.
              </BodyText>
            </YStack>

            <Card bg="$yellow3" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$yellow9">
              <BodyText color="$yellow11">
                These factors work together to ensure your program is challenging but appropriate for your current development level.
              </BodyText>
            </Card>
          </ScienceSection>

          {/* Rest Periods */}
          <ScienceSection
            title="Rest Periods"
            icon={Clock}
            iconColor="$primary"
            iconBgColor="$brand2"
          >
            <BodyText>
              Rest periods aren't random—they're designed to target specific energy systems and adaptations.
            </BodyText>

            <Card bg="$color3" p="$3" rounded="$3">
              <YStack gap="$2">
                <Text fontFamily="$body" fontSize={14} color="$color11">
                  <Text fontWeight="600">30 seconds:</Text> Builds work capacity and metabolic stress. Common in GPP phase.
                </Text>
                <Text fontFamily="$body" fontSize={14} color="$color11">
                  <Text fontWeight="600">60 seconds:</Text> Balanced recovery for moderate intensity work. Most common rest period.
                </Text>
                <Text fontFamily="$body" fontSize={14} color="$color11">
                  <Text fontWeight="600">90-120 seconds:</Text> Full neural recovery for heavy or explosive work. Used in peaking phases.
                </Text>
              </YStack>
            </Card>

            <BodyText>
              As you progress through phases, rest periods typically increase to allow for heavier loads and maximum power output.
            </BodyText>
          </ScienceSection>
        </YStack>
      </ScrollView>
  )
}
