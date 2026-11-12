// Profile scrolls an inner view. Maestro web only scrolls the window, so the
// #sign-out flow centers the button itself, then lets the person take over.

export const SIGN_OUT_HASH = "#sign-out";

export interface SignOutNode {
  parent: SignOutNode | null;
  scrollHeight: number;
  clientHeight: number;
  scrollTop: number;
  overflowY: string;
  top: number;
  height: number;
}

const SCROLLABLE = new Set(["auto", "scroll", "overlay", "hidden"]);

export function findSignOutScroller(node: SignOutNode): SignOutNode | null {
  let scroller: SignOutNode | null = null;
  let overflow = 1;
  let parent = node.parent;
  while (parent) {
    const extra = parent.scrollHeight - parent.clientHeight;
    if (SCROLLABLE.has(parent.overflowY) && extra > overflow) {
      overflow = extra;
      scroller = parent;
    }
    parent = parent.parent;
  }
  return scroller;
}

export function centerInScroller(node: SignOutNode): boolean {
  const scroller = findSignOutScroller(node);
  if (!scroller) return false;
  const delta = node.top - scroller.top;
  scroller.scrollTop += delta - scroller.clientHeight / 2 + node.height / 2;
  return true;
}

export function isNodeInView(node: SignOutNode, viewportHeight: number): boolean {
  if (node.height <= 0) return false;
  const scroller = findSignOutScroller(node);
  const top = scroller ? Math.max(0, scroller.top) : 0;
  const bottom = scroller
    ? Math.min(viewportHeight, scroller.top + scroller.clientHeight)
    : viewportHeight;
  return node.top >= top && node.top + node.height <= bottom;
}

export function createSignOutFollow(options: {
  hash: () => string;
  button: () => SignOutNode | null;
  viewportHeight: () => number;
  schedule: (fn: () => void, ms: number) => number;
  cancel: (id: number) => void;
  later: (fn: () => void, ms: number) => number;
}) {
  let userStopped = false;
  let timer = 0;
  let deadline = 0;

  const stop = () => {
    if (timer) options.cancel(timer);
    if (deadline) options.cancel(deadline);
    timer = 0;
    deadline = 0;
  };

  const tick = () => {
    if (userStopped || options.hash() !== SIGN_OUT_HASH) return;
    const node = options.button();
    if (!node || isNodeInView(node, options.viewportHeight())) return;
    centerInScroller(node);
  };

  return {
    arm() {
      if (options.hash() !== SIGN_OUT_HASH) return;
      userStopped = false;
      stop();
      tick();
      timer = options.schedule(tick, 200);
      deadline = options.later(() => stop(), 25000);
    },
    noteUserScroll() {
      userStopped = true;
      stop();
    },
    dispose: stop,
  };
}
