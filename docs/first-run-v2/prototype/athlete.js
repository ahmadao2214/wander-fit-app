// Faceless silhouette athletes for the category tiles, drawn in code.
// A 2D skeleton with absolute joint angles (0° points straight down, 90° points the way the
// athlete faces, 180° straight up). Bodies are shaped masses: a tapered torso (shoulders wider
// than the waist), limbs that narrow from joint to joint, a head and neck, and feet.
// Each category has keyframed poses; the lit tile plays its move once, the others hold a still.
const ATHLETE = (() => {
  const L = { torso: 30, neck: 5, head: 7.2, upper: 16, fore: 15, thigh: 21, shin: 21, foot: 9 }
  const rad = (a) => (a * Math.PI) / 180
  const step = (x, y, ang, len) => [x + Math.sin(rad(ang)) * len, y + Math.cos(rad(ang)) * len]

  // p: [rootX, rootY, torso, armFar(upper, fore), armNear(upper, fore), legFar(thigh, shin), legNear(thigh, shin), tool]
  // flip: the athlete faces the other way from this key on (Endurance's change of direction).
  const POSES = {
    // Endurance: drive forward, plant and brake, then cut back the other way
    1: { frames: [
      { t: 0, p: [44, 70, 162, 50, 125, -50, 25, -35, -80, 60, 5, 0] },
      { t: 0.42, p: [50, 74, 196, 75, 110, -60, -20, -20, -45, 42, 30, 0] },
      { t: 0.58, p: [50, 74, 196, 75, 110, -60, -20, -20, -45, 42, 30, 0], flip: true },
      { t: 1, p: [50, 70, 150, -45, 30, 55, 130, 65, 5, -40, -85, 0], flip: true }], ms: 900, female: true },
    // Power: load, take off arms-first, land soft
    2: { frames: [
      { t: 0, p: [48, 84, 135, -55, -30, -55, -30, 75, -15, 70, -20, 0] },
      { t: 0.42, p: [50, 60, 178, 160, 172, 150, 168, 4, -8, 10, -2, 0] },
      { t: 0.7, p: [50, 62, 176, 150, 165, 140, 160, 15, -20, 25, -5, 0] },
      { t: 1, p: [50, 80, 145, 40, 80, 30, 70, 65, -10, 60, -15, 0] }], ms: 1000 },
    // Rotation: coil, the back hip drives first, then the shoulders and bat follow through
    3: { frames: [
      { t: 0, p: [46, 72, 176, -70, 160, -60, 165, -26, -6, 28, 6, 205] },
      { t: 0.3, p: [46, 72, 178, -72, 158, -62, 163, -26, -6, 28, 6, 208] },
      { t: 0.5, p: [49, 72, 176, -60, 150, -50, 155, 8, -45, 26, 4, 215] },
      { t: 0.68, p: [51, 72, 166, 62, 95, 72, 92, 14, -55, 26, 4, 92] },
      { t: 1, p: [52, 73, 160, 122, 205, 112, 200, 18, -62, 24, 2, 262] }], ms: 820, female: true, tool: 'bat' },
    // Strength: a low drive, two steps into a sled
    4: { frames: [
      { t: 0, p: [21, 76, 122, 98, 92, 102, 96, 70, 0, -38, -48, 0] },
      { t: 0.5, p: [25, 76, 120, 98, 92, 102, 96, -38, -48, 70, 0, 0] },
      { t: 1, p: [29, 76, 122, 98, 92, 102, 96, 70, 0, -38, -48, 0] }], ms: 900, tool: 'sled' },
  }

  const lerp = (a, b, k) => a + (b - a) * k
  const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2)
  function poseAt(cat, k) {
    const f = POSES[cat].frames
    let i = 0
    while (i < f.length - 2 && k > f[i + 1].t) i++
    const a = f[i], b = f[i + 1]
    const local = ease(Math.min(1, Math.max(0, (k - a.t) / (b.t - a.t))))
    const p = a.p.map((v, j) => lerp(v, b.p[j], local))
    p.flip = local >= 0.5 ? !!b.flip : !!a.flip
    return p
  }

  // Opaque colors mixed against the tile, so overlapping limbs don't show seams.
  function colors(lit, tile) {
    const mix = (a, pct) => `color-mix(in srgb, ${a} ${pct}%, ${tile})`
    return lit
      ? { body: '#FFFFFF', far: mix('#FFFFFF', 66), kit: mix('#0B1220', 28), tool: '#0B1220' }
      : { body: mix('#FFFFFF', 24), far: mix('#FFFFFF', 15), kit: mix('#FFFFFF', 34), tool: mix('#FFFFFF', 22) }
  }

  // A segment that narrows from w1 to w2, with rounded joints.
  function taper(x1, y1, x2, y2, w1, w2, color, round = true) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len
    const pts = [[x1 + nx * w1 / 2, y1 + ny * w1 / 2], [x2 + nx * w2 / 2, y2 + ny * w2 / 2], [x2 - nx * w2 / 2, y2 - ny * w2 / 2], [x1 - nx * w1 / 2, y1 - ny * w1 / 2]]
    const poly = `<polygon points="${pts.map(p => p.map(v => v.toFixed(1)).join(',')).join(' ')}" style="fill:${color}"/>`
    if (!round) return poly
    return poly +
      `<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${(w1 / 2).toFixed(1)}" style="fill:${color}"/>` +
      `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${(w2 / 2).toFixed(1)}" style="fill:${color}"/>`
  }

  function draw(svg, cat, pose, lit, tile = '#131C2E') {
    const def = POSES[cat], female = !!def.female
    const [rx, ry, tor, fu, ff, nu, nf, ft, fs, nt, ns, tool] = pose
    const c = colors(lit, tile)
    const W = female
      ? { sh: 15, waist: 10, hip: 13, ua: [6.5, 5], fa: [5, 3.8], th: [11, 7], sn: [7, 4.6] }
      : { sh: 19, waist: 12, hip: 14, ua: [8, 6], fa: [6, 4.4], th: [12.5, 8], sn: [8, 5] }
    const out = []
    const at = (x, y, a, l) => step(x, y, a, l)
    const [sx, sy] = at(rx, ry, tor, L.torso)
    const arm = (u, f, color, kit) => {
      const [ex, ey] = at(sx, sy, u, L.upper), [hx, hy] = at(ex, ey, f, L.fore)
      out.push(taper(sx, sy, ex, ey, W.ua[0], W.ua[1], color), taper(ex, ey, hx, hy, W.fa[0], W.fa[1], color))
      out.push(`<circle cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" r="${(W.fa[1] * 0.75).toFixed(1)}" style="fill:${color}"/>`)
      if (kit) { const [kx, ky] = at(sx, sy, u, L.upper * 0.45); out.push(taper(sx, sy, kx, ky, W.ua[0] + 1.5, W.ua[0] + 1, kit, false)) }
      return [hx, hy]
    }
    const leg = (t, s, color, kit) => {
      const [kx, ky] = at(rx, ry, t, L.thigh), [ax, ay] = at(kx, ky, s, L.shin), [tx, ty] = at(ax, ay, s + 90, L.foot)
      out.push(taper(rx, ry, kx, ky, W.th[0], W.th[1], color), taper(kx, ky, ax, ay, W.sn[0], W.sn[1], color), taper(ax, ay, tx, ty, W.sn[1] + 1, 3.5, color))
      if (kit) { const [mx, my] = at(rx, ry, t, L.thigh * 0.55); out.push(taper(rx, ry, mx, my, W.th[0] + 1.5, W.th[0] + 0.5, kit, false)) }
    }
    if (def.tool === 'sled') {
      const [ex, ey] = at(sx, sy, nu, L.upper), [hx, hy] = at(ex, ey, nf, L.fore)
      const g = 117 // ground
      out.push(`<rect x="${(hx + 1).toFixed(1)}" y="${(hy - 4).toFixed(1)}" width="5" height="${(g - hy).toFixed(1)}" rx="2" style="fill:${c.tool}"/>`)
      out.push(`<rect x="${(hx - 2).toFixed(1)}" y="${g - 5}" width="32" height="5" rx="2.5" style="fill:${c.tool}"/>`)
      out.push(`<rect x="${(hx + 11).toFixed(1)}" y="${g - 17}" width="13" height="12" rx="2" style="fill:${c.tool}"/>`)
    }
    arm(fu, ff, c.far)
    leg(ft, fs, c.far)
    // torso: shoulders wider than the waist, then the hips
    const [wx, wy] = at(rx, ry, tor, L.torso * 0.35)
    out.push(taper(sx, sy, wx, wy, W.sh, W.waist, c.body), taper(wx, wy, rx, ry, W.waist, W.hip, c.body))
    out.push(taper(...at(sx, sy, tor + 180, 1.5), ...at(sx, sy, tor + 180, L.torso * 0.66), W.sh, W.waist + 0.5, c.kit, false))
    const [nx, ny] = at(sx, sy, tor, L.neck)
    out.push(taper(sx, sy, nx, ny, 6, 5, c.body))
    const [hx, hy] = at(sx, sy, tor, L.neck + L.head)
    out.push(`<ellipse cx="${hx.toFixed(1)}" cy="${hy.toFixed(1)}" rx="${(L.head * 0.9).toFixed(1)}" ry="${L.head}" transform="rotate(${(180 - tor).toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)})" style="fill:${c.body}"/>`)
    if (female) { const [px, py] = at(hx, hy, tor + 205, L.head); out.push(taper(px, py, ...at(px, py, tor + 160, 9), 5, 2.5, c.body)) }
    leg(nt, ns, c.body, c.kit)
    const [hx2, hy2] = arm(nu, nf, c.body, c.kit)
    if (def.tool === 'bat') out.push(taper(hx2, hy2, ...at(hx2, hy2, tool, 30), 2.6, 4.2, c.tool))
    svg.innerHTML = `<g transform="${pose.flip ? 'translate(100 0) scale(-1 1)' : ''}">${out.join('')}</g>`
  }

  function mount(el, cat, lit, { tile = '#131C2E', litTile = tile } = {}) {
    // The viewBox holds each athlete's whole motion, so nothing clips at the tile edges.
    el.innerHTML = '<svg viewBox="-8 -22 116 142" width="100%" height="100%" preserveAspectRatio="xMidYMax meet" aria-hidden="true"></svg>'
    const svg = el.firstChild
    draw(svg, cat, poseAt(cat, 0), lit, lit ? litTile : tile)
    return {
      play(reduced) {
        if (reduced) { draw(svg, cat, poseAt(cat, 1), true, litTile); return }
        const ms = POSES[cat].ms, t0 = performance.now()
        const tick = (now) => {
          const k = Math.min(1, (now - t0) / ms)
          draw(svg, cat, poseAt(cat, k), true, litTile)
          if (k < 1) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      },
      at(k, lit2) { draw(svg, cat, poseAt(cat, k), lit2, lit2 ? litTile : tile) },
    }
  }
  return { mount, POSES }
})()
