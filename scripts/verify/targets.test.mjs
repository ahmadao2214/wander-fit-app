import { previewDeployArgs } from "./run.mjs"
import {
  BLOCKED_CONVEX_HOSTS,
  assertConvexUrlAllowed,
  assertPreviewKey,
  devKeyHost,
  previewName,
  resolveConvexTarget,
} from "./targets.mjs"

// Shapes only. None of these are real keys.
const previewKey = "preview:ahmadao2214:wander-fit-e2e|token"
const devKey = "dev:modest-kudu-493|token"
const devUrl = "https://modest-kudu-493.convex.cloud"
const previewUrl = "https://jovial-bat-501.convex.cloud"
const appUrls = BLOCKED_CONVEX_HOSTS.map((host) => `https://${host}`)

describe("app deployment guard", () => {
  it("refuses both app deployments in every mode", () => {
    const refused = []
    for (const url of appUrls) {
      for (const keys of [
        { previewKey, previewLabel: "pr-1" },
        { devKey: `dev:${new URL(url).host.split(".")[0]}|token` },
        { envFileDeployment: `dev:${new URL(url).host.split(".")[0]}` },
      ]) {
        try {
          resolveConvexTarget({ url, ...keys })
        } catch (error) {
          if (/Refusing Convex host/.test(error.message)) refused.push(url)
        }
      }
    }
    expect(refused).toEqual(appUrls.flatMap((url) => [url, url, url]))
  })

  it("refuses a dev key for an app deployment on its own", () => {
    for (const host of BLOCKED_CONVEX_HOSTS) {
      expect(() => devKeyHost(`dev:${host.split(".")[0]}|token`)).toThrow(/Refusing Convex host/)
    }
    expect(() => assertConvexUrlAllowed(appUrls[0])).toThrow(/Refusing Convex host/)
  })
})

describe("preview deployments (pull requests)", () => {
  it("accepts this PR's preview with a wander-fit-e2e preview key", () => {
    expect(resolveConvexTarget({ url: previewUrl, previewKey, previewLabel: "pr-101" })).toEqual({
      mode: "preview",
      host: "jovial-bat-501.convex.cloud",
      env: { CONVEX_DEPLOY_KEY: previewKey },
      args: ["--preview-name", "pr-101"],
    })
  })

  it("refuses preview keys for other projects and other key kinds", () => {
    for (const key of [
      "preview:ahmadao2214:wander-fit|token",
      "preview:ahmadao2214|token",
      "prod:fleet-mallard-22|token",
      devKey,
      "",
    ]) {
      expect(() => assertPreviewKey(key)).toThrow(/preview deploy key for wander-fit-e2e/)
    }
    expect(assertPreviewKey(previewKey)).toBe("wander-fit-e2e")
  })

  it("needs the branch name and refuses both keys at once", () => {
    expect(() => resolveConvexTarget({ url: previewUrl, previewKey, previewLabel: "" })).toThrow(
      /CONVEX_PREVIEW_NAME_E2E/
    )
    expect(() => resolveConvexTarget({ url: previewUrl, previewKey, devKey, previewLabel: "x" })).toThrow(/not both/)
  })

  it("keeps CI's pr-<number> name and cleans up anything else", () => {
    expect(previewName("pr-101")).toBe("pr-101")
    expect(previewName("t3/e2e-preview-backends")).toBe("t3-e2e-preview-backends")
    expect(previewName("Claude/Fix_Thing--2")).toBe("claude-fix-thing-2")
    expect(previewName("a".repeat(30) + "/" + "b".repeat(30))).toBe("a".repeat(30) + "-" + "b".repeat(9))
    expect(previewName("x".repeat(39) + "/y")).toBe("x".repeat(39))
    expect(() => previewName("///")).toThrow()
  })

  it("deploys to the named preview, seeds it, and reports its URL", () => {
    const args = previewDeployArgs("t3-feature")
    const value = (flag) => args[args.indexOf(flag) + 1]
    expect(args[0]).toBe("deploy")
    expect(value("--preview-create")).toBe("t3-feature")
    expect(value("--preview-run")).toBe("seed:seedAll")
    expect(value("--cmd")).toBe("node scripts/verify/run.mjs record-url")
    expect(value("--cmd-url-env-var-name")).toBe("EXPO_PUBLIC_CONVEX_URL_E2E")
  })
})

describe("dev deployment (main and local)", () => {
  it("keeps the dev key matched to the URL", () => {
    expect(resolveConvexTarget({ url: devUrl, devKey })).toEqual({
      mode: "dev",
      host: "modest-kudu-493.convex.cloud",
      env: { CONVEX_DEPLOY_KEY: devKey },
      args: [],
    })
    expect(() => resolveConvexTarget({ url: previewUrl, devKey })).toThrow(/does not match/)
  })

  it("falls back to the .env.e2e deployment and checks it too", () => {
    expect(resolveConvexTarget({ url: devUrl, envFileDeployment: "dev:modest-kudu-493" }).mode).toBe("local")
    expect(() => resolveConvexTarget({ url: devUrl, envFileDeployment: "prod:modest-kudu-493" })).toThrow(/\.env\.e2e/)
    expect(() => resolveConvexTarget({ url: "" })).toThrow(/persona is locked/)
  })
})
