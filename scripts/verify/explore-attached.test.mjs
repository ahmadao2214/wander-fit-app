import { attachedActionArgs, attachedEnvironment, attachedFrame } from "./explore-attached.mjs"

const nodes = [
  { label: "Profile, tab, 4 of 6", ref: "e2", hittable: true, kind: "button" },
  { label: "Training Science", identifier: "training-science-link", ref: "e3", hittable: true },
  { label: "Resume Workout", identifier: "resume-workout", ref: "e4", hittable: true },
]

describe("attached Explore evidence frames", () => {
  it("identifies every image frame so Explore can capture and name it", () => {
    const png = Buffer.alloc(24)
    png.writeUInt32BE(402, 16)
    png.writeUInt32BE(874, 20)
    const first = attachedFrame(nodes, "2026-11-14T00:00:00Z", png)
    const second = attachedFrame(nodes, "2026-11-14T00:00:01Z", png)
    expect(first.frameId).toEqual(expect.any(String))
    expect(second.frameId).not.toBe(first.frameId)
    expect(first.width).toBe(402)
    expect(first.height).toBe(874)
  })
})

describe("attached Explore navigation", () => {
  it("uses fresh semantic refs from the bound controller", () => {
    expect(attachedActionArgs({ action: "tap", label: "Profile, tab, 4 of 6" }, nodes)).toEqual(["press", "@e2", "--settle"])
    expect(attachedActionArgs({ action: "tap", identifier: "training-science-link" }, nodes)).toEqual(["press", "@e3", "--settle"])
  })
  it("refuses text input, coordinates, deep links, absent and disabled targets", () => {
    for (const action of [{ action: "back" }, { action: "fill", text: "secret" }, { action: "tap", x: 1, y: 2 }, { action: "open", url: "asrafit://profile" }, { action: "tap", label: "Unknown" }]) {
      expect(() => attachedActionArgs(action, nodes)).toThrow()
    }
    expect(() => attachedActionArgs({ action: "tap", label: nodes[0].label }, [{ ...nodes[0], enabled: false }])).toThrow()
  })
  it("refuses mutation controls even when addressed by identifier", () => {
    expect(() => attachedActionArgs({ action: "tap", identifier: "resume-workout" }, nodes)).toThrow(/refuses/)
    for (const label of ["Save", "Sign Out", "Delete account", "Start Workout", "Complete", "Reassess", "Confirm"]) {
      expect(() => attachedActionArgs({ action: "tap", label }, [{ label, ref: "e5", hittable: true }])).toThrow(/refuses/)
    }
  })
  it("allows scrolling but refuses unverified native back gestures", () => {
    expect(() => attachedActionArgs({ action: "back" }, [])).toThrow(/observed tab\/back labels/)
    expect(attachedActionArgs({ action: "scroll", direction: "down" }, [])).toEqual(["scroll", "down", "--settle"])
  })
})

describe("attached Explore environment", () => {
  it("passes local login paths, but no API, backend, device or account credentials", () => {
    expect(attachedEnvironment({ HOME: "/home", PATH: "/bin", OPENAI_API_KEY: "api", CLERK_SECRET_KEY: "clerk", APP_TEST_PASSWORD: "password", EXPO_TOKEN: "expo", AGENT_DEVICE_DAEMON_AUTH_TOKEN: "device" }, "/external/tmp")).toEqual({ HOME: "/home", PATH: "/bin", TMPDIR: "/external/tmp", TEMP: "/external/tmp", TMP: "/external/tmp", NO_COLOR: "1" })
  })
})
