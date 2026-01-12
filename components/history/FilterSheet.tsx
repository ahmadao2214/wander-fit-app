import { Sheet, YStack, XStack, Text, Button } from 'tamagui';
import { X } from '@tamagui/lucide-icons';

export type FilterPhase = 'all' | 'GPP' | 'SPP' | 'SSP';
export type FilterDateRange = '7d' | '30d' | '90d' | 'all';

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phase: FilterPhase;
  onPhaseChange: (phase: FilterPhase) => void;
  dateRange: FilterDateRange;
  onDateRangeChange: (range: FilterDateRange) => void;
}

const phaseOptions: { value: FilterPhase; label: string }[] = [
  { value: 'all', label: 'All Phases' },
  { value: 'GPP', label: 'GPP' },
  { value: 'SPP', label: 'SPP' },
  { value: 'SSP', label: 'SSP' },
];

const dateRangeOptions: { value: FilterDateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: 'all', label: 'All Time' },
];

export function FilterSheet({
  open,
  onOpenChange,
  phase,
  onPhaseChange,
  dateRange,
  onDateRangeChange,
}: FilterSheetProps) {
  const handleReset = () => {
    onPhaseChange('all');
    onDateRangeChange('30d');
  };

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[50]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay
        animation="quick"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        padding="$4"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        <Sheet.Handle backgroundColor="$color8" />

        <YStack gap="$5" pt="$2">
          {/* Header */}
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$6" fontWeight="700" color="$color12">
              Filters
            </Text>
            <Button
              size="$3"
              chromeless
              circular
              icon={X}
              onPress={() => onOpenChange(false)}
            />
          </XStack>

          {/* Phase Filter */}
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$color11">
              Phase
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {phaseOptions.map((option) => (
                <Button
                  key={option.value}
                  size="$3"
                  backgroundColor={
                    phase === option.value ? '$brand7' : '$backgroundHover'
                  }
                  color={phase === option.value ? 'white' : '$color12'}
                  borderRadius="$3"
                  onPress={() => onPhaseChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </XStack>
          </YStack>

          {/* Date Range Filter */}
          <YStack gap="$2">
            <Text fontSize="$3" fontWeight="600" color="$color11">
              Date Range
            </Text>
            <XStack gap="$2" flexWrap="wrap">
              {dateRangeOptions.map((option) => (
                <Button
                  key={option.value}
                  size="$3"
                  backgroundColor={
                    dateRange === option.value ? '$brand7' : '$backgroundHover'
                  }
                  color={dateRange === option.value ? 'white' : '$color12'}
                  borderRadius="$3"
                  onPress={() => onDateRangeChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </XStack>
          </YStack>

          {/* Actions */}
          <XStack gap="$3" pt="$2">
            <Button
              flex={1}
              size="$4"
              variant="outlined"
              borderColor="$borderColor"
              onPress={handleReset}
            >
              Reset
            </Button>
            <Button
              flex={1}
              size="$4"
              backgroundColor="$brand7"
              color="white"
              onPress={() => onOpenChange(false)}
            >
              Apply
            </Button>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}
