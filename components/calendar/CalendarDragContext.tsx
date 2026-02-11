import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { LayoutRectangle } from 'react-native'
import type { Phase } from '../../types'

interface WorkoutSlot {
  phase: Phase
  week: number
  day: number
}

interface DragState {
  /** Whether a drag is currently in progress */
  isDragging: boolean
  /** The slot being dragged */
  sourceSlot: WorkoutSlot | null
  /** Current drag position (absolute screen coordinates) */
  dragPosition: { x: number; y: number } | null
  /** The potential drop target slot */
  targetSlot: WorkoutSlot | null
}

interface DropZone {
  slotKey: string
  layout: LayoutRectangle
  slot: WorkoutSlot
}

interface CalendarDragContextValue {
  dragState: DragState
  dropZones: Map<string, DropZone>
  /** Start dragging from a slot */
  startDrag: (slot: WorkoutSlot) => void
  /** Update drag position */
  updateDragPosition: (x: number, y: number) => void
  /** End the drag (cancel or drop) */
  endDrag: () => void
  /** Register a drop zone */
  registerDropZone: (slotKey: string, layout: LayoutRectangle, slot: WorkoutSlot) => void
  /** Unregister a drop zone */
  unregisterDropZone: (slotKey: string) => void
  /** Get the slot key for a slot */
  getSlotKey: (slot: WorkoutSlot) => string
  /** Parse a slot key back to a slot */
  parseSlotKey: (slotKey: string) => WorkoutSlot | null
  /** Callback when a successful drop occurs */
  onDrop?: (source: WorkoutSlot, target: WorkoutSlot) => void
  /** Set the drop callback */
  setOnDrop: (callback: (source: WorkoutSlot, target: WorkoutSlot) => void) => void
}

const CalendarDragContext = createContext<CalendarDragContextValue | null>(null)

export function CalendarDragProvider({ children }: { children: React.ReactNode }) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceSlot: null,
    dragPosition: null,
    targetSlot: null,
  })

  const dropZonesRef = useRef<Map<string, DropZone>>(new Map())
  const onDropRef = useRef<((source: WorkoutSlot, target: WorkoutSlot) => void) | null>(null)

  const getSlotKey = useCallback((slot: WorkoutSlot): string => {
    return `${slot.phase}-${slot.week}-${slot.day}`
  }, [])

  const parseSlotKey = useCallback((slotKey: string): WorkoutSlot | null => {
    const parts = slotKey.split('-')
    if (parts.length !== 3) return null
    const [phase, weekStr, dayStr] = parts
    if (!['GPP', 'SPP', 'SSP'].includes(phase)) return null
    const week = parseInt(weekStr, 10)
    const day = parseInt(dayStr, 10)
    if (isNaN(week) || isNaN(day)) return null
    return { phase: phase as Phase, week, day }
  }, [])

  const startDrag = useCallback((slot: WorkoutSlot) => {
    setDragState({
      isDragging: true,
      sourceSlot: slot,
      dragPosition: null,
      targetSlot: null,
    })
  }, [])

  const updateDragPosition = useCallback((x: number, y: number) => {
    // Find which drop zone contains this position
    let foundTarget: WorkoutSlot | null = null

    for (const [, dropZone] of dropZonesRef.current) {
      const { layout, slot } = dropZone
      if (
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        foundTarget = slot
        break
      }
    }

    setDragState((prev) => ({
      ...prev,
      dragPosition: { x, y },
      targetSlot: foundTarget,
    }))
  }, [])

  const endDrag = useCallback(() => {
    setDragState((prev) => {
      // If we have both source and target, and they're different, trigger drop
      if (
        prev.sourceSlot &&
        prev.targetSlot &&
        getSlotKey(prev.sourceSlot) !== getSlotKey(prev.targetSlot)
      ) {
        onDropRef.current?.(prev.sourceSlot, prev.targetSlot)
      }

      return {
        isDragging: false,
        sourceSlot: null,
        dragPosition: null,
        targetSlot: null,
      }
    })
  }, [getSlotKey])

  const registerDropZone = useCallback(
    (slotKey: string, layout: LayoutRectangle, slot: WorkoutSlot) => {
      dropZonesRef.current.set(slotKey, { slotKey, layout, slot })
    },
    []
  )

  const unregisterDropZone = useCallback((slotKey: string) => {
    dropZonesRef.current.delete(slotKey)
  }, [])

  const setOnDrop = useCallback(
    (callback: (source: WorkoutSlot, target: WorkoutSlot) => void) => {
      onDropRef.current = callback
    },
    []
  )

  const value: CalendarDragContextValue = {
    dragState,
    dropZones: dropZonesRef.current,
    startDrag,
    updateDragPosition,
    endDrag,
    registerDropZone,
    unregisterDropZone,
    getSlotKey,
    parseSlotKey,
    onDrop: onDropRef.current ?? undefined,
    setOnDrop,
  }

  return (
    <CalendarDragContext.Provider value={value}>
      {children}
    </CalendarDragContext.Provider>
  )
}

export function useCalendarDrag() {
  const context = useContext(CalendarDragContext)
  if (!context) {
    throw new Error('useCalendarDrag must be used within a CalendarDragProvider')
  }
  return context
}
