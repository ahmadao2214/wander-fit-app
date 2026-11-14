import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import {
  assertBuildPath,
  assertIosSdkSupported,
  buildEnv,
  cacheEnv,
  MIN_FREE,
  SIMULATOR_SIGNING,
  spaceProblems,
  EXPLORE_NODE,
  EXPLORE_VERSION,
  exploreArgs,
  hintsFor,
  outputDirName,
  prebuildArgs,
  quoteBundlePhase,
  replayPath,
  reviewEnv,
  reviewProblems,
  scanBundle,
  STATES,
} from "./explore.mjs"

const E2E = "https://wander-fit-e2e-123.convex.cloud"

describe("disposable Explore replay", () => {
  it("rejects the attached-only onboarded replay before build or account setup", () => {
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("./explore.mjs", import.meta.url)), "review", "--state", "onboarded", "--replay"], {
      encoding: "utf8",
      env: { PATH: "", HOME: "/nonexistent-explore-test-home" },
    })
    expect(result.status).toBe(2)
    expect(result.stderr).toContain("The onboarded replay requires an already authenticated attached device")
    expect(result.stdout).toBe("")
  })
})

describe("explore native SDK compatibility", () => {
  it("accepts the upgraded app on the proven Xcode 27 toolchain", () => {
    expect(() => assertIosSdkSupported("27.2\n", "58.0.25")).not.toThrow()
  })

  it("rejects SDKs that require the missing scene lifecycle before building", () => {
    expect(() => assertIosSdkSupported("27.2", "54.0.32")).toThrow(/Expo SDK 58/)
  })

  it("rejects an unknown SDK instead of guessing compatibility", () => {
    expect(() => assertIosSdkSupported("", "58.0.25")).toThrow(/Cannot determine/)
    expect(() => assertIosSdkSupported("27.2", "unknown")).toThrow(/Cannot determine/)
  })

  it("ad-hoc signs simulator builds for Clerk SecureStore keychain access", () => {
    expect(SIMULATOR_SIGNING).toEqual(["CODE_SIGNING_ALLOWED=YES", "CODE_SIGN_IDENTITY=-", "CODE_SIGNING_REQUIRED=NO"])
  })
})

describe("explore review result", () => {
  it("rejects an empty or missing screen map even when Explore exits zero", () => {
    expect(reviewProblems({ screens: [], run: { stopReason: "blocked" } })).toHaveLength(2)
    expect(reviewProblems(null)).toEqual(["Explore captured no screens."])
  })

  it("rejects a blocked run even after it reached a screen", () => {
    expect(reviewProblems({ screens: [{ id: "sign-in" }], run: { stopReason: "blocked" } })).toHaveLength(1)
  })

  it("accepts a run that reached screens without a blocker", () => {
    expect(reviewProblems({ screens: [{ id: "today" }], run: { stopReason: "completed" } })).toEqual([])
  })
})

describe("explore review env", () => {
  it("uses local logins rather than billable API keys and removes backend secrets", () => {
    const base = { PATH: "/bin", OPENAI_API_KEY: "openai", ANTHROPIC_API_KEY: "anthropic", CLERK_SECRET_KEY: "clerk", CONVEX_DEPLOY_KEY: "convex", APP_TEST_PASSWORD: "stale" }
    const env = reviewEnv(base, "review-password")
    expect(env.PATH).toBe("/bin")
    expect(env.APP_TEST_PASSWORD).toBe("review-password")
    for (const name of ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "CLERK_SECRET_KEY", "CONVEX_DEPLOY_KEY"]) {
      expect(env).not.toHaveProperty(name)
    }
    expect(base.OPENAI_API_KEY).toBe("openai")
  })

  it("passes no password for a signed-out review", () => {
    expect(reviewEnv({ APP_TEST_PASSWORD: "stale", TEST_USER_PASSWORD: "stale" })).not.toHaveProperty("APP_TEST_PASSWORD")
  })
})

describe("explore build path", () => {
  it("accepts a no-space volume", () => {
    expect(() => assertBuildPath("/Volumes/wander-fit-review/app")).not.toThrow()
  })

  it("rejects whitespace before starting native build tools", () => {
    for (const checkout of ["/Volumes/OWC Express 1M2/app", "/tmp/app\tcopy"]) {
      expect(() => assertBuildPath(checkout)).toThrow(/without whitespace/)
    }
  })
})

describe("explore build env", () => {
  it("bakes in the E2E backend with .env files off", () => {
    const env = buildEnv({ PATH: "/bin" }, { url: E2E, key: "pk_test_abc" })
    expect(env).toMatchObject({
      PATH: "/bin",
      EXPO_NO_DOTENV: "1",
      EXPO_PUBLIC_CONVEX_URL: E2E,
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_abc",
    })
  })

  it("drops every secret so none can reach the bundle", () => {
    const env = buildEnv(
      { CLERK_SECRET_KEY: "sk", CONVEX_DEPLOY_KEY: "k", CONVEX_DEPLOY_KEY_E2E: "k", CONVEX_PREVIEW_DEPLOY_KEY_E2E: "preview", EXPO_TOKEN: "expo", EXPO_SESSION_SECRET: "expo-session", OPENAI_API_KEY: "api", ANTHROPIC_API_KEY: "api", TEST_USER_PASSWORD: "p", APP_TEST_PASSWORD: "p" },
      { url: E2E, key: "pk_test_abc" }
    )
    for (const name of ["CLERK_SECRET_KEY", "CONVEX_DEPLOY_KEY", "CONVEX_DEPLOY_KEY_E2E", "CONVEX_PREVIEW_DEPLOY_KEY_E2E", "EXPO_TOKEN", "EXPO_SESSION_SECRET", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "TEST_USER_PASSWORD", "APP_TEST_PASSWORD"]) {
      expect(env).not.toHaveProperty(name)
    }
  })

  it("refuses the prod and dev deployments", () => {
    for (const url of ["https://fleet-mallard-22.convex.cloud", "https://accomplished-tapir-54.convex.cloud", ""]) {
      expect(() => buildEnv({}, { url, key: "pk_test_abc" })).toThrow(/Refusing/)
    }
  })

  it("needs the Clerk publishable key", () => {
    expect(() => buildEnv({}, { url: E2E, key: "" })).toThrow(/PUBLISHABLE_KEY/)
  })
})

describe("explore bundle scan", () => {
  const host = "wander-fit-e2e-123.convex.cloud"

  it("passes a bundle with only the E2E host", () => {
    expect(scanBundle(`x"https://${host}"y`, host)).toEqual([])
  })

  it("flags a missing E2E host, a blocked host and a Clerk secret", () => {
    const hits = scanBundle('"https://fleet-mallard-22.convex.cloud" "sk_test_abcdefghijkl"', host)
    expect(hits).toEqual([
      `bundle is missing the E2E Convex host (${host})`,
      "bundle contains blocked Convex host fleet-mallard-22.convex.cloud",
      "bundle contains a Clerk secret key",
    ])
  })
})

describe("explore hints", () => {
  it("names the password only as a secret reference", () => {
    for (const state of STATES.filter((s) => s !== "signed-out")) {
      const hints = hintsFor(state, "review+clerk_test@example.com")
      expect(hints).toContain("{{secret:APP_TEST_PASSWORD}}")
      expect(hints).toContain("review+clerk_test@example.com")
      expect(hints).toContain("never create an account")
    }
  })

  it("keeps signed-out runs from signing in", () => {
    const hints = hintsFor("signed-out")
    expect(hints).toContain("Stay signed out")
    expect(hints).not.toContain("{{secret:")
  })
})

describe("explore command", () => {
  const base = { app: "/a/asrafit.app", output: "/o", state: "onboarded", email: "r@example.com" }

  it("prebuilds through pinned Node 24 rather than an old system Node", () => {
    expect(prebuildArgs("/checkout")).toEqual(["-y", "-p", `node@${EXPLORE_NODE}`, "node", "/checkout/node_modules/expo/bin/cli", "prebuild", "--platform", "ios"])
  })

  it("runs the pinned Explore on Node 24, on a local simulator", () => {
    const args = exploreArgs(base)
    expect(args.slice(0, 8)).toEqual([
      "-y", "-p", `node@${EXPLORE_NODE}`, "-p", `@expo/explore@${EXPLORE_VERSION}`, "expo-explore", "explore:binary", "/a/asrafit.app",
    ])
    expect(args.join(" ")).toContain("--simulator local")
    expect(args).toContain("--hints")
    expect(args).not.toContain("--replay")
  })

  it("uses the replay instead of a model when given one", () => {
    const args = exploreArgs({ ...base, replay: "/r/onboarded.json" })
    expect(args.join(" ")).toContain("--replay /r/onboarded.json")
    // Explore refuses --hints with --replay.
    expect(args).not.toContain("--hints")
  })

  it("keeps replays under .expo-explore and names runs by time and state", () => {
    expect(replayPath("onboarded")).toMatch(/\.expo-explore\/replays\/onboarded\.json$/)
    expect(outputDirName("phase-end", new Date("2026-11-13T08:05:00Z"))).toBe("20261113-0805-phase-end")
  })
})

describe("explore disk space", () => {
  const GB = 1024 ** 3

  it("passes with room on both disks", () => {
    expect(spaceProblems({ checkout: 100 * GB, home: 10 * GB })).toEqual([])
  })

  it("names each disk that is short, before anything starts", () => {
    const problems = spaceProblems({ checkout: 2 * GB, home: 0.4 * GB })
    expect(problems).toHaveLength(2)
    expect(problems[0]).toMatch(/checkout's disk has 2\.0 GB free/)
    expect(problems[1]).toMatch(/home disk has 0\.4 GB free/)
  })

  it("asks for less on the home disk, which only holds the simulator", () => {
    expect(MIN_FREE.home).toBeLessThan(MIN_FREE.checkout)
  })
})

describe("explore caches", () => {
  it("keeps CocoaPods, npm and Explore downloads beside the checkout", () => {
    expect(cacheEnv("/repo/e2e-artifacts/explore/cache")).toEqual({
      CP_CACHE_DIR: "/repo/e2e-artifacts/explore/cache/cocoapods",
      npm_config_cache: "/repo/e2e-artifacts/explore/cache/npm",
      EXPLORE_CACHE_DIR: "/repo/e2e-artifacts/explore/cache/expo-explore",
      XDG_CACHE_HOME: "/repo/e2e-artifacts/explore/cache/xdg",
      TMPDIR: "/repo/e2e-artifacts/explore/cache/tmp",
    })
  })
})

describe("explore bundle phase", () => {
  // As it appears in the generated project.pbxproj: quotes escaped with a backslash.
  const unquoted =
    "fi\\n\\n`\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\"`\\n\\n\";"

  it("quotes the react-native-xcode.sh call so a path with a space survives", () => {
    const fixed = quoteBundlePhase(unquoted)
    expect(fixed).not.toContain("`")
    expect(fixed).toContain(
      "\\\"$(\\\"$NODE_BINARY\\\" --print \\\"require('path').dirname(require.resolve('react-native/package.json')) + '/scripts/react-native-xcode.sh'\\\")\\\""
    )
  })

  it("leaves a project that already quotes it alone", () => {
    const fixed = quoteBundlePhase(unquoted)
    expect(quoteBundlePhase(fixed)).toBe(fixed)
    expect(quoteBundlePhase("no bundle phase")).toBe("no bundle phase")
  })
})
