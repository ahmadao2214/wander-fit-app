import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * The last Reduce Motion answer the app has seen. A screen that mounts later
 * starts from it, so it knows on its first render whether to move. Without it
 * every screen starts at "unknown" for a tick, which spends one-shot entrance
 * choices (a day tile's arrival, a headline's entrance) before motion is known.
 */
let lastKnown: boolean | null = null

function remember(value: boolean) {
  lastKnown = value
}

let appListener: { remove: () => void } | undefined

/**
 * Ask once at boot, so the first screen after the splash usually knows, and
 * keep listening for the app's life. The cache then stays current even while
 * no screen that reads it is mounted.
 */
export function primeReducedMotion(): void {
  AccessibilityInfo.isReduceMotionEnabled().then(remember, () => remember(false))
  if (!appListener) {
    appListener = AccessibilityInfo.addEventListener('reduceMotionChanged', remember)
  }
}

/** Tests only: forget the cached answer between cases. */
export function resetReducedMotionCache(): void {
  lastKnown = null
  appListener?.remove()
  appListener = undefined
}

/**
 * The system's Reduce Motion setting (iOS, Android, and prefers-reduced-motion
 * on web through react-native-web).
 *
 * Returns `null` until the first answer arrives. Callers should treat `null`
 * like `true` for anything that would start moving, so an animation never
 * starts and then gets cut off.
 */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(() => lastKnown)

  useEffect(() => {
    let active = true
    const apply = (value: boolean) => {
      remember(value)
      if (active) setReduced(value)
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then(apply)
      // Unknown platform support: assume motion is fine.
      .catch(() => apply(false))
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', apply)
    return () => {
      active = false
      subscription?.remove()
    }
  }, [])

  return reduced
}
