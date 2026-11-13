#!/usr/bin/env node
// Converts Vitest test files to Jest. Safe to run again: a converted file
// changes no further.
//
//   node scripts/codemods/vitest-to-jest.mjs            # every test file in the repo
//   node scripts/codemods/vitest-to-jest.mjs <file...>  # only these files
//   node scripts/codemods/vitest-to-jest.mjs --check    # list, change nothing; exit 1 if any
//
// What it does to each file:
// - removes `import { ... } from "vitest"` (Jest provides the globals), the
//   `// @vitest-environment` docblock and `/// <reference types="vite/client" />`.
//   A TypeScript file left with no import or export gets `export {}`, so tsc
//   keeps treating it as a module rather than a global script.
// - maps `vi.*` to `jest.*`
// - drops the message from `expect(value, "message")`: Jest's expect takes one
//   argument and throws "Expect takes at most one argument" otherwise
// - replaces `import.meta.glob("../**/*.ts")`, which only Vite provides, with
//   `convexModules()` from jest/convexModules.ts and imports it
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const TEST_FILE = /\.test\.(ts|tsx|js|mjs)$/
// scripts/codemods holds this codemod's own test, whose fixtures are Vitest code.
const SKIP_DIRS = new Set(["node_modules", ".git", ".claude", ".expo", "dist", "codemods"])

const VITEST_IMPORT = /^import\s+(?:type\s+)?\{[^}]*\}\s+from\s+["']vitest["'];?[ \t]*\r?\n/gm
const VITEST_ENV = /^\/\/\s*@vitest-environment\b.*\r?\n/gm
const VITE_TYPES = /^\/\/\/\s*<reference types=["']vite\/client["']\s*\/>[ \t]*\r?\n/gm
const VI_CALL = /(?<![\w$.])vi\./g
const CONVEX_GLOB = /import\.meta\.glob\(\s*["']\.\.\/\*\*\/\*\.ts["']\s*\)/g
const ANY_GLOB = /import\.meta\.glob\(/
const HELPER = path.join(root, "jest/convexModules")

export function convert(source, filePath) {
  const isTs = /\.tsx?$/.test(filePath)
  const onlyVitestImports = !source.replace(VITEST_IMPORT, "").match(/^(import|export)\b/m)
  const keepModule = isTs && onlyVitestImports && VITEST_IMPORT.test(source)
  VITEST_IMPORT.lastIndex = 0
  let out = source
    .replace(VITEST_IMPORT, keepModule ? "export {};\n" : "")
    .replace(VITEST_ENV, "")
    .replace(VITE_TYPES, "")
    .replace(VI_CALL, "jest.")
  out = dropExpectMessages(out)

  if (out.match(CONVEX_GLOB)) {
    out = out.replace(CONVEX_GLOB, "convexModules()")
    if (!/\bconvexModules\b.*from\s+["'][^"']*jest\/convexModules["']/.test(out)) {
      let rel = path.relative(path.dirname(filePath), HELPER).split(path.sep).join("/")
      if (!rel.startsWith(".")) rel = `./${rel}`
      const line = `import { convexModules } from "${rel}";\n`
      const imports = [...out.matchAll(/^import[\s\S]*?from\s+["'][^"']+["'];?[ \t]*\r?\n/gm)]
      const at = imports.length ? imports.at(-1).index + imports.at(-1)[0].length : 0
      out = out.slice(0, at) + line + out.slice(at)
    }
  }
  if (ANY_GLOB.test(out)) {
    throw new Error(`${filePath}: import.meta.glob with a pattern this codemod does not know`)
  }
  return out
}

// Index just past the string, template or bracket group that starts at i.
function skip(src, i) {
  const open = src[i]
  if (open === '"' || open === "'") {
    for (i++; i < src.length && src[i] !== open; i++) if (src[i] === "\\") i++
    return i + 1
  }
  if (open === "`") {
    for (i++; i < src.length && src[i] !== "`"; i++) {
      if (src[i] === "\\") i++
      else if (src[i] === "$" && src[i + 1] === "{") i = skip(src, i + 1) - 1
    }
    return i + 1
  }
  const close = { "(": ")", "[": "]", "{": "}" }[open]
  for (i++; i < src.length && src[i] !== close; ) {
    if (`"'\`([{`.includes(src[i])) i = skip(src, i)
    else i++
  }
  return i + 1
}

export function dropExpectMessages(src) {
  let out = ""
  let last = 0
  for (const m of src.matchAll(/(?<![\w$.])expect\(/g)) {
    const open = m.index + m[0].length - 1
    if (open < last) continue
    const end = skip(src, open) - 1
    // Find a comma at the top level of the argument list.
    let comma = -1
    for (let i = open + 1; i < end; ) {
      if (src[i] === ",") {
        comma = i
        break
      }
      if (`"'\`([{`.includes(src[i])) i = skip(src, i)
      else i++
    }
    if (comma === -1 || src.slice(comma + 1, end).trim() === "") continue
    out += src.slice(last, comma)
    last = end
  }
  return out + src.slice(last)
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (TEST_FILE.test(entry.name)) files.push(full)
  }
  return files
}

function main(args) {
  const check = args.includes("--check")
  const paths = args.filter((a) => a !== "--check")
  const files = paths.length ? paths.map((f) => path.resolve(f)) : walk(root)
  let changed = 0
  for (const file of files) {
    const before = fs.readFileSync(file, "utf8")
    const after = convert(before, file)
    if (after !== before) {
      changed++
      if (!check) fs.writeFileSync(file, after)
      console.log(`${check ? "needs converting" : "converted"} ${path.relative(root, file)}`)
    }
  }
  console.log(`${changed} of ${files.length} file(s) ${check ? "need converting" : "changed"}`)
  if (check && changed) process.exitCode = 1
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2))
}
