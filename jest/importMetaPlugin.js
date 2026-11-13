// Babel plugin for the Jest "node" project. Jest runs tests as CommonJS, where
// `import.meta` is a syntax error. The .mjs scripts under test use
// `import.meta.url`, and convex-test's ESM build mentions `import.meta.glob`.
// This swaps `import.meta` for a CommonJS equivalent.
module.exports = ({ template }) => {
  const build = template.expression(`({
    url: require("url").pathToFileURL(__filename).href,
    glob() {
      throw new Error("import.meta.glob is Vite-only; pass convexModules() from jest/convexModules");
    },
  })`)
  return {
    name: 'jest-import-meta',
    visitor: {
      MetaProperty(p) {
        if (p.node.meta.name === 'import' && p.node.property.name === 'meta') {
          p.replaceWith(build())
        }
      },
    },
  }
}
