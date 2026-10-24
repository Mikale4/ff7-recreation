// Modeling toolkit for FF7-style low-poly characters: lofted (contoured) limbs/torsos/heads,
// blade hair spikes, shells, panels, path sweeps. Adds methods to FF7.MeshBuilder.prototype.
(function () {
  const U = FF7.util, V = FF7.V3;
  const P = FF7.MeshBuilder.prototype;
  const col = (c) => FF7.glColor(c);

  // Superellipse point: sq = 2 ellipse, larger = boxier
  function se(a, rx, rz, sq) {
    const c = Math.cos(a), s = Math.sin(a);
    const e = 2 / (sq || 2);
    return [Math.sign(c) * Math.pow(Math.abs(c), e) * rx, Math.sign(s) * Math.pow(Math.abs(s), e) * rz];
  }
  // Angle convention for rings: a = 0 -> +x (model's left), a = PI/2 -> +z (front), a = PI -> -x, 3PI/2 -> back.
  // Cylindrical texture u for an angle: front centre u = 0.5, model's left (viewer's right) 0.75, back seam u = 0/1.
  const cylU = (a) => { let u = 0.75 - a / (Math.PI * 2); u -= Math.floor(u); return u; };
  P.cylU = cylU;

  // Loft along local Y through rings: { y, rx, rz, x?, z?, sq?, color?, colors?(i,n), rzf? (front z radius), rzb? (back z radius) }
  // opts: { sides=8, smooth=true, capTop, capBottom, color, sq, phase,
  //         arc: [a0, a1]  -> open strip covering only those angles (no caps),
  //         uv: 'front' (planar projection through uvBox [x0,x1,y0,y1]) | 'cyl' (u around, v along y; vRange [y0,y1]) }
  P.loft = function (rings, opts = {}) {
    const n = opts.sides || 8;
    const arc = opts.arc || null;
    const closed = !arc;
    const phase = opts.phase != null ? opts.phase : Math.PI / n;
    const angOf = (i) => arc ? arc[0] + (i / n) * (arc[1] - arc[0]) : phase + (i / n) * Math.PI * 2;
    const nv = closed ? n : n + 1;
    const pts = rings.map(r => {
      const ring = [];
      for (let i = 0; i < nv; i++) {
        const a = angOf(i);
        let rz = r.rz;
        const s = Math.sin(a);
        if (s > 0 && r.rzf != null) rz = r.rzf; else if (s < 0 && r.rzb != null) rz = r.rzb;
        const [px, pz] = se(a, r.rx, rz, r.sq || opts.sq);
        ring.push([(r.x || 0) + px, r.y, (r.z || 0) + pz]);
      }
      return ring;
    });
    // smooth normals by averaging face normals around each vertex
    const nrm = pts.map(r => r.map(() => [0, 0, 0]));
    const faceN = (a, b, c) => V.cross(V.sub(b, a), V.sub(c, a));
    const nq = closed ? n : n;
    for (let j = 0; j < pts.length - 1; j++) for (let i = 0; i < nq; i++) {
      const i2 = closed ? (i + 1) % n : i + 1;
      const a = pts[j][i], b = pts[j][i2], c = pts[j + 1][i2];
      let fn = faceN(a, b, c);
      if (V.len(fn) < 1e-12) fn = faceN(a, c, pts[j + 1][i]);
      [[j, i], [j, i2], [j + 1, i2], [j + 1, i]].forEach(([jj, ii]) => { nrm[jj][ii] = V.add(nrm[jj][ii], fn); });
    }
    // outward check: normal should point away from ring centre
    const flip = (() => {
      let acc = 0;
      for (let j = 0; j < pts.length; j++) for (let i = 0; i < nv; i++) {
        const r = rings[j], p = pts[j][i], nn = nrm[j][i];
        acc += nn[0] * (p[0] - (r.x || 0)) + nn[2] * (p[2] - (r.z || 0));
      }
      return acc < 0;
    })();
    let vr = opts.vRange;
    if (opts.uv === 'cyl' && !vr) { const ys = rings.map(r => r.y); vr = [Math.min(...ys), Math.max(...ys)]; }
    const uvFront = (p) => {
      const b = opts.uvBox; // [x0, x1, y0, y1]
      return [(p[0] - b[0]) / (b[1] - b[0]), 1 - (p[1] - b[2]) / (b[3] - b[2])];
    };
    const vOf = (y) => 1 - (y - vr[0]) / (vr[1] - vr[0]);
    for (let j = 0; j < pts.length - 1; j++) {
      const c0 = rings[j].color || opts.color || '#ffffff';
      for (let i = 0; i < nq; i++) {
        const i2 = closed ? (i + 1) % n : i + 1;
        let a = pts[j][i], b = pts[j][i2], c = pts[j + 1][i2], d = pts[j + 1][i];
        let na = nrm[j][i], nb = nrm[j][i2], nc = nrm[j + 1][i2], nd = nrm[j + 1][i];
        const cc = rings[j].colors ? (rings[j].colors(i, n) || c0) : c0;
        if (opts.smooth === false) { na = nb = nc = nd = null; }
        const N = (v) => v ? V.norm(flip ? V.scale(v, -1) : v) : null;
        let uvs = null;
        if (opts.uv === 'front') {
          // uvMinSin: only quads facing forward (sin of the quad's centre angle >= uvMinSin) get the planar
          // projection; the rest sample the single texel uvElse (e.g. plain skin at the back of a head)
          const ca = closed ? angOf(i) + Math.PI / n : angOf(i + 0.5);
          if (opts.uvMinSin != null && Math.sin(ca) < opts.uvMinSin) { const e = opts.uvElse || [0.01, 0.01]; uvs = [e, e, e, e]; }
          else uvs = [uvFront(a), uvFront(b), uvFront(c), uvFront(d)];
        }
        else if (opts.uv === 'cyl') {
          let ua = cylU(angOf(i)), ub = cylU(angOf(i2) + (closed && i2 === 0 ? Math.PI * 2 : 0));
          if (ub > ua + 0.5) ua += 1; else if (ua > ub + 0.5) ub += 1;
          uvs = [[ua, vOf(a[1])], [ub, vOf(b[1])], [ub, vOf(c[1])], [ua, vOf(d[1])]];
        }
        if (!flip) this.quad(a, b, c, d, cc, uvs, na ? [N(na), N(nb), N(nc), N(nd)] : null);
        else this.quad(d, c, b, a, cc, uvs ? [uvs[3], uvs[2], uvs[1], uvs[0]] : null, na ? [N(nd), N(nc), N(nb), N(na)] : null);
      }
    }
    if (!closed) return this;
    const cap = (ring, r, up) => {
      const ctr = [r.x || 0, r.y, r.z || 0];
      const c = r.capColor || r.color || opts.color || '#ffffff';
      let cuv = null;
      if (opts.uv === 'front') cuv = opts.uvMinSin != null ? (() => opts.uvElse || [0.01, 0.01]) : uvFront;
      else if (opts.uv === 'cyl') { const v = vOf(r.y); cuv = (p) => [0.5, v]; }
      for (let i = 0; i < n; i++) {
        const i2 = (i + 1) % n;
        const t2 = up ? [ctr, ring[i2], ring[i]] : [ctr, ring[i], ring[i2]];
        this.tri(t2[0], t2[1], t2[2], c, cuv ? t2.map(cuv) : null);
      }
    };
    const ascending = rings[rings.length - 1].y > rings[0].y;
    if (opts.capBottom !== false) cap(ascending ? pts[0] : pts[pts.length - 1], ascending ? rings[0] : rings[rings.length - 1], false);
    if (opts.capTop !== false) cap(ascending ? pts[pts.length - 1] : pts[0], ascending ? rings[rings.length - 1] : rings[0], true);
    return this;
  };

  // Sweep an (elliptical) cross-section along a 3D polyline (tails, braids, hair strands, cables).
  // path: [[x,y,z],...]; rad: number | [r0, r1, ...] | [[rx, ry], ...] per path point (0 = pointed end).
  // opts: { sides=6, color, colors?(k, i, n) per segment, capStart=true, capEnd=true, up: reference vector, smooth=true }
  P.sweep = function (path, rad, opts = {}) {
    const n = opts.sides || 6, N = path.length;
    const rOf = (k) => { const r = Array.isArray(rad) ? rad[k] : rad; return Array.isArray(r) ? r : [r, r]; };
    const tan = path.map((p, k) => V.norm(V.sub(path[Math.min(N - 1, k + 1)], path[Math.max(0, k - 1)])));
    let up = opts.up || [0, 0, 1];
    if (Math.abs(V.dot(V.norm(up), tan[0])) > 0.95) up = Math.abs(tan[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    let sx = V.norm(V.cross(up, tan[0]));
    const rot = (v, ax, ang) => { // Rodrigues
      const c = Math.cos(ang), s = Math.sin(ang);
      return V.add(V.add(V.scale(v, c), V.scale(V.cross(ax, v), s)), V.scale(ax, V.dot(ax, v) * (1 - c)));
    };
    const rings = [], nrms = [];
    for (let k = 0; k < N; k++) {
      if (k > 0) {
        const ax = V.cross(tan[k - 1], tan[k]), s = V.len(ax);
        if (s > 1e-6) sx = V.norm(rot(sx, V.scale(ax, 1 / s), Math.atan2(s, V.dot(tan[k - 1], tan[k]))));
      }
      const sy = V.norm(V.cross(tan[k], sx));
      const [rx, ry] = rOf(k);
      const ring = [], rn = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + (opts.phase || 0);
        const ca = Math.cos(a), sa = Math.sin(a);
        ring.push(V.add(path[k], V.add(V.scale(sx, ca * rx), V.scale(sy, sa * ry))));
        rn.push(V.norm(V.add(V.scale(sx, ca * (ry || 1)), V.scale(sy, sa * (rx || 1)))));
      }
      rings.push(ring); nrms.push(rn);
    }
    const smooth = opts.smooth !== false;
    for (let k = 0; k < N - 1; k++) {
      for (let i = 0; i < n; i++) {
        const i2 = (i + 1) % n;
        const c = (opts.colors && opts.colors(k, i, n)) || opts.color || '#ffffff';
        this.quad(rings[k][i], rings[k + 1][i], rings[k + 1][i2], rings[k][i2], c, null, smooth ? [nrms[k][i], nrms[k + 1][i], nrms[k + 1][i2], nrms[k][i2]] : null);
      }
    }
    const capC = opts.capColor || opts.color || '#ffffff';
    if (opts.capStart !== false && V.len(V.sub(rings[0][0], path[0])) > 1e-6) for (let i = 0; i < n; i++) this.tri(path[0], rings[0][i], rings[0][(i + 1) % n], capC);
    if (opts.capEnd !== false && V.len(V.sub(rings[N - 1][0], path[N - 1])) > 1e-6) for (let i = 0; i < n; i++) this.tri(path[N - 1], rings[N - 1][(i + 1) % n], rings[N - 1][i], capC);
    return this;
  };

  // Smooth curve through control points (Catmull-Rom), returns `segs` points per span
  P.curvePts = function (ctrl, segs = 3) {
    const out = [];
    for (let k = 0; k < ctrl.length - 1; k++) {
      const p0 = ctrl[Math.max(0, k - 1)], p1 = ctrl[k], p2 = ctrl[k + 1], p3 = ctrl[Math.min(ctrl.length - 1, k + 2)];
      for (let s = 0; s < segs; s++) {
        const t = s / segs, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
      }
    }
    out.push(ctrl[ctrl.length - 1].slice());
    return out;
  };

  // Hair blade: flattened pyramid from a base centre, growing along dir. `side` = width axis.
  // `side` can be an axis vector, or { radial: [cx,cy,cz] } to lay the blade flat on a surface
  // (width tangent to the surface around that centre).
  P.blade = function (base, dir, len, width, thick, color, side, tipColor) {
    const d = V.norm(dir);
    let sd;
    if (side && side.radial) { const r = V.norm(V.sub(base, side.radial)); sd = V.cross(d, r); if (V.len(sd) < 1e-4) sd = V.cross(d, [0, 1, 0]); sd = V.norm(sd); }
    else sd = side ? V.norm(side) : V.norm(V.cross(d, Math.abs(d[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const nd = V.norm(V.cross(d, sd));
    const tip = V.add(base, V.scale(d, len));
    const b0 = V.add(base, V.scale(sd, width / 2)), b1 = V.add(base, V.scale(sd, -width / 2));
    const f = V.add(base, V.scale(nd, thick / 2)), bk = V.add(base, V.scale(nd, -thick / 2));
    const c = color, tc = tipColor || color;
    this.tri(b0, f, tip, [col(c), col(c), col(tc)]);
    this.tri(f, b1, tip, [col(c), col(c), col(tc)]);
    this.tri(b1, bk, tip, [col(U.shade(c, -0.12)), col(U.shade(c, -0.12)), col(tc)]);
    this.tri(bk, b0, tip, [col(U.shade(c, -0.12)), col(U.shade(c, -0.12)), col(tc)]);
    this.tri(b0, b1, f, c); this.tri(b1, b0, bk, c);
    return this;
  };
  // Curved spike: a tapered strand bent through `bend` (a second direction) — for swept hair spikes/locks.
  // base, dir (initial), bend (final direction), len, width, thick
  P.lock = function (base, dir, bend, len, width, thick, color, side, tipColor) {
    const d1 = V.norm(dir), d2 = V.norm(bend);
    const mid = V.add(base, V.scale(d1, len * 0.5));
    const sd0 = side ? (side.radial ? V.norm(V.cross(d1, V.norm(V.sub(base, side.radial)))) : V.norm(side)) : V.norm(V.cross(d1, Math.abs(d1[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0]));
    const nd0 = V.norm(V.cross(d1, sd0));
    const q = (p, w, t, sd, nd) => [V.add(V.add(p, V.scale(sd, w / 2)), V.scale(nd, t / 2)), V.add(V.add(p, V.scale(sd, -w / 2)), V.scale(nd, t / 2)), V.add(V.add(p, V.scale(sd, -w / 2)), V.scale(nd, -t / 2)), V.add(V.add(p, V.scale(sd, w / 2)), V.scale(nd, -t / 2))];
    const A = q(base, width, thick, sd0, nd0), B = q(mid, width * 0.72, thick * 0.8, sd0, nd0);
    const dk = U.shade(color, -0.12);
    // quad order so faces point outward: sides 0 (front, +nd), 1 (-sd), 2 (back), 3 (+sd)
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; this.quad(A[i2], A[i], B[i], B[i2], i === 2 ? dk : color); }
    this.quad(A[3], A[2], A[1], A[0], dk);
    const tip = V.add(mid, V.scale(d2, len * 0.55));
    const tc = tipColor || color;
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; this.tri(B[i2], B[i], tip, [col(i === 2 ? dk : color), col(i === 2 ? dk : color), col(tc)]); }
    return this;
  };
  // Curved blade (two segments) for swept hair spikes
  P.blade2 = function (base, dir1, dir2, len, width, thick, color, side) {
    const d1 = V.norm(dir1), mid = V.add(base, V.scale(d1, len * 0.5));
    // first half as a frustum-like quad strip, second half as a blade
    this.blade(mid, dir2, len * 0.6, width * 0.7, thick * 0.8, color, side);
    const sd = side ? V.norm(side) : V.norm(V.cross(d1, [0, 1, 0]));
    const nd = V.norm(V.cross(d1, sd));
    const q = (p, w, t) => [V.add(V.add(p, V.scale(sd, w / 2)), V.scale(nd, t / 2)), V.add(V.add(p, V.scale(sd, -w / 2)), V.scale(nd, t / 2)), V.add(V.add(p, V.scale(sd, -w / 2)), V.scale(nd, -t / 2)), V.add(V.add(p, V.scale(sd, w / 2)), V.scale(nd, -t / 2))];
    const A = q(base, width, thick), B = q(mid, width * 0.7, thick * 0.8);
    for (let i = 0; i < 4; i++) { const i2 = (i + 1) % 4; this.quad(A[i], A[i2], B[i2], B[i], i % 2 ? U.shade(color, -0.1) : color); }
    return this;
  };

  // Flat panel (extruded polygon in the XY plane, facing +z), thickness along z
  P.panel = function (pts, z, thick, color, backColor) {
    const n = pts.length;
    const F = pts.map(p => [p[0], p[1], z + thick / 2]), Bk = pts.map(p => [p[0], p[1], z - thick / 2]);
    for (let i = 1; i < n - 1; i++) { this.tri(F[0], F[i], F[i + 1], color); this.tri(Bk[0], Bk[i + 1], Bk[i], backColor || color); }
    for (let i = 0; i < n; i++) { const i2 = (i + 1) % n; this.quad(F[i2], F[i], Bk[i], Bk[i2], U.shade(color, -0.15)); }
    return this;
  };

  // Rounded box (chamfered) — for fists, boots, pads
  P.rbox = function (x, y, z, w, h, d, color, chamfer = 0.25) {
    const c = Math.min(w, h, d) * chamfer;
    const hw = w / 2, hh = h / 2, hd = d / 2;
    this.push(); this.translate(x, y, z);
    this.loft([
      { y: -hh, rx: hw - c, rz: hd - c, sq: 5 },
      { y: -hh + c, rx: hw, rz: hd, sq: 5 },
      { y: hh - c, rx: hw, rz: hd, sq: 5 },
      { y: hh, rx: hw - c, rz: hd - c, sq: 5 },
    ], { sides: 8, color, smooth: false });
    this.pop();
    return this;
  };
})();
