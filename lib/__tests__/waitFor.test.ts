import { describe, it, expect, vi, afterEach } from 'vitest'
import { waitFor } from '../waitFor'

describe('waitFor', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves true immediately when the predicate already passes', async () => {
    const predicate = vi.fn(() => true)
    await expect(waitFor(predicate)).resolves.toBe(true)
    expect(predicate).toHaveBeenCalledTimes(1)
  })

  it('resolves true once the predicate starts passing', async () => {
    vi.useFakeTimers()
    let ready = false
    const result = waitFor(() => ready, { timeoutMs: 1000, intervalMs: 50 })

    await vi.advanceTimersByTimeAsync(200)
    ready = true
    await vi.advanceTimersByTimeAsync(50)

    await expect(result).resolves.toBe(true)
  })

  it('resolves false after the timeout without rejecting', async () => {
    vi.useFakeTimers()
    const result = waitFor(() => false, { timeoutMs: 300, intervalMs: 100 })

    await vi.advanceTimersByTimeAsync(400)

    await expect(result).resolves.toBe(false)
  })
})
