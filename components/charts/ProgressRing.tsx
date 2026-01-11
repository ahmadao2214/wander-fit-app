import Svg, { Circle } from 'react-native-svg';
import { View, StyleSheet } from 'react-native';
import { Text, YStack, useTheme } from 'tamagui';

interface ProgressRingProps {
  /** Progress value from 0 to 100 */
  progress: number;
  /** Size of the ring in pixels (default: 100) */
  size?: number;
  /** Width of the ring stroke (default: 8) */
  strokeWidth?: number;
  /** Label text below the ring */
  label?: string;
  /** Value text displayed in the center of the ring */
  value?: string;
  /** Custom color for the progress arc (auto-calculated based on progress by default) */
  color?: string;
  /** Background ring color */
  backgroundColor?: string;
}

export function ProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  label,
  value,
  color,
  backgroundColor,
}: ProgressRingProps) {
  const theme = useTheme();

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  // Calculate SVG values
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (clampedProgress / 100) * circumference;

  // Determine color based on progress if not provided
  const progressColor =
    color ??
    (clampedProgress >= 80
      ? theme.success?.val ?? '#10B981'
      : clampedProgress >= 50
        ? theme.warning?.val ?? '#F59E0B'
        : theme.brand7?.val ?? '#2563EB');

  const bgColor = backgroundColor ?? theme.borderColor?.val ?? '#E2E8F0';

  return (
    <YStack alignItems="center" gap="$2">
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Background circle */}
          <Circle
            stroke={bgColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <Circle
            stroke={progressColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {value && (
          <View style={[styles.centerContent, { width: size, height: size }]}>
            <Text fontSize="$5" fontWeight="700" color="$color12">
              {value}
            </Text>
          </View>
        )}
      </View>
      {label && (
        <Text fontSize="$2" color="$color11" textAlign="center">
          {label}
        </Text>
      )}
    </YStack>
  );
}

const styles = StyleSheet.create({
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
