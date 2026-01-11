import { Card, Text, XStack, YStack } from 'tamagui';
import type { LucideIcon } from 'lucide-react-native';

interface TrendData {
  /** The percentage change value */
  value: number;
  /** Whether the trend is positive (up) or negative (down) */
  isPositive: boolean;
}

interface StatCardProps {
  /** Label text displayed above the value */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Optional icon component from lucide-react-native */
  icon?: LucideIcon;
  /** Optional trend indicator showing percentage change */
  trend?: TrendData;
  /** Optional subtitle text below the main value */
  subtitle?: string;
  /** Whether to use full width (default: flex 1) */
  fullWidth?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  subtitle,
  fullWidth = false,
}: StatCardProps) {
  return (
    <Card
      flex={fullWidth ? undefined : 1}
      width={fullWidth ? '100%' : undefined}
      padding="$3"
      backgroundColor="$background"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <YStack gap="$2">
        <XStack justifyContent="space-between" alignItems="center">
          <Text
            fontSize="$2"
            color="$color11"
            textTransform="uppercase"
            letterSpacing={0.5}
          >
            {label}
          </Text>
          {Icon && <Icon size={16} color="$color11" />}
        </XStack>

        <XStack alignItems="baseline" gap="$2">
          <Text fontSize="$7" fontWeight="700" color="$color12">
            {value}
          </Text>
          {trend && (
            <Text fontSize="$2" color={trend.isPositive ? '$success' : '$error'}>
              {trend.isPositive ? '\u2191' : '\u2193'} {Math.abs(trend.value)}%
            </Text>
          )}
        </XStack>

        {subtitle && (
          <Text fontSize="$1" color="$color10">
            {subtitle}
          </Text>
        )}
      </YStack>
    </Card>
  );
}
