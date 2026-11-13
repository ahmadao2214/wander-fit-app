import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { createdAtMs, isGeneratedEmail, parseRunResult, provisionPersona, signupEmail } from "./persona.mjs"

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

describe("persona email guard", () => {
  it("accepts the generated sign-in and sign-up addresses", () => {
    expect(isGeneratedEmail("e2e.1731400000000+clerk_test@example.com")).toBe(true)
    expect(isGeneratedEmail("e2e-1731400000000-signup+clerk_test@example.com")).toBe(true)
    expect(signupEmail(1731400000000)).toBe("e2e-1731400000000-signup+clerk_test@example.com")
    expect(isGeneratedEmail(signupEmail())).toBe(true)
  })

  it("refuses every other address", () => {
    for (const email of [
      "ahmad@example.com",
      "athlete@gmail.com",
      "test+clerk_test@example.com",
      "e2e-signup+clerk_test@example.com",
      "e2e--signup+clerk_test@example.com",
      "e2e-abc-signup+clerk_test@example.com",
      "e2e-1731400000000-other+clerk_test@example.com",
      "e2e-1731400000000-signup+clerk_test@example.org",
      "e2e-1731400000000-signup+clerk_test@example.com.evil.test",
      "e2e-1731400000000-signup@example.com",
      "xe2e-1731400000000-signup+clerk_test@example.com",
      "e2e.1731400000000+clerk_test@gmail.com",
      "e2e.+clerk_test@example.com",
      "",
      undefined,
    ]) {
      expect(isGeneratedEmail(email)).toBe(false)
    }
  })

  it("is the only guard delete and sweep use", () => {
    const source = fs.readFileSync(new URL("./persona.mjs", import.meta.url), "utf8")
    const deleteBody = source.slice(source.indexOf("async function deleteOne"), source.indexOf("async function remove"))
    const sweepBody = source.slice(source.indexOf("async function sweep"), source.indexOf("const invokedDirectly"))
    expect(deleteBody).toContain("if (!isGeneratedEmail(email))")
    expect(sweepBody).toContain("if (!isGeneratedEmail(email)) continue")
    expect(source).not.toMatch(/emailPattern\.test/)
  })
})

describe("persona inspect output", () => {
  it("reads the object convex run pretty-prints over several lines", () => {
    const stdout = '{\n  "email": "e2e-1-signup+clerk_test@example.com",\n  "found": true\n}\n'
    expect(parseRunResult(stdout)).toEqual({ email: "e2e-1-signup+clerk_test@example.com", found: true })
    expect(() => parseRunResult("")).toThrow(/no object/)
  })
})
