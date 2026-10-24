// Procedural floor and wall textures for field maps. FF7's field floors are painted (planks, steel plate,
// cobbles, grass...), so every walkable floor gets a seamless, near-neutral 128x128 texture that
// multiplies its vertex colours (the theme palette keeps deciding the colour). Floors are repeated
// in world space: `F.floorTex(mat).scale` world units per repeat.
//
// Material per floor key: the tile's own key when it names a material (grass, dirt, sand, snow,
// carpet, metal, wood, tile), otherwise the theme's choice for floor / floor2 / floor3.
// Override per map with look.floorTex: 'planks' | { floor: 'cobble', floor2: 'grass' } | false.
(function () {
  const F = FF7.field, U = FF7.util;
  const N = 128;

  // ---- tileable noise helpers (period in lattice cells)
  const hash = (x, y, k) => { let h = (x * 374761393 + y * 668265263 + k * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const wrap = (v, p) => ((v % p) + p) % p;
  function noise(x, y, per, k) {   // per: lattice period, or [periodX, periodY]
    const px = Array.isArray(per) ? per[0] : per, py = Array.isArray(per) ? per[1] : per;
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(wrap(xi, px), wrap(yi, py), k), b = hash(wrap(xi + 1, px), wrap(yi, py), k);
    const c = hash(wrap(xi, px), wrap(yi + 1, py), k), d = hash(wrap(xi + 1, px), wrap(yi + 1, py), k);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  }
  // fractal noise over the whole texture: base = lattice cells across N pixels
  // base: lattice cells across N pixels (a number, or [cellsX, cellsY] for stretched streaks)
  function fbm(px, py, base, oct, k) {
    let v = 0, amp = 0.5, tot = 0, fx = Array.isArray(base) ? base[0] : base, fy = Array.isArray(base) ? base[1] : base;
    for (let o = 0; o < oct; o++) { v += amp * noise(px / N * fx, py / N * fy, [fx, fy], k + o); tot += amp; amp *= 0.5; fx *= 2; fy *= 2; }
    return v / tot;
  }
  const rng = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  // tileable Voronoi: nearest and second-nearest feature points (for cobbles / rock)
  function voronoi(pts) {
    return (x, y) => {
      let d1 = 1e9, d2 = 1e9, id = 0;
      for (let i = 0; i < pts.length; i++) for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
        const dx = pts[i][0] + ox * N - x, dy = pts[i][1] + oy * N - y, d = dx * dx + dy * dy;
        if (d < d1) { d2 = d1; d1 = d; id = i; } else if (d < d2) d2 = d;
      }
      return { d1: Math.sqrt(d1), d2: Math.sqrt(d2), id };
    };
  }

  // ---- materials: gen(x, y) -> brightness (1 = vertex colour unchanged), or [r, g, b] multipliers
  const MAT = {
    planks: { scale: 1.0, gen: (() => {
      const r = rng(11), W = 16, ends = [], shade = [];
      for (let i = 0; i < N / W; i++) { ends.push([r() * N, r() * N]); shade.push((r() - 0.5) * 0.14); }
      return (x, y) => {
        const b = Math.floor(x / W), bx = x % W;
        if (bx === 0) return 0.6;                                      // gap between boards
        if (bx === 1 || bx === W - 1) return 0.84;
        const e = ends[b]; if (Math.abs(y - e[0]) < 1 || Math.abs(y - e[1]) < 1) return 0.66;   // butt joints
        const grain = Math.sin((x + fbm(x, y, 4, 3, 5) * 26) * Math.PI * 2 / 5.333) * 0.045 + (fbm(x * 3, y, 8, 2, 7) - 0.5) * 0.1;
        return 0.95 + shade[b] + grain;
      };
    })() },
    tiles: { scale: 1.0, gen: (() => {
      const r = rng(21), sh = []; for (let i = 0; i < 16; i++) sh.push((r() - 0.5) * 0.08);
      return (x, y) => {
        const tx = x % 32, ty = y % 32; if (tx < 2 || ty < 2) return 0.7;
        const s = sh[Math.floor(y / 32) * 4 + Math.floor(x / 32)];
        return 0.97 + s + (fbm(x, y, 16, 2, 3) - 0.5) * 0.06 - (tx === 2 || ty === 2 ? 0.06 : 0) + (tx === 31 || ty === 31 ? 0.04 : 0);
      };
    })() },
    marble: { scale: 2.0, gen: (x, y) => {
      if (x % 64 === 0 || y % 64 === 0) return 0.78;
      const v = fbm(x, y, 3, 5, 31), vein = Math.abs(Math.sin((x + y) * Math.PI * 2 / 128 + v * 12));
      return 0.98 - Math.pow(1 - vein, 10) * 0.09 + (v - 0.5) * 0.06;
    } },
    cobble: { scale: 1.1, gen: (() => {
      const r = rng(41), pts = []; for (let i = 0; i < 34; i++) pts.push([r() * N, r() * N, (r() - 0.5) * 0.14]);
      const vo = voronoi(pts);
      return (x, y) => {
        const v = vo(x + 0.5, y + 0.5), edge = v.d2 - v.d1;
        if (edge < 2) return 0.7 + edge * 0.06;                        // mortar / dirt between stones
        const dome = Math.min(1, edge / 9);
        return 0.86 + pts[v.id][2] + dome * 0.1 + (fbm(x, y, 16, 2, 43) - 0.5) * 0.08;
      };
    })() },
    stone: { scale: 1.6, gen: (() => {
      const r = rng(51), rows = [];
      for (let ry = 0; ry < 4; ry++) { const cuts = [0]; let c = Math.floor(r() * 24); while (c < N - 20) { c += 28 + Math.floor(r() * 30); if (c < N - 12) cuts.push(c); } rows.push({ cuts, off: Math.floor(r() * N), sh: cuts.map(() => (r() - 0.5) * 0.14) }); }
      return (x, y) => {
        const row = rows[Math.floor(y / 32)], ry = y % 32; if (ry < 2) return 0.62;
        const xx = wrap(x + row.off, N); let k = 0; while (k + 1 < row.cuts.length && xx >= row.cuts[k + 1]) k++;
        if (xx - row.cuts[k] < 2) return 0.62;
        return 0.93 + row.sh[k] + (fbm(x, y, 8, 4, 53) - 0.5) * 0.16;
      };
    })() },
    concrete: { scale: 2.0, gen: (x, y) => {
      if (x % 64 === 0 || y % 64 === 0) return 0.72;
      const stain = fbm(x, y, 3, 3, 61), grain = hash(x, y, 62);
      return 0.93 + (stain - 0.5) * 0.16 + (grain - 0.5) * 0.08 - (grain < 0.03 ? 0.12 : 0);
    } },
    metal: { scale: 1.0, gen: (x, y) => {       // diamond (tread) plate with panel seams and rivets
      const px = x % 64, py = y % 64;
      if (px === 0 || py === 0) return 0.6;
      if ((px === 4 || px === 60) && (py === 4 || py === 60)) return 1.08;
      const cx = x % 16, cy = y % 16, alt = (Math.floor(x / 16) + Math.floor(y / 16)) & 1;
      const u = alt ? cx - cy : cx + cy - 15, d = Math.abs(u) <= 1 && Math.abs(cx - 7.5) < 5.5 && Math.abs(cy - 7.5) < 5.5;
      const base = 0.86 + (fbm(x, y, 4, 3, 71) - 0.5) * 0.1;
      return d ? base + (u > 0 ? 0.14 : -0.1) : base;
    } },
    grate: { scale: 0.5, gen: (x, y) => {
      const bx = x % 16, by = y % 16;
      if (bx < 3) return 0.95 - (bx === 2 ? 0.12 : 0);
      if (by < 3) return 0.9 - (by === 2 ? 0.12 : 0);
      return 0.38 + (fbm(x, y, 8, 2, 81) - 0.5) * 0.1;
    } },
    carpet: { scale: 1.0, gen: (x, y) => 0.93 + ((x + y) % 4 < 2 ? 0.025 : -0.025) + (fbm(x, y, 8, 3, 91) - 0.5) * 0.1 + (hash(x, y, 92) - 0.5) * 0.05 },
    dirt: { scale: 2.0, gen: (x, y) => {
      const h = hash(x, y, 101);
      let v = 0.9 + (fbm(x, y, 6, 4, 102) - 0.5) * 0.24 + (h - 0.5) * 0.08;
      if (h < 0.05) v -= 0.22; else if (h > 0.975) v += 0.12;          // pebbles
      return v;
    } },
    grass: { scale: 2.0, gen: (x, y) => {
      const clump = fbm(x, y, 6, 3, 111), blade = noise(x / 2, y / 2, N / 2, 112) * 0.6 + noise(x, y / 4, [N, N / 4], 113) * 0.4;
      const v = 0.88 + (clump - 0.5) * 0.24 + (blade - 0.5) * 0.18, tip = blade > 0.8 ? 0.06 : 0;
      return [v + tip, v + tip * 1.2, v * 0.96];
    } },
    sand: { scale: 2.0, gen: (x, y) => 0.95 + Math.sin((y + fbm(x, y, 4, 2, 121) * 30) * Math.PI * 2 / 16) * 0.03 + (hash(x, y, 122) - 0.5) * 0.08 + (fbm(x, y, 8, 3, 123) - 0.5) * 0.08 },
    snow: { scale: 2.0, gen: (x, y) => { const h = hash(x, y, 131); return 0.96 + (fbm(x, y, 5, 4, 132) - 0.5) * 0.08 + (h > 0.992 ? 0.06 : 0); } },
    ice: { scale: 2.0, gen: (x, y) => {
      const v = fbm(x, y, 4, 4, 141), crack = Math.abs(fbm(x, y, 5, 3, 142) - 0.5) < 0.012;
      return 0.94 + (v - 0.5) * 0.1 + Math.sin((x - y) * Math.PI * 2 / 64 + v * 8) * 0.025 + (crack ? 0.08 : 0);
    } },
    rock: { scale: 2.0, gen: (() => {
      const r = rng(151), pts = []; for (let i = 0; i < 18; i++) pts.push([r() * N, r() * N, (r() - 0.5) * 0.12]);
      const vo = voronoi(pts);
      return (x, y) => {
        const v = vo(x + 0.5, y + 0.5), edge = v.d2 - v.d1;
        let b = 0.9 + pts[v.id][2] + (fbm(x, y, 8, 4, 152) - 0.5) * 0.2;
        if (edge < 1.6) b -= 0.22 * (1 - edge / 1.6);                  // cracks
        return b;
      };
    })() },
  };
  // ---- wall materials (u runs along the wall, v up it; scale = world units per repeat)
  const WALL = {
    plaster: { scale: 2.0, gen: (x, y) => {
      const m = fbm(x, y, 4, 4, 201), st = fbm(x, y, [8, 2], 2, 202);          // vertical water stains
      return 0.95 + (m - 0.5) * 0.1 - Math.max(0, st - 0.62) * 0.35 + (hash(x, y, 203) - 0.5) * 0.04;
    } },
    brick: { scale: 1.0, gen: (() => {
      const r = rng(211), sh = []; for (let i = 0; i < 64; i++) sh.push((r() - 0.5) * 0.16);
      return (x, y) => {
        const row = Math.floor(y / 8), ry = y % 8, xx = wrap(x + (row & 1) * 8, N), bx = xx % 16;
        if (ry === 0 || bx === 0) return 0.66;
        return 0.92 + sh[(row * 8 + Math.floor(xx / 16)) % 64] + (hash(x, y, 212) - 0.5) * 0.08 - (ry === 7 ? 0.05 : 0);
      };
    })() },
    stoneblock: { scale: 2.0, gen: (() => {
      const r = rng(221), sh = []; for (let i = 0; i < 32; i++) sh.push((r() - 0.5) * 0.14);
      return (x, y) => {
        const row = Math.floor(y / 32), ry = y % 32, xx = wrap(x + (row & 1) * 32, N), bx = xx % 64;
        if (ry < 2 || bx < 2) return 0.64;
        return 0.92 + sh[(row * 2 + Math.floor(xx / 64)) % 32] + (fbm(x, y, 8, 4, 222) - 0.5) * 0.14 + (ry < 5 ? 0.04 : 0);
      };
    })() },
    siding: { scale: 1.0, gen: (() => {
      const r = rng(231), sh = []; for (let i = 0; i < 16; i++) sh.push((r() - 0.5) * 0.12);
      return (x, y) => {   // horizontal clapboards with a shadow under each board
        const b = Math.floor(y / 16), by = y % 16;
        if (by === 15) return 0.6; if (by === 14) return 0.8;
        return 0.95 + sh[b % 16] + Math.sin(x * Math.PI * 2 / 16 + fbm(x, y, 6, 2, 232) * 20) * 0.03 + (by < 2 ? 0.04 : 0);
      };
    })() },
    boards: { scale: 1.0, gen: (() => {          // weathered vertical boards of uneven width (7th Heaven, ff7art26)
      const r = rng(271), edges = [0]; while (edges[edges.length - 1] < 64) edges.push(edges[edges.length - 1] + 7 + Math.floor(r() * 6));
      edges[edges.length - 1] = 64;
      const tone = edges.map(() => (r() - 0.5) * 0.16);
      return (x, y) => {
        const px = x % 64; let b = 0; while (edges[b + 1] <= px) b++;
        if (px === edges[b]) return 0.5;                           // the gap between boards
        if (px === edges[b] + 1) return 0.78;
        const grain = (fbm(x, y, [2, 18], 3, 272) - 0.5) * 0.22;  // grain running down the board
        const knot = fbm(x, y, 5, 2, 273 + b) > 0.8 ? -0.18 : 0;
        return 0.9 + tone[b] + grain + knot;
      };
    })() },
    corrugated: { scale: 1.0, gen: (x, y) => {   // tin sheets: vertical ribs, sheet seams, rust streaks
      const rib = Math.sin(x / 8 * Math.PI * 2) * 0.09, seam = y % 64 === 0 ? -0.25 : y % 64 === 1 ? 0.08 : 0;
      const rust = Math.max(0, fbm(x, y, [16, 3], 3, 241) - 0.55) * 0.9;       // streaks run down the sheets
      const v = 0.92 + rib + seam - rust * 0.4;
      return [v + rust * 0.12, v - rust * 0.05, v - rust * 0.18];
    } },
    panel: { scale: 2.0, gen: (x, y) => {        // riveted steel panels (reactors, Shinra, ships)
      const px = x % 64, py = y % 32;
      if (px === 0 || py === 0) return 0.62;
      if (px === 1 || py === 1) return 1.02;
      if ((px === 5 || px === 59) && (py === 5 || py === 27)) return 1.1;
      return 0.9 + (py / 32) * 0.05 + (fbm(x, y, 4, 3, 251) - 0.5) * 0.08;
    } },
    concrete: { scale: 2.0, gen: (x, y) => {
      if (y % 32 === 0) return 0.76;               // formwork lines
      if (x % 64 === 0) return 0.8;
      const st = fbm(x, y, [8, 2], 3, 261);
      return 0.94 + (fbm(x, y, 6, 3, 262) - 0.5) * 0.1 - Math.max(0, st - 0.6) * 0.4 + (hash(x, y, 263) < 0.02 ? -0.12 : 0);
    } },
    rock: { scale: 2.0, gen: (x, y) => {          // cliff / cave faces: strata and cracks
      const strata = Math.sin((y + fbm(x, y, 3, 3, 271) * 40) * Math.PI * 2 / 32) * 0.07, crack = Math.abs(fbm(x, y, 6, 3, 272) - 0.5) < 0.015;
      return 0.9 + strata + (fbm(x, y, 8, 4, 273) - 0.5) * 0.18 - (crack ? 0.2 : 0);
    } },
    ice: { scale: 2.0, gen: (x, y) => 0.95 + Math.sin((x + y * 2) * Math.PI * 2 / 64 + fbm(x, y, 4, 3, 281) * 6) * 0.04 + (fbm(x, y, 6, 3, 282) - 0.5) * 0.1 },
  };
  F.WALL_MATERIALS = Object.keys(WALL);
  // theme -> [wall, building ('h' tiles)]
  const WTHEME = {
    reactor: ['panel', 'panel'], station: ['concrete', 'concrete'], midgar: ['concrete', 'panel'], slums: ['corrugated', 'corrugated'],
    church: ['brick', 'brick'], bar: ['siding', 'siding'], house: ['plaster', 'plaster'], wallmarket: ['siding', 'corrugated'],
    mansion: ['plaster', 'stoneblock'], sewer: ['brick', 'brick'], graveyard: ['stoneblock', 'corrugated'], shinra: ['panel', 'panel'],
    lab: ['panel', 'panel'], highway: ['concrete', 'concrete'], grass: ['rock', 'plaster'], town: ['stoneblock', 'plaster'],
    night_town: ['stoneblock', 'plaster'], forest: ['rock', 'siding'], jungle: ['rock', 'siding'], cave: ['rock', 'rock'], mine: ['rock', 'panel'],
    desert: ['rock', 'plaster'], beach: ['rock', 'plaster'], canyon: ['rock', 'rock'], mountain: ['rock', 'siding'], snow: ['rock', 'siding'],
    ice: ['ice', 'ice'], temple: ['stoneblock', 'stoneblock'], city_ancients: ['stoneblock', 'plaster'], crater: ['rock', 'rock'],
    lifestream: ['rock', 'rock'], junon: ['concrete', 'panel'], ship: ['panel', 'panel'], goldsaucer: ['plaster', 'panel'],
    wutai: ['siding', 'plaster'], rocket: ['siding', 'siding'], nibelheim: ['stoneblock', 'plaster'], fire: ['rock', 'rock'],
    cosmo: ['rock', 'rock'], mideel: ['siding', 'siding'], space: ['panel', 'panel'], underwater: ['panel', 'panel'],
  };
  // Wall material for a wall tile. Override per map with look.wallTex: 'brick' | { wall: 'rock', bldg: 'plaster' } | false.
  F.wallMaterial = function (map, th, t) {
    const key = t && t.bldg ? 'bldg' : 'wall';
    const o = map.look && map.look.wallTex !== undefined ? map.look.wallTex : th.wallTex;
    if (o === false) return null;
    if (o && typeof o === 'object' && o[key] !== undefined) return WALL[o[key]] ? o[key] : null;
    if (typeof o === 'string') return WALL[o] ? o : null;
    const w = WTHEME[map.theme] || (th.indoor ? ['plaster', 'plaster'] : ['rock', 'plaster']);
    return w[key === 'bldg' ? 1 : 0];
  };
  F.FLOOR_MATERIALS = Object.keys(MAT);

  // theme -> material for [floor, floor2, floor3]
  const THEME = {
    reactor: ['metal', 'grate', 'metal'], station: ['concrete', 'dirt', 'concrete'], midgar: ['concrete', 'concrete', 'concrete'],
    slums: ['dirt', 'dirt', 'dirt'], church: ['planks', 'stone', 'planks'], bar: ['planks', 'planks', 'planks'],
    house: ['planks', 'planks', 'planks'], wallmarket: ['dirt', 'carpet', 'dirt'], mansion: ['carpet', 'planks', 'stone'],
    sewer: ['stone', 'stone', 'stone'], graveyard: ['dirt', 'stone', 'dirt'], shinra: ['marble', 'tiles', 'carpet'],
    lab: ['tiles', 'metal', 'tiles'], highway: ['concrete', 'concrete', 'concrete'],
    grass: ['grass', 'dirt', 'grass'], town: ['cobble', 'grass', 'cobble'], night_town: ['cobble', 'grass', 'cobble'],
    forest: ['grass', 'dirt', 'grass'], jungle: ['grass', 'dirt', 'grass'], cave: ['rock', 'rock', 'rock'], mine: ['rock', 'rock', 'rock'],
    desert: ['sand', 'sand', 'sand'], beach: ['sand', 'stone', 'sand'], canyon: ['rock', 'dirt', 'rock'], mountain: ['rock', 'grass', 'rock'],
    snow: ['snow', 'ice', 'snow'], ice: ['ice', 'snow', 'ice'], temple: ['stone', 'stone', 'stone'], city_ancients: ['stone', 'stone', 'stone'],
    crater: ['rock', 'rock', 'rock'], lifestream: ['rock', 'rock', 'rock'], junon: ['concrete', 'concrete', 'metal'],
    ship: ['planks', 'metal', 'metal'], goldsaucer: ['tiles', 'tiles', 'tiles'], wutai: ['stone', 'planks', 'planks'],
    rocket: ['dirt', 'concrete', 'dirt'], nibelheim: ['dirt', 'grass', 'dirt'], fire: ['rock', 'rock', 'rock'],
    cosmo: ['rock', 'dirt', 'rock'], mideel: ['grass', 'planks', 'grass'], space: ['metal', 'metal', 'metal'],
    underwater: ['metal', 'metal', 'metal'],
  };
  const KEY = { grass: 'grass', dirt: 'dirt', sand: 'sand', snow: 'snow', carpet: 'carpet', metal: 'metal', wood: 'planks', tile: 'tiles' };

  F.floorMaterial = function (map, th, key) {
    const o = map.look && map.look.floorTex !== undefined ? map.look.floorTex : th.floorTex;
    if (o === false) return null;
    if (o && typeof o === 'object' && o[key] !== undefined) return MAT[o[key]] ? o[key] : null;
    if (typeof o === 'string' && MAT[o] && (key === 'floor' || key === 'floor2' || key === 'floor3')) return o;
    if (KEY[key]) return KEY[key];
    const t = THEME[map.theme] || (th.indoor ? ['planks', 'planks', 'stone'] : ['stone', 'grass', 'stone']);
    return t[key === 'floor2' ? 1 : key === 'floor3' ? 2 : 0] || null;
  };

  // Smooth floor colour at a tile corner (xc, yc in tiles): the palette's two shades blend over a few
  // tiles and brightness drifts gently, so textured floors show no per-tile checkerboard.
  const vn = (x, y, k) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = hash(xi, yi, k), b = hash(xi + 1, yi, k), c = hash(xi, yi + 1, k), d = hash(xi + 1, yi + 1, k);
    return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
  };
  F.floorCornerCol = function (pal, xc, yc) {
    const arr = Array.isArray(pal) ? pal : [pal, pal];
    const n = vn(xc / 3.2, yc / 3.2, 301), m = vn(xc / 1.4, yc / 1.4, 302);
    return U.shade(U.mix(arr[0], arr[1], U.clamp((n - 0.4) * 1.8, 0, 1)), (m - 0.5) * 0.08);
  };

  const cache = {};
  F.floorTex = function (mat) { return mat && MAT[mat] ? bake(mat, MAT[mat]) : null; };
  F.wallTex = function (mat) { return mat && WALL[mat] ? bake('w:' + mat, WALL[mat]) : null; };
  function bake(mat, M) {
    if (cache[mat]) return cache[mat];
    if (!FF7.tex) return null;
    const t = FF7.tex.create(N, N), d = t.data, buf = new Float32Array(N * N * 3);
    let sum = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = M.gen(x, y), i = (y * N + x) * 3;
      const r = Array.isArray(v) ? v : [v, v, v];
      buf[i] = r[0]; buf[i + 1] = r[1]; buf[i + 2] = r[2]; sum += (r[0] + r[1] + r[2]) / 3;
    }
    // keep the average near 0.93 so the theme's floor colours still read as designed
    const k = 0.93 / Math.max(0.2, sum / (N * N));
    for (let i = 0; i < N * N; i++) for (let c = 0; c < 3; c++) d[i * 4 + c] = U.clamp(Math.round(buf[i * 3 + c] * k * 255), 0, 255);
    for (let i = 0; i < N * N; i++) d[i * 4 + 3] = 255;
    return (cache[mat] = { tex: t, scale: M.scale });
  }
})();
