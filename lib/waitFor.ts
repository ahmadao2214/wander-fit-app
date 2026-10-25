/**
 * Poll `predicate` until it returns true.
 *
 * Resolves `true` as soon as the predicate passes, or `false` once
 * `timeoutMs` has elapsed without it passing. Never rejects.
 */
export async function waitFor(
  predicate: () => boolean,
  { timeoutMs = 10_000, intervalMs = 100 }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs
  while (!predicate()) {
    if (Date.now() >= deadline) return false
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  return true
}
