// Vehicle models (FF7 PS1 style): the world-map vehicles, field vehicles and big set pieces, built from
// vertex-coloured low-poly primitives (js/gl/meshkit.js + js/gl/models_lib.js) on FF7.Model bone rigs.
//   const m = FF7.vehicles3d.build('highwind');  m.play('move');   // FF7.vehicles3d.has(id), .list
// Every model is centred on the origin with its lowest point on the ground (y = 0), faces +z, and is
// sized in field units (a character is ~1.0 tall). Clips: 'idle' and 'move' on every model (+ extras
// below); moving parts are bones. Model extras: m.size [w, h, l] / m.bounds / m.height, m.steer
// (radians; turns steerable wheels/forks/banks while a clip plays), m.waterline (boats/subs: water height
// on the hull when afloat), m.seats (named rider anchor points in model space).
// Scale: small vehicles are at field scale (1 unit ~ 1.7 m, e.g. the Tiny Bronco 12.74 m -> 7.5 units);
// the Highwind, submarines, Gelnika, cargo ship, rocket and Sister Ray are compact world-map/set-piece
// sizes - m.realSize (metres, from the design sheets) and m.fieldScale (factor to true size next to a
// 1.0-tall character) are given where the sheets list dimensions.
//   id                 bones (moving parts)                          clips            opts
//   buggy              body, steerL/R, wheelFL/FR/RL/RR               idle move        (in-game red buggy)
//   sa27               body, steerL/R, wheelFL/FR/RL/RR               idle move        (silver Shin-Ra sA-27)
//   motorcycle         body, fork, wheelF, wheelR                     idle move
//   truck              body, wheelF (steers), wheelRL/RR              idle move        (Shin-Ra sA-37)
//   tiny_bronco        body, propL, propR                             idle move        boat
//   highwind           body, rotorL, rotorR, fan, prop                idle move
//   submarine_gray/red body, prop                                     idle move        (uV-02 / uV-01)
//   shinra_helicopter  body, rotor, tailRotor                         idle move        cargo (B1-beta)
//   gelnika            body, prop0..prop3                             idle move        sunken
//   rocket_26          pad, rocket, flame                             idle move launch upright
//   cargo_ship         hull, radar                                    idle move
//   ocean_liner        hull                                           idle move        (Kupomon's S.S. Moogle; m.door)
//   train              loco, rods, axleL0..4, car<n>, axleC<n>_0..3   idle move        cars (0-4)
//   mono_coaster       body, gun                                      idle move
//   snowboard          board                                          idle move
//   gondola            grip, car, pulleyF/B, propF/B                  idle move        (m.cableY, ropeX, wheelR)
//   sister_ray         turret, barrel, charge                         idle move fire
//   wagon              body, wheelFL/FR/RL/RR, chocobo (harness)      idle move        (m.harness.chocobo)
// Any model also takes opts.tint (hex: repaint toward that colour) and opts.wreck (true | rust hex: rusted,
// faded, lamps dead, sagging) - e.g. build('truck', { wreck: true }) for a burnt-out set piece.
// Aliases (world-map vehicle keys): bronco = tiny_bronco {boat}, submarine = submarine_gray, bike,
// helicopter, ship, rocket, coaster, gelnika_sunken, chocobo_wagon, carriage.
(function () {
  const U = FF7.util, V = FF7.V3, MB = FF7.MeshBuilder, sh = U.shade, mix = U.mix;
  const PI = Math.PI, TAU = PI * 2, S = Math.sin, C = Math.cos;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const meshOf = (fn, o) => { const mb = new MB(); fn(mb); return mb.build(o); };
  const LR = (fn) => { fn(1); fn(-1); };
  const area2 = (q) => { let a = 0; for (let i = 0; i < q.length; i++) { const p = q[i], r = q[(i + 1) % q.length]; a += p[0] * r[1] - r[0] * p[1]; } return a; };

  // ================================================================== mesh helpers
  // push a transform whose local +y runs from point a along direction d
  function along(mb, a, d) {
    const n = V.norm(d);
    mb.push(); mb.translate(a[0], a[1], a[2]);
    mb.rotate(0, Math.atan2(n[0], n[2]), 0); mb.rotate(Math.acos(clamp(n[1], -1, 1)), 0, 0);
  }
  // n-sided tube from a to b (radii r0 -> r1)
  function tube(mb, a, b, r0, r1, col, sides, caps) {
    const d = V.sub(b, a), L = V.len(d);
    if (L < 1e-6) return;
    along(mb, a, d);
    mb.prism(0, 0, 0, r0, r1 == null ? r0 : r1, L, sides || 6, col, true, caps !== false, caps !== false);
    mb.pop();
  }
  // tube through a polyline
  function pipe(mb, pts, r, col, sides) {
    for (let i = 0; i < pts.length - 1; i++) tube(mb, pts[i], pts[i + 1], r, r, col, sides || 5, false);
  }
  // Loft along +z: rings { z, rx, ry, x?, y?, ryT? (top radius), ryB? (bottom radius), sq?, color?, band? }.
  // opts = mb.loft opts + colorsFn(i, n, ringColour) (not applied to rings flagged `band`).
  function hull(mb, rings, opts = {}) {
    const cf = opts.colorsFn;
    mb.push(); mb.rotate(PI / 2, 0, 0);
    mb.loft(rings.map(r => ({ y: r.z, rx: r.rx, rz: r.ry, x: r.x || 0, z: -(r.y || 0), rzf: r.ryB, rzb: r.ryT, sq: r.sq, color: r.color,
      capColor: r.capColor, colors: r.colors ? r.colors : cf && !r.band ? ((i, n) => cf(i, n, r.color || opts.color)) : null })), opts);
    mb.pop();
  }
  // hull() rings from profile keys (ascending z: { z, rx, ry, y?, x?, sq? }) with dark rib bands at the
  // given z positions (band width bw) - the riveted hull plating of the Highwind, trains, subs ...
  function bandRings(keys, bands, base, bandCol, bw) {
    const w = bw || 0.04;
    const at = (z) => {
      let i = 0; while (i < keys.length - 2 && keys[i + 1].z < z) i++;
      const a = keys[i], b = keys[i + 1], t = clamp((z - a.z) / ((b.z - a.z) || 1), 0, 1), L = (k, d) => (a[k] != null ? a[k] : d) + ((b[k] != null ? b[k] : d) - (a[k] != null ? a[k] : d)) * t;
      return { z, rx: L('rx', 0), ry: L('ry', 0), y: L('y', 0), x: L('x', 0), sq: a.sq || b.sq, ryT: a.ryT != null ? L('ryT', 0) : undefined, ryB: a.ryB != null ? L('ryB', 0) : undefined };
    };
    const out = keys.map(k => Object.assign({}, k, { color: k.color || base }));
    bands.forEach(zb => { out.push(Object.assign(at(zb - w / 2), { color: bandCol, band: true })); out.push(Object.assign(at(zb + w / 2), { color: base })); });
    out.sort((a, b) => a.z - b.z);
    return out;
  }
  // hull() ring colour function: faces on one flank (side s = +1 model's left / -1 right) between the
  // heights lo..hi (-1 bottom .. 1 top) get colour c (markings, name plates), others the ring colour rc
  const flank = (s, c, rc, lo, hi) => (i, n) => { const a = PI / n + (i + 0.5) * TAU / n, cx = C(a) * s, cy = -S(a); return cx > 0.35 && cy > (lo != null ? lo : -0.5) && cy < (hi != null ? hi : 0.6) ? c : rc; };
  // hull() face colouring by facing: top faces `top`, bottom faces `bot`, the rest keep the ring colour
  const byFace = (top, bot, lim = 0.55) => (i, n, rc) => { const s = S(PI / n + (i + 0.5) * TAU / n); return s < -lim ? (top || rc) : s > lim ? (bot || rc) : rc; };
  // Loft through polygon cross-sections: secs [{ z, pts: [[x, y], ...] }] (same point count, CCW seen
  // from the front). col: colour | fn(k, i) for the face between section k..k+1 and edge i..i+1.
  // opts: { capFront, capBack (fans; true by default), capCol, smooth }
  function secLoft(mb, secs, col, opts = {}) {
    const n = secs[0].pts.length;
    const P = secs.map(s => s.pts.map(p => [p[0], p[1], s.z]));
    const up = secs[secs.length - 1].z > secs[0].z;                   // sections run towards +z
    const out = (area2(secs[0].pts) > 0) === up;                       // quad order below faces outward
    const cf = (k, i) => typeof col === 'function' ? col(k, i) : col;
    const Q = (a, b, c, d, cc, nn) => out ? mb.quad(a, b, c, d, cc, null, nn) : mb.quad(d, c, b, a, cc, null, nn ? [nn[3], nn[2], nn[1], nn[0]] : null);
    let NR = null;
    if (opts.smooth) {
      NR = P.map(r => r.map(() => [0, 0, 0]));
      for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < n; i++) {
        const i2 = (i + 1) % n; let fn = V.cross(V.sub(P[k][i2], P[k][i]), V.sub(P[k + 1][i2], P[k][i]));
        if (!out) fn = V.scale(fn, -1);
        [[k, i], [k, i2], [k + 1, i], [k + 1, i2]].forEach(([a, b]) => { NR[a][b] = V.add(NR[a][b], fn); });
      }
      NR = NR.map(r => r.map(v => V.norm(v)));
    }
    for (let k = 0; k < P.length - 1; k++) for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      Q(P[k][i], P[k][i2], P[k + 1][i2], P[k + 1][i], cf(k, i), NR ? [NR[k][i], NR[k][i2], NR[k + 1][i2], NR[k + 1][i]] : null);
    }
    const cc = opts.capCol || cf(0, 0);
    const hi = up ? P.length - 1 : 0, lo = up ? 0 : P.length - 1;       // front (max z) / back ends
    const ccw = area2(secs[0].pts) > 0;
    const T = (a, b, c, col2, front) => (ccw === front) ? mb.tri(a, b, c, col2) : mb.tri(a, c, b, col2);
    if (opts.capFront !== false) for (let i = 1; i < n - 1; i++) T(P[hi][0], P[hi][i], P[hi][i + 1], opts.capFrontCol || cc, true);
    if (opts.capBack !== false) for (let i = 1; i < n - 1; i++) T(P[lo][0], P[lo][i], P[lo][i + 1], opts.capBackCol || cc, false);
  }
  // rounded-rectangle cross-section (for secLoft): half width w, bottom yb, top yt, chamfers cb/ct,
  // extra split heights on the sides (for stripes / window bands). Edge order: bottom-right chamfer,
  // right side pieces (bottom -> top), top-right chamfer, top, top-left chamfer, left side pieces
  // (top -> bottom), bottom-left chamfer, bottom.
  function rrect(w, yb, yt, cb, ct, splits) {
    const sp = (splits || []).map(y => clamp(y, yb + cb + 1e-4, yt - ct - 1e-4));
    const R = [[w - cb, yb], [w, yb + cb], ...sp.map(y => [w, y]), [w, yt - ct], [w - ct, yt]];
    const Lf = R.slice().reverse().map(p => [-p[0], p[1]]);
    return R.concat(Lf);
  }
  // horizontal plate: convex polygon [[x, z], ...] from y0 to y1
  function slab(mb, pts, y0, y1, top, bot, side) {
    let q = pts;
    if (area2(q) > 0) q = q.slice().reverse();
    const n = q.length;
    for (let i = 0; i < n; i++) {
      const a = q[i], b = q[(i + 1) % n];
      mb.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], side || top);
    }
    for (let i = 1; i < n - 1; i++) {
      mb.tri([q[0][0], y1, q[0][1]], [q[i][0], y1, q[i][1]], [q[i + 1][0], y1, q[i + 1][1]], top);
      mb.tri([q[0][0], y0, q[0][1]], [q[i + 1][0], y0, q[i + 1][1]], [q[i][0], y0, q[i][1]], bot || top);
    }
  }
  // vertical plate in the YZ plane (fins, rudders, side panels): convex polygon [[z, y], ...] at x, thickness t
  function fin(mb, pts, x, t, col, col2) {
    let q = pts.map(p => [-p[0], p[1]]);
    if (area2(q) < 0) q = q.reverse();
    mb.push(); mb.translate(x, 0, 0); mb.rotate(0, PI / 2, 0); mb.panel(q, 0, t, col, col2); mb.pop();
  }
  // vertical plate in the XY plane (bulkheads, grilles): convex polygon [[x, y], ...] at z, thickness t
  function plate(mb, pts, z, t, col, col2) {
    let q = pts;
    if (area2(q) < 0) q = q.slice().reverse();
    mb.panel(q, z, t, col, col2);
  }
  // wheel centred on the origin, axle along x: rounded tyre + hub discs + bolts (so spinning reads)
  function wheel(mb, r, w, tyre, hub, o = {}) {
    const n = o.sides || 10, hr = o.hubR || r * 0.58, d = Math.max(0.008, w * 0.06);
    mb.push(); mb.rotate(0, 0, PI / 2);
    if (o.flat) {   // cheap disc wheel (trains, small wheels): prism + hub square + spoke dots
      mb.prism(0, -w / 2, 0, r, r, w, n, tyre, true);
      [1, -1].forEach(s => { const y0 = s * (w / 2 + 0.003); dot(mb, [0, y0, 0], [0, s, 0], hr * 1.3, hub); for (let k = 0; k < (o.bolts || 0); k++) { const a = k / o.bolts * TAU; dot(mb, [C(a) * hr * 0.75, y0 + s * 0.002, S(a) * hr * 0.75], [0, s, 0], hr * 0.35, o.boltCol || sh(hub, -0.4)); } });
      mb.pop(); return;
    }
    const tc = sh(tyre, -0.15);
    mb.loft([{ y: -w / 2, rx: r * 0.86, rz: r * 0.86, capColor: tc }, { y: -w * 0.3, rx: r, rz: r }, { y: w * 0.3, rx: r, rz: r }, { y: w / 2, rx: r * 0.86, rz: r * 0.86, capColor: tc }], { sides: n, color: tyre });
    const sides = o.oneSide ? [1] : [1, -1];
    sides.forEach(s => {
      const y0 = s > 0 ? w / 2 : -w / 2;
      if (s > 0) mb.prism(0, y0, 0, hr, hr * 0.78, d, n, hub, false, true, false);
      else mb.prism(0, y0 - d, 0, hr * 0.78, hr, d, n, hub, false, false, true);
      if (o.rim) { const rr = hr * 1.12; for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU; const yy = y0 + s * 0.002; const p = (a, rad) => [C(a) * rad, yy, S(a) * rad]; if (s > 0) mb.quad(p(a0, hr), p(a1, hr), p(a1, rr), p(a0, rr), o.rim); else mb.quad(p(a0, rr), p(a1, rr), p(a1, hr), p(a0, hr), o.rim); } }
      const nb = o.bolts || 4, bc = o.boltCol || sh(hub, -0.45);
      for (let k = 0; k < nb; k++) {
        const a = k / nb * TAU + 0.3;
        dot(mb, [C(a) * hr * 0.52, y0 + s * (d + 0.002), S(a) * hr * 0.52], [0, s, 0], hr * 0.24, bc);
      }
      dot(mb, [0, y0 + s * (d + 0.003), 0], [0, s, 0], hr * 0.32, o.cap || sh(hub, 0.25));
    });
    mb.pop();
  }
  // propeller in the XY plane spinning about +z: nb blades of radius r; optional spinner cone
  function propeller(mb, nb, r, chord, col, hubCol, o = {}) {
    const hr = o.hubR || r * 0.14, th = o.thick || chord * 0.2, pitch = o.pitch != null ? o.pitch : 0.4;
    const r0 = hr * 0.5, L = r - r0;
    for (let k = 0; k < nb; k++) {
      mb.push(); mb.rotate(0, 0, (k / nb) * TAU + (o.phase || 0)); mb.rotate(0, pitch, 0);
      if (o.simple) { mb.frustum(0, r0, 0, chord * 0.7, th, chord * 0.8, th * 0.6, L, col); mb.pop(); continue; }
      mb.frustum(0, r0, 0, chord * 0.55, th, chord, th * 0.8, L * 0.55, col);
      mb.frustum(0, r0 + L * 0.55, 0, chord, th * 0.8, chord * 0.6, th * 0.5, L * 0.45, col, null);
      if (o.tip) mb.frustum(0, r - L * 0.12, 0, chord * 0.66, th * 0.62, chord * 0.6, th * 0.52, L * 0.12, o.tip);
      mb.pop();
    }
    if (hubCol) { mb.push(); mb.rotate(PI / 2, 0, 0); mb.prism(0, -hr * 0.9, 0, hr, 0, hr * (o.spinLen || 2.6), 8, hubCol, true); mb.pop(); }
  }
  // horizontal rotor spinning about +y: nb blades of radius r lying in the XZ plane
  function rotor(mb, nb, r, chord, col, hubCol, o = {}) {
    const th = o.thick || chord * 0.18, hr = o.hubR || r * 0.08;
    for (let k = 0; k < nb; k++) {
      mb.push(); mb.rotate(0, (k / nb) * TAU + (o.phase || 0), 0); mb.rotate(0, 0, -PI / 2 + (o.droop || 0)); mb.rotate(0, o.pitch || 0.12, 0);
      mb.frustum(0, hr * 0.5, 0, th, chord, th * 0.7, chord * (o.taper || 0.8), r - hr * 0.5, col);
      if (o.tip) mb.frustum(0, r - 0.001, 0, th * 0.7, chord * (o.taper || 0.8), th * 0.7, chord * (o.taper || 0.8), 0.001, o.tip);
      mb.pop();
    }
    if (hubCol) mb.prism(0, -th, 0, hr, hr * 0.7, th * 3, 6, hubCol, true, true, false);
  }
  // arc band (fenders, mudguards): centre (cy, cz) in the side plane at x, radius R, angles a0..a1
  // measured from +z towards +y, band width w (along x), thickness t
  function arcBand(mb, x, cy, cz, R, a0, a1, w, t, col, segs) {
    const n = segs || 7;
    const pts = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([x, cy + S(a) * R, cz + C(a) * R]); }
    const pin = pts.map(p => { const dy = p[1] - cy, dz = p[2] - cz, l = Math.hypot(dy, dz) || 1; return [p[0], cy + dy * (R - t) / l, cz + dz * (R - t) / l]; });
    for (let i = 0; i < n; i++) {
      const o0 = pts[i], o1 = pts[i + 1], i0 = pin[i], i1 = pin[i + 1];
      const xo = (p, s) => [p[0] + s * w / 2, p[1], p[2]];
      mb.quad(xo(o0, 1), xo(o1, 1), xo(o1, -1), xo(o0, -1), col);        // outer surface
      mb.quad(xo(i0, -1), xo(i1, -1), xo(i1, 1), xo(i0, 1), sh(col, -0.35)); // inner
      mb.quad(xo(i0, 1), xo(i1, 1), xo(o1, 1), xo(o0, 1), sh(col, -0.1));  // side +x
      mb.quad(xo(o0, -1), xo(o1, -1), xo(i1, -1), xo(i0, -1), sh(col, -0.1)); // side -x
    }
  }
  // square lattice tower (gantries, masts): footprint w x w centred at (x, z), from y0 to y1
  // braces: which faces get diagonal braces (0: +x, 1: -z, 2: -x, 3: +z)
  function lattice(mb, x, z, w, y0, y1, levels, col, r, braces) {
    const h = (y1 - y0) / levels, rr = r || w * 0.06, c = [[1, 1], [1, -1], [-1, -1], [-1, 1]], br = braces || [0, 1, 2, 3];
    c.forEach(([a, b]) => tube(mb, [x + a * w / 2, y0, z + b * w / 2], [x + a * w / 2, y1, z + b * w / 2], rr, rr, col, 4, false));
    for (let l = 1; l <= levels; l++) {
      const y = y0 + l * h;
      for (let k = 0; k < 4; k++) { const p = c[k], q = c[(k + 1) % 4]; tube(mb, [x + p[0] * w / 2, y, z + p[1] * w / 2], [x + q[0] * w / 2, y, z + q[1] * w / 2], rr * 0.7, rr * 0.7, col, 3, false); }
    }
    for (let l = 0; l < levels; l++) br.forEach(k => { const p = c[k], q = c[(k + 1) % 4], f = l % 2, y = y0 + l * h; tube(mb, [x + p[0] * w / 2, y + (f ? h : 0), z + p[1] * w / 2], [x + q[0] * w / 2, y + (f ? 0 : h), z + q[1] * w / 2], rr * 0.55, rr * 0.55, col, 3, false); });
  }
  // round lamp facing +z (chrome housing + unlit lens drawn by a second mesh: see lampLens)
  function lampHousing(mb, x, y, z, r, col, depth, sides) {
    mb.push(); mb.translate(x, y, z); mb.rotate(PI / 2, 0, 0);
    mb.prism(0, -(depth || r), 0, r * 0.8, r, depth || r, sides || 8, col, true, true, false);
    mb.pop();
  }
  function lampLens(mb, x, y, z, r, col, sides) {
    mb.push(); mb.translate(x, y, z + 0.002); mb.rotate(PI / 2, 0, 0);
    mb.prism(0, 0, 0, r * 0.86, r * 0.5, r * 0.25, sides || 6, col, false, true, false);
    mb.pop();
  }

  // flat square facing direction nrm (bolts, rivets, lamps, decals): 2 triangles
  function dot(mb, c, nrm, size, col, size2) {
    const n = V.norm(nrm), ref = Math.abs(n[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
    const u = V.scale(V.norm(V.cross(ref, n)), size / 2), v = V.scale(V.norm(V.cross(n, V.norm(V.cross(ref, n)))), (size2 || size) / 2);
    const P = (a, b) => V.add(c, V.add(V.scale(u, a), V.scale(v, b)));
    mb.quad(P(-1, -1), P(1, -1), P(1, 1), P(-1, 1), col);
  }
  // cheap chamfered box (vertical edges bevelled): 28 triangles
  function cbox(mb, x, y, z, w, h, d, col, ch) {
    const c = Math.min(w, d) * (ch || 0.18), hw = w / 2, hd = d / 2;
    const pts = [[hw - c, -hd], [hw, -hd + c], [hw, hd - c], [hw - c, hd], [-hw + c, hd], [-hw, hd - c], [-hw, -hd + c], [-hw + c, -hd]].map(p => [x + p[0], z + p[1]]);
    slab(mb, pts, y - h / 2, y + h / 2, col, sh(col, -0.2), col);
  }

  // Blotchy camouflage (per triangle, PS1 style): recolours the triangles added to mb since vertex index
  // v0 (mb.vertexCount before building the part). base = the colour the part was built with; cols =
  // [blotch colour, second blotch colour?]; sc = blotch frequency (per unit), seed shifts the pattern.
  function camo(mb, v0, base, cols, sc, seed) {
    const b = FF7.glColor(base), c1 = FF7.glColor(cols[0]), c2 = cols[1] ? FF7.glColor(cols[1]) : null, k = sc || 2, sd = seed || 0;
    for (let t = v0; t + 2 < mb.vertexCount; t += 3) {
      let x = 0, y = 0, z = 0;
      for (let j = 0; j < 3; j++) { x += mb.P[(t + j) * 3] / 3; y += mb.P[(t + j) * 3 + 1] / 3; z += mb.P[(t + j) * 3 + 2] / 3; }
      const n = S(x * k * 1.3 + sd + S(z * k * 0.7)) * S(z * k * 1.1 - sd * 0.5 + S(y * k * 1.7)) + 0.55 * S((x - z) * k * 0.9 + y * k * 1.2 + sd * 2);
      const c = n > 0.5 ? c1 : (c2 && n < -0.7) ? c2 : null;
      if (!c) continue;
      for (let j = 0; j < 3; j++) for (let q = 0; q < 3; q++) { const i = (t + j) * 4 + q; mb.C[i] = mb.C[i] * c[q] / Math.max(0.05, b[q]); }
    }
  }
  // Wooden cart wheel (n-sided rim disc, dark inner disc, ns/2 crossing spokes, hub), axle along x
  function spokedWheel(mb, r, w, rim, spoke, dark, n, ns) {
    n = n || 8; ns = ns || 8;
    mb.push(); mb.rotate(0, 0, PI / 2);
    mb.prism(0, -w / 2, 0, r, r, w, n, rim, false);
    [1, -1].forEach(s => {
      const Pt = (a, rr, d) => [C(a) * rr, s * (w / 2 + d), S(a) * rr];
      const T = (a, b, c, col) => s > 0 ? mb.tri(a, c, b, col) : mb.tri(a, b, c, col);
      for (let k = 0; k < n; k++) { const a0 = k / n * TAU, a1 = (k + 1) / n * TAU; T([0, s * (w / 2 + 0.002), 0], Pt(a0, r * 0.78, 0.002), Pt(a1, r * 0.78, 0.002), dark); }
      for (let k = 0; k < ns / 2; k++) {
        const a = k * PI / (ns / 2), d = [C(a), S(a)], q = [-S(a), C(a)], hw = r * 0.06, R = r * 0.8, y = s * (w / 2 + 0.004);
        const A = [-d[0] * R - q[0] * hw, y, -d[1] * R - q[1] * hw], B = [d[0] * R - q[0] * hw, y, d[1] * R - q[1] * hw], Cc = [d[0] * R + q[0] * hw, y, d[1] * R + q[1] * hw], D = [-d[0] * R + q[0] * hw, y, -d[1] * R + q[1] * hw];
        if (s > 0) mb.quad(D, Cc, B, A, spoke); else mb.quad(A, B, Cc, D, spoke);
      }
      for (let k = 0; k < 6; k++) { const a0 = k / 6 * TAU, a1 = (k + 1) / 6 * TAU; T([0, s * (w / 2 + 0.006), 0], Pt(a0, r * 0.2, 0.006), Pt(a1, r * 0.2, 0.006), sh(spoke, 0.2)); }
    });
    mb.pop();
  }
  // secLoft helpers: insert sections so consecutive ones are at most `step` apart (linear blend), and
  // split every section edge in `n` (finer faces for per-triangle camouflage). Returns { secs, map } where
  // map(i) gives the original edge index of a subdivided edge.
  function secFine(secs, step, n) {
    const out = [];
    for (let k = 0; k < secs.length - 1; k++) {
      const a = secs[k], b = secs[k + 1], cnt = Math.max(1, Math.ceil(Math.abs(b.z - a.z) / step));
      for (let j = 0; j < cnt; j++) { const t = j / cnt; out.push({ z: a.z + (b.z - a.z) * t, pts: a.pts.map((p, i) => [p[0] + (b.pts[i][0] - p[0]) * t, p[1] + (b.pts[i][1] - p[1]) * t]) }); }
    }
    out.push(secs[secs.length - 1]);
    const sub = out.map(sc => { const q = []; sc.pts.forEach((p, i) => { const r = sc.pts[(i + 1) % sc.pts.length]; for (let j = 0; j < n; j++) q.push([p[0] + (r[0] - p[0]) * j / n, p[1] + (r[1] - p[1]) * j / n]); }); return { z: sc.z, pts: q }; });
    return { secs: sub, map: (i) => Math.floor(i / n) };
  }
  // horizontal plate split into n strips along x (for camouflage), pts = [[x, z] x4] (root front, tip front, tip back, root back)
  function slabStrips(mb, q, y0, y1, n, top, bot, side) {
    const L = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    for (let k = 0; k < n; k++) { const t0 = k / n, t1 = (k + 1) / n; slab(mb, [L(q[0], q[1], t0), L(q[0], q[1], t1), L(q[3], q[2], t1), L(q[3], q[2], t0)], y0, y1, top, bot, side); }
  }
  // flat polygon on a side plane x = const, facing +s*x ([z, y] points, convex)
  function sidePoly(mb, s, pts, x, col) {
    let q = pts.map(p => [x, p[1], p[0]]);
    const a = area2(pts.map(p => [s > 0 ? -p[0] : p[0], p[1]]));
    if (a < 0) q = q.reverse();
    for (let i = 1; i < q.length - 1; i++) mb.tri(q[0], q[i], q[i + 1], col);
  }

  // ================================================================== rig helpers
  const att = (m, bone, fn, opts) => m.attach(bone, meshOf(fn), null, opts || null);
  const glow = (m, bone, fn, opts) => m.attach(bone, meshOf(fn, { unlit: true }), null, opts || null);
  const addRot = (m, name, axis, v) => { const b = m.bones[name]; if (b) b.rot[axis] += v; };
  const addPos = (m, name, axis, v) => { const b = m.bones[name]; if (b) b.pos[axis] += v; };
  // standard clips: idle / move with wheels (rot x), props (rot z), rotors (rot y)
  function spinParts(m, p, turns) {
    (m.wheels || []).forEach(n => addRot(m, n, 0, p * TAU * turns));
    (m.props || []).forEach(n => addRot(m, n, 2, p * TAU * turns * 2));
    (m.rotors || []).forEach(n => addRot(m, n, 1, p * TAU * turns));
  }
  // uniformly rescale a freshly built model (bone offsets, mesh vertices, seats/harness points)
  function scaleModel(m, k) {
    const seen = new Set();
    for (const b of m.order) {
      b.offset = b.offset.map(v => v * k);
      for (const a of b.meshes) { const me = a.mesh; if (seen.has(me)) continue; seen.add(me); for (let i = 0; i < me.pos.length; i++) me.pos[i] *= k; me.min = me.min.map(v => v * k); me.max = me.max.map(v => v * k); }
    }
    ['seats', 'harness'].forEach(key => { if (m[key]) for (const n in m[key]) m[key][n] = m[key][n].map(v => v * k); });
    return m;
  }
  function applySteer(m) {
    const s = clamp(m.steer || 0, -0.6, 0.6);
    if (s) (m.steerBones || []).forEach(n => addRot(m, n, 1, s));
  }

  // ================================================================== BUGGY (world map)
  // Dio's buggy as the in-game world-map/field model shows it (ff7shot_07-cosmocanyon01, _08-nibelheim01):
  // a red open hot-rod - low wide nose on small magenta front wheels, grey side sills, yellow/orange flame
  // decals on the flanks, open cockpit with a salmon bench seat, tail rising into a teal fin with the
  // orange tail lamp, and two huge tan balloon tyres at the back. Bones: body, steerL/R + wheelFL/FR
  // (front, steer), wheelRL/RR. (The silver riveted FMV car of the design sheets is 'sa27'.)
  function buildBuggy() {
    const m = new FF7.Model();
    const RED = '#c81c14', RDK = '#8a100c', RLT = '#e03a28', GRY = '#6a7488', SEAT = '#e08878', YEL = '#f0d020', ORG = '#f07820', TEAL = '#48c0c8', TDK = '#2a7a84', TYR = '#9a7440', MAG = '#c848c8', INT = '#2a1a18';
    const FW = { x: 0.52, y: 0.2, z: 0.92, r: 0.2, w: 0.15 }, RW = { x: 0.62, y: 0.42, z: -0.55, r: 0.42, w: 0.34 };
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('steerL', 'root', [FW.x, FW.y, FW.z]); m.bone('steerR', 'root', [-FW.x, FW.y, FW.z]);
    m.bone('wheelFL', 'steerL', [0, 0, 0]); m.bone('wheelFR', 'steerR', [0, 0, 0]);
    m.bone('wheelRL', 'root', [RW.x, RW.y, RW.z]); m.bone('wheelRR', 'root', [-RW.x, RW.y, RW.z]);
    att(m, 'body', mb => {
      // body: low wide nose, open cockpit, tail rising to a point (edges as rrect: 0 chamfer, 1 side, 2 chamfer, 3 top, ..., 7 bottom)
      const sec = (z, w, yb, yt) => ({ z, pts: rrect(w, yb, yt, 0.05, 0.07) });
      secLoft(mb, [sec(-1.12, 0.08, 0.62, 0.88), sec(-0.85, 0.3, 0.36, 0.86), sec(-0.3, 0.4, 0.24, 0.66), sec(0.45, 0.42, 0.2, 0.56), sec(1.05, 0.42, 0.18, 0.44), sec(1.2, 0.3, 0.22, 0.38)],
        (k, i) => i === 7 ? RDK : i === 3 ? (k === 2 ? INT : RLT) : (i === 0 || i === 6) ? RDK : RED, { capFrontCol: RDK, capBackCol: RDK });
      // grey sills along the lower front flanks, top rails on the tail
      LR(s => { sidePoly(mb, s, [[0.1, 0.24], [1.05, 0.22], [1.05, 0.34], [0.1, 0.36]], s * 0.424, GRY); tube(mb, [s * 0.34, 0.8, -0.75], [s * 0.38, 0.68, -0.25], 0.03, 0.03, GRY, 4, false); });
      // flame decals: orange tongues outlined in yellow, licking backwards from the nose
      LR(s => {
        const x = s * 0.426;
        [[0.98, 0.34, 0.5], [0.92, 0.44, 0.3], [0.96, 0.26, 0.62]].forEach(([z0, y, z1]) => {
          sidePoly(mb, s, [[z0, y - 0.06], [z0, y + 0.06], [(z0 + z1) / 2, y + 0.07], [z1, y + 0.02], [(z0 + z1) / 2, y - 0.05]], x, YEL);
          sidePoly(mb, s, [[z0 - 0.02, y - 0.035], [z0 - 0.02, y + 0.035], [(z0 + z1) / 2, y + 0.04], [z1 + 0.06, y + 0.01], [(z0 + z1) / 2, y - 0.025]], x + s * 0.003, ORG);
        });
      });
      // bench seat + back, steering wheel
      cbox(mb, 0, 0.6, -0.12, 0.62, 0.08, 0.3, SEAT, 0.2);
      mb.push(); mb.translate(0, 0.78, -0.3); mb.rotate(-0.25, 0, 0); cbox(mb, 0, 0, 0, 0.62, 0.3, 0.07, sh(SEAT, -0.12), 0.25); mb.pop();
      mb.push(); mb.translate(-0.16, 0.74, 0.3); mb.rotate(-0.9, 0, 0);
      mb.sweep([0, 1, 2, 3, 4, 5, 6].map(k => [C(k / 6 * TAU) * 0.08, 0, S(k / 6 * TAU) * 0.08]), 0.012, { sides: 3, color: '#202020', capStart: false, capEnd: false });
      mb.pop();
      // teal tail fin
      fin(mb, [[-0.5, 0.82], [-1.02, 0.86], [-1.12, 1.2], [-0.8, 1.16]], 0, 0.06, TEAL, TDK);
      // axles / suspension
      tube(mb, [-RW.x + 0.15, RW.y, RW.z], [RW.x - 0.15, RW.y, RW.z], 0.05, 0.05, '#3a3a3a', 5, false);
      LR(s => tube(mb, [s * 0.3, 0.28, FW.z], [s * (FW.x - 0.06), FW.y, FW.z], 0.025, 0.025, '#3a3a3a', 4, false));
    });
    glow(m, 'body', mb => { dot(mb, [0, 0.76, -1.125], [0, 0, -1], 0.1, '#ff9020', 0.12); LR(s => dot(mb, [s * 0.3, 0.36, 1.205], [0, 0, 1], 0.08, '#fff4c0', 0.06)); });
    const fw = meshOf(mb => wheel(mb, FW.r, FW.w, MAG, sh(MAG, -0.35), { sides: 8, bolts: 3 }));
    const rw = meshOf(mb => wheel(mb, RW.r, RW.w, TYR, sh(TYR, -0.35), { sides: 10, bolts: 5, hubR: RW.r * 0.5 }));
    m.attach('wheelFL', fw); m.attach('wheelFR', fw); m.attach('wheelRL', rw); m.attach('wheelRR', rw);
    m.wheels = ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR']; m.steerBones = ['steerL', 'steerR'];
    m.seats = { driver: [-0.16, 0.64, -0.1], passenger: [0.16, 0.64, -0.1], middle: [0, 0.64, -0.1] };
    const roll = (m, p, turns) => { ['wheelFL', 'wheelFR'].forEach(n => addRot(m, n, 0, p * TAU * turns * RW.r / FW.r)); ['wheelRL', 'wheelRR'].forEach(n => addRot(m, n, 0, p * TAU * turns)); };
    m.clips = {
      idle: { dur: 40, fn(m, p, t) { addPos(m, 'body', 1, S(t * 1.9) * 0.003); addRot(m, 'body', 2, S(t * 1.3) * 0.004); applySteer(m); } },
      move: { dur: 30, fn(m, p, t) { roll(m, p, 2); addPos(m, 'body', 1, Math.abs(S(p * TAU * 3)) * 0.01); addRot(m, 'body', 0, S(p * TAU * 2) * 0.012); addRot(m, 'body', 2, -(m.steer || 0) * 0.05); applySteer(m); } },
    };
    return m;
  }

  // ================================================================== SHIN-RA sA-27
  // Shin-Ra Motor Mobiles sA-27 (ref ff7art52 / ff7art45 left car): the silver riveted Midgar single-
  // seater - exposed chrome engine on the long hood with twin head-lamp pairs, cycle fenders over the front
  // wheels, red single seat, exhaust stack and tank at the back, big rear tyres with red hubs.
  function buildSA27() {
    const m = new FF7.Model();
    const BODY = '#8a929a', BDK = '#50575e', BLT = '#a8b0b8', CHR = '#d0d4d8', INT = '#2a2624', RED = '#b82a20', TY = '#222222', HUB = '#b0281e', ENG = '#484c50';
    const FW = { x: 0.5, y: 0.24, z: 0.74, r: 0.24, w: 0.17 }, RW = { x: 0.55, y: 0.3, z: -0.62, r: 0.3, w: 0.26 };
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('steerL', 'root', [FW.x, FW.y, FW.z]); m.bone('steerR', 'root', [-FW.x, FW.y, FW.z]);
    m.bone('wheelFL', 'steerL', [0, 0, 0]); m.bone('wheelFR', 'steerR', [0, 0, 0]);
    m.bone('wheelRL', 'root', [RW.x, RW.y, RW.z]); m.bone('wheelRR', 'root', [-RW.x, RW.y, RW.z]);
    att(m, 'body', mb => {
      // main tub (open cockpit = dark floor inside raised sill rails)
      const sec = (z, w, yb, yt, c) => ({ z, pts: rrect(w, yb, yt, c, c * 0.8) });
      secLoft(mb, [sec(-1.04, 0.34, 0.27, 0.52, 0.06), sec(-0.92, 0.42, 0.2, 0.57, 0.08), sec(0.32, 0.42, 0.2, 0.57, 0.08), sec(0.5, 0.33, 0.22, 0.53, 0.07), sec(1.0, 0.27, 0.24, 0.48, 0.06), sec(1.12, 0.21, 0.28, 0.43, 0.05)],
        (k, i) => i === 7 ? BDK : i === 3 ? (k === 1 ? INT : BLT) : i === 0 || i === 6 ? BDK : i === 2 || i === 4 ? BLT : BODY, { capBackCol: BDK });
      LR(s => slab(mb, [[s * 0.36, -0.9], [s * 0.43, -0.9], [s * 0.43, 0.3], [s * 0.36, 0.3]], 0.56, 0.62, BLT, BDK, BODY));
      slab(mb, [[-0.42, -0.9], [0.42, -0.9], [0.42, -0.82], [-0.42, -0.82]], 0.56, 0.62, BLT, BDK, BODY);
      // dash
      slab(mb, [[-0.38, 0.28], [0.38, 0.28], [0.38, 0.38], [-0.38, 0.38]], 0.56, 0.66, '#3a3a3c', BDK, '#3a3a3c');
      // engine on the hood: block, 2 x 3 chrome cylinders, blower scoop, headers
      cbox(mb, 0, 0.55, 0.76, 0.34, 0.12, 0.46, ENG, 0.2);
      LR(s => { for (let k = 0; k < 3; k++) { mb.prism(s * 0.1, 0.6, 0.6 + k * 0.14, 0.05, 0.042, 0.1, 5, CHR, true, true, false); dot(mb, [s * 0.1, 0.702, 0.6 + k * 0.14], [0, 1, 0], 0.04, '#5a5e62'); } });
      cbox(mb, 0, 0.7, 0.74, 0.13, 0.1, 0.3, CHR, 0.3);
      dot(mb, [0, 0.72, 0.892], [0, 0, 1], 0.08, '#202020', 0.05);
      LR(s => { pipe(mb, [[s * 0.18, 0.54, 0.86], [s * 0.3, 0.46, 0.8], [s * 0.44, 0.3, 0.6], [s * 0.45, 0.27, -0.3], [s * 0.45, 0.3, -0.6]], 0.028, CHR, 4); });
      // grille, bumper, lamp housings
      plate(mb, [[-0.15, 0.3], [0.15, 0.3], [0.15, 0.44], [-0.15, 0.44]], 1.13, 0.02, '#1a1a1a');
      for (let k = -2; k <= 2; k++) dot(mb, [k * 0.055, 0.37, 1.142], [0, 0, 1], 0.014, CHR, 0.13);
      tube(mb, [-0.36, 0.25, 1.17], [0.36, 0.25, 1.17], 0.025, 0.025, CHR, 5);
      LR(s => { tube(mb, [s * 0.3, 0.25, 1.17], [s * 0.26, 0.27, 1.06], 0.018, 0.018, CHR, 4); lampHousing(mb, s * 0.19, 0.47, 1.16, 0.075, CHR, 0.08, 6); lampHousing(mb, s * 0.33, 0.36, 1.1, 0.05, CHR, 0.06, 6); });
      // front suspension arms
      LR(s => { tube(mb, [s * 0.2, 0.3, FW.z], [s * (FW.x - 0.06), FW.y, FW.z], 0.022, 0.022, '#303234', 4); tube(mb, [s * 0.22, 0.34, FW.z - 0.12], [s * (FW.x - 0.06), FW.y + 0.02, FW.z], 0.02, 0.02, '#303234', 4); });
      // rear fenders (wide, body coloured) + rear axle
      LR(s => arcBand(mb, s * RW.x, RW.y, RW.z, RW.r + 0.06, 0.25, PI - 0.05, RW.w + 0.06, 0.03, BODY, 6));
      tube(mb, [-RW.x + 0.1, RW.y, RW.z], [RW.x - 0.1, RW.y, RW.z], 0.035, 0.035, '#303234', 5);
      // single red seat (sA-27 is a single-seater)
      cbox(mb, 0, 0.6, -0.1, 0.34, 0.08, 0.3, RED, 0.25); mb.push(); mb.translate(0, 0.78, -0.26); mb.rotate(-0.22, 0, 0); cbox(mb, 0, 0, 0, 0.34, 0.34, 0.07, sh(RED, -0.1), 0.3); mb.pop();
      // steering wheel on its column
      mb.push(); mb.translate(0, 0.76, 0.28); mb.rotate(-0.95, 0, 0);
      mb.sweep([0, 1, 2, 3, 4, 5, 6].map(k => [C(k / 6 * TAU) * 0.085, 0, S(k / 6 * TAU) * 0.085]), 0.012, { sides: 3, color: '#202020', capStart: false, capEnd: false });
      dot(mb, [0, 0.004, 0], [0, 1, 0], 0.16, '#303030', 0.02);
      mb.pop();
      tube(mb, [0, 0.74, 0.3], [0, 0.62, 0.4], 0.015, 0.015, '#303030', 4);
      // exhaust stack + fuel tank at the back, tail lamps
      mb.prism(0.26, 0.42, -1.02, 0.055, 0.05, 0.56, 6, CHR, true, false, false);
      mb.prism(0.26, 0.98, -1.02, 0.07, 0.07, 0.04, 6, '#8a8e92', true);
      mb.push(); mb.translate(-0.08, 0.46, -1.07); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.18, 0, 0.09, 0.09, 0.36, 6, '#6a6e70', true); mb.pop();
    });
    glow(m, 'body', mb => {
      LR(s => { lampLens(mb, s * 0.19, 0.47, 1.16, 0.075, '#fff4c0'); lampLens(mb, s * 0.33, 0.36, 1.1, 0.05, '#fff0b0'); });
      LR(s => mb.box(s * 0.36, 0.44, -1.045, 0.08, 0.05, 0.02, '#e02010'));
    });
    // front wheels + cycle fenders (steer together)
    const fw = meshOf(mb => wheel(mb, FW.r, FW.w, TY, HUB, { sides: 9, bolts: 5 }));
    const rw = meshOf(mb => wheel(mb, RW.r, RW.w, TY, HUB, { sides: 10, bolts: 5 }));
    m.attach('wheelFL', fw); m.attach('wheelFR', fw); m.attach('wheelRL', rw); m.attach('wheelRR', rw);
    LR(s => att(m, s > 0 ? 'steerL' : 'steerR', mb => { arcBand(mb, 0, 0, 0, FW.r + 0.05, 0.15, PI - 0.55, FW.w + 0.05, 0.02, BODY, 6); tube(mb, [s * -0.02, 0.2, -0.12], [s * -0.08, 0.02, 0], 0.012, 0.012, BDK, 4); }));
    m.wheels = ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR']; m.steerBones = ['steerL', 'steerR'];
    m.seats = { driver: [0, 0.62, -0.08] };
    m.clips = {
      idle: { dur: 40, fn(m, p, t) { addPos(m, 'body', 1, S(t * 1.9) * 0.003); addRot(m, 'body', 2, S(t * 1.3) * 0.004); applySteer(m); } },
      move: { dur: 30, fn(m, p, t) { spinParts(m, p, 3); addPos(m, 'body', 1, Math.abs(S(p * TAU * 3)) * 0.01); addRot(m, 'body', 0, S(p * TAU * 2) * 0.012); addRot(m, 'body', 2, -(m.steer || 0) * 0.05); applySteer(m); } },
    };
    return m;
  }

  // ================================================================== MOTORCYCLE (Hardy-Daytona)
  // Cloud's big sport bike from the Midgar highway escape: huge fat rear tyre, riveted silver mudguard
  // over the front wheel, raked chrome forks, big round headlamp, black tank/seat, dark engine with the
  // blue-glowing core, chrome exhausts.
  function buildMotorcycle() {
    const m = new FF7.Model();
    const BLK = '#1c1d20', DK = '#34363a', GRY = '#5a5d62', CHR = '#c4c8ce', SIL = '#aeb2b8', TY = '#1a1a1c';
    const RW = { y: 0.29, z: -0.56, r: 0.29, w: 0.3 }, FWp = { y: 0.25, z: 0.64, r: 0.25, w: 0.15 };
    const HEAD = [0, 0.7, 0.36];
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('fork', 'body', HEAD);
    m.bone('wheelF', 'fork', [0, FWp.y - HEAD[1], FWp.z - HEAD[2]]);
    m.bone('wheelR', 'root', [0, RW.y, RW.z]);
    att(m, 'body', mb => {
      // swingarm
      LR(s => tube(mb, [s * 0.15, RW.y, RW.z], [s * 0.13, 0.3, -0.14], 0.03, 0.036, SIL, 5, false));
      // engine: dark block, crankcase, V-twin heads with chrome fins, chrome side covers around the blue core
      cbox(mb, 0, 0.35, 0.04, 0.32, 0.3, 0.5, DK, 0.2);
      cbox(mb, 0, 0.19, 0.06, 0.26, 0.08, 0.42, GRY, 0.25);
      [[0.16, 0.5], [-0.1, -0.45]].forEach(([z, a]) => { mb.push(); mb.translate(0, 0.46, z); mb.rotate(a, 0, 0); mb.prism(0, 0, 0, 0.09, 0.08, 0.2, 6, GRY, true, true, false); for (let k = 0; k < 3; k++) mb.prism(0, 0.04 + k * 0.05, 0, 0.115, 0.115, 0.018, 6, CHR, false, true, true); mb.pop(); });
      LR(s => { mb.push(); mb.translate(s * 0.16, 0.33, 0.04); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.035, 0, 0.11, 0.11, 0.07, 8, CHR, true); mb.pop(); });
      // frame + black side fairings from the steering head down to the engine
      tube(mb, [0, 0.68, 0.34], [0, 0.34, 0.26], 0.065, 0.075, BLK, 6, false);
      tube(mb, [0, 0.64, 0.3], [0, 0.52, -0.42], 0.05, 0.05, BLK, 5, false);
      LR(s => fin(mb, [[0.38, 0.72], [0.2, 0.72], [0.12, 0.36], [0.3, 0.26], [0.42, 0.48]], s * 0.15, 0.025, BLK));
      // fuel tank (black, glossy top) + filler cap, seat, tail cowl
      hull(mb, [{ z: -0.06, rx: 0.12, ry: 0.07, y: 0.62 }, { z: 0.04, rx: 0.18, ry: 0.1, y: 0.64 }, { z: 0.26, rx: 0.17, ry: 0.1, y: 0.67 }, { z: 0.38, rx: 0.11, ry: 0.07, y: 0.69 }], { sides: 8, color: BLK, colorsFn: byFace('#3c4048', null, 0.6) });
      dot(mb, [0, 0.772, 0.16], [0, 1, 0], 0.05, CHR);
      hull(mb, [{ z: -0.48, rx: 0.1, ry: 0.04, y: 0.54 }, { z: -0.38, rx: 0.14, ry: 0.05, y: 0.55 }, { z: -0.1, rx: 0.15, ry: 0.05, y: 0.57 }, { z: -0.02, rx: 0.11, ry: 0.04, y: 0.59 }], { sides: 8, color: '#161618', sq: 3 });
      hull(mb, [{ z: -0.84, rx: 0.06, ry: 0.04, y: 0.64 }, { z: -0.76, rx: 0.12, ry: 0.07, y: 0.62 }, { z: -0.52, rx: 0.15, ry: 0.08, y: 0.57 }, { z: -0.4, rx: 0.13, ry: 0.06, y: 0.52 }], { sides: 8, color: DK, sq: 3, colorsFn: byFace(GRY, BLK) });
      // rear mudguard over the fat tyre
      arcBand(mb, 0, RW.y, RW.z, RW.r + 0.05, 0.9, PI - 0.25, RW.w + 0.05, 0.02, DK, 5);
      // chrome exhausts with big mufflers (model's right side)
      [0, 1].forEach(k => { const y = 0.22 + k * 0.08; pipe(mb, [[-0.08, 0.3, 0.2 - k * 0.04], [-0.19, y, 0.04], [-0.21, y, -0.3]], 0.03, CHR, 5); tube(mb, [-0.21, y, -0.3], [-0.22, y + 0.1, -0.86], 0.05, 0.055, CHR, 6); });
      LR(s => mb.box(s * 0.2, 0.25, -0.12, 0.1, 0.02, 0.035, SIL));
    });
    glow(m, 'body', mb => {
      LR(s => { mb.push(); mb.translate(s * 0.196, 0.33, 0.04); mb.rotate(0, 0, PI / 2); mb.prism(0, -0.01, 0, 0.075, 0.075, 0.02, 8, '#3a8cff', false); mb.pop(); });
      dot(mb, [0, 0.64, -0.845], [0, 0, -1], 0.1, '#e01818', 0.04);
    });
    // fork assembly (steers): chrome tubes, triple clamps, the long chrome nose tube with the big headlamp,
    // handlebars + mirrors, riveted silver mudguard over the front wheel
    const ax = [0, FWp.y - HEAD[1], FWp.z - HEAD[2]];
    att(m, 'fork', mb => {
      LR(s => { tube(mb, [s * 0.1, 0.05, -0.02], [s * 0.1, ax[1] + 0.02, ax[2]], 0.036, 0.03, CHR, 6, false); tube(mb, [s * 0.1, 0.02, 0.0], [s * 0.1, -0.16, 0.08], 0.048, 0.048, BLK, 6, false); });
      cbox(mb, 0, 0.05, -0.01, 0.3, 0.045, 0.09, SIL, 0.3);
      cbox(mb, 0, -0.1, 0.05, 0.28, 0.04, 0.08, SIL, 0.3);
      tube(mb, [0, 0.07, -0.06], [0, 0.05, 0.4], 0.055, 0.05, CHR, 7, false);
      LR(s => tube(mb, [s * 0.05, 0.02, 0.0], [s * 0.03, 0.02, 0.34], 0.018, 0.018, SIL, 4, false));
      lampHousing(mb, 0, 0.05, 0.47, 0.095, CHR, 0.1);
      pipe(mb, [[-0.32, 0.17, -0.1], [-0.12, 0.11, -0.04], [0.12, 0.11, -0.04], [0.32, 0.17, -0.1]], 0.017, CHR, 4);
      LR(s => { tube(mb, [s * 0.26, 0.155, -0.085], [s * 0.37, 0.175, -0.115], 0.027, 0.027, BLK, 5); tube(mb, [s * 0.2, 0.13, -0.05], [s * 0.24, 0.27, -0.04], 0.008, 0.008, CHR, 3, false); cbox(mb, s * 0.25, 0.29, -0.04, 0.08, 0.045, 0.015, CHR, 0.3); });
      arcBand(mb, 0, ax[1], ax[2], FWp.r + 0.045, 0.2, PI - 0.8, FWp.w + 0.06, 0.025, SIL, 6);
      for (let k = 0; k <= 5; k++) { const a = 0.25 + k * (PI - 1.1) / 5; LR(s => dot(mb, [s * (FWp.w / 2 + 0.032), ax[1] + S(a) * (FWp.r + 0.032), ax[2] + C(a) * (FWp.r + 0.032)], [s, 0, 0], 0.022, '#4a4a4a')); }
    });
    glow(m, 'fork', mb => lampLens(mb, 0, 0.05, 0.47, 0.095, '#fffbe0', 8));
    m.attach('wheelR', meshOf(mb => wheel(mb, RW.r, RW.w, TY, '#2c2e32', { sides: 12, hubR: RW.r * 0.66, rim: SIL, bolts: 6, boltCol: CHR })));
    m.attach('wheelF', meshOf(mb => wheel(mb, FWp.r, FWp.w, TY, '#2c2e32', { sides: 12, hubR: FWp.r * 0.62, rim: SIL, bolts: 6, boltCol: CHR })));
    m.wheels = ['wheelF', 'wheelR']; m.steerBones = ['fork'];
    m.seats = { rider: [0, 0.58, -0.18] };
    m.clips = {
      idle: { dur: 30, fn(m, p, t) { addPos(m, 'body', 1, S(t * 2.3) * 0.002); applySteer(m); } },
      move: { dur: 24, fn(m, p, t) { spinParts(m, p, 3); addPos(m, 'body', 1, S(t * 2.3) * 0.002); addRot(m, 'root', 2, -(m.steer || 0) * 0.35); applySteer(m); } },
    };
    return m;
  }

  // ================================================================== TRUCK (Shin-Ra sA-37, Midgar highway escape)
  // The teal Shin-Ra Motor Mobiles sA-37 (ref ff7art53 + the escape FMV): a three-wheeler light truck -
  // single front wheel under a rounded bubble nose with cream grille stripes, small cab with a wrap-around
  // windscreen, cream belt stripe and the "Midgal's" door plaques, roof rack carrying the spare tyre, open
  // flat cargo bed (the party rides in it) with bulbous rear fenders ending in round orange tail lamps.
  // Bones: body, wheelF (steers), wheelRL, wheelRR.
  function buildTruck() {
    const m = new FF7.Model();
    const B = '#6cb8c2', BL = '#8ed0d8', BD = '#4a8e98', CR = '#e6d690', GL = '#26343c', CHR = '#d0d4d8', TY = '#1e1e1e', WW = '#ece6d2', ORG = '#f08a20', RED = '#c03a2a', BED = '#5a9aa4';
    const FW = { y: 0.2, z: 1.02, r: 0.2, w: 0.14 }, RW = { x: 0.6, y: 0.22, z: -0.74, r: 0.22, w: 0.17 };
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('wheelF', 'root', [0, FW.y, FW.z]);
    m.bone('wheelRL', 'root', [RW.x, RW.y, RW.z]); m.bone('wheelRR', 'root', [-RW.x, RW.y, RW.z]);
    att(m, 'body', mb => {
      tube(mb, [0, 0.3, -1.3], [0, 0.3, 1.2], 0.07, 0.07, '#2a2a2a', 4);
      tube(mb, [-RW.x + 0.1, RW.y, RW.z], [RW.x - 0.1, RW.y, RW.z], 0.035, 0.035, '#2a2a2a', 4, false);
      // cab + bubble nose (edges: 0 chamfer, 1 lower, 2 cream stripe, 3 window band, 4 roof chamfer, 5 roof, 6..10 left, 11 belly)
      const sec = (z, w, yb, yt, ct) => ({ z, pts: rrect(w, yb, yt, 0.06, ct, [0.62, 0.8]) });
      secLoft(mb, [sec(0.34, 0.56, 0.34, 1.34, 0.2), sec(0.9, 0.56, 0.34, 1.34, 0.2), sec(1.12, 0.54, 0.32, 1.0, 0.16), sec(1.32, 0.46, 0.32, 0.76, 0.16), sec(1.46, 0.28, 0.36, 0.62, 0.1)], (k, i) => {
        if (i === 2 || i === 8) return CR;
        if (i === 11 || i === 0 || i === 10) return BD;
        if (k === 0) return (i === 3 || i === 7) ? GL : i === 5 ? BL : B;
        if (k === 1) return (i >= 3 && i <= 7) ? GL : B;
        return i === 5 ? BL : B;
      }, { capBackCol: B, capFrontCol: B });
      dot(mb, [0, 1.02, 0.335], [0, 0, -1], 0.6, GL, 0.32);
      LR(s => { dot(mb, [s * 0.563, 0.52, 0.64], [s, 0, 0], 0.22, CR, 0.12); dot(mb, [s * 0.566, 0.52, 0.64], [s, 0, 0], 0.17, RED, 0.08); dot(mb, [s * 0.563, 0.98, 0.9], [s, 0, 0], 0.03, BD, 0.64); });
      // grille stripes on the nose, chrome emblem, head lamps
      [-0.18, -0.06, 0.06, 0.18].forEach(x => dot(mb, [x, 0.6, 1.4], [0, 0.35, 1], 0.03, CR, 0.28));
      dot(mb, [0, 0.74, 1.3], [0, 0.6, 1], 0.1, CHR, 0.06);
      LR(s => lampHousing(mb, s * 0.34, 0.66, 1.3, 0.06, CHR, 0.05, 6));
      // roof rack + spare tyre
      LR(s => tube(mb, [s * 0.38, 1.4, 0.4], [s * 0.38, 1.4, 0.88], 0.016, 0.016, CHR, 4));
      [0.44, 0.84].forEach(z => LR(s => tube(mb, [s * 0.38, 1.4, z], [s * 0.38, 1.33, z], 0.012, 0.012, CHR, 3, false)));
      tube(mb, [-0.4, 1.4, 0.64], [0.4, 1.4, 0.64], 0.016, 0.016, CHR, 4);
      mb.push(); mb.translate(0, 1.47, 0.64); mb.rotate(0, 0, PI / 2); wheel(mb, 0.21, 0.1, TY, '#6a6a6a', { sides: 9, bolts: 3 }); mb.pop();
      // cargo bed: floor, low sides with cream rail, tailgate
      slab(mb, [[-0.58, -1.36], [0.58, -1.36], [0.58, 0.33], [-0.58, 0.33]], 0.44, 0.52, BED, BD, BD);
      LR(s => { slab(mb, [[s * 0.52, -1.36], [s * 0.58, -1.36], [s * 0.58, 0.33], [s * 0.52, 0.33]], 0.52, 0.76, B, BD, B); slab(mb, [[s * 0.51, -1.36], [s * 0.59, -1.36], [s * 0.59, 0.33], [s * 0.51, 0.33]], 0.76, 0.79, CR, CR, CR); });
      slab(mb, [[-0.58, -1.4], [0.58, -1.4], [0.58, -1.34], [-0.58, -1.34]], 0.44, 0.76, B, BD, B);
      slab(mb, [[-0.59, -1.41], [0.59, -1.41], [0.59, -1.33], [-0.59, -1.33]], 0.76, 0.79, CR, CR, CR);
      // bulbous rear fenders with the round tail lamps, rear bumper
      LR(s => hull(mb, [{ z: -1.36, rx: 0.07, ry: 0.09, x: s * 0.62, y: 0.46 }, { z: -1.2, rx: 0.13, ry: 0.22, x: s * 0.63, y: 0.44 }, { z: -0.36, rx: 0.13, ry: 0.22, x: s * 0.63, y: 0.44 }, { z: -0.18, rx: 0.05, ry: 0.07, x: s * 0.62, y: 0.4 }], { sides: 8, color: B, colorsFn: byFace(BL, BD) }));
      tube(mb, [-0.5, 0.3, -1.44], [0.5, 0.3, -1.44], 0.03, 0.03, CHR, 5);
      // front wheel fork
      LR(s => tube(mb, [s * 0.1, 0.44, 1.02], [s * 0.1, FW.y, FW.z], 0.025, 0.025, '#3a3a3a', 4, false));
    });
    glow(m, 'body', mb => { LR(s => { lampLens(mb, s * 0.34, 0.66, 1.3, 0.06, '#fff4c8'); dot(mb, [s * 0.62, 0.46, -1.365], [0, 0, -1], 0.1, ORG, 0.1); }); });
    m.attach('wheelF', meshOf(mb => wheel(mb, FW.r, FW.w, TY, WW, { sides: 10, bolts: 4, hubR: FW.r * 0.66, cap: '#b0aa98' })));
    const rw = meshOf(mb => wheel(mb, RW.r, RW.w, TY, WW, { sides: 10, bolts: 4, hubR: RW.r * 0.66, cap: '#b0aa98' }));
    m.attach('wheelRL', rw); m.attach('wheelRR', rw);
    m.wheels = ['wheelF', 'wheelRL', 'wheelRR']; m.steerBones = ['wheelF'];
    m.seats = { driver: [-0.2, 0.5, 0.62], passenger: [0.2, 0.5, 0.62], bed: [0, 0.52, -0.55], bedL: [0.3, 0.52, -0.9], bedR: [-0.3, 0.52, -0.9] };
    m.clips = {
      idle: { dur: 40, fn(m, p, t) { addPos(m, 'body', 1, S(t * 1.7) * 0.003); applySteer(m); } },
      move: { dur: 30, fn(m, p, t) { spinParts(m, p, 3); addPos(m, 'body', 1, Math.abs(S(p * TAU * 3)) * 0.008); addRot(m, 'body', 2, -(m.steer || 0) * 0.06); applySteer(m); } },
    };
    return m;
  }

  // ================================================================== TINY BRONCO
  // Cid's auto-gyro Tiny Bronco after the design sheet (ref ff7art55: 12.74 x 12.48 x 3.57 m), at field
  // scale (1 unit = 1.7 m): long straight parasol wing (weathered salmon with blue-grey leading edge and
  // tips) on a blue-grey truss, two long 2-blade propellers on the wingtip pods, a small salmon fuselage pod
  // with the round glazed canopy and gear fairings under the wing, the engine and drive shafts behind it,
  // twin truss tail booms to a blue-grey stabiliser with twin salmon fins (upper + lower, "Bronco" logos),
  // tail wheels under the lower fins. The big navy/orange/yellow "Bronco" logo on each wing.
  // opts.boat: the shot-down Bronco floating on the sea (tail hit: right fin and stabiliser broken, no
  // wheels; m.waterline = water height). Bones: body, propL, propR (props rest horizontal).
  function buildBronco(o) {
    const boat = !!o.boat;
    const m = new FF7.Model();
    const SAL = '#c86e5c', SALD = '#a2503e', SALL = '#dc8c78', BG = '#6a8ca6', BGD = '#4a6478', BGL = '#88a8c0', GL = '#1e2c38', NAVY = '#2a2a86', ORG = '#f09030', YEL = '#f2d040', ENG = '#3a3c44', TY = '#1e1e1e';
    const WY = 1.62, WT = 0.12, PXX = 3.68, PZ = 2.24;
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('propL', 'body', [PXX, WY, PZ]); m.bone('propR', 'body', [-PXX, WY, PZ]);
    att(m, 'body', mb => {
      // parasol wing: salmon, blue-grey leading/trailing edges and tip caps
      slab(mb, [[-3.4, 0.56], [3.4, 0.56], [3.4, 1.9], [-3.4, 1.9]], WY - WT, WY + WT, SAL, SALD, SALD);
      slab(mb, [[-3.4, 1.9], [3.4, 1.9], [3.4, 2.04], [-3.4, 2.04]], WY - WT * 0.7, WY + WT * 0.6, BG, BGD, BGD);
      slab(mb, [[-3.4, 0.44], [3.4, 0.44], [3.4, 0.56], [-3.4, 0.56]], WY - WT * 0.6, WY + WT * 0.4, BG, BGD, BGD);
      LR(s => slab(mb, [[s * 3.4, 0.42], [s * 3.52, 0.42], [s * 3.52, 2.06], [s * 3.4, 2.06]], WY - WT, WY + WT, BG, BGD, BGD));
      // logos: yellow rim, orange, navy letters band, orange letter strokes
      LR(s => {
        const deco = (pts, y, col) => { let q = pts.map(p => [s * p[0], p[1]]); if (area2(q) > 0) q = q.reverse(); for (let i = 1; i < q.length - 1; i++) mb.tri([q[0][0], y, q[0][1]], [q[i][0], y, q[i][1]], [q[i + 1][0], y, q[i + 1][1]], col); };
        const yt = WY + WT;
        deco([[0.7, 1.72], [2.9, 1.42], [2.98, 0.82], [0.8, 1.02]], yt + 0.004, YEL);
        deco([[0.82, 1.64], [2.8, 1.36], [2.86, 0.9], [0.9, 1.1]], yt + 0.008, ORG);
        deco([[0.94, 1.56], [2.7, 1.3], [2.74, 0.98], [1.0, 1.2]], yt + 0.012, NAVY);
        [1.14, 1.5, 1.86, 2.22].forEach((x0, k) => deco([[x0, 1.48 - k * 0.06], [x0 + 0.12, 1.46 - k * 0.06], [x0 + 0.15, 1.18 - k * 0.055], [x0 + 0.03, 1.2 - k * 0.055]], yt + 0.016, ORG));
      });
      // under-wing truss (lower chord + posts) and drive shafts to the tip pods
      LR(s => {
        tube(mb, [s * 0.45, WY - 0.42, 1.24], [s * 3.3, WY - 0.34, 1.24], 0.045, 0.045, BG, 4, false);
        for (let k = 0; k <= 7; k++) { const x = s * (0.5 + k * 0.4); tube(mb, [x, WY - 0.41, 1.24], [x + s * (k % 2 ? 0.2 : -0.2), WY - WT, k % 2 ? 0.8 : 1.68], 0.024, 0.024, BG, 3, false); }
        tube(mb, [s * 0.3, WY + WT + 0.05, 0.62], [s * 3.5, WY + WT + 0.05, 0.62], 0.05, 0.05, BGD, 5, false);
        // wingtip pods
        hull(mb, [{ z: 0.25, rx: 0.08, ry: 0.08, x: s * PXX, y: WY }, { z: 0.45, rx: 0.19, ry: 0.19, x: s * PXX, y: WY }, { z: 1.95, rx: 0.19, ry: 0.19, x: s * PXX, y: WY }, { z: 2.14, rx: 0.13, ry: 0.13, x: s * PXX, y: WY, capColor: BGD }], { sides: 8, color: BG, colorsFn: byFace(BGL, BGD) });
      });
      // fuselage pod: salmon, round glazed canopy with blue-grey frame
      const canopy = (i, n) => { const a = PI / n + (i + 0.5) * TAU / n, cy = -S(a); return cy > -0.15 ? GL : SALD; };
      hull(mb, [
        { z: 1.1, rx: 0.14, ry: 0.14, y: 1.02 }, { z: 1.6, rx: 0.4, ry: 0.46, y: 0.98 }, { z: 2.5, rx: 0.48, ry: 0.54, y: 0.95 }, { z: 3.12, rx: 0.43, ry: 0.48, y: 0.98, color: BG, band: true },
        { z: 3.2, rx: 0.41, ry: 0.46, y: 0.99, colors: canopy }, { z: 3.6, rx: 0.27, ry: 0.31, y: 1.02, colors: canopy }, { z: 3.74, rx: 0.08, ry: 0.1, y: 1.04, capColor: GL },
      ], { sides: 10, color: SAL, colorsFn: byFace(SALL, SALD) });
      cbox(mb, 0, WY - WT - 0.06, 1.5, 0.3, 0.16, 1.1, BG, 0.25);
      // engine + exhausts behind the pod
      hull(mb, [{ z: 0.35, rx: 0.1, ry: 0.1, y: 1.12 }, { z: 0.55, rx: 0.22, ry: 0.22, y: 1.12 }, { z: 1.15, rx: 0.24, ry: 0.24, y: 1.1 }], { sides: 8, color: ENG });
      LR(s => { tube(mb, [s * 0.1, 1.12, 0.6], [s * 0.34, WY - WT, 0.62], 0.05, 0.05, BGD, 4, false); for (let k = 0; k < 3; k++) tube(mb, [s * 0.2, 1.04 + k * 0.08, 0.9 - k * 0.15], [s * 0.34, 1.07 + k * 0.08, 0.7 - k * 0.15], 0.03, 0.03, '#8a8e92', 4); });
      // main gear fairings
      LR(s => {
        hull(mb, [{ z: 2.05, rx: 0.05, ry: 0.08, x: s * 0.52, y: 0.3 }, { z: 2.25, rx: 0.15, ry: 0.28, x: s * 0.52, y: 0.3 }, { z: 2.85, rx: 0.15, ry: 0.28, x: s * 0.52, y: 0.3 }, { z: 3.05, rx: 0.05, ry: 0.08, x: s * 0.52, y: 0.3 }], { sides: 8, color: SAL, colorsFn: byFace(SALL, SALD) });
        tube(mb, [s * 0.48, 0.5, 2.55], [s * 0.3, 0.62, 2.55], 0.05, 0.05, BG, 4, false);
      });
      // twin truss tail booms
      LR(s => {
        const a0 = [s * 0.8, WY - 0.02, 0.5], a1 = [s * 0.8, 1.46, -3.2], b0 = [s * 0.8, WY - 0.34, 0.5], b1 = [s * 0.8, 1.24, -3.2];
        tube(mb, a0, a1, 0.07, 0.06, BG, 5, false); tube(mb, b0, b1, 0.05, 0.045, BGD, 4, false);
        for (let k = 0; k < 6; k++) { const t0 = k / 6, t1 = (k + 1) / 6; tube(mb, V.lerp(b0, b1, t0), V.lerp(a0, a1, t1), 0.022, 0.022, BG, 3, false); }
      });
      // tail: stabiliser + twin fins (the right one + half the stabiliser shot away on the boat)
      const yS = 1.39;
      if (boat) slab(mb, [[0.2, -2.95], [1.25, -2.95], [1.25, -3.65], [0.2, -3.65], [-0.3, -3.3]], yS - 0.03, yS + 0.03, BG, BGD, BGD);
      else slab(mb, [[-1.25, -2.95], [1.25, -2.95], [1.25, -3.65], [-1.25, -3.65]], yS - 0.03, yS + 0.03, BG, BGD, BGD);
      LR(s => {
        const fx = s * 0.8, broken = boat && s < 0;
        if (!broken) {
          fin(mb, [[-2.95, yS], [-3.72, yS], [-3.7, 1.98], [-3.22, 1.98]], fx, 0.05, SAL);
          fin(mb, [[-3.22, 1.98], [-3.7, 1.98], [-3.7, 2.1], [-3.26, 2.1]], fx, 0.06, BG);
          [1, -1].forEach(f => { sidePoly(mb, f, [[-3.25, 1.62], [-3.62, 1.72], [-3.64, 1.88], [-3.3, 1.8]], fx + f * 0.028, ORG); sidePoly(mb, f, [[-3.3, 1.66], [-3.58, 1.74], [-3.6, 1.84], [-3.33, 1.77]], fx + f * 0.031, NAVY); });
        } else {
          fin(mb, [[-2.95, yS], [-3.72, yS], [-3.68, 1.62], [-3.4, 1.74], [-3.18, 1.56]], fx, 0.05, SAL);
          [1, -1].forEach(f => sidePoly(mb, f, [[-3.2, 1.46], [-3.6, 1.46], [-3.58, 1.62], [-3.4, 1.7]], fx + f * 0.028, '#3a2c28'));
        }
        fin(mb, [[-3.0, yS], [-3.74, yS], [-3.72, 0.34], [-3.38, 0.34]], fx, 0.05, SAL);
        fin(mb, [[-3.38, 0.34], [-3.72, 0.34], [-3.72, 0.24], [-3.4, 0.24]], fx, 0.06, BG);
        if (!boat) { mb.push(); mb.translate(fx, 0.12, -3.55); wheel(mb, 0.12, 0.06, TY, BG, { flat: true, sides: 7 }); mb.pop(); }
      });
      if (boat) [[-0.9, 0.9, 0.3], [0.6, 2.2, 0.22], [-1.6, 1.2, 0.2]].forEach(([z, a, r]) => { const rr = 0.46; dot(mb, [C(a) * rr * 0.9, 0.95 + S(a) * rr, 1.8 + z * 0.3], [C(a), S(a), 0], r, '#3a2c28', r * 0.7); });
    });
    LR(s => att(m, s > 0 ? 'propL' : 'propR', mb => propeller(mb, 2, 1.38, 0.18, '#8a8e92', BG, { pitch: 0.35, hubR: 0.14, phase: PI / 2, simple: true, spinLen: 2.2 })));
    m.props = ['propL', 'propR'];
    m.realSize = [12.48, 3.57, 12.74];
    if (boat) { m.waterline = 0.72; m.keepY = true; }
    m.seats = { pilot: [0, 0.95, 2.85], wingL: [1.4, WY + WT, 1.2], wingR: [-1.4, WY + WT, 1.2] };
    m.clips = {
      idle: { dur: 60, fn(m, p) { if (boat) { addRot(m, 'propL', 2, p * TAU); addRot(m, 'propR', 2, -p * TAU); addPos(m, 'body', 1, S(p * TAU) * 0.03); addRot(m, 'body', 2, S(p * TAU + 1) * 0.02); addRot(m, 'body', 0, S(p * TAU * 2) * 0.008); } } },
      move: { dur: 30, fn(m, p) { addRot(m, 'propL', 2, p * TAU * 12); addRot(m, 'propR', 2, -p * TAU * 12); if (boat) { addPos(m, 'body', 1, S(p * TAU * 2) * 0.02); addRot(m, 'body', 0, -0.02 + S(p * TAU * 2) * 0.01); } addRot(m, 'body', 2, -(m.steer || 0) * 0.3); } },
    };
    return m;
  }

  // ================================================================== HIGHWIND
  // Cid's airship after the design sheet (ref ff7art50: 237 x 183 x 33 m) at world-map scale (~5.4 units
  // long; m.fieldScale gives the true size): slim riveted dark-steel hull with the rounded nose and its
  // viewing-deck slit, twin fat engine pods (red "Highwind" plates) running back into long tail booms
  // with swept cream/red fins and the big hanging slatted rudder arrays, two egg-shaped rotor housings far
  // out on outriggers with 4-blade lift rotors, the bridge gondola tucked under the hull with forward
  // stabilisers, and the long propeller shaft (turbine + two 4-blade props) trailing below.
  // Bones: body, rotorL, rotorR, fan, prop.
  function buildHighwind() {
    const m = new FF7.Model();
    const HUL = '#8e928c', HTP = '#aaaea6', HBT = '#5e625e', BND = '#4a3e34', DKW = '#202226', RED = '#b8302a', CRM = '#d4c8a4', BRN = '#8a6a44', BLD = '#3e4044', WOOD = '#7e6040';
    const HY = 0.92, SX = 1.46;
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    LR(s => m.bone(s > 0 ? 'rotorL' : 'rotorR', 'body', [s * SX, HY + 0.56, -0.3]));
    m.bone('fan', 'body', [0, HY - 0.5, -0.62]);
    m.bone('prop', 'body', [0, HY - 0.6, -2.3]);
    const topBot = byFace(HTP, HBT, 0.55);
    att(m, 'body', mb => {
      // ---- main hull with the dark viewing-deck slit wrapped around the nose
      const mouth = (i, n) => { const a = PI / n + (i + 0.5) * TAU / n, cy = -S(a); return cy > -0.62 && cy < 0.05 ? DKW : topBot(i, n, HUL); };
      hull(mb, bandRings([
        { z: -1.2, rx: 0.06, ry: 0.06, y: HY }, { z: -0.95, rx: 0.16, ry: 0.17, y: HY }, { z: -0.5, rx: 0.22, ry: 0.23, y: HY }, { z: 0.2, rx: 0.25, ry: 0.26, y: HY },
        { z: 1.5, rx: 0.24, ry: 0.25, y: HY }, { z: 2.25, rx: 0.22, ry: 0.23, y: HY - 0.01 }, { z: 2.58, rx: 0.18, ry: 0.19, y: HY - 0.02, colors: mouth }, { z: 2.74, rx: 0.12, ry: 0.12, y: HY - 0.03 }, { z: 2.82, rx: 0.04, ry: 0.04, y: HY - 0.03 },
      ], [2.44, 2.0, 1.55, 1.1, 0.65, 0.2, -0.25], HUL, BND, 0.035), { sides: 10, color: HUL, colorsFn: topBot });
      // ---- upper deck hump with the perforated viewing grille, masts + guy wires
      hull(mb, [{ z: -0.55, rx: 0.03, ry: 0.02, y: HY + 0.22 }, { z: -0.35, rx: 0.12, ry: 0.08, y: HY + 0.24 }, { z: 0.4, rx: 0.13, ry: 0.08, y: HY + 0.25 }, { z: 0.72, rx: 0.07, ry: 0.05, y: HY + 0.24 }, { z: 0.8, rx: 0.02, ry: 0.02, y: HY + 0.23 }], { sides: 8, color: HUL, colorsFn: topBot });
      for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) dot(mb, [(c - 1) * 0.06, HY + 0.332, 0.05 + r * 0.12], [0, 1, 0], 0.035, DKW);
      [[1.55, 0.24], [0.5, 0.33]].forEach(([z, y0]) => { tube(mb, [0, HY + y0, z], [0, HY + y0 + 0.34, z], 0.014, 0.01, '#6a6460', 4, false); tube(mb, [-0.06, HY + y0 + 0.28, z], [0.06, HY + y0 + 0.28, z], 0.006, 0.006, '#6a6460', 3, false); });
      [[1.55, 0.58, 2.35, 0.18], [1.55, 0.58, 0.8, 0.3], [0.5, 0.67, -0.4, 0.26]].forEach(([z0, y0, z1, y1]) => tube(mb, [0, HY + y0, z0], [0, HY + y1, z1], 0.004, 0.004, '#3a3a3a', 3, false));
      // ---- twin engine pods running back into the tail booms
      LR(s => {
        const red = flank(s, RED, HUL, -0.35, 0.5);
        const pk = [
          { z: -2.55, rx: 0.05, ry: 0.05, x: s * 0.62, y: HY - 0.02 }, { z: -2.38, rx: 0.085, ry: 0.09, x: s * 0.61, y: HY - 0.02 }, { z: -1.1, rx: 0.09, ry: 0.1, x: s * 0.52, y: HY - 0.04 },
          { z: -0.7, rx: 0.15, ry: 0.16, x: s * 0.44, y: HY - 0.05 }, { z: -0.42, rx: 0.2, ry: 0.21, x: s * 0.41, y: HY - 0.06, colors: red }, { z: 0.15, rx: 0.22, ry: 0.23, x: s * 0.4, y: HY - 0.06, colors: red },
          { z: 0.55, rx: 0.18, ry: 0.19, x: s * 0.39, y: HY - 0.06 }, { z: 0.85, rx: 0.05, ry: 0.05, x: s * 0.37, y: HY - 0.06 },
        ];
        hull(mb, bandRings(pk, [-1.95, -1.45, -0.9, 0.38], HUL, BND, 0.035), { sides: 8, color: HUL, colorsFn: topBot });
        // swept tail fin (cream, red top) + small ventral fin
        const fx = s * 0.605;
        fin(mb, [[-1.95, HY + 0.05], [-2.46, HY + 0.05], [-2.54, HY + 0.38], [-2.2, HY + 0.38]], fx, 0.04, CRM);
        fin(mb, [[-2.2, HY + 0.38], [-2.54, HY + 0.38], [-2.6, HY + 0.58], [-2.38, HY + 0.6]], fx, 0.04, RED);
        // big slatted rudder array hanging below the boom end
        const rz = -2.05, rtop = HY - 0.12;
        cbox(mb, fx, rtop - 0.3, rz, 0.24, 0.6, 0.46, BRN, 0.08);
        for (let k = 0; k < 6; k++) { dot(mb, [fx + s * 0.121, rtop - 0.06 - k * 0.1, rz], [s, 0, 0], 0.42, '#4a3824', 0.02); dot(mb, [fx, rtop - 0.06 - k * 0.1, rz - 0.231], [0, 0, -1], 0.22, '#4a3824', 0.02); }
        // egg-shaped rotor housing far out on its outrigger (+ mast), bronze bands, portholes
        const sy = HY + 0.02, sz = -0.3;
        tube(mb, [s * 0.52, HY + 0.05, sz + 0.05], [s * (SX - 0.22), sy + 0.04, sz], 0.05, 0.045, HUL, 6, false);
        tube(mb, [s * 0.5, HY - 0.15, sz + 0.2], [s * (SX - 0.2), sy - 0.14, sz], 0.022, 0.022, BND, 4, false);
        mb.sphere(s * SX, sy, sz, 0.24, 0.29, 0.24, HUL, 8, 6, true, (i, j) => j === 0 ? HTP : j === 2 || j === 4 ? BND : j === 5 ? BRN : HUL);
        for (let k = 0; k < 4; k++) { const a = -0.9 + k * 0.6; dot(mb, [s * SX + s * C(a) * 0.24, sy + 0.1, sz + S(a) * 0.24], [s * C(a), 0.3, S(a)], 0.05, DKW); }
        mb.prism(s * SX, sy + 0.26, sz, 0.06, 0.04, 0.3, 6, '#6a6460', true, true, false);
      });
      // ---- bridge gondola tucked under the hull: dark glazed nose, side windows, pylon, stabilisers
      const GY = HY - 0.5;
      hull(mb, bandRings([
        { z: -0.45, rx: 0.05, ry: 0.05, y: GY + 0.02 }, { z: -0.25, rx: 0.13, ry: 0.16, y: GY }, { z: 0.2, rx: 0.17, ry: 0.2, y: GY }, { z: 0.72, rx: 0.17, ry: 0.2, y: GY },
        { z: 0.92, rx: 0.14, ry: 0.17, y: GY, color: DKW, band: true }, { z: 1.04, rx: 0.08, ry: 0.1, y: GY, color: DKW, band: true, capColor: DKW },
      ], [0.05, 0.48], HUL, BND, 0.03), { sides: 8, color: HUL, colorsFn: topBot });
      LR(s => { for (let k = 0; k < 4; k++) dot(mb, [s * 0.168, GY + 0.06, -0.1 + k * 0.2], [s, 0.1, 0], 0.07, DKW, 0.05); });
      secLoft(mb, [{ z: 0.0, pts: rrect(0.09, GY + 0.16, HY - 0.2, 0.02, 0.02) }, { z: 0.6, pts: rrect(0.09, GY + 0.16, HY - 0.2, 0.02, 0.02) }], HUL);
      LR(s => { mb.push(); mb.translate(s * 0.14, GY + 0.18, 0); mb.rotate(0, 0, -s * 0.1); mb.translate(-s * 0.14, -(GY + 0.18), 0); slab(mb, [[s * 0.14, 0.8], [s * 0.56, 0.66], [s * 0.58, 0.5], [s * 0.14, 0.4]], GY + 0.16, GY + 0.2, HTP, HBT, HUL); mb.pop(); });
      // ---- propeller shaft trailing from the gondola, turbine shroud
      tube(mb, [0, GY, -0.42], [0, HY - 0.6, -2.34], 0.025, 0.025, WOOD, 5, false);
      mb.push(); mb.translate(0, HY - 0.5, -0.62); mb.rotate(PI / 2, 0, 0); mb.loft([{ y: -0.06, rx: 0.14, rz: 0.14 }, { y: 0.07, rx: 0.16, rz: 0.16 }], { sides: 10, color: '#5a5a5c', capTop: false, capBottom: false }); mb.pop();
    }, { cull: false });
    att(m, 'fan', mb => propeller(mb, 8, 0.14, 0.04, '#8a8a88', null, { pitch: 0.7, hubR: 0.04, simple: true }));
    att(m, 'prop', mb => { propeller(mb, 4, 0.34, 0.07, WOOD, BND, { pitch: 0.45, hubR: 0.05, simple: true }); mb.translate(0, 0.04, 0.95); propeller(mb, 4, 0.3, 0.06, WOOD, null, { pitch: 0.45, hubR: 0.04, phase: 0.4, simple: true }); });
    LR(s => att(m, s > 0 ? 'rotorL' : 'rotorR', mb => rotor(mb, 4, 0.6, 0.08, BLD, '#6a6460', { phase: s > 0 ? 0 : 0.4 })));
    m.rotors = ['rotorL', 'rotorR']; m.props = ['prop', 'fan'];
    m.floats = true;
    m.realSize = [183, 33, 237];
    m.seats = { deck: [0, HY + 0.3, 1.3], bridge: [0, HY - 0.6, 0.5] };
    m.clips = {
      idle: { dur: 90, fn(m, p) { addRot(m, 'rotorL', 1, p * TAU * 3); addRot(m, 'rotorR', 1, -p * TAU * 3); addRot(m, 'prop', 2, p * TAU * 2); addRot(m, 'fan', 2, p * TAU * 3); addPos(m, 'body', 1, S(p * TAU) * 0.03); addRot(m, 'body', 2, S(p * TAU + 0.7) * 0.012); } },
      move: { dur: 60, fn(m, p) { addRot(m, 'rotorL', 1, p * TAU * 8); addRot(m, 'rotorR', 1, -p * TAU * 8); addRot(m, 'prop', 2, p * TAU * 12); addRot(m, 'fan', 2, p * TAU * 12); addPos(m, 'body', 1, S(p * TAU * 2) * 0.02); addRot(m, 'body', 0, 0.03); addRot(m, 'body', 2, -(m.steer || 0) * 0.25); } },
    };
    return m;
  }

  // ================================================================== SUBMARINES (Shinra uV class)
  // Shinra uV-01 (red, the Huge Materia carrier) and uV-02 (dark gunmetal, the playable one) after the
  // design sheet (ref ff7art54: 93.5 x 22.7 m): whale-like bulbous bow tapering to a ducted stern, deck
  // with railings, stepped conning tower with bridge rail and masts, a crane on the aft deck, big swept
  // drooping diving planes, twin tall stern fins carrying the white Shinra-logo panels, paired torpedo
  // tubes on the bow flanks, arched pipes along the belly, blue glow lamps. submarine_gray = uV-02,
  // submarine_red = uV-01. Bones: body, prop. m.waterline = surfaced water height.
  function buildSub(o) {
    const red = o.livery === 'red';
    const m = new FF7.Model();
    const P = red ? { hul: '#c23c36', top: '#d65a50', bot: '#842422', band: '#9a2c28', deck: '#a8302a', fin: '#b43430', mark: '#f0e8e0' }
      : { hul: '#4c4843', top: '#67615a', bot: '#2c2a28', band: '#3a3632', deck: '#57524c', fin: '#48443f', mark: '#e4e0da' };
    const DK = '#161412', MET = '#6a645c', RAIL = red ? '#5a1a18' : '#2a2826', LOGO = red ? '#b01c3c' : '#c02850', LOGO2 = '#6a3aa0';
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('prop', 'body', [0, 0.66, -1.98]);
    const tb = byFace(P.top, P.bot, 0.5);
    att(m, 'body', mb => {
      // bulbous hull: widest near the bow, tapering up into the ducted stern
      hull(mb, bandRings([
        { z: -2.02, rx: 0.09, ry: 0.09, y: 0.7 }, { z: -1.7, rx: 0.16, ry: 0.17, y: 0.69 }, { z: -1.0, rx: 0.26, ry: 0.29, y: 0.65 }, { z: -0.2, rx: 0.4, ry: 0.44, y: 0.6 },
        { z: 0.6, rx: 0.54, ry: 0.6, y: 0.6 }, { z: 1.3, rx: 0.55, ry: 0.6, y: 0.6 }, { z: 1.75, rx: 0.46, ry: 0.5, y: 0.6 }, { z: 2.02, rx: 0.3, ry: 0.32, y: 0.6 }, { z: 2.14, rx: 0.09, ry: 0.09, y: 0.6 },
      ], [-1.3, -0.5, 0.25, 1.0], P.hul, P.band, 0.035), { sides: 12, color: P.hul, colorsFn: tb });
      // deck + railings
      slab(mb, [[0, 1.55], [0.17, 1.3], [0.17, -1.35], [0, -1.55], [-0.17, -1.35], [-0.17, 1.3]], 0.99, 1.04, P.deck, P.bot, P.band);
      LR(s => {
        for (let k = 0; k < 9; k++) tube(mb, [s * 0.165, 1.04, -1.3 + k * 0.32], [s * 0.165, 1.14, -1.3 + k * 0.32], 0.008, 0.008, RAIL, 3, false);
        tube(mb, [s * 0.165, 1.14, -1.3], [s * 0.165, 1.14, 1.26], 0.01, 0.01, RAIL, 3, false);
      });
      // stepped conning tower with bridge rail, ladder rungs, windows, masts
      mb.loft([{ y: 1.0, rx: 0.2, rz: 0.36, z: 0.42 }, { y: 1.3, rx: 0.19, rz: 0.33, z: 0.42 }, { y: 1.33, rx: 0.14, rz: 0.24, z: 0.5, color: P.band }, { y: 1.34, rx: 0.14, rz: 0.24, z: 0.5 }, { y: 1.62, rx: 0.13, rz: 0.22, z: 0.52 }], { sides: 10, color: P.hul, capBottom: false });
      mb.loft([{ y: 1.62, rx: 0.15, rz: 0.24, z: 0.52 }, { y: 1.7, rx: 0.15, rz: 0.24, z: 0.52 }], { sides: 10, color: RAIL, capTop: false, capBottom: false });
      for (let k = 0; k < 4; k++) dot(mb, [0, 1.06 + k * 0.07, 0.78], [0, 0, 1], 0.1, P.band, 0.02);
      [-0.08, 0.08].forEach(x => dot(mb, [x, 1.46, 0.733], [x * 3, 0, 1], 0.07, DK, 0.05));
      LR(s => dot(mb, [s * 0.196, 1.14, 0.42], [s, 0, 0], 0.16, P.mark, 0.14));
      tube(mb, [0.02, 1.62, 0.44], [0.02, 2.05, 0.44], 0.018, 0.012, MET, 4, false);
      tube(mb, [-0.05, 1.62, 0.56], [-0.05, 1.86, 0.56], 0.022, 0.018, MET, 4, false);
      cbox(mb, -0.05, 1.88, 0.58, 0.05, 0.05, 0.08, MET, 0.3);
      // crane on the aft deck
      mb.prism(0, 1.04, -0.95, 0.07, 0.06, 0.14, 6, P.band, true, true, false);
      tube(mb, [0, 1.16, -0.95], [0, 1.5, -0.45], 0.03, 0.022, MET, 4);
      tube(mb, [0, 1.5, -0.45], [0, 1.08, -0.4], 0.005, 0.005, DK, 3, false);
      // paired torpedo tubes on the bow flanks, portholes, belly pipes
      LR(s => {
        [0.34, 0.52].forEach(y => { tube(mb, [s * 0.42, y, 1.2], [s * 0.4, y, 1.68], 0.07, 0.07, MET, 6, false); dot(mb, [s * 0.4, y, 1.682], [0, 0, 1], 0.1, DK); });
        for (let k = 0; k < 3; k++) dot(mb, [s * 0.53, 0.8, 0.45 + k * 0.3], [s, 0.25, 0], 0.08, DK);
        [-0.55, -0.25].forEach(z => mb.sweep([[s * 0.28, 0.2, z + 0.12], [s * 0.4, 0.06, z + 0.08], [s * 0.46, 0.04, z - 0.04], [s * 0.36, 0.14, z - 0.12]], 0.035, { sides: 4, color: MET }));
      });
      // big swept diving planes, drooping
      LR(s => {
        mb.push(); mb.translate(s * 0.36, 0.42, 0); mb.rotate(0, 0, -s * 0.5); mb.translate(-s * 0.36, -0.42, 0);
        slab(mb, [[s * 0.34, 0.7], [s * 1.2, -0.7], [s * 1.24, -0.98], [s * 0.36, -0.12]], 0.4, 0.45, P.top, P.bot, P.band);
        for (let k = 1; k < 4; k++) { const t = k / 4; dot(mb, [s * (0.35 + 0.86 * t), 0.452, 0.29 - 1.12 * t], [0, 1, 0], 0.02, P.band, 0.36); }
        mb.pop();
      });
      // twin tall stern fins with the Shinra logo panels + duct ring around the screw
      LR(s => {
        const fx = s * 0.34;
        fin(mb, [[-1.42, 0.3], [-1.9, 0.26], [-2.06, 0.62], [-1.94, 1.3], [-1.66, 1.34]], fx, 0.05, P.fin);
        fin(mb, [[-1.48, 0.3], [-1.9, 0.26], [-1.98, -0.02], [-1.7, 0.02]], fx, 0.05, P.fin);
        [1, -1].forEach(f => { sidePoly(mb, f, [[-1.64, 0.82], [-1.92, 0.82], [-1.92, 1.12], [-1.64, 1.12]], fx + f * 0.028, P.mark); sidePoly(mb, f, [[-1.7, 0.97], [-1.78, 0.88], [-1.86, 0.97], [-1.78, 1.06]], fx + f * 0.031, LOGO); sidePoly(mb, f, [[-1.73, 0.97], [-1.78, 0.92], [-1.83, 0.97], [-1.78, 1.02]], fx + f * 0.034, LOGO2); });
        tube(mb, [0, 0.66, -1.72], [fx, 0.7, -1.74], 0.04, 0.04, P.band, 4, false);
      });
      mb.push(); mb.translate(0, 0.66, -1.98); mb.rotate(PI / 2, 0, 0); mb.loft([{ y: -0.12, rx: 0.27, rz: 0.27 }, { y: 0.1, rx: 0.3, rz: 0.3 }], { sides: 10, color: P.band, capTop: false, capBottom: false }); mb.pop();
    }, { cull: false });
    glow(m, 'body', mb => { dot(mb, [0, 0.07, 1.4], [0, -1, 0.4], 0.14, '#6a86ff'); LR(s => dot(mb, [s * 0.5, 0.26, -0.1], [s * 0.3, -1, 0], 0.1, '#6a86ff')); dot(mb, [0.02, 2.06, 0.44], [0, 0, 1], 0.03, '#ff4030'); });
    att(m, 'prop', mb => propeller(mb, 5, 0.25, 0.09, '#8a7a50', '#5a5650', { pitch: 0.6, hubR: 0.06, spinLen: 1.5, simple: true }));
    m.props = ['prop'];
    m.waterline = 0.9;
    m.realSize = [22.7, 11, 93.5];
    m.clips = {
      idle: { dur: 90, fn(m, p) { addRot(m, 'prop', 2, p * TAU * 2); addPos(m, 'body', 1, S(p * TAU) * 0.02); addRot(m, 'body', 2, S(p * TAU + 1) * 0.015); } },
      move: { dur: 40, fn(m, p) { addRot(m, 'prop', 2, p * TAU * 10); addPos(m, 'body', 1, S(p * TAU) * 0.012); addRot(m, 'body', 0, S(p * TAU) * 0.012); addRot(m, 'body', 2, -(m.steer || 0) * 0.2); } },
    };
    return m;
  }

  // ================================================================== SHINRA HELICOPTER (Shin-Ra B1A)
  // The Shinra multipurpose helicopter B1A (ref ff7art48/49 + in-game field model: 9.14 x 3.05 x 2.89 m,
  // field scale): stubby round silver-white pod with the big royal-blue glazed canopy and dark navy nose,
  // twin fog lamps under the nose, raised engine housing with vent grille and the gold rotor head, curly
  // brass exhaust pipes, the round turbine intake on the right flank, slim tail boom with the Shinra-logo
  // fin, 2-blade main and tail rotors, skids, pink marker lights. opts.cargo: the B1-beta with the
  // side cargo shells. Bones: body, rotor, tailRotor.
  function buildHeli(o) {
    const m = new FF7.Model();
    const SIL = '#d4d4d8', SLT = '#eaeaee', SDK = '#8a8c92', GL = '#3848c4', GLL = '#5a6ad8', NOSE = '#1c2a58', BRASS = '#8a5a28', GOLD = '#c8a040', ROT = '#2e2e32', SK = '#b8bac0', PINK = '#ff5aa0', DK = '#202226';
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('rotor', 'body', [0, 1.9, -0.05]);
    m.bone('tailRotor', 'body', [-0.1, 1.55, -3.66]);
    const tb = byFace(SLT, SDK, 0.55);
    const glass = (lim, low) => (i, n) => { const a = PI / n + (i + 0.5) * TAU / n, cy = -S(a); return cy > lim ? (cy > 0.7 ? GL : GLL) : low; };
    att(m, 'body', mb => {
      hull(mb, [
        { z: -0.88, rx: 0.3, ry: 0.35, y: 1.0 }, { z: -0.55, rx: 0.55, ry: 0.58, y: 0.98 }, { z: 0.1, rx: 0.62, ry: 0.62, y: 0.95, colors: glass(0.05, SIL) },
        { z: 0.8, rx: 0.58, ry: 0.58, y: 0.9, colors: glass(-0.35, NOSE) }, { z: 1.3, rx: 0.42, ry: 0.44, y: 0.85, color: NOSE, band: true }, { z: 1.6, rx: 0.16, ry: 0.18, y: 0.8, capColor: NOSE },
      ], { sides: 12, color: SIL, colorsFn: tb });
      // engine housing with vent grille, rotor mast + gold head
      cbox(mb, 0, 1.64, -0.2, 0.64, 0.3, 1.0, SIL, 0.25);
      dot(mb, [0, 1.66, 0.305], [0, 0, 1], 0.4, DK, 0.2);
      for (let k = 0; k < 4; k++) dot(mb, [0, 1.59 + k * 0.045, 0.308], [0, 0, 1], 0.38, SDK, 0.012);
      mb.prism(0, 1.78, -0.05, 0.08, 0.07, 0.1, 6, SDK, true, true, false);
      // curly brass exhausts
      LR(s => mb.sweep([[s * 0.2, 1.68, -0.6], [s * 0.34, 1.86, -0.82], [s * 0.46, 1.66, -1.02], [s * 0.42, 1.36, -1.06], [s * 0.3, 1.24, -0.92]], 0.09, { sides: 6, color: BRASS }));
      // turbine intake on the right flank
      mb.push(); mb.translate(-0.56, 1.08, -0.38); mb.rotate(0, 0, PI / 2);
      mb.prism(0, 0, 0, 0.32, 0.3, 0.14, 10, SDK, true, true, false);
      mb.pop();
      dot(mb, [-0.705, 1.08, -0.38], [-1, 0, 0], 0.38, DK, 0.38);
      for (let k = 0; k < 3; k++) dot(mb, [-0.708, 1.08, -0.38], [-1, 0, 0], 0.4, '#5a5c62', 0.04 + k * 0.001);
      // tail boom, logo fin, stabiliser
      tube(mb, [0, 1.02, -0.75], [0, 1.22, -3.6], 0.2, 0.09, SIL, 8);
      fin(mb, [[-3.2, 1.16], [-3.78, 1.2], [-3.88, 1.88], [-3.62, 1.88]], 0, 0.05, SIL);
      fin(mb, [[-3.4, 1.14], [-3.76, 1.14], [-3.8, 0.86], [-3.6, 0.86]], 0, 0.04, SIL);
      [1, -1].forEach(f => { sidePoly(mb, f, [[-3.5, 1.4], [-3.76, 1.4], [-3.78, 1.66], [-3.52, 1.66]], f * 0.028, '#f0eeea'); sidePoly(mb, f, [[-3.55, 1.53], [-3.64, 1.44], [-3.73, 1.53], [-3.64, 1.62]], f * 0.031, '#c02030'); });
      slab(mb, [[0, -2.95], [0.46, -3.08], [0.46, -3.26], [-0.46, -3.26], [-0.46, -3.08]], 1.12, 1.16, SLT, SDK, SDK);
      // skids + struts
      LR(s => {
        pipe(mb, [[s * 0.72, 0.05, -0.75], [s * 0.72, 0.05, 0.95], [s * 0.72, 0.2, 1.18]], 0.035, SK, 5);
        [-0.45, 0.55].forEach(z => tube(mb, [s * 0.72, 0.05, z], [s * 0.38, 0.46, z * 0.9], 0.03, 0.03, SK, 4, false));
      });
      if (o.cargo) LR(s => {
        cbox(mb, s * 0.98, 0.9, 0.0, 0.56, 0.78, 1.9, '#a4a6ac', 0.12);
        for (let k = 0; k < 3; k++) dot(mb, [s * 1.262, 1.02, -0.55 + k * 0.55], [s, 0, 0], 0.32, '#3a4a6a', 0.26);
        tube(mb, [s * 0.5, 1.2, -0.4], [s * 0.72, 1.2, -0.4], 0.05, 0.05, SDK, 4, false); tube(mb, [s * 0.5, 1.2, 0.5], [s * 0.72, 1.2, 0.5], 0.05, 0.05, SDK, 4, false);
      });
    });
    glow(m, 'body', mb => {
      LR(s => { lampLens(mb, s * 0.13, 0.64, 1.5, 0.08, '#fff4c0', 8); dot(mb, [s * 0.6, 1.3, 0.35], [s, 0.3, 0.3], 0.05, PINK); });
      dot(mb, [0, 1.9, -3.75], [0, 0, -1], 0.05, PINK); dot(mb, [0, 0.36, 0.2], [0, -1, 0], 0.06, PINK);
    });
    att(m, 'body', mb => LR(s => lampHousing(mb, s * 0.13, 0.64, 1.5, 0.08, SDK, 0.06, 8)));
    att(m, 'rotor', mb => { rotor(mb, 2, 2.3, 0.2, ROT, null, { droop: 0.02, tip: '#c02828' }); mb.prism(0, -0.06, 0, 0.12, 0.02, 0.2, 6, GOLD, true); });
    att(m, 'tailRotor', mb => { mb.rotate(0, PI / 2, 0); propeller(mb, 2, 0.42, 0.08, ROT, GOLD, { pitch: 0.4, hubR: 0.05, simple: true }); });
    m.rotors = ['rotor'];
    m.realSize = [o.cargo ? 4.32 : 3.05, 2.89, 9.14];
    m.seats = { pilot: [-0.2, 0.62, 0.8], copilot: [0.2, 0.62, 0.8], cabin: [0, 0.5, -0.2] };
    m.clips = {
      idle: { dur: 30, fn(m, p) { addRot(m, 'rotor', 1, p * TAU * 2); addRot(m, 'tailRotor', 0, p * TAU * 5); } },
      move: { dur: 30, fn(m, p) { addRot(m, 'rotor', 1, p * TAU * 5); addRot(m, 'tailRotor', 0, p * TAU * 10); addRot(m, 'body', 0, 0.12); addPos(m, 'body', 1, S(p * TAU) * 0.02); addRot(m, 'body', 2, -(m.steer || 0) * 0.3); } },
    };
    return m;
  }

  // ================================================================== GELNIKA
  // Shinra's transport unit Gelnika after the design sheet (ref ff7art46): desert-camouflage (white with
  // tan/brown blotches) lifting-body hull - wide flat-bottomed trapezoid section with a dark belly and a
  // bulbous nose with the blue cockpit glazing - a high straight wing whose tips turn up into tall
  // vertical panels (the "variable wing"), four RG24 engines sitting on top of the wing with 4-blade
  // orange-tipped props, a tall swept tail fin with swept stabilisers, twin-wheel landing gear.
  // opts.sunken: the wreck on the sea floor (faded blue-green, tilted, broken right wing tip, bent props).
  function buildGelnika(o) {
    const sunk = !!o.sunken;
    const m = new FF7.Model();
    const tint = (c) => sunk ? mix(sh(c, -0.3), '#2e5a5a', 0.45) : c;
    const WHT = tint('#e2e0d8'), BLT = tint('#f2f0ea'), BEL = tint('#3a3836'), CB1 = tint('#a07038'), CB2 = tint('#6e4a24'), GL = tint('#2c4ca8'), GLL = tint('#6a8ad8'), ENG = tint('#8a6a3a'), PR = tint('#2a2a2a'), ORG = '#f06020';
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0], sunk ? [0.05, 0, 0.1] : null);
    const PX = [1.85, 0.95, -0.95, -1.85], EY = 1.98;
    PX.forEach((x, k) => m.bone('prop' + k, 'body', [x, EY, 1.6], sunk ? [0, 0, k * 0.7] : null));
    att(m, 'body', mb => {
      const v0 = mb.vertexCount;
      // hull sections (edges: 0 belly chamfer, 1 lower side, 2 upper side, 3 shoulder, 4 top, 5-7 left, 8 chamfer, 9 belly)
      const base = [[0.75, 0], [0.95, 0.2], [0.82, 0.62], [0.52, 0.92], [0.36, 1.3], [-0.36, 1.3], [-0.52, 0.92], [-0.82, 0.62], [-0.95, 0.2], [-0.75, 0]];
      const sec = (z, sx, yb, yt) => ({ z, pts: base.map(p => [p[0] * sx, yb + p[1] / 1.3 * (yt - yb)]) });
      const F = secFine([sec(-3.1, 0.14, 1.28, 1.62), sec(-2.5, 0.42, 0.95, 1.64), sec(-1.6, 0.86, 0.36, 1.64), sec(-0.6, 1.0, 0.2, 1.64), sec(1.4, 1.0, 0.2, 1.64), sec(2.3, 0.86, 0.27, 1.52), sec(2.85, 0.6, 0.4, 1.32), sec(3.12, 0.2, 0.58, 1.02)], 0.62, 2);
      secLoft(mb, F.secs, (k, i) => { const e = F.map(i); return (e === 9 || e === 0 || e === 8) ? BEL : e === 4 ? BLT : WHT; }, { capFrontCol: WHT, capBackCol: WHT });
      cbox(mb, 0, 1.7, 1.95, 0.62, 0.22, 0.8, WHT, 0.25);
      // high wing with the upturned tip panels (right tip broken off on the wreck)
      LR(s => {
        const tipX = sunk && s < 0 ? 2.3 : 3.0;
        slabStrips(mb, [[s * 0.3, 1.38], [s * tipX, 1.16], [s * tipX, 0.44], [s * 0.3, 0.22]], 1.56, 1.66, 4, BLT, WHT, WHT);
        if (!(sunk && s < 0)) [[1.6, 2.1], [2.1, 2.6], [2.6, 3.08]].forEach(([y0, y1]) => { const zf = (y) => 1.16 - (y - 1.6) * 0.15, zb = (y) => 0.44 + (y - 1.6) * 0.06; fin(mb, [[zf(y0), y0], [zb(y0), y0], [zb(y1), y1], [zf(y1), y1]], s * (tipX + 0.03), 0.08, WHT); });
      });
      // tall swept fin + stabilisers
      [[1.58, 2.12], [2.12, 2.66], [2.66, 3.2]].forEach(([y0, y1]) => { const zf = (y) => -1.65 - (y - 1.58) * 0.698, zb = (y) => -3.06 - (y - 1.58) * 0.099; fin(mb, [[zf(y0), y0], [zb(y0), y0], [zb(y1), y1], [zf(y1), y1]], 0, 0.1, WHT); });
      LR(s => slabStrips(mb, [[0, -2.2], [s * 1.52, -2.72], [s * 1.56, -3.08], [0, -3.08]], 1.44, 1.52, 3, BLT, WHT, WHT));
      // four engines on top of the wing (pylons, nacelles, exhaust stubs)
      PX.forEach(x => {
        mb.box(x, 1.76, 0.6, 0.12, 0.2, 0.7, ENG);
        hull(mb, [{ z: 0.0, rx: 0.08, ry: 0.08, x, y: EY }, { z: 0.25, rx: 0.2, ry: 0.21, x, y: EY }, { z: 1.2, rx: 0.3, ry: 0.31, x, y: EY }, { z: 1.48, rx: 0.24, ry: 0.24, x, y: EY, capColor: '#3a3024' }], { sides: 8, color: ENG, colorsFn: byFace(sh(ENG, 0.2), sh(ENG, -0.3)) });
        LR(t => tube(mb, [x + t * 0.14, EY + 0.18, 0.6], [x + t * 0.2, EY + 0.36, 0.5], 0.035, 0.03, '#4a3a24', 4));
      });
      camo(mb, v0, WHT, [CB1, CB2], 2.6, 1.7);
      // cockpit glazing, nose lamp housing, side windows (drawn after the camo so they stay clean)
      dot(mb, [0, 1.76, 2.352], [0, 0.3, 1], 0.52, GL, 0.12);
      LR(s => { dot(mb, [s * 0.312, 1.72, 1.95], [s, 0, 0], 0.5, GL, 0.1); for (let k = 0; k < 4; k++) dot(mb, [s * 0.83, 0.92, 1.0 - k * 0.5], [s, 0.3, 0], 0.16, GLL, 0.1); });
      dot(mb, [0, 1.52, 2.64], [0, 0.6, 1], 0.4, GL, 0.1);
      // twin-wheel landing gear
      if (!sunk) [[0.45, 1.4], [-0.45, 1.4], [0.5, -0.7], [-0.5, -0.7]].forEach(([x, z]) => { tube(mb, [x, 0.3, z], [x, 0.14, z], 0.035, 0.035, '#2a2a2a', 4, false); LR(t => { mb.push(); mb.translate(x + t * 0.09, 0.13, z); wheel(mb, 0.13, 0.08, '#1e1e1e', '#5a5a5a', { flat: true, sides: 7 }); mb.pop(); }); });
    });
    glow(m, 'body', mb => { dot(mb, [0, 0.82, 3.1], [0, 0, 1], 0.12, sunk ? '#304040' : '#ff5020'); PX.forEach(x => dot(mb, [x, EY + 0.285, 0.9], [0, 1, 0], 0.06, sunk ? '#304040' : ORG)); });
    const pm = meshOf(mb => propeller(mb, 4, 0.44, 0.1, PR, ENG, { pitch: sunk ? 0.95 : 0.45, hubR: 0.09, tip: sunk ? null : ORG }));
    PX.forEach((x, k) => m.attach('prop' + k, pm));
    m.props = sunk ? [] : ['prop0', 'prop1', 'prop2', 'prop3'];
    if (sunk) m.keepY = true;
    m.clips = sunk ? { idle: { dur: 120, fn() {} }, move: { dur: 120, fn() {} } } : {
      idle: { dur: 30, fn(m, p) { m.props.forEach(n => addRot(m, n, 2, p * TAU * 3)); } },
      move: { dur: 30, fn(m, p) { m.props.forEach(n => addRot(m, n, 2, p * TAU * 10)); addPos(m, 'body', 1, S(p * TAU) * 0.02); addRot(m, 'body', 2, -(m.steer || 0) * 0.3); } },
    };
    return m;
  }

  // ================================================================== SHINRA No. 26 (Rocket Town)
  // The rocket as Rocket Town shows it (ff7shot_09-rockettown01/06/07/14): a leaning cluster - core stack
  // with four tall strap-on boosters - in weathered green camouflage with rust streaks, orange/black hazard
  // bands and the vertical "SHIN-RA" lettering, clustered engine bells, the needle nose; three rusty-green
  // lattice gantry towers with crane jibs on top, the right one holding the leaning rocket with service
  // arms; octagonal concrete pad with the flame trench, tanks and pipework. opts.upright: stands straight.
  // Clips: idle, move (engines lit in place), launch (lift-off along its axis). Bones: pad, rocket, flame.
  function buildRocket(o) {
    const m = new FF7.Model();
    const GRN = '#5a8a3a', GDK = '#3a5a26', GLT = '#76a64e', RUST = '#a07040', HZO = '#e08a20', HZK = '#1e1e1e', CON = '#8a857a', CONT = '#a39e92', DK = '#2e2e32', TWR = '#4e6a36', CRM = '#e0d8b8';
    const tilt = o.upright ? [0, 0, 0] : [-0.05, 0, -0.2];
    m.bone('root', null, [0, 0, 0]);
    m.bone('pad', 'root', [0, 0, 0]);
    m.bone('rocket', 'pad', [0, 0.3, 0], tilt);
    m.bone('flame', 'rocket', [0, 0, 0]);
    const RM = FF7.M4.trs(FF7.M4.create(), [0, 0.3, 0], tilt, [1, 1, 1]);
    const ax = FF7.M4.transformPoint(FF7.M4.trs(FF7.M4.create(), [0, 0, 0], tilt, [1, 1, 1]), [0, 1, 0]);
    const onRocket = (p) => FF7.M4.transformPoint(RM, p);
    const vloft = (mb, rings, sides, opts) => mb.loft(rings.map(r => ({ y: r.y, rx: r.r, rz: r.r, x: r.x || 0, z: r.z || 0, color: r.color, colors: r.colors })), Object.assign({ sides: sides || 10, color: GRN }, opts || {}));
    const hazard = (i) => i % 2 ? HZO : HZK;
    // pad: octagonal slab, flame trench, clamps, tanks with pipework, three gantry towers with jibs
    att(m, 'pad', mb => {
      const oct = []; for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU; oct.push([C(a) * 3.6, S(a) * 3.6]); }
      slab(mb, oct, 0, 0.3, CONT, CON, CON);
      dot(mb, [0, 0.302, 0], [0, 1, 0], 1.8, DK, 1.8);
      dot(mb, [0, 0.303, 0], [0, 1, 0], 3.8, '#4a4640', 0.5);
      [[-2.6, 2.4], [2.4, 2.3]].forEach(([x, z]) => { mb.sphere(x, 0.8, z, 0.48, 0.5, 0.48, '#7a8a5a', 7, 5, true); tube(mb, [x, 0.3, z], [x, 0.4, z], 0.32, 0.32, DK, 6, false); mb.sweep([[x, 0.6, z], [x * 0.6, 0.45, z * 0.6], [x * 0.35, 0.5, z * 0.3]], 0.1, { sides: 5, color: RUST }); });
      const v0 = mb.vertexCount;
      [[-2.6, 0.9, 9.6, 1], [-0.9, -2.5, 9.0, -1], [3.7, -0.4, 7.4, 1]].forEach(([x, z, h, d]) => {
        lattice(mb, x, z, 0.72, 0.3, h, 6, TWR, 0.06, [3, 0]);
        tube(mb, [x, h, z], [x + d * 0.7, h + 0.9, z + 0.6], 0.06, 0.05, TWR, 4);
        tube(mb, [x + d * 0.7, h + 0.9, z + 0.6], [x + d * 0.9, h + 0.2, z + 0.75], 0.008, 0.008, DK, 3, false);
        tube(mb, [x, h, z], [x - d * 0.35, h + 0.4, z - 0.3], 0.05, 0.05, TWR, 4, false);
        mb.box(x, h + 0.05, z, 0.5, 0.18, 0.5, '#5a4a30');
      });
      // service arms from the right tower to the leaning rocket
      [5.0, 7.0].forEach(hh => { const p = onRocket([1.55, hh, 0]); const y = p[1]; slab(mb, [[p[0], -0.2], [3.34, -0.2], [3.34, 0.2], [p[0], 0.2]], y - 0.08, y, '#5a5a3a', TWR, TWR); tube(mb, [3.34, y + 0.5, 0], [p[0] + 0.1, y, 0], 0.03, 0.03, TWR, 3, false); });
      camo(mb, v0, TWR, [RUST, '#2e4020'], 1.1, 4.1);
    });
    // rocket body (camouflaged), then clean hazard bands, lettering and the red logo plate
    att(m, 'rocket', mb => {
      for (let k = 0; k < 4; k++) { const a = (k + 0.5) / 4 * TAU; mb.prism(C(a) * 0.42, 0.02, S(a) * 0.42, 0.32, 0.18, 0.55, 8, DK, true, false, true); }
      const v0 = mb.vertexCount;
      vloft(mb, [{ y: 0.55, r: 0.86 }, { y: 0.7, r: 0.95 }, { y: 6.9, r: 0.95 }, { y: 7.3, r: 0.78 }, { y: 9.2, r: 0.72 }, { y: 9.4, r: 0.6 }, { y: 10.3, r: 0.3 }, { y: 10.9, r: 0.1 }, { y: 11.1, r: 0.03 }], 10, { capBottom: true });
      for (let k = 0; k < 4; k++) {
        const a = k / 4 * TAU + PI / 4, bx = C(a) * 1.22, bz = S(a) * 1.22;
        vloft(mb, [{ y: 0.3, r: 0.3, x: bx, z: bz }, { y: 0.45, r: 0.38, x: bx, z: bz }, { y: 6.7, r: 0.38, x: bx, z: bz }, { y: 7.5, r: 0.2, x: bx, z: bz }, { y: 8.0, r: 0.04, x: bx, z: bz }], 8, { capTop: false });
      }
      camo(mb, v0, GRN, [RUST, GDK], 0.9, 2.3);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + PI / 4, bx = C(a) * 1.22, bz = S(a) * 1.22; mb.prism(bx, 0.0, bz, 0.26, 0.16, 0.32, 6, DK, true, false, true); vloft(mb, [{ y: 2.0, r: 0.39, x: bx, z: bz, colors: hazard }, { y: 2.22, r: 0.39, x: bx, z: bz }], 12, { capTop: false, capBottom: false }); }
      [[3.0, 0.96], [6.3, 0.96], [8.6, 0.73]].forEach(([y, r]) => vloft(mb, [{ y, r, colors: hazard }, { y: y + 0.26, r }], 12, { capTop: false, capBottom: false }));
      for (let k = 0; k < 7; k++) dot(mb, [0, 5.9 - k * 0.38, 0.962], [0, 0, 1], 0.26, CRM, 0.24);
      dot(mb, [0.962, 4.6, 0], [1, 0, 0], 0.6, '#c02a24', 0.8); dot(mb, [0.966, 4.6, 0], [1, 0, 0], 0.3, '#f0ece0', 0.4);
      tube(mb, [0, 11.05, 0], [0, 11.9, 0], 0.035, 0.01, '#6a6e64', 4);
    });
    m.attach('flame', meshOf(mb => {
      for (let k = 0; k < 4; k++) { const a = (k + 0.5) / 4 * TAU, x = C(a) * 0.42, z = S(a) * 0.42; mb.prism(x, -2.4, z, 0.04, 0.3, 2.4, 6, '#ff8020', false, false, false); mb.prism(x, -1.2, z, 0.02, 0.17, 1.22, 6, '#fff0a0', false, false, false); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + PI / 4; mb.prism(C(a) * 1.22, -1.6, S(a) * 1.22, 0.03, 0.24, 1.6, 6, '#ff9030', false, false, false); }
    }, { unlit: true, blend: 'add' }), null, { cull: false });
    m.bones.flame.visible = false;
    const fire = (m, t, k) => { m.bones.flame.visible = true; const f = 1 + S(t * 1.7) * 0.12 + S(t * 3.1) * 0.08; m.bones.flame.scl[1] = f * k; m.bones.flame.scl[0] = m.bones.flame.scl[2] = 1 + S(t * 2.3) * 0.05; };
    m.clips = {
      idle: { dur: 60, fn(m) { m.bones.flame.visible = false; } },
      move: { dur: 60, fn(m, p, t) { fire(m, t, 1); addRot(m, 'rocket', 2, S(t * 3.7) * 0.002); } },
      launch: { dur: 300, loop: false, fn(m, p, t) { fire(m, t, 1.3); const e = p * p * 40; const r = m.bones.rocket; r.pos[0] += ax[0] * e; r.pos[1] += ax[1] * e; r.pos[2] += ax[2] * e; addRot(m, 'rocket', 2, S(t * 3.7) * 0.003 * (1 - p)); } },
    };
    m.anims = { launch: 'launch' };
    return m;
  }

  // ================================================================== CARGO SHIP (Junon - Costa del Sol)
  // The cargo ship as the world map shows it (ff7shot_05-cargo01/02): grey hull with raised bulwarks
  // capped in olive-yellow, a raised pointed forecastle, two huge olive-yellow arch gantries straddling
  // the deck with orange-decked tops and spike masts, the orange cargo hold with crates between them,
  // and the stern deckhouse with its orange railed roof and mast. ~8.2 units long, keel on y = 0,
  // m.waterline = 0.52. Bones: hull, radar.
  function buildShip() {
    const m = new FF7.Model();
    const HUL = '#9a9ea2', HLT = '#b4b8ba', HDK = '#5a5e62', DECK = '#bcbeb8', TRIM = '#bab244', OLV = '#b0aa56', OLT = '#cec872', ODK = '#7e7a3c', ORG = '#d87a28', ODD = '#a85a1a', GBX = '#7a8a70', DK = '#2a2a2a';
    m.bone('root', null, [0, 0, 0]);
    m.bone('hull', 'root', [0, 0, 0]);
    m.bone('radar', 'hull', [0, 2.62, -3.55]);
    att(m, 'hull', mb => {
      const sec = (z, w, yd, yk) => ({ z, pts: [[0.55 * w, yk], [0.92 * w, yk + 0.12], [w, Math.max(0.4, yk + 0.2)], [w, yd], [-w, yd], [-w, Math.max(0.4, yk + 0.2)], [-0.92 * w, yk + 0.12], [-0.55 * w, yk]] });
      secLoft(mb, [sec(-4.0, 0.7, 1.3, 0.24), sec(-3.5, 0.8, 1.24, 0.04), sec(-2.0, 0.84, 1.2, 0), sec(1.6, 0.84, 1.2, 0), sec(2.8, 0.7, 1.26, 0.02), sec(3.6, 0.38, 1.42, 0.14), sec(4.12, 0.03, 1.52, 0.5)],
        (k, i) => i === 3 ? DECK : (i === 2 || i === 4) ? HUL : HDK, { capBackCol: HUL, capFrontCol: HUL });
      // bulwarks with the olive-yellow cap rail
      LR(s => {
        const pts = [[-3.95, 0.7], [-3.5, 0.8], [1.6, 0.84], [2.8, 0.7], [3.6, 0.38], [4.1, 0.04]];
        for (let k = 0; k < pts.length - 1; k++) {
          const [z0, w0] = pts[k], [z1, w1] = pts[k + 1], y0 = k === 0 ? 1.28 : k >= 3 ? 1.26 + (k - 3) * 0.14 : 1.22, y1 = y0 + 0.24;
          fin(mb, [[z0, y0], [z1, y0], [z1, y1], [z0, y1]], s * (w0 + w1) / 2 - s * 0.02, 0.04, HLT);
          fin(mb, [[z0, y1], [z1, y1], [z1, y1 + 0.05], [z0, y1 + 0.05]], s * (w0 + w1) / 2 - s * 0.02, 0.07, TRIM);
        }
      });
      // raised forecastle
      slab(mb, [[0, 4.05], [0.34, 3.6], [0.66, 2.85], [-0.66, 2.85], [-0.34, 3.6]], 1.3, 1.46, DECK, HDK, HUL);
      tube(mb, [-0.64, 1.54, 2.86], [0.64, 1.54, 2.86], 0.02, 0.02, TRIM, 3, false);
      // cargo hold: orange floor, crates
      slab(mb, [[-0.56, -1.7], [0.56, -1.7], [0.56, 2.5], [-0.56, 2.5]], 1.2, 1.23, ORG, ODD, ODD);
      [[-0.3, 1.25, 0.2], [0.25, 0.9, 0.16], [0.35, 1.35, 0.14], [-0.25, -0.2, 0.18], [0.3, -1.0, 0.2]].forEach(([x, z, h]) => cbox(mb, x, 1.23 + h / 2, z, h * 1.1, h, h * 1.1, ORG, 0.1));
      cbox(mb, 0.3, 1.36, -1.8, 0.3, 0.26, 0.3, GBX, 0.1);
      // two arch gantries with orange platforms and spike masts
      [1.75, -0.5].forEach(z => {
        LR(s => { mb.frustum(s * 0.66, 1.2, z, 0.34, 0.5, 0.26, 0.38, 1.7, { top: OLT, bottom: ODK, front: OLV, back: ODK, left: s > 0 ? OLV : OLT, right: s > 0 ? OLT : OLV }); });
        cbox(mb, 0, 3.0, z, 1.72, 0.2, 0.42, OLV, 0.1);
        slab(mb, [[-0.88, z - 0.25], [0.88, z - 0.25], [0.88, z + 0.25], [-0.88, z + 0.25]], 3.1, 3.14, ORG, ODK, ODD);
        LR(s => tube(mb, [s * 0.86, 3.2, z - 0.23], [s * 0.86, 3.2, z + 0.23], 0.012, 0.012, TRIM, 3, false));
        tube(mb, [-0.86, 3.2, z + 0.24], [0.86, 3.2, z + 0.24], 0.012, 0.012, TRIM, 3, false); tube(mb, [-0.86, 3.2, z - 0.24], [0.86, 3.2, z - 0.24], 0.012, 0.012, TRIM, 3, false);
        mb.prism(0, 3.14, z, 0.07, 0.0, 1.0, 5, OLV, true);
      });
      // stern deckhouse with orange railed roof, mast
      slab(mb, [[-0.62, -3.9], [0.62, -3.9], [0.66, -2.55], [-0.66, -2.55]], 1.2, 1.7, HLT, HDK, HUL);
      slab(mb, [[-0.66, -3.94], [0.66, -3.94], [0.7, -2.5], [-0.7, -2.5]], 1.7, 1.76, ORG, ODD, ODD);
      LR(s => tube(mb, [s * 0.68, 1.84, -3.92], [s * 0.68, 1.84, -2.52], 0.012, 0.012, TRIM, 3, false));
      tube(mb, [-0.68, 1.84, -2.52], [0.68, 1.84, -2.52], 0.012, 0.012, TRIM, 3, false);
      for (let k = 0; k < 4; k++) dot(mb, [-0.45 + k * 0.3, 1.5, -2.545], [0, 0, 1], 0.16, '#2a3440', 0.12);
      cbox(mb, 0.2, 1.88, -3.3, 0.24, 0.24, 0.24, ORG, 0.1);
      mb.prism(0, 1.76, -3.55, 0.05, 0.0, 1.1, 5, OLV, true);
      mb.prism(0, 1.46, 3.45, 0.05, 0.0, 0.9, 5, OLV, true);
      LR(s => dot(mb, [s * 0.4, 1.2, 3.5], [s, 0, 0.5], 0.12, DK, 0.12));
    });
    att(m, 'radar', mb => mb.box(0, 0, 0, 0.36, 0.04, 0.06, '#3a3a3a'));
    glow(m, 'hull', mb => { LR(s => dot(mb, [s * 0.705, 1.62, -2.6], [s, 0, 0], 0.06, s > 0 ? '#20ff40' : '#ff2020')); dot(mb, [0, 2.35, 3.45], [0, 0, 1], 0.05, '#fff8d0'); });
    m.waterline = 0.52;
    m.clips = {
      idle: { dur: 180, fn(m, p) { addRot(m, 'radar', 1, p * TAU * 3); addRot(m, 'hull', 2, S(p * TAU) * 0.015); addRot(m, 'hull', 0, S(p * TAU * 2 + 1) * 0.006); addPos(m, 'hull', 1, S(p * TAU * 2) * 0.02); } },
      move: { dur: 120, fn(m, p) { addRot(m, 'radar', 1, p * TAU * 4); addRot(m, 'hull', 2, S(p * TAU) * 0.025); addRot(m, 'hull', 0, S(p * TAU * 2) * 0.015); addPos(m, 'hull', 1, S(p * TAU * 2 + 0.5) * 0.03); } },
    };
    return m;
  }

  // ================================================================== MIDGAR TRAIN
  // The Sector 7 train: streamlined steam-punk locomotive (silver shroud with the headlamp on top, orange
  // cables draped along the boiler, red coupling rods on the drivers, cab with lit windows) + dark
  // passenger car(s) with barrel roof, brass roof pipes and glowing yellow-green windows.
  // opts.cars: number of cars (0-4, default 1). Rails at y = 0.
  function buildTrain(o) {
    const nC = o.cars != null ? clamp(o.cars | 0, 0, 4) : 1;
    const m = new FF7.Model();
    const SIL = '#8c9096', SLT = '#a8acb0', SDK = '#5a5e64', BND = '#3e4044', ORG = '#e0a030', ORG2 = '#b88024', RED = '#c02020', TYR = '#26262a', CAR = '#3c3e42', CART = '#2e3034', CARL = '#4a4d52', BRASS = '#8a6a40', GLOW = '#e8f090', DK = '#1e1e20';
    const LL = 4.1, CL = 4.0, GAP = 0.3, total = LL + nC * (CL + GAP), zf = total / 2;
    m.bone('root', null, [0, 0, 0]);
    m.bone('loco', 'root', [0, 0, zf - LL / 2]);
    m.bone('rods', 'loco', [0, 0, 0]);
    const LA = [{ z: -0.95, r: 0.3 }, { z: -0.3, r: 0.3 }, { z: 0.35, r: 0.3 }, { z: 1.2, r: 0.17 }, { z: 1.6, r: 0.17 }];
    LA.forEach((a, k) => m.bone('axleL' + k, 'loco', [0, a.r, a.z]));
    const wheels = LA.map((a, k) => 'axleL' + k), wr = {};
    LA.forEach((a, k) => { wr['axleL' + k] = a.r; });
    for (let c = 0; c < nC; c++) {
      m.bone('car' + c, 'root', [0, 0, zf - LL - GAP - CL / 2 - c * (CL + GAP)]);
      [-1.65, -1.25, 1.25, 1.65].forEach((z, k) => { const n = 'axleC' + c + '_' + k; m.bone(n, 'car' + c, [0, 0.17, z]); wheels.push(n); wr[n] = 0.17; });
    }
    const axleMesh = (r) => meshOf(mb => { LR(s => { mb.push(); mb.translate(s * 0.52, 0, 0); wheel(mb, r, 0.1, TYR, r > 0.2 ? '#8a1c1c' : '#4a4a4c', { flat: true, sides: r > 0.2 ? 10 : 6, bolts: 0, hubR: r * 0.55 }); mb.pop(); }); tube(mb, [-0.5, 0, 0], [0.5, 0, 0], 0.03, 0.03, DK, 4, false); });
    const bigAxle = axleMesh(0.3), smallAxle = axleMesh(0.17);
    wheels.forEach(n => m.attach(n, wr[n] > 0.2 ? bigAxle : smallAxle));
    // ---- locomotive
    att(m, 'loco', mb => {
      cbox(mb, 0, 0.52, -0.05, 1.0, 0.14, 3.9, BND, 0.05);
      hull(mb, bandRings([
        { z: -0.7, rx: 0.44, ry: 0.44, y: 1.02 }, { z: 1.4, rx: 0.47, ry: 0.47, y: 1.0 }, { z: 1.72, rx: 0.47, ry: 0.44, y: 0.96 }, { z: 1.92, rx: 0.43, ry: 0.36, y: 0.88 }, { z: 2.03, rx: 0.32, ry: 0.25, y: 0.8 }, { z: 2.07, rx: 0.1, ry: 0.08, y: 0.78 },
      ], [-0.2, 0.4, 1.0, 1.55], SIL, BND, 0.05), { sides: 10, color: SIL, colorsFn: byFace(SLT, SDK) });
      secLoft(mb, [{ z: 1.35, pts: rrect(0.54, 0.16, 0.82, 0.04, 0.06) }, { z: 1.9, pts: rrect(0.47, 0.14, 0.78, 0.06, 0.06) }, { z: 2.1, pts: rrect(0.28, 0.2, 0.7, 0.06, 0.06) }], (k, i) => i === 7 ? DK : i === 3 ? SLT : SIL, { capFrontCol: SDK });
      for (let k = 0; k < 3; k++) dot(mb, [0, 0.3 + k * 0.11, 2.103], [0, 0, 1], 0.4, DK, 0.04);
      LR(s => slab(mb, [[s * 0.5, -0.62], [s * 0.62, -0.62], [s * 0.62, 1.35], [s * 0.5, 1.35]], 0.6, 0.64, SDK, BND, BND));
      // cab with overhanging roof
      secLoft(mb, [{ z: -2.05, pts: rrect(0.56, 0.5, 1.62, 0.02, 0.1) }, { z: -0.62, pts: rrect(0.56, 0.5, 1.62, 0.02, 0.1) }], (k, i) => i === 3 ? CARL : SDK, { capFrontCol: SDK, capBackCol: BND });
      slab(mb, [[-0.64, -2.12], [0.64, -2.12], [0.64, -0.54], [-0.64, -0.54]], 1.62, 1.67, BND, DK, BND);
      // chimney, dome, brass pipes, orange cable bundle, pistons
      mb.prism(0, 1.42, 1.15, 0.12, 0.14, 0.2, 7, DK, true, true, false);
      mb.sphere(0, 1.44, 0.4, 0.14, 0.1, 0.18, SLT, 8, 4, true, null, 2);
      LR(s => tube(mb, [s * 0.16, 1.46, -0.6], [s * 0.16, 1.44, 1.3], 0.03, 0.03, BRASS, 5, false));
      LR(s => { for (let k = 0; k < 3; k++) { const x = s * (0.47 - k * 0.012), y0 = 1.2 - k * 0.07; mb.sweep([[x, y0, 1.35], [x + s * 0.02, y0 - 0.08, 0.95], [x + s * 0.02, y0 - 0.12, 0.4], [x + s * 0.02, y0 - 0.06, -0.1], [x, y0 + 0.02, -0.6]], 0.026, { sides: 3, color: k === 1 ? ORG2 : ORG, capStart: false, capEnd: false }); } });
      LR(s => { cbox(mb, s * 0.56, 0.44, 0.92, 0.16, 0.2, 0.42, SDK, 0.2); tube(mb, [s * 0.6, 0.3, 0.7], [s * 0.6, 0.3, 0.35], 0.02, 0.02, SLT, 4, false); });
      lampHousing(mb, 0, 1.4, 1.78, 0.11, SLT, 0.12, 8);
      tube(mb, [0, 1.46, 1.66], [0, 1.4, 1.72], 0.06, 0.06, SDK, 6);
    });
    glow(m, 'loco', mb => { lampLens(mb, 0, 1.4, 1.78, 0.11, '#fffbe0', 8); LR(s => { dot(mb, [s * 0.565, 1.2, -1.6], [s, 0, 0], 0.34, GLOW, 0.24); dot(mb, [s * 0.565, 1.2, -1.05], [s, 0, 0], 0.3, GLOW, 0.24); }); dot(mb, [0, 1.2, -0.615], [0, 0, 1], 0.5, '#c8d070', 0.2); });
    att(m, 'rods', mb => LR(s => { mb.box(s * 0.63, 0.3, -0.3, 0.03, 0.05, 1.42, RED); mb.box(s * 0.645, 0.33, 0.12, 0.02, 0.04, 0.9, '#a02020'); }));
    // ---- passenger cars
    const carMesh = meshOf(mb => {
      cbox(mb, 0, 0.38, 0, 0.92, 0.12, 3.9, DK, 0.05);
      secLoft(mb, [{ z: -2.0, pts: rrect(0.56, 0.44, 1.42, 0.02, 0.04) }, { z: 2.0, pts: rrect(0.56, 0.44, 1.42, 0.02, 0.04) }], (k, i) => i === 3 ? CARL : CAR);
      hull(mb, [{ z: -2.03, rx: 0.58, ry: 0.2, ryB: 0.02, y: 1.42 }, { z: 2.03, rx: 0.58, ry: 0.2, ryB: 0.02, y: 1.42 }], { sides: 10, color: CART, colorsFn: byFace(CARL, null, 0.8) });
      LR(s => { tube(mb, [s * 0.22, 1.66, -1.9], [s * 0.22, 1.66, 1.9], 0.05, 0.05, BRASS, 5); [-1.2, 0, 1.2].forEach(z => cbox(mb, s * 0.22, 1.66, z, 0.13, 0.13, 0.08, '#6a5030', 0.3)); });
      [-1.4, 0, 1.4].forEach(z => mb.prism(0, 1.6, z, 0.08, 0.06, 0.1, 6, BND, true, true, false));
      LR(s => { dot(mb, [s * 0.563, 0.78, 0], [s, 0, 0], 3.9, BRASS, 0.04); dot(mb, [s * 0.563, 1.36, 0], [s, 0, 0], 3.9, BRASS, 0.03); for (let k = 0; k < 5; k++) dot(mb, [s * 0.562, 1.06, -1.5 + k * 0.75], [s, 0, 0], 0.56, DK, 0.38); });
      [-1, 1].forEach(e => { dot(mb, [0, 0.9, e * 2.005], [0, 0, e], 0.4, DK, 0.7); cbox(mb, 0, 0.36, e * 2.08, 0.16, 0.1, 0.16, DK, 0.2); });
      [-1.45, 1.45].forEach(z => { cbox(mb, 0, 0.24, z, 0.9, 0.12, 0.8, BND, 0.1); });
    });
    const carGlow = meshOf(mb => { LR(s => { for (let k = 0; k < 5; k++) dot(mb, [s * 0.566, 1.06, -1.5 + k * 0.75], [s, 0, 0], 0.46, GLOW, 0.3); dot(mb, [s * 0.566, 1.1, 1.92], [s, 0, 0], 0.06, '#60ff80'); }); }, { unlit: true });
    for (let c = 0; c < nC; c++) { m.attach('car' + c, carMesh); m.attach('car' + c, carGlow); }
    m.wheels = wheels;
    const roll = (m, p, turns) => { const th = p * TAU * turns; m.wheels.forEach(n => addRot(m, n, 0, th * 0.3 / wr[n])); addPos(m, 'rods', 1, C(th) * 0.1); addPos(m, 'rods', 2, S(th) * 0.1); };
    m.clips = {
      idle: { dur: 60, fn(m, p, t) { roll(m, 0, 0); addPos(m, 'loco', 1, S(t * 2.1) * 0.002); } },
      move: { dur: 40, fn(m, p, t) { roll(m, p, 2); addPos(m, 'loco', 1, S(p * TAU * 4) * 0.004); for (let c = 0; c < nC; c++) addRot(m, 'car' + c, 2, S(p * TAU + c) * 0.006); } },
    };
    return m;
  }

  // ================================================================== MONO COASTER (Gold Saucer Speed Square)
  // The shooting-coaster car as the Speed Square platform shows it (ff7shot_06-goldsaucer22..24): a long
  // grey car with three rows of seats, a rounded red nose pod with the blue triangular screen and yellow
  // side stripes, a raised red tail, and the two grey light-guns on the front corners (the first-person
  // view shows their barrels); rides a monorail bogie. Bones: body, gun (both guns aim together).
  function buildCoaster() {
    const m = new FF7.Model();
    const GRY = '#8a8e96', GLT = '#a8acb4', GDK = '#5a5e66', RED = '#d84848', RDK = '#9a2a2a', BLU = '#2848c8', YEL = '#f0c828', SEAT = '#3a3440', GUN = '#b8bcc4', DK = '#222226';
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    m.bone('gun', 'body', [0, 0.72, 0.95]);
    att(m, 'body', mb => {
      // monorail bogie
      cbox(mb, 0, 0.2, -0.1, 0.36, 0.1, 1.9, GDK, 0.2);
      LR(s => { mb.box(s * 0.14, 0.08, -0.1, 0.05, 0.16, 1.6, GDK); [-0.7, 0.5].forEach(z => { mb.push(); mb.translate(s * 0.1, 0.07, z); mb.rotate(0, 0, PI / 2); wheel(mb, 0.06, 0.04, DK, '#8a8a8a', { flat: true, sides: 6 }); mb.pop(); }); });
      // long grey car body (open top: dark floor between raised sills), red raised tail
      const sec = (z, w, yb, yt) => ({ z, pts: rrect(w, yb, yt, 0.06, 0.08) });
      secLoft(mb, [sec(-1.22, 0.36, 0.3, 0.86), sec(-1.1, 0.44, 0.26, 0.9), sec(-0.8, 0.44, 0.26, 0.66), sec(0.72, 0.44, 0.26, 0.6), sec(0.82, 0.42, 0.28, 0.6)],
        (k, i) => k <= 1 ? (i === 3 ? sh(RED, 0.15) : RED) : i === 3 ? DK : i === 7 ? GDK : (i === 2 || i === 4) ? GLT : GRY, { capBackCol: RDK });
      LR(s => slab(mb, [[s * 0.37, -0.8], [s * 0.45, -0.8], [s * 0.45, 0.8], [s * 0.37, 0.8]], 0.6, 0.66, GLT, GDK, GRY));
      // three seat rows
      [0.42, -0.08, -0.58].forEach(z => { cbox(mb, 0, 0.64, z, 0.66, 0.06, 0.24, SEAT, 0.2); mb.push(); mb.translate(0, 0.78, z - 0.14); mb.rotate(-0.18, 0, 0); cbox(mb, 0, 0, 0, 0.66, 0.26, 0.06, SEAT, 0.2); mb.pop(); });
      // red nose pod with the blue screen triangle and yellow stripes
      hull(mb, [{ z: 0.78, rx: 0.42, ry: 0.26, y: 0.52 }, { z: 1.1, rx: 0.45, ry: 0.3, y: 0.55 }, { z: 1.38, rx: 0.36, ry: 0.24, y: 0.52 }, { z: 1.52, rx: 0.18, ry: 0.13, y: 0.5 }, { z: 1.56, rx: 0.05, ry: 0.04, y: 0.5 }], { sides: 10, color: RED, colorsFn: byFace(sh(RED, 0.15), RDK) });
      const tri = [[0, 0.8, 1.36], [-0.28, 0.87, 0.88], [0.28, 0.87, 0.88]];
      mb.tri(tri[0], tri[2], tri[1], BLU); mb.tri(tri[0], tri[1], tri[2], BLU);
      LR(s => { mb.push(); mb.translate(s * 0.44, 0.58, 1.1); mb.rotate(0, s * 0.3, 0); dot(mb, [s * 0.01, 0, 0], [s, 0, 0], 0.5, YEL, 0.05); dot(mb, [s * 0.01, -0.09, -0.02], [s, 0, 0], 0.4, YEL, 0.04); mb.pop(); });
    });
    // twin light-guns on the front corners
    att(m, 'gun', mb => LR(s => {
      mb.sphere(s * 0.34, 0.0, 0.0, 0.1, 0.1, 0.1, GUN, 6, 4, true);
      tube(mb, [s * 0.34, 0.0, 0.0], [s * 0.34, 0.0, 0.42], 0.07, 0.05, GUN, 6);
      tube(mb, [s * 0.34, 0.0, 0.42], [s * 0.34, 0.0, 0.46], 0.06, 0.06, DK, 6);
    }));
    glow(m, 'body', mb => LR(s => dot(mb, [s * 0.16, 0.5, 1.535], [0, 0, 1], 0.07, '#fff4c0')));
    m.seats = { front: [0, 0.68, 0.42], middle: [0, 0.68, -0.08], rear: [0, 0.68, -0.58] };
    m.clips = {
      idle: { dur: 120, fn(m, p) { addRot(m, 'gun', 1, S(p * TAU) * 0.25); addRot(m, 'gun', 0, -0.05 + S(p * TAU * 2) * 0.05); } },
      move: { dur: 40, fn(m, p) { addRot(m, 'body', 2, S(p * TAU) * 0.03 - (m.steer || 0) * 0.3); addPos(m, 'body', 1, Math.abs(S(p * TAU * 2)) * 0.01); addRot(m, 'gun', 1, S(p * TAU * 0.5) * 0.3); } },
    };
    return m;
  }

  // ================================================================== SNOWBOARD (Great Glacier / Gold Saucer)
  // Cloud's snowboard as the minigame shows it (ff7shot_11-gaeacliff19..21): waisted board with upturned
  // nose and tail, red base, orange/yellow top graphic, two black bindings with red straps. ~0.85 long.
  // Bones: board.
  function buildSnowboard() {
    const m = new FF7.Model();
    const BASE = '#c82818', TOPC = '#f07820', YEL = '#f0d020', RED = '#a01010', BK = '#1a1a1c';
    m.bone('root', null, [0, 0, 0]);
    m.bone('board', 'root', [0, 0, 0]);
    att(m, 'board', mb => {
      const sec = (z, w, y) => ({ z, pts: [[w, y], [w, y + 0.022], [-w, y + 0.022], [-w, y]] });
      const secs = [sec(-0.43, 0.07, 0.075), sec(-0.41, 0.1, 0.05), sec(-0.37, 0.115, 0.018), sec(-0.3, 0.12, 0.002), sec(-0.12, 0.108, 0), sec(0.12, 0.108, 0), sec(0.3, 0.12, 0.002), sec(0.37, 0.115, 0.018), sec(0.41, 0.1, 0.05), sec(0.43, 0.07, 0.078)];
      secLoft(mb, secs, (k, i) => i === 1 ? (k === 4 ? RED : k === 3 || k === 5 ? YEL : k <= 1 || k >= 7 ? YEL : TOPC) : i === 3 ? BASE : sh(BASE, -0.2), { capCol: BASE });
      [-0.15, 0.15].forEach((z, k) => {
        mb.push(); mb.translate(0, 0.022, z); mb.rotate(0, k ? 0.25 : 0.1, 0);
        cbox(mb, 0, 0.02, 0, 0.2, 0.03, 0.1, BK, 0.25);
        mb.box(0, 0.06, -0.045, 0.19, 0.06, 0.015, BK);
        LR(s => mb.box(s * 0.09, 0.05, 0.005, 0.015, 0.05, 0.1, BK));
        mb.box(0, 0.085, 0.01, 0.2, 0.02, 0.05, RED);
        mb.pop();
      });
    });
    m.seats = { rider: [0, 0.03, 0] };
    m.clips = {
      idle: { dur: 60, fn() {} },
      move: { dur: 20, fn(m, p) { addRot(m, 'board', 2, S(p * TAU) * 0.02 - (m.steer || 0) * 0.4); addPos(m, 'board', 1, Math.abs(S(p * TAU)) * 0.006); } },
    };
    return m;
  }

  // ================================================================== GONDOLA (Gold Saucer ropeway)
  // The Corel <-> Gold Saucer ropeway car (in-game North Corel station / FMV): big royal-blue tram-like
  // cabin with rounded ends, brown wooden lower panelling on the flanks, a row of dark windows, three
  // front windows and a round head lamp, sliding door on the right flank, a blue A-frame truss on the roof
  // carrying the cable pulleys, and the two end pods with their black curved horn pipes and 4-blade
  // propellers (they spin when it runs). Hangs from its two track ropes: bone 'grip' at pulley-axle height
  // (m.cableY), 'car' swings under it, 'pulleyF'/'pulleyB' (a wheel on each rope, m.ropeX to either side
  // of the centre line, m.wheelR) roll, 'propF'/'propB' turn.
  function buildGondola() {
    const m = new FF7.Model();
    const BLU = '#2436a8', BLT = '#4a64dc', BDK = '#141e6a', WOOD = '#7a4a26', WDK = '#4e2e16', WIN = '#141830', WINL = '#3c4c8c', MET = '#8a8e96', DK = '#18181c', WD2 = '#6a3e20';
    const GY = 2.92, RX = 0.2, WR = 0.16, PY = 2.3, PZ = 2.52;   // pulley axles, rope offset, wheel radius, propeller hubs
    m.bone('root', null, [0, 0, 0]);
    m.bone('grip', 'root', [0, GY, 0]);
    m.bone('pulleyF', 'grip', [0, 0, 1.1]); m.bone('pulleyB', 'grip', [0, 0, -1.1]);
    m.bone('car', 'grip', [0, 0, 0]);
    m.bone('propF', 'car', [0, PY - GY, PZ]); m.bone('propB', 'car', [0, PY - GY, -PZ]);
    att(m, 'car', mb => {
      mb.translate(0, -GY, 0);
      // cabin: rounded box, wood panelling below the blue window band
      const sec = (z, w, yb, yt) => ({ z, pts: rrect(w, yb, yt, 0.1, 0.34, [0.95, 1.05, 1.62]) });
      const ends = (k) => k === 0 || k === 2;
      secLoft(mb, [sec(-2.18, 0.6, 0.42, 1.78), sec(-1.95, 0.8, 0.28, 2.02), sec(1.95, 0.8, 0.28, 2.02), sec(2.18, 0.6, 0.42, 1.78)], (k, i) =>
        (i === 1 || i === 11) ? (ends(k) ? BLU : WOOD) : (i === 2 || i === 10) ? BDK : (i === 5 || i === 7 || i === 6) ? BLT : (i === 0 || i === 12 || i === 13) ? BDK : BLU, { capFrontCol: BLU, capBackCol: BLU });
      // wood plank lines, windows, door, front windows, head lamp housing
      LR(s => {
        for (let k = 0; k < 5; k++) dot(mb, [s * 0.803, 0.44 + k * 0.1, 0], [s, 0, 0], 3.9, WDK, 0.012);
        for (let k = 0; k < 6; k++) { const z = -1.55 + k * 0.62; if (s < 0 && k === 2) continue; dot(mb, [s * 0.803, 1.34, z], [s, 0, 0], 0.46, WIN, 0.48); dot(mb, [s * 0.806, 1.5, z - 0.08], [s, 0, 0], 0.26, WINL, 0.06); }
      });
      dot(mb, [-0.804, 0.98, -0.31], [-1, 0, 0], 0.5, BDK, 1.34);
      dot(mb, [-0.808, 0.98, -0.31], [-1, 0, 0], 0.4, '#20284a', 1.24);
      [-0.36, 0, 0.36].forEach(x => { dot(mb, [x, 1.3, 2.185], [0, 0, 1], 0.3, WIN, 0.42); dot(mb, [x, 1.3, -2.185], [0, 0, -1], 0.3, WIN, 0.42); });
      lampHousing(mb, 0.46, 1.66, 2.17, 0.11, MET, 0.08, 8);
      cbox(mb, 0, 0.22, 0, 1.1, 0.18, 3.4, DK, 0.2);
      // roof truss: A-frames, top beam, wooden diagonals
      [-0.95, 0.95].forEach(z => LR(s => tube(mb, [s * 0.55, 1.98, z], [s * 0.08, GY - 0.12, z * 0.95], 0.06, 0.05, BLU, 5)));
      cbox(mb, 0, GY - 0.12, 0, 0.18, 0.14, 2.5, BLU, 0.2);
      LR(s => { tube(mb, [s * 0.5, 2.0, -0.9], [s * 0.1, GY - 0.16, 0.2], 0.03, 0.03, WD2, 4, false); tube(mb, [s * 0.5, 2.0, 0.9], [s * 0.1, GY - 0.16, -0.2], 0.03, 0.03, WD2, 4, false); });
      [-1.1, 1.1].forEach(z => mb.box(0, GY - 0.05, z, 2 * RX + 0.14, 0.16, 0.12, BDK));   // hangers out to both wheels
      // end pods with black horn pipes
      [1, -1].forEach(e => {
        hull(mb, [{ z: e * 1.35, rx: 0.1, ry: 0.1, y: 2.3 }, { z: e * 1.5, rx: 0.28, ry: 0.28, y: 2.3 }, { z: e * 2.2, rx: 0.3, ry: 0.3, y: 2.3 }, { z: e * 2.48, rx: 0.16, ry: 0.16, y: 2.3, capColor: MET }].sort((a, b) => a.z - b.z), { sides: 8, color: BLU, colorsFn: byFace(BLT, BDK) });
        mb.sweep([[0, 2.5, e * 1.95], [0, 2.82, e * 2.02], [0, 3.02, e * 1.82], [0, 3.0, e * 1.55]], 0.13, { sides: 6, color: DK, capStart: false });
        mb.box(0, 2.08, e * 1.8, 0.16, 0.12, 0.3, BDK);
      });
    });
    glow(m, 'car', mb => { mb.translate(0, -GY, 0); lampLens(mb, 0.46, 1.66, 2.17, 0.11, '#eef4ff', 8); LR(s => dot(mb, [s * 0.5, 0.5, -2.1], [0, 0, -1], 0.08, '#ff3020')); });
    // a grooved wheel on each track rope, on one axle
    const pw = meshOf(mb => {
      LR(s => { mb.push(); mb.translate(s * RX, 0, 0); wheel(mb, WR, 0.08, '#3a3c42', MET, { flat: true, sides: 8, bolts: 3 }); mb.pop(); });
      mb.box(0, 0, 0, 2 * RX, 0.04, 0.04, MET);
    });
    m.attach('pulleyF', pw); m.attach('pulleyB', pw);
    // the propellers on the pod noses: four black blades round a steel spinner, turning about the car's long axis
    const pr = (e) => meshOf(mb => {
      for (let k = 0; k < 4; k++) { mb.push(); mb.rotate(0, 0, k * PI / 2 + PI / 4); mb.box(0, 0.24, e * 0.02, 0.09, 0.38, 0.018, DK); mb.pop(); }
      mb.sphere(0, 0, e * 0.03, 0.07, 0.07, 0.07, MET, 8, 5);
    });
    m.attach('propF', pr(1)); m.attach('propB', pr(-1));
    m.cableY = GY; m.ropeX = RX; m.wheelR = WR;
    m.seats = { frontL: [0.42, 0.45, 1.0], frontR: [-0.42, 0.45, 1.0], rearL: [0.42, 0.45, -1.0], rearR: [-0.42, 0.45, -1.0] };
    m.clips = {
      idle: { dur: 150, fn(m, p) { addRot(m, 'car', 2, S(p * TAU) * 0.02); addRot(m, 'car', 0, S(p * TAU * 2 + 1) * 0.01); } },
      move: { dur: 60, fn(m, p) { addRot(m, 'car', 0, -0.04 + S(p * TAU * 2) * 0.012); addRot(m, 'car', 2, S(p * TAU) * 0.015); addRot(m, 'pulleyF', 0, p * TAU * 4); addRot(m, 'pulleyB', 0, p * TAU * 4); addRot(m, 'propF', 2, p * TAU * 9); addRot(m, 'propB', 2, -p * TAU * 9); } },
    };
    return m;
  }

  // ================================================================== SISTER RAY (Junon / Midgar Mako cannon)
  // The giant Mako cannon: stepped rusty platform, turret drum, copper-bronze breech housing flanked by
  // Mako tanks with glowing green bands, pipes and cable runs, and the ~13-unit barrel with reinforcement
  // rings and a slotted muzzle brake. Bones: turret (yaw), barrel (elevation, recoil), charge (muzzle glow).
  // Clips: idle, move (slow traverse), fire (charge + recoil, not looping).
  function buildSisterRay() {
    const m = new FF7.Model();
    const RUST = '#8c5a3a', RDK = '#5e3c28', BRZ = '#6c5644', BDK = '#46382c', COP = '#a86e44', CON = '#6e665a', CONT = '#857c6e', GRN = '#40e890', DK = '#1e1c1a';
    m.bone('root', null, [0, 0, 0]);
    m.bone('turret', 'root', [0, 1.0, 0]);
    m.bone('barrel', 'turret', [0, 2.6, 1.4], [-0.12, 0, 0]);
    m.bone('charge', 'barrel', [0, 0, 13.3]);
    att(m, 'root', mb => {
      const oct = (r) => { const q = []; for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU; q.push([C(a) * r, S(a) * r]); } return q; };
      slab(mb, oct(3.8), 0, 0.5, CONT, CON, CON);
      slab(mb, oct(3.0), 0.5, 1.0, CONT, CON, sh(CON, -0.1));
      for (let k = 0; k < 8; k++) { const a = (k + 0.5) / 8 * TAU; mb.box(C(a) * 3.3, 0.7, S(a) * 3.3, 0.5, 0.4, 0.5, RDK); }
    });
    att(m, 'turret', mb => {
      mb.loft([{ y: 0, rx: 2.4, rz: 2.4, color: RDK }, { y: 0.2, rx: 2.4, rz: 2.4, color: RUST }, { y: 1.0, rx: 2.25, rz: 2.25, color: BDK }, { y: 1.2, rx: 2.1, rz: 2.1 }], { sides: 12, color: RUST });
      // breech housing
      const hs = (z, w, yt) => ({ z, pts: rrect(w, 1.2, yt, 0.05, 0.45) });
      secLoft(mb, [hs(-3.3, 1.1, 3.0), hs(-2.9, 1.35, 3.5), hs(1.4, 1.35, 3.6), hs(2.2, 1.0, 3.1)], (k, i) => i === 3 ? COP : i === 2 || i === 4 ? RUST : RDK, { capBackCol: RDK });
      LR(s => { for (let k = 0; k < 4; k++) dot(mb, [s * 1.355, 2.4, -2.2 + k * 1.0], [s, 0, 0], 0.5, BDK, 1.4); });
      // Mako tanks with glowing bands
      LR(s => {
        mb.push(); mb.translate(s * 1.95, 2.0, -0.8); mb.rotate(PI / 2, 0, 0);
        mb.loft([{ y: -2.2, rx: 0.3, rz: 0.3, color: BDK }, { y: -2.0, rx: 0.6, rz: 0.6, color: BRZ }, { y: 1.7, rx: 0.6, rz: 0.6, color: BDK }, { y: 1.9, rx: 0.3, rz: 0.3 }], { sides: 10, color: BRZ });
        mb.pop();
        [-0.9, 0.5].forEach(z => tube(mb, [s * 1.35, 2.0, z], [s * 1.5, 2.0, z], 0.25, 0.25, RDK, 6, false));
      });
      // pipe runs on top, control cabin
      [-0.5, 0, 0.5].forEach((x, k) => pipe(mb, [[x, 3.62, -2.8], [x, 3.7, -1.0], [x, 3.7, 1.0], [x * 1.4, 3.3, 2.0]], 0.09, k === 1 ? COP : RDK, 5));
      cbox(mb, -0.8, 3.95, -2.2, 0.8, 0.6, 0.9, RUST, 0.15);
      dot(mb, [-0.8, 4.05, -1.745], [0, 0, 1], 0.6, '#1e2a30', 0.2);
      // rear counterweight + cable bundle down to the drum
      cbox(mb, 0, 2.2, -3.6, 2.2, 1.6, 0.7, BDK, 0.1);
      LR(s => mb.sweep([[s * 0.9, 1.3, -3.5], [s * 1.2, 0.7, -2.6], [s * 1.6, 1.1, -1.2], [s * 1.4, 1.3, 0.4]], 0.12, { sides: 4, color: DK, capStart: false, capEnd: false }));
    });
    glow(m, 'turret', mb => LR(s => { [-2.3, -0.8, 0.7].forEach(z => { mb.push(); mb.translate(s * 1.95, 2.0, z); mb.rotate(PI / 2, 0, 0); mb.loft([{ y: -0.08, rx: 0.62, rz: 0.62 }, { y: 0.08, rx: 0.62, rz: 0.62 }], { sides: 10, color: GRN, capTop: false, capBottom: false }); mb.pop(); }); }));
    att(m, 'barrel', mb => {
      hull(mb, [{ z: -1.2, rx: 1.0, ry: 1.0, color: BDK }, { z: -0.2, rx: 1.0, ry: 1.0, color: COP }, { z: 0.4, rx: 0.85, ry: 0.85 }, { z: 3.0, rx: 0.72, ry: 0.72 }, { z: 9.0, rx: 0.62, ry: 0.62 }, { z: 12.4, rx: 0.58, ry: 0.58 }], { sides: 10, color: BRZ, colorsFn: byFace(sh(BRZ, 0.15), BDK) });
      [1.6, 3.6, 5.6, 7.6, 9.6, 11.4].forEach(z => { const r = 0.72 - (z - 3) * 0.017 + 0.1; hull(mb, [{ z: z - 0.18, rx: r - 0.08, ry: r - 0.08 }, { z: z - 0.12, rx: r, ry: r }, { z: z + 0.12, rx: r, ry: r }, { z: z + 0.18, rx: r - 0.08, ry: r - 0.08 }], { sides: 10, color: RUST, capTop: false, capBottom: false }); });
      cbox(mb, 0, 0, 13.0, 1.5, 1.3, 1.3, RDK, 0.25);
      LR(s => { for (let k = 0; k < 3; k++) dot(mb, [s * 0.752, 0, 12.6 + k * 0.4], [s, 0, 0], 0.18, DK, 0.8); });
      dot(mb, [0, 0, 13.655], [0, 0, 1], 0.9, DK, 0.9);
      tube(mb, [0, 0.8, 0.5], [0, 0.66, 11.0], 0.07, 0.07, COP, 4, false);
      LR(s => mb.sweep([[s * 0.7, -0.8, -0.2], [s * 0.66, -0.9, 2.0], [s * 0.6, -0.72, 4.5]], 0.1, { sides: 4, color: DK, capStart: false }));
    });
    m.attach('charge', meshOf(mb => { mb.sphere(0, 0, 0, 0.9, 0.9, 0.9, '#60ffb0', 8, 5, true); mb.sphere(0, 0, 0, 0.5, 0.5, 0.5, '#e0fff0', 6, 4, true); }, { unlit: true, blend: 'add' }), null, { cull: false });
    m.bones.charge.visible = false;
    m.clips = {
      idle: { dur: 120, fn(m) { m.bones.charge.visible = false; } },
      move: { dur: 360, fn(m, p) { m.bones.charge.visible = false; addRot(m, 'turret', 1, S(p * TAU) * 0.25); } },
      fire: { dur: 150, loop: false, fn(m, p) {
        const ch = clamp(p / 0.6, 0, 1), sh2 = p > 0.6 ? clamp((p - 0.6) / 0.4, 0, 1) : 0;
        const b = m.bones.charge; b.visible = p < 0.75; const k = p < 0.6 ? ch * 1.2 : 1.2 + (p - 0.6) * 12; b.scl[0] = b.scl[1] = b.scl[2] = Math.max(0.01, k);
        const rec = p > 0.6 ? Math.exp(-sh2 * 5) * S(Math.min(1, sh2 * 8) * PI / 2) : 0; addPos(m, 'barrel', 2, -rec * 1.2);
      } },
    };
    m.anims = { fire: 'fire' };
    return m;
  }

  // ================================================================== CHOCOBO WAGON (Sector 6 -> Wall Market)
  // The chocobo-drawn carriage that takes Tifa to Wall Market (ref ff7art44): red cabin with slightly
  // flared walls, gold panel trim, arched light-blue window with gold mullions, gold sconces, four hanging
  // cyan lanterns, overhanging purple hip roof with the little red chimney box, driver's bench with a red
  // cushion at the front, rear balcony with turned balusters and a curtained doorway, brown wooden deck on
  // four octagonal spoked wheels, gold corner carvings, a barrel slung at the back, shafts + red breast
  // strap for the bird. Bone 'chocobo' (and m.harness.chocobo) = where a chocobo model's feet go (it
  // faces +z like the wagon); m.seats.driver / rear.
  function buildWagon() {
    const m = new FF7.Model();
    const RED = '#c01c18', RDK = '#861010', RLT = '#d8382a', GOLD = '#e2c040', GDK = '#a88420', PUR = '#6e2a6c', PLT = '#8a3c86', WOOD = '#7a3a1c', WDK = '#4e2410', WLT = '#9a5028', WHL = '#86341c', GLS = '#a4d8f0', LAN = '#8ed0dc', CUR = '#c8649a', DK = '#2a1010';
    const WR = 0.28, DY = 0.62, WX = 0.6, ZF = 0.72, ZR = -0.72, HZ = 2.05;
    m.bone('root', null, [0, 0, 0]);
    m.bone('body', 'root', [0, 0, 0]);
    [['wheelFL', WX, ZF], ['wheelFR', -WX, ZF], ['wheelRL', WX, ZR], ['wheelRR', -WX, ZR]].forEach(([n, x, z]) => m.bone(n, 'root', [x, WR, z]));
    m.bone('chocobo', 'root', [0, 0, HZ]);
    const lean = 0.064, wallX = (y) => 0.5 + (y - DY) * lean;   // flared side walls
    att(m, 'body', mb => {
      // chassis beams, axles, deck
      LR(s => mb.box(s * 0.36, 0.44, 0, 0.08, 0.1, 2.3, WDK));
      [ZF, ZR].forEach(z => tube(mb, [-WX, WR, z], [WX, WR, z], 0.035, 0.035, WDK, 4, false));
      slab(mb, [[-0.64, -1.22], [0.64, -1.22], [0.64, 1.24], [-0.64, 1.24]], 0.52, DY, '#8e4624', WDK, WOOD);
      // cabin (flared box) + roof
      mb.frustum(0, DY, 0.15, 1.0, 1.32, 1.16, 1.46, 1.25, { top: RDK, bottom: RDK, front: RDK, back: RED, left: RED, right: RED });
      slab(mb, [[-0.74, -0.74], [0.74, -0.74], [0.74, 1.04], [-0.74, 1.04]], 1.84, 1.9, PUR, sh(PUR, -0.3), sh(PUR, -0.15));
      mb.frustum(0, 1.9, 0.15, 1.36, 1.7, 0.62, 0.96, 0.26, { top: PLT, bottom: PUR, front: PUR, back: sh(PUR, 0.1), left: PLT, right: PUR });
      cbox(mb, 0, 2.26, 0.62, 0.2, 0.36, 0.14, RED, 0.2);
      mb.sphere(0, 2.47, 0.62, 0.07, 0.07, 0.07, GOLD, 6, 4, true);
      // side walls: gold frame, lower panels, arched window with gold cross, sconces (tilted with the wall)
      LR(s => {
        mb.push(); mb.translate(s * wallX(DY), DY, 0); mb.rotate(0, 0, -s * lean);
        const X = (d) => s * (0.004 + d);
        sidePoly(mb, s, [[-0.46, 0.06], [0.76, 0.06], [0.76, 1.16], [-0.46, 1.16]], X(0), GOLD);
        sidePoly(mb, s, [[-0.41, 0.11], [0.71, 0.11], [0.71, 1.11], [-0.41, 1.11]], X(0.003), RED);
        [[-0.38, 0.12], [0.2, 0.68]].forEach(([z0, z1]) => { sidePoly(mb, s, [[z0, 0.16], [z1, 0.16], [z1, 0.4], [z0, 0.4]], X(0.006), GOLD); sidePoly(mb, s, [[z0 + 0.03, 0.19], [z1 - 0.03, 0.19], [z1 - 0.03, 0.37], [z0 + 0.03, 0.37]], X(0.009), RDK); });
        const arch = (e) => [[-0.08 - e, 0.5 - e], [0.4 + e, 0.5 - e], [0.4 + e, 0.86], [0.3 + e * 0.6, 0.97 + e], [0.16, 1.0 + e], [0.02 - e * 0.6, 0.97 + e], [-0.08 - e, 0.86]];
        sidePoly(mb, s, arch(0.04), X(0.006), GOLD);
        sidePoly(mb, s, arch(0), X(0.009), GLS);
        sidePoly(mb, s, [[0.145, 0.5], [0.175, 0.5], [0.175, 1.0], [0.145, 1.0]], X(0.012), GOLD);
        sidePoly(mb, s, [[-0.08, 0.73], [0.4, 0.73], [0.4, 0.76], [-0.08, 0.76]], X(0.012), GOLD);
        [-0.2, 0.52].forEach(z => { mb.sphere(s * 0.03, 0.66, z, 0.035, 0.05, 0.035, GOLD, 6, 4, true); mb.sphere(s * 0.03, 0.58, z, 0.02, 0.03, 0.02, GDK, 5, 3, true); });
        mb.pop();
      });
      // front wall (behind the driver): dark panel; back wall: curtained doorway
      const zf = 0.15 + 0.66, zb = 0.15 - 0.66;
      plate(mb, [[-0.36, DY + 0.28], [0.36, DY + 0.28], [0.38, DY + 1.12], [-0.38, DY + 1.12]], zf + 0.01, 0.01, RDK);
      plate(mb, [[-0.3, DY + 0.04], [0.3, DY + 0.04], [0.32, DY + 1.1], [-0.32, DY + 1.1]], zb - 0.012, 0.012, DK);
      plate(mb, [[-0.3, DY + 0.5], [0.0, DY + 1.1], [-0.3, DY + 1.1]], zb - 0.02, 0.012, CUR);
      plate(mb, [[0.3, DY + 0.5], [0.3, DY + 1.1], [0.0, DY + 1.1]], zb - 0.02, 0.012, CUR);
      LR(s => { tube(mb, [s * 0.52, DY + 1.24, zb - 0.04], [s * 0.52, DY + 0.05, zb - 0.04], 0.03, 0.03, GOLD, 4, false); tube(mb, [s * 0.52, DY + 1.24, zf + 0.04], [s * 0.52, DY + 0.05, zf + 0.04], 0.03, 0.03, GOLD, 4, false); });
      // driver's bench + cushion + footboard
      cbox(mb, 0, DY + 0.1, 0.99, 0.76, 0.2, 0.26, WOOD, 0.15);
      cbox(mb, 0, DY + 0.23, 0.99, 0.8, 0.06, 0.3, RED, 0.25);
      slab(mb, [[-0.5, 1.14], [0.5, 1.14], [0.5, 1.3], [-0.5, 1.3]], 0.44, 0.48, WLT, WDK, WOOD);
      // rear balcony: rails on turned balusters
      const railY = DY + 0.42, BZ = -1.18;
      pipe(mb, [[0.6, railY, zb - 0.02], [0.6, railY, BZ], [-0.6, railY, BZ], [-0.6, railY, zb - 0.02]], 0.035, WLT, 4);
      [[0.6, -0.7], [0.6, -1.0], [0.3, BZ], [0.0, BZ], [-0.3, BZ], [-0.6, -1.0], [-0.6, -0.7], [0.6, BZ], [-0.6, BZ]].forEach(([x, z]) => { mb.prism(x, DY, z, 0.03, 0.05, 0.2, 5, WOOD, true, false, false); mb.prism(x, DY + 0.2, z, 0.05, 0.025, 0.2, 5, WOOD, true, false, false); });
      // gold corner carvings, barrel slung at the back
      [[0.62, 1.22], [-0.62, 1.22], [0.62, -1.2], [-0.62, -1.2]].forEach(([x, z]) => { mb.sphere(x, 0.42, z, 0.08, 0.13, 0.08, GOLD, 6, 4, true); mb.blade([x, 0.42, z], [Math.sign(x) * 0.3, -1, Math.sign(z) * 0.2], 0.16, 0.08, 0.04, GDK); });
      mb.push(); mb.translate(0.3, 0.34, -1.36); mb.prism(0, -0.19, 0, 0.14, 0.14, 0.38, 8, WLT, true); [-0.12, 0.12].forEach(y => mb.prism(0, y - 0.02, 0, 0.155, 0.155, 0.04, 8, DK, false, false, false)); mb.pop();
      // shafts to the bird + red breast strap, reins
      LR(s => {
        tube(mb, [s * 0.34, 0.5, 1.1], [s * 0.3, 0.68, HZ + 0.06], 0.035, 0.03, WOOD, 4);
        mb.sweep([[s * 0.3, 0.68, HZ + 0.06], [s * 0.26, 0.72, HZ + 0.26], [s * 0.12, 0.76, HZ + 0.34], [0, 0.77, HZ + 0.36]], 0.03, { sides: 3, color: '#c02020', capStart: false, capEnd: false });
        tube(mb, [s * 0.18, DY + 0.34, 1.02], [s * 0.08, 1.12, HZ + 0.28], 0.008, 0.008, '#3a2010', 3, false);
      });
    });
    // four hanging lanterns (glowing)
    glow(m, 'body', mb => { [[0.64, 0.92], [-0.64, 0.92], [0.64, -0.62], [-0.64, -0.62]].forEach(([x, z]) => { cbox(mb, x, 1.62, z, 0.12, 0.2, 0.12, LAN, 0.25); }); });
    att(m, 'body', mb => { [[0.64, 0.92], [-0.64, 0.92], [0.64, -0.62], [-0.64, -0.62]].forEach(([x, z]) => { mb.box(x, 1.735, z, 0.13, 0.03, 0.13, GDK); tube(mb, [x, 1.75, z], [x, 1.86, z], 0.008, 0.008, DK, 3, false); }); });
    const wm = meshOf(mb => spokedWheel(mb, WR, 0.08, WHL, '#b0603a', '#3a140a', 8, 8));
    ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'].forEach(n => m.attach(n, wm));
    m.wheels = ['wheelFL', 'wheelFR', 'wheelRL', 'wheelRR'];
    m.harness = { chocobo: [0, 0, HZ] };
    m.seats = { driver: [0, DY + 0.26, 1.0], rear: [0, DY, -0.9], cabin: [0, DY, 0.15] };
    m.clips = {
      idle: { dur: 90, fn(m, p) { addRot(m, 'body', 2, S(p * TAU) * 0.004); } },
      move: { dur: 36, fn(m, p) { spinParts(m, p, 1); addPos(m, 'body', 1, Math.abs(S(p * TAU * 2)) * 0.012); addRot(m, 'body', 2, S(p * TAU) * 0.012); addRot(m, 'body', 0, S(p * TAU * 2) * 0.006); } },
    };
    return scaleModel(m, 0.85);   // carriage roof ~1.7x a chocobo's height, as in the Sector 6 field scene
  }

  // ================================================================== OCEAN LINER (Kupomon's S.S. Moogle)
  // A grand four-funnel ocean liner of the 1920s, our own design: a long black hull with a gold sheer line and three
  // rows of brass portholes over the white boot topping and the red bottom, a raked stem, a rounded counter stern;
  // the white superstructure in tiers (the glassed-in promenade, the boat deck house, the bridge and its wings, an aft
  // deckhouse, the docking bridge over the stern); four tall raked funnels (red, two thin black bands, a white band
  // with a gold pom-pom emblem, black tops) with steam pipes and guy wires; sixteen lifeboats in their davits;
  // ventilator cowls; the forward well (hatches, derricks) under the raised forecastle; two masts with a crow's nest,
  // stays, shrouds and the wireless aerial, red pom-poms on their trucks; a shell door forward on each side (the
  // gangways'); "S.S. MOOGLE" on both bows and the stern. Field size: 13.1 long (bow +z), 2 wide (2.06 over the bridge
  // wings), funnel tops ~4.75 and mast trucks ~6.1 above the keel. m.waterline 0.55; m.door [x (+-, each side), sill y,
  // z]: where a gangway meets the hull.
  function buildLiner() {
    const m = new FF7.Model();
    const HUL = '#1c1e24', RED = '#8a2a22', BOOT = '#e8e4da', GOLD = '#c8a040', DECK = '#a88a62', WHT = '#f0ede4', WSH = '#d6d2c8',
      GLS = '#2a3a4e', FUN = '#c8382a', BLK = '#18181c', BUFF = '#c8a878', BRASS = '#b89040', ROPE = '#3a3530', ROOF = '#d8d2c4', POM = '#e0405a';
    const WL = 0.55;
    m.bone('root', null, [0, 0, 0]);
    m.bone('hull', 'root', [0, 0, 0]);
    // the hull's sections, stern to bow: [z, sheer half-width, waterline half-width, bilge half-width, keel y, sheer y]
    const HS = [
      [-6.55, 0.3, 0.26, 0.18, 1.05, 1.92], [-6.4, 0.58, 0.5, 0.36, 0.85, 1.9], [-6.1, 0.8, 0.72, 0.56, 0.55, 1.88], [-5.6, 0.95, 0.9, 0.8, 0.2, 1.84],
      [-4.8, 1.0, 1.0, 0.95, 0.03, 1.8], [-1.0, 1.0, 1.0, 0.97, 0, 1.76], [3.0, 1.0, 1.0, 0.97, 0, 1.78], [4.0, 0.97, 0.95, 0.9, 0, 1.8],
      [4.65, 0.9, 0.86, 0.8, 0.02, 1.84], [5.4, 0.72, 0.62, 0.5, 0.06, 1.9], [6.0, 0.45, 0.32, 0.2, 0.16, 1.95], [6.35, 0.2, 0.1, 0.05, 0.32, 1.99], [6.55, 0.04, 0.02, 0.01, 0.55, 2.02],
    ];
    // the hull's half-width at the sheer at z (between the sections)
    const wAt = (z) => { for (let i = 0; i < HS.length - 1; i++) { const a = HS[i], b = HS[i + 1]; if (z <= b[0]) { const t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1); return a[1] + (b[1] - a[1]) * t; } } return 0; };
    const secOf = ([z, w, ww, wb, yb, yt]) => {
      const R = [[wb * 0.45, yb], [wb * 0.85, yb + 0.05], [wb, yb + 0.2], [ww, WL - 0.03], [ww, WL + 0.05], [w, yt - 0.11], [w, yt - 0.07], [w, yt]];
      for (let i = 1; i < R.length; i++) if (R[i][1] < R[i - 1][1] + 0.004) R[i][1] = R[i - 1][1] + 0.004;
      return { z, pts: R.concat(R.slice().reverse().map(p => [-p[0], p[1]])) };
    };
    att(m, 'hull', mb => {
      // ---- the hull (faces: 0-2 bottom, 3 boot topping, 4/6 topsides, 5 the gold line, 7 the deck; mirrored 8-15)
      const high = (k) => HS[k][4] > 0.42 && HS[k + 1][4] > 0.42;   // (the counter's underside, out of the water: black)
      secLoft(mb, HS.map(secOf), (k, i) => {
        if (i === 7) return DECK;
        if (i === 5 || i === 9) return GOLD;
        if (i === 4 || i === 6 || i === 8 || i === 10) return HUL;
        if (i === 3 || i === 11) return high(k) ? HUL : BOOT;
        return high(k) ? HUL : RED;
      }, { capBackCol: HUL, capFrontCol: HUL });
      // three rows of brass portholes, a shell door forward on each side (the gangway's), the anchors in their hawse pipes
      LR(s => {
        [1.0, 1.28, 1.52].forEach((y, r) => {
          for (let z = -4.6 + r * 0.1; z <= 3.9; z += 0.2) {
            if (Math.abs(z - 2.2) < 0.22) continue;
            const x = s * (wAt(z) + 0.003);
            dot(mb, [x, y, z], [s, 0, 0], 0.075, BRASS); dot(mb, [x + s * 0.002, y, z], [s, 0, 0], 0.052, GLS);
          }
        });
        dot(mb, [s * 1.002, 1.36, 2.2], [s, 0, 0], 0.32, WSH, 0.46); dot(mb, [s * 1.005, 1.34, 2.2], [s, 0, 0], 0.25, '#121216', 0.38);
        const za = 5.95, xa = s * (wAt(za) + 0.012);
        dot(mb, [xa, 1.74, za], [s, 0, 0.5], 0.1, '#0c0c0e'); dot(mb, [xa, 1.56, za], [s, 0, 0.5], 0.035, '#2a2a2e', 0.26);
        dot(mb, [xa, 1.44, za], [s, 0, 0.5], 0.16, '#2a2a2e', 0.04);
      });
      // ---- the raised forecastle, the forward well (hatches, derricks), the windlass
      const FC = [[0.89, 4.66], [0.72, 5.4], [0.45, 6.0], [0.2, 6.35], [0.05, 6.53], [-0.05, 6.53], [-0.2, 6.35], [-0.45, 6.0], [-0.72, 5.4], [-0.89, 4.66]];
      slab(mb, FC, 1.78, 2.12, DECK, HUL, HUL);
      dot(mb, [0, 1.96, 4.655], [0, 0, -1], 1.76, WHT, 0.3);
      [[3.75, 0.36], [4.3, 0.3]].forEach(([z, d]) => cbox(mb, 0, 1.82, z, 0.52, 0.09, d, '#3e4a3a', 0.1));
      LR(s => {
        tube(mb, [s * 0.52, 1.78, 4.08], [s * 0.52, 2.52, 4.08], 0.03, 0.022, BUFF, 6);
        tube(mb, [s * 0.5, 1.92, 4.06], [s * 0.24, 2.24, 3.56], 0.014, 0.01, BUFF, 4);
        cbox(mb, s * 0.18, 2.16, 5.62, 0.14, 0.08, 0.16, '#3a3a40', 0.2);
      });
      // ---- the superstructure: the promenade deck house (A), the boat deck and its rail, the boat deck house (B)
      const TA = [[0.92, -4.7], [0.92, 3.05], [0.8, 3.28], [0.5, 3.4], [-0.5, 3.4], [-0.8, 3.28], [-0.92, 3.05], [-0.92, -4.7]];
      slab(mb, TA, 1.72, 2.17, DECK, WSH, WHT);
      slab(mb, [[0.95, -4.75], [0.95, 3.08], [0.82, 3.32], [0.5, 3.44], [-0.5, 3.44], [-0.82, 3.32], [-0.95, 3.08], [-0.95, -4.75]], 2.17, 2.2, DECK, WSH, WSH);
      LR(s => { for (let z = -4.5; z <= 2.9; z += 0.26) dot(mb, [s * 0.923, 1.96, z], [s, 0, 0], 0.19, GLS, 0.17); });
      [-0.36, -0.12, 0.12, 0.36].forEach(x => dot(mb, [x, 1.96, 3.405], [0, 0, 1], 0.18, GLS, 0.17));
      const RA = [[0.94, -4.72], [0.94, 3.06], [0.81, 3.3], [0.5, 3.42], [-0.5, 3.42], [-0.81, 3.3], [-0.94, 3.06], [-0.94, -4.72]];
      pipe(mb, RA.map(([x, z]) => [x, 2.3, z]), 0.008, WHT, 3);
      for (let i = 0; i < RA.length - 1; i++) { const a = RA[i], b = RA[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / 0.45));
        for (let k = 0; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t; tube(mb, [x, 2.2, z], [x, 2.3, z], 0.006, 0.006, WHT, 3, false); } }
      slab(mb, [[0.6, -3.5], [0.6, 2.75], [-0.6, 2.75], [-0.6, -3.5]], 2.2, 2.52, ROOF, WSH, WHT);
      LR(s => { for (let z = -3.3; z <= 2.6; z += 0.3) dot(mb, [s * 0.603, 2.37, z], [s, 0, 0], 0.11, GLS, 0.1); });
      // the bridge, its roof, the wings with their cabs and rail
      slab(mb, [[0.5, 2.75], [0.5, 3.12], [0.42, 3.2], [-0.42, 3.2], [-0.5, 3.12], [-0.5, 2.75]], 2.52, 2.88, ROOF, WSH, WHT);
      for (let i = -3; i <= 3; i++) dot(mb, [i * 0.1, 2.73, 3.204], [0, 0, 1], 0.075, GLS, 0.11);
      LR(s => { dot(mb, [s * 0.503, 2.73, 2.95], [s, 0, 0], 0.22, GLS, 0.11); });
      slab(mb, [[0.55, 2.7], [0.55, 3.25], [-0.55, 3.25], [-0.55, 2.7]], 2.88, 2.93, WSH, WSH, WSH);
      slab(mb, [[1.03, 2.86], [1.03, 3.12], [-1.03, 3.12], [-1.03, 2.86]], 2.5, 2.55, DECK, WSH, WSH);
      LR(s => { cbox(mb, s * 0.97, 2.67, 2.99, 0.12, 0.24, 0.22, WHT, 0.2); dot(mb, [s * 0.97, 2.72, 3.102], [0, 0, 1], 0.08, GLS, 0.08); });
      pipe(mb, [[-1.03, 2.65, 2.86], [-1.03, 2.65, 3.12], [1.03, 2.65, 3.12], [1.03, 2.65, 2.86]], 0.008, WHT, 3);
      // aft: the deckhouse and the docking bridge over the stern on its two posts
      slab(mb, [[0.7, -5.5], [0.7, -4.7], [-0.7, -4.7], [-0.7, -5.5]], 1.8, 2.07, ROOF, WSH, WHT);
      LR(s => { for (let z = -5.38; z <= -4.8; z += 0.18) dot(mb, [s * 0.703, 1.95, z], [s, 0, 0], 0.09, GLS, 0.08); });
      slab(mb, [[0.98, -6.13], [0.98, -6.03], [-0.98, -6.03], [-0.98, -6.13]], 2.27, 2.31, DECK, WSH, WSH);
      LR(s => tube(mb, [s * 0.45, 1.88, -6.08], [s * 0.45, 2.27, -6.08], 0.02, 0.02, WHT, 5));
      pipe(mb, [[-0.98, 2.4, -6.13], [0.98, 2.4, -6.13]], 0.007, WHT, 3);
      // the forecastle's and the stern's rails
      pipe(mb, [[0.88, 4.7], [0.71, 5.4], [0.44, 6.0], [0.19, 6.35], [0, 6.52], [-0.19, 6.35], [-0.44, 6.0], [-0.71, 5.4], [-0.88, 4.7]].map(([x, z]) => [x, 2.22, z]), 0.008, WHT, 3);
      pipe(mb, [[0.97, -5.0], [0.94, -5.6], [0.79, -6.1], [0.57, -6.4], [0.28, -6.52], [-0.28, -6.52], [-0.57, -6.4], [-0.79, -6.1], [-0.94, -5.6], [-0.97, -5.0]].map(([x, z]) => [x, 2.0, z]), 0.008, WHT, 3);
      // ---- the four funnels: casing, the raked stack in its bands, steam pipes, the pom-pom emblem, guy wires
      [1.95, 0.65, -0.65, -1.95].forEach(z0 => {
        const rk = (y) => z0 - (y - 2.6) * 0.1, fr = (y, c, k) => ({ y, rx: 0.21 * (k || 1), rz: 0.29 * (k || 1), z: rk(y), color: c });
        cbox(mb, 0, 2.6, z0, 0.6, 0.16, 0.78, WHT, 0.25);
        mb.loft([fr(2.6, FUN), fr(3.5, BLK), fr(3.54, FUN), fr(3.62, BLK), fr(3.66, FUN), fr(3.84, WHT), fr(4.02, FUN), fr(4.22, BLK), Object.assign(fr(4.74, BLK, 1.03), { capColor: '#0a0a0c' })],
          { sides: 14, color: FUN, capBottom: false });
        [-0.07, 0.07].forEach(x => tube(mb, [x, 2.66, z0 + 0.31], [x, 4.86, rk(4.86) + 0.29], 0.017, 0.017, WSH, 5));
        LR(s => {
          dot(mb, [s * 0.214, 3.93, rk(3.93)], [s, 0, 0], 0.13, GOLD); dot(mb, [s * 0.217, 3.93, rk(3.93)], [s, 0, 0], 0.06, POM);
          [-0.32, 0.32].forEach(dz => tube(mb, [s * 0.19, 4.05, rk(4.05) + dz * 0.4], [s * 0.9, 2.21, z0 + dz], 0.005, 0.005, ROPE, 3, false));
        });
      });
      // the ventilator cowls on the boat deck house
      LR(s => [2.48, 1.3, 0.0, -1.3, -2.6, -3.25].forEach(z => {
        mb.prism(s * 0.43, 2.52, z, 0.035, 0.035, 0.15, 6, WHT);
        mb.push(); mb.translate(s * 0.43, 2.7, z - 0.02); mb.rotate(PI / 2, 0, 0); mb.prism(0, 0, 0, 0.04, 0.072, 0.08, 8, WHT, true, false, true); mb.pop();
        dot(mb, [s * 0.43, 2.7, z + 0.062], [0, 0, 1], 0.1, '#a03028');
      }));
      // ---- sixteen lifeboats in their davits along the boat deck
      LR(s => [2.4, 1.85, 1.25, 0.7, -0.3, -0.85, -1.45, -2.0].forEach(zc => {
        const y0 = 2.28, bs = (z, w) => ({ z, pts: [[w * 0.4, y0], [w, y0 + 0.045], [w, y0 + 0.1], [-w, y0 + 0.1], [-w, y0 + 0.045], [-w * 0.4, y0]] });
        mb.push(); mb.translate(s * 0.8, 0, 0);
        secLoft(mb, [bs(zc - 0.21, 0.02), bs(zc - 0.16, 0.075), bs(zc + 0.16, 0.075), bs(zc + 0.21, 0.015)], (k, i) => i === 2 ? '#c8bca0' : WHT);
        mb.pop();
        [-0.17, 0.17].forEach(dz => { const z = zc + dz; tube(mb, [s * 0.93, 2.2, z], [s * 0.95, 2.48, z], 0.014, 0.012, WSH, 4); tube(mb, [s * 0.95, 2.48, z], [s * 0.8, 2.5, z], 0.012, 0.01, WSH, 4); });
      }));
      // ---- the masts (crow's nest, yards, red pom-pom trucks), the stays and shrouds, the wireless aerial
      tube(mb, [0, 2.12, 5.3], [0, 6.0, 5.12], 0.045, 0.022, BUFF, 6);
      mb.prism(0, 4.24, 5.21, 0.09, 0.09, 0.13, 8, '#a88a5a'); mb.prism(0, 4.37, 5.21, 0.1, 0.1, 0.02, 8, '#8a6e44');
      tube(mb, [-0.4, 5.2, 5.15], [0.4, 5.2, 5.15], 0.012, 0.012, BUFF, 4);
      tube(mb, [0, 2.06, -5.85], [0, 5.9, -6.03], 0.045, 0.022, BUFF, 6);
      tube(mb, [-0.38, 5.1, -5.99], [0.38, 5.1, -5.99], 0.012, 0.012, BUFF, 4);
      mb.sphere(0, 6.07, 5.11, 0.075, 0.075, 0.075, POM, 8, 6, true); mb.sphere(0, 5.97, -6.04, 0.075, 0.075, 0.075, POM, 8, 6, true);
      const rope = (a, b) => tube(mb, a, b, 0.005, 0.005, ROPE, 3, false);
      rope([0, 5.9, 5.13], [0, 2.14, 6.5]); rope([0, 5.8, -6.02], [0, 1.95, -6.5]);
      LR(s => { rope([s * 0.62, 2.12, 5.1], [0, 4.3, 5.21]); rope([s * 0.5, 2.12, 5.55], [0, 4.3, 5.21]); rope([s * 0.7, 1.9, -5.55], [0, 4.2, -5.92]); rope([s * 0.6, 1.92, -6.05], [0, 4.2, -5.92]); });
      [-0.1, 0.1].forEach(x => { rope([x, 5.62, 5.14], [x, 5.2, 0]); rope([x, 5.2, 0], [x, 5.52, -6.0]); });
      // ---- the name on both bows and the stern (FF7.field.text3d: the field's stroke lettering, once it is loaded)
      const T3 = FF7.field && FF7.field.text3d;
      if (T3) {
        LR(s => { const u = V.norm([0.115, 0, -s * 1.1]), uu = s > 0 ? u : V.norm([0.115, 0, 1.1]);
          T3(mb, 'S.S. MOOGLE', { pos: [s * 0.955, 1.585, 4.3], u: uu, v: [0, 1, 0], size: 0.11, col: GOLD, w: 0.16, off: 0.012 }); });
        T3(mb, 'S.S. MOOGLE', { pos: [0, 1.7, -6.55], u: [-1, 0, 0], v: [0, 1, 0], size: 0.05, col: GOLD, w: 0.16, off: 0.004 });
        T3(mb, 'KUPO ISLES', { pos: [0, 1.6, -6.55], u: [-1, 0, 0], v: [0, 1, 0], size: 0.034, col: GOLD, w: 0.16, off: 0.004 });
      }
    });
    // lamps: the side lights on the bridge wings (port red, starboard green), masthead lamps, the gangway doors' lamps
    glow(m, 'hull', mb => {
      LR(s => { dot(mb, [s * 1.032, 2.68, 2.99], [s, 0, 0], 0.06, s > 0 ? '#ff2020' : '#20ff40'); dot(mb, [s * 1.004, 1.66, 2.2], [s, 0, 0], 0.05, '#fff0c0'); });
      dot(mb, [0, 4.85, 5.2], [0, 0, 1], 0.05, '#fff8d0'); dot(mb, [0, 4.7, -5.94], [0, 0, -1], 0.05, '#fff8d0');
    });
    m.waterline = WL;
    m.door = [1.0, 1.15, 2.2];
    m.clips = {
      idle: { dur: 240, fn(m, p) { addRot(m, 'hull', 2, S(p * TAU) * 0.006); addRot(m, 'hull', 0, S(p * TAU * 2 + 1) * 0.003); addPos(m, 'hull', 1, S(p * TAU * 2) * 0.012); } },
      move: { dur: 180, fn(m, p) { addRot(m, 'hull', 2, S(p * TAU) * 0.012); addRot(m, 'hull', 0, S(p * TAU * 2) * 0.006); addPos(m, 'hull', 1, S(p * TAU * 2 + 0.5) * 0.02); } },
    };
    return m;
  }

  // ================================================================== registry
  const VEHICLES = {
    buggy: { build: buildBuggy, name: 'Buggy' },
    sa27: { build: buildSA27, name: 'Shin-Ra sA-27' },
    motorcycle: { build: buildMotorcycle, name: 'Hardy-Daytona' },
    truck: { build: buildTruck, name: 'Shinra truck' },
    tiny_bronco: { build: buildBronco, name: 'Tiny Bronco' },
    highwind: { build: buildHighwind, name: 'Highwind' },
    submarine_gray: { build: (o) => buildSub(Object.assign({}, o, { livery: 'gray' })), name: 'Shinra submarine (gray)' },
    submarine_red: { build: (o) => buildSub(Object.assign({}, o, { livery: 'red' })), name: 'Shinra submarine (red)' },
    shinra_helicopter: { build: buildHeli, name: 'Shinra helicopter' },
    gelnika: { build: buildGelnika, name: 'Gelnika' },
    rocket_26: { build: buildRocket, name: 'Shinra No. 26' },
    cargo_ship: { build: buildShip, name: 'Cargo ship' },
    ocean_liner: { build: buildLiner, name: 'Ocean liner (the S.S. Moogle)' },
    train: { build: buildTrain, name: 'Midgar train' },
    mono_coaster: { build: buildCoaster, name: 'Speed Square coaster' },
    snowboard: { build: buildSnowboard, name: 'Snowboard' },
    gondola: { build: buildGondola, name: 'Gold Saucer gondola' },
    sister_ray: { build: buildSisterRay, name: 'Sister Ray' },
    wagon: { build: buildWagon, name: 'Chocobo wagon' },
  };

  // finalise: metadata, default anims, bounding size
  function finish(m, id) {
    m.vehicle = id;
    m.anims = Object.assign({ idle: 'idle', move: 'move', walk: 'move', run: 'move' }, m.anims || {});
    m.computeWorld();
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    const hidden = (b) => { for (let x = b; x; x = x.parent) if (!x.visible) return true; return false; };
    for (const b of m.order) for (const a of b.meshes) {
      const me = a.mesh, W = b.world; if (!me.count || hidden(b)) continue;
      for (let i = 0; i < me.count; i++) {
        const x = me.pos[i * 3], y = me.pos[i * 3 + 1], z = me.pos[i * 3 + 2];
        const w = [W[0] * x + W[4] * y + W[8] * z + W[12], W[1] * x + W[5] * y + W[9] * z + W[13], W[2] * x + W[6] * y + W[10] * z + W[14]];
        for (let k = 0; k < 3; k++) { if (w[k] < mn[k]) mn[k] = w[k]; if (w[k] > mx[k]) mx[k] = w[k]; }
      }
    }
    if (!m.keepY && Math.abs(mn[1]) > 0.005 && m.root) {   // sit the lowest point on the ground
      m.root.offset[1] -= mn[1]; mx[1] -= mn[1]; mn[1] = 0;
      for (const k in (m.seats || {})) m.seats[k][1] += m.root.offset[1];
    }
    m.bounds = { min: mn, max: mx };
    m.size = [mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]];
    if (m.realSize) m.fieldScale = m.realSize[2] / 1.7 / m.size[2];   // x this = true size next to a 1.0-tall character
    m.height = m.size[1];
    return m;
  }
  const META = ['vehicle', 'clips', 'anims', 'wheels', 'props', 'rotors', 'steerBones', 'seats', 'harness', 'cableY', 'bounds', 'size', 'height', 'waterline', 'floats', 'opts', 'onPose', 'info', 'realSize', 'fieldScale', 'keepY'];
  function clone(tpl) {
    const m = new FF7.Model();
    for (const b of tpl.order) { const nb = m.bone(b.name, b.parent ? b.parent.name : null, b.offset.slice(), b.rest.slice()); nb.meshes = b.meshes.slice(); nb.visible = b.visible; }
    META.forEach(k => { if (tpl[k] !== undefined) m[k] = tpl[k]; });
    m.steer = 0;
    return m;
  }
  const ALIASES = {
    bronco: ['tiny_bronco', { boat: true }], submarine: ['submarine_gray'], sub: ['submarine_gray'], red_submarine: ['submarine_red'],
    bike: ['motorcycle'], hardy_daytona: ['motorcycle'], helicopter: ['shinra_helicopter'], ship: ['cargo_ship'], rocket: ['rocket_26'],
    coaster: ['mono_coaster'], gelnika_sunken: ['gelnika', { sunken: true }], chocobo_wagon: ['wagon'], carriage: ['wagon'], sA27: ['sa27'], sA37: ['truck'],
  };
  // Recoloured copies of a template's meshes: opts.tint (hex: repaint toward that colour) and opts.wreck
  // (rusted and faded, lamps dead, sagging on a flat tyre; true or a rust colour). Used for set pieces
  // such as the burnt-out Shinra truck in Nibelheim (fieldgeo bakes it into the field mesh).
  function weather(tpl, o) {
    const tint = o.tint ? FF7.glColor(o.tint) : null, rust = FF7.glColor(typeof o.wreck === 'string' ? o.wreck : '#6e3e22');
    const done = new Map();
    const fix = (me, unlit) => {
      if (done.has(me)) return done.get(me);
      const c = new Float32Array(me.col);
      for (let i = 0; i < me.count; i++) {
        let r = c[i * 4], g = c[i * 4 + 1], b = c[i * 4 + 2];
        const l = 0.3 * r + 0.59 * g + 0.11 * b;
        if (tint) { r = r * 0.3 + l * tint[0] * 1.1; g = g * 0.3 + l * tint[1] * 1.1; b = b * 0.3 + l * tint[2] * 1.1; }
        if (o.wreck) {
          const n = U.hash(Math.floor(me.pos[i * 3] * 9), Math.floor(me.pos[i * 3 + 2] * 9), Math.floor(me.pos[i * 3 + 1] * 9) + 7);
          const k = unlit ? 0.9 : 0.35 + 0.45 * n, dark = unlit ? 0.25 : 0.62 + 0.22 * n;
          r = (r + (rust[0] * (0.6 + l) - r) * k) * dark; g = (g + (rust[1] * (0.6 + l) - g) * k) * dark; b = (b + (rust[2] * (0.6 + l) - b) * k) * dark;
        }
        c[i * 4] = Math.min(1, r); c[i * 4 + 1] = Math.min(1, g); c[i * 4 + 2] = Math.min(1, b);
      }
      const m2 = Object.assign({}, me, { col: c, gl: null });
      if (o.wreck) m2.unlit = false;
      done.set(me, m2); return m2;
    };
    for (const bn of tpl.order) bn.meshes = bn.meshes.map(a => ({ mesh: fix(a.mesh, !!(a.mesh.unlit || (a.opts && a.opts.unlit))), m: a.m, opts: o.wreck && a.opts && a.opts.unlit ? Object.assign({}, a.opts, { unlit: false }) : a.opts }));
    if (o.wreck && tpl.root) { const r = tpl.root.rest; r[0] += 0.03; r[2] -= 0.06; tpl.root.rot = r.slice(); }
    return tpl;
  }
  const cache = new Map();
  const V3D = FF7.vehicles3d = {
    VEHICLES, ALIASES,
    list: [],
    has: (id) => !!(VEHICLES[id] || ALIASES[id]),
    // build(id, opts) -> FF7.Model (meshes are shared between models built with the same id + opts)
    build(id, opts = {}) {
      if (!VEHICLES[id] && ALIASES[id]) { const al = ALIASES[id]; opts = Object.assign({}, al[1] || {}, opts); id = al[0]; }
      const def = VEHICLES[id];
      if (!def) { console.warn('vehicles3d: unknown vehicle', id); return null; }
      const o = Object.assign({}, opts); delete o.style;
      const key = id + '|' + JSON.stringify(o);
      let tpl = cache.get(key);
      if (!tpl) { tpl = finish(def.build(o), id); if (o.tint || o.wreck) weather(tpl, o); tpl.opts = o; cache.set(key, tpl); }
      const m = clone(tpl);
      m.play('idle');
      return m;
    },
  };
  V3D.list = Object.keys(VEHICLES);
})();
