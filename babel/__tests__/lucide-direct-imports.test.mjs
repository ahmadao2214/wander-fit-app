import { createRequire } from 'node:module'
import { describe, it, expect } from 'vitest'

const require = createRequire(import.meta.url)
const { transformSync } = require('@babel/core')
const lucideDirectImports = require('../lucide-direct-imports.js')

const ICONS = '@tamagui/lucide-icons/dist/esm/icons'

function transform(code) {
  return transformSync(code, {
    babelrc: false,
    configFile: false,
    plugins: [lucideDirectImports],
    parserOpts: { plugins: ['typescript', 'jsx'] },
  }).code
}

describe('lucide-direct-imports', () => {
  it("imports each icon from its own file instead of the package's barrel", () => {
    const out = transform("import { Dumbbell, Calendar } from '@tamagui/lucide-icons'")
    expect(out).toContain(`import { Dumbbell } from "${ICONS}/Dumbbell";`)
    expect(out).toContain(`import { Calendar } from "${ICONS}/Calendar";`)
    expect(out).not.toMatch(/from ["']@tamagui\/lucide-icons["']/)
  })

  it('keeps a local alias', () => {
    const out = transform("import { Clock as ClockIcon } from '@tamagui/lucide-icons'")
    expect(out).toContain(`import { Clock as ClockIcon } from "${ICONS}/Clock";`)
  })

  it('leaves type-only imports on the package root', () => {
    const typeImport = "import type { User } from '@tamagui/lucide-icons'"
    expect(transform(typeImport)).toContain("from '@tamagui/lucide-icons'")

    const mixed = transform("import { type IconProps, User } from '@tamagui/lucide-icons'")
    expect(mixed).toContain("import { type IconProps } from '@tamagui/lucide-icons';")
    expect(mixed).toContain(`import { User } from "${ICONS}/User";`)
  })

  it('leaves names without their own icon file on the package root', () => {
    const out = transform("import { Dumbbell, NotARealIcon } from '@tamagui/lucide-icons'")
    expect(out).toContain("import { NotARealIcon } from '@tamagui/lucide-icons';")
    expect(out).toContain(`import { Dumbbell } from "${ICONS}/Dumbbell";`)
  })

  it('ignores other packages', () => {
    const code = "import { Dumbbell } from 'some-other-icons'"
    expect(transform(code)).toContain("import { Dumbbell } from 'some-other-icons';")
  })

  it('points only at icon files that exist for both native and web', () => {
    const fs = require('node:fs')
    const path = require('node:path')
    const dir = path.join(path.dirname(require.resolve('@tamagui/lucide-icons/package.json')), 'dist/esm/icons')
    expect(fs.existsSync(path.join(dir, 'Dumbbell.native.js'))).toBe(true)
    expect(fs.existsSync(path.join(dir, 'Dumbbell.mjs'))).toBe(true)
  })
})
