import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { msUntilNextMidnight } from '../lib/today'

/**
 * Today's date, kept current: re-read when the app comes back to the
 * foreground and at midnight, so a screen left open overnight doesn't show
 * yesterday.
 */
export function useCurrentDate(): Date {
  const [date, setDate] = useState(() => new Date())
  useEffect(() => {
    const timer = setTimeout(() => setDate(new Date()), msUntilNextMidnight(date) + 1000)
    return () => clearTimeout(timer)
  }, [date])
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDate(new Date())
    })
    return () => subscription.remove()
  }, [])
  return date
}
