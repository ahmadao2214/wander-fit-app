import { useState, useCallback, useMemo } from 'react'
import { Platform, Vibration } from 'react-native'

/**
 * Generic exercise type - screens can extend this
 */
interface BaseExercise {
  exerciseId: string
  [key: string]: unknown
}

interface UseDragReorderOptions<T extends BaseExercise> {
  /** Original exercises from template */
  exercises: T[]
  /** Previously saved exercise order (array of indices into original exercises) */
  savedOrder?: number[]
  /** Whether reordering is allowed */
  enabled?: boolean
  /** Callback when order changes (for auto-save) */
  onOrderChange?: (orderedExercises: T[], orderIndices: number[]) => void
}

interface UseDragReorderReturn<T extends BaseExercise> {
  /** Exercises in current order */
  orderedExercises: T[]
  /** Current order as array of indices into original exercises */
  orderIndices: number[]
  /** Whether there's a custom order (different from original) */
  hasCustomOrder: boolean
  /** Handle drag end from DraggableFlatList */
  handleDragEnd: (params: { data: T[]; from: number; to: number }) => void
  /** Trigger haptic feedback (call on drag begin) */
  triggerHaptic: () => void
  /** Reset to original order */
  resetOrder: () => void
  /** Move exercise from one index to another (for manual reorder) */
  moveExercise: (fromIndex: number, toIndex: number) => void
}

/**
 * useDragReorder - Shared hook for drag-and-drop reordering
 * 
 * Used in:
 * - Workout Summary (exercise reordering before starting)
 * - Workout Execution (exercise reordering during workout)
 * - Browse Workouts (workout day reordering)
 * 
 * Features:
 * - Maintains local order state
 * - Initializes from saved order if available
 * - Provides haptic feedback
 * - Computes order indices for backend persistence
 */
export function useDragReorder<T extends BaseExercise>({
  exercises,
  savedOrder,
  enabled = true,
  onOrderChange,
}: UseDragReorderOptions<T>): UseDragReorderReturn<T> {
  // Local state for the current order (null means use default/saved)
  const [localOrder, setLocalOrder] = useState<T[] | null>(null)

  // Compute the ordered exercises
  // Key insight: localOrder stores the ORDER (by exerciseId), not the exercise data itself
  // This allows exercise data to update (e.g., intensity scaling) while preserving order
  const orderedExercises = useMemo(() => {
    if (!exercises.length) return []
    
    // Create a map for quick lookup of current exercise data by ID
    const exerciseMap = new Map(exercises.map(ex => [ex.exerciseId, ex]))
    
    // If user has reordered locally, apply that order but use CURRENT exercise data
    if (localOrder) {
      return localOrder
        .map(orderedEx => exerciseMap.get(orderedEx.exerciseId))
        .filter(Boolean) as T[]
    }
    
    // If there's a saved order, apply it with current exercise data
    if (savedOrder && savedOrder.length > 0) {
      return savedOrder
        .map(idx => exercises[idx])
        .filter(Boolean) as T[]
    }
    
    // Otherwise use original order
    return exercises
  }, [exercises, savedOrder, localOrder])

  // Compute order indices (for backend persistence)
  const orderIndices = useMemo(() => {
    if (!exercises.length) return []
    
    // Map current ordered exercises back to their original indices
    return orderedExercises.map(orderedEx => 
      exercises.findIndex(ex => ex.exerciseId === orderedEx.exerciseId)
    ).filter(idx => idx !== -1)
  }, [exercises, orderedExercises])

  // Check if there's a custom order
  const hasCustomOrder = useMemo(() => {
    if (!exercises.length) return false
    
    // Check if order differs from original
    return orderIndices.some((idx, i) => idx !== i)
  }, [exercises, orderIndices])

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }, [])

  // Handle drag end from DraggableFlatList
  const handleDragEnd = useCallback(({ data, from, to }: { data: T[]; from: number; to: number }) => {
    if (!enabled) return
    if (from === to) return
    
    setLocalOrder(data)
    triggerHaptic()
    
    // Compute new order indices for callback
    if (onOrderChange) {
      const newOrderIndices = data.map(orderedEx => 
        exercises.findIndex(ex => ex.exerciseId === orderedEx.exerciseId)
      ).filter(idx => idx !== -1)
      onOrderChange(data, newOrderIndices)
    }
  }, [enabled, exercises, onOrderChange, triggerHaptic])

  // Move exercise manually (for up/down buttons or programmatic reorder)
  const moveExercise = useCallback((fromIndex: number, toIndex: number) => {
    if (!enabled) return
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= orderedExercises.length || toIndex >= orderedExercises.length) return
    
    const newOrder = [...orderedExercises]
    const [moved] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, moved)
    
    setLocalOrder(newOrder)
    triggerHaptic()
    
    if (onOrderChange) {
      const newOrderIndices = newOrder.map(orderedEx => 
        exercises.findIndex(ex => ex.exerciseId === orderedEx.exerciseId)
      ).filter(idx => idx !== -1)
      onOrderChange(newOrder, newOrderIndices)
    }
  }, [enabled, orderedExercises, exercises, onOrderChange, triggerHaptic])

  // Reset to original order
  const resetOrder = useCallback(() => {
    setLocalOrder(null)
    
    if (onOrderChange) {
      const originalIndices = exercises.map((_, i) => i)
      onOrderChange(exercises, originalIndices)
    }
  }, [exercises, onOrderChange])

  return {
    orderedExercises,
    orderIndices,
    hasCustomOrder,
    handleDragEnd,
    triggerHaptic,
    resetOrder,
    moveExercise,
  }
}
