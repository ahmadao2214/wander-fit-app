import fs from "node:fs";
import path from "node:path";

// convex-test loads Convex functions from a map of path -> loader. Under Vite
// that map comes from `import.meta.glob("../**/*.ts")`; Jest has no glob
// import, so this walks convex/ and builds the same map with require().
type ModuleMap = Record<string, () => Promise<any>>;

const convexDir = path.resolve(__dirname, "../convex");

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.name.endsWith(".ts")) files.push(full);
  }
  return files;
}

export function convexModules(): ModuleMap {
  const modules: ModuleMap = {};
  for (const file of walk(convexDir)) {
    // Keys keep the "convex/" prefix; convex-test strips everything up to
    // "_generated" to find the module root.
    const key = path.relative(path.dirname(convexDir), file).split(path.sep).join("/");
    modules[key] = () => Promise.resolve(require(file));
  }
  return modules;
}
