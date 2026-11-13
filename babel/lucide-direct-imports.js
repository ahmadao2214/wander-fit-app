// Rewrites `import { Dumbbell } from '@tamagui/lucide-icons'` to import that one icon's own file.
//
// The package root re-exports about 1,700 icons. Metro doesn't tree-shake (not in dev, and not in
// production without an experimental flag), so every barrel import shipped all of them: about
// 4.5 MB of the JS bundle. Each icon has its own file (dist/esm/icons/<Name>.native.js for native,
// <Name>.mjs for web), so importing it directly ships only the icons the app uses.
//
// Names without their own file, and type-only imports, are left on the package root.
const fs = require('fs')
const path = require('path')

const PACKAGE = '@tamagui/lucide-icons'
const ICONS_SUBPATH = 'dist/esm/icons'

let iconsDir
function hasOwnFile(name) {
  if (iconsDir === undefined) {
    try {
      iconsDir = path.join(path.dirname(require.resolve(`${PACKAGE}/package.json`)), ICONS_SUBPATH)
    } catch {
      iconsDir = null
    }
  }
  return (
    iconsDir !== null &&
    fs.existsSync(path.join(iconsDir, `${name}.native.js`)) &&
    fs.existsSync(path.join(iconsDir, `${name}.mjs`))
  )
}

module.exports = function lucideDirectImports({ types: t }) {
  return {
    name: 'lucide-direct-imports',
    visitor: {
      ImportDeclaration(declPath) {
        const { node } = declPath
        if (node.source.value !== PACKAGE || node.importKind === 'type') return

        const direct = []
        const remaining = []
        for (const specifier of node.specifiers) {
          if (t.isImportSpecifier(specifier) && specifier.importKind !== 'type') {
            const name = t.isIdentifier(specifier.imported) ? specifier.imported.name : specifier.imported.value
            if (hasOwnFile(name)) {
              direct.push(
                t.importDeclaration(
                  [t.importSpecifier(t.identifier(specifier.local.name), t.identifier(name))],
                  // No extension: Metro and Jest pick .native.js on native and .mjs on web.
                  t.stringLiteral(`${PACKAGE}/${ICONS_SUBPATH}/${name}`)
                )
              )
              continue
            }
          }
          remaining.push(specifier)
        }

        if (direct.length === 0) return
        if (remaining.length > 0) {
          node.specifiers = remaining
          declPath.insertAfter(direct)
        } else {
          declPath.replaceWithMultiple(direct)
        }
      },
    },
  }
}
