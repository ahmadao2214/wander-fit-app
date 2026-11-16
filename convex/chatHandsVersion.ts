/**
 * Version tokens for chat writes.
 * A token names the row the athlete was shown. A later write with an older
 * token does not change that row.
 */

export function reorderVersion(
  exerciseOrder: number[] | undefined,
  startedAt: number,
): string {
  const order = exerciseOrder?.join(".") ?? "template";
  return `reorder:${startedAt}:${order}`;
}

export function swapVersion(
  updatedAt: number | null,
  templateA: string,
  templateB: string,
): string {
  return `swap:${updatedAt ?? 0}:${templateA}:${templateB}`;
}

export function isPermutation(order: number[], length: number): boolean {
  if (order.length !== length) return false;
  const seen = new Set(order);
  if (seen.size !== length) return false;
  for (let i = 0; i < length; i++) {
    if (!seen.has(i)) return false;
  }
  return true;
}

/** Writes this connection does not offer. Easier or harder is chosen from intensity. */
export const OMITTED_WRITES = ["easier_or_harder"] as const;

export const TOOL_NAMES = [
  "read_program",
  "read_today",
  "read_day",
  "preview_reorder",
  "commit_reorder",
  "preview_swap",
  "commit_swap",
] as const;
