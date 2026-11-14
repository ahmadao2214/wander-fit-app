import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import {
  createdAtMs,
  isGeneratedEmail,
  parseRunResult,
  provisionPersona,
  REVIEW_EMAIL,
  reviewPlan,
  signupEmail,
  writeCredentials,
} from "./persona.mjs"

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
  it("replaces credentials privately without truncating the previous record first", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "verify-review-credentials-"))
    const file = path.join(dir, "review-account.json")
    const saved = { password: "saved" }
    fs.writeFileSync(file, JSON.stringify(saved), { mode: 0o644 })
    const rename = fs.renameSync.bind(fs)
    const operation = jest.spyOn(fs, "renameSync").mockImplementation((temporary, destination) => {
      expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual(saved)
      expect(fs.statSync(temporary).mode & 0o777).toBe(0o600)
      rename(temporary, destination)
    })
    try {
      writeCredentials({ password: "updated" }, file)
      expect(operation).toHaveBeenCalledTimes(1)
      expect(JSON.parse(fs.readFileSync(file, "utf8"))).toEqual({ password: "updated" })
      expect(fs.statSync(file).mode & 0o777).toBe(0o600)
    } finally {
      operation.mockRestore()
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

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

describe("persona review account", () => {
  const onboarded = { found: true, onboardingCompleted: true, hasProgram: true }

  it("is never an address delete or sweep accepts", () => {
    expect(isGeneratedEmail(REVIEW_EMAIL)).toBe(false)
  })

  it("creates the user and its program when nothing exists", () => {
    expect(reviewPlan({ clerkId: "", saved: null, inspected: null })).toEqual({
      createUser: true,
      provision: true,
    })
  })

  it("changes nothing on a second run", () => {
    const saved = { clerkId: "user_1", password: "pw" }
    expect(reviewPlan({ clerkId: "user_1", saved, inspected: onboarded })).toEqual({
      createUser: false,
      provision: false,
    })
  })

  it("never resets an existing password when credentials are absent or mismatched", () => {
    expect(() => reviewPlan({ clerkId: "user_1", saved: null, inspected: onboarded })).toThrow(/Refusing to reset/)
    expect(() => reviewPlan({ clerkId: "user_1", saved: { clerkId: "user_0", password: "pw" }, inspected: onboarded })).toThrow(/Refusing to reset/)
  })

  it("never reprovisions an existing account, even with incomplete state", () => {
    const saved = { clerkId: "user_1", password: "pw" }
    expect(() => reviewPlan({ clerkId: "user_1", saved, inspected: { found: false } })).toThrow(/reprovision/)
    expect(() => reviewPlan({ clerkId: "user_1", saved, inspected: { ...onboarded, hasProgram: false } })).toThrow(/reprovision/)
    expect(() => reviewPlan({ clerkId: "user_1", saved, inspected: { ...onboarded, onboardingCompleted: false } })).toThrow(/reprovision/)
    expect(() => reviewPlan({ clerkId: "", saved: null, inspected: onboarded })).toThrow(/reprovision/)
    expect(reviewPlan({ clerkId: "user_1", saved, inspected: onboarded }).provision).toBe(false)
  })
})
