import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { createdAtMs, provisionPersona } from "./persona.mjs"

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

describe("persona provisioning", () => {
  it("keeps the Clerk cleanup record when provisioning fails", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-persona-"))
    const file = path.join(dir, "persona-latest.json")
    const record = {
      email: "e2e.1+clerk_test@example.com",
      password: "pw",
      clerkId: "user_1",
      state: "onboarded",
      createdAt: "2026-11-12T00:00:00.000Z",
    }
    try {
      expect(() =>
        provisionPersona(
          record,
          {
            seed() {},
            provision() {
              throw new Error("convex down")
            },
          },
          file
        )
      ).toThrow(/convex down/)
      expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual(record)
      expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    } finally {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })
})
