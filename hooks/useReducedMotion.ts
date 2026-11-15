import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

/**
 * The system's Reduce Motion setting (iOS, Android, and prefers-reduced-motion
 * on web through react-native-web).
 *
 * Returns `null` until the first answer arrives. Callers should treat `null`
 * like `true` for anything that would start moving, so an animation never
 * starts and then gets cut off.
 */
export function useReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value)
      })
      .catch(() => {
        // Unknown platform support: assume motion is fine.
        if (active) setReduced(false)
      })
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (value) => {
      if (active) setReduced(value)
    })
    return () => {
      active = false
      subscription?.remove()
    }
  }, [])

  return reduced
}
