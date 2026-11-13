import { spawnSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { convert, dropExpectMessages } from "./vitest-to-jest.mjs"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const convexTest = path.join(root, "convex/__tests__/example.test.ts")

const vitestFile = `// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect, vi, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";

const modules = import.meta.glob("../**/*.ts");

describe("x", () => {
  afterEach(() => vi.useRealTimers());
  it("works", async () => {
    const spy = vi.fn(() => true);
    await vi.advanceTimersByTimeAsync(10);
    expect(spy(), \`call \${[1, 2].join(",")}\`).toBe(true);
    expect(convexTest(schema, modules)).toBeDefined();
  });
});
`

describe("vitest-to-jest codemod", () => {
  it("converts a Vitest file to Jest", () => {
    expect(convert(vitestFile, convexTest)).toBe(`import { convexTest } from "convex-test";
import schema from "../schema";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

describe("x", () => {
  afterEach(() => jest.useRealTimers());
  it("works", async () => {
    const spy = jest.fn(() => true);
    await jest.advanceTimersByTimeAsync(10);
    expect(spy()).toBe(true);
    expect(convexTest(schema, modules)).toBeDefined();
  });
});
`)
  })

  it("changes nothing the second time", () => {
    const once = convert(vitestFile, convexTest)
    expect(convert(once, convexTest)).toBe(once)
  })

  it("keeps a TypeScript file with no other import a module", () => {
    const src = 'import { it, expect } from "vitest";\ntype Phase = "GPP";\nit("a", () => expect(1).toBe(1));\n'
    const once = convert(src, convexTest)
    expect(once).toBe('export {};\ntype Phase = "GPP";\nit("a", () => expect(1).toBe(1));\n')
    expect(convert(once, convexTest)).toBe(once)
    expect(convert(src, path.join(root, "scripts/x.test.mjs"))).toBe(
      'type Phase = "GPP";\nit("a", () => expect(1).toBe(1));\n',
    )
  })

  it("keeps commas inside the one argument", () => {
    const src = 'expect(fn(a, b)).toBe(1); expect([1, 2], "m").toEqual([1, 2]); expect({ a, b }).toBeTruthy()'
    expect(dropExpectMessages(src)).toBe(
      "expect(fn(a, b)).toBe(1); expect([1, 2]).toEqual([1, 2]); expect({ a, b }).toBeTruthy()",
    )
  })

  it("leaves regexes, strings and comments alone", () => {
    const src = [
      'expect(/a,b/.test("a,b"), "matches").toBe(true)',
      'expect(fmt("expect(a, b)")).toBe("expect(a, b)") // expect(c, d)',
      "expect(`${a}, (`, `m`).toBe(1)",
      "",
    ].join("\n")
    expect(dropExpectMessages(src)).toBe(
      [
        'expect(/a,b/.test("a,b")).toBe(true)',
        'expect(fmt("expect(a, b)")).toBe("expect(a, b)") // expect(c, d)',
        "expect(`${a}, (`).toBe(1)",
        "",
      ].join("\n"),
    )
  })

  it("refuses an import.meta.glob pattern it does not know", () => {
    expect(() => convert('const m = import.meta.glob("./*.ts")\n', convexTest)).toThrow(
      "import.meta.glob",
    )
  })

  it("finds nothing left to convert in the repo", () => {
    const run = spawnSync(process.execPath, [path.join(root, "scripts/codemods/vitest-to-jest.mjs"), "--check"], {
      encoding: "utf8",
    })
    expect(run.stdout).toMatch(/^0 of \d+ file\(s\) need converting/m)
    expect(run.status).toBe(0)
  })
})
