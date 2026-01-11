import { useState, useMemo } from 'react';
import {
  YStack,
  XStack,
  Text,
  Card,
  Button,
  Tabs,
  Spinner,
  styled,
} from 'tamagui';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { subDays, isWithinInterval, format } from 'date-fns';
import {
  Calendar,
  Filter,
  Flame,
  Dumbbell,
  TrendingUp,
  BarChart3,
} from '@tamagui/lucide-icons';

import { ScreenWrapper } from '@/components/ScreenWrapper';
import { LineChart, BarChart, ProgressRing } from '@/components/charts';
import { StatCard, StaleDataBanner } from '@/components/analytics';
import {
  WorkoutHistoryCard,
  FilterSheet,
  FilterPhase,
  FilterDateRange,
} from '@/components/history';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { CACHE_KEYS } from '@/lib/storage';

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 0.5,
  color: '$color12',
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

type TabValue = 'history' | 'trends' | 'exercises';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * History Tab - Enhanced Workout History & Analytics
 *
 * Features:
 * - Workout history with expandable details
 * - Filtering by phase and date range
 * - Weekly trends (workouts, duration)
 * - Exercise breakdown (most performed, highest RPE, skipped)
 * - Intensity distribution
 * - Offline support with MMKV caching
 */
export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<TabValue>('history');
  const [filterPhase, setFilterPhase] = useState<FilterPhase>('all');
  const [filterDateRange, setFilterDateRange] = useState<FilterDateRange>('30d');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Cached queries for offline support
  const {
    data: history,
    isLoading: historyLoading,
    isFromCache,
    isStale,
  } = useCachedQuery(
    api.gppWorkoutSessions.getHistory,
    { limit: 50 },
    { cacheKey: CACHE_KEYS.WORKOUT_HISTORY }
  );

  const { data: progressSummary } = useCachedQuery(
    api.userPrograms.getProgressSummary,
    {},
    { cacheKey: CACHE_KEYS.PROGRESS_SUMMARY }
  );

  // Analytics queries (not cached - live data preferred)
  const weeklyTrends = useQuery(api.analytics.getWeeklyTrends, { weeks: 12 });
  const exerciseBreakdown = useQuery(api.analytics.getExerciseBreakdown, {});
  const intensityDist = useQuery(api.analytics.getIntensityDistribution, {});

  // Filter history
  const filteredHistory = useMemo(() => {
    if (!history) return [];

    return history.filter((session: any) => {
      // Phase filter
      const sessionPhase =
        session.templateSnapshot?.phase ?? session.phase;
      if (filterPhase !== 'all' && sessionPhase !== filterPhase) {
        return false;
      }

      // Date range filter
      if (filterDateRange !== 'all') {
        const days =
          filterDateRange === '7d' ? 7 : filterDateRange === '30d' ? 30 : 90;
        const startDate = subDays(new Date(), days);
        const sessionDate = new Date(
          session.completedAt ?? session.startedAt
        );
        if (
          !isWithinInterval(sessionDate, {
            start: startDate,
            end: new Date(),
          })
        ) {
          return false;
        }
      }

      return true;
    });
  }, [history, filterPhase, filterDateRange]);

  // Loading state
  if (historyLoading) {
    return (
      <ScreenWrapper centered>
        <Spinner size="large" color="$brand7" />
        <Text color="$color10" mt="$2">
          Loading history...
        </Text>
      </ScreenWrapper>
    );
  }

  const hasActiveFilters = filterPhase !== 'all' || filterDateRange !== 'all';

  return (
    <ScreenWrapper scrollable paddingBottom={100}>
      <YStack gap="$4">
        {/* Header */}
        <YStack gap="$2">
          <DisplayHeading>HISTORY</DisplayHeading>
          <StaleDataBanner isFromCache={isFromCache} isStale={isStale} />
        </YStack>

        {/* Quick Stats Row */}
        <XStack gap="$3">
          <StatCard
            label="Total Workouts"
            value={progressSummary?.daysCompleted ?? 0}
            icon={Dumbbell}
          />
          <StatCard
            label="Current Streak"
            value={progressSummary?.currentStreak ?? 0}
            icon={Flame}
            subtitle={`Best: ${progressSummary?.longestStreak ?? 0}`}
          />
        </XStack>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as TabValue)}
          orientation="horizontal"
          flexDirection="column"
        >
          <Tabs.List
            gap="$1"
            backgroundColor="$backgroundHover"
            borderRadius="$3"
            padding="$1"
          >
            <Tabs.Tab
              value="history"
              flex={1}
              backgroundColor={activeTab === 'history' ? '$background' : 'transparent'}
              borderRadius="$2"
            >
              <Text
                fontSize="$3"
                fontWeight={activeTab === 'history' ? '600' : '400'}
                color={activeTab === 'history' ? '$color12' : '$color11'}
              >
                History
              </Text>
            </Tabs.Tab>
            <Tabs.Tab
              value="trends"
              flex={1}
              backgroundColor={activeTab === 'trends' ? '$background' : 'transparent'}
              borderRadius="$2"
            >
              <Text
                fontSize="$3"
                fontWeight={activeTab === 'trends' ? '600' : '400'}
                color={activeTab === 'trends' ? '$color12' : '$color11'}
              >
                Trends
              </Text>
            </Tabs.Tab>
            <Tabs.Tab
              value="exercises"
              flex={1}
              backgroundColor={activeTab === 'exercises' ? '$background' : 'transparent'}
              borderRadius="$2"
            >
              <Text
                fontSize="$3"
                fontWeight={activeTab === 'exercises' ? '600' : '400'}
                color={activeTab === 'exercises' ? '$color12' : '$color11'}
              >
                Exercises
              </Text>
            </Tabs.Tab>
          </Tabs.List>

          {/* History Tab */}
          <Tabs.Content value="history">
            <YStack gap="$3" pt="$3">
              {/* Filter Button */}
              <Button
                size="$3"
                backgroundColor={hasActiveFilters ? '$brand2' : '$backgroundHover'}
                borderColor={hasActiveFilters ? '$brand7' : '$borderColor'}
                borderWidth={1}
                borderRadius="$3"
                onPress={() => setShowFilters(true)}
                icon={<Filter size={16} />}
              >
                <Text color={hasActiveFilters ? '$brand7' : '$color12'}>
                  {hasActiveFilters
                    ? `Filtered (${filterPhase !== 'all' ? filterPhase : ''} ${filterDateRange !== 'all' ? filterDateRange : ''})`.trim()
                    : 'Filter'}
                </Text>
              </Button>

              {/* Workout List */}
              {filteredHistory.length === 0 ? (
                <Card
                  padding="$5"
                  backgroundColor="$backgroundHover"
                  borderRadius="$4"
                >
                  <YStack alignItems="center" gap="$3">
                    <Calendar size={40} color="$color10" />
                    <Text textAlign="center" color="$color11">
                      {hasActiveFilters
                        ? 'No workouts match your filters'
                        : 'No workouts completed yet'}
                    </Text>
                    {hasActiveFilters && (
                      <Button
                        size="$3"
                        variant="outlined"
                        onPress={() => {
                          setFilterPhase('all');
                          setFilterDateRange('30d');
                        }}
                      >
                        Clear Filters
                      </Button>
                    )}
                  </YStack>
                </Card>
              ) : (
                filteredHistory.map((session: any) => (
                  <WorkoutHistoryCard
                    key={session._id}
                    session={session}
                    isExpanded={expandedSession === session._id}
                    onToggle={() =>
                      setExpandedSession(
                        expandedSession === session._id ? null : session._id
                      )
                    }
                  />
                ))
              )}
            </YStack>
          </Tabs.Content>

          {/* Trends Tab */}
          <Tabs.Content value="trends">
            <YStack gap="$4" pt="$3">
              {/* Weekly Workouts Chart */}
              <Card padding="$3" borderRadius="$4">
                <XStack alignItems="center" gap="$2" mb="$2">
                  <BarChart3 size={16} color="$color11" />
                  <Text fontSize="$4" fontWeight="600" color="$color12">
                    Weekly Workouts
                  </Text>
                </XStack>
                {weeklyTrends && weeklyTrends.length > 0 ? (
                  <BarChart
                    data={weeklyTrends.map((w) => ({
                      x: format(new Date(w.weekStart), 'M/d'),
                      y: w.workoutCount,
                    }))}
                    height={180}
                  />
                ) : (
                  <YStack height={180} alignItems="center" justifyContent="center">
                    <Text color="$color11" fontSize="$2">
                      Complete more workouts to see trends
                    </Text>
                  </YStack>
                )}
              </Card>

              {/* Duration Trend */}
              <Card padding="$3" borderRadius="$4">
                <XStack alignItems="center" gap="$2" mb="$2">
                  <TrendingUp size={16} color="$color11" />
                  <Text fontSize="$4" fontWeight="600" color="$color12">
                    Weekly Duration (min)
                  </Text>
                </XStack>
                {weeklyTrends && weeklyTrends.length > 0 ? (
                  <LineChart
                    data={weeklyTrends.map((w) => ({
                      x: new Date(w.weekStart),
                      y: w.totalDuration,
                    }))}
                    height={180}
                    xAxisFormat={(d) => format(d, 'M/d')}
                  />
                ) : (
                  <YStack height={180} alignItems="center" justifyContent="center">
                    <Text color="$color11" fontSize="$2">
                      No duration data yet
                    </Text>
                  </YStack>
                )}
              </Card>

              {/* Intensity Distribution */}
              <Card padding="$3" borderRadius="$4">
                <Text fontSize="$4" fontWeight="600" color="$color12" mb="$3">
                  Intensity Distribution
                </Text>
                {intensityDist ? (
                  <XStack justifyContent="space-around">
                    <ProgressRing
                      progress={intensityDist.Low.percentage}
                      value={`${intensityDist.Low.count}`}
                      label="Low"
                      size={80}
                      color="$success"
                    />
                    <ProgressRing
                      progress={intensityDist.Moderate.percentage}
                      value={`${intensityDist.Moderate.count}`}
                      label="Moderate"
                      size={80}
                      color="$warning"
                    />
                    <ProgressRing
                      progress={intensityDist.High.percentage}
                      value={`${intensityDist.High.count}`}
                      label="High"
                      size={80}
                      color="$error"
                    />
                  </XStack>
                ) : (
                  <YStack height={100} alignItems="center" justifyContent="center">
                    <Spinner size="small" />
                  </YStack>
                )}
              </Card>
            </YStack>
          </Tabs.Content>

          {/* Exercises Tab */}
          <Tabs.Content value="exercises">
            <YStack gap="$4" pt="$3">
              {exerciseBreakdown ? (
                <>
                  {/* Most Performed */}
                  <Card padding="$3" borderRadius="$4">
                    <Text fontSize="$4" fontWeight="600" color="$color12" mb="$3">
                      Most Performed
                    </Text>
                    {exerciseBreakdown.mostPerformed.length > 0 ? (
                      <YStack gap="$2">
                        {exerciseBreakdown.mostPerformed.slice(0, 5).map((ex, idx) => (
                          <XStack
                            key={ex.exerciseId}
                            justifyContent="space-between"
                            alignItems="center"
                            paddingVertical="$1"
                          >
                            <XStack alignItems="center" gap="$2" flex={1}>
                              <Text
                                fontSize="$2"
                                color="$color10"
                                width={20}
                                textAlign="center"
                              >
                                {idx + 1}
                              </Text>
                              <Text
                                fontSize="$3"
                                color="$color12"
                                numberOfLines={1}
                                flex={1}
                              >
                                {ex.name}
                              </Text>
                            </XStack>
                            <Text fontSize="$2" color="$color11">
                              {ex.timesPerformed}x
                            </Text>
                          </XStack>
                        ))}
                      </YStack>
                    ) : (
                      <Text color="$color11" fontSize="$2">
                        No exercise data yet
                      </Text>
                    )}
                  </Card>

                  {/* Highest RPE */}
                  {exerciseBreakdown.highestRPE.length > 0 && (
                    <Card padding="$3" borderRadius="$4">
                      <Text fontSize="$4" fontWeight="600" color="$color12" mb="$3">
                        Highest Effort (RPE)
                      </Text>
                      <YStack gap="$2">
                        {exerciseBreakdown.highestRPE.slice(0, 5).map((ex) => (
                          <XStack
                            key={ex.exerciseId}
                            justifyContent="space-between"
                            alignItems="center"
                            paddingVertical="$1"
                          >
                            <Text
                              fontSize="$3"
                              color="$color12"
                              numberOfLines={1}
                              flex={1}
                            >
                              {ex.name}
                            </Text>
                            <XStack
                              backgroundColor="$errorLight"
                              paddingHorizontal="$2"
                              paddingVertical="$1"
                              borderRadius="$2"
                            >
                              <Text fontSize="$2" color="$error" fontWeight="600">
                                {ex.avgRPE}
                              </Text>
                            </XStack>
                          </XStack>
                        ))}
                      </YStack>
                    </Card>
                  )}

                  {/* Most Skipped */}
                  {exerciseBreakdown.mostSkipped.length > 0 && (
                    <Card padding="$3" borderRadius="$4">
                      <Text fontSize="$4" fontWeight="600" color="$color12" mb="$3">
                        Frequently Skipped
                      </Text>
                      <YStack gap="$2">
                        {exerciseBreakdown.mostSkipped.slice(0, 5).map((ex) => (
                          <XStack
                            key={ex.exerciseId}
                            justifyContent="space-between"
                            alignItems="center"
                            paddingVertical="$1"
                          >
                            <Text
                              fontSize="$3"
                              color="$color12"
                              numberOfLines={1}
                              flex={1}
                            >
                              {ex.name}
                            </Text>
                            <Text fontSize="$2" color="$warning">
                              {ex.timesSkipped}x skipped
                            </Text>
                          </XStack>
                        ))}
                      </YStack>
                    </Card>
                  )}
                </>
              ) : (
                <Card padding="$5" borderRadius="$4">
                  <YStack alignItems="center" gap="$3">
                    <Spinner size="small" />
                    <Text color="$color11" fontSize="$2">
                      Loading exercise data...
                    </Text>
                  </YStack>
                </Card>
              )}
            </YStack>
          </Tabs.Content>
        </Tabs>

        {/* Filter Sheet */}
        <FilterSheet
          open={showFilters}
          onOpenChange={setShowFilters}
          phase={filterPhase}
          onPhaseChange={setFilterPhase}
          dateRange={filterDateRange}
          onDateRangeChange={setFilterDateRange}
        />
      </YStack>
    </ScreenWrapper>
  );
}
