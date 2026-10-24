// World map: 3D terrain from FF7.data.world (384x272 tiles, wraps both ways) rendered in chunks with
// the PS1-style curved horizon, location landmarks, vehicles (buggy, Tiny Bronco, Highwind, submarine,
// chocobo), random encounters by region/terrain, location entry through FF7.world links, minimap.
(function () {
  const U = FF7.util, R = FF7.render, GL = FF7.GL, M4 = FF7.M4, WM = FF7.world, F = FF7.field;
  WM.encounterHooks = WM.encounterHooks || [];
  WM.stepHooks = WM.stepHooks || [];

  const CH = 16;                // chunk size (tiles)
  const VIEW = 3;               // chunk radius drawn around the camera target
  const WL = -0.16;             // water surface level
  const CURVE = 0.0032;         // horizon curvature

  // ---------------------------------------------------------------- terrain tables
  const TER = {
    O: { h: -1.0, col: '#1a2c4a', water: 'deep' },  o: { h: -0.5, col: '#2e5a70', water: 'shallow' },
    r: { h: -0.38, col: '#3a6070', water: 'river' }, R: { h: -0.7, col: '#23405a', water: 'deep' },
    g: { h: 0.02, col: '#5a8a3a' },  f: { h: 0.06, col: '#3f6e2c', trees: 2 },  j: { h: 0.06, col: '#3c7030', trees: 3, jungle: true },
    h: { h: 0.45, col: '#6f8440', rough: 0.35 }, m: { h: 1.5, col: '#77694e', rough: 0.9 }, M: { h: 2.6, col: '#8a7d68', rough: 1.4 },
    d: { h: 0.03, col: '#cdaa68' },  s: { h: 0.0, col: '#dcc88e' },  n: { h: 0.1, col: '#e6ecf2' },  i: { h: 1.1, col: '#b8d2ea', rough: 0.5 },
    w: { h: 0.05, col: '#8c7a58' },  x: { h: -0.04, col: '#4e5e3a', marsh: true },  k: { h: 0.35, col: '#a2603c', rough: 0.4 },
    c: { h: 0.12, col: '#5e566a' },  C: { h: 0.3, col: '#4c4c54' },  b: { h: 0.06, col: '#8a6a40' },  p: { h: 0.03, col: '#8c8270' },
    L: { h: 0.08, col: '#e05a20', glow: true },
  };
  const BG = { g: 'grass', h: 'grass', p: 'grass', b: 'grass', f: 'forest', j: 'jungle', d: 'desert', s: 'beach', n: 'snow', i: 'glacier', x: 'marsh', k: 'canyon', w: 'grass', c: 'crater', o: 'ocean', O: 'ocean', r: 'grass' };
  const LANDABLE = 'gsdnwxpch';
  const SPEED = { foot: 0.075, buggy: 0.13, chocobo: 0.15, bronco: 0.12, highwind: 0.3, submarine: 0.13 };

  let D = null, W = 0, H = 0, cornerH = null, entryAt = {}, trackAt = {};
  const mod = (a, n) => ((a % n) + n) % n;
  const at = (x, y) => D.rows[mod(y, H)][mod(x, W)];
  const regionAt = (x, y) => { const c = D.regions.rows[mod(y, H)][mod(x, W)]; return D.regions.legend[c] || 'ocean'; };

  function init() {
    if (D === FF7.data.world && cornerH) return;
    D = FF7.data.world; W = D.w; H = D.h; CLEARINGS = null;
    cornerH = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = [at(x - 1, y - 1), at(x, y - 1), at(x - 1, y), at(x, y)];
      let h = 0, rough = 0, allHigh = true, anyWater = false;
      t.forEach(c => { const T = TER[c] || TER.g; h += T.h; rough = Math.max(rough, T.rough || 0); if (!(c === 'm' || c === 'M' || c === 'i')) allHigh = false; if (T.water) anyWater = true; });
      h /= 4;
      if (rough) h += (U.hash(x, y, 7) - 0.3) * rough * (allHigh ? 1 : 0.4);
      if (allHigh && t.includes('M')) h += 0.6 + U.hash(x, y, 3) * 0.9;
      // shorelines: the corners between land and sea sit a little above or below the water line (smooth
      // noise), so the coast wanders across the tiles instead of tracing the square grid
      if (anyWater && !t.every(c => TER[c] && TER[c].water)) {
        const land = t.filter(c => !(TER[c] || TER.g).water).length / 4;   // 3 land tiles: above water; 1: below; 2: the noise decides, leaning to land
        h = Math.min(h, 0.02, WL + (land - 0.5) * 0.6 + (vnoise(x, y, 2.3, 13) - 0.35) * 0.3);
      }
      cornerH[y * W + x] = h;
    }
    entryAt = {}; D.locations.forEach(L => { entryAt[L.x + ',' + L.y] = L; });
    trackAt = {}; (D.chocoboTracks || []).forEach(t => { for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) trackAt[mod(t.x + dx, W) + ',' + mod(t.y + dy, H)] = t; });
  }
  const ch = (x, y) => cornerH[mod(y, H) * W + mod(x, W)];
  function groundH(px, pz) {
    const x = Math.floor(px), y = Math.floor(pz), fx = px - x, fz = pz - y;
    const a = ch(x, y), b = ch(x + 1, y), c = ch(x, y + 1), d = ch(x + 1, y + 1);
    return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
  }
  WM.groundH = groundH;

  // ---------------------------------------------------------------- sky panorama
  // A 360° cloud panorama generated once: horizontally tileable fractal noise shaped into cumulus
  // (billowy tops, flat bases), lit from the sun (bright tops, blue-grey shaded undersides), smaller
  // and flatter toward the horizon for perspective. Drawn behind the 3D world, turning with the camera.
  const SKY = { W: 1536, H: 360, EL: 34 };   // width = 360°, height = horizon .. 34° up (what the camera sees)
  let SKY_CANVAS = null;
  function skyPanorama() {
    if (SKY_CANVAS) return SKY_CANVAS;
    const cv = U.makeCanvas(SKY.W, SKY.H), g = cv.getContext && cv.getContext('2d');
    if (!g || !g.createImageData) return (SKY_CANVAS = cv);
    const img = g.createImageData(SKY.W, SKY.H), d = img.data;
    // periodic value noise (period px along x so the panorama wraps seamlessly)
    const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
    const noise = (x, y, per) => {
      const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const w = (v) => ((v % per) + per) % per;
      const a = hash(w(xi), yi), b = hash(w(xi + 1), yi), c = hash(w(xi), yi + 1), e = hash(w(xi + 1), yi + 1);
      return (a + (b - a) * sx) + ((c + (e - c) * sx) - (a + (b - a) * sx)) * sy;
    };
    const fbm = (x, y, per) => { let v = 0, amp = 0.5, f = 1; for (let o = 0; o < 6; o++) { v += amp * noise(x * f, y * f, per * f); amp *= 0.5; f *= 2; } return v; };
    // cells ~10° across, twice as wide as tall (cumulus), squashed toward the horizon
    const BASE = 36;
    const dens = new Float32Array(SKY.W * SKY.H);
    for (let y = 0; y < SKY.H; y++) {
      const el = y / SKY.H;                        // 0 at the top .. 1 at the horizon
      const persp = 1 + el * el * 1.6;
      const vy = y * (SKY.EL / SKY.H) * 0.2 * persp;
      for (let x = 0; x < SKY.W; x++) {
        const u = x / SKY.W * BASE;
        let n = fbm(u, vy + 7.3, BASE);
        // billowy: emphasise the big shapes, keep fine detail only near edges
        n = n * 0.85 + 0.15 * noise(u * 0.5, vy * 0.5 + 3.1, BASE / 2);
        let dd = (n - 0.52) / 0.12;
        dd = dd <= 0 ? 0 : dd >= 1 ? 1 : dd * dd * (3 - 2 * dd);
        dd *= el > 0.9 ? (1 - el) / 0.1 : 1;       // melt into the horizon haze
        dens[y * SKY.W + x] = dd;
      }
    }
    const top = [38, 86, 196], hor = [178, 208, 238];
    const lit = [255, 255, 255], shadow = [168, 180, 204];
    const D = (x, y) => dens[Math.max(0, Math.min(SKY.H - 1, y)) * SKY.W + ((x % SKY.W) + SKY.W) % SKY.W];
    for (let y = 0; y < SKY.H; y++) {
      const t = y / (SKY.H - 1), tt = Math.pow(t, 1.5);
      const sky = [top[0] + (hor[0] - top[0]) * tt, top[1] + (hor[1] - top[1]) * tt, top[2] + (hor[2] - top[2]) * tt];
      for (let x = 0; x < SKY.W; x++) {
        const i = y * SKY.W + x, a = D(x, y);
        let r = sky[0], gg = sky[1], b = sky[2];
        if (a > 0) {
          // sun up-left: where density grows toward the sun this point is shadowed; undersides greyer
          const toward = D(x - 5, y - 9);
          let L = 0.8 + (a - toward) * 1.1 - Math.max(0, a - D(x, y + 7)) * 0.25;
          L = Math.max(0, Math.min(1, L));
          const c = [shadow[0] + (lit[0] - shadow[0]) * L, shadow[1] + (lit[1] - shadow[1]) * L, shadow[2] + (lit[2] - shadow[2]) * L];
          const al = Math.min(1, a * 1.1) * (0.75 + 0.25 * (1 - t));     // distant clouds a touch hazier
          r += (c[0] - r) * al; gg += (c[1] - gg) * al; b += (c[2] - b) * al;
        }
        const o = i * 4; d[o] = r; d[o + 1] = gg; d[o + 2] = b; d[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return (SKY_CANVAS = cv);
  }

  // ---------------------------------------------------------------- terrain texture
  // FF7's world map is fully textured (speckled grass / rock). A tiling greyscale speckle texture
  // multiplies the terrain's vertex colours.
  let TERRAIN_TEX = null;
  function terrainTex() {
    if (TERRAIN_TEX || !FF7.tex) return TERRAIN_TEX;
    const N = 128, t = FF7.tex.create(N, N), d = t.data;
    let seed = 1234567; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < N * N; i++) {
      let v = 0.84 + rnd() * 0.16;                       // fine grain
      if (rnd() < 0.08) v -= 0.18 + rnd() * 0.12;         // dark specks
      else if (rnd() < 0.05) v += 0.08;                   // light specks
      const b = Math.max(0, Math.min(255, Math.round(v * 255)));
      d[i * 4] = b; d[i * 4 + 1] = b; d[i * 4 + 2] = Math.round(b * 0.97); d[i * 4 + 3] = 255;
    }
    // soft blotches so large areas don't look uniform
    for (let k = 0; k < 40; k++) {
      const cx = rnd() * N, cy = rnd() * N, r = 6 + rnd() * 14, dv = (rnd() - 0.5) * 0.12;
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const dd = Math.hypot(x - cx, y - cy) / r; if (dd > 1) continue;
        const xx = ((x % N) + N) % N, yy = ((y % N) + N) % N, i = (yy * N + xx) * 4, f = 1 + dv * (1 - dd);
        for (let q = 0; q < 3; q++) d[i + q] = Math.max(0, Math.min(255, d[i + q] * f));
      }
    }
    TERRAIN_TEX = t;
    return t;
  }
  const UVS = 0.34;   // texture repeats about every 3 tiles

  // ---------------------------------------------------------------- chunk meshes
  const chunkCache = {};
  function cornerNormal(x, y) {
    const dx = ch(x + 1, y) - ch(x - 1, y), dz = ch(x, y + 1) - ch(x, y - 1);
    return FF7.V3.norm([-dx, 2, -dz]);
  }
  // smooth value noise (corner lattice every `sc` tiles) for soft, blotchy colour variation
  function vnoise(x, y, sc, k) {
    const fx = x / sc, fy = y / sc, xi = Math.floor(fx), yi = Math.floor(fy), tx = fx - xi, ty = fy - yi;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = U.hash(xi, yi, k), b = U.hash(xi + 1, yi, k), c2 = U.hash(xi, yi + 1, k), d = U.hash(xi + 1, yi + 1, k);
    return (a + (b - a) * sx) * (1 - sy) + (c2 + (d - c2) * sx) * sy;
  }
  function tileColor(c, x, y, hgt) {
    const T = TER[c] || TER.g;
    let col = U.shade(T.col, (U.hash(x, y, 1) - 0.5) * 0.12);
    if (T.marsh) {   // wet, muddy patches blended into the ground (no separate pool polygons)
      const w = vnoise(x, y, 2.5, 61);
      col = U.mix(col, '#2a3a26', Math.max(0, (w - 0.45) / 0.55) * 0.75);
    }
    if ((c === 'M' || c === 'm') && hgt > 2.3) col = U.mix(col, '#e8ecf0', Math.min(1, (hgt - 2.3) / 0.6));
    return col;
  }
  // average colour of the 4 tiles around a corner (land only when any land touches it)
  const ccache = new Map();
  function cornerCol(x, y) {
    const key = mod(x, W) + y * 1000;
    let v = ccache.get(key); if (v) return v;
    // 4x4 neighbourhood (inner 2x2 weighted 3) so biome borders fade instead of stepping per tile
    const sum = [0, 0, 0]; let wsum = 0;
    const inner = [[x - 1, y - 1], [x, y - 1], [x - 1, y], [x, y]];
    const anyLand = inner.some(([a, b]) => !(TER[at(a, b)] || TER.g).water);
    // land colours are sampled at a noise-warped spot (up to about 1.5 tiles off), so borders between grass,
    // sand, dirt and so on meander like FF7's painted world instead of following the square tiles
    const ox = Math.round((vnoise(x, y, 5, 71) - 0.5) * 3), oy = Math.round((vnoise(x, y, 5, 72) - 0.5) * 3);
    for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 1; dx++) {
      let c = at(x + dx + ox, y + dy + oy);
      if ((TER[c] || TER.g).water && !(TER[at(x + dx, y + dy)] || TER.g).water) c = at(x + dx, y + dy);   // never pull the sea inland
      const isW = !!(TER[c] || TER.g).water;
      if (anyLand && isW) continue;
      const wgt = (dx === -1 || dx === 0) && (dy === -1 || dy === 0) ? 3 : 1;
      const q = FF7.glColor(tileColor(c, x, y, ch(x, y)));
      sum[0] += q[0] * wgt; sum[1] += q[1] * wgt; sum[2] += q[2] * wgt; wsum += wgt;
    }
    v = wsum ? [sum[0] / wsum, sum[1] / wsum, sum[2] / wsum, 1] : [0.3, 0.4, 0.3, 1];
    // marsh edges: sample marsh coverage at a domain-warped position so the border meanders
    // (both into and out of the marsh) instead of following the straight tile edges
    const wx = Math.round(x + (vnoise(x, y, 9, 81) - 0.5) * 10 + (vnoise(x, y, 3, 83) - 0.5) * 3);
    const wy = Math.round(y + (vnoise(x, y, 9, 82) - 0.5) * 10 + (vnoise(x, y, 3, 84) - 0.5) * 3);
    let wm = 0, wt = 0;
    for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 1; dx++) { const T = TER[at(wx + dx, wy + dy)] || TER.g; if (T.water) continue; wt++; if (T.marsh) wm++; }
    const localM = inner.some(([a, b]) => (TER[at(a, b)] || TER.g).marsh);
    if (wm || localM) {
      const oS = [0, 0, 0]; let oN = 0;
      for (let dy = -6; dy <= 5; dy++) for (let dx = -6; dx <= 5; dx++) {
        const c = at(x + dx, y + dy), T = TER[c] || TER.g; if (T.water || T.marsh) continue;
        const q = FF7.glColor(tileColor(c, x, y, ch(x, y))), wgt = 1 / (1 + dx * dx + dy * dy);
        oS[0] += q[0] * wgt; oS[1] += q[1] * wgt; oS[2] += q[2] * wgt; oN += wgt;
      }
      if (oN) {
        const mc = FF7.glColor(tileColor('x', x, y, ch(x, y)));
        const frac = (wt ? wm / wt : 0) + (vnoise(x, y, 1.6, 78) - 0.5) * 0.3;
        const w = Math.max(0, Math.min(1, (frac - 0.3) / 0.4)), ws = w * w * (3 - 2 * w);
        for (let k = 0; k < 3; k++) v[k] = (oS[k] / oN) * (1 - ws) + mc[k] * ws;
        v.soft = true;     // no per-tile tint here, it would bring the tile staircase back
      }
    }
    if (ccache.size > 200000) ccache.clear();
    ccache.set(key, v); return v;
  }
  // water surface colour at a tile corner: weighted over the 4x4 tiles around it (land counts as a shallow
  // shelf), with a little noise, so shallows fade into the deep ocean instead of stepping tile by tile
  const WCOL = { deep: [0.12, 0.26, 0.55, 0.82], shallow: [0.22, 0.5, 0.7, 0.7], river: [0.3, 0.55, 0.75, 0.75] };
  const wcache = new Map();
  function waterCorner(x, y) {
    const key = mod(x, W) + ',' + mod(y, H);
    let v = wcache.get(key); if (v) return v;
    const lit = [0, 0, 0, 0]; let deep = 0, n = 0, ln = 0;
    for (let dy = -2; dy <= 1; dy++) for (let dx = -2; dx <= 1; dx++) {
      const T = TER[at(x + dx, y + dy)] || TER.g, ox = dx + 0.5, oy = dy + 0.5, w = 1 / (0.6 + ox * ox + oy * oy);
      n += w;
      if (T.water === 'deep') { deep += w; continue; }
      const q = WCOL[T.water] || WCOL.shallow;
      for (let k = 0; k < 4; k++) lit[k] += q[k] * w;
      ln += w;
    }
    const f = Math.max(0, Math.min(1, (deep / n + (vnoise(x, y, 2.2, 91) - 0.5) * 0.35 - 0.3) / 0.45)), s = f * f * (3 - 2 * f);
    const L = ln ? lit.map(c => c / ln) : WCOL.shallow;
    v = WCOL.deep.map((c, k) => L[k] * (1 - s) + c * s);
    if (wcache.size > 200000) wcache.clear();
    wcache.set(key, v); return v;
  }
  function buildChunk(cx, cy) {
    const key = cx + ',' + cy;
    if (chunkCache[key]) return chunkCache[key];
    const mb = new FF7.MeshBuilder(), wmb = new FF7.MeshBuilder(), gmb = new FF7.MeshBuilder(), tmb = new FF7.MeshBuilder();
    const x0 = cx * CH, y0 = cy * CH;
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const X = x0 + tx, Y = y0 + ty, c = at(X, Y), T = TER[c] || TER.g;
      const h00 = ch(X, Y), h10 = ch(X + 1, Y), h01 = ch(X, Y + 1), h11 = ch(X + 1, Y + 1);
      const A = [tx, h00, ty], B = [tx + 1, h10, ty], C = [tx + 1, h11, ty + 1], Dd = [tx, h01, ty + 1];
      const nA = cornerNormal(X, Y), nB = cornerNormal(X + 1, Y), nC = cornerNormal(X + 1, Y + 1), nD = cornerNormal(X, Y + 1);
      // colours blended at the corners (smooth terrain like FF7's textured world, no checkerboard)
      const own = FF7.glColor(tileColor(c, X, Y, (h00 + h10 + h01 + h11) / 4));
      const mixc = (k) => { const q = cornerCol(X + (k & 1), Y + (k >> 1)), o = q.soft || T.water ? 0 : 0.08; return [q[0] * (1 - o) + own[0] * o, q[1] * (1 - o) + own[1] * o, q[2] * (1 - o) + own[2] * o, 1]; };
      const cA = mixc(0), cB = mixc(1), cD = mixc(2), cC = mixc(3);
      // CCW seen from above (+y): A(tx,ty) -> D(tx,ty+1) -> C -> B
      const uv = (dx, dy) => [(X + dx) * UVS, (Y + dy) * UVS];
      mb.tri(A, Dd, C, [cA, cD, cC], [uv(0, 0), uv(0, 1), uv(1, 1)], [nA, nD, nC]);
      mb.tri(A, C, B, [cA, cC, cB], [uv(0, 0), uv(1, 1), uv(1, 0)], [nA, nC, nB]);
      // the water surface: on sea tiles, and on the land tiles along the coast (where the ground dips below it)
      const coast = !T.water && [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].some(([dx, dy]) => (TER[at(X + dx, Y + dy)] || TER.g).water);
      if (T.water || coast) {
        const wA = waterCorner(X, Y), wB = waterCorner(X + 1, Y), wC = waterCorner(X + 1, Y + 1), wD = waterCorner(X, Y + 1);
        wmb.tri([tx, WL, ty], [tx, WL, ty + 1], [tx + 1, WL, ty + 1], [wA, wD, wC], null, [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
        wmb.tri([tx, WL, ty], [tx + 1, WL, ty + 1], [tx + 1, WL, ty], [wA, wC, wB], null, [[0, 1, 0], [0, 1, 0], [0, 1, 0]]);
      }
      if (T.trees) {
        for (let k = 0; k < T.trees; k++) {
          const ox = 0.2 + U.hash(X, Y, 10 + k) * 0.6, oz = 0.2 + U.hash(X, Y, 20 + k) * 0.6;
          if (cleared(X + ox, Y + oz)) continue;
          const gy = groundH(X + ox, Y + oz);
          const sc = 0.75 + U.hash(X, Y, 30 + k) * 0.5;
          const tc = T.jungle ? U.shade('#3a7a2c', (U.hash(X, Y, 40 + k) - 0.5) * 0.25) : U.shade('#2e5e26', (U.hash(X, Y, 40 + k) - 0.5) * 0.25);
          tree(tmb, tx + ox, gy, ty + oz, sc, !!T.jungle, tc);
        }
      }
      if (c === 'C') mb.box(tx + 0.5, (h00 + h11) / 2 + 0.15, ty + 0.5, 0.96, 0.3, 0.96, '#3c3c44');
      if (c === 'b') mb.box(tx + 0.5, 0.06, ty + 0.5, 1, 0.08, 0.8, { top: '#9a7a48', side: '#6a4a28' });
      if (T.glow) gmb.floor(tx, ty, tx + 1, ty + 1, (h00 + h11) / 2 + 0.03, '#ff8030');
    }
    const tex = terrainTex();
    const atlasTex = atlas();
    const chunk = { mesh: mb.build(tex ? { tex, texOpts: { repeat: true } } : {}), trees: tmb.P.length ? tmb.build(atlasTex ? { tex: atlasTex } : {}) : null, water: wmb.P.length ? wmb.build() : null, glow: gmb.P.length ? gmb.build({ unlit: true }) : null };
    chunkCache[key] = chunk;
    return chunk;
  }
  // trees don't grow through landmarks: each (non-forest) one stands in a clearing its own size
  let CLEARINGS = null;
  function cleared(x, z) {
    if (!CLEARINGS) {
      CLEARINGS = [];
      D.locations.forEach(L => {
        if (L.icon === 'forest' || !LANDMARK[L.id]) return;
        const m = landmark(L), c = lmCentre(L);
        if (m) CLEARINGS.push([c[0], c[1], Math.hypot(Math.max(-m.min[0], m.max[0]), Math.max(-m.min[2], m.max[2])) * 0.9 + 0.1]);
      });
    }
    return CLEARINGS.some(([cx, cz, r]) => Math.abs(wrapD(x - cx, W)) < r && Math.abs(wrapD(z - cz, H)) < r && Math.hypot(wrapD(x - cx, W), wrapD(z - cz, H)) < r);
  }
  const wrapD = (d, n) => { while (d > n / 2) d -= n; while (d < -n / 2) d += n; return d; };
  WM.clearCache = () => { for (const k in chunkCache) { const c = chunkCache[k]; ['mesh', 'trees', 'water', 'glow'].forEach(m => c[m] && GL.release(c[m])); delete chunkCache[k]; } };

  // ---------------------------------------------------------------- texture atlas (landmarks, trees)
  // 256x256 procedural atlas; textures are near-neutral so vertex colours tint them.
  // Regions (u0, v0, u1, v1). The top-left 4x4 texels are white for untextured faces.
  const AT = {
    foliage: [4 / 256, 4 / 256, 0.5, 0.5], roof: [0.5, 0, 1, 0.25], wall: [0.5, 0.25, 1, 0.5],
    stone: [0, 0.5, 0.25, 0.75], rock: [0.25, 0.5, 0.5, 0.75], wood: [0.5, 0.5, 0.75, 0.75], timber: [0.75, 0.5, 1, 0.75], metal: [0, 0.75, 0.5, 1], bark: [0.5, 0.75, 0.75, 1], leafy: [0.75, 0.75, 1, 1],
  };
  let ATLAS = null;
  function atlas() {
    if (ATLAS || !FF7.tex) return ATLAS;
    const N = 256, t = FF7.tex.create(N, N), d = t.data;
    let seed = 987654321; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const set = (x, y, r, g, b) => { if (x < 0 || y < 0 || x >= N || y >= N) return; const i = (y * N + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
    const get = (x, y) => { const i = (y * N + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const fill = (x0, y0, x1, y1, f) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const c = f(x - x0, y - y0); set(x, y, c[0], c[1], c[2]); } };
    const blob = (cx, cy, r, c, x0, y0, x1, y1) => { for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { if (x < x0 || y < y0 || x >= x1 || y >= y1) continue; if (Math.hypot(x - cx, y - cy) <= r) set(x, y, c[0], c[1], c[2]); } };
    fill(0, 0, N, N, () => [255, 255, 255]);
    // foliage: mottled leaf clusters (dark gaps, bright sunlit leaves)
    fill(4, 4, 128, 128, () => { const v = 150 + rnd() * 30; return [v, v + 8, v]; });
    for (let k = 0; k < 900; k++) { const v = rnd() < 0.45 ? 95 + rnd() * 30 : 200 + rnd() * 50; blob(4 + rnd() * 124, 4 + rnd() * 124, 1 + rnd() * 3.2, [v * 0.96, v, v * 0.92], 4, 4, 128, 128); }
    // leafy (broadleaf canopy): bigger rounder clumps
    fill(192, 192, 256, 256, () => { const v = 140 + rnd() * 25; return [v, v + 6, v]; });
    for (let k = 0; k < 260; k++) { const v = rnd() < 0.4 ? 100 : 205 + rnd() * 40; blob(192 + rnd() * 64, 192 + rnd() * 64, 2 + rnd() * 3, [v, v, v * 0.95], 192, 192, 256, 256); }
    // roof: rows of staggered shingles with shaded lower edges
    fill(128, 0, 256, 64, (x, y) => {
      const row = Math.floor(y / 8), ry = y % 8, off = row % 2 ? 6 : 0, tx = (x + off) % 12;
      let v = 205 + (rnd() - 0.5) * 16 - ry * 5;
      if (ry === 7) v = 105; if (tx === 0) v = 125;
      return [v, v * 0.97, v * 0.95];
    });
    // wall: plaster, timber beams at the edges and middle, two framed windows
    fill(128, 64, 256, 128, (x, y) => {
      let v = 232 + (rnd() - 0.5) * 14; let c = [v, v * 0.98, v * 0.94];
      if (x < 4 || x > 123 || y < 3 || y > 60 || (y > 30 && y < 34)) c = [120, 100, 84];
      return c;
    });
    for (const wx of [24, 80]) for (let y = 12; y < 28; y++) for (let x = wx; x < wx + 24; x++) {
      const frame = y < 14 || y > 25 || x < wx + 2 || x > wx + 21 || x === wx + 11 || x === wx + 12 || y === 19 || y === 20;
      set(128 + x, 64 + y, frame ? 242 : 58, frame ? 238 : 70, frame ? 228 : 104);
    }
    // stone: masonry courses with mortar lines
    fill(0, 128, 64, 192, (x, y) => {
      const row = Math.floor(y / 8), off = row % 2 ? 4 : 0, bx = (x + off) % 8, by = y % 8;
      if (bx === 0 || by === 0) return [150, 148, 142];
      const v = 200 + (rnd() - 0.5) * 30 - by * 2; return [v, v * 0.98, v * 0.93];
    });
    // rock: natural weathered stone, soft strata, dark cracks (cliffs, cave mouths)
    fill(64, 128, 128, 192, (x, y) => { const v = 176 + Math.sin(y * 0.45 + Math.sin(x * 0.2) * 1.5) * 14 + (rnd() - 0.5) * 26; return [v, v * 0.95, v * 0.87]; });
    for (let k = 0; k < 14; k++) {   // cracks: short random walks, wrapped inside the tile
      let cx = rnd() * 64, cy = rnd() * 64; const len = 8 + rnd() * 18;
      for (let i = 0; i < len; i++) { cx += rnd() - 0.5 + 0.3; cy += rnd() * 1.4 - 0.2; const px = 64 + (Math.floor(cx) % 64 + 64) % 64, py = 128 + (Math.floor(cy) % 64 + 64) % 64, c = get(px, py); set(px, py, c[0] * 0.55, c[1] * 0.55, c[2] * 0.55); }
    }
    // wood planks with grain
    fill(128, 128, 192, 192, (x, y) => { if (x % 9 === 0) return [110, 90, 70]; const v = 185 + Math.sin(y * 0.9 + x * 0.3) * 12 + (rnd() - 0.5) * 18; return [v, v * 0.9, v * 0.78]; });
    // timber: FF7 world-map half-timbering (plaster panels in a dark frame, braces below, small windows above)
    fill(192, 128, 256, 192, (x, y) => {
      const v = 232 + (rnd() - 0.5) * 16;
      const frame = x < 3 || x > 60 || (x > 29 && x < 34) || y < 3 || y > 60 || (y > 28 && y < 33);
      const brace = y > 32 && Math.abs((x < 32 ? x - 3 : 60 - x) - (60 - y)) < 2;
      const win = y > 9 && y < 23 && ((x > 9 && x < 23) || (x > 40 && x < 54));
      if (frame || brace) return [92 + rnd() * 10, 74, 60];
      if (win) return (y === 16 || x === 16 || x === 47) ? [200, 196, 186] : [54, 62, 84];
      return [v, v * 0.98, v * 0.93];
    });
    // metal panels with seams and rivets
    fill(0, 192, 128, 256, (x, y) => {
      const px = x % 32, py = y % 32;
      if (px === 0 || py === 0) return [95, 98, 104];
      if ((px === 3 || px === 28) && (py === 3 || py === 28)) return [235, 238, 242];
      const v = 175 + (py / 32) * 30 + (rnd() - 0.5) * 8; return [v, v, v * 1.02];
    });
    // bark: vertical streaks
    fill(128, 192, 192, 256, (x, y) => { const v = 150 + Math.sin(x * 1.7) * 25 + (rnd() - 0.5) * 20; return [v, v * 0.85, v * 0.7]; });
    ATLAS = t;
    return t;
  }
  // UV helpers: map a face into an atlas region
  const uvr = (R, u, v) => [R[0] + (R[2] - R[0]) * Math.min(1, Math.max(0, u)), R[1] + (R[3] - R[1]) * Math.min(1, Math.max(0, v))];
  // textured quad a b c d (CCW, a = bottom-left of the texture), optional n x m subdivision
  function tquad(mb, a, b, c, d, col, R, nu = 1, nv = 1) {
    const L = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
      const P = (u, v) => L(L(a, b, u), L(d, c, u), v);
      mb.quad(P(u0, v0), P(u1, v0), P(u1, v1), P(u0, v1), col, [uvr(R, 0, 1), uvr(R, 1, 1), uvr(R, 1, 0), uvr(R, 0, 0)]);
    }
  }
  // textured box (walls use R, top uses Rt); reps = texture repeats along the walls
  function tbox(mb, x, y, z, w, h, dp, col, R, Rt, reps = 1, topCol) {
    const x0 = x - w / 2, x1 = x + w / 2, z0 = z - dp / 2, z1 = z + dp / 2, y0 = y - h / 2, y1 = y + h / 2;
    const rw = Math.max(1, Math.round(reps)), shade = (k) => U.shade(col, k);
    tquad(mb, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col, R, rw, 1);                  // south
    tquad(mb, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], shade(-0.12), R, rw, 1);         // north
    tquad(mb, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], shade(-0.06), R, rw, 1);         // west
    tquad(mb, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], shade(-0.06), R, rw, 1);         // east
    if (Rt !== null) tquad(mb, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], topCol || col, Rt || R, rw, rw);
  }
  // textured cylinder / cone side (u around, v up)
  function tprism(mb, x, y, z, r0, r1, h, n, col, R, reps = 1) {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      const p = (a, r, yy) => [x + Math.cos(a) * r, yy, z + Math.sin(a) * r];
      const u0 = (i / n * reps) % 1, u1 = u0 + reps / n;
      mb.quad(p(a1, r0, y), p(a0, r0, y), p(a0, r1, y + h), p(a1, r1, y + h), U.shade(col, Math.cos(a0) * 0.08), [uvr(R, u1, 1), uvr(R, u0, 1), uvr(R, u0, 0), uvr(R, u1, 0)]);
    }
  }
  function tcone(mb, x, y, z, r, h, n, col, R) {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      mb.tri([x + Math.cos(a1) * r, y, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, y, z + Math.sin(a0) * r], [x, y + h, z], U.shade(col, Math.cos(a0) * 0.1), [uvr(R, (i + 1) / n, 1), uvr(R, i / n, 1), uvr(R, (i + 0.5) / n, 0)]);
    }
  }
  // FF7-style world trees: tiered conifer, or broadleaf canopy (jungle)
  function tree(mb, x, y, z, s, jungle, col) {
    tprism(mb, x, y, z, 0.035 * s, 0.03 * s, 0.16 * s, 5, '#6a5038', AT.bark);
    if (jungle) {
      const R = AT.leafy, cy = y + 0.34 * s;
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, r = 0.2 * s; tprism(mb, x, cy - 0.12 * s + (k % 2) * 0.02 * s, z, r, r * 0.55, 0.22 * s, 7, col, R); }
      tcone(mb, x, cy + 0.08 * s, z, 0.13 * s, 0.1 * s, 7, U.shade(col, 0.1), R);
    } else {
      const R = AT.foliage;
      tcone(mb, x, y + 0.1 * s, z, 0.24 * s, 0.34 * s, 7, col, R);
      tcone(mb, x, y + 0.28 * s, z, 0.18 * s, 0.3 * s, 7, U.shade(col, 0.06), R);
      tcone(mb, x, y + 0.44 * s, z, 0.11 * s, 0.24 * s, 6, U.shade(col, 0.12), R);
    }
  }
  // textured house: plaster walls with windows, gabled shingle roof
  function thouse(mb, x, z, w, dp, h, wall, roof) {
    tbox(mb, x, h / 2, z, w, h, dp, wall, AT.wall, null, Math.max(1, w / dp));
    const rh = h * 0.6, ov = 0.04, x0 = x - w / 2 - ov, x1 = x + w / 2 + ov, z0 = z - dp / 2 - ov, z1 = z + dp / 2 + ov;
    tquad(mb, [x0, h, z1], [x1, h, z1], [x1, h + rh, z], [x0, h + rh, z], roof, AT.roof, 2, 1);             // south slope
    tquad(mb, [x1, h, z0], [x0, h, z0], [x0, h + rh, z], [x1, h + rh, z], U.shade(roof, -0.15), AT.roof, 2, 1);
    mb.tri([x - w / 2, h, z + dp / 2], [x - w / 2, h + rh, z], [x - w / 2, h, z - dp / 2], U.shade(wall, -0.06), [uvr(AT.wall, 0, 1), uvr(AT.wall, 0.5, 0.2), uvr(AT.wall, 1, 1)]);
    mb.tri([x + w / 2, h, z - dp / 2], [x + w / 2, h + rh, z], [x + w / 2, h, z + dp / 2], U.shade(wall, -0.06), [uvr(AT.wall, 0, 1), uvr(AT.wall, 0.5, 0.2), uvr(AT.wall, 1, 1)]);
  }

  // ---------------------------------------------------------------- landmarks
  const lmCache = {};
  function house(mb, x, z, w, d, hgt, wall, roof) { thouse(mb, x, z, w, d, hgt, wall, roof); }
  // Landmarks are matched to FF7's own world map (references/world maps/.../Gaia.obj: each town cropped
  // and rendered with tools/ref_dae_view.py --box, look only). `ref` builders are written in that map's
  // units: Cloud is ~0.45 units tall there and ~0.51 tiles here (0.55 x his model), so LS keeps every
  // landmark at its FF7 size next to him. They stand on the ground at the centre of their footprint.
  const LS = 1.15;
  const lmCentre = (L) => L.fx != null ? [L.fx + L.w / 2, L.fy + L.h / 2] : [L.x + 0.5, L.y + 0.5];
  // ground under a point of a landmark (local tiles), relative to the height it is drawn at (its entry tile)
  const lmGround = (L, x = 0, z = 0) => { const c = lmCentre(L); return groundH(c[0] + x, c[1] + z) - groundH(L.x + 0.5, L.y + 0.5); };
  const ref = (fn) => (mb, L) => { mb.push(); mb.translate(0, lmGround(L), 0); mb.scale(LS, LS, LS); fn(mb, L); mb.pop(); };
  const TIMBER = '#e2d6ba', DARK = '#0c0a08';
  const ttri = (mb, a, b, c, col, R) => mb.tri(a, b, c, col, [uvr(R, 0, 1), uvr(R, 1, 1), uvr(R, 0.5, 0)]);
  // move the frame up or down so that its local point (x, 0, z) sits on the ground (houses on slopes)
  function hug(mb, L, x, z) {
    const P = mb.xf([x, 0, z]), k = Math.hypot(mb.m[4], mb.m[5], mb.m[6]) || 1;
    mb.translate(0, (lmGround(L, P[0], P[2]) - P[1]) / k, 0);
  }
  // roof over a w x d house (ridge along x), eaves at h, ridge rh higher: gable | hip (a pyramid when
  // square) | cross (gables on all four sides) | gambrel (barn) | shed (one slope, high along the south
  // wall) | pagoda (Wutai: a flared skirt under a small gabled roof). WR = texture of the gable walls.
  function froof(mb, kind, w, d, h, rh, wall, roof, WR = AT.timber, ov = 0.03) {
    if ((kind === 'hip' || kind === 'pagoda') && d > w) { mb.push(); mb.rotate(0, Math.PI / 2, 0); froof(mb, kind, d, w, h, rh, wall, roof, WR, ov); mb.pop(); return; }
    if (kind === 'pagoda') ov = 0.08;
    const x0 = -w / 2 - ov, x1 = w / 2 + ov, z0 = -d / 2 - ov, z1 = d / 2 + ov, t = h + rh, R = AT.roof;
    const rs = U.shade(roof, -0.15), re = U.shade(roof, -0.07), W = U.shade(wall, -0.06);
    if (kind === 'gable' || kind === 'cross') {
      tquad(mb, [x0, h, z1], [x1, h, z1], [x1, t, 0], [x0, t, 0], roof, R, 2, 1);
      tquad(mb, [x1, h, z0], [x0, h, z0], [x0, t, 0], [x1, t, 0], rs, R, 2, 1);
      ttri(mb, [-w / 2, h, -d / 2], [-w / 2, h, d / 2], [-w / 2, t, 0], W, WR);
      ttri(mb, [w / 2, h, d / 2], [w / 2, h, -d / 2], [w / 2, t, 0], W, WR);
      if (kind === 'cross') { mb.push(); mb.rotate(0, Math.PI / 2, 0); froof(mb, 'gable', d, w, h, rh, wall, roof, WR, ov); mb.pop(); }
    } else if (kind === 'hip') {
      const r = Math.max(0, w / 2 - d / 2);
      if (r > 1e-3) {
        tquad(mb, [x0, h, z1], [x1, h, z1], [r, t, 0], [-r, t, 0], roof, R, 2, 1);
        tquad(mb, [x1, h, z0], [x0, h, z0], [-r, t, 0], [r, t, 0], rs, R, 2, 1);
      } else {
        ttri(mb, [x0, h, z1], [x1, h, z1], [0, t, 0], roof, R);
        ttri(mb, [x1, h, z0], [x0, h, z0], [0, t, 0], rs, R);
      }
      ttri(mb, [x0, h, z0], [x0, h, z1], [-r, t, 0], re, R);
      ttri(mb, [x1, h, z1], [x1, h, z0], [r, t, 0], re, R);
    } else if (kind === 'gambrel') {
      const f = d * 0.13;
      tquad(mb, [x0, h, z1], [x1, h, z1], [x1, t, f], [x0, t, f], roof, R, 2, 1);
      tquad(mb, [x1, h, z0], [x0, h, z0], [x0, t, -f], [x1, t, -f], rs, R, 2, 1);
      tquad(mb, [x0, t, f], [x1, t, f], [x1, t, -f], [x0, t, -f], U.shade(roof, 0.05), R, 2, 1);
      tquad(mb, [-w / 2, h, -d / 2], [-w / 2, h, d / 2], [-w / 2, t, f], [-w / 2, t, -f], W, WR);
      tquad(mb, [w / 2, h, d / 2], [w / 2, h, -d / 2], [w / 2, t, -f], [w / 2, t, f], W, WR);
    } else if (kind === 'shed') {
      tquad(mb, [x1, h, z0], [x0, h, z0], [x0, t, z1], [x1, t, z1], roof, R, 2, 1);
      tquad(mb, [-w / 2, h, d / 2], [w / 2, h, d / 2], [w / 2, t - 0.01, d / 2], [-w / 2, t - 0.01, d / 2], wall, WR);
      ttri(mb, [-w / 2, h, -d / 2], [-w / 2, h, d / 2], [-w / 2, t - 0.01, d / 2], W, WR);
      ttri(mb, [w / 2, h, d / 2], [w / 2, h, -d / 2], [w / 2, t - 0.01, d / 2], W, WR);
    } else if (kind === 'pagoda') {
      const sx = w * 0.3, sz = d * 0.3, m = h + rh * 0.35;
      tquad(mb, [x0, h, z1], [x1, h, z1], [sx, m, sz], [-sx, m, sz], roof, R, 2, 1);
      tquad(mb, [x1, h, z0], [x0, h, z0], [-sx, m, -sz], [sx, m, -sz], rs, R, 2, 1);
      tquad(mb, [x0, h, z0], [x0, h, z1], [-sx, m, sz], [-sx, m, -sz], re, R, 2, 1);
      tquad(mb, [x1, h, z1], [x1, h, z0], [sx, m, -sz], [sx, m, sz], re, R, 2, 1);
      froof(mb, 'gable', sx * 2.1, sz * 2.1, m - 0.02, t - m + 0.02, U.shade(roof, 0.1), roof, AT.roof);
    }
  }
  // FF7 world-map house (its units): walls h high on a dark plinth sunk into the ground, then the roof;
  // w along x, d along z, turned ang degrees about +y (local +x then points along (cos, -sin))
  function fhouse(mb, x, z, w, d, h, rh, wall, roof, kind = 'gable', ang = 0, WR = AT.timber) {
    mb.push(); mb.translate(x, 0, z); if (ang) mb.rotate(0, ang * Math.PI / 180, 0);
    const x0 = -w / 2, x1 = w / 2, z0 = -d / 2, z1 = d / 2, b = -0.2, pc = U.shade(wall, -0.45);
    const nw = Math.max(1, Math.round(w / h / 1.3)), nd = Math.max(1, Math.round(d / h / 1.3));
    mb.quad([x0, b, z1], [x1, b, z1], [x1, 0, z1], [x0, 0, z1], pc); mb.quad([x1, b, z0], [x0, b, z0], [x0, 0, z0], [x1, 0, z0], pc);
    mb.quad([x0, b, z0], [x0, b, z1], [x0, 0, z1], [x0, 0, z0], pc); mb.quad([x1, b, z1], [x1, b, z0], [x1, 0, z0], [x1, 0, z1], pc);
    tquad(mb, [x0, 0, z1], [x1, 0, z1], [x1, h, z1], [x0, h, z1], wall, WR, nw, 1);
    tquad(mb, [x1, 0, z0], [x0, 0, z0], [x0, h, z0], [x1, h, z0], U.shade(wall, -0.1), WR, nw, 1);
    tquad(mb, [x0, 0, z0], [x0, 0, z1], [x0, h, z1], [x0, h, z0], U.shade(wall, -0.05), WR, nd, 1);
    tquad(mb, [x1, 0, z1], [x1, 0, z0], [x1, h, z0], [x1, h, z1], U.shade(wall, -0.05), WR, nd, 1);
    if (kind) froof(mb, kind, w, d, h, rh, wall, roof, WR);
    mb.pop();
  }
  // flat ground patch (square, yard, crater floor): an n-gon ellipse just above the terrain
  function fdisc(mb, x, z, rx, rz, col, R, n = 10, y = 0.04) {
    const p = (i) => { const a = i / n * Math.PI * 2; return [x + Math.cos(a) * rx, y, z + Math.sin(a) * rz]; };
    const q = (i) => { const a = i / n * Math.PI * 2; return uvr(R, 0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5); };
    for (let i = 0; i < n; i++) mb.tri([x, y, z], p(i + 1), p(i), col, [uvr(R, 0.5, 0.5), q(i + 1), q(i)]);
  }
  // path along a polyline of [x, z] points, w wide
  function fpath(mb, pts, w, col, R = AT.rock, y = 0.045) {
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, z0] = pts[i], [x1, z1] = pts[i + 1], l = Math.hypot(x1 - x0, z1 - z0) || 1, nx = -(z1 - z0) / l * w / 2, nz = (x1 - x0) / l * w / 2;
      tquad(mb, [x0 + nx, y, z0 + nz], [x1 + nx, y, z1 + nz], [x1 - nx, y, z1 - nz], [x0 - nx, y, z0 - nz], col, R, Math.max(1, Math.round(l / w / 2)), 1);
    }
  }
  // rock mass: textured n-sided frustum with a flat top
  function frock(mb, x, y, z, r0, r1, h, n, col, top, R = AT.rock) {
    tprism(mb, x, y, z, r0, r1, h, n, col, R, Math.max(1, Math.round(n / 3)));
    const c = (a, k) => uvr(R, 0.5 + Math.cos(a) * k, 0.5 + Math.sin(a) * k);
    for (let i = 0; i < n; i++) {
      const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2;
      mb.tri([x, y + h, z], [x + Math.cos(a1) * r1, y + h, z + Math.sin(a1) * r1], [x + Math.cos(a0) * r1, y + h, z + Math.sin(a0) * r1], top || U.shade(col, 0.08), [c(0, 0), c(a1, 0.5), c(a0, 0.5)]);
    }
  }
  // cave mouth in a rock outcrop (its units), facing the camera (+z). o: col, rim, r, h, mw/mh (mouth half
  // width / height), snow, spires [[x, z, size]], rails (a mine railway runs in), fall (a waterfall over it)
  function fcave(mb, o = {}) {
    const col = o.col || '#a08e6c', r = o.r || 0.62, h = o.h || 0.78, mw = o.mw || 0.17, mh = o.mh || 0.36, rim = o.rim || U.shade(col, -0.3), zf = r * 0.62;
    const top = o.snow ? '#eef2f6' : U.shade(col, 0.06);
    frock(mb, 0, -0.35, -0.22, r * 1.08, r * 0.5, h * 0.7 + 0.35, 7, col, top);
    tcone(mb, 0.02, h * 0.7, -0.24, r * 0.5, h * 0.3, 7, top, AT.rock);
    tcone(mb, r * 0.72, -0.05, 0.1, r * 0.34, h * 0.42 + 0.05, 5, U.shade(col, -0.06), AT.rock);
    tcone(mb, -r * 0.7, -0.05, 0.06, r * 0.3, h * 0.36 + 0.05, 5, U.shade(col, 0.04), AT.rock);
    (o.spires || []).forEach(([x, z, s]) => tcone(mb, x, -0.05, z, 0.17 * s, 0.9 * s, 5, U.shade(col, -0.04), AT.rock));
    tbox(mb, 0, mh * 0.66 - 0.15, zf - 0.08, mw * 3.4, mh * 1.32 + 0.3, 0.16, U.shade(col, -0.04), AT.rock, AT.rock, 1, top);   // the face it is cut into
    const z = zf + 0.008, c = mh - mw, n = 6;
    const arch = (e) => { const P = [[mw + e, 0]]; for (let i = 0; i <= n; i++) { const t = i / n * Math.PI; P.push([Math.cos(t) * (mw + e), c + Math.sin(t) * (mw + e)]); } P.push([-(mw + e), 0]); return P; };
    const I = arch(0), O = arch(0.06);
    for (let i = 0; i < I.length - 1; i++) {
      mb.tri([0, 0, z], [I[i][0], I[i][1], z], [I[i + 1][0], I[i + 1][1], z], DARK);
      mb.quad([I[i][0], I[i][1], z], [O[i][0], O[i][1], z], [O[i + 1][0], O[i + 1][1], z], [I[i + 1][0], I[i + 1][1], z], rim);
    }
    if (o.rails) {                                  // Mt. Corel's mine railway running into the mountain
      [-0.045, 0.045].forEach(x => mb.box(x, 0.02, zf + 0.35, 0.014, 0.03, 0.7, '#3a3434'));
      for (let i = 0; i < 6; i++) mb.box(0, 0.008, zf + 0.06 + i * 0.12, 0.16, 0.016, 0.035, '#6a5040');
    }
    if (o.fall) {                                   // Lucrecia's cave: behind a waterfall, over a pool
      const fw = mw * 1.3, ft = h * 0.8;
      for (let i = 0; i < 4; i++) { const x0 = -fw + i * fw / 2, x1 = x0 + fw / 2; mb.quad([x0, -0.05, z + 0.05], [x1, -0.05, z + 0.05], [x1, ft, z - 0.02], [x0, ft, z - 0.02], i % 2 ? '#bcdcf0' : '#e2f0fa'); }
      fdisc(mb, 0, zf + 0.34, 0.5, 0.3, '#4a8cc4', AT.stone, 9, 0.03);
    }
  }
  // a stand of trees over a landmark's footprint, each on the ground where it stands (tiles, not LS)
  function grove(mb, L, n, o) {
    const [cx, cz] = lmCentre(L), sx = o.r || L.w * 0.46, sz = o.r || L.h * 0.46;
    for (let i = 0; i < n; i++) {
      const x = (U.hash(i, 11) - 0.5) * 2 * sx, z = (U.hash(i, 12) - 0.5) * 2 * sz;
      if (!(o.on || 'fgjh').includes(at(Math.floor(cx + x), Math.floor(cz + z)))) continue;
      tree(mb, x, lmGround(L, x, z), z, o.s0 + U.hash(i, 13) * (o.s1 - o.s0), !!o.jungle, U.shade(o.col, (U.hash(i, 14) - 0.5) * 0.24));
    }
  }
  const LANDMARK = {
    midgar(mb, L) {
      const r = L.w * 0.48;
      tprism(mb, 0, 0, 0, r * 1.02, r * 1.02, 0.35, 16, '#4a4a52', AT.metal, 6);          // lower slums ring
      tprism(mb, 0, 0.55, 0, r, r, 0.12, 16, '#6a6a72', AT.metal, 8);                     // the plate edge
      mb.prism(0, 0.55, 0, r, r, 0.12, 16, '#5a5a62', false, true, false);
      for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; mb.prism(Math.cos(a) * r * 0.9, 0, Math.sin(a) * r * 0.9, 0.12, 0.12, 0.55, 5, '#44444a', false); }
      for (let i = 0; i < 8; i++) {                                                   // 8 mako reactors
        const a = (i + 0.5) / 8 * Math.PI * 2, x = Math.cos(a) * r * 0.95, z = Math.sin(a) * r * 0.95;
        tprism(mb, x, 0, z, 0.55, 0.45, 1.1, 8, '#64646c', AT.metal, 2);
        mb.prism(x, 1.1, z, 0.12, 0.08, 0.9, 6, '#6a6a70', false);
        mb.sphere(x, 0.7, z, 0.3, 0.2, 0.3, '#40ff90', 6, 3, false);
      }
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mb.box(Math.cos(a) * r * 0.5, 0.75, Math.sin(a) * r * 0.5, 0.5 + U.hash(i, 1) * 0.5, 0.35, 0.5, '#606068'); }
      tprism(mb, 0, 0.6, 0, 0.7, 0.55, 2.4, 8, '#808088', AT.metal, 3);                  // Shinra HQ
      mb.prism(0, 3.0, 0, 0.35, 0.2, 0.5, 8, '#808088', false);
    },
    // Junon: the city climbs from its harbour deck (over our C tiles) up a ramp to the clifftop, the giant
    // cannon on top pointing west over the sea along the pier arm (FF7: the ramp at Gaia.obj 165.7, 142.2;
    // the cannon is a separate model there, shaped after screenshot 04-junon04). Our map gives Junon an
    // 11 x 9 footprint, so it is built at city size in tiles, not LS.
    junon(mb) {
      const deck = '#7e7a6e', hull = '#b0a27c', bronze = '#8c7c58', grille = '#3a3630';
      tbox(mb, 2.5, 0.05, 0, 6.1, 1.0, 9.1, deck, AT.metal, AT.metal, 3);                 // harbour deck over the city block
      tbox(mb, -3.0, 0.05, 0, 5.1, 1.0, 3.1, deck, AT.metal, AT.metal, 3);                // the pier arm
      const y0 = 0.55, y1 = 1.75, xa = 0.1, xb = 4.4, zr = 3.5, ys = (x) => y0 + (x - xa) / (xb - xa) * (y1 - y0);
      tquad(mb, [xa, y0, zr], [xb, y1, zr], [xb, y1, -zr], [xa, y0, -zr], hull, AT.metal, 4, 5);   // the ramp
      ttri(mb, [xa, y0, zr], [xb, y0, zr], [xb, y1, zr], hull, AT.metal);
      ttri(mb, [xb, y0, -zr], [xa, y0, -zr], [xb, y1, -zr], hull, AT.metal);
      [[1.3, 2.9], [-2.9, -1.3]].forEach(([za, zb]) => mb.quad([0.6, ys(0.6) + 0.012, zb], [3.9, ys(3.9) + 0.012, zb], [3.9, ys(3.9) + 0.012, za], [0.6, ys(0.6) + 0.012, za], grille));
      [1, -1].forEach(s => { mb.push(); mb.translate((xa + xb) / 2, (y0 + y1) / 2 + 0.12, s * (zr + 0.25)); mb.rotate(0, 0, Math.atan2(y1 - y0, xb - xa)); tbox(mb, 0, 0, 0, Math.hypot(xb - xa, y1 - y0) + 0.3, 0.75, 0.5, U.shade(hull, 0.04), AT.metal, AT.metal, 3); mb.pop(); });
      tbox(mb, 4.95, 1.25, 0, 1.1, 1.4, 8.4, hull, AT.metal, AT.metal, 3);                // the upper city on the clifftop
      tbox(mb, 5.0, 2.4, -2.6, 0.7, 1.1, 1.0, U.shade(hull, -0.08), AT.metal, AT.metal, 1);
      tbox(mb, 5.0, 2.15, 2.8, 0.8, 0.6, 1.4, U.shade(hull, 0.04), AT.metal, AT.metal, 1);
      [0.95, 1.45].forEach(y => mb.quad([5.506, y, 3.9], [5.506, y, -3.9], [5.506, y + 0.14, -3.9], [5.506, y + 0.14, 3.9], grille));   // window bands on the landward wall
      mb.quad([5.51, 0.8, 0.5], [5.51, 0.8, -0.5], [5.51, 1.85, -0.5], [5.51, 1.85, 0.5], '#b82c24');                                    // the Shinra banner
      // the cannon: turntable and breech on the ramp, the barrel reaching out past the pier
      const cx = 2.3, cy = ys(cx);
      frock(mb, cx, cy - 0.12, 0, 1.05, 0.95, 0.42, 10, bronze, U.shade(bronze, 0.1), AT.metal);
      tbox(mb, cx + 0.2, cy + 0.62, 0, 1.7, 0.66, 1.5, bronze, AT.metal, AT.metal, 2);          // breech housing
      tbox(mb, cx + 0.35, cy + 1.1, 0, 1.1, 0.34, 1.0, U.shade(bronze, 0.08), AT.metal, AT.metal, 1);
      [1, -1].forEach(s => mb.box(cx - 0.1, cy + 0.66, s * 0.765, 0.6, 0.2, 0.03, '#c03028'));      // red Shinra panels
      mb.push(); mb.translate(cx - 0.6, cy + 0.7, 0); mb.rotate(0, 0, Math.PI / 2 - 0.04);
      tprism(mb, 0, 0, 0, 0.34, 0.3, 0.8, 8, U.shade(bronze, -0.06), AT.metal, 1);          // mantlet
      tprism(mb, 0, 0.8, 0, 0.2, 0.15, 6.9, 8, '#a89a70', AT.metal, 2);                     // barrel
      tprism(mb, 0, 7.7, 0, 0.21, 0.21, 0.28, 8, '#8a7c5a', AT.metal, 1);                   // muzzle
      mb.prism(0, 7.98, 0, 0.21, 0.21, 0.001, 8, '#2a2420', false, true, false);
      mb.pop();
    },
    gold_saucer(mb) {
      tprism(mb, 0, 0, 0, 0.6, 0.35, 3.2, 8, '#a08050', AT.metal, 2);
      for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; mb.spike([Math.cos(a) * 0.35, 0.8, Math.sin(a) * 0.35], [Math.cos(a), -1.2, Math.sin(a)], 1.0, 0.18, 5, '#8a6a44'); }   // root buttresses
      mb.sphere(0, 3.6, 0, 1.3, 0.7, 1.3, '#e8c040', 10, 6, true);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mb.sphere(Math.cos(a) * 1.4, 3.4, Math.sin(a) * 1.4, 0.35, 0.25, 0.35, i % 2 ? '#ff6060' : '#60c0ff', 6, 4, true); }
      // the ropeway station at its foot: two wooden sheds beside the tower (Gaia.obj 117.6, 150.3)
      mb.push(); mb.translate(-0.8, 0, 0.85); mb.scale(LS, LS, LS);
      fhouse(mb, -0.3, -0.05, 0.5, 0.36, 0.22, 0.14, '#8e7c64', '#6e5e48', 'gable', 20);
      fhouse(mb, 0.28, 0.42, 0.37, 0.37, 0.22, 0.14, '#8e7c64', '#6e5e48', 'gable', 90);
      mb.pop();
    },
    // Fort Condor: a blue tower on a flared rock base, the golden condor nesting on top (Gaia.obj 198.6,
    // 165.6; the bird is a separate model there, shaped after screenshot 03-marshes11). Our footprint is a
    // steep hill, so it stands at the hill's south foot by the entry, the rock rising behind it as in FF7.
    fort_condor: ref((mb, L) => {
      mb.translate(0, 0, 1.45); hug(mb, L, 0, 0);
      frock(mb, 0, -0.4, 0, 0.69, 0.29, 0.94, 8, '#b48c6c', '#5a5c66', AT.stone);
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3; mb.spike([Math.cos(a) * 0.26, 0.6, Math.sin(a) * 0.26], [Math.cos(a), -1.1, Math.sin(a)], 0.24, 0.05, 4, '#3c6cc0'); }   // roots spilling down
      tprism(mb, 0, 0.54, 0, 0.29, 0.29, 0.44, 6, '#4c84d8', AT.stone, 2);
      tcone(mb, 0, 0.98, 0, 0.3, 0.07, 6, '#6aa2ec', AT.stone);
      const G = '#d4a040', GW = '#b07a30';                                                  // the condor, wings half raised
      mb.sphere(0.02, 1.2, 0, 0.24, 0.17, 0.15, G, 7, 5, true);
      mb.sphere(-0.2, 1.38, 0, 0.08, 0.1, 0.075, U.shade(G, 0.06), 6, 4, true);
      mb.spike([-0.27, 1.4, 0], [-1, -0.35, 0], 0.11, 0.035, 4, '#e8d080');
      mb.spike([0.22, 1.17, 0], [1, -0.25, 0], 0.22, 0.08, 4, GW);
      [1, -1].forEach(s => {
        const A = [-0.06, 1.3, s * 0.12], B = [0.22, 1.26, s * 0.16], C = [0.36, 1.66, s * 0.3], D = [0.04, 1.58, s * 0.24];
        mb.quad(A, B, C, D, GW); mb.quad(D, C, B, A, U.shade(GW, -0.15));
        mb.prism(0.02, 1.02, s * 0.06, 0.018, 0.018, 0.1, 4, '#8a6a30', false);
      });
    }),
    // Temple of the Ancients: a stepped pyramid with a stairway up each side and a small shrine on top
    // (Gaia.obj 166.0, 178.0; screenshot 10-forgottencity02)
    temple_of_ancients: ref((mb) => {
      const C = '#b4a270';
      for (let i = 0; i < 5; i++) { const s = 1.58 - i * 0.255, y0 = i ? i * 0.138 : -0.25, y1 = (i + 1) * 0.138; tbox(mb, 0, (y0 + y1) / 2, 0, s, y1 - y0, s, U.shade(C, i % 2 ? -0.05 : 0.02), AT.stone, AT.stone, 2); }
      for (let k = 0; k < 4; k++) {
        mb.push(); mb.rotate(0, k * Math.PI / 2, 0);
        const sw = 0.12;
        tquad(mb, [-sw, 0, 0.93], [sw, 0, 0.93], [sw, 0.69, 0.28], [-sw, 0.69, 0.28], U.shade(C, -0.12), AT.stone, 1, 5);
        ttri(mb, [sw, 0, 0.93], [sw, 0, 0.28], [sw, 0.69, 0.28], U.shade(C, -0.02), AT.stone);
        ttri(mb, [-sw, 0, 0.28], [-sw, 0, 0.93], [-sw, 0.69, 0.28], U.shade(C, -0.02), AT.stone);
        mb.pop();
      }
      tbox(mb, 0, 0.78, 0, 0.36, 0.18, 0.36, U.shade(C, 0.04), AT.stone, AT.stone, 1);
      tbox(mb, 0, 0.885, 0, 0.44, 0.035, 0.44, U.shade(C, -0.08), AT.stone, AT.stone, 1);
      mb.quad([-0.06, 0.69, 0.185], [0.06, 0.69, 0.185], [0.06, 0.83, 0.185], [-0.06, 0.83, 0.185], DARK);
    }),
    // Kalm: an L-shaped house with a blue roof and a double-gabled one with a green roof round a cobbled
    // square (Gaia.obj 197.0, 109.7)
    kalm: ref((mb) => {
      fdisc(mb, 0.02, 0.12, 0.62, 0.55, '#5a6274', AT.stone, 12);
      const B = '#3c78c8', G = '#4c9c74';
      fhouse(mb, -0.575, -0.105, 0.51, 0.34, 0.16, 0.3, TIMBER, B, 'gable', 43);
      fhouse(mb, -0.335, -0.045, 0.33, 0.23, 0.16, 0.3, TIMBER, B, 'gable', -45);
      fhouse(mb, 0.305, -0.17, 0.36, 0.28, 0.15, 0.3, TIMBER, G, 'gable', 40);
      fhouse(mb, 0.47, 0.04, 0.36, 0.28, 0.15, 0.3, TIMBER, G, 'gable', 40);
    }),
    // Chocobo Farm: an L-shaped farmhouse, a long barn and a pale silo (Gaia.obj 233.7, 134.3; screenshot
    // 03-marshes01)
    chocobo_farm: ref((mb) => {
      const W = '#e6e8d8', R = '#a24c46', S = '#f4ecd0';
      fhouse(mb, -0.53, 0.425, 0.55, 0.34, 0.15, 0.31, W, R, 'gable', 90);
      fhouse(mb, -0.43, 0.265, 0.54, 0.23, 0.16, 0.3, W, R, 'gable');
      fhouse(mb, 0.455, -0.33, 0.74, 0.53, 0.18, 0.17, W, R, 'gambrel', 90);
      tbox(mb, -0.09, 0.2, -0.15, 0.24, 0.5, 0.24, S, AT.stone, null, 1);
      mb.push(); mb.translate(-0.09, 0, -0.15); froof(mb, 'hip', 0.24, 0.24, 0.45, 0.17, S, U.shade(S, -0.04), AT.stone, 0.01); mb.pop();
      mb.quad([-0.12, 0.27, -0.025], [-0.06, 0.27, -0.025], [-0.06, 0.37, -0.025], [-0.12, 0.37, -0.025], '#2a2e3a');
    }),
    // Nibelheim: two pink-roofed timbered houses by a forked dirt path (Gaia.obj 90.4, 133.0; screenshot
    // 08-nibelheim01); FF7's world model shows only the houses, not the mansion
    nibelheim: ref((mb) => {
      const P = '#e48cac';
      fpath(mb, [[0.05, 0.8], [0.05, 0.15], [-0.2, -0.4]], 0.1, '#a88460'); fpath(mb, [[0.05, 0.15], [0.2, -0.55], [0.0, -0.8]], 0.1, '#a88460');
      fhouse(mb, -0.4, 0.09, 0.37, 0.43, 0.16, 0.34, TIMBER, P, 'cross', -29);
      fhouse(mb, 0.505, -0.08, 0.49, 0.4, 0.26, 0.25, TIMBER, P, 'gable', -45);
    }),
    // Costa del Sol: two orange-roofed houses on a sandy square, the pier running out east into the bay
    // (Gaia.obj 137.9, 121.9; screenshot 05-cargo11). Our coast is ~4 tiles east, so the pier is longer.
    costa_del_sol: ref((mb) => {
      const O = '#e07a40', S = '#d8c890', Pr = '#cfc2a0';
      fdisc(mb, -0.2, 0.0, 0.45, 0.4, S, AT.stone, 9);
      fpath(mb, [[-0.2, 0.0], [0.15, 0.3], [0.45, 0.05]], 0.2, S, AT.stone);
      fhouse(mb, -0.17, -0.465, 0.34, 0.5, 0.15, 0.31, TIMBER, O, 'gable', -60);
      fhouse(mb, -0.5625, 0.36, 0.385, 0.51, 0.17, 0.32, TIMBER, O, 'cross', 28);
      tbox(mb, 1.9, -0.22, 0.05, 3.0, 0.6, 0.22, Pr, AT.stone, AT.stone, 3);                       // the pier, a solid mole
      [1, -1].forEach(s => { mb.push(); mb.translate(3.3, 0, 0.05); mb.rotate(0, s * 0.55, 0); tbox(mb, 0.5, -0.22, 0, 1.0, 0.6, 0.2, Pr, AT.stone, AT.stone, 2); mb.pop(); });
    }),
    // North Corel: a shanty of canvas-topped shacks on a rubble patch (Gaia.obj 106.9, 122.4), with the
    // ropeway pylon of the gondola to the Gold Saucer
    north_corel: ref((mb) => {
      fdisc(mb, -0.1, 0.0, 0.85, 0.65, '#8a8478', AT.stone, 9);
      fhouse(mb, -0.6, -0.2, 0.62, 0.48, 0.24, 0.16, '#d0c098', '#dccca4', 'gambrel', -20, AT.wood);
      fhouse(mb, 0.27, 0.22, 0.44, 0.44, 0.24, 0.2, '#d4c49c', '#e0d0a8', 'gable', 40, AT.wood);
      tbox(mb, 0.55, 0.06, -0.35, 0.18, 0.12, 0.14, '#6a5a4a', AT.metal, AT.metal, 1);
      tbox(mb, -0.15, 0.05, 0.45, 0.2, 0.1, 0.12, '#7a6048', AT.metal, AT.metal, 1);
      tprism(mb, 0.72, 0, -0.4, 0.08, 0.04, 0.7, 4, '#6a6a72', AT.metal, 1);
      tbox(mb, 0.72, 0.7, -0.4, 0.3, 0.04, 0.05, '#6a6a72', AT.metal, AT.metal, 1);
      [-0.13, 0.13].forEach(x => mb.prism(0.72 + x, 0.66, -0.43, 0.035, 0.035, 0.02, 6, '#303036', false));
    }),
    // Cosmo Canyon: the observatory tower on a red mesa ledge, two green-roofed huts at its foot
    // (Gaia.obj 85.2, 166.3; screenshot 07-cosmocanyon02)
    cosmo_canyon: ref((mb) => {
      frock(mb, 0.25, -0.1, -0.3, 0.55, 0.47, 0.5, 7, '#b4643c', '#9a6a4a');
      mb.push(); mb.translate(0, 0.4, 0);
      fhouse(mb, 0.22, -0.28, 0.34, 0.34, 0.37, 0.24, '#f09a7c', '#a0a8c8', 'hip', -30, AT.wall);
      mb.push(); mb.translate(0.22, 0.64, -0.28); mb.rotate(0.5, 0.4, 0); mb.prism(0, 0, 0, 0.05, 0.04, 0.16, 6, '#c8ccd8', false); mb.pop();
      mb.pop();
      [[-0.32, 0.12], [0.05, 0.34]].forEach(([x, z]) => { tprism(mb, x, 0, z, 0.13, 0.13, 0.14, 6, '#b89a70', AT.wood, 1); tcone(mb, x, 0.14, z, 0.16, 0.15, 6, '#5cc048', AT.roof); });
    }),
    // Gongaga: the wrecked reactor, a ring of jagged dark shards in an orange crater cleared out of the
    // jungle (Gaia.obj 111.0, 178.4)
    gongaga: ref((mb) => {
      fdisc(mb, 0, 0, 1.15, 1.05, '#c88a58', AT.rock, 7);
      const n = 12, r = 0.5, cx = -0.3, cz = -0.05, M = '#747880', P = (a, rr, y) => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
      fdisc(mb, cx, cz, r, r, '#2e2c30', AT.metal, n, 0.05);
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, h0 = 0.3 + U.hash(i, 3) * 0.3, h1 = 0.3 + U.hash((i + 1) % n, 3) * 0.3;
        const tip = P(a0 + (a1 - a0) * U.hash(i, 6), r - 0.02, Math.max(h0, h1) + 0.08 + U.hash(i, 5) * 0.16);
        tquad(mb, P(a1, r, -0.1), P(a0, r, -0.1), P(a0, r, h0), P(a1, r, h1), M, AT.metal);
        tquad(mb, P(a0, r - 0.04, -0.1), P(a1, r - 0.04, -0.1), P(a1, r - 0.04, h1), P(a0, r - 0.04, h0), U.shade(M, -0.3), AT.metal);
        mb.tri(P(a1, r - 0.02, h1), P(a0, r - 0.02, h0), tip, M); mb.tri(P(a0, r - 0.02, h0), P(a1, r - 0.02, h1), tip, U.shade(M, -0.3));
      }
    }),
    // Rocket Town: two L-shaped timbered houses with brown roofs by a dirt lane (Gaia.obj 81.8, 117.8); the
    // Shinra No. 26 rocket (a separate model in FF7) leans in its gantry behind them
    rocket_town: ref((mb) => {
      const R = '#8a7650';
      fpath(mb, [[0.1, 0.85], [0.05, 0.3], [0.1, -0.2], [-0.05, -0.75]], 0.13, '#a88a64');
      fhouse(mb, -0.47, -0.11, 0.61, 0.39, 0.16, 0.35, TIMBER, R, 'gable', 44);
      fhouse(mb, -0.3, 0.06, 0.3, 0.22, 0.16, 0.24, TIMBER, R, 'gable', -45);
      fhouse(mb, 0.515, 0.125, 0.6, 0.38, 0.17, 0.29, TIMBER, R, 'gable', -45);
      fhouse(mb, 0.34, 0.3, 0.3, 0.22, 0.17, 0.19, TIMBER, R, 'gable', 45);
      mb.push(); mb.translate(0.1, 0, -1.05);
      [-0.24, 0.24].forEach(x => tbox(mb, x, 0.9, 0.05, 0.06, 1.8, 0.06, '#8a3a2a', AT.metal, AT.metal, 1));     // the gantry
      [0.5, 1.1, 1.6].forEach(y => tbox(mb, 0, y, 0.05, 0.54, 0.04, 0.05, '#8a3a2a', AT.metal, AT.metal, 1));
      mb.rotate(-0.16, 0, 0.04);
      tprism(mb, 0, 0, 0, 0.14, 0.14, 1.65, 8, '#e8e8f0', AT.metal, 1); mb.spike([0, 1.65, 0], [0, 1, 0], 0.35, 0.14, 8, '#c03030');
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4, c = Math.cos(a), s = Math.sin(a); mb.tri([c * 0.13, 0, s * 0.13], [c * 0.3, 0, s * 0.3], [c * 0.13, 0.35, s * 0.13], '#c03030'); mb.tri([c * 0.3, 0, s * 0.3], [c * 0.13, 0, s * 0.13], [c * 0.13, 0.35, s * 0.13], '#a02828'); }
      mb.pop();
    }),
    // Wutai: two red-walled houses under dark hip-and-gable roofs on pale stone plots (Gaia.obj 37.0, 86.4)
    wutai: ref((mb) => {
      const Wl = '#b0503c', Rf = '#5a5c6a';
      fdisc(mb, -0.39, -0.04, 0.4, 0.4, '#cfc6ae', AT.stone, 4); fdisc(mb, 0.465, 0.035, 0.38, 0.38, '#cfc6ae', AT.stone, 4);
      fhouse(mb, -0.39, -0.04, 0.43, 0.44, 0.16, 0.28, Wl, Rf, 'pagoda', 45);
      fhouse(mb, 0.465, 0.035, 0.43, 0.45, 0.15, 0.26, Wl, Rf, 'pagoda', -26);
    }),
    // Bone Village: the excavation camp, a giant ribcage arching over the dig and a heap of great bones
    // (Gaia.obj 152.8, 87.2)
    bone_village: ref((mb) => {
      fdisc(mb, 0.1, 0.0, 0.9, 0.65, '#9a8a6a', AT.rock, 9);
      const B = '#eee2c6', n = 5;
      mb.push(); mb.translate(0.42, 0, -0.2); mb.rotate(0, 0.5, 0);
      for (let k = 0; k < n; k++) {                   // the dark hollow under the ribs
        const t0 = k / n * Math.PI, t1 = (k + 1) / n * Math.PI, p = (t, x) => [x, Math.sin(t) * 0.3, Math.cos(t) * 0.2];
        mb.quad(p(t0, -0.34), p(t1, -0.34), p(t1, 0.34), p(t0, 0.34), '#3a3226');
      }
      for (let i = 0; i < 6; i++) {
        const x = -0.3 + i * 0.12, rr = 0.25 - Math.abs(i - 2.5) * 0.015, hh = 0.37 - Math.abs(i - 2.5) * 0.025;
        const p = (t, dx) => [x + dx, Math.sin(t) * hh, Math.cos(t) * rr];
        for (let k = 0; k < n; k++) { const t0 = k / n * Math.PI, t1 = (k + 1) / n * Math.PI; mb.quad(p(t0, -0.035), p(t0, 0.035), p(t1, 0.035), p(t1, -0.035), B); mb.quad(p(t1, -0.035), p(t1, 0.035), p(t0, 0.035), p(t0, -0.035), U.shade(B, -0.2)); }
      }
      mb.box(0, 0.35, 0, 0.8, 0.05, 0.06, B);
      mb.pop();
      mb.push(); mb.translate(-0.43, 0, 0.23); mb.rotate(0, 0.35, 0); froof(mb, 'hip', 0.62, 0.42, -0.02, 0.32, B, '#e2d4b4', AT.rock, 0); mb.pop();   // a heap of great bones
      mb.spike([-0.2, 0.1, 0.4], [0.6, 0.5, 0.3], 0.3, 0.035, 4, B); mb.spike([-0.72, 0.08, 0.1], [-0.5, 0.6, -0.2], 0.26, 0.03, 4, B);
    }),
    // Forgotten Capital: the pale, lumpy shell dome of the Ancients' city in its valley (Gaia.obj 158.4, 79.4)
    forgotten_capital: ref((mb) => {
      mb.sphere(0, -0.06, 0, 0.74, 0.42, 0.66, '#b4dcea', 8, 6, false, (i, j) => U.shade('#b4dcea', (U.hash(i, j, 4) - 0.5) * 0.22), 3);
      mb.sphere(0.12, 0.2, -0.08, 0.36, 0.2, 0.32, '#c4e4f0', 7, 4, false, null, 2);
    }),
    // Icicle Inn: two dark timbered houses under snow-laden cross-gabled roofs (Gaia.obj 126.0, 70.4), set
    // down the slope west of the entry where our hillside is gentler
    icicle_inn: ref((mb, L) => {
      const Wd = '#b48c68', Sn = '#eef2f8';
      [[-1.1, 0.0], [-0.55, 0.75]].forEach(([x, z]) => { mb.push(); hug(mb, L, x, z); fhouse(mb, x, z, 0.47, 0.5, 0.22, 0.3, Wd, Sn, 'cross', -44); mb.pop(); });
    }),
    // Chocobo Sage's house: a timbered house with a green cross-gabled roof on a patch of grass in the snow
    // (Gaia.obj 142.7, 68.7)
    chocobo_sage: ref((mb, L) => {
      mb.push(); hug(mb, L, 0, -0.45);
      fdisc(mb, 0, -0.4, 0.8, 0.6, '#6c9c52', AT.rock, 9);
      fhouse(mb, -0.02, -0.45, 0.6, 0.4, 0.24, 0.37, TIMBER, '#4c9c68', 'cross', 40);
      mb.pop();
    }),
    // Mideel: two wooden stilt houses with low rust-red roofs joined by a stair (Gaia.obj 215.0, 197.0;
    // screenshot 15-cloud04). The dark plinth under the raised floor reads as the open stilt storey.
    mideel: ref((mb) => {
      const Wd = '#b08c64', Rf = '#c0704c';
      mb.push(); mb.rotate(0, 22 * Math.PI / 180, 0);
      mb.push(); mb.translate(0, 0.14, 0);
      fhouse(mb, -0.4, 0, 0.48, 0.48, 0.28, 0.1, Wd, Rf, 'shed');
      fhouse(mb, 0.4, 0, 0.48, 0.48, 0.28, 0.1, Wd, Rf, 'shed');
      mb.pop();
      tbox(mb, 0, 0.15, 0.05, 0.34, 0.03, 0.3, U.shade(Wd, -0.1), AT.wood, AT.wood, 1);          // the walkway between them
      tquad(mb, [-0.06, 0.01, 0.62], [0.06, 0.01, 0.62], [0.06, 0.15, 0.2], [-0.06, 0.15, 0.2], U.shade(Wd, -0.05), AT.wood, 1, 3);   // and the stair down to the ground
      mb.pop();
    }),
    // the weapon seller's house: a single timbered house with a steep blue cross-gabled roof (Gaia.obj 126.2, 169.2)
    weapon_seller: ref((mb) => { fhouse(mb, 0, 0, 0.5, 0.48, 0.22, 0.36, TIMBER, '#4a7ad0', 'cross'); }),
    // Corel Prison: a walled junkyard in the desert (FF7's world map shows only the desert here, so it is
    // shaped after the prison's field art): broken walls, scrap shacks, a watchtower, the old dome
    corel_prison: ref((mb) => {
      fdisc(mb, 0, 0, 0.85, 0.8, '#9a8870', AT.rock, 8);
      for (let i = 0; i < 10; i++) {
        if (i === 2 || i === 7) continue;
        const a = (i + 0.5) / 10 * Math.PI * 2, len = 1.6 * Math.sin(Math.PI / 10), hh = 0.14 + U.hash(i, 7) * 0.08;
        mb.push(); mb.translate(Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8); mb.rotate(0, Math.PI / 2 - a, 0); tbox(mb, 0, hh / 2 - 0.05, 0, len, hh + 0.1, 0.06, '#b8a080', AT.stone, AT.stone, 1); mb.pop();
      }
      mb.sphere(0.15, -0.05, -0.2, 0.36, 0.34, 0.36, '#8a8c90', 8, 6, false, null, 3);
      mb.quad([0.09, 0, 0.152], [0.21, 0, 0.152], [0.21, 0.13, 0.108], [0.09, 0.13, 0.108], DARK);
      fhouse(mb, -0.4, 0.25, 0.3, 0.24, 0.16, 0.08, '#8a6a50', '#7a7068', 'shed', 20, AT.metal);
      fhouse(mb, 0.42, 0.35, 0.26, 0.22, 0.15, 0.07, '#7a6a5a', '#6a6660', 'shed', -30, AT.metal);
      tprism(mb, -0.55, -0.05, -0.45, 0.07, 0.06, 0.6, 4, '#6a5a48', AT.wood, 1);
      tbox(mb, -0.55, 0.57, -0.45, 0.2, 0.04, 0.2, '#6a5a48', AT.wood, AT.wood, 1);
      tcone(mb, -0.55, 0.59, -0.45, 0.14, 0.1, 4, '#5a4e40', AT.roof);
    }),
    // caves: a mouth in a rock outcrop, coloured after each one's rock on FF7's map (the mines Gaia.obj
    // 209.0, 150.1 / 204.7, 153.5; materia caves 113.5, 106.4 / 52.4, 125.3 / 267.8, 136.8; Knights of
    // the Round 257.5, 12.9; Corral Valley 154.5, 69.8). Mt. Corel, Mt. Nibel and Lucrecia's cave have no
    // cave model on FF7's map, so they get the local rock (Corel's railway, Nibel's spires, the waterfall).
    mythril_mine_e: ref((mb) => fcave(mb, { col: '#6c8c80', rim: '#3c5a52', r: 0.66, h: 0.8, mw: 0.16, mh: 0.32 })),
    mythril_mine_w: ref((mb) => fcave(mb, { col: '#6c8c80', rim: '#3c5a52', r: 0.66, h: 0.88, mw: 0.16, mh: 0.32, spires: [[0.55, -0.42, 0.9]] })),
    mt_corel: ref((mb) => fcave(mb, { col: '#8c6c50', h: 0.86, rails: true })),
    mt_nibel_e: ref((mb) => fcave(mb, { col: '#66786e', h: 0.9, spires: [[-0.55, -0.36, 1.2], [0.5, -0.42, 1.0]] })),
    mt_nibel_w: ref((mb) => fcave(mb, { col: '#66786e', h: 0.86, spires: [[0.55, -0.36, 1.1], [-0.38, -0.55, 0.9]] })),
    lucrecia_cave: ref((mb) => fcave(mb, { col: '#7c7a70', r: 0.66, h: 0.95, mw: 0.2, mh: 0.42, fall: true })),
    materia_cave_n: ref((mb) => fcave(mb, { col: '#b09a70', rim: '#4a9a8c' })),
    materia_cave_w: ref((mb) => fcave(mb, { col: '#a89468', rim: '#4a9a8c', h: 0.84 })),
    materia_cave_e: ref((mb) => fcave(mb, { col: '#a08c68', rim: '#4a9a8c', r: 0.44, h: 1.2, mw: 0.14, mh: 0.3 })),
    corral_valley: ref((mb) => fcave(mb, { col: '#7c8690', rim: '#4a8a88', snow: true })),
    corral_valley_n: ref((mb) => fcave(mb, { col: '#7c8690', rim: '#4a8a88', snow: true, h: 0.88 })),
    knights_of_round: ref((mb) => fcave(mb, { col: '#a89868', rim: '#4a9a8c', r: 0.66, h: 0.86 })),
    // forests: FF7 paints them into the terrain texture; here each is its own stand of trees
    ancient_forest(mb, L) { grove(mb, L, 14, { col: '#2c6a4a', jungle: true, s0: 1.6, s1: 2.4 }); },
    sleeping_forest(mb, L) { grove(mb, L, 44, { col: '#3a6c62', s0: 1.1, s1: 1.6, on: 'fgh' }); },
    sleeping_forest_n(mb, L) { grove(mb, L, 10, { col: '#3a6c62', s0: 1.1, s1: 1.5, r: 1.2 }); },
    goblin_island(mb, L) { grove(mb, L, 15, { col: '#3a8032', jungle: true, s0: 1.2, s1: 1.8 }); },
    // Da-chao: the rock pillars above Wutai, the god's face carved into the tallest one (FF7's map has only
    // the rock mesas, Gaia.obj 36.4, 81.0; the face follows the Da-chao field art)
    da_chao: ref((mb) => {
      const Rk = '#a07a5a', Gr = '#6a8a4a';
      frock(mb, 0.95, -0.1, -0.6, 0.45, 0.32, 0.8, 6, U.shade(Rk, -0.05), Gr);
      frock(mb, -1.0, -0.1, 0.3, 0.38, 0.26, 0.65, 6, U.shade(Rk, 0.04), Gr);
      tbox(mb, 0, 0.65, 0, 0.7, 1.5, 0.6, Rk, AT.rock, AT.rock, 2, Gr);
      mb.box(0, 1.02, 0.32, 0.5, 0.06, 0.05, U.shade(Rk, 0.1));
      [-0.13, 0.13].forEach(x => mb.quad([x - 0.07, 0.88, 0.305], [x + 0.07, 0.88, 0.305], [x + 0.07, 0.96, 0.305], [x - 0.07, 0.96, 0.305], '#2a1e16'));
      mb.box(0, 0.76, 0.33, 0.08, 0.18, 0.06, U.shade(Rk, 0.06));
      mb.quad([-0.14, 0.55, 0.305], [0.14, 0.55, 0.305], [0.14, 0.6, 0.305], [-0.14, 0.6, 0.305], '#2a1e16');
    }),
    // Northern Crater: the steep, streaked inner wall of the crater (Gaia.obj 128.0, 36.2), standing just
    // inside the ring of peaks our terrain raises round its floor (tiles, not LS: it spans the footprint)
    northern_crater(mb) {
      const n = 20, r = 5.3, P = (a, rr, y) => [Math.cos(a) * rr, y, Math.sin(a) * rr];
      for (let i = 0; i < n; i++) {
        const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2, r0 = r + (U.hash(i, 21) - 0.5) * 0.5, r1 = r + (U.hash((i + 1) % n, 21) - 0.5) * 0.5;
        tquad(mb, P(a0, r0, -0.3), P(a1, r1, -0.3), P(a1, r1 + 0.4, 2.4), P(a0, r0 + 0.4, 2.4), U.shade('#b8c4d4', (U.hash(i, 22) - 0.5) * 0.14), AT.rock, 1, 2);
      }
    },
    // the sunken Gelnika: Shinra's cargo plane lying broken on the sea floor (tiles; seen from the submarine)
    gelnika(mb) {
      const M = '#6e747c', Rs = '#7a5a48';
      mb.push(); mb.translate(0, 0.22, 0); mb.rotate(0, 0.5, 0.06);
      mb.push(); mb.rotate(0, 0, Math.PI / 2); tprism(mb, 0, -1.4, 0, 0.3, 0.3, 2.6, 8, M, AT.metal, 2); mb.pop();
      mb.spike([-1.2, 0, 0], [-1, 0, 0], 0.5, 0.3, 8, M);
      mb.spike([1.4, 0.03, 0], [1, 0.22, 0], 0.75, 0.3, 8, U.shade(M, -0.06));
      tbox(mb, 1.85, 0.42, 0, 0.45, 0.6, 0.05, U.shade(M, 0.04), AT.metal, AT.metal, 1);
      tbox(mb, -0.1, 0.18, 0.95, 0.75, 0.05, 1.35, M, AT.metal, AT.metal, 2);                   // the left wing
      mb.push(); mb.translate(-0.15, -0.15, -1.3); mb.rotate(0.35, 0.3, 0); tbox(mb, 0, 0, 0, 0.7, 0.05, 1.1, Rs, AT.metal, AT.metal, 2); mb.pop();   // the right one, snapped off
      [[-0.2, 0.7], [-0.2, 1.2]].forEach(([x, z]) => { mb.push(); mb.translate(x - 0.25, 0.08, z); mb.rotate(0, 0, Math.PI / 2); tprism(mb, 0, 0, 0, 0.1, 0.09, 0.5, 6, U.shade(M, -0.12), AT.metal, 1); mb.pop(); });
      tbox(mb, 0.4, 0.29, 0.02, 0.5, 0.04, 0.4, Rs, AT.metal, AT.metal, 1);
      mb.pop();
    },
  };
  const ICON = {
    town(mb) { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.4; house(mb, Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0.26, 0.24, 0.2, U.shade('#a89070', (U.hash(i, 5) - 0.5) * 0.2), i % 2 ? '#6a3a2a' : '#4a4a5a'); } },
    village(mb) { for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; house(mb, Math.cos(a) * 0.25, Math.sin(a) * 0.25, 0.24, 0.22, 0.18, '#9a8060', '#6a5030'); } },
    city(mb, L) { mb.box(0, 0.4, 0, L.w * 0.8, 0.8, L.h * 0.8, '#50505a'); },
    ranch(mb) {   // FF7's Chocobo Farm: two white houses with red-brown roofs and a stone silo
      house(mb, -0.28, 0.1, 0.34, 0.24, 0.2, '#d8d4c4', '#8a3a30'); house(mb, 0.26, 0.26, 0.38, 0.24, 0.2, '#d8d4c4', '#8a3a30');
      tprism(mb, 0.02, 0, -0.12, 0.09, 0.09, 0.42, 6, '#d0c8b0', AT.stone, 1); mb.spike([0.02, 0.42, -0.12], [0, 1, 0], 0.12, 0.09, 6, '#b0a890');
    },
    cave(mb) {   // rocky outcrop with a dark mouth facing the viewer (+z), like the mine entrances on FF7's map
      tcone(mb, 0, 0, -0.05, 0.42, 0.4, 7, '#9a8a70', AT.rock);
      tcone(mb, 0.26, 0, 0.1, 0.17, 0.2, 5, '#8a7a62', AT.rock); tcone(mb, -0.27, 0, 0.08, 0.15, 0.17, 5, '#928268', AT.rock);
      const n = 8, r = 0.16, z0 = 0.37, k = 0.4 / Math.hypot(0.4, 0.42);
      const arc = (t, rr) => [Math.cos(t) * rr, Math.sin(t) * rr * k, z0 - Math.sin(t) * rr * k * (0.42 / 0.4) + 0.02];
      for (let i = 0; i < n; i++) {
        const t0 = i / n * Math.PI, t1 = (i + 1) / n * Math.PI;
        mb.tri(arc(t0, 0.001), arc(t0, r), arc(t1, r), '#0c0a08');                       // the opening
        mb.quad(arc(t0, r), arc(t0, r + 0.035), arc(t1, r + 0.035), arc(t1, r), '#5a4c3c'); // rim
      }
    },
    tower(mb) { tprism(mb, 0, 0, 0, 0.3, 0.2, 1.4, 6, '#9a8a78', AT.stone, 2); mb.spike([0, 1.4, 0], [0, 1, 0], 0.25, 0.2, 6, '#7a6a58'); },
    temple(mb) { for (let i = 0; i < 4; i++) tbox(mb, 0, 0.2 + i * 0.4, 0, 1.6 - i * 0.35, 0.4, 1.2 - i * 0.25, '#b0a070', AT.stone, AT.stone, 2); },
    house(mb) { house(mb, 0, 0, 0.3, 0.28, 0.2, '#a08870', '#5a3a2a'); },
    shrine(mb) { tbox(mb, 0, 0.4, 0, 0.6, 0.8, 0.6, '#a89878', AT.stone, AT.stone, 1); },
    forest(mb, L) { const n = Math.min(28, L.w * L.h); for (let i = 0; i < n; i++) { const x = (U.hash(i, 1) - 0.5) * L.w * 0.4, z = (U.hash(i, 2) - 0.5) * L.h * 0.4; tree(mb, x, 0, z, 1.3 + U.hash(i, 3) * 0.5, false, U.shade('#2a5a24', (U.hash(i, 4) - 0.5) * 0.2)); } },
    crater() {},
  };
  function landmark(L) {
    if (lmCache[L.id]) return lmCache[L.id];
    const mb = new FF7.MeshBuilder();
    const fn = LANDMARK[L.id] || ICON[L.icon] || ICON.house;
    const k = LANDMARK[L.id] ? 1 : 2.4;          // generic icons were too small next to Cloud
    mb.push(); mb.scale(k, k, k); fn(mb, L); mb.pop();
    const tex = atlas();
    return (lmCache[L.id] = mb.P.length ? mb.build(tex ? { tex } : {}) : null);
  }

  // ---------------------------------------------------------------- vehicles
  const vehCache = {};
  function fallbackVehicle(id) {
    const mb = new FF7.MeshBuilder();
    if (id === 'buggy') { mb.box(0, 0.16, 0, 0.3, 0.12, 0.5, '#c0a040'); [[-0.17, -0.16], [0.17, -0.16], [-0.17, 0.16], [0.17, 0.16]].forEach(([x, z]) => mb.prism(x, 0.02, z, 0.08, 0.08, 0.07, 6, '#202020')); mb.box(0, 0.3, -0.05, 0.28, 0.02, 0.02, '#303030'); }
    else if (id === 'bronco') { mb.box(0, 0.08, 0, 0.18, 0.12, 0.7, '#c03030'); mb.box(0, 0.14, 0.05, 0.9, 0.03, 0.18, '#e0e0e0'); mb.box(0, 0.1, -0.33, 0.3, 0.02, 0.1, '#e0e0e0'); mb.prism(0, 0.08, 0.37, 0.05, 0.03, 0.05, 6, '#303030'); }
    else if (id === 'highwind') {
      mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -1.3, 0, 0.35, 0.3, 2.6, 8, '#6a6a74', false); mb.pop();
      mb.spike([0, 0, 1.3], [0, 0, 1], 0.5, 0.25, 8, '#8a8a90');
      [1, -1].forEach(s => { mb.box(s * 0.6, 0, -0.1, 0.9, 0.05, 0.5, '#5a5a64'); mb.push(); mb.translate(s * 0.95, 0, 0.1); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, 0, 0, 0.12, 0.12, 0.5, 6, '#4a4a54', false); mb.pop(); });
      mb.box(0, 0.35, -1.1, 0.04, 0.5, 0.4, '#7a2a2a'); mb.box(0, 0.05, -1.15, 0.8, 0.04, 0.3, '#5a5a64');
    }
    else if (id === 'submarine') { mb.push(); mb.rotate(Math.PI / 2, 0, 0); mb.prism(0, -0.5, 0, 0.13, 0.13, 1.0, 8, '#60606a', true); mb.pop(); mb.box(0, 0.18, 0.05, 0.08, 0.18, 0.25, '#50505a'); }
    else { mb.box(0, 0.2, 0, 0.3, 0.3, 0.5, '#888'); }
    return { mesh: mb.build() };
  }
  function vehicleModel(id, color) {
    const key = id + (color || '');
    if (vehCache[key]) return vehCache[key];
    let v = null;
    const map3d = { bronco: 'bronco', submarine: 'submarine_gray' };   // 'bronco' = the damaged boat version
    if (id === 'chocobo') v = { model: FF7.chars3d.build(color && color !== 'yellow' ? 'chocobo_' + color : 'chocobo', { style: 'field' }) };
    else if (FF7.vehicles3d && FF7.vehicles3d.has && FF7.vehicles3d.has(map3d[id] || id)) { try { v = { model: FF7.vehicles3d.build(map3d[id] || id, { style: 'world' }) }; } catch (e) { console.error(e); } }
    if (!v || (!v.model && !v.mesh)) v = fallbackVehicle(id);
    if (v.model && (!FF7.chars3d.PRESETS['chocobo_' + color] && id === 'chocobo' && color && color !== 'yellow')) v.tint = { blue: [0.5, 0.7, 1.2, 1], green: [0.5, 1.1, 0.5, 1], black: [0.3, 0.3, 0.35, 1], gold: [1.3, 1.1, 0.4, 1] }[color];
    return (vehCache[key] = v);
  }
  // vehicle models are built at character scale (Cloud ~0.93); the world draws Cloud at 0.55
  const VSCALE = { buggy: 0.55, bronco: 0.5, highwind: 0.75, submarine: 0.5, chocobo: 0.5 };
  // world-map length (longest horizontal side, in tiles) per vehicle, as they look next to Cloud in FF7;
  // used when the model reports its size, so model-scale changes don't blow vehicles up on the map
  const VLEN = { buggy: 1.05, bronco: 1.7, highwind: 4.4, submarine: 1.5 };
  const vscale = (id, m) => (VLEN[id] && m && m.size) ? VLEN[id] / Math.max(m.size[0], m.size[2]) : VSCALE[id] || 1;
  // map features that aren't enterable locations but should be drawn (icon types from ICON)
  const EXTRA_MARKS = [{ id: 'sleeping_man_cave', icon: 'cave', x: 263, y: 187, w: 1, h: 1 }];
  const weaponCache = {};
  function weaponModel(id) {
    if (weaponCache[id] !== undefined) return weaponCache[id];
    const e = FF7.data.enemies[id];
    let m = null; try { m = e ? FF7.creatures.build(e.look, id) : null; if (m) m.play(m.anims && m.anims.e_idle ? m.anims.e_idle : 'e_idle', { loop: true }); } catch (err) { m = null; }
    return (weaponCache[id] = m);
  }

  // ---------------------------------------------------------------- the scene
  class WorldScene {
    constructor() {
      init();
      this.isWorld = true;
      this.t = 0;
      this.px = 0; this.pz = 0; this.py = 0; this.angle = 0;
      this.camYaw = 0; this.camYawT = 0;
      this.vehicle = null;                 // null = on foot
      this.dived = false;
      this.danger = 0; this.dangerLimit = 24;
      this.script = null; this.parallel = []; this.queue = [];
      this.graceLoc = null; this.lastTile = null;
      this.minimap = 1;                    // 0 off, 1 small, 2 large
      this.transitioning = false;
      this.actors = {}; this.emotes = []; this.map = { id: 'world', name: 'World Map', camera: {} };
      this.cam = { x: 0, y: 0, z: 0, dist: 7, pitch: 24, yaw: 0 };
      this.api = new F.ScriptAPI(this);
      const self = this;
      this.player = { app: null, model: null, isPlayer: true, headPos() { return [self.px, self.py + 1.2, self.pz]; } };
      this.walkPhase = 0; this.moving = false;
    }
    get busy() { return !!(this.script && !this.script.done) || this.transitioning; }

    start(x, y, vehicle, fromLoc) {
      const st = FF7.state;
      this.px = x + 0.5; this.pz = y + 0.5;
      this.vehicle = vehicle || null;
      if (this.vehicle && this.vehicle !== 'chocobo') st.world.vehicles[this.vehicle] = { x, y };
      if (fromLoc) this.graceLoc = fromLoc.id;
      else { const L = entryAt[mod(x, W) + ',' + mod(y, H)]; if (L) this.graceLoc = L.id; }
      this.lastTile = this.tileKey();
      this.refreshPlayer();
      this.py = this.surfaceY(this.px, this.pz);
      this.danger = 0; this.dangerLimit = 20 + Math.random() * 24;
      this.saveLoc();
      this.playMusic();
      st.locName = 'World Map';
    }
    refreshPlayer() {
      const lead = FF7.sys.party.leader();
      const id = lead ? lead.id : 'cloud';
      if (this.player.app !== id || !this.player.model) { this.player.app = id; this.player.model = FF7.chars3d.build(id, { style: 'field' }); }
    }
    playMusic() {
      const st = FF7.state;
      let m = 'worldmap';
      if (this.vehicle === 'highwind') m = 'highwind';
      else if (this.vehicle === 'chocobo') m = 'electric_chocobo';
      else if (this.vehicle === 'submarine' && this.dived) m = 'deepsea';
      if (FF7.audio.currentId !== m) FF7.audio.play(m);
    }
    saveLoc() {
      const st = FF7.state;
      st.loc = { mode: 'world', x: Math.floor(mod(this.px, W)), y: Math.floor(mod(this.pz, H)), dir: 'down' };
      st.world.x = st.loc.x; st.world.y = st.loc.y; st.world.vehicle = this.vehicle;
      if (this.vehicle === 'chocobo') st.world.chocoboColor = st.vars.chocobo_color || 'yellow';
    }
    tileKey() { return Math.floor(mod(this.px, W)) + ',' + Math.floor(mod(this.pz, H)); }
    tile() { return at(Math.floor(this.px), Math.floor(this.pz)); }
    surfaceY(px, pz) {
      const c = at(Math.floor(px), Math.floor(pz)), T = TER[c] || TER.g;
      if (this.vehicle === 'highwind') return Math.max(groundH(px, pz), WL) + 3.2;
      if (this.vehicle === 'submarine') return this.dived ? WL - 0.6 : WL;
      if (this.vehicle === 'bronco' && T.water) return WL + 0.02;
      if (this.vehicle === 'chocobo' && T.water) return WL - 0.05;
      return Math.max(groundH(px, pz), T.water ? WL - 0.1 : -9);
    }

    // which tiles can the current mode stand on?
    canEnter(x, y) {
      const c = at(x, y), v = this.vehicle;
      const isEntry = !!entryAt[mod(x, W) + ',' + mod(y, H)];
      if (v === 'highwind') return true;
      // the submarine sails the shallows too while surfaced (FF7), and dives only in deep water: the shelves of
      // shallow sea cut the deep ocean into basins, and the one it starts in off Junon reaches nothing else
      if (v === 'submarine') return c === 'O' || c === 'R' || (c === 'o' && !this.dived);
      if (v === 'bronco') return c === 'o' || c === 'r';
      if (v === 'buggy') return D.buggy.includes(c) || isEntry;
      if (v === 'chocobo') {
        const col = FF7.state.vars.chocobo_color || 'yellow';
        let ok = D.walk.includes(c) || isEntry;
        if (['blue', 'black', 'gold'].includes(col)) ok = ok || c === 'r' || c === 'o';
        if (['green', 'black', 'gold'].includes(col)) ok = ok || c === 'm' || c === 'h';
        if (col === 'gold') ok = ok || c === 'O' || c === 'R';
        return ok;
      }
      return D.walk.includes(c) || isEntry;
    }

    // ------------------------------------------------ update
    enter() {}
    resume() { this.refreshPlayer(); this.playMusic(); }
    update(canInput) {
      this.t++;
      const I = FF7.input;
      if (!this.script || this.script.done) {
        this.script = null;
        if (this.queue.length && !this.transitioning) { const q = this.queue.shift(); this.runScript(q.fn, { name: q.name }); }
      }
      if (this.script) this.script.update();
      this.parallel = this.parallel.filter(co => co.update());
      if (FF7.sceneMgr.top() !== this) return;           // a field/battle took over from a script
      // camera yaw (L1/R1 rotate; FF7's world camera)
      if (!this.busy && canInput) {
        if (I.held('l1')) this.camYawT -= 2.2;
        if (I.held('r1')) this.camYawT += 2.2;
      }
      this.camYaw += (this.camYawT - this.camYaw) * 0.2;
      this.moving = false;
      if (!this.busy && canInput && !this.transitioning) {
        if (I.pressed('menu')) { FF7.audio.sfx('confirm'); this.saveLoc(); FF7.ui.openMainMenu(); return; }
        if (I.pressed('select')) { this.minimap = (this.minimap + 1) % 3; FF7.audio.sfx('cursor'); }
        if (I.pressed('ok') && this.actionOk()) return;
        if (I.pressed('square') && this.actionSquare()) return;
        if (I.pressed('cancel') && this.vehicle === 'chocobo') { this.dismount(); return; }
        this.move(I);
      }
      // animation
      const m = this.player.model;
      if (m && !this.vehicle) {
        const want = this.moving ? 'run' : 'idle';
        if (this._anim !== want) { this._anim = want; m.play(m.anims && m.anims[want] ? m.anims[want] : want); }
        m.update(1);
      }
      const vm = this.vehicle && vehicleModel(this.vehicle, FF7.state.vars.chocobo_color);
      if (vm && vm.model) { const want = this.moving ? (this.vehicle === 'chocobo' ? 'run' : 'move') : 'idle'; if (vm._anim !== want) { vm._anim = want; vm.model.play(vm.model.anims && vm.model.anims[want] ? vm.model.anims[want] : want); } vm.model.update(1); }
      // location entry / hooks on tile change
      const key = this.tileKey();
      if (key !== this.lastTile) {
        this.lastTile = key;
        this.saveLoc();
        const L = entryAt[key];
        if (this.graceLoc && (!L || L.id !== this.graceLoc)) this.graceLoc = null;
        if (!this.busy && L && L.id !== this.graceLoc) { this.enterLocation(L); return; }
        if (!this.busy) this.runHooks(WM.stepHooks);
      }
      FF7.state.loc.mode = 'world';
    }

    move(I) {
      const d = I.dir();
      const v = this.vehicle;
      const sp = SPEED[v || 'foot'] * (v === 'submarine' && this.dived ? 0.8 : 1);
      if (v === 'highwind') {
        // airship: left/right turn, up = forward, down = slow reverse; the camera follows behind
        if (d.x) this.angle -= d.x * 0.045;
        this.camYawT = (Math.PI - this.angle) * 180 / Math.PI;
        const f = d.y < 0 ? 1 : d.y > 0 ? -0.35 : 0;
        if (f) { this.px += Math.sin(this.angle) * sp * f; this.pz += Math.cos(this.angle) * sp * f; this.moving = true; this.wrap(); }
        this.py += (this.surfaceY(this.px, this.pz) - this.py) * 0.1;
        return;
      }
      if (!d.x && !d.y) return;
      const yaw = this.camYaw * Math.PI / 180;
      let mx = d.x, mz = d.y; const l = Math.hypot(mx, mz); mx /= l; mz /= l;
      const rx = mx * Math.cos(yaw) - mz * Math.sin(yaw), rz = mx * Math.sin(yaw) + mz * Math.cos(yaw);
      const target = Math.atan2(rx, rz);
      let da = target - this.angle; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      this.angle += da * 0.35;
      const nx = this.px + rx * sp, nz = this.pz + rz * sp;
      let moved = 0;
      if (this.canEnter(Math.floor(nx), Math.floor(this.pz))) { moved += Math.abs(nx - this.px); this.px = nx; }
      if (this.canEnter(Math.floor(this.px), Math.floor(nz))) { moved += Math.abs(nz - this.pz); this.pz = nz; }
      if (moved > 0) {
        this.moving = true; this.wrap();
        this.py = this.surfaceY(this.px, this.pz);
        FF7.state.steps++;
        if (!v || v === 'buggy') this.stepEncounter(moved);
      }
    }
    wrap() {
      if (this.px < 0) this.px += W; if (this.px >= W) this.px -= W;
      if (this.pz < 0) this.pz += H; if (this.pz >= H) this.pz -= H;
    }

    // OK: board / land / disembark
    actionOk() {
      const st = FF7.state;
      if (!this.vehicle) {
        // board a parked vehicle next to the player
        for (const id in st.world.vehicles) {
          const p = st.world.vehicles[id]; if (!p) continue;
          const dx = this.wrapD(p.x + 0.5 - this.px, W), dz = this.wrapD(p.y + 0.5 - this.pz, H);
          if (Math.hypot(dx, dz) > (id === 'highwind' ? 2.2 : 1.3)) continue;
          if (id === 'buggy' && st.flags.c6b_buggy_broken) { this.say(null, "The buggy's broken down. It won't budge."); return true; }
          this.vehicle = id; this.px = p.x + 0.5; this.pz = p.y + 0.5; this.py = this.surfaceY(this.px, this.pz);
          this.graceLoc = (entryAt[this.tileKey()] || {}).id || null;   // parked on a location's tile: don't walk straight back in
          if (id === 'highwind') this.angle = Math.PI - this.camYaw * Math.PI / 180;
          FF7.audio.sfx(id === 'highwind' ? 'helicopter' : 'confirm'); this.playMusic(); this.saveLoc();
          return true;
        }
        return false;
      }
      if (this.vehicle === 'highwind') {
        const c = this.tile();
        if (!LANDABLE.includes(c)) { FF7.audio.sfx('error'); return true; }
        const tx = Math.floor(this.px), ty = Math.floor(this.pz);
        st.world.vehicles.highwind = { x: mod(tx, W), y: mod(ty, H) };
        const spot = this.findLand(tx, ty, true) || [tx, ty];
        this.vehicle = null; this.px = spot[0] + 0.5; this.pz = spot[1] + 0.5;
        if (st.world.chocoboAboard) { st.vars.chocobo_color = st.world.chocoboAboard; st.world.chocoboAboard = null; this.vehicle = 'chocobo'; }   // the chocobo that flew along
        this.py = this.surfaceY(this.px, this.pz);
        this.graceLoc = (entryAt[this.tileKey()] || {}).id || null;
        FF7.audio.sfx('confirm'); this.playMusic(); this.saveLoc();
        return true;
      }
      if (this.vehicle === 'chocobo') {
        // FF7: a chocobo can be ridden into the parked Highwind; it flies along and you land in the saddle
        const hw = st.world.vehicles.highwind;
        if (hw && Math.hypot(this.wrapD(hw.x + 0.5 - this.px, W), this.wrapD(hw.y + 0.5 - this.pz, H)) <= 2.2) {
          st.world.chocoboAboard = st.vars.chocobo_color || 'yellow';
          this.vehicle = 'highwind'; this.px = hw.x + 0.5; this.pz = hw.y + 0.5; this.py = this.surfaceY(this.px, this.pz);
          this.angle = Math.PI - this.camYaw * Math.PI / 180;
          FF7.audio.sfx('helicopter'); this.playMusic(); this.saveLoc();
          return true;
        }
        this.dismount(); return true;
      }
      // ground/water vehicles: step off onto adjacent walkable land
      const tx = Math.floor(this.px), ty = Math.floor(this.pz);
      const spot = (this.vehicle === 'buggy') ? [tx, ty] : this.findLand(tx, ty, false);
      if (!spot) { FF7.audio.sfx('error'); return true; }
      if (this.vehicle === 'submarine' && this.dived) { this.dived = false; }
      st.world.vehicles[this.vehicle] = { x: mod(tx, W), y: mod(ty, H) };
      this.vehicle = null; this.px = spot[0] + 0.5; this.pz = spot[1] + 0.5; this.py = this.surfaceY(this.px, this.pz);
      this.graceLoc = (entryAt[this.tileKey()] || {}).id || null;
      FF7.audio.sfx('confirm'); this.playMusic(); this.saveLoc();
      return true;
    }
    // Square: airship/submarine interior (Highwind) or dive (submarine)
    actionSquare() {
      if (this.vehicle === 'submarine') { if (!this.dived && this.tile() === 'o') { FF7.audio.sfx('error'); return true; } this.dived = !this.dived; this.py = this.surfaceY(this.px, this.pz); FF7.audio.sfx('confirm'); this.playMusic(); return true; }
      if (this.vehicle) {
        const link = WM.linkFor(this.vehicle + '_interior', this.api);
        if (link) { this.saveLoc(); this.useLink(link, null); return true; }
      }
      return false;
    }
    dismount() {
      // FF7: the chocobo runs off when you get down (this also ends Billy's marsh rental)
      this.vehicle = null; this.py = this.surfaceY(this.px, this.pz);
      delete FF7.state.flags.c5b_marsh_chocobo;
      if (!this.canEnter(Math.floor(this.px), Math.floor(this.pz))) { const s = this.findLand(Math.floor(this.px), Math.floor(this.pz), false); if (s) { this.px = s[0] + 0.5; this.pz = s[1] + 0.5; this.py = this.surfaceY(this.px, this.pz); } }
      FF7.audio.sfx('chocobo'); this.playMusic(); this.saveLoc();
    }
    findLand(tx, ty, incl) {
      const D8 = incl ? [[0, 0]] : [];
      D8.push([0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]);
      for (const [dx, dy] of D8) { const c = at(tx + dx, ty + dy); if (D.walk.includes(c) || entryAt[mod(tx + dx, W) + ',' + mod(ty + dy, H)]) return [tx + dx, ty + dy]; }
      return null;
    }
    wrapD(d, n) { while (d > n / 2) d -= n; while (d < -n / 2) d += n; return d; }

    // ------------------------------------------------ locations / scripts
    enterLocation(L) {
      const st = FF7.state;
      if (this.vehicle === 'highwind' || (this.vehicle === 'submarine' && this.dived && L.id !== 'gelnika')) return;
      const link = WM.linkFor(L.id, this.api);
      if (!link) return;
      // park the vehicle on the tile we came from, enter on foot
      if (this.vehicle && this.vehicle !== 'chocobo' && this.vehicle !== 'submarine') {
        const [lx, ly] = this.lastSafe || [Math.floor(this.px), Math.floor(this.pz)];
        st.world.vehicles[this.vehicle] = { x: mod(lx, W), y: mod(ly, H) };
      }
      if (this.vehicle === 'chocobo') { st.world.chocoboWaiting = L.id; this.vehicle = null; }
      else if (this.vehicle !== 'submarine') this.vehicle = null;
      this.saveLoc();
      st.world.lastLoc = L.id;
      this.useLink(link, L);
    }
    useLink(link, L) {
      if (link.run) { this.runScript(link.run, { name: 'world-link ' + (L ? L.id : '') }); return; }
      if (link.map) this.goto(link.map, link.entry);
    }
    runScript(fn, opts = {}) {
      const co = new FF7.Coroutine(fn(this.api), { name: opts.name || 'world-script' });
      if (opts.parallel) { this.parallel.push(co); return co; }
      if (this.script && !this.script.done) { this.queue.push({ fn, name: opts.name }); return null; }
      this.script = co; return co;
    }
    // leave the world for a field map; a running world script continues in the field
    goto(mapId, entry, opts = {}) {
      const self = this, w = { done: false };
      if (!FF7.maps[mapId]) { console.error('world goto: unknown map', mapId); w.done = true; return w; }
      this.transitioning = true;
      const S = FF7.sceneMgr;
      this.parallel.push(new FF7.Coroutine((function* () {
        yield S.fadeOut(opts.fade || 16);
        const fs = F.start(mapId, entry);
        self.api.field = fs;
        if (self.script && !self.script.done) { fs.script = self.script; self.script = null; }
        fs.parallel.push(new FF7.Coroutine((function* () { yield S.fadeIn(opts.fade || 16); w.done = true; })()));
        self.transitioning = false;
      })()));
      return w;
    }
    say(who, text) { this.runScript(function* (s) { yield s.say(who, text); }); }
    runHooks(list) {
      if (!list.length) return false;
      const ctx = this.ctx();
      for (const h of list) {
        let fn = null; try { fn = h(ctx); } catch (e) { console.error('world hook', e); }
        if (fn) { this.runScript(fn, { name: 'world-hook' }); return true; }
      }
      return false;
    }
    ctx() {
      const x = Math.floor(mod(this.px, W)), y = Math.floor(mod(this.pz, H)), c = at(x, y);
      const tr = trackAt[x + ',' + y];
      return { x, y, tile: c, terrain: tr && D.walk.includes(c) ? 'tracks' : (D.legend[c] || c), track: tr || null, region: regionAt(x, y), table: this.tableFor(x, y), vehicle: this.vehicle, dived: this.dived, scene: this };
    }
    tableFor(x, y) {
      const c = at(x, y), reg = regionAt(x, y), E = D.regions.encounters, S = D.regions.terrainSuffix, T = FF7.data.encounters;
      if (c === 's' && reg === 'chocobo_farm_area' && T.wm_grasslands_beach) return 'wm_grasslands_beach';
      if (c === 's' && (reg === 'kalm_area' || reg === 'midgar_area') && T.wm_midgar_beach) return 'wm_midgar_beach';
      if (c === 'd' && reg === 'corel_area' && T.wm_corel_desert_north) return 'wm_corel_desert_north';
      const base = E[reg]; if (!base) return null;
      if (S[c] && T[base + S[c]] && T[base + S[c]].length) return base + S[c];
      return T[base] && T[base].length ? base : null;
    }
    stepEncounter(dist) {
      const st = FF7.state;
      if (st.flags.noEncounters || st.config.encounters === 'off') return;
      let mult = st.config.encounters === 'half' ? 0.5 : 1;
      mult *= FF7.sys.materia.encounterFactor(true);         // Enemy Lure / Enemy Away (luring counts double here)
      this.danger += dist * mult;
      this.lastSafe = [Math.floor(this.px), Math.floor(this.pz)];
      if (this.danger < this.dangerLimit) return;
      this.danger = 0; this.dangerLimit = 20 + Math.random() * 24;
      const ctx = this.ctx();
      for (const h of WM.encounterHooks) {
        let fn = null; try { fn = h(ctx); } catch (e) { console.error('encounter hook', e); }
        if (fn === false) return;                 // hook vetoed the battle
        if (fn) { this.runScript(fn, { name: 'encounter-hook' }); return; }
      }
      if (!ctx.table) return;
      const table = FF7.data.encounters[ctx.table];
      if (!table || !table.length) return;
      const f = U.weighted(table, 'w');
      // regional arenas on open ground (FF7 has its own battle ground around Corel, Nibelheim and the
      // Bone Village); forests, deserts, snow etc. keep their terrain arena
      const openGround = 'ghpwr'.includes(ctx.tile) || (ctx.region === 'bone_area' && ctx.tile === 's');
      const REGION_BG = { mideel_area: 'mideel', corel_area: 'corel', nibel_area: 'nibelheim', bone_area: 'bone' };
      const bg = ctx.region === 'mideel_area' ? 'mideel' : (openGround && REGION_BG[ctx.region]) || BG[ctx.tile] || 'grass';
      this.saveLoc();
      this.runScript(function* (s) { yield s.battle({ formation: f, bg, random: true }); }, { name: 'world-encounter' });
    }

    // ------------------------------------------------ render
    // yaw 0: the camera sits south of the player looking north (-z)
    cameraEye() {
      const yaw = this.camYaw * Math.PI / 180;
      const air = this.vehicle === 'highwind';
      const dist = air ? 9 : this.vehicle ? 7 : 6, pitch = (air ? 32 : this.dived ? 12 : 30) * Math.PI / 180;
      const tx = this.px, tz = this.pz, ty = this.py + (air ? 0 : 0.4);
      const eye = [tx - Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist];
      return { eye, target: [tx + Math.sin(yaw) * 2, ty, tz - Math.cos(yaw) * 2] };
    }
    render() {
      const c = R.ctx, st = FF7.state;
      const meteor = st.flags.meteor && !st.flags.holy;
      const skyTop = this.dived ? '#02101c' : meteor ? '#20243a' : '#2a58c4', skyBot = this.dived ? '#0a2a44' : meteor ? '#8a5a58' : '#bad4ee';
      const g = c.createLinearGradient(0, 0, 0, FF7.H * 0.6); g.addColorStop(0, skyTop); g.addColorStop(1, skyBot);
      c.fillStyle = g; c.fillRect(0, 0, FF7.W, FF7.H);
      if (!this.dived) {
        // cloud panorama: 360° wide, horizon at the projected horizon line, turns with the camera yaw
        const pano = skyPanorama();
        if (pano && pano.width) {
          const vfov = 50, hfov = 2 * Math.atan(Math.tan(vfov / 2 * Math.PI / 180) * FF7.W / FF7.H) * 180 / Math.PI;
          const pxPerDeg = FF7.H / vfov;
          const horizonY = this._horizonY != null ? this._horizonY : FF7.H * 0.3;
          const hgt = SKY.EL * pxPerDeg, y0 = horizonY - hgt;
          const sliceW = SKY.W * hfov / 360;
          let u0 = ((((this.camYaw - hfov / 2) / 360) * SKY.W) % SKY.W + SKY.W) % SKY.W;
          c.save(); c.imageSmoothingEnabled = true;
          if (meteor) c.globalAlpha = 0.55;
          const first = Math.min(sliceW, SKY.W - u0);
          c.drawImage(pano, u0, 0, first, SKY.H, 0, y0, FF7.W * first / sliceW, hgt);
          if (first < sliceW) c.drawImage(pano, 0, 0, sliceW - first, SKY.H, FF7.W * first / sliceW, y0, FF7.W * (sliceW - first) / sliceW, hgt);
          c.restore();
          if (meteor) { c.fillStyle = 'rgba(120,30,40,0.28)'; c.fillRect(0, 0, FF7.W, horizonY + 20); }
        }
      }
      if (meteor && !this.dived) {       // Meteor hanging in the sky
        const mx = FF7.W * 0.68 - this.camYaw * 2 % FF7.W, my = 70;
        const rg = c.createRadialGradient(mx, my, 4, mx, my, 60); rg.addColorStop(0, '#ffb070'); rg.addColorStop(0.35, '#c03020'); rg.addColorStop(1, 'rgba(120,20,20,0)');
        c.fillStyle = rg; c.beginPath(); c.arc(mx, my, 60, 0, Math.PI * 2); c.fill();
      }
      const fogCol = this.dived ? [0.04, 0.16, 0.26] : FF7.glColor(skyBot).slice(0, 3);
      const { eye, target } = this.cameraEye();
      GL.begin({ clear: [0, 0, 0, 0], fog: { color: fogCol, near: this.dived ? 6 : 26, far: this.dived ? 22 : 50 }, curve: CURVE, curveCenter: eye,
        light: { dir: [-0.4, -0.85, -0.35], color: meteor ? [0.8, 0.66, 0.6] : [0.8, 0.78, 0.72], ambient: this.dived ? [0.25, 0.35, 0.45] : [0.42, 0.42, 0.46] } });
      GL.camera(eye, target, 50, 0.1, 160);
      { // the visible horizon: where the curved terrain meets the fog, straight ahead
        const yawR = this.camYaw * Math.PI / 180, D = 48;
        const far = [eye[0] + Math.sin(yawR) * D, -CURVE * D * D, eye[2] - Math.cos(yawR) * D];
        const hp = GL.project(far); if (hp && isFinite(hp.y)) this._horizonY = Math.max(40, Math.min(FF7.H * 0.7, hp.y)); }
      const M = M4.create();
      const pcx = Math.floor(this.px / CH), pcy = Math.floor(this.pz / CH);
      const NCX = W / CH, NCY = H / CH;
      const fwd = [target[0] - eye[0], target[2] - eye[2]]; const fl = Math.hypot(fwd[0], fwd[1]) || 1; fwd[0] /= fl; fwd[1] /= fl;
      const waters = [], glows = [];
      for (let dy = -VIEW; dy <= VIEW; dy++) for (let dx = -VIEW; dx <= VIEW; dx++) {
        const cx = pcx + dx, cy = pcy + dy;
        const ox = cx * CH + CH / 2 - this.px, oz = cy * CH + CH / 2 - this.pz;
        if (ox * fwd[0] + oz * fwd[1] < -CH * 1.2) continue;       // behind the camera
        const chunk = buildChunk(mod(cx, NCX), mod(cy, NCY));
        M4.trs(M, [cx * CH, 0, cy * CH], [0, 0, 0], [1, 1, 1]);
        GL.draw(chunk.mesh, M);
        if (chunk.trees) GL.draw(chunk.trees, M);
        if (chunk.water) waters.push([chunk.water, cx, cy]);
        if (chunk.glow) glows.push([chunk.glow, cx, cy]);
      }
      // landmarks
      D.locations.forEach(L => {
        const lx = this.px + this.wrapD(L.fx + L.w / 2 - this.px, W), lz = this.pz + this.wrapD(L.fy + L.h / 2 - this.pz, H);
        if (Math.hypot(lx - this.px, lz - this.pz) > VIEW * CH + 4) return;
        const mesh = landmark(L); if (!mesh) return;
        M4.trs(M, [lx, groundH(L.x + 0.5, L.y + 0.5) - 0.02, lz], [0, 0, 0], [1, 1, 1]);
        GL.draw(mesh, M);
      });
      // roaming WEAPONs (C12b) and extra landmarks
      if (FF7.story.c12b_weaponMarkers) {
        let list = []; try { list = FF7.story.c12b_weaponMarkers() || []; } catch (e) { list = []; }
        list.forEach(w => {
          if (w.underwater && !(this.vehicle === 'submarine' && this.dived)) return;
          const wx = this.px + this.wrapD(w.x + 0.5 - this.px, W), wz = this.pz + this.wrapD(w.y + 0.5 - this.pz, H);
          if (Math.hypot(wx - this.px, wz - this.pz) > VIEW * CH) return;
          const m = weaponModel(w.id); if (!m) return;
          m.position = [wx, (w.air ? groundH(w.x, w.y) + 3 + Math.sin(this.t * 0.03) * 0.3 : w.underwater ? WL - 1.2 : groundH(w.x + 0.5, w.y + 0.5)), wz];
          m.rotY = this.t * 0.004; m.scale = 0.35; m.update(1); m.draw();
        });
      }
      EXTRA_MARKS.forEach(L => {
        const lx = this.px + this.wrapD(L.x + 0.5 - this.px, W), lz = this.pz + this.wrapD(L.y + 0.5 - this.pz, H);
        if (Math.hypot(lx - this.px, lz - this.pz) > VIEW * CH) return;
        const mesh = landmark(L); if (!mesh) return;
        M4.trs(M, [lx, groundH(L.x + 0.5, L.y + 0.5) - 0.02, lz], [0, 0, 0], [1, 1, 1]); GL.draw(mesh, M);
      });
      // parked vehicles
      for (const id in st.world.vehicles) {
        const p = st.world.vehicles[id]; if (!p || id === this.vehicle) continue;
        const vx = this.px + this.wrapD(p.x + 0.5 - this.px, W), vz = this.pz + this.wrapD(p.y + 0.5 - this.pz, H);
        if (Math.hypot(vx - this.px, vz - this.pz) > VIEW * CH) continue;
        const T = TER[at(p.x, p.y)] || TER.g;
        const vy = id === 'highwind' ? groundH(p.x + 0.5, p.y + 0.5) + 0.6 : T.water ? WL : groundH(p.x + 0.5, p.y + 0.5);
        this.drawVehicle(id, vx, vy, vz, p.angle || 0);
      }
      // player
      if (this.vehicle) {
        this.drawVehicle(this.vehicle, this.px, this.py, this.pz, this.angle);
        if (this.vehicle === 'chocobo' || this.vehicle === 'buggy') this.drawPlayer(this.py + (this.vehicle === 'chocobo' ? 0.42 : 0.12), 0.5);
      } else this.drawPlayer(this.py, 0.55);
      // water & glow
      const t = this.t;
      waters.forEach(([mesh, cx, cy]) => { M4.trs(M, [cx * CH, 0, cy * CH], [0, 0, 0], [1, 1, 1]); GL.draw(mesh, M, { blend: 'alpha', add: [0.03 * Math.sin(t * 0.03), 0.03 * Math.sin(t * 0.03), 0.05 * Math.sin(t * 0.025)] }); });
      glows.forEach(([mesh, cx, cy]) => { M4.trs(M, [cx * CH, 0, cy * CH], [0, 0, 0], [1, 1, 1]); GL.draw(mesh, M, { unlit: true, blend: 'add', tint: [1, 0.6, 0.3, 0.5 + 0.2 * Math.sin(t * 0.05)] }); });
      GL.end();
      if (this.minimap) this.drawMinimap();
    }
    drawPlayer(y, scale) {
      const m = this.player.model; if (!m) return;
      m.position = [this.px, y, this.pz]; m.rotY = this.angle; m.scale = scale * (m.baseScale || 1);
      if (this.vehicle) { m.play && this._anim !== 'sit' && (this._anim = 'sit', m.play(m.anims && m.anims.sit ? m.anims.sit : 'sit')); m.update(1); }
      m.draw();
    }
    drawVehicle(id, x, y, z, ang) {
      const v = vehicleModel(id, FF7.state.vars.chocobo_color);
      const sc = vscale(id, v.model);
      if (v.model) { v.model.position = [x, y, z]; v.model.rotY = ang; v.model.scale = sc; if (v.tint) v.model.tint = v.tint; v.model.draw(); }
      else if (v.mesh) { const M = M4.create(); M4.trs(M, [x, y, z], [0, ang, 0], [1.4, 1.4, 1.4]); GL.draw(v.mesh, M); }
    }
    drawMinimap() {
      if (!WM._mini) {
        const cv = U.makeCanvas(W, H), g = cv.getContext('2d');
        const img = g.createImageData ? g.createImageData(W, H) : null;
        if (img && img.data) {
          for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
            const c = D.rows[y][x], T = TER[c] || TER.g, i = (y * W + x) * 4;
            if (T.water && c !== 'r') { img.data[i + 3] = 0; continue; }
            const pale = c === 'm' || c === 'M' || c === 'i' || c === 'n' ? 232 : c === 'C' ? 190 : 206;
            img.data[i] = pale - 12; img.data[i + 1] = pale; img.data[i + 2] = pale - 18; img.data[i + 3] = 235;
          }
          g.putImageData(img, 0, 0);
        }
        WM._mini = cv;
      }
      const big = this.minimap === 2;
      const mw = big ? 384 : 150, mh = Math.round(mw * H / W), x0 = FF7.W - mw - 14, y0 = FF7.H - mh - 14;
      const c = R.ctx;
      c.save();
      R.roundRect ? R.roundRect(c, x0 - 4, y0 - 4, mw + 8, mh + 8, 6) : c.rect(x0 - 4, y0 - 4, mw + 8, mh + 8);
      c.fillStyle = 'rgba(20,44,30,0.62)'; c.fill();
      c.lineWidth = 2; c.strokeStyle = 'rgba(10,20,14,0.9)'; c.stroke();
      c.globalAlpha = 0.9; c.imageSmoothingEnabled = true;
      c.drawImage(WM._mini, x0, y0, mw, mh);
      c.globalAlpha = 1;
      const sx = mw / W, sy = mh / H;
      for (const id in FF7.state.world.vehicles) { const p = FF7.state.world.vehicles[id]; if (!p || id === this.vehicle) continue; c.fillStyle = id === 'highwind' ? '#ff4040' : '#ffe040'; c.fillRect(x0 + p.x * sx - 1.5, y0 + p.y * sy - 1.5, 3, 3); }
      // view cone (yellow) + position (red dot), like FF7
      const px = x0 + mod(this.px, W) * sx, py = y0 + mod(this.pz, H) * sy;
      const yaw = this.camYaw * Math.PI / 180, dir = [Math.sin(yaw), -Math.cos(yaw)], side = [Math.cos(yaw), Math.sin(yaw)], L = big ? 26 : 12, Wd = big ? 12 : 6;
      c.fillStyle = 'rgba(255,236,80,0.75)';
      c.beginPath(); c.moveTo(px, py); c.lineTo(px + dir[0] * L + side[0] * Wd, py + dir[1] * L + side[1] * Wd); c.lineTo(px + dir[0] * L - side[0] * Wd, py + dir[1] * L - side[1] * Wd); c.closePath(); c.fill();
      c.fillStyle = (this.t >> 4) % 2 ? '#ff2020' : '#ff8080'; c.beginPath(); c.arc(px, py, big ? 3 : 2, 0, Math.PI * 2); c.fill();
      c.restore();
    }
  }
  WM.WorldScene = WorldScene;
  FF7.worldScene = null;

  // FF7.world.enter(loc, opts)
  //   loc: location id | { x, y, vehicle } | { resume: true, vehicle? } | null (resume)
  WM.enter = function (loc, opts = {}) {
    init();
    const st = FF7.state;
    st.world = st.world || { x: 0, y: 0, vehicle: null, vehicles: {} };
    st.world.vehicles = st.world.vehicles || {};
    let x = null, y = null, vehicle = opts.vehicle || null, fromLoc = null;
    if (typeof loc === 'string') {
      const L = WM.location(loc);
      if (L) { fromLoc = L; x = L.x; y = L.y; } else console.warn('world.enter: unknown location', loc);
      // the chocobo you rode in on is still waiting outside
      if (L && st.world.chocoboWaiting === loc && !vehicle) vehicle = 'chocobo';
      st.world.chocoboWaiting = null;
    } else if (loc && typeof loc === 'object' && loc.x != null) { x = loc.x; y = loc.y; vehicle = loc.vehicle || vehicle; }
    else if (loc && typeof loc === 'object') vehicle = loc.vehicle || vehicle || null;
    if (x == null) {
      x = st.world.x; y = st.world.y; if (!vehicle && loc && loc.resume) vehicle = st.world.vehicle;
      if (!vehicle && !loc) vehicle = st.world.vehicle;
      if (!x && !y) { const L = WM.location('midgar'); x = L.x + 2; y = L.y; }
    }
    if (vehicle === 'chocobo' && (loc && loc.color)) st.vars.chocobo_color = loc.color;
    // opts.bring: carry a parked vehicle along (e.g. the buggy on the Costa del Sol <-> Junon ship)
    if (opts.bring) {
      const ok = opts.bring === 'bronco' ? (c) => c === 'o' : (c) => D.buggy.includes(c);
      let spot = null;
      for (let r = 1; r < 6 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) if (ok(at(x + dx, y + dy)) && !entryAt[mod(x + dx, W) + ',' + mod(y + dy, H)]) spot = { x: mod(x + dx, W), y: mod(y + dy, H) };
      if (spot) st.world.vehicles[opts.bring] = spot;
    }
    // a location's own vehicle (e.g. the submarine at Junon's dock) stays where it is parked
    const ws = FF7.worldScene = new WorldScene();
    FF7.sceneMgr.set(ws);
    ws.start(x, y, vehicle, fromLoc);
    return ws;
  };
  // world preview helpers for tools
  WM._internals = { TER, buildChunk, init, at, regionAt, landmark, vehicleModel, CH, VIEW, WL, CURVE, get D() { return D; } };
})();
