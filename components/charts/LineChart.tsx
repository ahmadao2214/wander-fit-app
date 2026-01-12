import { View } from 'react-native';
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryScatter,
} from 'victory-native';
import { useTheme } from 'tamagui';
import { Text, YStack } from 'tamagui';

interface DataPoint {
  x: Date | number | string;
  y: number;
  label?: string;
}

interface LineChartProps {
  /** The data points to plot */
  data: DataPoint[];
  /** Chart height in pixels (default: 200) */
  height?: number;
  /** Line color (uses theme brand color by default) */
  color?: string;
  /** Whether to show dots at data points (default: true) */
  showDots?: boolean;
  /** Custom formatter for x-axis labels */
  xAxisFormat?: (tick: any) => string;
  /** Custom formatter for y-axis labels */
  yAxisFormat?: (tick: any) => string;
  /** Optional title above the chart */
  title?: string;
  /** Interpolation style (default: monotoneX for smooth curves) */
  interpolation?: 'linear' | 'monotoneX' | 'natural' | 'step';
}

export function LineChart({
  data,
  height = 200,
  color,
  showDots = true,
  xAxisFormat,
  yAxisFormat,
  title,
  interpolation = 'monotoneX',
}: LineChartProps) {
  const theme = useTheme();

  const lineColor = color ?? theme.brand7?.val ?? '#2563EB';
  const textColor = theme.color11?.val ?? '#64748B';
  const gridColor = theme.borderColor?.val ?? '#E2E8F0';

  if (!data.length) {
    return (
      <YStack height={height} alignItems="center" justifyContent="center">
        <Text color="$color11" fontSize="$2">
          No data available
        </Text>
      </YStack>
    );
  }

  return (
    <YStack>
      {title && (
        <Text fontSize="$3" fontWeight="600" color="$color12" mb="$2">
          {title}
        </Text>
      )}
      <View style={{ height }}>
        <VictoryChart
          height={height}
          padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
          domainPadding={{ x: 20, y: 10 }}
        >
          <VictoryAxis
            style={{
              axis: { stroke: gridColor },
              tickLabels: {
                fill: textColor,
                fontSize: 10,
                padding: 5,
              },
              grid: { stroke: 'transparent' },
            }}
            tickFormat={xAxisFormat}
          />
          <VictoryAxis
            dependentAxis
            style={{
              axis: { stroke: gridColor },
              tickLabels: {
                fill: textColor,
                fontSize: 10,
                padding: 5,
              },
              grid: {
                stroke: gridColor,
                strokeDasharray: '4,4',
              },
            }}
            tickFormat={yAxisFormat}
          />
          <VictoryLine
            data={data}
            style={{
              data: {
                stroke: lineColor,
                strokeWidth: 2,
              },
            }}
            interpolation={interpolation}
          />
          {showDots && (
            <VictoryScatter
              data={data}
              size={4}
              style={{
                data: {
                  fill: lineColor,
                },
              }}
            />
          )}
        </VictoryChart>
      </View>
    </YStack>
  );
}
