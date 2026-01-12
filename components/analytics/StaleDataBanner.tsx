import { XStack, Text } from 'tamagui';
import { WifiOff, RefreshCw } from '@tamagui/lucide-icons';

interface StaleDataBannerProps {
  /** Whether the data is considered stale */
  isStale: boolean;
  /** Whether data is being served from cache */
  isFromCache: boolean;
  /** Optional custom message */
  message?: string;
}

export function StaleDataBanner({
  isStale,
  isFromCache,
  message,
}: StaleDataBannerProps) {
  // Don't show anything if we have fresh live data
  if (!isFromCache) return null;

  const Icon = isStale ? WifiOff : RefreshCw;
  const defaultMessage = isStale
    ? 'Showing offline data (may be outdated)'
    : 'Showing cached data';

  return (
    <XStack
      backgroundColor={isStale ? '$warningLight' : '$backgroundHover'}
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderRadius="$2"
      alignItems="center"
      gap="$2"
    >
      <Icon size={14} color={isStale ? '$warning' : '$color11'} />
      <Text fontSize="$2" color={isStale ? '$warning' : '$color11'}>
        {message ?? defaultMessage}
      </Text>
    </XStack>
  );
}
