// Builds the static 3D geometry for a field map from its ASCII grid.
(function () {
  const U = FF7.util, MB = FF7.MeshBuilder;
  const F = FF7.field;
  const TILE = F.TILE = 0.5;
  const STEP = F.HSTEP = 0.3;            // elevation per height digit

  // Parse a map definition into a tile grid structure (cached on the map def).
  F.parseMap = function (map) {
    if (map._parsed) return map._parsed;
    const rows = map.grid || [];
    const h = rows.length, w = Math.max(...rows.map(r => r.length), 1);
    const legend = Object.assign({}, F.LEGEND, map.legend || {});
    const tiles = new Array(w * h);
    const elev = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x] != null ? rows[y][x] : ' ';
        const tname = legend[ch] || 'floor';
        tiles[y * w + x] = F.tileTypes[tname] || F.tileTypes.floor;
        const hr = map.heights && map.heights[y];
        const hc = hr ? hr[x] : '0';
        elev[y * w + x] = hc && hc >= '0' && hc <= '9' ? (+hc) * STEP : 0;
      }
    }
    const P = { w, h, tiles, elev, legend, map };
    P.at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? F.tileTypes.void : tiles[y * w + x];
    P.el = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : elev[y * w + x];
    P.walkable = (x, y) => { const t = P.at(x, y); return t.walk; };
    map._parsed = P;
    return P;
  };

  // Stairs: a run of consecutive stair tiles forms ONE flight from the floor before the run to the
  // floor after it (so a 2-tile-deep staircase is a single continuous flight, not two).
  // a ladder tile (a stair the player climbs): its foot and top heights and the side its wall is on. A ladder
  // several tiles long is one ladder: only the tile against the upper level's wall (top) draws it and the wall
  function ladderOf(P, x, y) {
    const li = stairInfo(P, x, y), e = P.el(x, y), A = li.A != null ? li.A : e, B = li.B != null ? li.B : e;
    const face = li.axis === 'x' ? (A > B ? 'w' : 'e') : (A > B ? 'n' : 's');
    const top = A > B ? li.idx === 0 : li.idx === (li.len || 1) - 1;
    return { lo: Math.min(A, B), hi: Math.max(A, B), face, top };
  }
  function stairInfo(P, x, y) {
    P._stairs = P._stairs || {};
    const key = x + ',' + y;
    if (P._stairs[key] !== undefined) return P._stairs[key];
    const e = P.el(x, y);
    const run = (dx, dy) => {
      let s0 = 0, s1 = 0;
      while (P.at(x - dx * (s0 + 1), y - dy * (s0 + 1)).stair) s0++;
      while (P.at(x + dx * (s1 + 1), y + dy * (s1 + 1)).stair) s1++;
      const bx = x - dx * (s0 + 1), by = y - dy * (s0 + 1), ax = x + dx * (s1 + 1), ay = y + dy * (s1 + 1);
      const A = P.walkable(bx, by) ? P.el(bx, by) : null, B = P.walkable(ax, ay) ? P.el(ax, ay) : null;
      return { idx: s0, len: s0 + s1 + 1, A, B };
    };
    const rx = run(1, 0), rz = run(0, 1);
    const dxh = rx.A != null && rx.B != null ? Math.abs(rx.A - rx.B) : -1;
    const dzh = rz.A != null && rz.B != null ? Math.abs(rz.A - rz.B) : -1;
    let info;
    if (dzh >= dxh && dzh > 0) info = { axis: 'z', idx: rz.idx, len: rz.len, A: rz.A, B: rz.B };
    else if (dxh > 0) info = { axis: 'x', idx: rx.idx, len: rx.len, A: rx.A, B: rx.B };
    else {
      // a stair with only one open end (or none): fall back to the old neighbour slope
      const n = P.walkable(x, y - 1) ? P.el(x, y - 1) : e, s = P.walkable(x, y + 1) ? P.el(x, y + 1) : e;
      const wv = P.walkable(x - 1, y) ? P.el(x - 1, y) : e, ev = P.walkable(x + 1, y) ? P.el(x + 1, y) : e;
      if (Math.abs(n - s) >= Math.abs(wv - ev) && n !== s) info = { axis: 'z', idx: 0, len: 1, A: n, B: s };
      else if (wv !== ev) info = { axis: 'x', idx: 0, len: 1, A: wv, B: ev };
      else info = { axis: null, A: e, B: e, idx: 0, len: 1 };
    }
    // this tile's share of the flight
    info.a = U.lerp(info.A, info.B, info.idx / info.len);
    info.b = U.lerp(info.A, info.B, (info.idx + 1) / info.len);
    return (P._stairs[key] = info);
  }
  F.stairInfo = stairInfo;
  // Free-form ('steps') stairs follow any path, turns and spirals included: each tile's surface is a
  // ramp through its corner heights (the average of the walkable tiles meeting at that corner, ignoring
  // tiles more than a step away, e.g. the next turn of a spiral).
  function stepsCorner(P, x, y, cx, cy) {
    const own = P.el(x, y); let sum = 0, n = 0;
    for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) { const tx = cx + dx, ty = cy + dy; if (!P.walkable(tx, ty)) continue; const e = P.el(tx, ty); if (Math.abs(e - own) > STEP * 1.2) continue; sum += e; n++; }
    return n ? sum / n : own;
  }
  function stepsProfile(P, x, y) {
    P._steps = P._steps || {};
    const key = x + ',' + y;
    let c = P._steps[key];
    if (!c) c = P._steps[key] = [stepsCorner(P, x, y, x, y), stepsCorner(P, x, y, x + 1, y), stepsCorner(P, x, y, x, y + 1), stepsCorner(P, x, y, x + 1, y + 1)];
    return (fx, fz) => U.lerp(U.lerp(c[0], c[1], fx), U.lerp(c[2], c[3], fx), fz);
  }
  // returns function(fx,fz in 0..1) -> elevation on a stair tile
  function stairProfile(P, x, y) {
    if (P.at(x, y).steps) return stepsProfile(P, x, y);
    const i = stairInfo(P, x, y);
    if (i.axis === 'z') return (fx, fz) => U.lerp(i.a, i.b, fz);
    if (i.axis === 'x') return (fx, fz) => U.lerp(i.a, i.b, fx);
    return () => i.a;
  }
  F.stairProfile = stairProfile;

  // Ground height at world position
  F.groundAt = function (P, wx, wz) {
    const tx = Math.floor(wx / TILE), ty = Math.floor(wz / TILE);
    const t = P.at(tx, ty);
    if (t.stair) { const f = stairProfile(P, tx, ty); return f(wx / TILE - tx, wz / TILE - ty); }
    return P.el(tx, ty);
  };

  // Stairs drawn as real steps (treads + risers + stepped side panels) following the stair profile;
  // walking still uses the smooth profile (groundAt), which the steps straddle by half a step at most.
  // quad with per-corner colours (a b c d CCW, colours in the same order)
  // quad with per-corner colours; S: world-space UVs (x/S, z/S) for textured floors
  function quadC(mb, a, b, c, d, ca, cb, cc, cd, S) {
    const uv = S ? (p) => [p[0] / S, p[2] / S] : null;
    mb.tri(a, b, c, [ca, cb, cc], uv && [uv(a), uv(b), uv(c)]); mb.tri(a, c, d, [ca, cc, cd], uv && [uv(a), uv(c), uv(d)]);
  }
  // tb / S: optional textured builder for the treads (the floor material of the stair tile) and its scale
  function stairMesh(mb, P, x, y, x0, z0, x1, z1, fc, th, e, tb, S) {
    const info = stairInfo(P, x, y);
    const alongZ = info.axis === 'z';
    const a = info.a, b = info.b;                            // this tile's share of the flight
    if (!info.axis || a === b) { if (tb) tb.floor(x0, z0, x1, z1, e, fc, [x0 / S, z0 / S, x1 / S, z1 / S]); else mb.floor(x0, z0, x1, z1, e, fc); return; }
    // same step height along the whole flight, so steps line up across tiles
    const k = Math.max(1, Math.min(5, Math.round(Math.abs(info.B - info.A) / 0.15 / info.len)));
    // gentle contrast: risers only slightly darker than treads, no bright edge strips
    const treadCol = U.shade(fc, 0.05), noseCol = null, riserCol = U.shade(fc, -0.18), sideCol = U.shade(th.wall || fc, -0.2);
    const NOSE = 0.03;   // pale strip along each step's leading edge (like FF7's metal stair edges)
    const H = [a]; for (let i = 0; i < k; i++) H.push(U.lerp(a, b, (i + 0.5) / k)); H.push(b);
    const bottom = (dx, dy) => { const nt = P.at(x + dx, y + dy); if (nt.wall || nt.stair) return null; return nt.void ? Math.min(a, b) - 3 : nt.water ? P.el(x + dx, y + dy) - 0.45 : P.el(x + dx, y + dy); };
    for (let i = 0; i < k; i++) {
      const t = H[i + 1], u0 = i / k, u1 = (i + 1) / k;
      if (alongZ) {
        const za = z0 + (z1 - z0) * u0, zb = z0 + (z1 - z0) * u1;
        { // back of the tread (next to the higher step) darker, front (step edge) lighter
          const backAtZa = H[i] > t;                       // the higher step is on the za side
          const cBack = FF7.glColor(U.shade(treadCol, -0.1)), cFront = FF7.glColor(treadCol);
          const cza = backAtZa ? cBack : cFront, czb = backAtZa ? cFront : cBack;
          quadC(tb || mb, [x0, t, zb], [x1, t, zb], [x1, t, za], [x0, t, za], czb, czb, cza, cza, tb && S); }
        { const lower = (H[i] > t) ? H[i + 2] : H[i]; const edgeZ = (H[i] > t) ? zb : za, dd = (H[i] > t) ? -NOSE : NOSE;
          const zA = Math.min(edgeZ, edgeZ + dd), zB = Math.max(edgeZ, edgeZ + dd);
          if (noseCol && lower != null && lower < t) mb.quad([x0, t + 0.002, zB], [x1, t + 0.002, zB], [x1, t + 0.002, zA], [x0, t + 0.002, zA], noseCol); }
        const bw = bottom(-1, 0), be = bottom(1, 0);
        if (bw != null && t > bw + 0.01) mb.quad([x0, bw, za], [x0, bw, zb], [x0, t, zb], [x0, t, za], sideCol);
        if (be != null && t > be + 0.01) mb.quad([x1, be, zb], [x1, be, za], [x1, t, za], [x1, t, zb], sideCol);
      } else {
        const xa = x0 + (x1 - x0) * u0, xb = x0 + (x1 - x0) * u1;
        { const backAtXa = H[i] > t;
          const cBack = FF7.glColor(U.shade(treadCol, -0.1)), cFront = FF7.glColor(treadCol);
          const cxa = backAtXa ? cBack : cFront, cxb = backAtXa ? cFront : cBack;
          quadC(tb || mb, [xa, t, z1], [xb, t, z1], [xb, t, z0], [xa, t, z0], cxa, cxb, cxb, cxa, tb && S); }
        { const lower = (H[i] > t) ? H[i + 2] : H[i]; const edgeX = (H[i] > t) ? xb : xa, dd = (H[i] > t) ? -NOSE : NOSE;
          const xA = Math.min(edgeX, edgeX + dd), xB = Math.max(edgeX, edgeX + dd);
          if (noseCol && lower != null && lower < t) mb.quad([xA, t + 0.002, z1], [xB, t + 0.002, z1], [xB, t + 0.002, z0], [xA, t + 0.002, z0], noseCol); }
        const bn = bottom(0, -1), bs = bottom(0, 1);
        if (bs != null && t > bs + 0.01) mb.quad([xa, bs, z1], [xb, bs, z1], [xb, t, z1], [xa, t, z1], sideCol);
        if (bn != null && t > bn + 0.01) mb.quad([xb, bn, z0], [xa, bn, z0], [xa, t, z0], [xb, t, z0], sideCol);
      }
    }
    // risers at every step edge, facing the lower side
    for (let j = 0; j <= k; j++) {
      const h0 = H[j], h1 = H[j + 1];
      if (Math.abs(h0 - h1) < 0.005) continue;
      const lo = Math.min(h0, h1), hi = Math.max(h0, h1), u = j / k;
      if (alongZ) {
        const z = z0 + (z1 - z0) * u;
        if (h0 > h1) mb.quad([x0, lo, z], [x1, lo, z], [x1, hi, z], [x0, hi, z], riserCol);      // faces +z (south)
        else mb.quad([x1, lo, z], [x0, lo, z], [x0, hi, z], [x1, hi, z], riserCol);             // faces -z (north)
      } else {
        const xx = x0 + (x1 - x0) * u;
        if (h0 > h1) mb.quad([xx, lo, z1], [xx, lo, z0], [xx, hi, z0], [xx, hi, z1], riserCol);  // faces +x (east)
        else mb.quad([xx, lo, z0], [xx, lo, z1], [xx, hi, z1], [xx, hi, z0], riserCol);         // faces -x (west)
      }
    }
  }
  // free-form steps: 2 x 2 flat treads per tile at the ramp height, risers down to every lower cell
  function stepsMesh(mb, P, x, y, x0, z0, fc, th) {
    const K = 2, cs = TILE / K, f = stepsProfile(P, x, y), q = STEP / 2;
    const cellH = (tx, ty, i, j) => {           // tread height of cell (i, j) of tile (tx, ty); null = no face needed
      const t = P.at(tx, ty);
      if (t.wall) return null;
      if (t.void) return -1e3;
      if (t.water) return P.el(tx, ty) - 0.45;
      if (t.steps) return Math.round(stepsProfile(P, tx, ty)((i + 0.5) / K, (j + 0.5) / K) / q) * q;
      if (t.stair) return stairProfile(P, tx, ty)((i + 0.5) / K, (j + 0.5) / K);
      return P.el(tx, ty);
    };
    const tread = U.shade(fc, 0.05), riser = U.shade(fc, -0.2);
    for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
      const hgt = Math.round(f((i + 0.5) / K, (j + 0.5) / K) / q) * q;
      const ax = x0 + i * cs, az = z0 + j * cs, bx = ax + cs, bz = az + cs;
      mb.floor(ax, az, bx, bz, hgt, U.shade(tread, ((i + j) % 2) * 0.03));
      [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
        let ni = i + dx, nj = j + dy, tx = x, ty = y;
        if (ni < 0) { tx--; ni = K - 1; } else if (ni >= K) { tx++; ni = 0; }
        if (nj < 0) { ty--; nj = K - 1; } else if (nj >= K) { ty++; nj = 0; }
        let lo = cellH(tx, ty, ni, nj);
        if (lo == null || lo >= hgt - 0.005) return;
        lo = Math.max(lo, hgt - 3);
        if (dy === 1) mb.quad([ax, lo, bz], [bx, lo, bz], [bx, hgt, bz], [ax, hgt, bz], riser);
        if (dy === -1) mb.quad([bx, lo, az], [ax, lo, az], [ax, hgt, az], [bx, hgt, az], riser);
        if (dx === 1) mb.quad([bx, lo, bz], [bx, lo, az], [bx, hgt, az], [bx, hgt, bz], riser);
        if (dx === -1) mb.quad([ax, lo, az], [ax, lo, bz], [ax, hgt, bz], [ax, hgt, az], riser);
      });
    }
  }

  const col = (c) => FF7.glColor(c);
  function vary(hex, x, y, amt = 0.06, k = 0) { return U.shade(hex, (U.hash(x, y, k) - 0.5) * amt * 2); }
  const first = (c) => Array.isArray(c) ? c[0] : c;
  // baked point-light colour multiplier from a hex colour (same rule as map.lights)
  const lampCol = (c) => FF7.glColor(c || '#ffe0a0').slice(0, 3).map(v => 0.6 + v * 0.8);

  // Bake a vehicle model (js/gl/vehicles.js) into static meshes: opts { wreck, tint } go to vehicles3d.build.
  F.bakeVehicle = function (mb, gmb, id, pos, rotDeg, scale, opts) {
    if (!FF7.vehicles3d || !FF7.vehicles3d.has || !FF7.vehicles3d.has(id)) return false;
    const o = {}; for (const k in (opts || {})) if (opts[k] != null) o[k] = opts[k];
    const m = FF7.vehicles3d.build(id, o);
    if (!m) return false;
    m.position = pos.slice(); m.rotY = (rotDeg || 0) * Math.PI / 180; m.scale = scale || 1;
    m.update(0); m.computeWorld();
    const M4 = FF7.M4, tmp = M4.create();
    for (const b of m.order) {
      let vis = true; for (let x = b; x; x = x.parent) if (!x.visible) vis = false;
      if (!vis) continue;
      for (const a of b.meshes) {
        const me = a.mesh; if (!me || !me.count) continue;
        const W = a.m ? M4.mul(tmp, b.world, a.m) : b.world;
        const tgt = (me.unlit || (a.opts && a.opts.unlit)) ? gmb : mb;
        const pt = (i) => { const x = me.pos[i * 3], y = me.pos[i * 3 + 1], z = me.pos[i * 3 + 2]; return [W[0] * x + W[4] * y + W[8] * z + W[12], W[1] * x + W[5] * y + W[9] * z + W[13], W[2] * x + W[6] * y + W[10] * z + W[14]]; };
        const nm = (i) => { const x = me.nrm[i * 3], y = me.nrm[i * 3 + 1], z = me.nrm[i * 3 + 2]; return FF7.V3.norm([W[0] * x + W[4] * y + W[8] * z, W[1] * x + W[5] * y + W[9] * z, W[2] * x + W[6] * y + W[10] * z]); };
        const cl = (i) => [me.col[i * 4], me.col[i * 4 + 1], me.col[i * 4 + 2], 1];
        for (let i = 0; i + 2 < me.count; i += 3) tgt.tri(pt(i), pt(i + 1), pt(i + 2), [cl(i), cl(i + 1), cl(i + 2)], null, [nm(i), nm(i + 1), nm(i + 2)]);
      }
    }
    return true;
  };

  // Shared flame mesh for campfires (field.js flickers each instance; tools/render_field.js draws it still).
  let flame = null;
  F.flameMesh = function () {
    if (flame) return flame;
    const mb = new MB();
    [[0, 0, 0.16, 0.5, '#ff6a18'], [0.06, 0.03, 0.1, 0.38, '#ff9a30'], [-0.05, -0.04, 0.1, 0.34, '#ff8a28'], [0, 0, 0.08, 0.3, '#ffd050'], [0, 0, 0.04, 0.2, '#fff4c0']]
      .forEach(([dx, dz, r, h, c]) => mb.prism(dx, 0, dz, r, 0, h, 6, c, true, false, true));
    return (flame = mb.build({ unlit: true }));
  };

  F.buildGeometry = function (map) {
    const P = F.parseMap(map);
    const th = Object.assign({}, F.theme(map.theme), map.look || {});
    const mb = new MB();          // opaque static
    const wmb = new MB();
    const fmb = {};                 // textured floors: one builder per floor material (see floortex.js)
    const floorMat = (t) => F.floorMaterial ? F.floorMaterial(map, th, t.floor || 'floor') : null;
    // textured floor quad: world-space UVs, colours blended smoothly across tile corners; false if untextured
    const texFloor = (t, x, y, x0, z0, x1, z1, e) => {
      const fm = floorMat(t), ft = fm && F.floorTex(fm); if (!ft) return false;
      const S = ft.scale, fb = fmb[fm] || (fmb[fm] = new MB()), pal = th[t.floor || 'floor'] || th.floor;
      const cc = (dx, dy) => FF7.glColor(F.floorCornerCol(pal, x + dx, y + dy));
      const A = [x0, e, z1], B = [x1, e, z1], C = [x1, e, z0], D = [x0, e, z0], ca = cc(0, 1), cb = cc(1, 1), cC = cc(1, 0), cd = cc(0, 0);
      const ua = [x0 / S, z1 / S], ub = [x1 / S, z1 / S], uc = [x1 / S, z0 / S], ud = [x0 / S, z0 / S];
      fb.tri(A, B, C, [ca, cb, cC], [ua, ub, uc]); fb.tri(A, C, D, [ca, cC, cd], [ua, uc, ud]);
      return true;
    };         // water / glass (blended)
    const gmb = new MB();         // glowing (unlit): mako / lava / lights / neon
    const wtb = {};               // textured wall faces: one builder per wall material (see floortex.js)
    const lamps = [];             // baked point lights [x, y, z, colour multiplier, radius]
    const fires = [];             // flame instances { pos, size, col }
    const cut = map.cutaway !== false;
    const camYaw = ((map.camera && map.camera.yaw) || 0) * Math.PI / 180;
    const camDx = Math.abs(Math.sin(camYaw)) < 1e-6 ? 0 : Math.sin(camYaw), camDy = Math.cos(camYaw);   // toward the camera, in tiles
    const wallH = th.wallH;
    const idx = (x, y) => y * P.w + x;
    const inMap = (x, y) => x >= 0 && y >= 0 && x < P.w && y < P.h;
    const floorCol = (t, x, y) => {
      if (t.checker) { const ch = th.checker || [first(th.floor), first(th.floor2)]; return vary(ch[(x + y) & 1], x, y, 0.02); }
      const key = t.floor || 'floor';
      const pal = th[key] || th.floor;
      const arr = Array.isArray(pal) ? pal : [pal, pal];
      const pick = U.hash(x, y, 7) < 0.3 ? arr[1] : arr[0];
      return vary(pick, x, y, key === 'grass' || key === 'dirt' || key === 'sand' ? 0.06 : 0.035);
    };
    const open = (xx, yy) => P.walkable(xx, yy) || P.at(xx, yy).water;
    // raised decks (catwalks, bridges, porches) are thin boards on posts, not solid slabs; a railing on a
    // deck counts as deck
    const thinAt = (x, y) => { const t = P.at(x, y); if (t.thin) return true; if (t.prop !== 'rail') return false; const e = P.el(x, y); return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => P.at(x + dx, y + dy).thin && Math.abs(P.el(x + dx, y + dy) - e) < 0.01); };
    const underMemo = {};
    // ground level under a raised deck: the lowest nearby solid floor (null when it spans a drop)
    const under = (x, y) => {
      const k = x + ',' + y; if (k in underMemo) return underMemo[k];
      const e = P.el(x, y); let lo = null;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (!dx && !dy) continue; const t = P.at(x + dx, y + dy);
        if (t.wall || t.void || t.water || thinAt(x + dx, y + dy) || t.stair) continue;
        const ne = P.el(x + dx, y + dy); if (ne < e - 0.35 && (lo == null || ne < lo)) lo = ne;
      }
      return (underMemo[k] = lo);
    };
    // water level next to a tile (round pillars stand in pools)
    const waterNear = (x, y) => { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) if (P.at(x + dx, y + dy).water) return P.el(x + dx, y + dy); return null; };
    const pillarFoot = (x, y) => { const wl = waterNear(x, y); if (wl != null) return wl - 0.45; let lo = P.el(x, y); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const t = P.at(x + dx, y + dy); if (!t.wall && !t.void && !t.roundpillar) lo = Math.min(lo, P.el(x + dx, y + dy)); }); return lo; };
    // lowest visible surface of a neighbouring tile, for the side faces dropping to it
    const lowAt = (x, y, fromE) => {
      const t = P.at(x, y);
      if (t.void) return fromE - 3;
      if (t.water) return P.el(x, y) - 0.45;
      if (t.roundpillar) return pillarFoot(x, y);
      if (thinAt(x, y)) { const u = under(x, y); return u == null ? P.el(x, y) : u; }
      if (t.stair && !t.steps) { const si = stairInfo(P, x, y); return Math.min(P.el(x, y), si.a, si.b); }
      if (t.steps) { const f = stepsProfile(P, x, y); return Math.min(P.el(x, y), f(0, 0), f(1, 0), f(0, 1), f(1, 1)) - STEP / 2; }
      return P.el(x, y);
    };

    // ---- per-tile prop overrides (map.props) and buildings (map.buildings)
    const overs = (map.props || []).filter(o => o && o.at);
    const overTile = {};          // integer `at` -> override (replaces the tile's own prop)
    overs.forEach(o => { if (Number.isInteger(o.at[0]) && Number.isInteger(o.at[1]) && !o.to) overTile[o.at[0] + ',' + o.at[1]] = o; });
    const bldgs = (map.buildings || []).map(b => Object.assign({}, b, { x0: b.at[0], y0: b.at[1], x1: b.at[0] + (b.at[2] || 1), y1: b.at[1] + (b.at[3] || 1) }));
    const bldgOf = (x, y) => { for (const b of bldgs) if (x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1) return b; return null; };
    const bldgCol = th.bldg || first(th.floor3) || th.wall;
    const bldgH = th.bldgH || wallH * 1.25;

    // Free-standing wall blocks (buildings, pillars, scrap heaps that don't touch the map edge) are
    // built into their own meshes, so the field can fade whichever one hides the player.
    const occ = [], occId = new Int32Array(P.w * P.h).fill(-1);
    for (let y0 = 0; y0 < P.h; y0++) for (let x0 = 0; x0 < P.w; x0++) {
      if (!P.at(x0, y0).wall || occId[y0 * P.w + x0] !== -1) continue;
      const id = occ.length, tiles = [], stack = [[x0, y0]]; let free = true;
      occId[y0 * P.w + x0] = id;
      while (stack.length) {
        const [x, y] = stack.pop(); tiles.push([x, y]);
        if (x === 0 || y === 0 || x === P.w - 1 || y === P.h - 1) free = false;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= P.w || ny >= P.h) return;
          const n = P.at(nx, ny); if (n.void) free = false;
          if (n.wall && occId[ny * P.w + nx] === -1) { occId[ny * P.w + nx] = id; stack.push([nx, ny]); }
        });
      }
      occ.push({ free, tiles, mb: free ? new MB() : null, tex: {}, box: [Infinity, Infinity, -Infinity, -Infinity], top: -Infinity });
    }
    const growBox = (ob, x0, z0, x1, z1, top) => { ob.box[0] = Math.min(ob.box[0], x0); ob.box[1] = Math.min(ob.box[1], z0); ob.box[2] = Math.max(ob.box[2], x1); ob.box[3] = Math.max(ob.box[3], z1); ob.top = Math.max(ob.top, top); };

    // ---- wall heights (first pass, so neighbouring walls of different heights can be closed up)
    const WI = new Array(P.w * P.h).fill(null);
    for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
      const t = P.at(x, y); if (!t.wall) continue;
      const e = P.el(x, y);
      // A wall is cut low when it belongs to a south boundary: the wall block runs down to
      // the map edge / void (not to more floor, which makes it a divider or a building), and
      // there is floor within 4 tiles north of it (looking through thicker walls and props).
      // "South" is really "toward the camera": with a yawed camera the east or west boundary is
      // cut the same way (yaw 0 gives exactly the plain south rule).
      const cell = (d) => [Math.floor(x + 0.5 + camDx * d), Math.floor(y + 0.5 + camDy * d)];
      const outside = (c) => c[0] < 0 || c[1] < 0 || c[0] >= P.w || c[1] >= P.h;
      let d = 1, c = cell(d); while (!outside(c) && P.at(c[0], c[1]).wall && d < 60) { d += 0.5; c = cell(d); }
      const southBoundary = outside(c) || !open(c[0], c[1]);
      let northNear = false;
      for (let j = 1; j <= 4.01; j += 0.5) { const b = cell(-j); if (outside(b)) break; if (open(b[0], b[1])) { northNear = true; break; } if (P.at(b[0], b[1]).void) break; }
      const b = bldgOf(x, y);
      let hgt = b && b.h != null ? b.h : (t.bldg ? bldgH : wallH);
      // walls of a declared building (map.buildings) stay full height unless it says `cut: true`
      const isCut = cut && southBoundary && northNear && (!b || b.cut === true);
      if (isCut) hgt = 0.35;
      let base = e;
      [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => { if (P.walkable(x + dx, y + dy)) base = Math.max(base, P.el(x + dx, y + dy)); });
      WI[idx(x, y)] = { base, hgt, top: base + hgt, cut: isCut, b };
    }
    // sloped roofs are built per building (after the tiles); their walls keep flat eaves
    const sloped = (b) => b && (b.top === 'gable' || b.top === 'shed' || b.top === 'hip');
    // (only the walls that belong to this building: the first listed rect wins where rects overlap)
    bldgs.forEach(b => { b.cutAny = false; b.eave = -Infinity; for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const wi = inMap(x, y) && WI[idx(x, y)]; if (!wi || wi.b !== b) continue; if (wi.cut) b.cutAny = true; b.eave = Math.max(b.eave, wi.top); } });
    // a building's walls share one eave height (the tallest), so a raised doorstep doesn't raise its roof
    bldgs.forEach(b => { if (b.eave === -Infinity) return; for (let y = b.y0; y < b.y1; y++) for (let x = b.x0; x < b.x1; x++) { const wi = inMap(x, y) && WI[idx(x, y)]; if (wi && wi.b === b && !wi.cut) { wi.top = b.eave; wi.hgt = b.eave - wi.base; } } });

    // A wall face (dir 's' 'n' 'e' 'w') as a quad strip across the tile; tin = corrugated sheet ribs
    const DIRS = { s: [0, 1], n: [0, -1], w: [-1, 0], e: [1, 0] };
    // point on a face: u 0..1 across the tile as seen from the front (left -> right), height y, offset eps out
    const facePt = (dir, x0, z0, x1, z1, u, y, eps) => dir === 's' ? [x0 + (x1 - x0) * u, y, z1 + eps] : dir === 'n' ? [x1 - (x1 - x0) * u, y, z0 - eps] : dir === 'e' ? [x1 + eps, y, z1 - (z1 - z0) * u] : [x0 - eps, y, z0 + (z1 - z0) * u];
    // S (optional): texture repeat size; world-space UVs (u along the face, v = height) so textures line up
    // across tiles and never stretch on tall walls
    const faceUV = (dir, p, S) => [(dir === 's' || dir === 'n' ? p[0] : p[2]) / S, -p[1] / S];
    const faceQuad = (m, dir, x0, z0, x1, z1, u0, u1, y0, y1, eps, c, S) => {
      const a = facePt(dir, x0, z0, x1, z1, u0, y0, eps), b = facePt(dir, x0, z0, x1, z1, u1, y0, eps), cc = facePt(dir, x0, z0, x1, z1, u1, y1, eps), d = facePt(dir, x0, z0, x1, z1, u0, y1, eps);
      m.quad(a, b, cc, d, c, S ? [faceUV(dir, a, S), faceUV(dir, b, S), faceUV(dir, cc, S), faceUV(dir, d, S)] : null);
    };
    const wallFace = (m, dir, x0, z0, x1, z1, y0, y1, c, tin, x, y, S) => {
      if (!tin) { faceQuad(m, dir, x0, z0, x1, z1, 0, 1, y0, y1, 0, c, S); return; }
      for (let i = 0; i < 4; i++) faceQuad(m, dir, x0, z0, x1, z1, i / 4, (i + 1) / 4, y0, y1, 0, U.shade(c, i % 2 ? -0.1 : 0.04), S);
      if (U.hash(x, y, dir.charCodeAt(0)) > 0.55) { const u = U.hash(x, y, 31) * 0.5, h = y0 + (y1 - y0) * (0.15 + U.hash(y, x, 5) * 0.4); faceQuad(m, dir, x0, z0, x1, z1, u, u + 0.4, h, h + (y1 - y0) * 0.35, 0.004, U.mix(c, tin === true ? '#7a3a1a' : tin, 0.55)); }
    };
    const DOORLEAF = '#6a4a2a', DOORFRAME = '#3a2818', DOORDARK = '#120e0c';

    // ---- prop placement (tile props, overrides, block props): optional yaw / scale / lift / fade
    const occProps = [];
    const placeProp = (name, x, y, z, nb, o) => {
      const fn = F.props[name]; if (!fn) return;
      o = o || {};
      const fade = o.fade != null ? o.fade : !!fn.fade;
      const target = fade ? new MB() : mb;
      const rot = (o.rot || 0) * Math.PI / 180, sc = o.scale == null ? 1 : o.scale;
      const sv = Array.isArray(sc) ? sc : [sc, sc, sc];
      const ly = y + (o.lift || 0);
      const xf = rot || sv[0] !== 1 || sv[1] !== 1 || sv[2] !== 1;
      const mbs = [target, gmb, wmb];
      if (xf) mbs.forEach(m => { m.push(); m.translate(x, ly, z); m.rotate(0, rot, 0); m.scale(sv[0], sv[1], sv[2]); m.translate(-x, -ly, -z); });
      const ctx = Object.assign({}, o, { glow: gmb, water: wmb,
        light: (p, c, r) => { if (o.light === false) return; const q = target.xf(p); lamps.push([q[0], q[1], q[2], Array.isArray(c) ? c : lampCol(c), r || 2]); },   // `light: false` = no baked light
        fire: (p, size, c) => { const q = target.xf(p); fires.push({ pos: q, size: (size || 1) * Math.max(sv[0], sv[1]), col: c }); } });
      fn(target, x, ly, z, TILE, th, nb || {}, ctx);
      if (xf) mbs.forEach(m => m.pop());
      if (fade && target.vertexCount) {
        let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity, top = -Infinity;
        for (let i = 0; i < target.P.length; i += 3) { x0 = Math.min(x0, target.P[i]); x1 = Math.max(x1, target.P[i]); z0 = Math.min(z0, target.P[i + 2]); z1 = Math.max(z1, target.P[i + 2]); top = Math.max(top, target.P[i + 1]); }
        occProps.push({ free: true, mb: target, tex: {}, box: [x0, z0, x1, z1], top });
      }
    };
    const nbOf = (x, y, prop) => {
      const same = (dx, dy) => P.at(x + dx, y + dy).prop === prop;
      const nb = { e: same(1, 0), w: same(-1, 0), n: same(0, -1), s: same(0, 1) };
      nb.ew = nb.e || nb.w; nb.ns = nb.n || nb.s;
      if (!nb.ew && !nb.ns) nb.ew = true;
      // how far the same prop runs each way (up to 4 tiles): which way a band of rail tiles runs
      const run = (dx, dy) => { let n = 0; while (n < 4 && same(dx * (n + 1), dy * (n + 1))) n++; return n; };
      nb.runEW = run(1, 0) + run(-1, 0); nb.runNS = run(0, 1) + run(0, -1);
      return nb;
    };
    const blockDone = new Uint8Array(P.w * P.h);

    for (let y = 0; y < P.h; y++) {
      for (let x = 0; x < P.w; x++) {
        const t = P.at(x, y);
        const e = P.el(x, y);
        const x0 = x * TILE, z0 = y * TILE, x1 = x0 + TILE, z1 = z0 + TILE;
        const cx = x0 + TILE / 2, cz = z0 + TILE / 2;
        if (t.void || t.nofloor) continue;
        if (t.water) {
          const g = t.mako ? gmb : t.lava ? gmb : wmb;
          const c = t.mako ? (th.mako || '#40f080') : t.lava ? (th.lava || '#f06020') : (th.water || '#2a5a8a');
          g.floor(x0, z0, x1, z1, e - 0.12, t.mako || t.lava ? c : vary(c, x, y, 0.05));
          // pool bed; the sides are drawn by the neighbours, which reach down to the bed
          mb.floor(x0, z0, x1, z1, e - 0.45, U.shade(c, -0.6));
          [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
            const n = P.at(x + dx, y + dy);
            if (!n.stair || n.steps) return;
            const bank = U.shade(th.wall, -0.2);
            if (dy === -1) mb.quad([x1, e - 0.45, z0], [x0, e - 0.45, z0], [x0, e, z0], [x1, e, z0], bank);
            if (dy === 1) mb.quad([x0, e - 0.45, z1], [x1, e - 0.45, z1], [x1, e, z1], [x0, e, z1], bank);
            if (dx === -1) mb.quad([x0, e - 0.45, z0], [x0, e - 0.45, z1], [x0, e, z1], [x0, e, z0], bank);
            if (dx === 1) mb.quad([x1, e - 0.45, z1], [x1, e - 0.45, z0], [x1, e, z0], [x1, e, z1], bank);
          });
          if (t.prop && F.props[t.prop]) F.props[t.prop](wmb, cx, e, cz, TILE, th, {}, {});
          continue;
        }
        if (t.wall) {
          const ob = occ[occId[idx(x, y)]], wm = ob && ob.free ? ob.mb : mb;
          const wi = WI[idx(x, y)], b = wi.b, base = wi.base, hgt = wi.hgt, top = wi.top;
          if (ob && ob.free) {
            growBox(ob, x0, z0, x1, z1, top);
            // ground under the block (seen when it fades out): like the nearest open floor beside it
            const gt = [[0, 1], [1, 0], [-1, 0], [0, -1], [0, 2], [2, 0], [-2, 0], [0, -2]].map(([dx, dy]) => P.at(x + dx, y + dy)).find(n => n.walk && !n.wall && !n.water && !n.stair) || t;
            if (!texFloor(gt, x, y, x0, z0, x1, z1, base - 0.004)) mb.floor(x0, z0, x1, z1, base - 0.004, floorCol(gt, x, y));
          }
          const bl = t.bldg || !!b;
          const wc = b && b.col ? vary(b.col, x, 0, 0.05, 3) : t.bldg ? vary(bldgCol, x, 0, 0.05, 3) : vary(th.wall, x, y, 0.04);
          // building roofs read as roofs from the high cameras (rusty corrugated tin in the slums)
          const roof = (b && b.roof) || th.roof || (th.indoor ? null : '#6a5a4a');
          const topCol = hgt < 0.5 ? U.shade(wc, -0.2) : bl && roof ? vary(roof, x, y, 0.07) : th.wallTop || '#18181c';
          const tin = b && b.tin ? b.tin : false;
          // the wall reaches down to the lowest floor beside it (not 1.5 m under a raised floor)
          let lo = Infinity, anyVoid = false;
          [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => { const n = P.at(x + dx, y + dy); if (n.void) anyVoid = true; else if (!n.wall) lo = Math.min(lo, lowAt(x + dx, y + dy, base)); });
          let bottom = lo === Infinity ? base : lo;
          if (anyVoid) bottom = Math.min(bottom, base - 1.5);
          // the side faces are painted with the wall material (look.wallTex; tin buildings: corrugated), in
          // textured builders of their own (the occluder's own set for free-standing blocks)
          const wmat = b && b.tex !== undefined ? (b.tex || null) : F.wallMaterial ? F.wallMaterial(map, th, { bldg: bl }) : null, wmN = wmat && tin && !(b && b.tex) ? 'corrugated' : wmat;
          const wtx = wmN && F.wallTex ? F.wallTex(wmN) : null, S = wtx ? wtx.scale : 0;
          const wfm = !wtx ? wm : ob && ob.free ? (ob.tex[wmN] || (ob.tex[wmN] = new MB())) : (wtb[wmN] || (wtb[wmN] = new MB()));
          // sides toward non-wall neighbours, and toward lower walls (stepped walls: pagodas, pyramids)
          [['s', 0, 1, 0], ['n', 0, -1, -0.1], ['w', -1, 0, -0.05], ['e', 1, 0, -0.05]].forEach(([dir, dx, dy, shade]) => {
            const n = P.at(x + dx, y + dy);
            if (!n.wall) { wallFace(wfm, dir, x0, z0, x1, z1, bottom, top, U.shade(wc, shade), tin, x, y, S); return; }
            const nw = inMap(x + dx, y + dy) && WI[idx(x + dx, y + dy)];
            if (nw && nw.top < top - 0.01) wallFace(wfm, dir, x0, z0, x1, z1, Math.max(nw.top, bottom), top, U.shade(wc, shade), tin, x, y, S);
          });
          if (!(sloped(b) && !b.cutAny)) wm.floor(x0, z0, x1, z1, top, topCol);
          // trim, windows and door frames on every face that looks onto floor
          if (hgt > 1) [['s', 0, 1], ['n', 0, -1], ['w', -1, 0], ['e', 1, 0]].forEach(([dir, dx, dy]) => {
            // (explicit windows also show above furniture standing in front of them)
            const nt = P.at(x + dx, y + dy), onProp = (t.prop === 'window' || t.stained) && !nt.wall && !nt.void && !nt.water;
            if (!open(x + dx, y + dy) && !onProp) return;
            const fb = P.walkable(x + dx, y + dy) || onProp ? P.el(x + dx, y + dy) : base;
            faceQuad(wm, dir, x0, z0, x1, z1, 0, 1, fb, fb + 0.12, 0.004, th.trim || U.shade(wc, -0.35));
            if (t.stained) {
              // tall arched stained-glass window: leading, coloured panes (lit from outside)
              const w0 = fb + 0.5, w1 = Math.min(top - 0.25, fb + 2.4), panes = ['#d03030', '#3050d0', '#e0b020', '#30a050', '#9040c0', '#e07020'];
              faceQuad(wm, dir, x0, z0, x1, z1, 0.08, 0.92, w0 - 0.04, w1 + 0.04, 0.005, th.trim || '#302418');
              const rows = 6;
              for (let r = 0; r < rows; r++) for (let k = 0; k < 2; k++) {
                const ya = w0 + (w1 - w0) * r / rows + 0.02, yb = w0 + (w1 - w0) * (r + 1) / rows - 0.02;
                const u0 = k ? 0.52 : 0.14, u1 = k ? 0.86 : 0.48, pc = panes[(r * 2 + k + x + y) % panes.length];
                if (r === rows - 1) { // pointed arch top
                  const pA = facePt(dir, x0, z0, x1, z1, u0, ya, 0.007), pB = facePt(dir, x0, z0, x1, z1, u1, ya, 0.007), pT = facePt(dir, x0, z0, x1, z1, k ? u0 : u1, yb, 0.007);
                  gmb.tri(pA, pB, pT, pc);
                } else faceQuad(gmb, dir, x0, z0, x1, z1, u0, u1, ya, yb, 0.007, pc);
              }
            } else if (t.prop === 'window') {
              faceQuad(wm, dir, x0, z0, x1, z1, 0.1, 0.9, fb + 0.76, fb + 1.54, 0.005, th.trim || '#403020');
              faceQuad(wm, dir, x0, z0, x1, z1, 0.14, 0.86, fb + 0.8, fb + 1.5, 0.006, th.window || (th.indoor ? '#8ab0d0' : '#f0e0a0'));
            } else if (bl && !(b && b.win === false) && th.bldgWin !== false && nt.prop !== 'door' && U.hash(x, y, dir === 's' ? 11 : 11 + dir.charCodeAt(0)) > 0.55) {   // (bldgWin: false - no lit windows: the reactors)
              const wy = fb + Math.min(1.0, hgt * 0.45);
              faceQuad(wm, dir, x0, z0, x1, z1, 0.2, 0.8, wy, wy + Math.min(0.6, hgt * 0.3), 0.006, (b && b.win) || th.bldgWin || '#f0d890');
            }
          });
          continue;
        }
        // ---- walkable or prop tile: floor
        const fc = floorCol(t, x, y);
        const thin = thinAt(x, y);
        if (t.roundpillar) {
          // round stepping pillar standing in a pool (or on lower ground)
          const wl = waterNear(x, y), foot = pillarFoot(x, y), R = TILE * 0.47, pc = th.pillar || U.shade(th.wall, -0.05);
          if (wl != null) { wmb.floor(x0, z0, x1, z1, wl - 0.12, vary(th.water || '#2a5a8a', x, y, 0.05)); mb.floor(x0, z0, x1, z1, wl - 0.45, U.shade(th.water || '#2a5a8a', -0.6)); }
          else mb.floor(x0, z0, x1, z1, foot, U.shade(fc, -0.3));
          mb.prism(cx, foot, cz, R, R * 0.96, e - foot, 12, pc, true, false, false);
          F.disc(mb, cx, e, cz, R * 0.96, 12, fc);
          F.disc(mb, cx, e + 0.003, cz, R * 0.78, 12, U.shade(fc, 0.06));
        } else if (t.steps) stepsMesh(mb, P, x, y, x0, z0, fc, th);
        else if (t.stair && t.prop === 'ladder') {
          // a ladder: the floor at its foot and the face of the higher level behind it (the prop is the ladder)
          const L = ladderOf(P, x, y), cc = U.shade(th.wall, -0.15), lo = L.lo, hi = L.hi;
          if (!texFloor(t, x, y, x0, z0, x1, z1, lo)) mb.floor(x0, z0, x1, z1, lo, fc);
          if (L.top && hi > lo + 0.01) {
            if (L.face === 'n') mb.quad([x0, lo, z0], [x1, lo, z0], [x1, hi, z0], [x0, hi, z0], cc);
            else if (L.face === 's') mb.quad([x1, lo, z1], [x0, lo, z1], [x0, hi, z1], [x1, hi, z1], cc);
            else if (L.face === 'w') mb.quad([x0, lo, z1], [x0, lo, z0], [x0, hi, z0], [x0, hi, z1], cc);
            else mb.quad([x1, lo, z0], [x1, lo, z1], [x1, hi, z1], [x1, hi, z0], cc);
          }
        }
        else if (t.stair) { const fm = floorMat(t), ft = fm && F.floorTex(fm); stairMesh(mb, P, x, y, x0, z0, x1, z1, fc, th, e, ft && (fmb[fm] || (fmb[fm] = new MB())), ft && ft.scale); }
        else if (t.glow) gmb.floor(x0, z0, x1, z1, e, vary(th.glow || '#ffb0d8', x, y, 0.05));
        else {
          const fm = floorMat(t), ft = fm && F.floorTex(fm);
          if (ft) texFloor(t, x, y, x0, z0, x1, z1, e);
          else mb.floor(x0, z0, x1, z1, e, fc);
        }
        // cliff faces toward lower neighbours / void / pool beds (thin decks: a board edge on posts)
        if (!t.roundpillar && !t.stair) {
          const deckD = 0.12, wood = th.wood ? first(th.wood) : '#6a4a2a', deckCol = t.floor === 'metal' ? U.shade(first(th.metal) || '#5a6068', -0.25) : U.shade(wood, -0.25);
          let exposed = false;
          [[0, 1], [1, 0], [-1, 0], [0, -1]].forEach(([dx, dy]) => {
            const n = P.at(x + dx, y + dy);
            if (n.wall || (n.stair && !n.steps)) return;
            const ne = lowAt(x + dx, y + dy, e);
            if (ne >= e - 0.01) return;
            const isThin = thin && ne < e - 0.35 && !(thinAt(x + dx, y + dy) && Math.abs(P.el(x + dx, y + dy) - e) < 0.01);
            const bot = isThin ? e - deckD : ne, cc = isThin ? deckCol : U.shade(th.wall, -0.15);
            if (isThin) exposed = true;
            if (dy === 1) mb.quad([x0, bot, z1], [x1, bot, z1], [x1, e, z1], [x0, e, z1], cc);
            if (dy === -1) mb.quad([x1, bot, z0], [x0, bot, z0], [x0, e, z0], [x1, e, z0], cc);
            if (dx === -1) mb.quad([x0, bot, z0], [x0, bot, z1], [x0, e, z1], [x0, e, z0], cc);
            if (dx === 1) mb.quad([x1, bot, z1], [x1, bot, z0], [x1, e, z0], [x1, e, z1], cc);
            // posts under the deck edge, every other tile
            if (isThin && ne > e - 2.99 && ((x + y) & 1) === 0) {
              const px = dx ? (dx > 0 ? x1 - 0.04 : x0 + 0.04) : cx, pz = dy ? (dy > 0 ? z1 - 0.04 : z0 + 0.04) : cz;
              mb.box(px, (ne + e - deckD) / 2, pz, 0.06, e - deckD - ne, 0.06, U.shade(deckCol, -0.15));
            }
          });
          if (thin && (exposed || under(x, y) != null)) {
            mb.quad([x0, e - deckD, z0], [x1, e - deckD, z0], [x1, e - deckD, z1], [x0, e - deckD, z1], U.shade(deckCol, -0.3));   // underside
            const u = under(x, y); if (u != null) mb.floor(x0, z0, x1, z1, u, U.shade(vary(first(th.floor), x, y, 0.04), -0.45));
          }
        }
        // door frame
        if (t.name === 'door' || t.name === 'doorway') {
          const wW = P.at(x - 1, y).wall, wE = P.at(x + 1, y).wall, wN = P.at(x, y - 1).wall, wS = P.at(x, y + 1).wall;
          // (a theme's own door colours: steel doors in the reactors and Shinra's buildings, wood elsewhere)
          const fcol = th.trim || '#403020', leaf = t.open ? DOORDARK : th.doorLeaf || DOORLEAF, dframe = th.doorFrame || DOORFRAME;
          const cutNb = (dx, dy) => { const wi = inMap(x + dx, y + dy) && WI[idx(x + dx, y + dy)]; return wi && wi.cut; };
          // wall above the door frame, up to the neighbouring walls' top (nothing when the walls are lower)
          const lintel = (nbs) => {
            let h = -1, lc = th.wall;
            nbs.forEach(([dx, dy]) => { const wv = inMap(x + dx, y + dy) && WI[idx(x + dx, y + dy)], tp = wv ? wv.top : e + wallH; if (tp - e - 1.87 > h) { h = tp - e - 1.87; if (wv) lc = wv.b && wv.b.col ? wv.b.col : P.at(x + dx, y + dy).bldg ? bldgCol : th.wall; } });
            if (h > 0.02) mb.box(cx, e + 1.87 + h / 2, cz, TILE, h, TILE, U.shade(lc, -0.05));
          };
          // a run of door tiles across an east-west wall (a double or wider door) is one opening: the frame spans the run,
          // jambs at its ends, the lintel up to the walls either side of it
          const doorAt = (dx) => P.at(x + dx, y).prop === 'door';
          let ra = 0, rb = 0; while (doorAt(ra - 1)) ra--; while (doorAt(rb + 1)) rb++;
          const run = (ra || rb) && P.at(x + ra - 1, y).wall && P.at(x + rb + 1, y).wall;
          if ((wW && wE) || run) {
            const sHigh = !(P.walkable(x, y - 1) && !P.walkable(x, y + 1));
            if (sHigh) {
              if (!doorAt(-1)) mb.box(x0 + 0.03, e + 0.9, cz, 0.06, 1.8, TILE, fcol);
              if (!doorAt(1)) mb.box(x1 - 0.03, e + 0.9, cz, 0.06, 1.8, TILE, fcol);
              mb.box(cx, e + 1.83, cz, TILE, 0.08, TILE, fcol); lintel([[ra - 1, 0], [rb + 1, 0]]);
              // dark beyond the opening when something solid stands behind it (not the void, which is dark already)
              if (inMap(x, y - 1) && !P.walkable(x, y - 1) && !P.at(x, y - 1).void) mb.quad([x0, e, z0 + 0.03], [x1, e, z0 + 0.03], [x1, e + 1.8, z0 + 0.03], [x0, e + 1.8, z0 + 0.03], '#0a0c0c');
            } else {
              // a door in the wall toward the camera, seen from inside: one threshold across the whole opening, and
              // where that wall is cut low (the cutaway), jambs cut to the same height
              mb.floor(doorAt(-1) ? x0 : x0 + 0.05, z0 + 0.08, doorAt(1) ? x1 : x1 - 0.05, z1 - 0.08, e + 0.006, U.shade(fcol, 0.12));
              [[-1, x0 + 0.03], [1, x1 - 0.03]].forEach(([d, jx]) => {
                const wi = !doorAt(d) && inMap(x + d, y) && WI[idx(x + d, y)];
                if (wi && wi.cut) mb.box(jx, (e + wi.top + 0.02) / 2, cz, 0.06, wi.top + 0.02 - e, TILE, fcol);
              });
            }
          } else if ((wN || wS) && (wN || P.at(x, y - 1).prop === 'door') && (wS || P.at(x, y + 1).prop === 'door') && P.walkable(x - 1, y) && P.walkable(x + 1, y)) {
            // a passage through a north-south wall
            if (!cutNb(-1, 0) && !cutNb(1, 0) && !cutNb(0, 1) && !cutNb(0, -1)) { mb.box(cx, e + 0.9, z0 + 0.03, TILE, 1.8, 0.06, fcol); mb.box(cx, e + 0.9, z1 - 0.03, TILE, 1.8, 0.06, fcol); mb.box(cx, e + 1.83, cz, TILE, 0.08, TILE, fcol); lintel([[0, -1], [0, 1]]); }
            else mb.floor(x0 + 0.05, z0 + 0.05, x1 - 0.05, z1 - 0.05, e + 0.006, '#4a3020');
          } else {
            // a door leaf on the one wall behind the tile (north wall most often; east/west/south too);
            // not for gaps in a boundary wall (a void beside the tile)
            const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => P.at(x + dx, y + dy).void);
            const side = !wN && !wS && !edge && (wE !== wW);
            const dir = wN ? 's' : side && wE && P.walkable(x - 1, y) ? 'w' : side && wW && P.walkable(x + 1, y) ? 'e' : wS && !wE && !wW && !edge && P.walkable(x, y - 1) ? 'n' : null;
            if (dir) {
              const [ddx, ddy] = DIRS[dir], wx = x - ddx, wy = y - ddy, wX0 = wx * TILE, wZ0 = wy * TILE;
              // a run of door tiles along the wall is one (double) door: the frame and leaf carry on across the tiles,
              // the leaves meeting in the middle. (u runs west to east on a south face, east to west on a north one)
              const along = dir === 's' || dir === 'n', west = along && doorAt(-1), east = along && doorAt(1);
              const lo = dir === 'n' ? east : west, hi = dir === 'n' ? west : east;
              const q = (u0, u1, y0, y1, eps, c) => faceQuad(mb, dir, wX0, wZ0, wX0 + TILE, wZ0 + TILE, u0, u1, y0, y1, eps, c);
              q(lo ? 0 : 0.08, hi ? 1 : 0.92, e, e + 1.7, 0.004, dframe);
              q(lo ? 0 : 0.16, hi ? 1 : 0.84, e, e + 1.64, 0.006, leaf);
              if (!t.open && th.doorLeaf) q(lo ? 0 : 0.16, hi ? 1 : 0.84, e + 0.8, e + 0.86, 0.008, dframe);   // (a steel door's rib)
              if (!t.open && (west || east)) {
                const mid = (2 * x + ra + rb + 1) / 2 * TILE, u = (mid - x0) / TILE, uu = dir === 'n' ? 1 - u : u;
                if (mid > x0 + 1e-6 && mid <= x1 + 1e-6) q(uu - 0.025, uu + 0.025, e, e + 1.64, 0.009, dframe);
              }
            }
          }
        }
        // prop (a `props:` override on this tile replaces it; block props are built once per block)
        if (t.block) {
          if (blockDone[idx(x, y)]) continue;
          const stack = [[x, y]]; let bx0 = x, by0 = y, bx1 = x, by1 = y, ov = null;
          blockDone[idx(x, y)] = 1;
          while (stack.length) { const [a, c] = stack.pop(); bx0 = Math.min(bx0, a); bx1 = Math.max(bx1, a); by0 = Math.min(by0, c); by1 = Math.max(by1, c); ov = ov || overTile[a + ',' + c];
            [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { const nx = a + dx, ny = c + dy; if (inMap(nx, ny) && !blockDone[idx(nx, ny)] && P.at(nx, ny) === t) { blockDone[idx(nx, ny)] = 1; stack.push([nx, ny]); } }); }
          if (ov) ov._used = true;
          if (!(ov && (ov.prop === 'none' || ov.prop === null))) placeProp((ov && ov.prop) || t.prop, (bx0 + bx1 + 1) / 2 * TILE, e, (by0 + by1 + 1) / 2 * TILE, {}, Object.assign({ bw: bx1 - bx0 + 1, bh: by1 - by0 + 1 }, ov || {}));
          continue;
        }
        if (overTile[x + ',' + y]) continue;
        if (t.prop === 'ladder' && t.stair) { const L = ladderOf(P, x, y); if (L.top) placeProp('ladder', cx, L.lo, cz, {}, { h: L.hi - L.lo, face: L.face }); }
        else if (t.prop && F.props[t.prop]) placeProp(t.prop, cx, e, cz, nbOf(x, y, t.prop), null);
      }
    }
    // ---- overrides (`props:`): on a tile (replacing its prop), between tiles (fractional `at`),
    // cables between two points (`to`), vehicles (`vehicle`)
    overs.forEach(o => {
      if (o._used) { delete o._used; return; }
      const ax = o.at[0], ay = o.at[1], tx = Math.round(ax), ty = Math.round(ay);
      const t = P.at(tx, ty), wi = inMap(tx, ty) && WI[idx(tx, ty)];
      const ground = (xx, yy) => { const wv = inMap(xx, yy) && WI[idx(xx, yy)]; return wv ? wv.base : P.el(xx, yy); };
      const x = (ax + 0.5) * TILE, z = (ay + 0.5) * TILE, y = o.y0 != null ? o.y0 : ground(Math.floor(ax + 0.5), Math.floor(ay + 0.5));
      if (o.prop === 'none' || o.prop === null) return;
      if (o.vehicle) { F.bakeVehicle(mb, gmb, o.vehicle, [x, y + (o.lift || 0), z], o.rot || 0, o.scale || 1, { wreck: o.wreck, tint: o.col, cars: o.cars }); return; }
      if (o.to) {
        const h = o.h != null ? o.h : 2.6, bx = (o.to[0] + 0.5) * TILE, bz = (o.to[1] + 0.5) * TILE;
        // (o.y0: both ends measured from that height, not the ground under them: ropes out over a drop)
        const g0 = o.y0 != null ? o.y0 : ground(tx, ty), g1 = o.y0 != null ? o.y0 : ground(Math.round(o.to[0]), Math.round(o.to[1]));
        const oo = Object.assign({}, o, { from: [x, g0 + h, z], to: [bx, g1 + (o.h2 != null ? o.h2 : h), bz] });
        placeProp(o.prop || 'string', x, y, z, {}, oo);
        return;
      }
      const nb = Number.isInteger(ax) && Number.isInteger(ay) ? nbOf(tx, ty, o.prop || t.prop) : {};
      // on a wall tile (banners, signs on a facade): hang it on the face it looks out of (rot 0 = south)
      let px = x, py = y, pz = z;
      // (a door in a wall or a building's front counts as the wall for a lettered sign: over it, the sign hangs on the
      // face, not inside; Costa's BATTLE SQUARE was there)
      if ((t.wall || (t.prop === 'door' && o.text)) && Number.isInteger(ax) && Number.isInteger(ay)) {
        const r = (o.rot || 0) * Math.PI / 180, fx = Math.round(Math.sin(r)), fz = Math.round(Math.cos(r));
        px += fx * (TILE / 2 + 0.03); pz += fz * (TILE / 2 + 0.03);
        if (o.y0 == null && P.walkable(tx + fx, ty + fz)) py = P.el(tx + fx, ty + fz);
      }
      // (a lettered banner or neon board hung on a building's face: its top kept under the eave and the strip of wall
      // the roof's overhang hides from the camera above; the user, 2026-10-04, the sign audit: SHURIKEN ARCADE's top was
      // cut off. One placed out in front by hand, as 7th Heaven's over its roof, is left where it is)
      if ((o.prop === 'banner' || o.prop === 'neon') && o.text && (t.wall || t.prop === 'door') && Number.isInteger(ax) && Number.isInteger(ay)) {
        const bl = bldgs.find(b => tx >= b.x0 && tx < b.x1 && ty >= b.y0 && ty < b.y1);
        if (bl && isFinite(bl.eave)) {
          const lim = bl.eave - (sloped(bl) ? (bl.over != null ? bl.over : 0.14) : 0) * 1.6 - 0.06;
          if (o.prop === 'banner') { const top = py + (o.y != null ? o.y : 2.2); if (top > lim) o = Object.assign({}, o, { y: lim - py }); }
          else { const size = o.size || TILE * 0.34, c = py + (o.y != null ? o.y : TILE * 2.4); if (c + size * 0.9 > lim) o = Object.assign({}, o, { y: lim - size * 0.9 - py }); }
        }
      }
      placeProp(o.prop || t.prop, px, py, pz, nb, o);
    });
    // ---- sloped building roofs (map.buildings top: 'gable' | 'shed' | 'hip')
    bldgs.forEach(b => {
      if (!sloped(b) || b.cutAny || b.eave === -Infinity) return;
      let ob = null; for (let y = b.y0; y < b.y1 && !ob; y++) for (let x = b.x0; x < b.x1 && !ob; x++) { const o2 = inMap(x, y) && occ[occId[idx(x, y)]]; if (o2 && o2.free) ob = o2; }
      const m = ob ? ob.mb : mb;
      const ov = b.over != null ? b.over : 0.14;
      const Xw0 = b.x0 * TILE, Xw1 = b.x1 * TILE, Zw0 = b.y0 * TILE, Zw1 = b.y1 * TILE, X0 = Xw0 - ov, X1 = Xw1 + ov, Z0 = Zw0 - ov, Z1 = Zw1 + ov;
      const W = Xw1 - Xw0, D = Zw1 - Zw0, E = b.eave + 0.02, rc = b.roof || th.roof || '#6a5a4a', wc = b.col || bldgCol;   // (2 cm up: no wall seam through the roof)
      const ridgeX = b.ridge ? b.ridge === 'x' : W >= D;
      const rise = b.rise != null ? b.rise : b.top === 'shed' ? D * 0.3 : (ridgeX ? D : W) * 0.45;
      const top = E + rise, tin = !!b.tin;
      // ribbed (corrugated) strips across a -> b; a b c d counter-clockwise seen from outside
      const ribs = (a, bb, c, d, colr, n) => {
        const L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
        const k = tin ? Math.max(1, n) : 1;
        for (let i = 0; i < k; i++) m.quad(L(a, bb, i / k), L(a, bb, (i + 1) / k), L(d, c, (i + 1) / k), L(d, c, i / k), tin ? U.shade(colr, i % 2 ? -0.12 : 0.03) : colr);
      };
      const under = (y) => m.quad([X0, y, Z0], [X1, y, Z0], [X1, y, Z1], [X0, y, Z1], U.shade(rc, -0.45));
      if (b.top === 'shed') {      // high over the back (north) wall, low over the front
        const hz = (z) => E + rise * (Zw1 - z) / D;
        ribs([X0, hz(Z1), Z1], [X1, hz(Z1), Z1], [X1, hz(Z0), Z0], [X0, hz(Z0), Z0], rc, Math.round((X1 - X0) / 0.12));
        m.quad([X0, hz(Z0) - 0.03, Z0], [X1, hz(Z0) - 0.03, Z0], [X1, hz(Z1) - 0.03, Z1], [X0, hz(Z1) - 0.03, Z1], U.shade(rc, -0.45));
        m.quad([Xw1, E, Zw0], [Xw0, E, Zw0], [Xw0, top, Zw0], [Xw1, top, Zw0], U.shade(wc, -0.1));
        m.tri([Xw0, E, Zw1], [Xw0, top, Zw0], [Xw0, E, Zw0], U.shade(wc, -0.05));
        m.tri([Xw1, E, Zw0], [Xw1, top, Zw0], [Xw1, E, Zw1], U.shade(wc, -0.05));
      } else if (ridgeX) {         // ridge runs east-west: slopes face south and north
        const zc = (Zw0 + Zw1) / 2, eo = E - rise * ov / (D / 2), hw = b.top === 'hip' ? Math.min((Z1 - Z0) / 2, (X1 - X0) / 2) : 0;   // hip: the ridge stops short of the ends
        ribs([X0, eo, Z1], [X1, eo, Z1], [X1 - hw, top, zc], [X0 + hw, top, zc], rc, Math.round((X1 - X0) / 0.12));
        ribs([X1, eo, Z0], [X0, eo, Z0], [X0 + hw, top, zc], [X1 - hw, top, zc], U.shade(rc, -0.12), Math.round((X1 - X0) / 0.12));
        if (b.top === 'hip') { m.tri([X0, eo, Z0], [X0, eo, Z1], [X0 + hw, top, zc], U.shade(rc, -0.06)); m.tri([X1, eo, Z1], [X1, eo, Z0], [X1 - hw, top, zc], U.shade(rc, -0.06)); }
        else { m.tri([Xw0, E, Zw1], [Xw0, top, zc], [Xw0, E, Zw0], U.shade(wc, -0.05)); m.tri([Xw1, E, Zw0], [Xw1, top, zc], [Xw1, E, Zw1], U.shade(wc, -0.05)); }
        under(eo - 0.03);
      } else {                     // ridge runs north-south: slopes face east and west
        const xc = (Xw0 + Xw1) / 2, eo = E - rise * ov / (W / 2), hw = b.top === 'hip' ? Math.min((X1 - X0) / 2, (Z1 - Z0) / 2) : 0;
        ribs([X1, eo, Z1], [X1, eo, Z0], [xc, top, Z0 + hw], [xc, top, Z1 - hw], U.shade(rc, -0.06), Math.round((Z1 - Z0) / 0.12));
        ribs([X0, eo, Z0], [X0, eo, Z1], [xc, top, Z1 - hw], [xc, top, Z0 + hw], U.shade(rc, -0.06), Math.round((Z1 - Z0) / 0.12));
        if (b.top === 'hip') { m.tri([X0, eo, Z1], [X1, eo, Z1], [xc, top, Z1 - hw], rc); m.tri([X1, eo, Z0], [X0, eo, Z0], [xc, top, Z0 + hw], U.shade(rc, -0.12)); }
        else { m.tri([Xw0, E, Zw1], [Xw1, E, Zw1], [xc, top, Zw1], wc); m.tri([Xw1, E, Zw0], [Xw0, E, Zw0], [xc, top, Zw0], U.shade(wc, -0.1)); }
        under(eo - 0.03);
      }
      if (b.chimney) { const cxw = X0 + W * 0.7, czw = Z0 + D * 0.35; m.box(cxw, top - 0.1, czw, 0.2, 0.9, 0.2, U.shade(wc, -0.15)); }
      if (ob) growBox(ob, X0, Z0, X1, Z1, top);
    });
    // ---- text labels (map.labels): painted / neon lettering on floors and walls
    (map.labels || []).forEach(L => {
      if (!L || !L.at || L.text == null) return;
      const ax = L.at[0], ay = L.at[1], tx = Math.round(ax), ty = Math.round(ay);
      const t = P.at(tx, ty), wi = inMap(tx, ty) && WI[idx(tx, ty)];
      const onWall = L.on ? L.on === 'wall' : !!(L.face || t.wall);
      const glow = L.glow != null ? L.glow : !!L.neon;
      const m = glow ? gmb : mb;
      const size = L.size || 0.3;
      const o = { size, col: L.col || (glow ? '#ffffff' : '#e8e0c0'), w: L.w, align: L.align, italic: L.italic, back: L.back, depth: L.depth, shift: L.shift };
      if (!onWall) {
        const r = (L.rot || 0) * Math.PI / 180, x = (ax + 0.5) * TILE, z = (ay + 0.5) * TILE;
        const y = F.groundAt(P, x, z) + (L.y || 0) + 0.012;
        F.text3d(m, L.text, Object.assign(o, { pos: [x, y, z], u: [Math.cos(r), 0, -Math.sin(r)], v: [-Math.sin(r), 0, -Math.cos(r)] }));
      } else {
        const face = L.face || 's', [dx, dy] = DIRS[face] || DIRS.s;
        let x = (ax + 0.5) * TILE, z = (ay + 0.5) * TILE;
        // (a door in a wall row counts as the wall: a sign over a doorway goes on the wall's face, not in the middle of
        // the doorway behind its lintel; the ship's PORT GANGWAY, its cabin numbers and others were hidden there)
        if (t.wall || t.prop === 'door') { x += dx * TILE / 2; z += dy * TILE / 2; }
        // on any tile of a building (map.buildings: its door, its front row, a row further in): out on that building's
        // face, not at the tile's middle or a row's edge inside the building, where nothing ever saw it (the user,
        // 2026-10-04: the sign audit; KUPO RANCH, the towns' MOG CENTERs, the LIFEGUARD hut and others were inside)
        const bl = bldgs.find(b => tx >= b.x0 && tx < b.x1 && ty >= b.y0 && ty < b.y1);
        let fty = ty, ftx = tx;
        if (bl) {
          if (dy > 0) { z = bl.y1 * TILE; fty = bl.y1; } else if (dy < 0) { z = bl.y0 * TILE; fty = bl.y0 - 1; }
          else if (dx > 0) { x = bl.x1 * TILE; ftx = bl.x1; } else { x = bl.x0 * TILE; ftx = bl.x0 - 1; }
        }
        const eps = 0.012 + (L.off || 0);
        x += dx * eps; z += dy * eps;
        const fy = bl ? (inMap(ftx, fty) ? P.el(ftx, fty) : wi ? wi.base : P.el(tx, ty)) : t.wall ? (P.walkable(tx + dx, ty + dy) ? P.el(tx + dx, ty + dy) : wi ? wi.base : 0) : P.el(tx, ty);
        const u = face === 's' ? [1, 0, 0] : face === 'n' ? [-1, 0, 0] : face === 'e' ? [0, 0, -1] : [0, 0, 1];
        // (on a building: kept under its eave and the strip of wall the roof's overhang hides from the camera above)
        let ly = L.y != null ? L.y : 1.4;
        if (bl && isFinite(bl.eave)) { const ov = sloped(bl) ? (bl.over != null ? bl.over : 0.14) : 0; ly = Math.min(ly, bl.eave - fy - ov * 1.6 - 0.06 - size * 0.85); }
        F.text3d(m, L.text, Object.assign(o, { pos: [x, fy + ly, z], u, v: [0, 1, 0] }));
      }
      if (L.light) lamps.push([(ax + 0.5) * TILE, P.el(tx, ty) + 1, (ay + 0.5) * TILE, lampCol(Array.isArray(L.col) ? L.col[0] : L.col === 'rainbow' ? '#ffc0e0' : L.col), L.light === true ? 2 : L.light]);
    });
    // ---- baked lighting (AO + lamps)
    const makoL = th.makoLight != null ? th.makoLight : 1;
    for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) {
      const t = P.at(x, y), p = [(x + 0.5) * TILE, P.el(x, y) + 1, (y + 0.5) * TILE];
      if (overTile[x + ',' + y]) { if (t.mako && makoL) lamps.push(p.concat([lampCol(th.mako), 1.4 * makoL])); continue; }
      if (t.prop === 'fireplace' || t.prop === 'neon') lamps.push(p.concat([[1.35, 1.2, 0.9], 1.4]));
      else if ((t.mako || t.prop === 'pod') && makoL) lamps.push(p.concat([lampCol(th.mako || '#40f080'), 1.4 * makoL]));
      else if (t.lava) lamps.push(p.concat([lampCol(th.lava || '#f06020'), 1.4]));
      else if (t.glow) lamps.push(p.concat([lampCol(th.glow || '#ffb0d8'), 0.9]));
    }
    (map.lights || []).forEach(l => lamps.push([(l[0] + 0.5) * TILE, P.el(l[0], l[1]) + 1, (l[1] + 0.5) * TILE, lampCol(l[2] || '#ffe0a0'), l[3] || 2.5]));
    const solidNear = (wx, wz) => {
      let n = 0;
      const tx = Math.floor(wx / TILE - 0.5), ty = Math.floor(wz / TILE - 0.5);
      for (let dy = 0; dy <= 1; dy++) for (let dx = 0; dx <= 1; dx++) { const t = P.at(tx + dx, ty + dy); if (t.wall || (t.prop && !t.walk && t.prop !== 'rail')) n++; }
      return n;
    };
    const bake = (mb) => {
    const Cbuf = mb.C, Pbuf = mb.P;
    for (let i = 0; i < Pbuf.length / 3; i++) {
      const wx = Pbuf[i * 3], wy = Pbuf[i * 3 + 1], wz = Pbuf[i * 3 + 2];
      const ny = mb.N[i * 3 + 1];
      let k = 1;
      if (ny > 0.9) { // floors & tops
        const tx = Math.floor(wx / TILE), ty = Math.floor(wz / TILE);
        const ground = P.el(U.clamp(tx, 0, P.w - 1), U.clamp(ty, 0, P.h - 1));
        if (wy < ground + 0.3) k *= 1 - 0.13 * solidNear(wx, wz);
      } else if (Math.abs(ny) < 0.3) { // walls: darker near the base
        const tx = Math.floor(wx / TILE), ty = Math.floor(wz / TILE);
        const base = P.el(U.clamp(tx, 0, P.w - 1), U.clamp(ty, 0, P.h - 1));
        k *= 0.7 + 0.3 * U.clamp((wy - base) / 1.2, 0, 1);
      }
      let lr = 0, lg = 0, lb = 0;
      for (const L of lamps) {
        const d = Math.hypot(wx - L[0], (wy - L[1]) * 0.6, wz - L[2]);
        if (d < L[4]) { const f = (1 - d / L[4]); lr += (L[3][0] - 1) * f; lg += (L[3][1] - 1) * f; lb += (L[3][2] - 1) * f; }
      }
      Cbuf[i * 4] = Math.min(1, Cbuf[i * 4] * (k + lr));
      Cbuf[i * 4 + 1] = Math.min(1, Cbuf[i * 4 + 1] * (k + lg));
      Cbuf[i * 4 + 2] = Math.min(1, Cbuf[i * 4 + 2] * (k + lb));
    }
    };
    bake(mb);
    const floors = [];
    for (const m in fmb) { bake(fmb[m]); const ft = F.floorTex(m); floors.push({ mat: m, mesh: fmb[m].build({ tex: ft.tex, texOpts: { repeat: true } }) }); }
    const walls = [];
    for (const m in wtb) { bake(wtb[m]); const wt = F.wallTex(m); walls.push({ mat: m, mesh: wtb[m].build({ tex: wt.tex, texOpts: { repeat: true } }) }); }
    // an occluder fades as a unit: its plain mesh plus one textured mesh per wall material (o.meshes)
    const occluders = [];
    occ.concat(occProps).forEach(o => {
      const tm = Object.keys(o.tex || {}).filter(m => o.tex[m].vertexCount);
      if (!o.free || (!o.mb.vertexCount && !tm.length)) return;
      bake(o.mb); const meshes = [o.mb.build()];
      tm.forEach(m => { bake(o.tex[m]); const wt = F.wallTex(m); meshes.push(o.tex[m].build({ tex: wt.tex, texOpts: { repeat: true } })); });
      occluders.push({ mesh: meshes[0], meshes, box: o.box, top: o.top, alpha: 1 });
    });
    const out = {
      floors, walls, occluders, fires,
      P, th,
      mesh: mb.build(),
      water: wmb.vertexCount ? wmb.build({ blend: 'alpha', alphaTest: 0 }) : null,
      glow: gmb.vertexCount ? gmb.build({ unlit: true }) : null,
      width: P.w * TILE, depth: P.h * TILE,
    };
    // water is see-through; glass and other translucent parts keep their own alpha
    if (out.water) for (let i = 3; i < out.water.col.length; i += 4) if (out.water.col[i] > 0.99) out.water.col[i] = 0.78;
    return out;
  };

  // Cache geometry per map id
  const geoCache = {};
  F.geometry = function (map) {
    let g = geoCache[map.id];
    if (!g) g = geoCache[map.id] = F.buildGeometry(map);
    return g;
  };
  F.clearGeoCache = function () { for (const k in geoCache) { const g = geoCache[k]; ['mesh', 'water', 'glow'].forEach(m => g[m] && FF7.GL.release(g[m])); (g.occluders || []).forEach(o => (o.meshes || [o.mesh]).forEach(m => FF7.GL.release(m))); (g.floors || []).concat(g.walls || []).forEach(f => FF7.GL.release(f.mesh)); delete geoCache[k]; } };
})();
