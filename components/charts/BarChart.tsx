import { View } from 'react-native';
import { VictoryChart, VictoryBar, VictoryAxis } from 'victory-native';
import { useTheme } from 'tamagui';
import { Text, YStack } from 'tamagui';

interface BarData {
  x: string | number;
  y: number;
  /** Optional color override for this specific bar */
  color?: string;
}

interface BarChartProps {
  /** The data points to plot */
  data: BarData[];
  /** Chart height in pixels (default: 200) */
  height?: number;
  /** Default bar color (uses theme brand color by default) */
  color?: string;
  /** Whether to display bars horizontally (default: false) */
  horizontal?: boolean;
  /** Bar width (default: 20) */
  barWidth?: number;
  /** Custom formatter for x-axis labels */
  xAxisFormat?: (tick: any) => string;
  /** Custom formatter for y-axis labels */
  yAxisFormat?: (tick: any) => string;
  /** Optional title above the chart */
  title?: string;
  /** Whether to angle x-axis labels (useful for long labels) */
  angleLabels?: boolean;
}

export function BarChart({
  data,
  height = 200,
  color,
  horizontal = false,
  barWidth = 20,
  xAxisFormat,
  yAxisFormat,
  title,
  angleLabels = false,
}: BarChartProps) {
  const theme = useTheme();

  const defaultColor = color ?? theme.brand7?.val ?? '#2563EB';
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
          horizontal={horizontal}
          domainPadding={{ x: 30, y: 10 }}
          padding={{
            top: 20,
            bottom: angleLabels ? 60 : 50,
            left: 50,
            right: 20,
          }}
        >
          <VictoryAxis
            style={{
              axis: { stroke: gridColor },
              tickLabels: {
                fill: textColor,
                fontSize: 10,
                angle: angleLabels ? -45 : 0,
                textAnchor: angleLabels ? 'end' : 'middle',
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
          <VictoryBar
            data={data}
            style={{
              data: {
                fill: ({ datum }) => datum.color ?? defaultColor,
                width: barWidth,
              },
            }}
            cornerRadius={{ top: 4 }}
          />
        </VictoryChart>
      </View>
    </YStack>
  );
}
