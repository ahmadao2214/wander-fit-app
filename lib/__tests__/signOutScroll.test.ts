import { describe, expect, it } from "vitest";
import {
  SIGN_OUT_HASH,
  centerInScroller,
  createSignOutFollow,
  findSignOutScroller,
  isNodeInView,
  type SignOutNode,
} from "../signOutScroll";

function node(values: Partial<SignOutNode> & Pick<SignOutNode, "parent">): SignOutNode {
  return {
    scrollHeight: 0,
    clientHeight: 0,
    scrollTop: 0,
    overflowY: "visible",
    top: 0,
    height: 0,
    ...values,
  };
}

function profileList() {
  const scroller = node({
    parent: null,
    scrollHeight: 1600,
    clientHeight: 500,
    overflowY: "auto",
    top: 80,
    height: 500,
  });
  const clip = node({
    parent: scroller,
    scrollHeight: 48,
    clientHeight: 40,
    overflowY: "hidden",
    top: 200,
    height: 40,
  });
  const button = node({
    parent: clip,
    top: 1377,
    height: 44,
  });
  let scrollTop = 0;
  Object.defineProperty(scroller, "scrollTop", {
    get: () => scrollTop,
    set: (value: number) => {
      const delta = value - scrollTop;
      scrollTop = value;
      button.top -= delta;
    },
  });
  return { scroller, button };
}

function harness(button: SignOutNode, hash = SIGN_OUT_HASH) {
  const queued: { id: number; fn: () => void }[] = [];
  const cancelled: number[] = [];
  let nextId = 1;
  let currentHash = hash;
  const follow = createSignOutFollow({
    hash: () => currentHash,
    button: () => button,
    viewportHeight: () => 625,
    schedule: (fn) => {
      const id = nextId++;
      queued.push({ id, fn });
      return id;
    },
    cancel: (id) => {
      cancelled.push(id);
    },
    later: (fn) => {
      const id = nextId++;
      queued.push({ id, fn });
      return id;
    },
  });
  return {
    follow,
    cancelled,
    setHash: (value: string) => {
      currentHash = value;
    },
    ticks: () => queued.filter((item) => !cancelled.includes(item.id) && queued.indexOf(item) > 0),
    run(times: number) {
      for (let i = 0; i < times; i++) {
        const pending = queued.filter((item) => !cancelled.includes(item.id));
        const tick = pending.find((item) => item !== pending[pending.length - 1]);
        tick?.fn();
      }
    },
  };
}

describe("sign-out scroll", () => {
  it("centers the button in the profile list", () => {
    const { scroller, button } = profileList();
    expect(findSignOutScroller(button)).toBe(scroller);
    expect(centerInScroller(button)).toBe(true);
    expect(scroller.scrollTop).toBe(1377 - 80 - 250 + 22);
    expect(button.top).toBeGreaterThanOrEqual(scroller.top);
    expect(button.top + button.height).toBeLessThanOrEqual(scroller.top + scroller.clientHeight);
  });

  it("scrolls again when late sections leave the button inside the window but under the profile clip", () => {
    const scroller = node({
      parent: null,
      scrollHeight: 1600,
      clientHeight: 565,
      overflowY: "auto",
      top: 0,
      height: 565,
    });
    const button = node({ parent: scroller, top: 200, height: 44 });
    let scrollTop = 0;
    Object.defineProperty(scroller, "scrollTop", {
      get: () => scrollTop,
      set: (value: number) => {
        const delta = value - scrollTop;
        scrollTop = value;
        button.top -= delta;
      },
    });
    expect(isNodeInView(button, 625)).toBe(true);
    const { follow, run } = harness(button);
    follow.arm();
    expect(scroller.scrollTop).toBe(0);
    button.top = 570;
    expect(button.top + button.height).toBe(614);
    expect(isNodeInView(button, 625)).toBe(false);
    run(1);
    expect(scroller.scrollTop).toBeGreaterThan(0);
    expect(button.top + button.height).toBeLessThanOrEqual(565);
  });

  it("does nothing until the hash is set, then keeps the button in view", () => {
    const { scroller, button } = profileList();
    const { follow, cancelled, setHash, run } = harness(button, "");
    follow.arm();
    expect(scroller.scrollTop).toBe(0);
    setHash(SIGN_OUT_HASH);
    follow.arm();
    expect(scroller.scrollTop).toBeGreaterThan(0);
    const parked = scroller.scrollTop;
    run(5);
    expect(scroller.scrollTop).toBe(parked);
    expect(cancelled).toEqual([]);
  });

  it("scrolls again when content above the button grows", () => {
    const { scroller, button } = profileList();
    const { follow, run } = harness(button);
    follow.arm();
    const parked = scroller.scrollTop;
    scroller.scrollHeight += 400;
    button.top += 400;
    run(1);
    expect(scroller.scrollTop).toBeGreaterThan(parked);
  });

  it("leaves the list where the person scrolled it", () => {
    const { scroller, button } = profileList();
    const { follow, run } = harness(button);
    follow.arm();
    follow.noteUserScroll();
    scroller.scrollTop = 0;
    button.top = 1377;
    run(3);
    expect(scroller.scrollTop).toBe(0);
    expect(button.top).toBe(1377);
  });

  it("cancels the timers on dispose", () => {
    const { button } = profileList();
    const { follow, cancelled } = harness(button);
    follow.arm();
    follow.dispose();
    expect(cancelled).toEqual([1, 2]);
  });
});
