import { Card, XStack, YStack, Text } from 'tamagui';
import { format } from 'date-fns';
import {
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Target,
  Dumbbell,
} from '@tamagui/lucide-icons';

interface SetData {
  repsCompleted?: number;
  weight?: number;
  rpe?: number;
  completed: boolean;
  skipped: boolean;
}

interface ExerciseData {
  exerciseId: string;
  name?: string;
  completed: boolean;
  skipped: boolean;
  sets?: SetData[];
}

interface WorkoutSession {
  _id: string;
  templateSnapshot?: {
    name?: string;
    phase?: string;
    week?: number;
    day?: number;
  };
  templateName?: string;
  startedAt: number;
  completedAt?: number;
  totalDurationSeconds?: number;
  status: string;
  targetIntensity?: string;
  exercises?: ExerciseData[];
  phase?: string;
  week?: number;
  day?: number;
}

interface WorkoutHistoryCardProps {
  session: WorkoutSession;
  isExpanded: boolean;
  onToggle: () => void;
}

export function WorkoutHistoryCard({
  session,
  isExpanded,
  onToggle,
}: WorkoutHistoryCardProps) {
  const durationMinutes = Math.round(
    (session.totalDurationSeconds ?? 0) / 60
  );
  const completedExercises =
    session.exercises?.filter((e) => e.completed).length ?? 0;
  const totalExercises = session.exercises?.length ?? 0;

  const workoutName =
    session.templateSnapshot?.name ?? session.templateName ?? 'Workout';
  const phase =
    session.templateSnapshot?.phase ?? session.phase;
  const week = session.templateSnapshot?.week ?? session.week;
  const day = session.templateSnapshot?.day ?? session.day;

  const displayDate = session.completedAt ?? session.startedAt;

  return (
    <Card
      padding="$3"
      backgroundColor="$background"
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius="$4"
      pressStyle={{ backgroundColor: '$backgroundHover' }}
      onPress={onToggle}
    >
      <YStack gap="$3">
        {/* Header Row */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$1">
            <Text fontSize="$4" fontWeight="600" color="$color12">
              {workoutName}
            </Text>
            {phase && (
              <Text fontSize="$2" color="$color11">
                {phase} W{week}D{day}
              </Text>
            )}
          </YStack>

          <XStack alignItems="center" gap="$2">
            {session.status === 'completed' ? (
              <CheckCircle size={18} color="$success" />
            ) : (
              <XCircle size={18} color="$error" />
            )}
            {isExpanded ? (
              <ChevronUp size={18} color="$color11" />
            ) : (
              <ChevronDown size={18} color="$color11" />
            )}
          </XStack>
        </XStack>

        {/* Meta Row */}
        <XStack gap="$4" flexWrap="wrap">
          <XStack alignItems="center" gap="$1">
            <Calendar size={14} color="$color11" />
            <Text fontSize="$2" color="$color11">
              {format(new Date(displayDate), 'MMM d, yyyy')}
            </Text>
          </XStack>
          {durationMinutes > 0 && (
            <XStack alignItems="center" gap="$1">
              <Clock size={14} color="$color11" />
              <Text fontSize="$2" color="$color11">
                {durationMinutes} min
              </Text>
            </XStack>
          )}
          {session.targetIntensity && (
            <XStack alignItems="center" gap="$1">
              <Target size={14} color="$color11" />
              <Text fontSize="$2" color="$color11">
                {session.targetIntensity}
              </Text>
            </XStack>
          )}
        </XStack>

        {/* Expanded Content */}
        {isExpanded && session.exercises && session.exercises.length > 0 && (
          <YStack
            gap="$2"
            pt="$3"
            borderTopWidth={1}
            borderTopColor="$borderColor"
          >
            <XStack alignItems="center" gap="$2">
              <Dumbbell size={14} color="$color11" />
              <Text fontSize="$2" fontWeight="600" color="$color11">
                Exercises ({completedExercises}/{totalExercises})
              </Text>
            </XStack>

            {session.exercises.map((exercise, idx) => (
              <XStack
                key={`${exercise.exerciseId}-${idx}`}
                justifyContent="space-between"
                alignItems="center"
                opacity={exercise.skipped ? 0.5 : 1}
                paddingLeft="$2"
              >
                <XStack alignItems="center" gap="$2" flex={1}>
                  {exercise.completed ? (
                    <CheckCircle size={14} color="$success" />
                  ) : exercise.skipped ? (
                    <XCircle size={14} color="$color10" />
                  ) : (
                    <YStack width={14} />
                  )}
                  <Text
                    fontSize="$3"
                    color="$color12"
                    textDecorationLine={
                      exercise.skipped ? 'line-through' : 'none'
                    }
                    numberOfLines={1}
                    flex={1}
                  >
                    {exercise.name ?? 'Exercise'}
                  </Text>
                </XStack>

                {exercise.sets && exercise.completed && (
                  <Text fontSize="$2" color="$color11">
                    {exercise.sets.filter((s) => s.completed).length} sets
                    {(() => {
                      // Get weights from completed sets, filtering out 0 and undefined
                      const weights = exercise.sets
                        .filter((s) => s.completed && s.weight && s.weight > 0)
                        .map((s) => s.weight!);
                      // Only show max weight if there are actual weights
                      if (weights.length > 0) {
                        return ` \u2022 ${Math.max(...weights)}lb`;
                      }
                      return '';
                    })()}
                  </Text>
                )}
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </Card>
  );
}
