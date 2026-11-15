/**
 * Structural rules every sport icon Lottie must follow. They keep the files
 * small, make every player (lottie-ios, lottie-android, dotlottie-web) draw
 * the same thing, and keep the shared timing intact. The pixel checks
 * (safe circle, seamless loop) live in scripts/lottie/check.mjs.
 */

export const SPORT_LOTTIE_RULES = {
  frameRate: 30,
  loopFrames: 150,
  canvas: 1000,
  softLimitBytes: 15 * 1024,
  hardLimitBytes: 20 * 1024,
  totalLimitBytes: 350 * 1024,
} as const;

type Json = unknown;
type Obj = Record<string, unknown>;

const isObj = (v: Json): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Walks every object in the tree, with a readable path for messages. */
function walk(node: Json, visit: (obj: Obj, path: string) => void, path = "$"): void {
  if (Array.isArray(node)) {
    node.forEach((child, i) => walk(child, visit, `${path}[${i}]`));
  } else if (isObj(node)) {
    visit(node, path);
    for (const [key, child] of Object.entries(node)) walk(child, visit, `${path}.${key}`);
  }
}

const sameValue = (a: unknown, b: unknown, modulo?: number): boolean => {
  const as = Array.isArray(a) ? a : [a];
  const bs = Array.isArray(b) ? b : [b];
  if (as.length !== bs.length) return false;
  return as.every((x, i) => {
    const y = bs[i];
    if (typeof x !== "number" || typeof y !== "number") return x === y;
    const diff = Math.abs(x - y);
    return diff < 1e-3 || (modulo !== undefined && Math.abs(diff % modulo) < 1e-3);
  });
};

/**
 * Returns a list of problems; empty means the file passes.
 * `bytes` is the file's size on disk.
 */
export function checkSportLottie(lottie: Json, bytes: number): string[] {
  const problems: string[] = [];
  const r = SPORT_LOTTIE_RULES;
  if (!isObj(lottie)) return ["not a Lottie object"];

  if (bytes > r.softLimitBytes) {
    problems.push(`${(bytes / 1024).toFixed(1)} KB is over the ${r.softLimitBytes / 1024} KB budget`);
  }
  if (lottie.fr !== r.frameRate) problems.push(`frame rate ${lottie.fr}, expected ${r.frameRate}`);
  if (lottie.ip !== 0 || lottie.op !== r.loopFrames) {
    problems.push(`frames ${lottie.ip}–${lottie.op}, expected 0–${r.loopFrames}`);
  }
  if (lottie.w !== r.canvas || lottie.h !== r.canvas) {
    problems.push(`canvas ${lottie.w}×${lottie.h}, expected ${r.canvas}×${r.canvas}`);
  }
  if (Array.isArray(lottie.assets) && lottie.assets.length > 0) {
    problems.push("has assets (images or precomps)");
  }

  walk(lottie, (obj, path) => {
    if ("x" in obj && typeof obj.x === "string") problems.push(`${path} has an expression`);
    if (Array.isArray(obj.ef) && obj.ef.length > 0) problems.push(`${path} has effects`);
    if (Array.isArray(obj.masksProperties) && obj.masksProperties.length > 0) problems.push(`${path} has masks`);
    if ("tt" in obj || obj.td === 1) problems.push(`${path} uses a track matte`);
    if (obj.ty === 2 || obj.ty === 5) problems.push(`${path} is an image or text layer`);
    if (obj.ty === "mm") problems.push(`${path} uses merge paths (off by default on Android)`);
    if ("to" in obj || "ti" in obj) problems.push(`${path} has a curved motion path; animate X and Y separately`);
  });

  // Every animated property starts and ends on the same value, so frame 0 is
  // the rest pose and the loop has no jump. Rotation may end a full turn later.
  walk(lottie, (obj, path) => {
    if (obj.a !== 1 || !Array.isArray(obj.k) || obj.k.length === 0) return;
    const keys = obj.k as Obj[];
    const first = keys[0];
    const last = keys[keys.length - 1];
    if (first.t !== 0) problems.push(`${path} first keyframe is at ${first.t}, not 0`);
    if (last.t !== r.loopFrames) problems.push(`${path} last keyframe is at ${last.t}, not ${r.loopFrames}`);
    const isRotation = path.endsWith(".r");
    if (!sameValue(first.s, last.s, isRotation ? 360 : undefined)) {
      problems.push(`${path} ends at ${JSON.stringify(last.s)} but starts at ${JSON.stringify(first.s)}`);
    }
  });

  return problems;
}
