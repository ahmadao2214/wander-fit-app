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

/** Ask once at boot, so the first screen after the splash usually knows. */
export function primeReducedMotion(): void {
  AccessibilityInfo.isReduceMotionEnabled().then(remember, () => remember(false))
}

/** Tests only: forget the cached answer between cases. */
export function resetReducedMotionCache(): void {
  lastKnown = null
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
