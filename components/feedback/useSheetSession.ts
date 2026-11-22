import { useLayoutEffect, useRef } from 'react'

/**
 * Counts open "sessions" of a sheet. The count moves on whenever the sheet
 * closes or unmounts, so a submit that settles late (Convex can hold a
 * mutation through a lost connection) can tell that the athlete has since
 * closed the sheet, and must not close a draft they reopened.
 */
export function useSheetSession(open: boolean) {
  const sessionRef = useRef(0)
  const wasOpenRef = useRef(open)

  useLayoutEffect(() => {
    if (wasOpenRef.current && !open) sessionRef.current += 1
    wasOpenRef.current = open
  }, [open])

  useLayoutEffect(
    () => () => {
      sessionRef.current += 1
    },
    []
  )

  return sessionRef
}
