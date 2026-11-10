import { describe, expect, it } from "vitest"
import { createdAtMs } from "./persona.mjs"

describe("persona sweep timestamps", () => {
  it("keeps Clerk's millisecond created_at", () => {
    const created = 1_700_000_000_000
    expect(Number.isNaN(Date.parse(created))).toBe(true)
    expect(createdAtMs(created)).toBe(created)
    expect(createdAtMs(String(created))).toBe(created)
    expect(createdAtMs(new Date(created).toISOString())).toBe(created)
    expect(createdAtMs(null)).toBe(0)
  })
})
