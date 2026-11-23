/**
 * Version tokens for chat writes.
 * A token names the row the athlete was shown. A later write with an older
 * token does not change that row.
 */

export function reorderVersion(exerciseOrder: number[] | undefined, startedAt: number): string {
  const order = exerciseOrder?.join('.') ?? 'template'
  return `reorder:${startedAt}:${order}`
}

export function swapVersion(
  updatedAt: number | null,
  templateA: string,
  templateB: string
): string {
  return `swap:${updatedAt ?? 0}:${templateA}:${templateB}`
}

/** True when `order` lists every value of `allowed` exactly once, in any order. */
export function isOrderOf(order: readonly number[], allowed: readonly number[]): boolean {
  if (order.length !== allowed.length) return false
  const remaining = new Set(allowed)
  for (const value of order) {
    if (!remaining.delete(value)) return false
  }
  return remaining.size === 0
}

/** Writes this connection does not offer. Easier or harder is chosen from intensity. */
export const OMITTED_WRITES = ['easier_or_harder'] as const

export const TOOL_NAMES = [
  'read_program',
  'read_today',
  'read_day',
  'preview_reorder',
  'commit_reorder',
  'preview_swap',
  'commit_swap',
] as const
