import type { ReactNode } from 'react'
import { Platform, View } from 'react-native'

/**
 * DOM-level exclusion boundary for Web session replays (ADR 0005 / S4).
 *
 * Renders `data-ph-no-capture="true"` on react-native-web at commit time so
 * rrweb's MutationObserver blocks the entire excluded subtree synchronously
 * (before any React passive effect or flush runs).
 */
export function ReplayExcludedSurface({ children }: { children: ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>
  }

  return (
    <View
      style={{ flex: 1 }}
      {...({ dataSet: { phNoCapture: 'true' } } as Record<string, unknown>)}
    >
      {children}
    </View>
  )
}
