// Character definitions: hair builders, costume extras, weapons and the main presets.
// Built to match the PS1 models in references/Final Fantasy 7 (1997)/ (Model Reference = field models,
// Character Reference = battle models) and references/portraits.jpg (PS1 faces).
(function () {
  const U = FF7.util, V = FF7.V3;
  const C3 = FF7.chars3d;
  const sh = U.shade;
  const meshOf = C3.meshOf;
  const HAIR = C3.HAIR, EXTRA = C3.EXTRA, WEAPON = C3.WEAPON, P = C3.PRESETS;
  const deg = (d) => d * Math.PI / 180;
  const smooth = (t) => { t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };

  // ================================================================== head surface helpers
  // Everything here follows the head loft built in humanoid.js (H.rings, same superellipse H.sq), so
  // hair can never end up smaller than the skull.
  function se(a, rx, rz, sq) {
    const c = Math.cos(a), s = Math.sin(a), e = 2 / (sq || 2);
    return [Math.sign(c) * Math.pow(Math.abs(c), e) * rx, Math.sign(s) * Math.pow(Math.abs(s), e) * rz];
  }
  function ringAt(H, y) {
    const R = H.rings;
    if (y <= R[0].y) return { rx: R[0].rx, rz: R[0].rz, x: R[0].x || 0, z: R[0].z || 0 };
    const last = R[R.length - 1];
    if (y >= last.y) return { rx: last.rx, rz: last.rz, x: last.x || 0, z: last.z || 0 };
    for (let k = 0; k < R.length - 1; k++) {
      const a = R[k], b = R[k + 1];
      if (y >= a.y && y <= b.y) {
        const t = (y - a.y) / (b.y - a.y || 1);
        return { rx: U.lerp(a.rx, b.rx, t), rz: U.lerp(a.rz, b.rz, t), x: U.lerp(a.x || 0, b.x || 0, t), z: U.lerp(a.z || 0, b.z || 0, t) };
      }
    }
    return { rx: last.rx, rz: last.rz, x: 0, z: 0 };
  }
  // Point on the head surface: ang (radians; 0 = model's left +x, PI/2 = front, PI = right, 3PI/2 = back),
  // yf = height fraction of the head, out = radial scale (1 = skin surface), pad = extra absolute offset.
  function headPt(H, ang, yf, out = 1, pad = 0) {
    const r = ringAt(H, U.clamp(yf, 0, 1) * H.hh);
    const [px, pz] = se(ang, r.rx * out + pad, r.rz * out + pad, H.sq);
    return [r.x + px, yf * H.hh, r.z + pz];
  }
  C3.headPt = headPt;
  // legacy helper name (angle in radians, 90deg = front)
  const onHead = (H, ang, yf, out = 1.0) => headPt(H, ang, yf, out);
  C3.onHead = onHead;
  const HC = (H) => [0, H.hh * 0.52, -H.hd * 0.02];   // head centre (for radial blades)

  // Hair shell that encloses the whole skull. Rows follow the head rings, scaled out by `scale` (+pad);
  // the lower edge is a smooth hairline that depends on the angle from the front:
  //   front (forehead, default 0.74 of head height) -> sides (above the ears) -> back (nape, 0.18).
  // o: { front, sides, back, scale, pad, lift, zOff, maxY (bald band top), frontW (deg), seg, light, color2 }
  function cap(mb, H, color, o = {}) {
    const s = o.scale || 1.08;
    const pad = (o.pad != null ? o.pad : 0.005) * (H.battle ? 0.55 : 1);
    const n = o.seg || 20;
    const front = o.front != null ? o.front : 0.74;
    const sideL = o.sides != null ? o.sides : Math.min(front, 0.48);
    const back = o.back != null ? o.back : 0.18;
    const maxY = o.maxY != null ? o.maxY : 9;
    const lift = (o.lift || 0) * H.hh, zOff = (o.zOff || 0) * H.hd;
    const tF = deg(o.frontW != null ? o.frontW : 36), tS = deg(96), tB = deg(146);
    const lim = (ang) => {
      const th = Math.abs(Math.atan2(Math.cos(ang), Math.sin(ang)));   // angle away from the front (0..PI)
      if (th <= tF) return front;
      if (th <= tS) return U.lerp(front, sideL, smooth((th - tF) / (tS - tF)));
      if (th <= tB) return U.lerp(sideL, back, smooth((th - tS) / (tB - tS)));
      return back;
    };
    // below mid-head the back of the shell hangs straight down (hair doesn't follow the skull's undercut to the neck)
    const hangY = o.hang != null ? o.hang : 0.5;
    const r50 = ringAt(H, hangY * H.hh);
    const pt = (ang, yf) => {
      let r = ringAt(H, U.clamp(yf, 0, 1) * H.hh);
      const w = yf < hangY ? U.clamp(-Math.sin(ang) * 1.6, 0, 1) : 0;
      if (w > 0) r = { rx: U.lerp(r.rx, Math.max(r.rx, r50.rx * 0.97), w), rz: U.lerp(r.rz, Math.max(r.rz, r50.rz * 0.97), w), x: r.x, z: U.lerp(r.z, r50.z, w) };
      const [px, pz] = se(ang, r.rx * s + pad, r.rz * s + pad, H.sq);
      return [r.x + px, yf * H.hh + lift + (yf >= 0.999 ? pad : 0), r.z + pz + zOff];
    };
    const ys = [1.0, 0.95, 0.88, 0.78, 0.68, 0.56, 0.45, 0.34, 0.22, 0.12, 0.04];
    // hats pass their own lighter top; hair keeps a slightly darker crown (it faces the key light) and
    // alternating lock shades, so it never reads as a smooth pale swim cap from the high field camera
    const hat = o.light != null;
    const light = o.light || sh(color, -0.07);
    const lock = (base, i, yf) => hat || yf < 0.6 ? base : (i % 2 ? sh(base, -0.05) : base);
    for (let j = 0; j < ys.length - 1; j++) {
      const yt = Math.min(ys[j], maxY), yb = ys[j + 1];
      if (yb >= maxY) continue;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        const b0 = Math.min(yt, Math.max(yb, lim(a0))), b1 = Math.min(yt, Math.max(yb, lim(a1)));
        if (b0 >= yt - 1e-5 && b1 >= yt - 1e-5) continue;
        const c = o.colorFn ? o.colorFn(j, (a0 + a1) / 2) || color : lock(ys[j] > 0.9 ? light : color, i, ys[j]);
        const A = pt(a0, yt), B = pt(a1, yt), C = pt(a1, b1), D = pt(a0, b0);
        if (b1 >= yt - 1e-5) mb.tri(A, C, D, c); else if (b0 >= yt - 1e-5) mb.tri(A, B, C, c); else mb.quad(A, B, C, D, c);
      }
    }
    if (maxY >= 1) {   // close the crown with a low dome (a single fan to a point looked pinched)
      const r = ringAt(H, H.hh);
      const base = H.hh + lift + pad, top = H.hh * (1 + (s - 1) * 0.5) + pad * 1.5 + lift;
      const midY = base + (top - base) * 0.8, cx = r.x, cz = r.z + zOff;
      const inner = (a) => { const q = pt(a, 1); return [cx + (q[0] - cx) * 0.58, midY, cz + (q[2] - cz) * 0.58]; };
      const apex = [cx, top, cz];
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, c = lock(light, i, 1);
        mb.quad(inner(a1), pt(a1, 1), pt(a0, 1), inner(a0), c);
        mb.tri(apex, inner(a1), inner(a0), c);
      }
    }
  }
  C3.hairCap = cap;
  // Blades laid on the head: list of [angleDeg (90 = front), yf, dir[x,y,z], len (x hh), width (x hw), thick (x hd)?]
  function blades(mb, H, c, list, out = 1.06, tip) {
    const ctr = { radial: HC(H) };
    list.forEach(([ang, yf, dir, len, w, th]) => mb.blade(headPt(H, deg(ang), yf, out), dir, H.hh * len, H.hw * w, H.hd * (th || 0.08), c, ctr, tip));
  }
  // Bangs over the forehead: list of [offsetDeg from front, len (x hh), width (x hw), sway] hanging down.
  // Each lock runs from a root on the hair shell to a tip just outside the face surface, so it always
  // lies on top of the forehead (never inside the skull).
  function bangs(mb, H, c, list, o = {}) {
    const yf = o.y || 0.9, out = o.out || 1.14, outTip = o.outTip || 1.1;
    const ctr = { radial: HC(H) };
    list.forEach(([off, len, w, dx]) => {
      const root = headPt(H, deg(90 + off), yf, out);
      const tip = headPt(H, deg(90 + off + (dx || 0) * 40), Math.max(0.05, yf - len), outTip + (o.fwd != null ? o.fwd * 0.1 : 0.03));
      const d = V.sub(tip, root);
      mb.blade(root, d, V.len(d), H.hw * w, H.hd * (o.th || 0.07), c, ctr, o.tip);
    });
  }
  // Solid fringe: a strip of the hair shell over the forehead with a jagged (sawtooth) lower edge.
  // o: { range (deg half-width, default 52), top (yf), n (locks), len: fn(t in -1..1) -> tip yf, notch (how much
  //      higher the gaps are), scale, part (t of a centre parting where the notch goes deep), flare }
  function fringe(mb, H, c, o = {}) {
    const range = deg(o.range || 52), top = o.top != null ? o.top : 0.86, n = (o.n || 7) * 2;
    const s = o.scale || 1.1, pad = 0.005 * (H.battle ? 0.55 : 1), notch = o.notch != null ? o.notch : 0.1;
    const lenF = typeof o.len === 'function' ? o.len : ((t) => o.len != null ? o.len : 0.56);
    const pt = (ang, yf, k) => { const r = ringAt(H, U.clamp(yf, 0, 1) * H.hh); const [px, pz] = se(ang, r.rx * k + pad, r.rz * k + pad, H.sq); return [r.x + px, yf * H.hh, r.z + pz]; };
    const light = sh(c, 0.06);
    for (let i = 0; i < n; i++) {
      const t0 = i / n * 2 - 1, t1 = (i + 1) / n * 2 - 1;
      const a0 = Math.PI / 2 - t0 * range, a1 = Math.PI / 2 - t1 * range;   // t = -1 viewer's left
      const yb = (t, k) => { const tip = lenF(t); return k % 2 === 0 ? Math.min(top - 0.02, tip + notch * (o.part != null && Math.abs(t - o.part) < 1.5 / n ? 2.5 : 1)) : tip; };
      const b0 = yb(t0, i), b1 = yb(t1, i + 1);
      const k0 = s * (i % 2 === 0 ? 1 : (o.flare || 1.03)), k1 = s * ((i + 1) % 2 === 0 ? 1 : (o.flare || 1.03));
      const A = pt(a0, top, s), B = pt(a1, top, s);
      const mid0 = (top + b0) / 2, mid1 = (top + b1) / 2;
      const M0 = pt(a0, mid0, (s + k0) / 2), M1 = pt(a1, mid1, (s + k1) / 2), D = pt(a0, b0, k0), C = pt(a1, b1, k1);
      mb.quad(B, A, M0, M1, light);   // angle decreases along the strip: wind so faces point outward
      mb.quad(M1, M0, D, C, c);
    }
  }
  // A lock that follows the head surface from (a0 deg, y0) to (a1 deg, y1) as a tapered ribbon lying
  // just outside the skull (it can never cut through the cheek). Below the jaw (y < 0.3) it hangs
  // straight down. o: { out, outTip, w1 (tip width frac), n, th }
  function lockTo(mb, H, c, a0, y0, a1, y1, w, o = {}) {
    const N = o.n || 6, out0 = o.out || 1.14, out1 = o.outTip || 1.12;
    const pts = [], nrm = [];
    for (let k = 0; k <= N; k++) {
      const t = k / N, ang = deg(U.lerp(a0, a1, t)), y = U.lerp(y0, y1, t), out = U.lerp(out0, out1, t);
      const p = headPt(H, ang, Math.max(y, 0.3), out);
      p[1] = y * H.hh;
      const r = ringAt(H, Math.max(y, 0.3) * H.hh);
      pts.push(p); nrm.push(V.norm([p[0] - r.x, 0.15, p[2] - r.z]));
    }
    const L = [], R = [];
    for (let k = 0; k <= N; k++) {
      const tg = V.norm(V.sub(pts[Math.min(N, k + 1)], pts[Math.max(0, k - 1)]));
      const sd = V.norm(V.cross(tg, nrm[k]));
      const ww = H.hw * w * 0.5 * (1 - (k / N) * (1 - (o.w1 != null ? o.w1 : 0)));
      const lift = V.scale(nrm[k], H.hd * (o.th || 0.04));
      L.push(V.add(V.add(pts[k], V.scale(sd, ww)), lift)); R.push(V.add(V.sub(pts[k], V.scale(sd, ww)), lift));
    }
    const dk = sh(c, -0.1);
    for (let k = 0; k < N; k++) {
      const n0 = V.cross(V.sub(R[k], L[k]), V.sub(L[k + 1], L[k]));
      if (V.dot(n0, nrm[k]) >= 0) mb.quad(L[k], R[k], R[k + 1], L[k + 1], c); else mb.quad(L[k], L[k + 1], R[k + 1], R[k], c);
      // underside (so the lock has some body when seen edge-on)
      if (V.dot(n0, nrm[k]) >= 0) mb.quad(L[k + 1], R[k + 1], pts[k + 1], pts[k + 1], dk);
    }
  }
  // Long hair curtain down the back from the crown: o { len (x hh, below the chin), w (x hw), top (yf), flare, thick }
  function curtain(mb, H, c, o = {}) {
    const len = o.len || 1.2, w = o.w || 0.5, top = o.top != null ? o.top : 0.75, th = o.thick || 0.14;
    const zb = -H.hd * (o.z != null ? o.z : 0.36);
    const rings = [
      { y: H.hh * top, rx: H.hw * w * 1.02, rz: H.hd * th * 1.6, z: zb + H.hd * 0.12 },
      { y: H.hh * 0.3, rx: H.hw * w * 1.06, rz: H.hd * th * 1.3, z: zb - H.hd * 0.06 },
      { y: -H.hh * len * 0.45, rx: H.hw * w * (o.mid || 0.98), rz: H.hd * th, z: zb - H.hd * 0.12 },
      { y: -H.hh * len * 0.85, rx: H.hw * w * (o.flare || 0.86), rz: H.hd * th * 0.8, z: zb - H.hd * 0.14 },
      { y: -H.hh * len, rx: H.hw * w * (o.tip != null ? o.tip : 0.5), rz: H.hd * th * 0.5, z: zb - H.hd * 0.13 },
    ];
    mb.loft(rings, { sides: 8, color: c, sq: 2.6 });
  }
  // Hair mass hanging round the head below the cap (FF7 field models): an open-front shell that falls straight down
  // from the widest part of the skull to `bottom` (yf; negative = below the chin) with a jagged hem, so the side and
  // back hair read as one broad rounded mass framing the face instead of separate thin locks. Two-sided (darker
  // inside). o: { top (yf where it leaves the skull), bottom, open (deg half-width of the face opening at the top),
  //      openBot (at the hem), scale, flare (hem radius x), back (extra depth behind, x hd), jag (x hh), n }
  function bell(mb, H, c, o = {}) {
    const top = o.top != null ? o.top : 0.72, bot = o.bottom != null ? o.bottom : -0.2, s = o.scale || 1.14, n = o.n || 14;
    const jag = (o.jag != null ? o.jag : 0.1) * H.hh, pad = 0.005 * (H.battle ? 0.55 : 1), back = (o.back || 0) * H.hd;
    const op0 = o.open != null ? o.open : 50, op1 = o.openBot != null ? o.openBot : op0;
    const wideY = 0.62, wide = ringAt(H, wideY * H.hh), inner = sh(c, -0.16);
    const ys = top > wideY ? [top, wideY, U.lerp(wideY, bot, 0.5), bot] : [top, U.lerp(top, bot, 0.5), bot];
    const P = (i, j) => {
      const yf = ys[j], t = U.clamp((wideY - yf) / (wideY - bot || 1), 0, 1);
      const op = deg(U.lerp(op0, op1, U.clamp((top - yf) / (top - bot || 1), 0, 1)));
      const a = Math.PI / 2 + op + (Math.PI * 2 - 2 * op) * i / n;
      const r = yf > wideY ? ringAt(H, yf * H.hh) : wide, k = s * U.lerp(1, o.flare || 1, t);
      const [px, pz] = se(a, r.rx * k + pad, r.rz * k + pad, H.sq);
      const dy = j === ys.length - 1 && i % 2 === 1 ? -jag : 0;
      return [r.x + px, yf * H.hh + dy, r.z + pz - Math.max(0, -Math.sin(a)) * back * t];
    };
    for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < n; i++) {
      const A = P(i, j), B = P(i + 1, j), C = P(i + 1, j + 1), D = P(i, j + 1), cc = i % 2 ? c : sh(c, -0.04);
      mb.quad(A, B, C, D, cc); mb.quad(D, C, B, A, inner);
    }
  }
  // Pointed strands down the back (the jagged lower edge of long hair)
  function tips(mb, H, c, o = {}) {
    const n = o.n || 5, y = -H.hh * (o.y || 1.1), w = H.hw * (o.w || 0.45), z = -H.hd * (o.z || 0.5);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1) - 0.5) * 2 * w * 0.8; mb.blade([x, y + H.hh * 0.25, z], [x * 0.5, -1, -0.1], H.hh * (o.len || 0.4) * (i % 2 ? 0.8 : 1), w * 2 / n * 1.3, H.hd * 0.06, c, [1, 0, 0]); }
  }
  // Side hair of a bald head: short tufts above each ear that stick out, and a thin strip round the back of the
  // head (a smooth band there read as a bandage or visor from behind and from the field camera).
  // o: { top (yf of the tufts / strip top), n (tufts per side), len (x hh), w (x hw), up (tilt), strip (false = none) }
  function sideTufts(mb, H, c, o = {}) {
    const top = o.top || 0.62, n = o.n || 3, L = o.len || 0.3, W = o.w || 0.36, up = o.up != null ? o.up : -0.3, l = sh(c, 0.08), ctr = { radial: HC(H) };
    if (o.strip !== false) {   // thin strip at the back, its upper edge broken up by short locks hanging down
      cap(mb, H, c, { front: 2, sides: 2, back: top - 0.26, maxY: top - 0.12, scale: 1.04, frontW: 60 });
      for (let i = 0; i < 5; i++) { const ang = 230 + i * 20; mb.blade(headPt(H, deg(ang), top - 0.06, 0.99), [Math.cos(deg(ang)) * 0.5, -1, Math.sin(deg(ang)) * 0.5], H.hh * 0.2, H.hw * 0.3, H.hd * 0.1, c, ctr); }
    }
    [1, -1].forEach(s => { for (let i = 0; i < n; i++) {
      const t = n > 1 ? i / (n - 1) : 0.5, ang = 90 - s * (78 + t * 56), yf = top - 0.05 - (i % 2) * 0.07;
      mb.blade(headPt(H, deg(ang), yf, 0.98), [Math.cos(deg(ang)), 0.15 + up, Math.sin(deg(ang)) * 0.7 - 0.3], H.hh * L * (i % 2 ? 0.85 : 1), H.hw * W, H.hd * 0.16, c, ctr, l);
    } });
  }
  // Moustache as geometry (painted 1-2 px moustaches vanish at field scale). a.moustache: 'bushy' (walrus, default),
  // 'handlebar' (ends curl up), 'droop' (long thin ends hanging past the chin); colour a.mustacheColor
  function moustache(mb, H, a) {
    const c = a.mustacheColor || a.beardColor || a.hair || '#1c1612', st = a.moustache || 'bushy', ctr = { radial: HC(H) };
    const y = 0.26, k = a.moustacheScale || 1;
    [1, -1].forEach(s => {
      const root = headPt(H, deg(90 - s * 4), y, 1.03);
      if (st === 'droop') { mb.blade(root, [s * 1, -0.35, 0.05], H.hw * 0.22 * k, H.hh * 0.07 * k, H.hd * 0.05, c, ctr); mb.blade(headPt(H, deg(90 - s * 24), y - 0.03, 1.03), [s * 0.2, -1, 0.1], H.hh * 0.34 * k, H.hw * 0.07 * k, H.hd * 0.05, c, [1, 0, 0]); }
      else if (st === 'handlebar') { mb.blade(root, [s * 1, -0.2, 0.05], H.hw * 0.26 * k, H.hh * 0.08 * k, H.hd * 0.06, c, ctr); mb.blade(headPt(H, deg(90 - s * 30), y - 0.01, 1.02), [s * 0.6, 1, 0.1], H.hh * 0.12 * k, H.hw * 0.06 * k, H.hd * 0.05, c, ctr); }
      else mb.blade(root, [s * 1, -0.5, 0.1], H.hw * 0.3 * k, H.hh * 0.1 * k, H.hd * 0.08, c, ctr);
    });
  }
  C3.hairKit = { cap, blades, bangs, fringe, lockTo, curtain, bell, tips, headPt, ringAt, sideTufts, moustache };

  // ================================================================== generic hair styles
  HAIR.short = (mb, H, a) => { const c = a.hair || '#402818'; cap(mb, H, c, { front: 0.76, sides: 0.5, back: 0.2, scale: 1.08 }); fringe(mb, H, c, { top: 0.84, len: (t) => 0.66 + Math.abs(t) * 0.04, n: 5, notch: 0.07, range: 50, scale: 1.09 }); };
  HAIR.messy = (mb, H, a) => { HAIR.short(mb, H, a); const c = a.hair || '#402818'; blades(mb, H, c, [[40, 0.95, [0.5, 0.8, 0.3], 0.3, 0.3], [130, 0.95, [-0.5, 0.8, 0.3], 0.3, 0.3], [270, 0.9, [0, 0.6, -1], 0.3, 0.35], [220, 0.8, [-0.6, 0.3, -0.8], 0.28, 0.3], [320, 0.8, [0.6, 0.3, -0.8], 0.28, 0.3], [90, 1.0, [0.1, 1, 0.4], 0.3, 0.35]], 1.05); };
  HAIR.spiky = (mb, H, a) => { const c = a.hair || '#402818'; cap(mb, H, c, { front: 0.78, sides: 0.5, back: 0.22, scale: 1.08 }); for (let i = 0; i < 9; i++) { const an = 20 + i * 40; blades(mb, H, c, [[an, 0.9, [Math.cos(deg(an)) * 0.5, 1, Math.sin(deg(an)) * 0.5], 0.42, 0.34]], 1.02); } };
  HAIR.spikyback = (mb, H, a) => { const c = a.hair || '#303030'; cap(mb, H, c, { front: 0.78, sides: 0.5, back: 0.2 }); blades(mb, H, c, [[200, 0.85, [-0.5, 0.4, -1], 0.5, 0.4], [240, 0.8, [-0.2, 0.3, -1], 0.55, 0.45], [300, 0.8, [0.2, 0.3, -1], 0.55, 0.45], [340, 0.85, [0.5, 0.4, -1], 0.5, 0.4], [270, 0.95, [0, 0.8, -1], 0.5, 0.45]], 1.02); };
  HAIR.slick = (mb, H, a) => { const c = a.hair || '#202020'; cap(mb, H, c, { front: 0.8, sides: 0.5, back: 0.2, scale: 1.06 }); mb.blade(headPt(H, deg(90), 0.86, 1.08), [0, 0.5, -1], H.hh * 0.3, H.hw * 0.7, H.hd * 0.1, sh(c, 0.08)); };
  HAIR.parted = (mb, H, a) => { const c = a.hair || '#202020'; cap(mb, H, c, { front: 0.78, sides: 0.48, back: 0.2, scale: 1.07 }); bangs(mb, H, c, [[-26, 0.2, 0.4, -0.5], [20, 0.18, 0.36, 0.5]], { y: 0.95, out: 1.1, fwd: 0.4 }); };
  HAIR.buzz = (mb, H, a) => cap(mb, H, a.hair || '#202020', { front: 0.84, sides: 0.55, back: 0.28, scale: 1.03, pad: 0.003 });
  HAIR.bald = (mb, H, a) => { if (a.hair && a.hair !== a.skin && a.fringe !== false) sideTufts(mb, H, a.hair, { top: a.fringeTop || 0.64 }); };
  HAIR.none = () => {};
  HAIR.tuft = (mb, H, a) => { HAIR.bald(mb, H, a); const c = a.tuftColor || a.hair || '#e0c040'; mb.blade(headPt(H, deg(90), 1.0, 0.4), [0, 1, 0.15], H.hh * 0.32, H.hw * 0.3, H.hd * 0.5, c, [1, 0, 0]); };
  HAIR.long = (mb, H, a) => {
    const c = a.hair || '#402818';
    cap(mb, H, c, { front: 0.75, sides: 0.05, back: 0.0, scale: 1.08 });
    curtain(mb, H, c, { len: a.hairLen || 1.0, w: 0.52 });
    [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 62), 0.72, 1.1), [s * 0.12, -1, 0.05], H.hh * 0.95, H.hw * 0.24, H.hd * 0.08, c, [0, 0, 1]));
    fringe(mb, H, c, { top: 0.84, len: 0.58, n: 6, notch: 0.09, range: 54, part: -0.15 });
  };
  HAIR.bob = (mb, H, a) => {
    const c = a.hair || '#402818';
    cap(mb, H, c, { front: 0.76, sides: 0.1, back: 0.08, scale: 1.12 });
    [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 58), 0.55, 1.12), [s * 0.1, -1, 0.1], H.hh * 0.45, H.hw * 0.3, H.hd * 0.08, c, [0, 0, 1]));
    fringe(mb, H, c, { top: 0.84, len: 0.56, n: 6, notch: 0.07, range: 56, scale: 1.13 });
  };
  HAIR.ponytail = (mb, H, a) => {
    const c = a.hair || '#402818';
    cap(mb, H, c, { front: 0.76, sides: 0.42, back: 0.18, scale: 1.08 });
    const base = headPt(H, deg(270), 0.72, 1.1);
    mb.sweep(mb.curvePts([base, [0, H.hh * 0.62, base[2] - H.hd * 0.25], [0, H.hh * 0.05, base[2] - H.hd * 0.3], [0, -H.hh * (a.tailLen || 0.5), base[2] - H.hd * 0.15]], 2), [H.hw * 0.12, H.hw * 0.16, H.hw * 0.15, H.hw * 0.13, H.hw * 0.11, H.hw * 0.08, 0], { sides: 6, color: c });
    fringe(mb, H, c, { top: 0.84, len: (t) => 0.6 + Math.abs(t) * 0.04, n: 5, notch: 0.08, range: 52 });
  };
  HAIR.bun = (mb, H, a) => { const c = a.hair || '#704828'; cap(mb, H, c, { front: 0.76, sides: 0.42, back: 0.2, scale: 1.08 }); mb.sphere(0, H.hh * 0.98, -H.hd * 0.22, H.hw * 0.2, H.hh * 0.15, H.hd * 0.2, c, 8, 5, true); fringe(mb, H, c, { top: 0.84, len: 0.68, n: 4, notch: 0.05, range: 50, part: 0 }); };
  HAIR.twinbuns = (mb, H, a) => { const c = a.hair || '#202020'; cap(mb, H, c, { front: 0.76, sides: 0.4, back: 0.2, scale: 1.08 }); [1, -1].forEach(s => mb.sphere(s * H.hw * 0.38, H.hh * 0.9, -H.hd * 0.1, H.hw * 0.17, H.hh * 0.14, H.hd * 0.17, c, 8, 5, true)); fringe(mb, H, c, { top: 0.84, len: 0.6, n: 5, notch: 0.06, range: 50 }); };
  HAIR.pigtails = (mb, H, a) => { const c = a.hair || '#5a3018'; cap(mb, H, c, { front: 0.76, sides: 0.3, back: 0.12, scale: 1.1 }); [1, -1].forEach(s => { const b = headPt(H, deg(90 - s * 100), 0.55, 1.08); mb.sweep([b, [b[0] + s * H.hw * 0.1, b[1] - H.hh * 0.3, b[2] - H.hd * 0.05], [b[0] + s * H.hw * 0.12, b[1] - H.hh * 0.7, b[2]]], [H.hw * 0.12, H.hw * 0.13, 0], { sides: 6, color: c }); }); fringe(mb, H, c, { top: 0.84, len: 0.56, n: 6, notch: 0.06, range: 56, scale: 1.12 }); };
  HAIR.helmet = (mb, H, a) => {   // generic round work helmet
    const c = a.helmetColor || a.hair || '#d0a020';
    cap(mb, H, c, { front: 0.66, sides: 0.5, back: 0.3, scale: 1.2, light: sh(c, 0.15), frontW: 50 });
    const r = ringAt(H, H.hh * 0.62);
    mb.loft([{ y: H.hh * 0.64, rx: r.rx * 1.3, rz: r.rz * 1.32, z: r.z }, { y: H.hh * 0.58, rx: r.rx * 1.34, rz: r.rz * 1.4, z: r.z + H.hd * 0.02 }], { sides: 14, color: sh(c, -0.2) });
  };
  HAIR.cap = (mb, H, a) => {   // peaked cap (MP, sailors, workers, jockeys)
    const c = a.capColor || a.hair || '#2a3a6a';
    if (a.hairUnder !== false && a.hair && a.hair !== c) cap(mb, H, a.hair, { front: 0.7, sides: 0.42, back: 0.18, scale: 1.08 });
    cap(mb, H, c, { front: 0.68, sides: 0.62, back: 0.42, scale: 1.16, light: sh(c, 0.12), frontW: 60 });
    const tp = headPt(H, deg(90), 0.7, 1.18);
    mb.push(); mb.translate(tp[0], tp[1] - H.hh * 0.02, tp[2] - H.hd * 0.05); mb.rotate(0.15, 0, 0);
    mb.loft([{ y: -0.004, rx: H.hw * 0.42, rz: H.hd * 0.3 }, { y: 0.004, rx: H.hw * 0.42, rz: H.hd * 0.3 }], { sides: 10, color: a.visorColor || sh(c, -0.35), arc: [deg(15), deg(165)] });
    mb.pop();
    if (a.capBand) { const r = ringAt(H, H.hh * 0.72); mb.loft([{ y: H.hh * 0.68, rx: r.rx * 1.2, rz: r.rz * 1.2, z: r.z }, { y: H.hh * 0.78, rx: r.rx * 1.18, rz: r.rz * 1.18, z: r.z }], { sides: 14, color: a.capBand, capTop: false, capBottom: false }); }
  };
  HAIR.beanie = (mb, H, a) => { const c = a.capColor || '#c06020'; if (a.hair) cap(mb, H, a.hair, { front: 0.72, sides: 0.45, back: 0.2 }); cap(mb, H, c, { front: 0.7, sides: 0.62, back: 0.45, scale: 1.16, frontW: 70 }); };
  HAIR.bandana = (mb, H, a) => { const c = a.capColor || '#c02020'; if (a.hair) cap(mb, H, a.hair, { front: 0.72, sides: 0.38, back: 0.15 }); cap(mb, H, c, { front: 0.66, sides: 0.6, back: 0.45, scale: 1.15, frontW: 70 }); mb.blade(headPt(H, deg(270), 0.62, 1.15), [0.2, -0.6, -1], H.hh * 0.3, H.hw * 0.25, H.hd * 0.05, c); };
  HAIR.hat = (mb, H, a) => {   // brimmed hat (farmers, cowboys, Nibelheim, Bone Village hard hats)
    const c = a.hatColor || '#8a6a3a';
    if (a.hair) cap(mb, H, a.hair, { front: 0.74, sides: 0.4, back: 0.18 });
    cap(mb, H, c, { front: 0.7, sides: 0.66, back: 0.62, scale: 1.18, frontW: 180 });
    const r = ringAt(H, H.hh * 0.7);
    mb.loft([{ y: H.hh * 0.72, rx: r.rx * (a.brim || 1.9), rz: r.rz * (a.brim || 1.9), z: r.z }, { y: H.hh * 0.68, rx: r.rx * (a.brim || 1.9), rz: r.rz * (a.brim || 1.9), z: r.z }], { sides: 14, color: sh(c, -0.08) });
    if (a.hatBand) { mb.loft([{ y: H.hh * 0.72, rx: r.rx * 1.2, rz: r.rz * 1.2, z: r.z }, { y: H.hh * 0.84, rx: r.rx * 1.14, rz: r.rz * 1.14, z: r.z }], { sides: 14, color: a.hatBand, capTop: false, capBottom: false }); }
    if (a.hatCrown) mb.loft([{ y: H.hh * 0.9, rx: r.rx * 0.95, rz: r.rz * 0.95, z: r.z }, { y: H.hh * 1.18, rx: r.rx * 0.8, rz: r.rz * 0.8, z: r.z }], { sides: 12, color: c });
  };
  HAIR.tophat = (mb, H, a) => { const c = a.hatColor || '#1a1a1a'; if (a.hair) cap(mb, H, a.hair, { front: 0.74, sides: 0.4, back: 0.18 }); const r = ringAt(H, H.hh * 0.72); mb.loft([{ y: H.hh * 0.7, rx: r.rx * 1.6, rz: r.rz * 1.6, z: r.z }, { y: H.hh * 0.74, rx: r.rx * 1.6, rz: r.rz * 1.6, z: r.z }, { y: H.hh * 0.74, rx: r.rx * 1.05, rz: r.rz * 1.05, z: r.z }, { y: H.hh * 1.45, rx: r.rx * 1.08, rz: r.rz * 1.08, z: r.z }], { sides: 12, color: c }); mb.loft([{ y: H.hh * 0.8, rx: r.rx * 1.08, rz: r.rz * 1.08, z: r.z }, { y: H.hh * 0.9, rx: r.rx * 1.08, rz: r.rz * 1.08, z: r.z }], { sides: 12, color: a.hatBand || '#e0e0e0', capTop: false, capBottom: false }); };
  HAIR.hood = (mb, H, a) => { const c = a.hoodColor || '#3a3a5a'; cap(mb, H, c, { front: 0.62, sides: -0.1, back: -0.2, scale: 1.2, frontW: 44 }); mb.loft([{ y: H.hh * 0.1, rx: H.hw * 0.6, rz: H.hd * 0.55, z: -H.hd * 0.05 }, { y: -H.hh * 0.18, rx: H.hw * 0.72, rz: H.hd * 0.6, z: -H.hd * 0.08 }], { sides: 12, color: c, arc: [deg(120), deg(420)] }); };
  HAIR.turban = (mb, H, a) => { const c = a.capColor || '#e0e0d0'; if (a.hair) cap(mb, H, a.hair, { front: 0.72, sides: 0.38, back: 0.16 }); cap(mb, H, c, { front: 0.68, sides: 0.64, back: 0.5, scale: 1.2, frontW: 80, lift: 0.04 }); };

  // ================================================================== signature hair
  HAIR.cloud = (mb, H, a) => {
    // Matched to FF7's field model: one big rounded mass (widest behind the ears, smooth at the back,
    // no spikes there), a few large flat spikes on top and at the temples, and long bangs over the face.
    const c = a.hair || '#f0c038', d = sh(c, -0.1), l = sh(c, 0.12);
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.76, sides: 0.44, back: 0.16, scale: 1.14, light: c, hang: 0 });
    mb.sphere(0, hh * 0.66, -hd * 0.2, hw * 0.64, hh * 0.44, hd * 0.62, c, 10, 7, false);   // the back bulge
    mb.sphere(0, hh * 0.9, -hd * 0.06, hw * 0.6, hh * 0.24, hd * 0.6, c, 10, 5, false);     // rounds the crown
    const ctr = { radial: [0, hh * 0.62, -hd * 0.08] };
    // [angle (90 = front; 180 = viewer's left), height, direction, length (x hh), width (x hw), thick (x hd)]
    const S = [
      [112, 0.98, [-0.78, 0.8, 0.72], 1.4, 0.98, 0.32],     // the big crest: leans hard forward and to his right
      [84, 1.02, [0.12, 1.0, 0.3], 0.78, 0.84, 0.3],         // second tall spike, nearly straight up
      [56, 0.96, [0.8, 0.8, 0.1], 0.64, 0.82, 0.28],         // up and out to his left
      [26, 0.82, [1.0, 0.25, 0.08], 0.56, 0.74, 0.26],       // his left temple, straight out
      [156, 0.8, [-1.0, 0.1, 0.12], 0.54, 0.72, 0.26],       // his right temple, straight out
    ];
    S.forEach(([ang, yf, dir, len, w, th]) => mb.blade(headPt(H, deg(ang), yf, 0.98), dir, hh * len, hw * w, hd * th, c, ctr, l));
    // long bangs hanging over the face (to the nose and cheeks), longest at his right
    bangs(mb, H, c, [[-32, 0.6, 0.52, -0.25], [-6, 0.5, 0.48, -0.04], [22, 0.44, 0.46, 0.22]], { y: 0.9, out: 1.2, outTip: 1.12, th: 0.14 });
    // locks framing the face down to the jaw
    lockTo(mb, H, c, 132, 0.84, 140, 0.12, 0.5, { out: 1.16, outTip: 1.1 });
    lockTo(mb, H, c, 48, 0.84, 40, 0.2, 0.46, { out: 1.16, outTip: 1.1 });
  };
  HAIR.zack = (mb, H, a) => {
    const c = a.hair || '#141418', l = sh(c, 0.12);
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.8, sides: 0.4, back: 0.12, scale: 1.12 });
    const ctr = { radial: [0, hh * 0.6, -hd * 0.1] };
    // long spikes swept back
    const S = [[270, 1.0, [0, 0.55, -1], 0.9, 0.5], [235, 0.95, [-0.5, 0.45, -1], 0.85, 0.48], [305, 0.95, [0.5, 0.45, -1], 0.85, 0.48], [205, 0.8, [-0.8, 0.2, -0.8], 0.72, 0.44], [335, 0.8, [0.8, 0.2, -0.8], 0.72, 0.44],
      [255, 0.6, [-0.3, -0.1, -1], 0.75, 0.46], [285, 0.6, [0.3, -0.1, -1], 0.75, 0.46], [270, 0.35, [0, -0.5, -1], 0.6, 0.44], [180, 0.62, [-1, -0.2, -0.5], 0.5, 0.4], [0, 0.62, [1, -0.2, -0.5], 0.5, 0.4],
      [120, 1.02, [-0.3, 0.9, -0.6], 0.55, 0.45], [60, 1.02, [0.3, 0.9, -0.6], 0.55, 0.45], [90, 1.05, [0, 0.8, -0.5], 0.5, 0.45]];
    S.forEach(([ang, yf, dir, len, w]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * w, hd * 0.2, c, ctr, l));
    [[-22, [-0.35, -1, 0.5], 0.46, 0.2], [10, [0.2, -1, 0.5], 0.4, 0.18]].forEach(([ang, dir, len, w]) => mb.blade(headPt(H, deg(90 + ang), 0.96, 1.14), dir, hh * len, hw * w, hd * 0.06, c, ctr));
  };
  HAIR.tifa = (mb, H, a) => {
    // Matched to FF7's field model: one big rounded mass with the face set into it, broad side panels falling to the
    // shoulders, a few long bangs swept across the forehead (the longest over her right eye), and a wide sheet down
    // the back that narrows to a tie at the waist and ends in a point (the tie is white at the hips in battle).
    const c = a.hair || '#2a1a16';
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.8, sides: 0.4, back: 0.3, scale: 1.16, frontW: 34 });
    bell(mb, H, c, { top: 0.76, bottom: H.battle ? -0.5 : -0.34, open: 66, openBot: 80, scale: 1.17, flare: 1.1, back: 0.1, jag: 0.12 });
    const tie = H.battle ? 2.95 : 1.12, tip = H.battle ? 3.4 : 2.1, z0 = -hd * 0.58;
    mb.loft([{ y: hh * 0.5, rx: hw * 0.56, rz: hd * 0.2, z: -hd * 0.36 }, { y: -hh * 0.3, rx: hw * 0.64, rz: hd * 0.15, z: z0 }, { y: -hh * tie * 0.62, rx: hw * 0.46, rz: hd * 0.13, z: z0 - hd * 0.03 },
      { y: -hh * tie, rx: hw * 0.13, rz: hd * 0.09, z: z0 - hd * 0.04 }], { sides: 8, color: c, sq: 2.6, capTop: false });
    mb.loft([{ y: -hh * (tie - 0.05), rx: hw * 0.15, rz: hd * 0.11, z: z0 - hd * 0.04 }, { y: -hh * (tie + 0.08), rx: hw * 0.15, rz: hd * 0.11, z: z0 - hd * 0.04 }], { sides: 6, color: H.battle ? '#e8e8e8' : '#8a1c22' });
    mb.loft([{ y: -hh * tie, rx: hw * 0.13, rz: hd * 0.09, z: z0 - hd * 0.04 }, { y: -hh * U.lerp(tie, tip, 0.5), rx: hw * 0.15, rz: hd * 0.08, z: z0 - hd * 0.05 }, { y: -hh * tip, rx: hw * 0.01, rz: hd * 0.01, z: z0 - hd * 0.04 }], { sides: 6, color: c });
    // long bangs from a parting on her left, swept down across the forehead
    [[58, 0.9, 44, 0.52, 0.42], [76, 0.94, 70, 0.5, 0.46], [94, 0.94, 104, 0.46, 0.48], [110, 0.92, 128, 0.36, 0.5], [128, 0.86, 142, 0.42, 0.42]]
      .forEach(([a0, y0, a1, y1, w]) => lockTo(mb, H, c, a0, y0, a1, y1, w, { out: 1.17, outTip: 1.12, w1: 0.3, th: 0.05, n: 4 }));
  };
  HAIR.aeris = (mb, H, a) => {
    const c = a.hair || '#8a5028', l = sh(c, 0.12);
    const { hw, hh, hd } = H;
    // Matched to FF7's field model: the hairline comes down to the brows, a full rounded top, and her signature
    // bangs: broad locks rooted along the front hairline that flip UP and forward like a wave (a big one on her
    // right, a tall one just left of centre, a small one), plus long thick locks from the temples to below
    // the chin that curl out at the tips. No spikes on the crown and no bangs hanging over the forehead.
    cap(mb, H, c, { front: 0.66, sides: 0.3, back: 0.02, scale: 1.18, lift: 0.02 });
    const ctr = { radial: [0, hh * 0.6, -hd * 0.05] }, bt = H.battle;
    // broad, chunky locks that lean out: the big one sweeps out to her right almost sideways, a small one flicks
    // out on her left (no spike in the middle of the front)
    // Her signature bangs, measured off the PS1 field model: two big flat locks whose lower edges meet in a V at
    // the middle of the forehead and rise from there, leaning forward so their tips stand out in front of the
    // face: the tall one goes nearly straight up on her left, the other sweeps up and out to her right, where a
    // lock hooks down past the temple.
    const plate = (pts, col) => { for (let i = 1; i < pts.length - 1; i++) { mb.tri(pts[0], pts[i], pts[i + 1], col); mb.tri(pts[0], pts[i + 1], pts[i], col); } };
    const V = headPt(H, deg(90), 0.68, 1.12), P = (x, y, z) => [hw * x, hh * y, hd * z];
    plate([V, headPt(H, deg(40), 0.94, 1.14), P(0.16, bt ? 1.2 : 1.27, 0.95), P(0.02, 1.08, 0.7)], c);
    plate([V, P(-0.1, 1.08, 0.72), P(-0.62, bt ? 1.06 : 1.12, 0.85), headPt(H, deg(140), 0.86, 1.14)], sh(c, -0.04));
    mb.blade(P(-0.6, 1.08, 0.8), [-0.15, -1, -0.12], hh * (bt ? 0.42 : 0.5), hw * 0.26, hd * 0.08, c, [0, 0, 1]);   // the hooked lock
    // back volume
    [[250, 0.85, [-0.3, 0.2, -1], 0.3, 0.5], [290, 0.85, [0.3, 0.2, -1], 0.3, 0.5], [270, 0.6, [0, -0.2, -1], 0.3, 0.55]].forEach(([ang, yf, dir, len, w]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * w, hd * 0.16, c, ctr));
    // the long locks framing the face: from the temples to below the chin, the tips curling outward
    [1, -1].forEach(s => {
      // broad ribbons following the cheek (lockTo keeps them outside the face), ending in an outward flick
      const y1 = bt ? -0.3 : -0.18;
      lockTo(mb, H, c, 90 - s * 58, 0.8, 90 - s * 66, y1, bt ? 0.46 : 0.56, { out: 1.2, outTip: 1.17, w1: 0.55, th: 0.09 });
      const tip = headPt(H, deg(90 - s * 66), 0.3, 1.17); tip[1] = y1 * hh;
      mb.blade(tip, [s * 0.9, 0.3, 0.2], hh * 0.2, hw * 0.34, hd * 0.08, c, [0, 0, 1]);
      lockTo(mb, H, sh(c, -0.08), 90 - s * 76, 0.74, 90 - s * 82, bt ? -0.1 : 0.02, bt ? 0.36 : 0.42, { out: 1.16, outTip: 1.14, w1: 0.5, th: 0.07 });
    });
    if (!bt) {
      // FF7 field model: one big tapering tail from the back of the crown to the hips, and the pink bow as two flat
      // wings sticking straight out sideways behind the head at ear height (seen past both cheeks from the front)
      mb.loft([{ y: hh * 0.95, rx: hw * 0.2, rz: hd * 0.16, z: -hd * 0.4 }, { y: hh * 0.55, rx: hw * 0.32, rz: hd * 0.26, z: -hd * 0.6 }, { y: hh * 0.05, rx: hw * 0.3, rz: hd * 0.24, z: -hd * 0.72 },
        { y: -hh * 0.62, rx: hw * 0.19, rz: hd * 0.16, z: -hd * 0.82 }, { y: -hh * 1.36, rx: hw * 0.02, rz: hd * 0.02, z: -hd * 0.88 }], { sides: 8, color: c, sq: 2.2 });
      const rc = a.ribbon || '#f07aa8', rz = -hd * 0.62;
      mb.sphere(0, hh * 0.55, rz - hd * 0.04, hw * 0.12, hh * 0.1, hd * 0.1, sh(rc, -0.08), 6, 4, true);
      [1, -1].forEach(s => { const P = [[0.1, 0.42], [1.08, 0.2], [1.12, 0.6], [0.1, 0.62]].map(([x, y]) => [s * hw * x, hh * y]); mb.panel(s > 0 ? P : P.reverse(), rz, hd * 0.05, rc); });
      // fuller hair at the sides of the head, ending in points at the jaw
      bell(mb, H, c, { top: 0.78, bottom: 0.1, open: 64, openBot: 74, scale: 1.13, jag: 0.14, n: 12 });
      return;
    }
    // long braid down the back
    const top = hh * 0.25, L = H.battle ? 3.2 : 1.9;
    const z0 = -hd * 0.56;
    for (let i = 0; i < 8; i++) { const y = top - i * hh * L / 8; mb.sphere(0, y - hh * 0.05, z0 - i * hd * 0.02, hw * (0.13 - i * 0.006), hh * L / 13, hd * 0.11, i % 2 ? sh(c, -0.1) : c, 6, 4, true); }
    mb.blade([0, top - hh * L * 1.02, z0 - hd * 0.16], [0, -1, -0.05], hh * 0.3, hw * 0.16, hd * 0.06, c);
    // the big pink ribbon at the top of the braid: in the field model its two loops stick far out
    // behind the head at neck height (visible from the front on both sides)
    // a real 3D bow: a knot and two puffy loops sticking out sideways (seen past both cheeks from the front in
    // the field model), and two short tails
    const rc = a.ribbon || '#f07aa8', ry = hh * (H.battle ? 0.3 : 0.18), rz = -hd * 0.6;
    mb.sphere(0, ry, rz, hw * 0.1, hh * 0.1, hd * 0.09, sh(rc, -0.08), 6, 4, true);
    [1, -1].forEach(s => {
      const L = hw * (H.battle ? 0.5 : 0.78), t = hh * (H.battle ? 0.14 : 0.2);
      mb.push(); mb.translate(0, ry, rz); mb.rotate(0.15, 0, -s * (Math.PI / 2 - 0.3));
      mb.loft([{ y: 0, rx: t * 0.35, rz: hd * 0.05 }, { y: L * 0.35, rx: t, rz: hd * 0.1 }, { y: L * 0.85, rx: t * 0.9, rz: hd * 0.09 }, { y: L, rx: t * 0.45, rz: hd * 0.05 }], { sides: 6, color: rc });
      mb.pop();
      mb.blade([0, ry, rz], [s * 0.35, -1, -0.25], hh * 0.36, hw * 0.14, hd * 0.04, sh(rc, -0.05));
    });
  };
  HAIR.barret = (mb, H, a) => {
    const c = a.hair || '#161412';
    // FF7 field model: just a short flat hexagonal lid on top of a tall head (shaved sides and back)
    if (!H.battle) { cap(mb, H, c, { front: 0.88, sides: 0.86, back: 0.84, scale: 1.05, pad: 0.003 }); mb.loft([{ y: H.hh * 0.84, rx: H.hw * 0.5, rz: H.hd * 0.49, z: H.hd * 0.01 }, { y: H.hh * 1.1, rx: H.hw * 0.49, rz: H.hd * 0.48, z: H.hd * 0.01 }], { sides: 6, color: c, phase: 0 }); return; }
    // short flat-top block
    cap(mb, H, c, { front: 0.82, sides: 0.5, back: 0.14, scale: 1.05, pad: 0.003 });
    const r = ringAt(H, H.hh * 0.95);
    mb.loft([{ y: H.hh * 0.86, rx: H.hw * 0.46, rz: H.hd * 0.44, sq: 4, z: r.z }, { y: H.hh * 1.1, rx: H.hw * 0.43, rz: H.hd * 0.41, sq: 4, z: r.z }, { y: H.hh * 1.12, rx: H.hw * 0.36, rz: H.hd * 0.34, sq: 4, z: r.z }], { sides: 12, color: c });
  };
  HAIR.yuffie = (mb, H, a) => {
    const c = a.hair || '#221a18';
    const { hw, hh, hd } = H;
    if (!H.battle) {
      // FF7 field model: a big rounded bob that covers the ears and falls to just below the jaw, with long bangs
      // swept across the face (the band is only seen at the back of the head)
      cap(mb, H, c, { front: 0.8, sides: 0.4, back: 0.3, scale: 1.17, frontW: 34 });
      bell(mb, H, c, { top: 0.76, bottom: -0.16, open: 60, openBot: 70, scale: 1.18, flare: 1.08, back: 0.06, jag: 0.14 });
      [[60, 0.9, 44, 0.46, 0.44], [78, 0.94, 70, 0.44, 0.46], [96, 0.94, 108, 0.4, 0.48], [114, 0.92, 132, 0.34, 0.5], [132, 0.86, 146, 0.4, 0.42]]
        .forEach(([a0, y0, a1, y1, w]) => lockTo(mb, H, c, a0, y0, a1, y1, w, { out: 1.18, outTip: 1.13, w1: 0.3, th: 0.05, n: 4 }));
      return;
    }
    cap(mb, H, c, { front: 0.76, sides: 0.26, back: 0.08, scale: 1.12 });
    const ctr = { radial: [0, hh * 0.55, -hd * 0.05] };
    // short jagged ends flicking out round the back and sides
    for (let i = 0; i < 9; i++) { const ang = 165 + i * 26; mb.blade(headPt(H, deg(ang), 0.36, 1.08), [Math.cos(deg(ang)) * 0.55, -0.7, Math.sin(deg(ang)) * 0.75], hh * (0.34 + (i % 2) * 0.06), hw * 0.3, hd * 0.08, c, ctr); }
    // choppy bangs
    fringe(mb, H, c, { top: 0.84, len: (t) => 0.54 + Math.abs(t) * 0.06, n: 7, notch: 0.13, range: 58, scale: 1.13, flare: 1.05 });
    [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 64), 0.72, 1.12), [s * 0.1, -1, 0.1], hh * 0.55, hw * 0.22, hd * 0.07, c, [0, 0, 1]));
  };
  HAIR.vincent = (mb, H, a) => {
    const c = a.hair || '#141418', l = sh(c, 0.1);
    const { hw, hh, hd } = H;
    const ctr = { radial: [0, hh * 0.5, -hd * 0.05] };
    if (!H.battle) {
      // FF7 field model: one black mass over the crown and round the face that falls down the back in a long pointed
      // sheet to the middle of the back, big locks hooking out at his right temple, a long lock on his left
      cap(mb, H, c, { front: 0.76, sides: 0.2, back: 0.0, scale: 1.16, hang: 0 });
      bell(mb, H, c, { top: 0.72, bottom: -0.3, open: 58, openBot: 66, scale: 1.16, flare: 1.08, back: 0.1, jag: 0.16 });
      // the sheet drapes OVER the cloak's collar and shoulders (kept clear of them so the two never interleave)
      mb.loft([{ y: hh * 0.55, rx: hw * 0.56, rz: hd * 0.2, z: -hd * 0.4 }, { y: -hh * 0.3, rx: hw * 0.54, rz: hd * 0.16, z: -hd * 0.86 }, { y: -hh * 1.0, rx: hw * 0.26, rz: hd * 0.1, z: -hd * 1.12 },
        { y: -hh * 1.5, rx: hw * 0.02, rz: hd * 0.02, z: -hd * 1.2 }], { sides: 8, color: c, sq: 2.6 });
      [[0.8, 1.0], [0.52, 0.8]].forEach(([y, k]) => {
        const p0 = headPt(H, deg(150), y, 1.12), P = (x, dy, dz) => [p0[0] - hw * x * k, p0[1] + hh * dy * k, p0[2] + hd * dz];
        mb.sweep(mb.curvePts([p0, P(0.26, 0.04, 0.04), P(0.48, -0.08, 0.02), P(0.56, -0.34, -0.02)], 2), [hw * 0.1, hw * 0.09, hw * 0.08, hw * 0.065, hw * 0.05, hw * 0.035, 0], { sides: 5, color: c });
      });
      [[64, 0.96, [0.45, -0.1, -1], 0.42], [116, 0.96, [-0.45, -0.1, -1], 0.42], [90, 1.0, [0.05, 0.0, -1], 0.48], [40, 0.92, [0.5, 0.9, -0.2], 0.4]]
        .forEach(([ang, yf, dir, len]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * 0.44, hd * 0.12, c, ctr));
      fringe(mb, H, c, { top: 0.84, len: (t) => 0.48 + Math.abs(t) * 0.1, n: 6, notch: 0.14, range: 56, scale: 1.17, flare: 1.05 });
      lockTo(mb, H, c, 90 - 50, 0.8, 90 - 62, -0.2, 0.42, { out: 1.18, outTip: 1.14, w1: 0.25, th: 0.06 });
      return;
    }
    cap(mb, H, c, { front: 0.76, sides: 0.0, back: -0.1, scale: 1.14 });
    // long, thick, jagged locks falling from under the headband past the shoulders (sides and back),
    // over a solid inner mass so the back never shows gaps
    curtain(mb, H, c, { len: H.battle ? 1.3 : 0.75, w: H.battle ? 0.66 : 0.58, top: 0.72, thick: 0.18, mid: 1.04, flare: 0.98, tip: 0.6 });
    const long = H.battle ? 1.75 : 1.15;
    for (let i = 0; i < 9; i++) {
      // the locks fall OVER the cloak: flared out past the collar and the square shoulder capes (not into them),
      // the side ones shorter so they end on the shoulders
      const side = i < 2 || i > 6, fl = H.battle ? (side ? 0.78 : 0.5) : 0.34;
      const ang = 158 + i * 28, len = hh * long * [0.9, 1.05, 0.8, 1.0, 1.12, 0.95, 0.82, 1.05, 0.9][i] * (H.battle && side ? 0.72 : 1);
      mb.blade(headPt(H, deg(ang), 0.62, 1.12), [Math.cos(deg(ang)) * fl, -1, Math.sin(deg(ang)) * fl * 1.25], len, hw * (H.battle ? 0.6 : 0.52), hd * 0.18, i % 2 ? c : sh(c, 0.05), ctr);
    }
    // jagged locks swept back over the crown and flicking out above the band (they lie flat: from the high
    // field camera the top reads as hair, not as a spiked helmet)
    [[64, 0.96, [0.45, -0.1, -1], 0.42], [116, 0.96, [-0.45, -0.1, -1], 0.42], [90, 1.0, [0.05, 0.0, -1], 0.48], [26, 0.8, [1, -0.45, -0.5], 0.36], [154, 0.8, [-1, -0.45, -0.5], 0.4]]
      .forEach(([ang, yf, dir, len]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * 0.44, hd * 0.12, c, ctr));
    // bangs to the eyes, and thick locks framing the face down to the chest (longer on his left)
    fringe(mb, H, c, { top: 0.84, len: (t) => 0.46 + Math.abs(t) * 0.1, n: 6, notch: 0.14, range: 56, scale: 1.16, flare: 1.05 });
    lockTo(mb, H, c, 90 + 58, 0.78, 90 + 70, H.battle ? -0.7 : -0.25, 0.34, { out: 1.16, outTip: 1.12, w1: 0.2, th: 0.06 });
    lockTo(mb, H, c, 90 - 58, 0.78, 90 - 72, H.battle ? -0.95 : -0.45, 0.36, { out: 1.16, outTip: 1.12, w1: 0.2, th: 0.06 });
    // the two thin strands curling up and back out of the top (battle model)
    if (H.battle) [1, -1].forEach(s => mb.sweep(mb.curvePts([headPt(H, deg(90 - s * 20), 1.0, 1.0), [s * hw * 0.28, hh * 1.2, hd * 0.0], [s * hw * 0.42, hh * 1.26, -hd * 0.35], [s * hw * 0.5, hh * 1.08, -hd * 0.6]], 2), [hw * 0.035, hw * 0.03, hw * 0.028, hw * 0.024, hw * 0.02, hw * 0.014, 0], { sides: 4, color: c }));
  };
  HAIR.cid = (mb, H, a) => {
    const c = a.hair || '#d0bc78', l = sh(c, 0.12);
    const { hw, hh, hd } = H;
    const ctr = { radial: [0, hh * 0.55, -hd * 0.05] };
    if (!H.battle) {
      // FF7 field model: a compact rounded mass (down to the goggle strap at the back) with a few short, broad
      // shards on top swept up and back; no spikes at the sides
      // the hair covers the whole back of the head down to the neck (it used to stop halfway and read as a cap
      // sitting on top); a brush of broad shards stands up across the front and top, swept up and back
      cap(mb, H, c, { front: 0.76, sides: 0.4, back: 0.08, scale: 1.1, hang: 0 });
      mb.sphere(0, hh * 0.84, -hd * 0.1, hw * 0.54, hh * 0.24, hd * 0.54, c, 10, 5, false);
      [[90, 1.0, [0, 1, -0.3], 0.54, 0.74], [66, 0.97, [0.35, 1, -0.35], 0.44, 0.66], [116, 0.97, [-0.35, 1, -0.35], 0.44, 0.66],
        [270, 0.98, [0, 0.75, -1], 0.36, 0.62], [238, 0.9, [-0.2, 0.5, -1], 0.28, 0.56], [302, 0.9, [0.2, 0.5, -1], 0.28, 0.56]]
        .forEach(([ang, yf, dir, len, w]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * w, hd * 0.28, c, ctr, l));
      fringe(mb, H, c, { top: 0.88, len: 0.7, n: 5, notch: 0.06, range: 50, scale: 1.15 });
      return;
    }
    cap(mb, H, c, { front: 0.8, sides: 0.38, back: 0.08, scale: 1.1 });
    // short brush of spikes swept up and back
    [[90, 1.0, [0, 1, -0.15], 0.5, 0.36], [65, 0.98, [0.35, 1, -0.2], 0.44, 0.34], [115, 0.98, [-0.35, 1, -0.2], 0.44, 0.34], [40, 0.88, [0.75, 0.8, -0.3], 0.34, 0.32], [140, 0.88, [-0.75, 0.8, -0.3], 0.34, 0.32],
      [240, 0.92, [-0.3, 0.7, -1], 0.4, 0.36], [270, 0.95, [0, 0.8, -1], 0.44, 0.38], [300, 0.92, [0.3, 0.7, -1], 0.4, 0.36], [255, 0.62, [-0.2, -0.1, -1], 0.26, 0.36], [285, 0.62, [0.2, -0.1, -1], 0.26, 0.36]]
      .forEach(([ang, yf, dir, len, w]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * w, hd * 0.16, c, ctr, l));
    fringe(mb, H, c, { top: 0.86, len: 0.72, n: 5, notch: 0.06, range: 50, scale: 1.1 });
  };
  HAIR.sephiroth = (mb, H, a) => {
    const c = a.hair || '#dcdce6', l = sh(c, 0.1);
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.76, sides: 0.0, back: -0.2, scale: 1.1, frontW: 30 });
    // long hair down the back to the hips: a short inner layer at the nape, then six thick tapered locks that
    // fan out a little and end in jagged points at different lengths (not one flat slab)
    const len = H.battle ? 3.4 : 1.9;
    curtain(mb, H, c, { len: len * 0.35, w: 0.6, top: 0.85, thick: 0.17, mid: 1.02, flare: 0.98, tip: 0.8 });
    const ends = [0.86, 1.0, 0.92, 1.04, 0.95, 0.84];
    for (let i = 0; i < 6; i++) {
      const t = (i - 2.5) / 2.5, zb = -hd * (i % 2 ? 0.66 : 0.62), e = ends[i];
      const path = [[t * hw * 0.34, hh * 0.62, -hd * 0.5], [t * hw * 0.42, hh * 0.1, zb], [t * hw * 0.48, -hh * len * 0.4, zb - hd * 0.04], [t * hw * 0.58, -hh * len * 0.78 * e, zb - hd * 0.03], [t * hw * 0.64, -hh * len * e, zb]];
      mb.sweep(path, [[hw * 0.19, hd * 0.1], [hw * 0.2, hd * 0.1], [hw * 0.18, hd * 0.08], [hw * 0.12, hd * 0.06], [0, 0]], { sides: 5, color: i % 2 ? sh(c, -0.05) : c, up: [0, 0, 1] });
    }
    // side curtains down the chest
    [1, -1].forEach(s => { mb.blade(headPt(H, deg(90 - s * 62), 0.74, 1.12), [s * 0.1, -1, 0.08], hh * (H.battle ? 1.9 : 1.2), hw * 0.3, hd * 0.08, c, [0, 0, 1]); mb.blade(headPt(H, deg(90 - s * 85), 0.72, 1.12), [s * 0.12, -1, -0.05], hh * (H.battle ? 2.3 : 1.45), hw * 0.34, hd * 0.08, c, [0, 0, 1]); });
    // the two long bangs arcing up and down over the face ("antennae")
    [1, -1].forEach(s => lockTo(mb, H, l, 90 - s * 10, 0.96, 90 - s * 40, 0.14, 0.2, { out: 1.16, outTip: 1.16, th: 0.08, w1: 0.2 }));
    fringe(mb, H, c, { top: 0.88, len: (t) => 0.62 - Math.abs(t) * 0.02, n: 5, notch: 0.1, range: 46, part: 0 });
  };
  HAIR.reno = (mb, H, a) => {
    const c = a.hair || '#c82410', l = sh(c, 0.12);
    const { hw, hh, hd } = H;
    cap(mb, H, c, { front: 0.78, sides: 0.42, back: 0.16, scale: 1.1 });
    const ctr = { radial: [0, hh * 0.55, -hd * 0.05] };
    // spiky top swept back
    [[90, 1.0, [0, 1, -0.4], 0.45, 0.32], [60, 0.98, [0.45, 1, -0.4], 0.42, 0.3], [120, 0.98, [-0.45, 1, -0.4], 0.42, 0.3], [30, 0.85, [0.9, 0.6, -0.4], 0.36, 0.3], [150, 0.85, [-0.9, 0.6, -0.4], 0.36, 0.3], [240, 0.9, [-0.3, 0.7, -1], 0.42, 0.34], [300, 0.9, [0.3, 0.7, -1], 0.42, 0.34], [270, 0.95, [0, 0.9, -1], 0.45, 0.34]]
      .forEach(([ang, yf, dir, len, w]) => mb.blade(headPt(H, deg(ang), yf, 1.0), dir, hh * len, hw * w, hd * 0.16, c, ctr, l));
    // long thin ponytail
    const b = headPt(H, deg(270), 0.4, 1.08);
    mb.sweep(mb.curvePts([b, [0, b[1] - hh * 0.3, b[2] - hd * 0.12], [0, b[1] - hh * (H.battle ? 1.4 : 0.9), b[2] - hd * 0.18], [0, b[1] - hh * (H.battle ? 2.2 : 1.3), b[2] - hd * 0.12]], 2), [hw * 0.07, hw * 0.08, hw * 0.07, hw * 0.06, hw * 0.05, hw * 0.035, 0], { sides: 5, color: c });
    fringe(mb, H, c, { top: 0.84, len: (t) => 0.58 + Math.abs(t) * 0.02, n: 6, notch: 0.12, range: 54, flare: 1.05 });
  };
  HAIR.tseng = (mb, H, a) => {
    const c = a.hair || '#141418';
    cap(mb, H, c, { front: 0.8, sides: 0.2, back: 0.0, scale: 1.08, frontW: 26 });
    curtain(mb, H, c, { len: H.battle ? 1.6 : 0.8, w: 0.44, top: 0.7, thick: 0.12, mid: 0.8, flare: 0.6, tip: 0.3 });
    // centre-parted fringe falling to both sides
    [1, -1].forEach(s => { mb.blade(headPt(H, deg(90 - s * 10), 1.0, 1.1), [s * 0.8, -0.6, 0.3], H.hh * 0.42, H.hw * 0.3, H.hd * 0.06, c, { radial: HC(H) }); mb.blade(headPt(H, deg(90 - s * 60), 0.78, 1.1), [s * 0.1, -1, 0.1], H.hh * 0.7, H.hw * 0.26, H.hd * 0.07, c, [0, 0, 1]); });
  };
  HAIR.rufus = (mb, H, a) => {
    const c = a.hair || '#e8b048';
    cap(mb, H, c, { front: 0.78, sides: 0.4, back: 0.14, scale: 1.1 });
    // swept fringe, falling over the right side of the face
    const ctr = { radial: HC(H) };
    [[-6, [-0.7, -0.55, 0.45], 0.55, 0.36], [-24, [-0.45, -1, 0.35], 0.6, 0.3], [-42, [-0.2, -1, 0.2], 0.6, 0.26], [16, [-0.9, -0.2, 0.4], 0.4, 0.36], [36, [0.4, -0.7, 0.3], 0.3, 0.3]]
      .forEach(([off, dir, len, w]) => mb.blade(headPt(H, deg(90 + off), 0.98, 1.14), dir, H.hh * len, H.hw * w, H.hd * 0.07, c, ctr));
    blades(mb, H, c, [[250, 0.7, [-0.2, -0.3, -1], 0.3, 0.5], [290, 0.7, [0.2, -0.3, -1], 0.3, 0.5]], 1.02);
  };
  HAIR.hojo = (mb, H, a) => {
    const c = a.hair || '#1c1c1c';
    cap(mb, H, c, { front: 0.82, sides: 0.4, back: 0.14, scale: 1.06 });
    // slicked back into a long thin ponytail; two loose strands at the front
    const b = headPt(H, deg(270), 0.5, 1.06);
    mb.sweep(mb.curvePts([b, [0, b[1] - H.hh * 0.3, b[2] - H.hd * 0.12], [0, b[1] - H.hh * (H.battle ? 1.2 : 0.8), b[2] - H.hd * 0.1]], 2), [H.hw * 0.08, H.hw * 0.08, H.hw * 0.07, H.hw * 0.05, 0], { sides: 5, color: c });
    [1, -1].forEach(s => mb.sweep([headPt(H, deg(90 - s * 22), 0.9, 1.1), headPt(H, deg(90 - s * 30), 0.6, 1.2), headPt(H, deg(90 - s * 36), 0.3, 1.18)], [H.hw * 0.025, H.hw * 0.02, 0], { sides: 4, color: c }));
  };
  HAIR.elena = (mb, H, a) => {
    const c = a.hair || '#e0b458';
    cap(mb, H, c, { front: 0.76, sides: 0.12, back: 0.1, scale: 1.12 });
    // chin-length bob, parted, longer at the front
    [1, -1].forEach(s => { mb.blade(headPt(H, deg(90 - s * 55), 0.62, 1.12), [s * 0.12, -1, 0.12], H.hh * 0.5, H.hw * 0.32, H.hd * 0.08, c, [0, 0, 1]); mb.blade(headPt(H, deg(90 - s * 95), 0.5, 1.1), [s * 0.2, -1, -0.1], H.hh * 0.38, H.hw * 0.36, H.hd * 0.08, c, [0, 0, 1]); });
    fringe(mb, H, c, { top: 0.86, len: (t) => 0.62 - (t + 1) * 0.03, n: 5, notch: 0.06, range: 54, part: 0.5, scale: 1.13 });
  };
  HAIR.scarlet = (mb, H, a) => {
    const c = a.hair || '#e8d060';
    cap(mb, H, c, { front: 0.76, sides: 0.05, back: -0.05, scale: 1.1 });
    curtain(mb, H, c, { len: H.battle ? 1.8 : 1.0, w: 0.56, top: 0.8, thick: 0.15 });
    [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 60), 0.78, 1.12), [s * 0.1, -1, 0.1], H.hh * (H.battle ? 1.2 : 0.9), H.hw * 0.3, H.hd * 0.08, c, [0, 0, 1]));
    fringe(mb, H, c, { top: 0.86, len: (t) => 0.6 + (t + 1) * 0.03, n: 5, notch: 0.06, range: 52, part: 0.45, scale: 1.12 });
  };
  HAIR.president = (mb, H, a) => {   // bald crown with blond tufts above the ears and a little tuft on top
    const c = a.hair || '#d8c050';
    sideTufts(mb, H, c, { top: 0.68, n: 3, len: 0.24, w: 0.32 });
    mb.blade(headPt(H, deg(90), 1.0, 0.5), [0, 1, 0.3], H.hh * 0.2, H.hw * 0.36, H.hd * 0.3, c, [1, 0, 0]);
    mb.sphere(0, H.hh * 0.98, H.hd * 0.08, H.hw * 0.2, H.hh * 0.08, H.hd * 0.16, c, 6, 4, true);
  };
  HAIR.palmer = (mb, H, a) => {   // bald with big bushy white side tufts sticking out and a spike on top
    const c = a.hair || '#d8d8d8';
    sideTufts(mb, H, c, { top: 0.62, n: 4, len: 0.44, w: 0.4, up: 0.25 });
    mb.blade(headPt(H, deg(90), 1.0, 0.3), [0, 1, -0.1], H.hh * 0.18, H.hw * 0.14, H.hd * 0.12, c);
  };
  HAIR.dio = (mb, H, a) => {   // shaved head: black topknot on the crown, short black hair above the ears
    const c = a.hair || '#141414';
    sideTufts(mb, H, c, { top: 0.66, n: 2, len: 0.16, w: 0.36, up: -0.8, strip: false });
    mb.blade([0, H.hh * 0.92, -H.hd * 0.08], [0, 1, -0.15], H.hh * 0.34, H.hw * 0.3, H.hd * 0.3, c, [1, 0, 0], sh(c, 0.1));
  };
  HAIR.heidegger = (mb, H, a) => { const c = a.hair || '#141414'; cap(mb, H, c, { front: 0.82, sides: 0.3, back: 0.12, scale: 1.08 }); };
  HAIR.reeve = (mb, H, a) => { const c = a.hair || '#1a1a1a'; cap(mb, H, c, { front: 0.8, sides: 0.46, back: 0.18, scale: 1.08 }); mb.blade(headPt(H, deg(80), 0.96, 1.08), [0.3, 0.25, 1], H.hh * 0.22, H.hw * 0.55, H.hd * 0.1, c, { radial: HC(H) }); };
  HAIR.corneo = (mb, H, a) => { mb.blade(headPt(H, deg(90), 1.0, 0.3), [0, 1, 0.1], H.hh * 0.36, H.hw * 0.34, H.hd * 0.5, a.tuftColor || '#e8d020', [1, 0, 0]); };
  HAIR.johnny = (mb, H, a) => {
    const c = a.hair || '#b02818', l = sh(c, 0.15);
    cap(mb, H, c, { front: 0.8, sides: 0.45, back: 0.16, scale: 1.1 });
    for (let i = 0; i < 9; i++) { const an = 20 + i * 40; mb.blade(headPt(H, deg(an), 0.92, 1.0), [Math.cos(deg(an)) * 0.35, 1, Math.sin(deg(an)) * 0.35 - 0.2], H.hh * 0.5, H.hw * 0.3, H.hd * 0.14, c, { radial: HC(H) }, l); }
    mb.blade(headPt(H, deg(90), 1.02, 0.8), [0, 1, 0.05], H.hh * 0.55, H.hw * 0.32, H.hd * 0.14, c, { radial: HC(H) }, l);
  };
  HAIR.dyne = (mb, H, a) => { const c = a.hair || '#3a2848'; cap(mb, H, c, { front: 0.8, sides: 0.45, back: 0.18, scale: 1.1 }); blades(mb, H, c, [[90, 1.0, [0, 1, 0.2], 0.28, 0.4], [60, 0.98, [0.4, 1, 0], 0.26, 0.34], [120, 0.98, [-0.4, 1, 0], 0.26, 0.34], [270, 0.9, [0, 0.6, -1], 0.3, 0.4], [230, 0.85, [-0.5, 0.5, -1], 0.26, 0.36], [310, 0.85, [0.5, 0.5, -1], 0.26, 0.36]], 1.0); };
  HAIR.godo = (mb, H, a) => { const c = a.hair || '#1a1a1a'; cap(mb, H, c, { front: 0.8, sides: 0.4, back: 0.16, scale: 1.06 }); mb.sphere(0, H.hh * 1.05, -H.hd * 0.05, H.hw * 0.14, H.hh * 0.12, H.hd * 0.14, c, 6, 4, true); };
  HAIR.lucrecia = (mb, H, a) => { const c = a.hair || '#6a3a20'; cap(mb, H, c, { front: 0.76, sides: 0.3, back: 0.1, scale: 1.1 }); mb.sphere(0, H.hh * 0.85, -H.hd * 0.42, H.hw * 0.22, H.hh * 0.18, H.hd * 0.2, c, 8, 5, true); [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 55), 0.8, 1.1), [s * 0.1, -1, 0.1], H.hh * 0.6, H.hw * 0.2, H.hd * 0.06, c, [0, 0, 1])); fringe(mb, H, c, { top: 0.86, len: 0.64, n: 4, notch: 0.06, range: 48, part: 0 }); };
  HAIR.jessie = (mb, H, a) => {   // brown hair tied up, red bandana tails
    const c = a.hair || '#7a4020';
    cap(mb, H, c, { front: 0.74, sides: 0.3, back: 0.1, scale: 1.12 });
    blades(mb, H, c, [[250, 0.95, [-0.35, 0.7, -1], 0.5, 0.5], [290, 0.95, [0.35, 0.7, -1], 0.5, 0.5], [270, 1.0, [0, 1, -0.6], 0.5, 0.5]], 1.0);
    fringe(mb, H, c, { top: 0.84, len: 0.56, n: 5, notch: 0.12, range: 54, scale: 1.13 });
    [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 62), 0.72, 1.12), [s * 0.1, -1, 0.1], H.hh * 0.6, H.hw * 0.22, H.hd * 0.07, c, [0, 0, 1]));
  };
  HAIR.biggs = (mb, H, a) => { const c = a.hair || '#3a2414'; cap(mb, H, c, { front: 0.76, sides: 0.45, back: 0.16, scale: 1.1 }); blades(mb, H, c, [[90, 1.0, [0, 1, 0.2], 0.24, 0.4], [60, 0.98, [0.5, 1, 0], 0.22, 0.34], [120, 0.98, [-0.5, 1, 0], 0.22, 0.34], [270, 0.8, [0, 0.2, -1], 0.26, 0.44], [220, 0.8, [-0.6, 0.2, -1], 0.22, 0.36], [320, 0.8, [0.6, 0.2, -1], 0.22, 0.36]], 1.0); };
  HAIR.marlene = (mb, H, a) => { const c = a.hair || '#5a3018'; cap(mb, H, c, { front: 0.76, sides: 0.08, back: 0.0, scale: 1.14 }); curtain(mb, H, c, { len: 0.35, w: 0.56, top: 0.8, thick: 0.16, flare: 0.95, tip: 0.8 }); [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 60), 0.7, 1.14), [s * 0.06, -1, 0.1], H.hh * 0.75, H.hw * 0.3, H.hd * 0.08, c, [0, 0, 1])); fringe(mb, H, c, { top: 0.86, len: 0.56, n: 6, notch: 0.04, range: 58, scale: 1.15 }); };
  HAIR.shera = (mb, H, a) => { const c = a.hair || '#7a4a28'; cap(mb, H, c, { front: 0.76, sides: 0.15, back: 0.05, scale: 1.12 }); [1, -1].forEach(s => { mb.blade(headPt(H, deg(90 - s * 58), 0.7, 1.12), [s * 0.1, -1, 0.1], H.hh * 0.7, H.hw * 0.3, H.hd * 0.08, c, [0, 0, 1]); mb.blade(headPt(H, deg(90 - s * 100), 0.6, 1.1), [s * 0.2, -1, -0.1], H.hh * 0.55, H.hw * 0.4, H.hd * 0.08, c, [0, 0, 1]); }); curtain(mb, H, c, { len: 0.5, w: 0.52, top: 0.7, thick: 0.14, flare: 0.9, tip: 0.6 }); fringe(mb, H, c, { top: 0.84, len: 0.6, n: 5, notch: 0.08, range: 52, part: 0, scale: 1.13 }); };
  HAIR.ifalna = (mb, H, a) => HAIR.long(mb, H, Object.assign({}, a, { hairLen: 1.6 }));
  HAIR.priscilla = (mb, H, a) => { const c = a.hair || '#8a4a20'; cap(mb, H, c, { front: 0.76, sides: 0.35, back: 0.14, scale: 1.1 }); const b = headPt(H, deg(270), 0.95, 1.05); mb.blade(b, [0.3, 1, -0.6], H.hh * 0.35, H.hw * 0.25, H.hd * 0.1, c); mb.blade(b, [-0.3, 1, -0.6], H.hh * 0.35, H.hw * 0.25, H.hd * 0.1, c); mb.sphere(b[0], b[1], b[2], H.hw * 0.08, H.hh * 0.05, H.hd * 0.08, '#40a040', 6, 4); fringe(mb, H, c, { top: 0.84, len: 0.58, n: 5, notch: 0.08, range: 52 }); };

  // ================================================================== costume extras
  const att = (m, bone, fn, opts) => m.attach(bone, meshOf(fn), null, opts || null);
  C3.att = att;
  const pauldron = (side) => (m, H, a) => att(m, side > 0 ? 'armL' : 'armR', mb => {
    // a.pauldronScale shrinks it, a.pauldronSq > 3 makes it boxy / angular (Shinra infantry)
    const r = H.pr.armR * H.as, k = (H.battle ? 1 : 1.15) * (a.pauldronScale || 1), s = side, q = a.pauldronSq || 2.6;
    mb.loft([{ y: r * 1.7 * k, rx: r * 1.2 * k, rz: r * 1.35 * k, x: -s * r * 0.4 }, { y: r * 0.9, rx: r * 2.05 * k, rz: r * 1.95 * k, x: s * r * 0.15 }, { y: -r * 0.5, rx: r * 2.2 * k, rz: r * 2.05 * k, x: s * r * 0.45 }, { y: -r * 1.7 * k, rx: r * 2.0 * k, rz: r * 1.85 * k, x: s * r * 0.55 }], { sides: q > 3 ? 6 : 8, color: a.pauldron || '#5a5a68', capBottom: false, sq: q });
  }, { cull: false });
  EXTRA.pauldronL = pauldron(1);
  EXTRA.pauldronR = pauldron(-1);
  EXTRA.straps = () => {};       // painted on the torso texture (humanoid.js)
  EXTRA.suitShirt = () => {};    // painted
  EXTRA.tie = () => {};          // painted
  EXTRA.belt = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr; const f = a.build === 'fat' ? 1.22 : 1; const bh = H.TT * (a.beltH || 0.13); mb.loft([{ y: -0.006, rx: pr.waistRX * 1.1 * H.bw * f, rz: pr.waistRZ * 1.14 * H.bd * f }, { y: bh, rx: pr.waistRX * 1.1 * H.bw * f * (a.beltH ? 1.04 : 1), rz: pr.waistRZ * 1.14 * H.bd * f }], { sides: 12, color: a.belt || '#6a3018' }); if (a.buckle !== false) mb.rbox(0, bh * 0.5, pr.waistRZ * 1.14 * H.bd * f, pr.waistRX * 0.42, bh * 0.9, 0.008, a.buckle || '#b0a070', 0.2); });
  EXTRA.sash = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr; const f = a.build === 'fat' ? 1.3 : 1; mb.loft([{ y: -0.01, rx: pr.waistRX * 1.12 * H.bw * f, rz: pr.waistRZ * 1.16 * H.bd * f }, { y: H.TT * 0.2, rx: pr.waistRX * 1.14 * H.bw * f, rz: pr.waistRZ * 1.2 * H.bd * f }], { sides: 12, color: a.sashColor || '#8a4a20' }); });
  EXTRA.busterback = (m, H, a, style) => { m.weaponOnBack = true; att(m, 'back', mb => { const k = style === 'battle' ? 0.78 : 0.62; mb.push(); mb.translate(-H.pr.chestRX * 0.5, H.TT * 0.5, -0.014); mb.rotate(0, 0, 0.55); WEAPON.buster(mb, k); mb.pop(); }, { cull: false }); };
  EXTRA.spearback = (m, H, a, style) => { m.weaponOnBack = true; att(m, 'back', mb => { mb.push(); mb.rotate(0, 0, 0.4); mb.rotate(Math.PI, 0, 0); WEAPON.spear(mb, style === 'battle' ? 1 : 0.65); mb.pop(); }, { cull: false }); };
  EXTRA.shurikenback = (m, H, a, style) => { m.weaponOnBack = true; att(m, 'back', mb => { mb.push(); mb.translate(0, 0, -0.012); mb.rotate(Math.PI / 2, 0, 0.3); mb.translate(0, 0.05 * (style === 'battle' ? 0.9 : 0.62), -0.1 * (style === 'battle' ? 0.9 : 0.62)); WEAPON.shuriken(mb, style === 'battle' ? 0.9 : 0.62); mb.pop(); }, { cull: false }); };
  // Cloud's battle-ready stance, matched to the PS1 battle model: a wide lunge (right foot forward, left leg straight
  // back with the foot turned out), the chest turned so the right shoulder leads, head facing the enemy, and both fists
  // together on the hilt in front of his left hip (right hand above), so the blade points forward and up. The angles
  // were solved so the fists meet at the grip measured from the reference. Only the torso breathes, so both hands stay
  // on the grip; the hips drop by the front thigh's bend so both soles stay on the ground.
  EXTRA.cloudStance = (m, H, a, style) => {
    if (style !== 'battle') return;
    const drop = H.thigh * 0.451;
    const stance = (mm, p) => {
      const br = Math.sin(p * Math.PI * 2), b = (n) => mm.b(n);
      b('hips').pos[1] = -drop; b('hips').rot[1] = 0.25;
      b('thighR').rot[0] = -1.0; b('shinR').rot[0] = 1.0;
      b('thighL').rot[0] = 0.695; b('shinL').rot[0] = 0.04; b('footL').rot[0] = -0.7; b('footL').rot[1] = 0.9;
      b('torso').rot[0] = 0.1 + br * 0.015; b('torso').rot[1] = 0.35;
      b('head').rot[0] = 0.04 - br * 0.01; b('head').rot[1] = -0.55;
      b('armR').rot[0] = -0.423; b('armR').rot[2] = 0.397; b('foreR').rot[0] = -0.52;
      b('armL').rot[0] = -0.13; b('armL').rot[2] = -0.259; b('foreL').rot[0] = -0.767;
    };
    // the sword swing starts from the lunge and blends into the shared 'slash' clip over its first 8 frames
    const A = FF7.anims;
    m.clips = Object.assign({}, m.clips, { battle: { dur: 70, fn: stance }, slash: { dur: A.slash.dur, loop: false, fn(mm, p, t) {
      stance(mm, 0); const snap = mm.order.map(bn => [bn.rot.slice(), bn.pos.slice()]);
      mm.resetPose(); A.slash.fn(mm, p, t);
      const k = 1 - Math.min(1, (t || 0) / 8);
      if (k > 0) mm.order.forEach((bn, i) => { for (let j = 0; j < 3; j++) { bn.rot[j] += (snap[i][0][j] - bn.rot[j]) * k; bn.pos[j] += (snap[i][1][j] - bn.pos[j]) * k; } });
    } } });
  };
  EXTRA.masamuneback = (m, H, a, style) => { m.weaponOnBack = true; att(m, 'back', mb => { mb.push(); mb.rotate(0, 0, 0.25); mb.rotate(Math.PI, 0, 0); WEAPON.masamune(mb, style === 'battle' ? 0.8 : 0.5); mb.pop(); }, { cull: false }); };
  // Barret's gatling gun arm (replaces the forearm + hand)
  // Gatling gun arm: a straight hexagonal housing over the forearm, a wider drum at the wrist and a cluster
  // of dark barrels sticking out of it (Barret, Dyne). o.barrels / o.barrelLen can be set per preset.
  EXTRA.gunarmMesh = (mb, H, a, side) => {
    const bt = H.battle, r = H.pr.foreR * H.as * (bt ? 1.3 : 1.18) * (a.gunScale || 1), fl = H.fo * (a.gunLen || 1);
    const G = a.gunColor || '#8a9098', D = a.barrelColor || '#34363c', rib = sh(G, -0.16);
    // elbow socket + housing (hexagonal, flat sides like the PS1 model)
    mb.loft([{ y: 0.012, rx: r * 0.66, rz: r * 0.66 }, { y: -fl * 0.1, rx: r * 0.94, rz: r * 0.94 }, { y: -fl * 0.82, rx: r, rz: r }], { sides: 6, color: G, phase: 0 });
    mb.loft([{ y: -fl * 0.36, rx: r * 1.06, rz: r * 1.06 }, { y: -fl * 0.46, rx: r * 1.06, rz: r * 1.06 }], { sides: 6, color: rib, phase: 0 });
    // drum: wider cylinder at the wrist with a dark face
    const d0 = -fl * 0.8, d1 = -fl * 1.08;
    mb.loft([{ y: d0, rx: r * 1.05, rz: r * 1.05 }, { y: d0 - fl * 0.05, rx: r * 1.24, rz: r * 1.24 }, { y: d1, rx: r * 1.24, rz: r * 1.24, capColor: sh(D, 0.1) }], { sides: 8, color: sh(G, 0.06) });
    mb.loft([{ y: d1 + fl * 0.07, rx: r * 1.28, rz: r * 1.28 }, { y: d1 + fl * 0.02, rx: r * 1.28, rz: r * 1.28 }], { sides: 8, color: rib, capTop: false, capBottom: false });
    // barrel cluster round a hub
    const n = a.barrels || (bt ? 6 : 5), L = fl * (a.barrelLen || (bt ? 0.62 : 0.4));
    if (n === 1) { mb.loft([{ y: d1 + 0.004, rx: r * 0.5, rz: r * 0.5 }, { y: d1 - L, rx: r * 0.42, rz: r * 0.42, capColor: '#0e0e10' }], { sides: 8, color: D }); return; }   // single long barrel (Dyne)
    for (let i = 0; i < n; i++) { const an = i / n * Math.PI * 2, x = Math.cos(an) * r * 0.66, z = Math.sin(an) * r * 0.66; mb.loft([{ y: d1 + 0.004, rx: r * 0.2, rz: r * 0.2, x, z }, { y: d1 - L, rx: r * 0.18, rz: r * 0.18, x, z, capColor: '#0e0e10' }], { sides: 5, color: D }); }
    mb.loft([{ y: d1 + 0.004, rx: r * 0.3, rz: r * 0.3 }, { y: d1 - L * 0.9, rx: r * 0.26, rz: r * 0.26 }], { sides: 6, color: sh(D, 0.12) });
    mb.loft([{ y: d1 - L * 0.78, rx: r * 0.96, rz: r * 0.96 }, { y: d1 - L * 0.9, rx: r * 0.96, rz: r * 0.96 }], { sides: 8, color: rib });   // barrel clamp
  };
  EXTRA.gunarmR = () => {}; EXTRA.gunarmL = () => {};   // handled in the forearm builder
  EXTRA.vest = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr, TT = H.TT; const vc = a.vestColor || '#5a4e30'; mb.loft([{ y: -0.002, rx: pr.waistRX * 1.12 * H.bw, rz: pr.waistRZ * 1.14 * H.bd }, { y: TT * 0.58, rx: pr.chestRX * 1.08 * H.bw, rz: pr.chestRZ * 1.1 * H.bd }, { y: TT * 0.8, rx: pr.chestRX * 1.14 * H.bw, rz: pr.chestRZ * 1.06 * H.bd }, { y: TT * 0.95, rx: Math.max(pr.chestRX * 1.06 * H.bw, H.shX * 1.02), rz: pr.chestRZ * 0.86 * H.bd }], { sides: 14, color: vc, arc: [deg(90 + (a.vestOpen || 22)), deg(450 - (a.vestOpen || 22))] }); }, { cull: false });
  EXTRA.shoulderpadsBig = (m, H, a) => { ['armL', 'armR'].forEach((b, i) => att(m, b, mb => { const r = H.pr.armR * H.as; mb.sphere(0, -r * 0.3, 0, r * 2.0, r * 1.5, r * 1.9, a.padColor || a.vestColor || '#5a4e30', 8, 4, true, null, 3); })); };
  EXTRA.goggles = (m, H, a) => att(m, 'head', mb => { const { hw, hh, hd } = H; const gy = a.goggleY || 0.84; const r = ringAt(H, hh * (gy - 0.04)); mb.loft([{ y: hh * (gy - 0.08), rx: r.rx * 1.13, rz: r.rz * 1.13, z: r.z }, { y: hh * (gy + 0.02), rx: r.rx * 1.1, rz: r.rz * 1.1, z: r.z }], { sides: 14, color: a.goggleStrap || '#3a3a44', capTop: false, capBottom: false }); const gk = a.goggleScale || 1; [1, -1].forEach(s => { const p = headPt(H, deg(90 - s * (24 + (gk - 1) * 15)), gy, 1.14); mb.rbox(p[0], p[1], p[2], hw * 0.4 * gk, hh * 0.19 * gk, hd * 0.14, a.goggleFrame || '#e0e0e0', gk > 1 ? 0.45 : 0.35); mb.rbox(p[0], p[1], p[2] + hd * 0.06, hw * 0.32 * gk, hh * 0.13 * gk, hd * 0.06, a.goggleLens || '#70b0e0', gk > 1 ? 0.45 : 0.3); }); }, { cull: false });
  EXTRA.headband = (m, H, a) => att(m, 'head', mb => { const { hh } = H; const r = ringAt(H, hh * 0.78); const y0 = hh * (a.bandY || 0.72); const bs = a.bandScale || 1.2; mb.loft([{ y: y0, rx: r.rx * bs, rz: r.rz * bs, z: r.z }, { y: y0 + hh * (a.bandW || 0.1), rx: r.rx * (bs - 0.02), rz: r.rz * (bs - 0.02), z: r.z }], { sides: 16, color: a.bandColor || '#e8e8e8', capTop: false, capBottom: false, arc: a.bandBack ? [deg(196), deg(344)] : null }); if (a.bandTails) [1, -1].forEach(s => mb.blade(headPt(H, deg(270 + s * 10), a.bandY || 0.72, 1.16), [s * 0.4, -0.6, -1], hh * 0.45, H.hw * 0.12, H.hd * 0.03, a.bandColor || '#e8e8e8')); }, { cull: false });
  EXTRA.redband = (m, H, a) => EXTRA.headband(m, H, Object.assign({}, a, { bandColor: a.bandColor2 || '#c02020', bandTails: a.bandTails }));
  EXTRA.cape = (m, H, a) => {   // Vincent's cloak: tall collar wrapped round the lower face, square cape shoulders and
    // a cloak that flares out from the shoulders to the calves in folds, with a torn, jagged hem
    const c = a.capeColor || '#a81818', pr = H.pr, TT = H.TT;
    att(m, 'torso', mb => {
      // a.capeFlare (1 = default flare; the field model's cloak hangs almost straight), a.capeJag (hem points, x shin),
      // a.capeShoulder (width of the square shoulder cape)
      const hw = Math.max(pr.chestRX * 1.3 * H.bw, H.shX * 1.45), op = a.capeOpen || 30;
      const hem = -(H.thigh + H.shin * (a.capeLen || 0.65)), jag = H.shin * (a.capeJag != null ? a.capeJag : 0.16);
      const fl = a.capeFlare != null ? a.capeFlare : 1, F = (k) => 1 + (k - 1) * fl, cs = a.capeShoulder || 1;
      const rows = [
        { y: TT * 1.02, rx: hw * 0.95 * cs, rz: pr.chestRZ * 1.4 * H.bd, z: -0.004 },
        { y: TT * 0.85, rx: hw * F(1.1) * cs, rz: pr.chestRZ * 1.58 * H.bd, z: -0.01 },
        { y: TT * 0.2, rx: hw * F(1.2), rz: pr.chestRZ * 1.8 * H.bd, z: -0.02 },
        { y: -(H.thigh * 0.6), rx: hw * F(1.36), rz: pr.chestRZ * 2.05 * H.bd, z: -0.03 },
        { y: hem, rx: hw * F(1.58), rz: pr.chestRZ * F(2.4) * H.bd, z: -0.045 },
      ];
      const n = 16, a0 = deg(90 + op), a1 = deg(450 - op);
      const P = (j, i) => {   // folds: every other column pushed out (more towards the hem); the hem is torn into points
        const r = rows[j], an = a0 + (a1 - a0) * i / n, f = 1 + (i % 2 ? 0.07 : -0.02) * (j / (rows.length - 1));
        const dy = j === rows.length - 1 ? (i % 2 ? -jag * (0.7 + U.hash(i, 7) * 0.6) : jag * 0.25) : 0;
        return [Math.cos(an) * r.rx * f, r.y + dy, r.z + Math.sin(an) * r.rz * f];
      };
      for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < n; i++) mb.quad(P(j, i), P(j, i + 1), P(j + 1, i + 1), P(j + 1, i), i % 2 ? sh(c, -0.07) : c);
      // high collar (covers the mouth), flaring a little at the top
      if (a.capeCollar !== false) mb.loft([{ y: TT * 0.92, rx: pr.chestRX * 0.75 * H.bw, rz: pr.chestRZ * 1.0 * H.bd, z: 0.004 }, { y: TT + pr.neck + H.hh * 0.22, rx: H.hw * 0.6, rz: H.hd * 0.6, z: H.hd * 0.05 }, { y: TT + pr.neck + H.hh * 0.42, rx: H.hw * 0.7, rz: H.hd * 0.68, z: H.hd * 0.04 }], { sides: 12, color: c, capTop: false, capBottom: false });
      // cloak over the shoulders: a short square cape layer that makes the wide red shoulders
      mb.loft([{ y: TT * 1.04, rx: pr.chestRX * 0.8 * H.bw, rz: pr.chestRZ * 1.0 * H.bd }, { y: TT * 0.92, rx: hw * 1.16 * cs, rz: pr.chestRZ * 1.5 * H.bd }, { y: TT * 0.5, rx: hw * 1.26 * cs, rz: pr.chestRZ * 1.66 * H.bd }], { sides: 12, sq: 3.2, color: sh(c, 0.06), arc: [deg(90 + 18), deg(450 - 18)] });
    }, { cull: false });
  };
  EXTRA.coat = (m, H, a) => {   // long coat skirt from the waist down, open at the front (Sephiroth, Rufus, lab coats)
    const c = a.coatColor || a.top;
    att(m, 'hips', mb => { const pr = H.pr; const L = H.thigh + H.shin * (a.coatLen || 0.85); const f = a.build === 'fat' ? 1.3 : 1; const op = a.coatOpen != null ? a.coatOpen : 14; mb.loft([{ y: H.pel + 0.004, rx: pr.waistRX * 1.12 * H.bw * f, rz: pr.waistRZ * 1.18 * H.bd * f }, { y: -0.01, rx: H.hipW * 1.18 * f, rz: pr.waistRZ * 1.35 * H.bd * f }, { y: -L * 0.45, rx: H.hipW * 1.35 * f, rz: pr.waistRZ * 1.6 * H.bd * f }, { y: -L, rx: H.hipW * 1.55 * f, rz: pr.waistRZ * 1.85 * H.bd * f }], { sides: 14, color: c, arc: [deg(90 + op), deg(450 - op)] }); }, { cull: false });
  };
  EXTRA.labcoat = (m, H, a) => EXTRA.coat(m, H, Object.assign({}, a, { coatColor: a.coatColor || '#ececec' }));
  EXTRA.robe = (m, H, a) => { const c = a.robeColor || a.top; att(m, 'hips', mb => { const pr = H.pr; const L = H.thigh + H.shin * (a.robeLen || 1.0); const f = a.build === 'fat' ? 1.3 : 1; mb.loft([{ y: H.pel + 0.004, rx: pr.waistRX * 1.12 * H.bw * f, rz: pr.waistRZ * 1.18 * H.bd * f }, { y: -0.01, rx: H.hipW * 1.18 * f, rz: pr.waistRZ * 1.35 * H.bd * f }, { y: -L, rx: H.hipW * 1.6 * f, rz: pr.waistRZ * 1.9 * H.bd * f }], { sides: 12, color: c, capTop: false }); }, { cull: false }); };
  // apron: a panel that wraps round the front of the hips and skirt (clears a flared skirt), optional bib over the chest
  EXTRA.apron = (m, H, a) => att(m, 'torso', mb => {
    const pr = H.pr, c = a.apronColor || '#f0ece0', z = pr.waistRZ * 1.2 * H.bd, L = H.thigh * (a.apronLen || 0.9);
    const fl = a.skirt ? (a.skirtFlare || (a.skirt === 'long' ? 1.6 : 1.3)) : 1;
    const zb = Math.max(z * 1.5, Math.max(pr.waistRZ * 1.3 * H.bd, pr.thighR * 1.15) * (1 + (fl - 1) * Math.min(1, L / (H.thigh * (a.skirt === 'long' ? 1.6 : 0.8)))) * 1.08);
    mb.loft([{ y: 0.012, rx: pr.waistRX * 1.1 * H.bw, rz: z }, { y: -H.pel - L, rx: H.hipW * 1.25 * (1 + (fl - 1) * 0.5), rz: zb }], { sides: 4, color: c, arc: [deg(40), deg(140)] });
    if (a.apronBib) { const w0 = pr.waistRX * 0.8 * H.bw, w1 = pr.chestRX * 0.62 * H.bw, zc = pr.chestRZ * H.bd * (1 + H.fem * 0.4) * 1.1; const zw = Math.max(z, zc * 0.96); mb.quad([-w0, 0.012, zw], [w0, 0.012, zw], [w1, H.TT * 0.58, zc], [-w1, H.TT * 0.58, zc], c); mb.quad([-w1, H.TT * 0.58, zc], [w1, H.TT * 0.58, zc], [w1, H.TT * 0.86, pr.chestRZ * 1.02 * H.bd * (1 + H.fem * 0.25)], [-w1, H.TT * 0.86, pr.chestRZ * 1.02 * H.bd * (1 + H.fem * 0.25)], c); }
  }, { cull: false });
  EXTRA.bowtie = (m, H, a) => att(m, 'torso', mb => { [1, -1].forEach(s => mb.blade([0, H.TT * 0.93, H.pr.chestRZ * 0.72 * H.bd], [s, 0.15, 0.2], H.pr.chestRX * 0.5 * H.bw, H.TT * 0.16, 0.008, a.bowColor || '#f0e040', [0, 1, 0])); mb.sphere(0, H.TT * 0.93, H.pr.chestRZ * 0.74 * H.bd, 0.008, 0.008, 0.006, sh(a.bowColor || '#f0e040', -0.2), 5, 3); });
  EXTRA.furcollar = (m, H, a) => att(m, 'torso', mb => mb.loft([{ y: H.TT * 0.62, rx: H.pr.chestRX * 1.35 * H.bw, rz: H.pr.chestRZ * 1.5 * H.bd }, { y: H.TT * 0.95, rx: Math.max(H.pr.chestRX * 1.3 * H.bw, H.shX * 1.2), rz: H.pr.chestRZ * 1.4 * H.bd }, { y: H.TT * 1.12, rx: H.pr.chestRX * 0.9 * H.bw, rz: H.pr.chestRZ * 1.0 * H.bd }], { sides: 12, color: a.furColor || '#f0ece0', capTop: false, capBottom: false, arc: [deg(115), deg(425)] }), { cull: false });
  EXTRA.bangles = (m, H, a) => ['foreL', 'foreR'].forEach(b => att(m, b, mb => { const r = H.pr.foreR * H.as * (H.battle ? 1 : 1.12); const k = H.battle ? 1 : 1.12; mb.loft([{ y: -H.fo * (H.battle ? 0.72 : 0.55), rx: r * 1.18 * k, rz: r * 1.12 * k }, { y: -H.fo * 0.98, rx: r * 1.14 * k, rz: r * 1.08 * k }], { sides: 8, color: a.bangleColor || '#e0b040' }); }));
  EXTRA.armguard = (m, H, a) => ['foreL', 'foreR'].forEach(b => att(m, b, mb => { const r = H.pr.foreR * H.as; mb.loft([{ y: -H.fo * 0.2, rx: r * 1.1, rz: r * 1.05 }, { y: -H.fo * 0.98, rx: r * 1.1, rz: r * 1.02 }], { sides: 8, color: a.armguard || '#4a4a58' }); }));
  EXTRA.bracerL = (m, H, a) => att(m, 'foreL', mb => { const r = H.pr.foreR * H.as * (H.battle ? 1 : 1.08); mb.loft([{ y: -H.fo * (a.bracerTop != null ? a.bracerTop : 0.3), rx: r * 1.16, rz: r * 1.1 }, { y: -H.fo * 1.0, rx: r * 1.28, rz: r * 1.2 }], { sides: 8, color: a.bracerL || '#707078' }); });
  EXTRA.bracerR = (m, H, a) => att(m, 'foreR', mb => { const r = H.pr.foreR * H.as * (H.battle ? 1 : 1.08); mb.loft([{ y: -H.fo * (a.bracerTop != null ? a.bracerTop : 0.3), rx: r * 1.16, rz: r * 1.1 }, { y: -H.fo * 1.0, rx: r * 1.28, rz: r * 1.2 }], { sides: 8, color: a.bracerR || '#707078' }); });
  EXTRA.mask = () => {};   // painted in the face texture
  EXTRA.moustache3d = (m, H, a) => att(m, 'head', mb => moustache(mb, H, a), { cull: false });
  EXTRA.mustache = EXTRA.moustache3d;   // every painted moustache also gets the geometry (it reads at field scale)
  // long beard as geometry (a.beardLen x head height below the chin, a.beardW x head width): a pointed wedge from
  // the jaw plus two cheek pieces. Without beardLen the 'beard' stays painted (Barret's jaw beard, townsfolk).
  EXTRA.beard = (m, H, a) => { if (!a.beardLen) return; att(m, 'head', mb => {
    const c = a.beardColor || a.hair || '#1c1612', L = H.hh * a.beardLen, W = H.hw * (a.beardW || 0.52), ctr = { radial: HC(H) };
    mb.blade(headPt(H, deg(90), 0.1, 1.02), [0, -1, 0.3], L, W, H.hd * 0.26, c, [1, 0, 0], sh(c, 0.06));
    [1, -1].forEach(s => mb.blade(headPt(H, deg(90 - s * 42), 0.3, 1.02), [-s * 0.25, -1, 0.25], L * 0.55 + H.hh * 0.12, W * 0.55, H.hd * 0.14, c, ctr));
  }, { cull: false }); };
  EXTRA.vestArmor = (m, H, a) => att(m, 'torso', mb => mb.loft([{ y: H.TT * 0.3, rx: H.pr.chestRX * 1.1 * H.bw, rz: H.pr.chestRZ * 1.16 * H.bd }, { y: H.TT * 0.62, rx: H.pr.chestRX * 1.12 * H.bw, rz: H.pr.chestRZ * 1.14 * H.bd }, { y: H.TT * 0.9, rx: H.pr.chestRX * 1.14 * H.bw, rz: H.pr.chestRZ * 1.02 * H.bd }], { sides: 12, color: a.armorColor || sh(a.top || '#3a5a8a', -0.3), capTop: false, capBottom: false }), { cull: false });
  EXTRA.shoulderCape = (m, H, a) => att(m, 'torso', mb => mb.loft([{ y: H.TT * 1.02, rx: H.pr.chestRX * 0.8 * H.bw, rz: H.pr.chestRZ * 0.9 * H.bd }, { y: H.TT * 0.7, rx: H.pr.chestRX * 1.6 * H.bw, rz: H.pr.chestRZ * 1.3 * H.bd }], { sides: 8, color: a.capeColor || a.top, capTop: false, capBottom: false }), { cull: false });
  EXTRA.cigarette = (m, H, a) => att(m, 'head', mb => { const p = headPt(H, deg(80), 0.19, 0.98); mb.push(); mb.translate(p[0], p[1], p[2]); mb.rotate(Math.PI / 2 - 0.2, 0.5, 0); mb.loft([{ y: 0, rx: 0.0045, rz: 0.0045 }, { y: H.hh * 0.24, rx: 0.0045, rz: 0.0045, color: '#f4f4f0' }], { sides: 5, color: '#f4f4f0' }); mb.pop(); });
  EXTRA.redcap = (m, H, a) => m.attach('head', meshOf(mb => { cap(mb, H, a.capColor || '#c02020', { front: 0.66, sides: 0.58, back: 0.45, scale: 1.16, frontW: 70 }); mb.blade(headPt(H, deg(270), 0.68, 1.14), [0, -0.6, -1], H.hh * 0.32, H.hw * 0.3, H.hd * 0.05, a.capColor || '#c02020'); }));
  EXTRA.bolero = (m, H, a) => {   // Aeris' short red jacket with puffed sleeves
    const c = a.jacket || '#c02828', pr = H.pr, TT = H.TT;
    m.attach('torso', meshOf(mb => { mb.loft([{ y: TT * 0.5, rx: pr.chestRX * 1.12 * H.bw, rz: pr.chestRZ * 1.28 * H.bd }, { y: TT * 0.8, rx: pr.chestRX * 1.16 * H.bw, rz: pr.chestRZ * 1.12 * H.bd }, { y: TT * 0.95, rx: Math.max(pr.chestRX * 1.08 * H.bw, H.shX * 1.02), rz: pr.chestRZ * 0.92 * H.bd }, { y: TT * 1.03, rx: pr.chestRX * 0.62 * H.bw, rz: pr.chestRZ * 0.66 * H.bd }], { sides: 14, color: c, arc: [deg(90 + 26), deg(450 - 26)] }); }), null, { cull: false });
    ['armL', 'armR'].forEach(b => m.attach(b, meshOf(mb => { const r = H.pr.armR * H.as; mb.sphere(0, -r * 0.7, 0, r * 1.9, r * 2.0, r * 1.9, c, 8, 5, true); if (a.cuffColor) mb.loft([{ y: -r * 2.2, rx: r * 1.5, rz: r * 1.45 }, { y: -r * 2.9, rx: r * 1.35, rz: r * 1.3 }], { sides: 8, color: a.cuffColor }); })));
  };
  EXTRA.jacket = (m, H, a) => {   // open jacket over the shirt (Cid, Johnny, suits without paint)
    const c = a.jacket || '#2a4ea0', pr = H.pr, TT = H.TT;
    const f = a.build === 'fat' ? 1.2 : 1;
    m.attach('torso', meshOf(mb => { mb.loft([{ y: -0.015, rx: pr.waistRX * 1.16 * H.bw * f, rz: pr.waistRZ * 1.22 * H.bd * f }, { y: TT * 0.3, rx: pr.waistRX * 1.18 * H.bw * f, rz: pr.waistRZ * 1.26 * H.bd * f }, { y: TT * 0.58, rx: pr.chestRX * 1.1 * H.bw, rz: pr.chestRZ * 1.14 * H.bd }, { y: TT * 0.8, rx: pr.chestRX * 1.16 * H.bw, rz: pr.chestRZ * 1.08 * H.bd }, { y: TT * 0.95, rx: Math.max(pr.chestRX * 1.08 * H.bw, H.shX * 1.04), rz: pr.chestRZ * 0.9 * H.bd }, { y: TT * 1.04, rx: pr.chestRX * 0.66 * H.bw, rz: pr.chestRZ * 0.72 * H.bd }], { sides: 14, color: c, arc: [deg(90 + (a.jacketOpen || 20)), deg(450 - (a.jacketOpen || 20))] }); if (a.jacketHem) mb.loft([{ y: -0.015, rx: pr.waistRX * 1.2 * H.bw * f, rz: pr.waistRZ * 1.26 * H.bd * f }, { y: -H.pel - H.thigh * a.jacketHem, rx: H.hipW * 1.22, rz: pr.waistRZ * 1.4 * H.bd * f }], { sides: 14, color: c, arc: [deg(90 + (a.jacketOpen || 20)), deg(450 - (a.jacketOpen || 20))] }); }), null, { cull: false });
    if (a.jacketSleeves !== false) ['armL', 'armR'].forEach(b => m.attach(b, meshOf(mb => { const r = H.pr.armR * H.as; mb.sphere(0, -r * 0.3, 0, r * 1.45, r * 1.4, r * 1.4, c, 8, 5, true); mb.loft([{ y: 0, rx: r * 1.3, rz: r * 1.28 }, { y: -H.up * (a.jacketSleeveLen || 1.0), rx: r * 1.15, rz: r * 1.12 }], { sides: 8, color: c }); if (a.sleeveRoll) mb.loft([{ y: -H.up * (a.jacketSleeveLen || 1.0) + r * 0.2, rx: r * 1.3, rz: r * 1.28 }, { y: -H.up * (a.jacketSleeveLen || 1.0) - r * 0.6, rx: r * 1.28, rz: r * 1.25 }], { sides: 8, color: a.sleeveRoll }); })));
  };
  EXTRA.scarf = (m, H, a) => att(m, 'torso', mb => { const pr = H.pr, TT = H.TT; mb.loft([{ y: TT * 0.86, rx: pr.chestRX * 0.62 * H.bw, rz: pr.chestRZ * 0.84 * H.bd }, { y: TT * 1.08, rx: pr.chestRX * 0.52 * H.bw, rz: pr.chestRZ * 0.62 * H.bd }], { sides: 10, color: a.scarfColor || '#f0f0f0', capTop: false }); if (a.scarfTails !== false) [1, -1].forEach((s, i) => mb.blade([s * pr.chestRX * 0.12 * H.bw, TT * 0.92, pr.chestRZ * (1.02 + i * 0.04) * H.bd], [s * 0.12, -1, 0.14], TT * (a.scarfTailLen || 0.5) * (i ? 0.85 : 1), pr.chestRX * 0.3 * H.bw, 0.012, i ? sh(a.scarfColor || '#f0f0f0', -0.06) : (a.scarfColor || '#f0f0f0'), [1, 0, 0])); }, { cull: false });
  EXTRA.collarUp = (m, H, a) => att(m, 'torso', mb => mb.loft([{ y: H.TT * 0.94, rx: H.pr.chestRX * 0.7 * H.bw, rz: H.pr.chestRZ * 0.8 * H.bd }, { y: H.TT + H.pr.neck + 0.02, rx: H.pr.chestRX * 0.62 * H.bw, rz: H.pr.chestRZ * 0.74 * H.bd }], { sides: 12, color: a.collarUp || a.top, capTop: false, capBottom: false, arc: [deg(120), deg(420)] }), { cull: false });
  EXTRA.turtleneck = (m, H, a) => att(m, 'torso', mb => mb.loft([{ y: H.TT * 0.94, rx: H.pr.chestRX * 0.55 * H.bw, rz: H.pr.chestRZ * 0.66 * H.bd }, { y: H.TT + H.pr.neck + 0.012, rx: H.pr.chestRX * 0.4 * H.bw, rz: H.pr.chestRZ * 0.5 * H.bd }], { sides: 10, color: a.neckTop || a.top, capTop: false }));
  EXTRA.necklace = (m, H, a) => att(m, 'torso', mb => { mb.blade([0, H.TT * 0.8, H.pr.chestRZ * 1.02 * H.bd], [0, -1, 0.1], H.TT * 0.12, H.pr.chestRX * 0.14, 0.006, a.pendant || '#e0c040', [1, 0, 0]); });
  EXTRA.backpack = (m, H, a) => att(m, 'torso', mb => mb.rbox(0, H.TT * 0.55, -H.pr.chestRZ * 1.5 * H.bd, H.pr.chestRX * 1.3 * H.bw, H.TT * 0.6, H.pr.chestRZ * 1.1, a.packColor || '#6a5030', 0.3));
  EXTRA.hairband = (m, H, a) => att(m, 'head', mb => { const r = ringAt(H, H.hh * 0.9); mb.loft([{ y: H.hh * 0.86, rx: r.rx * 1.14, rz: r.rz * 1.14, z: r.z }, { y: H.hh * 0.93, rx: r.rx * 1.08, rz: r.rz * 1.08, z: r.z }], { sides: 14, color: a.hairbandColor || '#e0e040', capTop: false, capBottom: false }); }, { cull: false });
  EXTRA.bow = (m, H, a) => att(m, 'head', mb => { const p = headPt(H, deg(90), 1.02, 1.1); [1, -1].forEach(s => mb.blade(p, [s, 0.35, -0.1], H.hw * 0.5, H.hh * 0.3, H.hd * 0.06, a.bowColor || '#f04080', [0, 1, 0])); mb.sphere(p[0], p[1], p[2], H.hw * 0.06, H.hh * 0.06, H.hd * 0.05, sh(a.bowColor || '#f04080', -0.15), 5, 3); });
  EXTRA.flower = (m, H, a) => att(m, 'head', mb => { const p = headPt(H, deg(40), 0.85, 1.14); for (let i = 0; i < 5; i++) { const an = i * Math.PI * 2 / 5; mb.blade(p, [Math.cos(an), Math.sin(an), 0.2], H.hw * 0.14, H.hw * 0.1, H.hd * 0.03, a.flowerColor || '#f0f0f0', [0, 0, 1]); } });
  EXTRA.earrings = (m, H, a) => att(m, 'head', mb => [1, -1].forEach(s => mb.sphere(s * H.hw * 0.52, H.hh * 0.28, 0, H.hw * 0.035, H.hh * 0.04, H.hw * 0.035, a.earringColor || '#e0c040', 5, 3)));
  EXTRA.crown = (m, H, a) => att(m, 'head', mb => { const r = ringAt(H, H.hh * 0.9); mb.loft([{ y: H.hh * 0.9, rx: r.rx * 1.1, rz: r.rz * 1.1 }, { y: H.hh * 1.15, rx: r.rx * 1.15, rz: r.rz * 1.15 }], { sides: 8, color: '#e0c030', capTop: false, capBottom: false }); for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4; mb.blade([Math.cos(an) * r.rx * 1.15, H.hh * 1.12, Math.sin(an) * r.rz * 1.15], [0, 1, 0], H.hh * 0.14, r.rx * 0.5, 0.004, '#e0c030', { radial: [0, H.hh * 1.12, 0] }); } }, { cull: false });

  // ================================================================== weapons (built along -y from the grip)
  WEAPON.buster = (mb, s) => {
    // Matched to the PS1 model (references/battle models): the blade is centred on the hilt, its spine
    // runs straight to the point and the bevelled cutting edge angles up to it near the end; purple
    // wrapped grip, rectangular guard collar, two round holes side by side next to the guard.
    const grip = '#6a3450', steel = '#c2c6ce', bevelC = '#8e949c', dark = '#6a6e76', guardC = '#9c9ca6';
    mb.loft([{ y: 0.07 * s, rx: 0.015 * s, rz: 0.015 * s }, { y: -0.13 * s, rx: 0.015 * s, rz: 0.015 * s }], { sides: 6, color: grip });   // wrapped grip
    mb.sphere(0, 0.078 * s, 0, 0.019 * s, 0.016 * s, 0.019 * s, '#8a8a94', 6, 4);                                                        // pommel
    const bw = 0.15 * s, L = 0.98 * s, th = 0.018 * s, y0 = -0.172 * s;
    mb.rbox(0, -0.152 * s, 0, 0.04 * s, 0.042 * s, bw * 1.12, guardC, 0.15);                                                             // guard collar
    mb.push(); mb.rotate(0, Math.PI / 2, 0);
    // across the blade: spine at x = a, cutting edge at x = b; the point is on the spine side
    const a = -bw / 2, b = bw / 2, bev = bw * 0.32, tipY = y0 - L, cutY = y0 - L * 0.8;
    const diag = (x) => tipY + (x - a) / (b - a) * (cutY - tipY), e = b - bev, ye = diag(e);
    mb.quad([a, y0, th], [e, y0, th], [e, ye, th], [a, tipY, th], steel);                        // flats
    mb.quad([a, tipY, -th], [e, ye, -th], [e, y0, -th], [a, y0, -th], sh(steel, -0.08));
    mb.quad([e, y0, th], [b, y0, 0], [b, cutY, 0], [e, ye, th], bevelC);                          // edge bevels
    mb.quad([e, ye, -th], [b, cutY, 0], [b, y0, 0], [e, y0, -th], sh(bevelC, -0.08));
    mb.quad([a, y0, -th], [a, y0, th], [a, tipY, th], [a, tipY, -th], dark);                      // spine
    mb.quad([a, tipY, -th], [a, tipY, th], [e, ye, th], [e, ye, -th], dark);                      // the angled tip
    mb.tri([e, ye, th], [b, cutY, 0], [e, ye, -th], bevelC);
    mb.quad([a, y0, th], [a, y0, -th], [e, y0, -th], [e, y0, th], dark);                          // top (under the guard)
    // the two holes next to the guard, one behind the other along the blade
    [0.06, 0.105].forEach(k => [1, -1].forEach(f => mb.rbox(-bw * 0.06, y0 - k * s, f * (th + 0.0012), 0.026 * s, 0.026 * s, 0.002, '#1e1e24', 0.45)));
    mb.pop();
  };
  WEAPON.masamune = (mb, s) => {
    mb.loft([{ y: 0.08 * s, rx: 0.012 * s, rz: 0.012 * s }, { y: -0.15 * s, rx: 0.012 * s, rz: 0.012 * s }], { sides: 6, color: '#1a1a20' });
    mb.loft([{ y: -0.15 * s, rx: 0.032 * s, rz: 0.032 * s }, { y: -0.162 * s, rx: 0.032 * s, rz: 0.032 * s }], { sides: 8, color: '#c0a040' });
    mb.push(); mb.rotate(0, Math.PI / 2, 0);
    const pts = []; const N = 8, L = 1.2 * s;   // about 1.3 times Sephiroth's height with the hilt
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push([0.006 * s + Math.sin(t * Math.PI * 0.5) * 0.05 * s * t, -0.165 * s - t * L]); }
    for (let i = N; i >= 0; i--) { const t = i / N; pts.push([pts[i][0] + 0.022 * s * (1 - t * 0.85), pts[i][1]]); }
    for (let i = 0; i < N; i++) mb.quad([pts[i][0], pts[i][1], 0.004 * s], [pts[i + 1][0], pts[i + 1][1], 0.004 * s], [pts[2 * N + 1 - i - 1][0], pts[2 * N + 1 - i - 1][1], 0], [pts[2 * N + 1 - i][0], pts[2 * N + 1 - i][1], 0], '#e8ecf4');
    for (let i = 0; i < N; i++) mb.quad([pts[2 * N + 1 - i][0], pts[2 * N + 1 - i][1], 0], [pts[2 * N + 1 - i - 1][0], pts[2 * N + 1 - i - 1][1], 0], [pts[i + 1][0], pts[i + 1][1], -0.004 * s], [pts[i][0], pts[i][1], -0.004 * s], '#c8ccd8');
    for (let i = 0; i < N; i++) mb.quad([pts[i][0], pts[i][1], -0.004 * s], [pts[i + 1][0], pts[i + 1][1], -0.004 * s], [pts[i + 1][0], pts[i + 1][1], 0.004 * s], [pts[i][0], pts[i][1], 0.004 * s], '#9a9eaa');
    mb.pop();
  };
  WEAPON.staff = (mb, s) => {   // Aeris' Guard Stick: long metal staff with capped ends
    const L0 = 0.62 * s, L1 = -0.62 * s;
    mb.loft([{ y: L0, rx: 0.011 * s, rz: 0.011 * s }, { y: L1, rx: 0.011 * s, rz: 0.011 * s }], { sides: 6, color: '#c8ccd4' });
    [L0, L1].forEach(y => { mb.loft([{ y: y - 0.02 * s, rx: 0.016 * s, rz: 0.016 * s }, { y: y + 0.02 * s, rx: 0.016 * s, rz: 0.016 * s }], { sides: 6, color: '#6a6e78' }); });
    mb.loft([{ y: 0.04 * s, rx: 0.014 * s, rz: 0.014 * s }, { y: -0.06 * s, rx: 0.014 * s, rz: 0.014 * s }], { sides: 6, color: '#3a3a44' });
    mb.sphere(0, 0.12 * s, 0, 0.016 * s, 0.016 * s, 0.016 * s, '#e8e040', 6, 4);
  };
  WEAPON.spear = (mb, s) => {   // Cid's Spear: long shaft, leaf blade
    mb.loft([{ y: 0.62 * s, rx: 0.011 * s, rz: 0.011 * s }, { y: -0.72 * s, rx: 0.011 * s, rz: 0.011 * s }], { sides: 6, color: '#b8b4a8' });
    mb.loft([{ y: 0.6 * s, rx: 0.018 * s, rz: 0.018 * s }, { y: 0.66 * s, rx: 0.014 * s, rz: 0.014 * s }], { sides: 6, color: '#5a5a64' });
    mb.blade([0, 0.66 * s, 0], [0, 1, 0], 0.22 * s, 0.055 * s, 0.014 * s, '#d0d4dc', [1, 0, 0]);
    mb.blade([0, -0.72 * s, 0], [0, -1, 0], 0.05 * s, 0.02 * s, 0.014 * s, '#8a8a94', [1, 0, 0]);
  };
  // guns are built with the barrel along -y (the direction the forearm points), grip at the origin
  WEAPON.gun = (mb, s) => {   // Vincent's Quicksilver (long-barrel revolver)
    mb.rbox(0, 0.01 * s, -0.035 * s, 0.022 * s, 0.03 * s, 0.07 * s, '#3a3030', 0.25);   // grip (hangs back from the hand)
    mb.rbox(0, -0.03 * s, 0.0, 0.03 * s, 0.05 * s, 0.035 * s, '#c8ccd4', 0.25);        // frame + cylinder
    mb.loft([{ y: -0.05 * s, rx: 0.009 * s, rz: 0.01 * s, z: 0.004 * s }, { y: -0.19 * s, rx: 0.009 * s, rz: 0.01 * s, z: 0.004 * s }], { sides: 6, color: '#d8dce4' });
  };
  WEAPON.rifle = (mb, s) => {
    mb.rbox(0, 0.06 * s, -0.01 * s, 0.028 * s, 0.16 * s, 0.05 * s, '#2e2e34', 0.15);   // stock + receiver
    mb.rbox(0, -0.06 * s, 0.005 * s, 0.026 * s, 0.14 * s, 0.045 * s, '#3a3a42', 0.15);
    mb.rbox(0, 0.0, -0.045 * s, 0.018 * s, 0.03 * s, 0.05 * s, '#2a2a30', 0.2);         // magazine
    mb.loft([{ y: -0.12 * s, rx: 0.008 * s, rz: 0.008 * s, z: 0.012 * s }, { y: -0.28 * s, rx: 0.008 * s, rz: 0.008 * s, z: 0.012 * s }], { sides: 6, color: '#1a1a20' });
  };
  WEAPON.smg = (mb, s) => {   // Shinra MP submachine gun: boxy receiver along the forearm, magazine and grip hanging down
    mb.rbox(0, 0.0, -0.028 * s, 0.022 * s, 0.035 * s, 0.05 * s, '#26262c', 0.2);
    mb.rbox(0, -0.07 * s, 0.012 * s, 0.032 * s, 0.17 * s, 0.045 * s, '#3a3a44', 0.15);
    mb.rbox(0, -0.1 * s, -0.04 * s, 0.018 * s, 0.028 * s, 0.075 * s, '#1e1e22', 0.2);
    mb.loft([{ y: -0.15 * s, rx: 0.009 * s, rz: 0.009 * s, z: 0.02 * s }, { y: -0.25 * s, rx: 0.008 * s, rz: 0.008 * s, z: 0.02 * s }], { sides: 6, color: '#18181c' });
  };
  WEAPON.shotgun = (mb, s) => {   // Rufus' shotgun
    mb.rbox(0, 0.05 * s, -0.01 * s, 0.03 * s, 0.14 * s, 0.05 * s, '#5a3a24', 0.2);
    [-1, 1].forEach(k => mb.loft([{ y: -0.01 * s, rx: 0.011 * s, rz: 0.011 * s, x: k * 0.011 * s, z: 0.01 * s }, { y: -0.36 * s, rx: 0.011 * s, rz: 0.011 * s, x: k * 0.011 * s, z: 0.01 * s }], { sides: 6, color: '#707480' }));
  };
  WEAPON.rod = (mb, s) => { mb.loft([{ y: 0.06 * s, rx: 0.011 * s, rz: 0.011 * s }, { y: -0.08 * s, rx: 0.011 * s, rz: 0.011 * s }], { sides: 6, color: '#6a1a1a' }); mb.loft([{ y: -0.08 * s, rx: 0.008 * s, rz: 0.008 * s }, { y: -0.5 * s, rx: 0.007 * s, rz: 0.007 * s }], { sides: 6, color: '#c8ccd8' }); mb.sphere(0, -0.5 * s, 0, 0.011 * s, 0.011 * s, 0.011 * s, '#e0e0f0', 5, 3); };
  WEAPON.nightstick = WEAPON.rod;
  WEAPON.shuriken = (mb, s) => {   // Yuffie's 4-point Conformer-style shuriken
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; mb.blade([0, -0.05 * s, 0.12 * s], [Math.cos(a), 0, Math.sin(a)], 0.28 * s, 0.075 * s, 0.014 * s, '#c8ccd4', [0, 1, 0], '#f0f2f6'); }
    mb.loft([{ y: -0.05 * s - 0.012 * s, rx: 0.035 * s, rz: 0.035 * s, z: 0.12 * s }, { y: -0.05 * s + 0.012 * s, rx: 0.035 * s, rz: 0.035 * s, z: 0.12 * s }], { sides: 8, color: '#60646c' });
  };
  WEAPON.sword = (mb, s) => { mb.loft([{ y: 0.06 * s, rx: 0.012 * s, rz: 0.012 * s }, { y: -0.1 * s, rx: 0.012 * s, rz: 0.012 * s }], { sides: 6, color: '#3a2a20' }); mb.rbox(0, -0.11 * s, 0, 0.02 * s, 0.02 * s, 0.09 * s, '#a09060', 0.2); mb.push(); mb.rotate(0, Math.PI / 2, 0); mb.panel([[-0.02 * s, -0.12 * s], [0.02 * s, -0.12 * s], [0.018 * s, -0.7 * s], [0, -0.76 * s], [-0.018 * s, -0.7 * s]], 0, 0.008 * s, '#d0d4dc'); mb.pop(); };
  WEAPON.katana = (mb, s) => { mb.loft([{ y: 0.08 * s, rx: 0.011 * s, rz: 0.011 * s }, { y: -0.12 * s, rx: 0.011 * s, rz: 0.011 * s }], { sides: 6, color: '#2a2030' }); mb.loft([{ y: -0.12 * s, rx: 0.025 * s, rz: 0.025 * s }, { y: -0.13 * s, rx: 0.025 * s, rz: 0.025 * s }], { sides: 8, color: '#b09040' }); mb.push(); mb.rotate(0, Math.PI / 2, 0); mb.panel([[0, -0.13 * s], [0.024 * s, -0.13 * s], [0.02 * s, -0.8 * s], [0, -0.86 * s]], 0, 0.006 * s, '#e0e4ec'); mb.pop(); };
  WEAPON.megaphone = (mb, s) => { mb.loft([{ y: 0.012 * s, rx: 0.012 * s, rz: 0.012 * s }, { y: -0.05 * s, rx: 0.016 * s, rz: 0.016 * s }, { y: -0.14 * s, rx: 0.05 * s, rz: 0.05 * s }], { sides: 8, color: '#ec7424', capBottom: false }); mb.loft([{ y: -0.136 * s, rx: 0.052 * s, rz: 0.052 * s }, { y: -0.146 * s, rx: 0.054 * s, rz: 0.054 * s }], { sides: 8, color: '#f0f0f0', capTop: false, capBottom: false }); };   // orange with a white rim (Cait Sith)
  WEAPON.fist = () => {};
  WEAPON.gunarm = () => {};
  // Grip per weapon (humanoid.js): the battle stance holds the right forearm level and forward, so without a
  // grip every blade would stick straight ahead like a lance. dir = where the weapon's -y end points in that
  // stance (x = model's left, y = up, z = forward); roll turns the blade flat; arm = [armR, foreR] stance.
  Object.assign(C3.GRIP, {
    buster: { dir: [-0.42, 0.72, 0.55], roll: -0.9 },      // raised on a diagonal out to his right (ff7gif05, Character Reference)
    sword: { dir: [-0.35, 0.72, 0.6], roll: -0.9 },
    katana: { dir: [-0.3, 0.75, 0.6], roll: -0.9 },
    masamune: { dir: [-0.42, -0.2, 0.88], roll: -1.2 },    // the long blade held low, reaching forward past his right side
    staff: { dir: [-0.28, -0.82, 0.3] },                    // near upright across the body (top end over her left shoulder)
    spear: { dir: [-0.12, -0.55, -0.82] },                  // the head end (+y) angled up and forward, the butt down behind
    rod: { dir: [-0.2, 0.9, 0.25] },                        // Reno's rod / nightsticks held up
    gun: { arm: [-0.3, -0.55] },                            // handguns and the shotgun held low, pointing down and ahead
    shotgun: { arm: [-0.25, -0.5] },
  });
  C3.GRIP.nightstick = C3.GRIP.rod;
  WEAPON.whip = (mb, s) => { mb.loft([{ y: 0.04 * s, rx: 0.01 * s, rz: 0.01 * s }, { y: -0.08 * s, rx: 0.01 * s, rz: 0.01 * s }], { sides: 6, color: '#3a2a20' }); mb.sweep([[0, -0.08 * s, 0], [0.05 * s, -0.25 * s, 0.05 * s], [0.02 * s, -0.4 * s, 0.12 * s], [-0.05 * s, -0.5 * s, 0.1 * s]], [0.006 * s, 0.005 * s, 0.004 * s, 0], { sides: 4, color: '#5a3a24' }); };

  // ================================================================== presets
  const set = (id, o) => { P[id] = o; return o; };
  C3.setPreset = set;
  // ---- party
  set('cloud', { skin: '#f6caa2', hair: '#f2c23a', hairStyle: 'cloud', eyes: '#3c88d8', face: { brow: 2.2, slant: 1.3, browW: 1.5 },
    top: '#7462aa', sleeve: 'skin', bottom: '#6a58a2', pants: 'baggy', boots: '#8a6232', gloves: '#46464e', wristband: '#46464e',
    belt: '#6a2414', beltH: 0.2, buckle: '#b8a868', strapColor: '#5c2414', straps: '#5c2414', zipper: '#5a4c8a', pauldron: '#56566a', bracerL: '#6a6a74',
    extras: ['pauldronL', 'belt', 'bracerL', 'cloudStance'], weapon: 'buster',
    // battle proportions from the PS1 battle model (references/battle models): long legs, a short torso, long arms.
    // weaponGrip: the sword held two-handed in the lunge (cloudStance), blade forward and up; every sword he equips
    // (weapons_cloud.js) uses it
    weaponGrip: { dir: [-0.433, 0.899, 0.07], roll: 0.73 },
    styleOver: { battle: { top: '#3c3468', bottom: '#352c5c', zipper: '#28224a', armScale: 1.18, shoulderScale: 1.06, belt: '#6a3a1a', beltH: 0.14,
      legScale: 1.3, bootScale: 1.3, footScale: 1.35, bootTop: 0.34, props: { battle: { torso: 0.21, upper: 0.19, fore: 0.165, thighR: 0.062, shinR: 0.043 } } } } });
  set('zack', { skin: '#eab892', hair: '#16161c', hairStyle: 'zack', eyes: '#3c88d8', face: { brow: 2, slant: 1, mouth: 'smile' },
    top: '#4a3a7a', sleeve: 'skin', bottom: '#4a3a7a', pants: 'baggy', boots: '#6a4a24', gloves: '#2a2a30', wristband: '#2a2a30',
    belt: '#5a2616', buckle: '#b8a868', straps: '#3a2418', pauldron: '#56566a', extras: ['pauldronL', 'pauldronR', 'belt', 'busterback', 'xscar'], weapon: 'buster' });
  set('barret', { skin: '#6e4630', hair: '#1a1410', hairStyle: 'barret', eyes: '#3a2418', build: 'big', face: { brow: 3.4, browW: 2.6, slant: 2.2, eyeH: 2.6, eyeW: 5.4, lid: 2.6 }, headWide: 1.12, jaw: 1.0, headSq: 3, headScale: 1.2, legScale: 0.8, armScale: 1.15,
    props: { field: { shoulderX: 0.16, torso: 0.23, upper: 0.2, fore: 0.19, neck: 0.012 }, battle: { chestRX: 0.136, chestRZ: 0.102, waistRX: 0.096, waistRZ: 0.076, torso: 0.27, neck: 0.008, armR: 0.033, foreR: 0.031 } }, bootTop: 0.7,
    top: '#7a5a40', vestColor: '#7a5a40', furColor: '#b8986e', sleeve: 'skin', bottom: '#5a6228', pants: 'knee', bandColor: '#a4a4aa', vestOpen: 30,
    styleOver: { field: { fieldScale: 1.15, headScale: 1.08, headWide: 1.0, legScale: 1.0, handScale: 1.25, fist: [1.5, 0.75, 1.4], footScale: 1.35, gunScale: 1.1, gunLen: 1.25, barrelLen: 0.12, furColor: '#86684e', vestColor: '#7a5e46', gunColor: '#767a82', bracerL: '#767a82', bandColor: '#86888e', boots: '#5e3c22' },
      battle: { pants: 'baggy', bottom: '#4e5a24', vestColor: '#a88050', top: '#a88050', furColor: '#e8dcc0', bandColor: '#9a9ca2', boots: '#8a4a1e', gloves: '#3a3a44', legScale: 0.9, armScale: 1.5, shoulderScale: 1.04, bootTop: 0.45, bootScale: 1.35, footScale: 1.25 } },
    boots: '#7a4a24', gloves: '#6e4630', belt: '#24242a', beltH: 0.1, buckle: '#d0b040',
    open: { c: '#6e4630', w: 0.42, wb: 0.32, y0: 0.28 }, extras: ['barretVest', 'gunarmR', 'belt', 'beard', 'barretBracer'], beardColor: '#1a1210', bracerL: '#8a8a90', weapon: 'gunarm' });
  set('tifa', { skin: '#f8d8c0', hair: '#2a1a14', hairStyle: 'tifa', eyes: '#6a2a20', female: true, face: { brow: -0.8 },
    top: '#f0f0ee', midriff: 0.24, sleeve: 'skin', bottom: '#1c1c20', skirt: 'short', skirtLen: 0.5, skirtColor: '#1c1c20', legs: 'skin',
    boots: '#8a1c22', bootTop: 0.55, bootCuff: '#6a1418', gloves: '#8a1c22', forearm: '#1c1c1c', wristband: '#8a1c22', straps: '#241a18', strapW: 0.07,
    bracerL: '#141416', bracerTop: 0.12, extras: ['bracerL'], weapon: 'fist',
    props: { field: { neck: 0.036 } },
    styleOver: { field: { fieldScale: 0.94, straps: null, headScale: 1.1, handScale: 1.45, footScale: 1.5, bootTop: 0.3, skirtFlare: 1.18 }, battle: { bootTop: 0.58 } } });
  set('aeris', { skin: '#f8d8c0', hair: '#8a5228', hairStyle: 'aeris', eyes: '#3c9a6a', female: true, face: { brow: -1.0, mouth: 'smile' },
    top: '#f0a6c0', sleeve: 'skin', jacket: '#c42a2a', cuffColor: '#70c8d8', bottom: '#f0a6c0', skirt: 'long', skirtColor: '#f0a6c0', skirtLen: 0.95, legs: '#f0a6c0', boots: '#6a4028',
    vneck: { c: '#f8d8c0', w: 0.2, depth: 0.2 }, extras: ['bolero', 'bangles'], ribbon: '#f07aa8', weapon: 'staff', skirtFlare: 1.25, bangleColor: '#e8a820',
    styleOver: { field: { fieldScale: 0.9, ribbon: '#f098b0', fist: [1.6, 1, 1.4], footScale: 1.55, skirtFlare: 1.1 }, battle: { skirtFlare: 1.45, top: '#ec8a94', bottom: '#ec8a94', skirtColor: '#ec8a94', legs: '#ec8a94' } } });
  set('yuffie', { skin: '#f6d4b4', hair: '#221a18', hairStyle: 'yuffie', eyes: '#4a3024', female: true, build: 'slim', face: { mouth: 'smile', brow: -0.3 },
    top: '#2e5a34', midriff: 0.3, sleeve: 'skin', bottom: '#d8cca4', pants: 'shorts', legs: 'skin', boots: '#e8901c', bootTop: 0.12, socks: '#ecebe4', bandColor: '#c8c8cc', bandY: 0.74, bandScale: 1.22,
    extras: ['headband', 'turtleneck', 'yuffieGuard'], weapon: 'shuriken', props: { field: { torso: 0.19 } },
    styleOver: { battle: { top: '#1c2a20' }, field: { fieldScale: 0.96, headScale: 1.12, legScale: 0.84, bandY: 0.48, bandW: 0.15, bandScale: 1.42, bandBack: true, tailsDown: true, top: '#28502e', fist: [1.4, 0.9, 1.3], footScale: 1.3, bottom: '#cac6b6', guardScale: 1.5 } } });
  set('vincent', { skin: '#f4e2da', hair: '#141418', hairStyle: 'vincent', eyes: '#c82020', face: { brow: 1.6, slant: 1.2, mouth: 'none' }, top: '#1c1c22', sleeve: '#1c1c22', bottom: '#1c1c22', pants: 'tight',
    boots: '#8a5a2a', bootsTall: true, toeColor: '#a8783a', toePoint: 0.55, gloves: '#2a2a30', styleOver: { battle: { boots: '#6e6e78', shoeColor: '#c88a30', toeColor: '#d8a030', pants: 'baggy' } }, capeColor: '#a01820', bandColor2: '#b01c20', bandY: 0.66, bandW: 0.16, bandScale: 1.27, extras: ['cape', 'redband', 'clawL', 'belt', 'vincentClaw'], belt: '#48484e', buckle: '#d8d8e0', weapon: 'gun' });
  P.vincent.styleOver.field = { fieldScale: 1.08, bandScale: 1.13, capeLen: 0.95, capeFlare: 0.4, capeJag: 0.04, capeShoulder: 0.86, capeColor: '#8a1418', fist: [1.4, 0.9, 1.3], footScale: 1.2 };
  set('cid', { skin: '#f0c49c', hair: '#d4c690', hairStyle: 'cid', eyes: '#3a70c8', face: { brow: 2, slant: 1 }, top: '#e8e8e4', jacket: '#2c3c5e', sleeve: '#2c3c5e', sleeveRoll: '#e0e0dc', bottom: '#3e3a2c', pants: 'baggy',
    boots: '#5a3a26', gloves: '#8a4a30', longGloves: true, forearm: '#8a4a30', belt: '#3a2818', extras: ['goggles', 'jacket', 'scarf', 'belt', 'stubble', 'cigarette'], scarfColor: '#e8e8e4', scarfTailLen: 0.6, jacketSleeveLen: 0.7, jacketHem: 0.2, weapon: 'spear',
    props: { field: { neck: 0.034 } }, styleOver: { battle: { build: 'tall' }, field: { headScale: 1.14, goggleY: 0.68, goggleScale: 1.12, goggleStrap: '#4a2a1c', goggleFrame: '#6a6e74', goggleLens: '#8aa4b0', top: '#c4c4be', armScale: 1.25, shoulderScale: 1.1, fist: [1.5, 0.9, 1.35], handScale: 1.15, footScale: 1.45, bootTop: 0.24, jacketHem: 0.36, scarfTailLen: 0.3, scarfColor: '#b8b8b4' } } });   // wiry and long-legged in battle (cidref)
  set('sephiroth', { skin: '#f4e2d4', hair: '#dcdce6', hairStyle: 'sephiroth', eyes: '#3ac0a0', face: { brow: 1.2, slant: 1.4 }, build: 'tall',
    top: '#1e1e26', sleeve: '#1e1e26', bottom: '#1e1e26', pants: 'tight', boots: '#1e1e26', bootsTall: true, bootCuff: '#9a9aa8', gloves: '#1e1e26', wristband: '#8a8a98',
    pauldron: '#b4b4c4', coatColor: '#1e1e26', open: { c: '#f4e2d4', w: 0.3, wb: 0.12, y0: 0.2 }, torso: (P, a) => { P.line(-0.28, 0.9, 0.2, 0.3, 2, '#4a4a54'); P.line(0.28, 0.9, -0.2, 0.3, 2, '#4a4a54'); },
    extras: ['pauldronL', 'pauldronR', 'coat', 'belt', 'sephCollar'], belt: '#2a2a32', buckle: '#8a8a98', coatOpen: 18, weapon: 'masamune' });
  // ---- Shinra
  const infantry = (P0, a) => {};
  set('young_cloud', { skin: '#f6caa2', hair: '#f2c23a', hairStyle: 'shinraHelmet', helmetColor: '#3a5a9a', eyes: '#3c88d8', top: '#3a5a9a', sleeve: '#3a5a9a', bottom: '#3a5a9a', pants: 'baggy',
    boots: '#1e1e24', bootsTall: true, gloves: '#1e1e24', belt: '#1e1e24', straps: '#1e1e24', pauldron: '#9a9ca6', pauldronScale: 0.72, pauldronSq: 4, extras: ['infantryMask', 'belt', 'pauldronL', 'pauldronR'], weapon: 'rifle' });
  set('soldier', { skin: '#f0c49c', hair: '#3a5a8a', hairStyle: 'shinraHelmet', helmetColor: '#3a5a9a', top: '#3a5a9a', sleeve: '#3a5a9a', bottom: '#3a5a9a', pants: 'baggy', boots: '#1e1e24', bootsTall: true,
    gloves: '#1e1e24', belt: '#1e1e24', straps: '#1e1e24', pauldron: '#9a9ca6', pauldronScale: 0.72, pauldronSq: 4, extras: ['infantryMask', 'belt', 'pauldronL', 'pauldronR'], weapon: 'rifle' });
  set('soldier_red', Object.assign({}, P.soldier, { helmetColor: '#8a2a2a', top: '#8a2a2a', sleeve: '#8a2a2a', bottom: '#8a2a2a', pauldron: '#b89898' }));
  // Shinra MP, the first enemy (01-midgar_005, Bestiary): pale steel-blue uniform, white shoulder pads, round blue
  // visored helmet over a yellow face guard, dark blue collar, gold knee pads, submachine gun
  set('mp', { skin: '#f0c49c', hair: '#2a2a30', hairStyle: 'mpHelmet', helmetColor: '#3a74b4', top: '#80b4c8', sleeve: '#80b4c8', bottom: '#80b4c8', pants: 'baggy', boots: '#1e2230', bootsTall: true, bootCuff: '#c8a030',
    gloves: '#7a5a3c', belt: '#2a3a6a', buckle: '#c8a030', pauldron: '#e8eef2', kneeColor: '#c8a030', extras: ['belt', 'mpMask', 'pauldronL', 'pauldronR', 'kneepads'], weapon: 'smg',
    torso: (Pt) => { Pt.band(0.88, 1.0, '#2a3a7a'); Pt.poly([[-0.34, 1.0], [-0.16, 1.0], [0.3, 0.12], [0.14, 0.12]], '#2a3a7a'); } });
  set('soldier1st', { skin: '#f0c49c', hair: '#16161c', hairStyle: 'zack', eyes: '#3c88d8', top: '#4a3a7a', sleeve: 'skin', bottom: '#4a3a7a', pants: 'baggy', boots: '#6a4a24', gloves: '#2a2a30', wristband: '#2a2a30', belt: '#5a2616', straps: '#3a2418', pauldron: '#56566a', extras: ['pauldronL', 'pauldronR', 'belt'], weapon: 'sword' });
  const suit = (o) => Object.assign({ skin: '#f0c49c', top: '#1e2a5e', sleeve: '#1e2a5e', bottom: '#1e2a5e', pants: 'tight', boots: '#141418', shoes: true, extras: ['suitShirt', 'tie'], tieColor: '#141418' }, o);
  C3.suit = suit;
  set('turk', suit({ hair: '#202020', hairStyle: 'slick', face: { brow: 2 } }));
  set('reno', suit({ hair: '#9a2018', hairStyle: 'reno', eyes: '#2aa0a0', top: '#23306e', sleeve: '#23306e', bottom: '#23306e', face: { mouth: 'smile', brow: 1.2, slant: 0.6 }, extras: ['suitShirt', 'goggles', 'shirtTails', 'renoMarks'], shirtDepth: 0.75, shirtW: 0.45, lapels: true, goggleFrame: '#d8d8e0', goggleLens: '#a0c8e0', boots: '#9a9aa4', weapon: 'rod' }));
  set('rude', suit({ weapon: 'fist', skin: '#8e5e40', hair: '#8e5e40', hairStyle: 'bald', build: 'big', top: '#23306e', sleeve: '#23306e', bottom: '#23306e', gloves: '#1a1a1a', extras: ['suitShirt', 'tie', 'shades', 'goatee', 'pocketSquare'], beardColor: '#2a1a10', face: { brow: false } }));
  set('tseng', suit({ skin: '#f2d4b4', hair: '#141418', hairStyle: 'tseng', eyes: '#3a2a20', face: { brow: 1.4, slant: 1.2 }, extras: ['suitShirt', 'tie', 'bindi'] }));
  set('elena', suit({ weapon: 'gun', skin: '#f8d8c0', hair: '#f0c860', hairStyle: 'elena', eyes: '#6a4a2a', female: true, top: '#23306e', sleeve: '#23306e', bottom: '#23306e', face: { brow: -0.4 }, gloves: '#1a1a1a' }));
  set('president', suit({ skin: '#f2c8a0', hair: '#d8c050', hairStyle: 'president', eyes: '#3a6ab0', top: '#8a1e24', sleeve: '#8a1e24', bottom: '#8a1e24', build: 'fat', face: { brow: 1.8, browW: 1.3 },
    extras: ['suitShirt', 'mustache', 'presidentButtons'], mustacheColor: '#d8c050', tieColor: '#6a6a90', shirt: '#e8e8f0', shirtDepth: 0.25, shirtW: 0.22, noTie: true }));
  set('rufus', { skin: '#f4d4b8', hair: '#e09c4c', styleOver: { field: { coatLen: -0.45 } }, hairStyle: 'rufus', eyes: '#4a6aa0', face: { brow: 1.4, slant: 1.2 }, top: '#e8e8f0', sleeve: '#e8e8f0', bottom: '#e8e8f0', pants: 'tight', boots: '#6a4028', shoes: true,
    gloves: '#1a1a1a', coatColor: '#e8e8f0', coatOpen: 6, coatLen: 0.9, neckColor: '#1c1c20', extras: ['coat', 'turtleneck', 'rufusCoat'], neckTop: '#1c1c20', buttons: '#1a1a1a', buttonX: 0.35, buttonN: 3, weapon: 'shotgun' });
  set('heidegger', { skin: '#f0c49c', hair: '#141414', hairStyle: 'heidegger', eyes: '#3a2a20', face: { brow: 3, browW: 2.2, slant: 1.6 }, top: '#2a5a30', sleeve: '#2a5a30', bottom: '#2a5a30', pants: 'baggy', boots: '#141414', bootsTall: true,
    build: 'fat', belt: '#141414', buckle: '#d0b040', beardColor: '#141414', beardLen: 0.42, beardW: 0.82, extras: ['beard', 'belt', 'heideggerTrim'], gloves: '#1a1a1a', torso: (P) => { P.poly([[-0.04, 1.01], [0.04, 1.01], [0.02, 0], [-0.02, 0]], '#d0b040'); P.band(0.9, 1.0, '#8a1a1a'); P.poly([[0.3, 0.7], [0.5, 0.7], [0.5, 0.5], [0.3, 0.5]], '#e8e8e8'); } });
  set('scarlet', { skin: '#f8d8c0', hair: '#e8d060', hairStyle: 'scarlet', eyes: '#3a5ab0', female: true, face: { mouth: 'open', lips: '#c02030', brow: -0.2, lashes: true }, top: '#a0182a', sleeve: 'skin', bottom: '#a0182a', skirt: 'long', skirtColor: '#a0182a', skirtLen: 0.95, skirtFlare: 1.3,
    boots: '#a0182a', shoes: true, heels: true, vneck: { c: '#f8d8c0', w: 0.4, depth: 0.45 }, extras: ['earrings', 'necklace'], earringColor: '#c02030' });
  set('hojo', { skin: '#d8c8a0', hair: '#1c1c1c', hairStyle: 'hojo', eyes: '#3a2a20', face: { brow: 1.2, mouth: 'line' }, top: '#ececf2', sleeve: '#ececf2', bottom: '#5a3a8a', pants: 'tight', boots: '#2a2a2e', shoes: true,
    coatColor: '#ececf2', coatLen: 0.75, coatOpen: 8, extras: ['glasses', 'labcoat', 'suitShirt', 'tie', 'collarUp'], shirt: '#3a8a78', shirtW: 0.24, shirtDepth: 0.55, tieColor: '#6a1a2a', glassColor: '#70e0e8', lensTint: [140, 230, 240, 150] });
  set('palmer', { skin: '#f0c8a0', hair: '#d8d8d8', hairStyle: 'palmer', eyes: '#3a2a20', top: '#b8862a', sleeve: '#b8862a', bottom: '#b8862a', pants: 'baggy', boots: '#6a3a20', shoes: true, build: 'fat', height: 'short', headScale: 1.15, styleOver: { battle: { legScale: 0.78, headScale: 1.3 } },
    extras: ['suitShirt', 'bowtie'], bowColor: '#f0d020', buttons: '#f0d020', buttonX: 0.18, buttonN: 2, shirtDepth: 0.3, shirtW: 0.2, face: { brow: 0.8, eyeH: 3.8 } });
  set('reeve', suit({ hair: '#1a1a1a', hairStyle: 'reeve', eyes: '#3a2a20', top: '#1e2a6a', sleeve: '#1e2a6a', bottom: '#1e2a6a', tieColor: '#b04020', face: { brow: 2.2, slant: 1.2 }, extras: ['suitShirt', 'tie', 'goatee', 'mustache'] }));
  set('scientist', { skin: '#f0c49c', hair: '#5a4030', hairStyle: 'parted', top: '#ececf0', sleeve: '#ececf0', bottom: '#404050', pants: 'tight', boots: '#202020', shoes: true, coatColor: '#ececf0', extras: ['glasses', 'labcoat', 'suitShirt', 'tie'], shirt: '#e0e0e8', tieColor: '#304070' });
  set('exec', suit({ hair: '#403020', hairStyle: 'parted', top: '#5a5a62', sleeve: '#5a5a62', bottom: '#5a5a62', tieColor: '#8a1a1a' }));
  set('receptionist', { skin: '#f8d8c0', hair: '#6a3a20', hairStyle: 'bob', female: true, top: '#3a4a7a', sleeve: '#3a4a7a', bottom: '#3a4a7a', skirt: 'short', skirtLen: 0.6, skirtColor: '#3a4a7a', legs: 'skin', boots: '#202020', shoes: true, heels: true, extras: ['suitShirt'], shirtDepth: 0.35 });
  // ---- AVALANCHE & slums
  set('jessie', { weapon: 'gun', skin: '#f6d0b0', hair: '#7a4020', hairStyle: 'jessie', eyes: '#6a4020', female: true, face: { mouth: 'smile' }, top: '#9aa0a8', sleeve: '#d8d8dc', bottom: '#8a7a3a', pants: 'baggy', boots: '#2a2018', gloves: '#6a4020',
    wristband: '#6a4020', bandColor2: '#c42020', bandTails: true, bandY: 0.74, extras: ['redband', 'vestArmor', 'belt', 'pauldronL', 'pauldronR'], armorColor: '#b8bcc4', pauldron: '#a8acb4', belt: '#5a3018', collarColor: '#2a3a8a' });
  set('biggs', { weapon: 'rifle', skin: '#f0c49c', hair: '#3a2414', hairStyle: 'biggs', eyes: '#4a3020', top: '#5e6e3a', sleeve: '#5e6e3a', shortSleeves: true, bottom: '#56663a', pants: 'baggy', boots: '#6a2a1a', bootTop: 0.6, bootCuff: '#8a8a92', gloves: '#7a2e20', wristband: '#7a2e20',
    bandColor2: '#c42020', bandTails: true, vestColor: '#4a5a2e', vestOpen: 26, extras: ['redband', 'vest', 'belt', 'beltPouches'], belt: '#7a3420', buckle: '#b0a070' });
  set('wedge', { weapon: 'smg', skin: '#f2c49c', hair: '#5a3820', hairStyle: 'bandana', capColor: '#c42020', eyes: '#4a3020', top: '#eee4a0', sleeve: '#eee4a0', shortSleeves: true, bottom: '#2a3e8a', pants: 'baggy', boots: '#6a2418', bootTop: 0.6, bootCuff: '#8a8a92', build: 'fat',
    extras: ['belt', 'pauldronL', 'pauldronR', 'beltPouches'], pouches: [-0.45, 0.45], belt: '#6a3418', buckle: '#b0a070', pauldron: '#9a9aa4', wristband: '#3a2a20', face: { brow: 1 } });
  set('marlene', { skin: '#f8d8c0', hair: '#5a3018', hairStyle: 'marlene', eyes: '#5a3a20', female: true, height: 'kid', face: { eyeW: 7.6, eyeH: 6.4 }, top: '#f070c8', sleeve: '#f070c8', shortSleeves: true, bottom: '#f070c8', skirt: 'short', skirtLen: 0.7, skirtColor: '#f070c8', legs: 'skin', socks: '#f0f0f0',
    boots: '#8a4a28', shoes: true, bowColor: '#f0d020', extras: ['bowtie'] });
  set('elmyra', { skin: '#f4d0b0', hair: '#6a3418', hairStyle: 'long', hairLen: 1.2, eyes: '#4a3020', female: true, top: '#c03a58', sleeve: '#c03a58', bottom: '#c03a58', skirt: 'long', skirtColor: '#c03a58', boots: '#402818', shoes: true, extras: ['elmyraSash'] });
  set('marle', { skin: '#f4d0b0', hair: '#6a4028', hairStyle: 'bun', eyes: '#4a3020', female: true, top: '#2e8a4a', sleeve: '#f0f0f0', shortSleeves: true, bottom: '#2e8a4a', skirt: 'long', skirtColor: '#2e8a4a', boots: '#402818', shoes: true, apronColor: '#f4f4f0', apronBib: true, apronLen: 1.4, extras: ['apron'] });
  set('corneo', { skin: '#f4d0b0', hair: '#f4d0b0', hairStyle: 'corneo', tuftColor: '#e8d020', eyes: '#4a3a20', face: { eyeH: 5, eyeW: 7, brow: 0.5, lashes: true, mouth: 'line' }, top: '#f0ece0', sleeve: '#b81e26', bottom: '#a8a8d8', pants: 'baggy', boots: '#402018', shoes: true, build: 'fat',
    headScale: 1.08, jaw: 0.95, extras: ['furcollar', 'corneoCoat', 'cigar', 'necklace'], furColor: '#f4f0e8', pendant: '#e0c040' });
  set('johnny', { skin: '#f0c49c', hair: '#c83a18', hairStyle: 'johnny', eyes: '#4a3020', face: { mouth: 'smile' }, top: '#2a4ab0', sleeve: '#e8f0f8', bottom: '#1a7a5a', pants: 'baggy', boots: '#6a1a1a', jacket: '#e8f0f8', jacketOpen: 26, extras: ['jacket', 'collarUp', 'belt'], collarUp: '#e8f0f8', belt: '#1a1a1a', buckle: '#e0c040' });
  set('bugenhagen', { skin: '#f0d0b0', hair: '#f0f0f0', hairStyle: 'bald', fringeTop: 0.55, height: 'kid', headScale: 1.05, top: '#5a3a8a', sleeve: '#5a3a8a', bottom: '#5a3a8a', boots: '#5a3a8a', shoes: true, robeColor: '#5a3a8a', robeLen: 1.1,
    extras: ['beard', 'robe', 'mustache', 'glasses', 'bugenhagenOrb'], beardColor: '#f0f0f0', beardLen: 0.85, beardW: 0.6, glassColor: '#5a5a64', lensTint: [220, 240, 240, 200], face: { brow: 0.5, browW: 1.8 }, torso: (P) => { P.poly([[-0.1, 1.01], [0.1, 1.01], [0.06, 0], [-0.06, 0]], '#d0a030'); } });
  set('dyne', { skin: '#d8a070', hair: '#3a2848', hairStyle: 'dyne', eyes: '#3a2a20', face: { brow: 2.6, slant: 1.6 }, styleOver: { battle: { top: '#d8a070' } }, top: '#e8e4dc', sleeve: 'skin', bottom: '#2e5a36', pants: 'baggy', boots: '#6a4a24', build: 'muscle',
    wristband: '#5a3a8a', belt: '#1a1a1a', buckle: '#d0b040', extras: ['gunarmL', 'stubble', 'dyneVest', 'necklace', 'belt'], gunColor: '#3a3e48', barrels: 1, barrelLen: 0.9, barrelColor: '#26282e', pendant: '#e0c040' });   // one long dark barrel for a forearm
  // Dio (Model Reference r8c4, the golden statue): tanned, hugely muscular, black topknot and drooping black
  // moustache, orange sash over red briefs, barefoot
  set('dio', { skin: '#b8663e', hair: '#141414', hairStyle: 'dio', eyes: '#2a1a10', build: 'big', headScale: 1.02, armScale: 1.18, shoulderScale: 1.1, jaw: 0.95, face: { brow: 2.4, browW: 2.2, eyeH: 3.6, slant: 1.4 },
    top: '#b8663e', sleeve: 'skin', bottom: '#b8663e', pelvisColor: '#b01818', boots: '#b8663e', bootTop: 0, handScale: 1.1, sashColor: '#f09018', moustache: 'droop', mustacheColor: '#141414',
    extras: ['sash', 'moustache3d'], torso: (Pt, a, S) => { const d = sh(S, -0.22); Pt.line(-0.62, 0.6, -0.04, 0.52, 2.2, d); Pt.line(0.62, 0.6, 0.04, 0.52, 2.2, d); Pt.line(0, 0.93, 0, 0.22, 1.4, d); Pt.line(-0.22, 0.4, 0.22, 0.4, 1.2, d); Pt.line(-0.2, 0.28, 0.2, 0.28, 1.2, d); },
    styleOver: { battle: { armScale: 1.12 } } });
  set('priscilla', { skin: '#f4c8a0', hair: '#8a4a20', hairStyle: 'priscilla', eyes: '#4a3020', female: true, height: 'kid', top: '#f0d030', midriff: 0.4, sleeve: 'skin', bottom: '#e85a20', skirt: 'short', skirtLen: 0.75, skirtColor: '#e85a20', legs: 'skin', boots: '#e0c040', shoes: true, sole: '#e0c040', torso: (P) => { P.poly([[-0.15, 0.8], [0.15, 0.8], [0, 0.55]], '#e85a20'); } });
  set('shera', { skin: '#f4d4b8', hair: '#7a4a28', hairStyle: 'shera', eyes: '#4a3020', female: true, top: '#e8d040', sleeve: '#f0f0f0', bottom: '#e8d040', pants: 'tight', boots: '#302018', shoes: true, coatColor: '#f0f0f0', coatLen: 0.6, coatOpen: 16, extras: ['glasses', 'labcoat', 'coatSleeves'], glassColor: '#3a3a42' });
  set('godo', { skin: '#f0c49c', hair: '#1a1a1a', hairStyle: 'godo', eyes: '#3a2a20', moustache: 'handlebar', moustacheScale: 1.2, face: { brow: 3, browW: 2.2, slant: 1.4 }, top: '#4a2a6a', sleeve: '#e8e8e8', bottom: '#4a2a6a', pants: 'baggy', boots: '#e0e0e0', shoes: true, build: 'big',
    extras: ['mustache', 'goatee', 'belt', 'haori'], belt: '#d8c8a0', buckle: '#d8c8a0', mustacheColor: '#1a1a1a', vneck: { c: '#e8e8e8', w: 0.3, depth: 0.4 } });
  set('gast', { skin: '#f0c49c', hair: '#6a4a2a', hairStyle: 'parted', eyes: '#3a2a20', top: '#ececf0', sleeve: '#ececf0', bottom: '#8a6a3a', pants: 'tight', boots: '#4a3020', shoes: true, coatColor: '#ececf0', extras: ['labcoat', 'mustache', 'suitShirt', 'tie'], shirt: '#6a4a2a', tieColor: '#2a2a2a', face: { brow: 1 } });
  set('ifalna', { skin: '#f8d8c0', hair: '#7a4020', hairStyle: 'ifalna', eyes: '#3c9a6a', female: true, face: { mouth: 'smile' }, top: '#d8e4f0', sleeve: '#d8e4f0', bottom: '#d8e4f0', skirt: 'long', skirtColor: '#d8e4f0', boots: '#806040', shoes: true });
  set('lucrecia', { skin: '#f8d8c0', hair: '#6a3a20', hairStyle: 'lucrecia', eyes: '#6a4020', female: true, top: '#f0f0f4', sleeve: '#f0f0f4', bottom: '#f0f0f4', skirt: 'long', skirtColor: '#f0f0f4', skirtFlare: 1.25, boots: '#1a1a1a', shoes: true, heels: true, extras: ['earrings', 'suitShirt', 'tie'], earringColor: '#c02020', shirt: '#f8f8f8', tieColor: '#e0c040', shirtDepth: 0.3 });
  // ---- generic townsfolk (numbered variants: 'man3', 'woman7'... see C3.variant / cast_npcs.js)
  set('man', { skin: '#f0c49c', hair: '#503018', hairStyle: 'short', top: '#c0402e', sleeve: '#c0402e', bottom: '#4a4a6a', boots: '#302018', shoes: true, collarColor: '#f0ece0' });
  set('woman', { skin: '#f6d4b6', hair: '#7a4020', hairStyle: 'ponytail', female: true, top: '#d0508a', sleeve: '#d0508a', bottom: '#d0508a', skirt: 'short', skirtLen: 0.95, skirtColor: '#d0508a', legs: 'skin', boots: '#402818', shoes: true, apronColor: '#f4f4f0', apronBib: true, apronLen: 1.0, extras: ['apron'] });
  set('kid', { skin: '#f6d4b6', hair: '#6a3a18', hairStyle: 'spiky', height: 'kid', top: '#f0f0f0', sleeve: '#f0f0f0', shortSleeves: true, bottom: '#2a3a8a', pants: 'shorts', legs: 'skin', boots: '#5a3018', shoes: true, collarColor: '#3a6ab0' });
  set('girl', { skin: '#f6d4b6', hair: '#8a3a20', hairStyle: 'pigtails', female: true, height: 'kid', top: '#f0f0f0', sleeve: '#f0f0f0', shortSleeves: true, bottom: '#d82a2a', skirt: 'short', skirtLen: 0.8, skirtColor: '#d82a2a', legs: 'skin', socks: '#f0f0f0', boots: '#8a2a1a', shoes: true });
  set('oldman', { skin: '#e8c0a0', hair: '#d8d8d8', hairStyle: 'bald', top: '#d8d4c0', sleeve: '#d8d4c0', bottom: '#3a4a3a', pants: 'baggy', boots: '#5a3a20', shoes: true, straps: '#3a4a3a', extras: ['mustache', 'tie'], tieColor: '#3a5a9a', face: { brow: 0.5 } });
  set('oldwoman', { skin: '#e8c0a0', hair: '#d8d8d8', hairStyle: 'bun', female: true, top: '#6a5a7a', sleeve: '#6a5a7a', bottom: '#6a5a7a', skirt: 'long', skirtColor: '#6a5a7a', boots: '#302018', shoes: true, apronColor: '#e8e0d0', extras: ['apron'] });
  set('worker', { skin: '#e0b088', hair: '#5a3a1a', hairStyle: 'helmet', helmetColor: '#e0a020', top: '#e8e8e0', sleeve: 'skin', bottom: '#4a5a30', pants: 'baggy', boots: '#3a2818', straps: '#4a5a30', extras: ['belt'], belt: '#3a2818' });
  set('bartender', { skin: '#f0c49c', hair: '#303030', hairStyle: 'slick', top: '#202020', sleeve: '#f0f0f0', bottom: '#202020', pants: 'tight', boots: '#101010', shoes: true, extras: ['suitShirt', 'bowtie'], bowColor: '#202020', vneck: { c: '#f0f0f0', w: 0.5, depth: 0.7 } });
  set('sailor', { skin: '#f0c49c', hair: '#5a3a1a', hairStyle: 'cap', capColor: '#f4f4f4', visorColor: '#1e2a6a', capBand: '#2a4aa0', top: '#f4f4f4', sleeve: '#f4f4f4', bottom: '#f4f4f4', pants: 'baggy', boots: '#3a2418', shoes: true, extras: ['sailorCollar'], collarColor: '#2a4aa0' });
  set('ninja', { skin: '#f0c49c', hair: '#202020', hairStyle: 'hood', hoodColor: '#2a2a3a', top: '#2a2a3a', sleeve: '#2a2a3a', bottom: '#2a2a3a', pants: 'baggy', boots: '#1a1a22', gloves: '#1a1a22', extras: ['mask', 'belt'], maskColor: '#2a2a3a', belt: '#8a2020', weapon: 'katana' });
  // the party and the flashback leads keep their hand-tuned field proportions (no townsfolk frame, humanoid.js)
  ['cloud', 'tifa', 'aeris', 'yuffie', 'vincent', 'cid', 'sephiroth', 'zack'].forEach(id => { P[id].fieldChibi = false; });
  set('cosmo_elder', { skin: '#d8905a', hair: '#e8e8e8', hairStyle: 'short', top: '#8a5a30', sleeve: '#8a5a30', bottom: '#e8e0c8', boots: '#6a4020', shoes: true, robeColor: '#e8e0c8', bandColor: '#c02020', extras: ['beard', 'robe', 'mustache', 'headband', 'necklace'], beardColor: '#e8e8e8', beardLen: 0.4, pendant: '#40a0e0', face: { eyes: 'narrow' } });
})();
